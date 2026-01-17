import { useMemo } from 'react'
import {
  Card,
  CardBody,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
} from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { Connector, ConnectorStatus } from '../types'
import { PROVIDER_CONFIG } from '../providers/apps'
import { getToolDefinitionsForProvider } from '../tools'
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
 * and unified action menu for sync, settings, and disconnect.
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

  // Get status indicator config
  const getStatusConfig = (status: ConnectorStatus) => {
    const config: Record<
      ConnectorStatus,
      { color: string; bgColor: string; label: string; icon?: string }
    > = {
      connected: {
        color: 'text-success',
        bgColor: 'bg-success',
        label: t('Connected'),
      },
      error: {
        color: 'text-danger',
        bgColor: 'bg-danger',
        label: t('Error'),
        icon: 'WarningTriangle',
      },
      expired: {
        color: 'text-warning',
        bgColor: 'bg-warning',
        label: t('Expired'),
        icon: 'Clock',
      },
      syncing: {
        color: 'text-primary',
        bgColor: 'bg-primary',
        label: t('Syncing'),
      },
    }
    return config[status] || config.connected
  }

  const statusConfig = getStatusConfig(connector.status)
  const isSyncing = connector.status === 'syncing'
  const hasError =
    connector.status === 'error' || connector.status === 'expired'

  // Get the number of tools for this provider
  const toolCount = useMemo(() => {
    return getToolDefinitionsForProvider(connector.provider).length
  }, [connector.provider])

  return (
    <Card className="group border border-divider hover:border-primary/30 transition-colors">
      <CardBody className="p-4">
        {/* Header: Icon + Name + Status + Menu */}
        <div className="flex items-center gap-3 mb-3">
          {/* Provider Icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: `${providerColor}15` }}
          >
            <Icon
              name={providerIcon as any}
              className="w-6 h-6"
              style={{ color: providerColor }}
            />
          </div>

          {/* Name + Status */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold truncate">{providerName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${statusConfig.bgColor} ${isSyncing ? 'animate-pulse' : ''}`}
              />
              <span className={`text-xs ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light">
                <Icon name="MoreVert" className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label={t('Connector actions')}>
              <DropdownItem
                key="settings"
                startContent={<Icon name="Settings" className="w-4 h-4" />}
                onPress={onSettings}
              >
                {t('Settings')}
              </DropdownItem>
              <DropdownItem
                key="disconnect"
                className="text-danger"
                color="danger"
                startContent={<Icon name="Xmark" className="w-4 h-4" />}
                onPress={onDisconnect}
              >
                {t('Disconnect')}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Error Message */}
        {hasError && connector.errorMessage && (
          <Tooltip content={connector.errorMessage} placement="bottom">
            <div className="mb-3 p-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 cursor-help">
              <p className="text-xs text-danger line-clamp-2">
                {connector.errorMessage}
              </p>
            </div>
          </Tooltip>
        )}

        {/* Footer: Sync info + Sync button */}
        <div className="flex items-center justify-between pt-2 border-t border-divider">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-default-500">
              {formatLastSync(connector.lastSyncAt)}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-default-400">
              {toolCount > 0 && (
                <span className="flex items-center gap-1">
                  <Icon name="Puzzle" className="w-2.5 h-2.5" />
                  {t('{n} tools', { n: toolCount })}
                </span>
              )}
              {connector.syncFolders && connector.syncFolders.length > 0 && (
                <span>
                  {t('{n} folders syncing', {
                    n: connector.syncFolders.length,
                  })}
                </span>
              )}
            </div>
          </div>

          <Button
            size="sm"
            variant="flat"
            color="primary"
            isDisabled={isSyncing}
            isLoading={isSyncing}
            startContent={
              !isSyncing && (
                <Icon name="RefreshDouble" className="w-3.5 h-3.5" />
              )
            }
            onPress={onSync}
          >
            {isSyncing ? t('Syncing...') : t('Sync')}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export default ConnectorCard
