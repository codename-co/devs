import { Card, CardBody } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '../stores'
import type { Connector, ConnectorStatus, AppConnectorProvider } from '../types'
import { getProvider } from '../providers/apps'
import { SyncEngine } from '../sync-engine'
import localI18n from '../pages/i18n'

interface ConnectorCardProps {
  connector: Connector
  onClick: () => void
}

/**
 * ConnectorCard Component
 *
 * Displays a single connector with its status and tools count.
 * The entire card is clickable and opens the details modal.
 */
export function ConnectorCard({ connector, onClick }: ConnectorCardProps) {
  const { t } = useI18n(localI18n)
  const { getSyncState } = useConnectorStore()

  // Get sync state for reactive updates
  const syncState = getSyncState(connector.id)

  // Get provider config for icon and name
  const providerConfig = getProvider(connector.provider as AppConnectorProvider)
  const providerName = providerConfig?.name || connector.name
  const providerIcon = providerConfig?.icon || 'AppWindow'
  const providerColor = providerConfig?.color || '#888888'

  // Get status indicator config (includes 'syncing' for display purposes only)
  const getStatusConfig = (status: ConnectorStatus | 'syncing') => {
    const config: Record<
      ConnectorStatus | 'syncing',
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

  // Check both SyncEngine (for job status) and syncState (for reactive updates)
  const isSyncing =
    SyncEngine.isSyncing(connector.id) || syncState?.status === 'syncing'
  const statusConfig = getStatusConfig(isSyncing ? 'syncing' : connector.status)

  return (
    <Card
      isPressable
      onPress={onClick}
      className="group border border-divider hover:border-primary/30 transition-colors cursor-pointer"
    >
      <CardBody className="p-4 gap-3">
        {/* Header: Icon + Name + Status */}
        <div className="flex items-center gap-3">
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

          {/* Chevron indicator */}
          <Icon
            name="NavArrowRight"
            className="w-4 h-4 text-default-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </CardBody>
    </Card>
  )
}

export default ConnectorCard
