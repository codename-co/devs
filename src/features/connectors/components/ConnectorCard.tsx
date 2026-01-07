import { Card, CardBody, CardHeader, Button, Chip } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { Connector, ConnectorStatus } from '../types'
import { PROVIDER_CONFIG } from '../providers/apps'
import localI18n from '../pages/i18n'

interface ConnectorCardProps {
  connector: Connector
  onSync: () => void
  onDisconnect: () => void
  onSettings: () => void
}

/**
 * ConnectorCard Component
 *
 * Displays a single connector with its status, last sync time,
 * and action buttons for sync, settings, and disconnect.
 */
export function ConnectorCard({
  connector,
  onSync,
  onDisconnect,
  onSettings,
}: ConnectorCardProps) {
  const { t, lang } = useI18n(localI18n)

  // Get provider config for icon and name
  const providerConfig =
    PROVIDER_CONFIG[connector.provider as keyof typeof PROVIDER_CONFIG]
  const providerName = providerConfig?.name || connector.name
  const providerIcon = providerConfig?.icon || 'AppWindow'
  const providerColor = providerConfig?.color || '#888888'

  // Format last sync time
  const formatLastSync = (date?: Date) => {
    if (!date) return t('Never synced')

    const syncDate = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - syncDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('Just now')
    if (diffMins < 60) return t('{n} minutes ago', { n: diffMins })
    if (diffHours < 24) return t('{n} hours ago', { n: diffHours })
    if (diffDays < 7) return t('{n} days ago', { n: diffDays })

    return syncDate.toLocaleDateString(lang, {
      month: 'short',
      day: 'numeric',
      year:
        syncDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  // Get status chip properties
  const getStatusChip = (status: ConnectorStatus) => {
    const statusConfig: Record<
      ConnectorStatus,
      { color: 'success' | 'danger' | 'warning' | 'default'; label?: string }
    > = {
      connected: { color: 'success' },
      error: { color: 'danger', label: t('Error') },
      expired: { color: 'warning', label: t('Expired') },
      syncing: { color: 'warning' },
    }
    return statusConfig[status] || statusConfig.connected
  }

  const statusChip = getStatusChip(connector.status)
  const isSyncing = connector.status === 'syncing'

  return (
    <Card className="border border-divider">
      <CardHeader className="flex gap-3 pb-0">
        {/* Provider Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-default-200"
          style={{ backgroundColor: `${providerColor}20` }}
        >
          <Icon
            name={providerIcon as any}
            className="w-5 h-5"
            style={{ color: providerColor }}
          />
        </div>

        {/* Provider Name */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate">{providerName}</h4>
        </div>

        {/* Status Chip */}
        <Chip
          size="sm"
          color={statusChip.color}
          className="w-40"
          variant="flat"
          startContent={
            isSyncing && (
              <Icon name="RefreshDouble" className="w-3 h-3 animate-spin" />
            )
          }
        >
          {statusChip.label}
        </Chip>
      </CardHeader>

      <CardBody className="pt-3">
        {/* Error Message */}
        {connector.status === 'error' && connector.errorMessage && (
          <div className="mb-3 p-2 rounded-lg bg-danger-50 dark:bg-danger-900/20">
            <p className="text-xs text-danger">{connector.errorMessage}</p>
          </div>
        )}

        {/* Last Sync Time */}
        <div className="flex items-center gap-2 text-xs text-default-500 mb-3">
          <Icon name="Clock" className="w-3 h-3" />
          <span>
            {t('Last sync:')} {formatLastSync(connector.lastSyncAt)}
          </span>
        </div>

        {/* Sync Folders Info */}
        {connector.syncFolders && connector.syncFolders.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-default-500 mb-3">
            <Icon name="Folder" className="w-3 h-3" />
            <span>
              {t('{n} folders syncing', { n: connector.syncFolders.length })}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Sync Action */}
          <Button
            size="sm"
            variant="flat"
            isDisabled={isSyncing}
            isLoading={isSyncing}
            startContent={
              !isSyncing && <Icon name="RefreshDouble" className="w-3 h-3" />
            }
            onPress={onSync}
            className="w-full"
          >
            {isSyncing ? t('Syncing...') : t('Sync Now')}
          </Button>

          {/* Other Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<Icon name="Settings" className="w-3 h-3" />}
              onPress={onSettings}
              className="flex-1"
            >
              {t('Settings')}
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              startContent={<Icon name="Xmark" className="w-3 h-3" />}
              onPress={onDisconnect}
              className="flex-1"
            >
              {t('Disconnect')}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default ConnectorCard
