/**
 * OAuth Gateway
 *
 * Handles OAuth 2.0 authentication with PKCE for browser-based flows.
 * Supports Google (Drive, Gmail, Calendar) and Notion providers.
 *
 * Security features:
 * - PKCE (Proof Key for Code Exchange) to prevent authorization code interception
 * - State parameter to prevent CSRF attacks
 * - Automatic cleanup of stale pending auth states
 */

import type {
  AppConnectorProvider,
  OAuthConfig,
  OAuthResult,
  PendingOAuthState,
} from './types'

// =============================================================================
// Constants
// =============================================================================

/** Timeout for OAuth flows (5 minutes) */
const AUTH_TIMEOUT_MS = 5 * 60 * 1000

/** Popup window dimensions */
const POPUP_WIDTH = 500
const POPUP_HEIGHT = 700

/** PKCE code verifier length (must be 43-128 characters) */
const CODE_VERIFIER_LENGTH = 64

/** State parameter length */
const STATE_LENGTH = 32

// =============================================================================
// Provider OAuth Configurations
// =============================================================================

/**
 * OAuth configurations for supported providers
 * Google services share the same OAuth endpoints
 */
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  // Google services share OAuth config
  // Note: Google requires client_secret even for SPAs with PKCE
  // This is safe because the secret alone cannot be used without user consent
  'google-drive': {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    pkceRequired: true,
  },
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    pkceRequired: true,
  },
  'google-calendar': {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    pkceRequired: true,
  },
  notion: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    // Use proxy in development to avoid CORS, direct URL in production (requires backend proxy)
    tokenUrl: import.meta.env.DEV
      ? '/api/notion/oauth/token'
      : 'https://api.notion.com/v1/oauth/token',
    clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_NOTION_CLIENT_SECRET || '',
    scopes: [], // Notion uses owner permission level, not scopes
    pkceRequired: false, // Notion doesn't require PKCE
    // Notion requires Basic Auth header instead of client_secret in body
    useBasicAuth: true,
  },
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientId: import.meta.env.VITE_DROPBOX_CLIENT_ID || '',
    scopes: ['files.metadata.read', 'files.content.read'],
    pkceRequired: true,
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    scopes: ['repo', 'read:user'],
    pkceRequired: false,
  },
}

// =============================================================================
// OAuth Gateway Class
// =============================================================================

/**
 * OAuthGateway handles OAuth 2.0 authentication flows with PKCE support
 *
 * Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Generate random state for CSRF protection
 * 3. Open popup with authorization URL
 * 4. Wait for callback with authorization code
 * 5. Exchange code for tokens using the code verifier
 */
export class OAuthGateway {
  /** Map to track pending OAuth flows by state parameter */
  private static pendingAuth: Map<string, PendingOAuthState> = new Map()

  // ===========================================================================
  // PKCE Methods
  // ===========================================================================

  /**
   * Generate a cryptographically random code verifier for PKCE
   * Must be 43-128 characters using unreserved URL characters
   *
   * @returns Base64URL-encoded random string (64 characters)
   */
  static generateCodeVerifier(): string {
    const array = new Uint8Array(CODE_VERIFIER_LENGTH)
    crypto.getRandomValues(array)
    return this.base64UrlEncode(array)
  }

  /**
   * Generate code challenge from code verifier using SHA-256
   * This is sent to the authorization server and later verified
   *
   * @param verifier - The code verifier string
   * @returns Base64URL-encoded SHA-256 hash of the verifier
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return this.base64UrlEncode(new Uint8Array(digest))
  }

  /**
   * Generate a random state parameter for CSRF protection
   *
   * @returns Random base64URL-encoded string
   */
  static generateState(): string {
    const array = new Uint8Array(STATE_LENGTH)
    crypto.getRandomValues(array)
    return this.base64UrlEncode(array)
  }

  // ===========================================================================
  // Provider Configuration
  // ===========================================================================

  /**
   * Get OAuth configuration for a provider
   *
   * @param provider - The app connector provider
   * @returns OAuth configuration for the provider
   * @throws Error if provider is not supported
   */
  static getProviderOAuthConfig(provider: AppConnectorProvider): OAuthConfig {
    const config = OAUTH_CONFIGS[provider]
    if (!config) {
      throw new Error(`OAuth not configured for provider: ${provider}`)
    }
    if (!config.clientId) {
      throw new Error(
        `Missing client ID for provider: ${provider}. Check environment variables.`,
      )
    }
    return config
  }

  /**
   * Get the redirect URI for OAuth callbacks
   *
   * @returns The OAuth redirect URI
   */
  static getRedirectUri(): string {
    return (
      import.meta.env.VITE_OAUTH_REDIRECT_URI ||
      `${window.location.origin}/oauth/callback`
    )
  }

  // ===========================================================================
  // Authorization URL Building
  // ===========================================================================

