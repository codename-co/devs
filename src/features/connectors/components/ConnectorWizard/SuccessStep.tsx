/**
 * SuccessStep Component
 *
 * Shows a success message after a connector has been successfully added.
 * Displays a summary and offers options to start syncing or close.
 */

import { Button } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { PROVIDER_CONFIG } from '../../providers/apps'
import type { AppConnectorProvider, AccountInfo } from '../../types'
import localI18n from '../../pages/i18n'

// =============================================================================
// Types
// =============================================================================

interface SuccessStepProps {
  provider: AppConnectorProvider
  accountInfo: AccountInfo | null
  selectedFolders: string[] | null
  onStartSync: () => void
  onDone: () => void
}

// =============================================================================
// Component
// =============================================================================

/**
 * SuccessStep shows a success message and summary of the connected service
 *
 * @param provider - The connected provider
 * @param accountInfo - Account information from OAuth
 * @param selectedFolders - Selected folder IDs (null = all)
 * @param onStartSync - Callback to start syncing immediately
 * @param onDone - Callback to close the wizard
 */
export function SuccessStep({
  provider,
  accountInfo,
  selectedFolders,
  onStartSync,
  onDone,
}: SuccessStepProps) {
  const { t } = useI18n(localI18n)

  const config = PROVIDER_CONFIG[provider]
  const syncSupported = config?.syncSupported !== false

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Success Icon */}
      <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
        <Icon name="Check" className="w-8 h-8 text-success" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium mb-2">
        {t('Successfully connected!')}
      </h3>

      {/* Description */}
      <p className="text-default-500 text-center max-w-md mb-6">
        {syncSupported
          ? t('{name} has been connected to your knowledge base.', {
              name: config?.name || provider,
            })
          : t('{name} has been connected.', {
              name: config?.name || provider,
            })}
      </p>

      {/* Summary Card */}
      <div className="w-full max-w-sm bg-default-50 dark:bg-default-100/10 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          {config && (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon
                name={config.icon as any}
                className="w-5 h-5"
                style={{ color: config.color }}
              />
            </div>
          )}
          <div>
            <p className="font-medium">{config?.name || provider}</p>
            {accountInfo?.email && (
              <p className="text-xs text-default-400">{accountInfo.email}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-default-600">
            <Icon name="Check" className="w-4 h-4 text-success" />
            <span>{t('Connected and authorized')}</span>
          </div>
          {syncSupported && (
            <>
              <div className="flex items-center gap-2 text-default-600">
                <Icon name="Folder" className="w-4 h-4 text-warning" />
                <span>
                  {selectedFolders === null
                    ? t('Syncing all files')
                    : t('{n} folders selected', { n: selectedFolders.length })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-default-600">
                <Icon name="RefreshDouble" className="w-4 h-4 text-primary" />
                <span>{t('Auto-sync enabled')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="flat" onPress={onDone}>
          {t('Done')}
        </Button>
        {syncSupported && (
          <Button color="primary" onPress={onStartSync}>
            <Icon name="RefreshDouble" className="w-4 h-4 mr-1" />
            {t('Start Sync Now')}
          </Button>
        )}
      </div>
    </div>
  )
}

export default SuccessStep
