import { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  CardBody,
  Progress,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@heroui/react'
import { Icon } from '@/components/Icon'
import { useConnectorStore } from '../stores'
import { ConnectorIcon } from './ConnectorIcon'
import { SyncEngine } from '../sync-engine'
import type { Connector } from '../types'

interface GlobalSyncIndicatorProps {
  position?: 'top-right' | 'bottom-right'
}

/**
 * GlobalSyncIndicator Component
 *
 * A floating indicator that shows when any connector is syncing.
 * Features:
 * - Shows count of syncing connectors
 * - Click to expand and see details
 * - Auto-hides when no sync in progress
 */
export function GlobalSyncIndicator({
  position = 'bottom-right',
}: GlobalSyncIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { connectors, syncStates } = useConnectorStore()

  // Get all syncing connectors
  // Check both SyncEngine (for job status) and syncState (for reactive updates)
  const syncingConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      const syncState = syncStates.get(connector.id)
      return (
        SyncEngine.isSyncing(connector.id) || syncState?.status === 'syncing'
      )
    })
  }, [connectors, syncStates])

  const syncCount = syncingConnectors.length
  const hasSyncing = syncCount > 0

  // Auto-close popover when no longer syncing
  useEffect(() => {
    if (!hasSyncing && isOpen) {
      setIsOpen(false)
    }
  }, [hasSyncing, isOpen])

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 end-4',
    'bottom-right': 'bottom-4 end-4',
  }

  // Don't render if nothing is syncing
  if (!hasSyncing) {
    return null
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement={position.includes('bottom') ? 'top-end' : 'bottom-end'}
      >
        <PopoverTrigger>
          <Button
            isIconOnly
            color="primary"
            variant="shadow"
            className="relative animate-pulse"
            aria-label={`${syncCount} connector${syncCount > 1 ? 's' : ''} syncing`}
          >
            <Icon name="RefreshDouble" className="w-5 h-5 animate-spin" />
            {syncCount > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-medium">
                {syncCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-72">
          <Card shadow="none" className="border-none">
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  name="RefreshDouble"
                  className="w-4 h-4 text-primary animate-spin"
                />
                <span className="text-sm font-medium">
                  Syncing {syncCount} connector{syncCount > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {syncingConnectors.map((connector) => (
                  <SyncingConnectorItem
                    key={connector.id}
                    connector={connector}
                    syncState={syncStates.get(connector.id)}
                  />
                ))}
              </div>
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * Individual syncing connector item in the popover
 */
interface SyncingConnectorItemProps {
  connector: Connector
  syncState?: ReturnType<
    typeof useConnectorStore.getState
  >['syncStates'] extends Map<string, infer T>
    ? T
    : never
}

function SyncingConnectorItem({
  connector,
  syncState,
}: SyncingConnectorItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        <ConnectorIcon provider={connector.provider} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{connector.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress
            size="sm"
            isIndeterminate
            color="primary"
            aria-label={`Syncing ${connector.name}`}
            classNames={{
              track: 'h-1',
              indicator: 'h-1',
            }}
            className="flex-1"
          />
          {syncState?.itemsSynced ? (
            <span className="text-xs text-default-400 flex-shrink-0">
              {syncState.itemsSynced} items
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
