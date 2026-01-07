/**
 * useOAuth Hook
 *
 * Manages OAuth authentication flow state for app connectors.
 * Handles loading states, errors, and authentication results.
 */

import { useState, useCallback } from 'react'
import { OAuthGateway } from '@/features/connectors/oauth-gateway'
import { ProviderRegistry } from '@/features/connectors/provider-registry'
import type {
  AppConnectorProvider,
  OAuthResult,
  AccountInfo,
} from '@/features/connectors/types'

// =============================================================================
// Types
// =============================================================================

export type OAuthStatus = 'idle' | 'loading' | 'success' | 'error'

export interface OAuthState {
  status: OAuthStatus
  error: string | null
  result: OAuthResult | null
  accountInfo: AccountInfo | null
}

export interface UseOAuthReturn extends OAuthState {
  authenticate: () => Promise<void>
  reset: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage OAuth authentication flow
 *
 * @param provider - The app connector provider to authenticate with
 * @returns OAuth state and authentication function
 *
 * @example
 * ```tsx
 * const { status, error, result, authenticate, reset } = useOAuth('google-drive')
 *
 * // Start authentication
 * await authenticate()
 *
 * // Check status
 * if (status === 'success') {
 *   console.log('Access token:', result?.accessToken)
 * }
 * ```
 */
export function useOAuth(provider: AppConnectorProvider | null): UseOAuthReturn {
  const [status, setStatus] = useState<OAuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OAuthResult | null>(null)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)

  /**
   * Start the OAuth authentication flow
   * Opens a popup window and handles the OAuth callback
   */
  const authenticate = useCallback(async () => {
    if (!provider) {
      setError('No provider selected')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)
    setResult(null)
    setAccountInfo(null)

    try {
      // Start OAuth flow using the OAuthGateway
      const oauthResult = await OAuthGateway.authenticate(provider)
      setResult(oauthResult)

      // Try to get account info from the provider
      try {
        const providerInstance = await ProviderRegistry.get(provider)
        if (providerInstance && 'getAccountInfo' in providerInstance) {
          const info = await (providerInstance as any).getAccountInfo(
            oauthResult.accessToken
          )
          setAccountInfo(info)
        }
      } catch (accountError) {
        // Account info is optional, don't fail the whole flow
        console.warn('Failed to get account info:', accountError)
      }

      setStatus('success')
    } catch (err) {
      console.error('OAuth authentication failed:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setStatus('error')
    }
  }, [provider])

  /**
   * Reset the OAuth state to initial values
   */
  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setResult(null)
    setAccountInfo(null)
  }, [])

  return {
    status,
    error,
    result,
    accountInfo,
    authenticate,
    reset,
  }
}

export default useOAuth
