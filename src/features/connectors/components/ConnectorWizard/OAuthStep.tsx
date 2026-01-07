/**
 * OAuthStep Component
 *
 * Handles the OAuth authentication step of the connector wizard.
 * Shows connecting state, handles authentication, and displays errors.
 */

import { useEffect, useRef } from 'react'
import { Button } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { PROVIDER_CONFIG } from '../../providers/apps'
import type { AppConnectorProvider, OAuthResult, AccountInfo } from '../../types'
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

  const config = PROVIDER_CONFIG[provider]

  // Auto-start authentication when component mounts
  useEffect(() => {
    if (status === 'idle' && !hasStartedAuth.current) {
      hasStartedAuth.current = true
      onAuthenticate()
    }
  }, [status, onAuthenticate])

  // Call onSuccess when authentication completes
  useEffect(() => {
    if (status === 'success' && result && !hasCalledSuccess.current) {
      hasCalledSuccess.current = true
      onSuccess(result, accountInfo)
    }
  }, [status, result, accountInfo, onSuccess])

  // Reset refs when provider changes
  useEffect(() => {
    hasStartedAuth.current = false
    hasCalledSuccess.current = false
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
                  'A new window will open for you to authorize access. Please complete the authorization to continue.'
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
                {error || t('Something went wrong while connecting. Please try again.')}
              </p>
              <Button color="primary" onPress={onRetry}>
                {t('Try Again')}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default OAuthStep
