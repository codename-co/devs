/**
 * GitHub Copilot OAuth Device Flow
 *
 * Implements the GitHub OAuth device flow for authenticating with
 * GitHub Copilot. This is a public-client flow (no client_secret needed).
 *
 * Flow:
 * 1. POST /login/device/code → get user_code + device_code
 * 2. User visits https://github.com/login/device and enters user_code
 * 3. App polls POST /login/oauth/access_token until user authorizes
 * 4. Receive access_token (gho_...) for Copilot API calls
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

import { BRIDGE_URL } from '@/config/bridge'

// =============================================================================
// Constants
// =============================================================================

/**
 * GitHub OAuth App client ID for Copilot access.
 *
 * Uses the VS Code GitHub Copilot extension&apos;s public client ID.
 * This is a Copilot-authorized OAuth App, so tokens it produces are
 * accepted by the copilot_internal/v2/token exchange endpoint.
 *
 * Can be overridden via VITE_GITHUB_CLIENT_ID for enterprise setups.
 */
const GITHUB_CLIENT_ID =
  import.meta.env.VITE_GITHUB_CLIENT_ID || 'Iv1.b507a08c87ecfe98'

/** GitHub device flow endpoints (proxied for CORS) */
const DEVICE_CODE_URL = `${BRIDGE_URL}/api/github/login/device/code`
const ACCESS_TOKEN_URL = `${BRIDGE_URL}/api/github/login/oauth/access_token`

/** Maximum polling duration (15 minutes, matching GitHub's device_code expiry) */
const MAX_POLL_DURATION_MS = 15 * 60 * 1000

// =============================================================================
// Types
// =============================================================================

/** Response from the device code request */
export interface DeviceCodeResponse {
  /** Device verification code (40 chars, used for polling) */
  device_code: string
  /** User verification code (8 chars with hyphen, shown to user) */
  user_code: string
  /** URL where user enters the code */
  verification_uri: string
  /** Seconds until codes expire (default 900) */
  expires_in: number
  /** Minimum polling interval in seconds (default 5) */
  interval: number
}

/** Polling result states */
export type DeviceFlowStatus =
  | { status: 'pending' }
  | { status: 'success'; access_token: string; token_type: string }
  | { status: 'expired' }
  | { status: 'error'; error: string; error_description?: string }

/** Callback for device flow progress updates */
export interface DeviceFlowCallbacks {
  /** Called when user_code is ready to display */
  onUserCode: (response: DeviceCodeResponse) => void
  /** Called on each poll attempt */
  onPollAttempt?: () => void
}

// =============================================================================
// Device Flow Implementation
// =============================================================================

/**
 * Step 1: Request device and user verification codes from GitHub.
 */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: '',
    }).toString(),
  })

  if (!response.ok) {
    let errorDetail: string
    try {
      const data = await response.json()
      errorDetail = data.error || response.statusText
    } catch {
      errorDetail = await response.text()
    }
    if (response.status === 404 && errorDetail === 'Not Found') {
      throw new Error(
        'GitHub rejected the client ID. Verify that VITE_GITHUB_CLIENT_ID is a valid GitHub OAuth App client ID with device flow enabled.',
      )
    }
    throw new Error(`Failed to request device code: ${response.status} ${errorDetail}`)
  }

  return response.json()
}

/**
 * Step 3: Poll GitHub for the access token.
 * Returns when user authorizes, codes expire, or an error occurs.
 */
async function pollForAccessToken(
  deviceCode: string,
  _interval: number,
  signal?: AbortSignal,
): Promise<DeviceFlowStatus> {
  const response = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }).toString(),
    signal,
  })

  if (!response.ok) {
    return {
      status: 'error',
      error: `HTTP ${response.status}`,
      error_description: await response.text(),
    }
  }

  const data = await response.json()

  if (data.access_token) {
    return {
      status: 'success',
      access_token: data.access_token,
      token_type: data.token_type,
    }
  }

  switch (data.error) {
    case 'authorization_pending':
      return { status: 'pending' }
    case 'slow_down':
      // GitHub asked us to slow down; caller should increase interval
      return { status: 'pending' }
    case 'expired_token':
      return { status: 'expired' }
    default:
      return {
        status: 'error',
        error: data.error,
        error_description: data.error_description,
      }
  }
}

/**
 * Run the full GitHub OAuth device flow.
 *
 * 1. Requests device codes
 * 2. Calls onUserCode so the UI can display the code and link
 * 3. Polls until user authorizes or codes expire
 * 4. Returns the access token
 *
 * @param callbacks - Progress callbacks for UI updates
 * @param signal - Optional AbortSignal to cancel the flow
 * @returns The OAuth access token (gho_...)
 * @throws Error if the flow fails or is cancelled
 */
export async function runDeviceFlow(
  callbacks: DeviceFlowCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  // Step 1: Request device codes
  const deviceCode = await requestDeviceCode()

  // Step 2: Notify UI to display user_code
  callbacks.onUserCode(deviceCode)

  // Step 3: Poll for authorization
  let interval = deviceCode.interval * 1000 // Convert to ms
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    if (signal?.aborted) {
      throw new Error('Device flow cancelled')
    }

    // Wait for the polling interval
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, interval)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout)
          reject(new Error('Device flow cancelled'))
        },
        { once: true },
      )
    })

    callbacks.onPollAttempt?.()

    const result = await pollForAccessToken(
      deviceCode.device_code,
      deviceCode.interval,
      signal,
    )

    switch (result.status) {
      case 'success':
        return result.access_token
      case 'pending':
        // Increase interval slightly on slow_down
        interval = Math.max(interval, deviceCode.interval * 1000)
        continue
      case 'expired':
        throw new Error(
          'Device code expired. Please try again.',
        )
      case 'error':
        throw new Error(
          result.error_description || result.error || 'Authentication failed',
        )
    }
  }

  throw new Error('Device flow timed out')
}

/**
 * Check if GitHub Copilot OAuth is configured.
 * Always true since we use the built-in Copilot client ID.
 * Can be overridden via VITE_GITHUB_CLIENT_ID for enterprise setups.
 */
export function isGitHubCopilotAuthConfigured(): boolean {
  return !!GITHUB_CLIENT_ID
}
