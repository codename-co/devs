import { useState, useCallback, useMemo } from 'react'
import { useConnectorStore } from '../stores'
import { infoToast, successToast, errorToast } from '@/lib/toast'
import type { ConnectorSyncState, AppConnectorProvider } from '../types'
import { getProvider } from '../providers/apps'
import { SyncEngine } from '../sync-engine'

interface UseConnectorSyncOptions {
  /** Show toast notifications for sync events */
  showToasts?: boolean
}

interface UseConnectorSyncReturn {
  /** Whether the connector is currently syncing */
  isSyncing: boolean
  /** Sync progress from 0-100 (or undefined if indeterminate) */
  progress: number | undefined
  /** Last sync timestamp */
  lastSyncAt: Date | null
  /** Error message if sync failed */
  error: string | null
  /** Full sync state object */
  syncState: ConnectorSyncState | undefined
  /** Start a sync operation */
  sync: () => Promise<void>
  /** Cancel ongoing sync operation */
  cancel: () => void
}

/**
 * useConnectorSync Hook
 *
 * Provides sync state and operations for a specific connector.
 * Tracks progress, handles errors, and optionally shows toast notifications.
 *
 * @param connectorId - The ID of the connector to track/sync
 * @param options - Hook configuration options
 *
 * @example
 * ```tsx
 * const { isSyncing, progress, sync, cancel } = useConnectorSync(connectorId)
 *
 * return (
 *   <Button onClick={sync} disabled={isSyncing}>
 *     {isSyncing ? `Syncing ${progress}%` : 'Sync Now'}
 *   </Button>
 * )
 * ```
 */
export function useConnectorSync(
  connectorId?: string,
  options: UseConnectorSyncOptions = {},
): UseConnectorSyncReturn {
  const { showToasts = true } = options
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  const { getConnector, getSyncState, updateSyncState, setConnectorStatus } =
    useConnectorStore()

  // Get current connector and sync state
  const connector = connectorId ? getConnector(connectorId) : undefined
  const syncState = connectorId ? getSyncState(connectorId) : undefined

  // Derive sync status from syncState (updated in-memory, but not persisted to DB for 'syncing')
  const isSyncing = useMemo(() => {
    if (!connectorId) return false
    // Check both SyncEngine (for job status) and syncState (for reactive updates)
    return SyncEngine.isSyncing(connectorId) || syncState?.status === 'syncing'
  }, [connectorId, syncState])

  // Calculate progress (undefined for indeterminate)
  const progress = useMemo(() => {
    // Currently we don't have granular progress tracking
    // This could be enhanced to track actual sync progress
    return undefined
  }, [syncState])

  // Get last sync time
  const lastSyncAt = useMemo(() => {
    if (syncState?.lastSyncAt) {
      return new Date(syncState.lastSyncAt)
    }
    if (connector?.lastSyncAt) {
      return new Date(connector.lastSyncAt)
    }
    return null
  }, [connector, syncState])

  // Get error message
  const error = useMemo(() => {
    return connector?.errorMessage || syncState?.errorMessage || null
  }, [connector, syncState])

  /**
   * Get provider display name for toast messages
   */
  const getProviderName = useCallback(() => {
    if (!connector) return 'Unknown'
    const config = getProvider(connector.provider as AppConnectorProvider)
    return config?.name || connector.name || connector.provider
  }, [connector])

  /**
   * Start a sync operation
   */
  const sync = useCallback(async () => {
    if (!connectorId || !connector) {
      console.warn('Cannot sync: No connector ID provided')
      return
    }

    if (isSyncing) {
      console.warn('Sync already in progress')
      return
    }

    const controller = new AbortController()
    setAbortController(controller)

    const providerName = getProviderName()

    try {
      // Show start toast
      if (showToasts) {
        infoToast(`Syncing ${providerName}...`)
      }

      // Note: We don't persist 'syncing' status - SyncEngine.sync() handles transient status via jobs Map

      // Perform the actual sync
      // This would typically call the connector's sync service
      // For now, we'll simulate a basic sync operation
      await performSync(connectorId, controller.signal)

      // Update sync state on success
      const itemsSynced = syncState?.itemsSynced || 0
      await updateSyncState(connectorId, {
        status: 'idle',
        lastSyncAt: new Date(),
      })

      // Update connector status
      await setConnectorStatus(connectorId, 'connected')

      // Show success toast
      if (showToasts) {
        successToast(`Synced ${itemsSynced} items from ${providerName}`)
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // Sync was cancelled, reset to previous state
        await setConnectorStatus(connectorId, 'connected')
        await updateSyncState(connectorId, { status: 'idle' })
        return
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Update states with error
      await setConnectorStatus(connectorId, 'error', errorMessage)
      await updateSyncState(connectorId, {
        status: 'error',
        errorMessage,
      })

      // Show error toast
      if (showToasts) {
        errorToast(`Failed to sync ${providerName}`, errorMessage)
      }
    } finally {
      setAbortController(null)
    }
  }, [
    connectorId,
    connector,
    isSyncing,
    getProviderName,
    showToasts,
    setConnectorStatus,
    updateSyncState,
    syncState,
  ])

  /**
   * Cancel ongoing sync operation
   */
  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }, [abortController])

  return {
    isSyncing,
    progress,
    lastSyncAt,
    error,
    syncState,
    sync,
    cancel,
  }
}

/**
 * Perform the actual sync operation using the SyncEngine
 */
async function performSync(
  connectorId: string,
  signal: AbortSignal,
): Promise<void> {
  // Check if aborted before starting
  if (signal.aborted) {
    throw new Error('Sync cancelled')
  }

  // Use the SyncEngine to perform the actual sync
  const result = await SyncEngine.sync(connectorId)

  // Check if aborted after sync
  if (signal.aborted) {
    throw new Error('Sync cancelled')
  }

  // If sync failed, throw an error with the message
  if (!result.success) {
    const errorMessage = result.errors?.join(', ') || 'Sync failed'
    throw new Error(errorMessage)
  }
}

/**
 * useGlobalSyncStatus Hook
 *
 * Returns aggregate sync status across all connectors
 */
export function useGlobalSyncStatus() {
  const { connectors, syncStates } = useConnectorStore()

  const syncingConnectors = useMemo(() => {
    // Check both SyncEngine (for job status) and syncState (for reactive updates)
    // syncState.status is updated in-memory but not persisted to DB for 'syncing'
    return connectors.filter((connector) => {
      const syncState = syncStates.get(connector.id)
      return (
        SyncEngine.isSyncing(connector.id) || syncState?.status === 'syncing'
      )
    })
  }, [connectors, syncStates])

  const errorConnectors = useMemo(() => {
    return connectors.filter((connector) => connector.status === 'error')
  }, [connectors])

  const expiredConnectors = useMemo(() => {
    return connectors.filter((connector) => connector.status === 'expired')
  }, [connectors])

  return {
    isSyncing: syncingConnectors.length > 0,
    syncingCount: syncingConnectors.length,
    syncingConnectors,
    errorCount: errorConnectors.length,
    errorConnectors,
    expiredCount: expiredConnectors.length,
    expiredConnectors,
    totalConnectors: connectors.length,
  }
}
