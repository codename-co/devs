import { Chip, Progress, Tooltip } from '@heroui/react'
import { Icon } from '@/components/Icon'
import type { Connector, ConnectorSyncState } from '../types'
import { SyncEngine } from '../sync-engine'

interface ConnectorSyncStatusProps {
  connector: Connector
  syncState?: ConnectorSyncState
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Size configurations for the sync status component
 */
const SIZE_CONFIG = {
  sm: {
    chip: 'sm' as const,
    icon: 14,
    progressHeight: 'h-1',
    text: 'text-xs',
  },
  md: {
    chip: 'md' as const,
    icon: 16,
    progressHeight: 'h-1.5',
    text: 'text-sm',
  },
  lg: {
    chip: 'lg' as const,
    icon: 18,
    progressHeight: 'h-2',
    text: 'text-base',
  },
}

/**
 * ConnectorSyncStatus Component
 *
 * Displays the current sync status of a connector with visual indicators:
 * - Connected: Green chip with checkmark
 * - Syncing: Animated progress bar
 * - Error: Red chip with error message on hover
 * - Expired: Orange chip indicating token expiration
 */
export function ConnectorSyncStatus({
  connector,
  syncState,
  showLabel = true,
  size = 'md',
}: ConnectorSyncStatusProps) {
  const config = SIZE_CONFIG[size]
  const status = connector.status
  // Check both SyncEngine (for job status) and syncState (for reactive updates)
  const isSyncing =
    SyncEngine.isSyncing(connector.id) || syncState?.status === 'syncing'

  // Handle syncing state with animated progress
  if (isSyncing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-[60px] max-w-[120px]">
          <Progress
            size={config.chip}
            isIndeterminate
            color="primary"
            aria-label="Syncing"
            classNames={{
              track: config.progressHeight,
              indicator: `${config.progressHeight} animate-pulse`,
            }}
          />
        </div>
        {showLabel && (
          <span className={`${config.text} text-primary animate-pulse`}>
            Syncing...
          </span>
        )}
      </div>
    )
  }

  // Handle connected state
  if (status === 'connected') {
    return (
      <Chip
        size={config.chip}
        color="success"
        variant="flat"
        startContent={
          <Icon name="Check" width={config.icon} height={config.icon} />
        }
      >
        {showLabel ? 'Connected' : null}
      </Chip>
    )
  }

  // Handle error state with tooltip showing error message
  if (status === 'error') {
    const errorMessage =
      connector.errorMessage || syncState?.errorMessage || 'Unknown error'

    return (
      <Tooltip content={errorMessage} color="danger" placement="top">
        <Chip
          size={config.chip}
          color="danger"
          variant="flat"
          startContent={
            <Icon
              name="WarningTriangle"
              width={config.icon}
              height={config.icon}
            />
          }
        >
          {showLabel ? 'Error' : null}
        </Chip>
      </Tooltip>
    )
  }

  // Handle expired token state
  if (status === 'expired') {
    return (
      <Tooltip
        content="Token has expired. Please reconnect."
        color="warning"
        placement="top"
      >
        <Chip
          size={config.chip}
          color="warning"
          variant="flat"
          startContent={
            <Icon name="Clock" width={config.icon} height={config.icon} />
          }
        >
          {showLabel ? 'Token expired' : null}
        </Chip>
      </Tooltip>
    )
  }

  // Default/unknown state
  return (
    <Chip size={config.chip} color="default" variant="flat">
      {showLabel ? 'Unknown' : null}
    </Chip>
  )
}