  /**
   * Build the authorization URL with all required parameters
   *
   * @param provider - The app connector provider
   * @param state - Random state for CSRF protection
   * @param codeChallenge - PKCE code challenge (SHA-256 hash of verifier)
   * @returns Complete authorization URL
   */
  static buildAuthUrl(
    provider: AppConnectorProvider,
    state: string,
    codeChallenge: string,
  ): string {
    const config = this.getProviderOAuthConfig(provider)
    const params = new URLSearchParams()

    params.set('client_id', config.clientId)
    params.set('redirect_uri', this.getRedirectUri())
    params.set('response_type', 'code')
    params.set('state', state)

    // Add scopes if configured
    if (config.scopes.length > 0) {
      params.set('scope', config.scopes.join(' '))
    }

    // Add PKCE parameters if required
    if (config.pkceRequired) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }

    // Provider-specific parameters
    if (provider.startsWith('google')) {
      // Google-specific: request offline access for refresh token
      params.set('access_type', 'offline')
      params.set('prompt', 'consent')
    } else if (provider === 'notion') {
      // Notion-specific: owner permission
      params.set('owner', 'user')
    } else if (provider === 'dropbox') {
      // Dropbox-specific: token access type
      params.set('token_access_type', 'offline')
    }

    return `${config.authUrl}?${params.toString()}`
  }

  // ===========================================================================
  // OAuth Flow
  // ===========================================================================

  /**
   * Initiate the OAuth authentication flow
   * Opens a popup window and returns a promise that resolves with tokens
   *
   * @param provider - The app connector provider to authenticate with
   * @returns Promise resolving to OAuth tokens
   * @throws Error if authentication fails or is cancelled
   */
  static async authenticate(
    provider: AppConnectorProvider,
  ): Promise<OAuthResult> {
    // Generate PKCE values
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = this.generateState()

    // Store pending auth state
    const pendingState: PendingOAuthState = {
      provider,
      codeVerifier,
      timestamp: Date.now(),
    }
    this.pendingAuth.set(state, pendingState)

    // Build authorization URL
    const authUrl = this.buildAuthUrl(provider, state, codeChallenge)

    // Open popup window
    const popup = this.openAuthPopup(authUrl)
    if (!popup) {
      this.pendingAuth.delete(state)
      throw new Error(
        'Failed to open authentication popup. Please allow popups for this site.',
      )
    }

    try {
      // Wait for callback from popup
      const { code, receivedState } = await this.waitForCallback(popup, state)

      // Verify state matches
      if (!receivedState || receivedState !== state) {
        console.error('[OAuthGateway] State mismatch:', {
          expected: state,
          received: receivedState,
          hasReceived: !!receivedState,
        })
        throw new Error('OAuth state mismatch. Please try again.')
      }

      // Exchange code for tokens
      return await this.exchangeCodeForTokens(provider, code, codeVerifier)
    } finally {
      // Clean up
      this.pendingAuth.delete(state)
      if (!popup.closed) {
        popup.close()
      }
    }
  }

  /**
   * Handle OAuth callback from the popup window
   * Called by the callback page with the authorization code
   *
   * @param code - Authorization code from the provider
   * @param state - State parameter for verification
   * @returns Promise resolving to OAuth tokens
   * @throws Error if state is invalid or token exchange fails
   */
  static async handleCallback(
    code: string,
    state: string,
  ): Promise<OAuthResult> {
    const pendingState = this.pendingAuth.get(state)
    if (!pendingState) {
      throw new Error('Invalid or expired OAuth state')
    }

    // Check if the state has expired
    if (Date.now() - pendingState.timestamp > AUTH_TIMEOUT_MS) {
      this.pendingAuth.delete(state)
      throw new Error('OAuth authentication timed out')
    }

    try {
      return await this.exchangeCodeForTokens(
        pendingState.provider,
        code,
        pendingState.codeVerifier,
      )
    } finally {
      this.pendingAuth.delete(state)
    }
  }

  /**
   * Clean up old pending auth states that have timed out
   * Should be called periodically or before starting new auth flows
   */
  static cleanup(): void {
    const now = Date.now()
    for (const [state, pending] of this.pendingAuth.entries()) {
      if (now - pending.timestamp > AUTH_TIMEOUT_MS) {
        this.pendingAuth.delete(state)
      }
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Encode a Uint8Array to base64URL format
   * Used for PKCE code verifier, challenge, and state
   *
   * @param buffer - The byte array to encode
   * @returns Base64URL-encoded string
   */
  private static base64UrlEncode(buffer: Uint8Array): string {
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...buffer))
    // Convert to base64URL (URL-safe variant)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Open a centered popup window for OAuth authentication
   *
   * @param url - The authorization URL to open
   * @returns The popup window reference, or null if blocked
   */
  private static openAuthPopup(url: string): Window | null {
    const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2
    const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2

    const features = [
      `width=${POPUP_WIDTH}`,
      `height=${POPUP_HEIGHT}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes',
    ].join(',')

    return window.open(url, 'oauth_popup', features)
  }

  /**
   * Wait for the OAuth callback from the popup window
   * Listens for postMessage from the callback page
   *
   * @param popup - The popup window reference
   * @param _expectedState - The state parameter to match (verified by caller)
   * @returns Promise resolving to the authorization code and state
   */
  private static waitForCallback(
    popup: Window,
    expectedState: string,
  ): Promise<{ code: string; receivedState: string }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== window.location.origin) {
          return
        }

        // Check if this is an OAuth callback message
        if (event.data?.type !== 'oauth_callback') {
          return
        }

        // IMPORTANT: Only process messages for OUR state
        // This prevents issues when multiple OAuth flows are started (e.g., React Strict Mode)
        if (event.data.state && event.data.state !== expectedState) {
          console.log('[OAuthGateway] Ignoring callback for different state:', {
            receivedState: event.data.state,
            expectedState,
          })
          return
        }

        console.log('[OAuthGateway] Received callback message:', {
          hasCode: !!event.data.code,
          hasState: !!event.data.state,
          receivedState: event.data.state,
          expectedState,
          statesMatch: event.data.state === expectedState,
        })

        cleanup()

        if (event.data.error) {
          reject(
            new Error(
              event.data.error_description || event.data.error || 'OAuth error',
            ),
          )
          return
        }

        if (!event.data.code) {
          reject(new Error('No authorization code received'))
          return
        }

        resolve({
          code: event.data.code,
          receivedState: event.data.state,
        })
      }

      // Check if popup is closed
      // Note: COOP (Cross-Origin-Opener-Policy) may block window.closed access
      // We wrap this in try-catch to handle gracefully
      const checkClosed = setInterval(() => {
        try {
          if (popup.closed) {
            cleanup()
            reject(new Error('Authentication cancelled'))
          }
        } catch {
          // COOP blocks access to popup.closed - rely on postMessage instead
          // The flow will complete via postMessage or timeout
        }
        // Timeout check
        if (Date.now() - startTime > AUTH_TIMEOUT_MS) {
          cleanup()
          reject(new Error('Authentication timed out'))
        }
      }, 500)

      const cleanup = () => {
        window.removeEventListener('message', handleMessage)
        clearInterval(checkClosed)
      }

      window.addEventListener('message', handleMessage)
    })
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param provider - The OAuth provider
   * @param code - The authorization code
   * @param codeVerifier - The PKCE code verifier
   * @returns Promise resolving to OAuth tokens
   */
  private static async exchangeCodeForTokens(
    provider: AppConnectorProvider,
    code: string,
    codeVerifier: string,
  ): Promise<OAuthResult> {
    const config = this.getProviderOAuthConfig(provider)

    // Prepare headers
    const headers: HeadersInit = {}

    // Provider-specific handling
    if (provider === 'github') {
      headers['Accept'] = 'application/json'
    }

    let requestBody: string

    // Notion uses JSON body with Basic Auth (handled by Vite proxy in dev)
    if (config.useBasicAuth) {
      headers['Content-Type'] = 'application/json'
      requestBody = JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getRedirectUri(),
      })
    } else {
      // Standard OAuth uses URL-encoded form body
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      const body = new URLSearchParams()
      body.set('grant_type', 'authorization_code')
      body.set('code', code)
      body.set('redirect_uri', this.getRedirectUri())
      body.set('client_id', config.clientId)

      // Add client_secret if configured (required for Google even with PKCE)
      if (config.clientSecret) {
        body.set('client_secret', config.clientSecret)
      }

      // Add PKCE verifier if required
      if (config.pkceRequired) {
        body.set('code_verifier', codeVerifier)
      }

      requestBody = body.toString()
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers,
        body: requestBody,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error_description ||
            errorData.error ||
            `Token exchange failed: ${response.status}`,
        )
      }

      const data = await response.json()

      // Normalize response to OAuthResult
      return this.normalizeTokenResponse(data, provider)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  /**
   * Normalize token response from different providers
   * Different providers use different field names
   *
   * @param data - Raw token response from provider
   * @param provider - The OAuth provider
   * @returns Normalized OAuthResult
   */
  private static normalizeTokenResponse(
    data: Record<string, unknown>,
    provider: AppConnectorProvider,
  ): OAuthResult {
    // Handle Notion's different response format
    if (provider === 'notion') {
      return {
        accessToken: data.access_token as string,
        refreshToken: undefined, // Notion tokens don't expire
        expiresIn: undefined,
        scope: '', // Notion doesn't return scope
        tokenType: (data.token_type as string) || 'bearer',
      }
    }

    // Standard OAuth 2.0 response
    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      expiresIn: data.expires_in as number | undefined,
      scope: (data.scope as string) || '',
      tokenType: (data.token_type as string) || 'Bearer',
    }
  }

  /**
   * Get pending auth state by state parameter
   * Useful for debugging or manual callback handling
   *
   * @param state - The state parameter
   * @returns The pending auth state, or undefined if not found
   */
  static getPendingAuth(state: string): PendingOAuthState | undefined {
    return this.pendingAuth.get(state)
  }

  /**
   * Check if there are any pending auth flows
   *
   * @returns True if there are pending auth flows
   */
  static hasPendingAuth(): boolean {
    return this.pendingAuth.size > 0
  }
}
