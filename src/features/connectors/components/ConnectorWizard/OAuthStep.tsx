/**
 * OAuthStep Component
 *
 * Handles the OAuth authentication step of the connector wizard.
 * Shows connecting state, handles authentication, and displays errors.
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { getProvider } from '../../providers/apps'
import type {
  AppConnectorProvider,
  OAuthResult,
  AccountInfo,
} from '../../types'
import type { OAuthStatus } from '@/hooks/useOAuth'
import localI18n from '../../pages/i18n'

// =============================================================================
// Types
// =============================================================================

interface OAuthStepProps {
  provider: AppConnectorProvider
  status: OAuthStatus
  error: string | null
  onAuthenticate: () => Promise<void>
  onRetry: () => void
  onSuccess: (result: OAuthResult, accountInfo: AccountInfo | null) => void
  result: OAuthResult | null
  accountInfo: AccountInfo | null
}

// =============================================================================
// Component
// =============================================================================

/**
 * OAuthStep shows the OAuth authentication progress and handles errors
 *
 * @param provider - The provider being authenticated
 * @param status - Current OAuth status
 * @param error - Error message if authentication failed
 * @param onAuthenticate - Function to start authentication
 * @param onRetry - Function to retry authentication
 * @param onSuccess - Callback when authentication succeeds
 * @param result - OAuth result on success
 * @param accountInfo - Account info from the provider
 */
export function OAuthStep({
  provider,
  status,
  error,
  onAuthenticate,
  onRetry,
  onSuccess,
  result,
  accountInfo,
}: OAuthStepProps) {
  const { t } = useI18n(localI18n)
  const hasStartedAuth = useRef(false)
  const hasCalledSuccess = useRef(false)
  const [showMissingRefreshTokenWarning, setShowMissingRefreshTokenWarning] =
    useState(false)

  const config = getProvider(provider)
  const isGoogleProvider = provider.startsWith('google') || provider === 'gmail'

  // Auto-start authentication when component mounts
  useEffect(() => {
    if (status === 'idle' && !hasStartedAuth.current) {
      hasStartedAuth.current = true
      onAuthenticate()
    }
  }, [status, onAuthenticate])

  // Call onSuccess when authentication completes
  // For Google providers, warn if no refresh token was received
  useEffect(() => {
    if (status === 'success' && result && !hasCalledSuccess.current) {
      hasCalledSuccess.current = true

      // Check if this is a Google provider and no refresh token was received
      if (isGoogleProvider && !result.refreshToken) {
        setShowMissingRefreshTokenWarning(true)
        // Still proceed, but user has been warned
        console.warn(
          '[OAuthStep] No refresh token received from Google. User may need to revoke access and reconnect.',
        )
      }

      onSuccess(result, accountInfo)
    }
  }, [status, result, accountInfo, onSuccess, isGoogleProvider])

  // Reset refs when provider changes
  useEffect(() => {
    hasStartedAuth.current = false
    hasCalledSuccess.current = false
    setShowMissingRefreshTokenWarning(false)
  }, [provider])

  const isLoading = status === 'idle' || status === 'loading'
  const isError = status === 'error'

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {config && (
        <>
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon
              name={config.icon as any}
              className="w-8 h-8"
              style={{ color: config.color }}
            />
          </div>

          {isLoading && (
            <>
              <h3 className="text-lg font-medium mb-2">
                {t('Connecting to {name}...', { name: config.name })}
              </h3>
              <p className="text-default-500 text-center max-w-md">
                {t(
                  'A new window will open for you to authorize access. Please complete the authorization to continue.',
                )}
              </p>
              <div className="mt-6">
                <Icon
                  name="RefreshDouble"
                  className="w-6 h-6 animate-spin text-primary"
                />
              </div>
            </>
          )}

          {isError && (
            <>
              <h3 className="text-lg font-medium mb-2 text-danger">
                {t('Connection failed')}
              </h3>
              <p className="text-default-500 text-center max-w-md mb-4">
                {error ||
                  t('Something went wrong while connecting. Please try again.')}
              </p>
              <Button color="primary" onPress={onRetry}>
                {t('Try Again')}
              </Button>
            </>
          )}

          {showMissingRefreshTokenWarning && (
            <div className="mt-6 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg max-w-md">
              <div className="flex items-start gap-3">
                <Icon
                  name="WarningTriangle"
                  className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
                    {t('Limited session')}
                  </p>
                  <p className="text-xs text-warning-700 dark:text-warning-300 mt-1">
                    {t(
                      'Google did not provide a refresh token. Your session will expire in about 1 hour. To enable automatic token refresh, go to myaccount.google.com/permissions, revoke access to DEVS, then reconnect.',
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default OAuthStep
