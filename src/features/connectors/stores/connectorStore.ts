import { create } from 'zustand'
import { db } from '@/lib/db'
import type {
  Connector,
  ConnectorSyncState,
  ConnectorCategory,
  ConnectorStatus,
} from '@/features/connectors/types'
import { errorToast, successToast, infoToast } from '@/lib/toast'

/**
 * Get provider display name for toast messages
 */
function getProviderDisplayName(connector: Connector): string {
  const providerNames: Record<string, string> = {
    'google-drive': 'Google Drive',
    gmail: 'Gmail',
    'google-calendar': 'Google Calendar',
    notion: 'Notion',
    dropbox: 'Dropbox',
    github: 'GitHub',
    'custom-api': 'Custom API',
    'custom-mcp': 'MCP Server',
  }
  return (
    providerNames[connector.provider] || connector.name || connector.provider
  )
}

/**
 * Sort connectors by creation date (newest first)
 */
function sortByCreationDate(connectors: Connector[]): Connector[] {
  return [...connectors].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

interface ConnectorState {
  connectors: Connector[]
  syncStates: Map<string, ConnectorSyncState>
  isLoading: boolean
  isInitialized: boolean

  // Initialization
  initialize: () => Promise<void>

  // CRUD
  addConnector: (
    connector: Omit<Connector, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<string>
  updateConnector: (id: string, updates: Partial<Connector>) => Promise<void>
  deleteConnector: (id: string) => Promise<void>
  getConnector: (id: string) => Connector | undefined

  // Filtering
  getConnectorsByCategory: (category: ConnectorCategory) => Connector[]
  getConnectorsByStatus: (status: ConnectorStatus) => Connector[]
  getAppConnectors: () => Connector[]
  getApiConnectors: () => Connector[]
  getMcpConnectors: () => Connector[]

  // Sync state management
  updateSyncState: (
    connectorId: string,
    state: Partial<ConnectorSyncState>,
    options?: { silent?: boolean; skipPersist?: boolean },
  ) => Promise<void>
  getSyncState: (connectorId: string) => ConnectorSyncState | undefined

  // Actions
  setConnectorStatus: (
    id: string,
    status: ConnectorStatus,
    errorMessage?: string,
  ) => Promise<void>
  refreshConnectors: () => Promise<void>
}

export const useConnectorStore = create<ConnectorState>((set, get) => ({
  connectors: [],
  syncStates: new Map(),
  isLoading: false,
  isInitialized: false,

  // =========================================================================
  // Initialization
  // =========================================================================

  initialize: async () => {
    const { isInitialized } = get()
    if (isInitialized) return

    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      // Load connectors
      const connectors = await db.getAll('connectors')

      // Load sync states
      const syncStatesArray = await db.getAll('connectorSyncStates')
      const syncStates = new Map<string, ConnectorSyncState>()
      for (const state of syncStatesArray) {
        syncStates.set(state.connectorId, state)
      }

      set({
        connectors: sortByCreationDate(connectors),
        syncStates,
        isLoading: false,
        isInitialized: true,
      })
    } catch (error) {
      errorToast('Failed to initialize connectors', error)
      set({ isLoading: false })
    }
  },

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  addConnector: async (connectorData) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const id = crypto.randomUUID()
      const now = new Date()

      const connector: Connector = {
        ...connectorData,
        id,
        createdAt: now,
        updatedAt: now,
      }

      await db.add('connectors', connector)

      const updatedConnectors = sortByCreationDate([
        ...get().connectors,
        connector,
      ])
      set({ connectors: updatedConnectors, isLoading: false })

      successToast('Connector added successfully')
      return id
    } catch (error) {
      errorToast('Failed to add connector', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateConnector: async (id: string, updates: Partial<Connector>) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const existing = await db.get('connectors', id)
      if (!existing) {
        throw new Error('Connector not found')
      }

      const updatedConnector: Connector = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date(),
      }

      await db.update('connectors', updatedConnector)

      const { connectors } = get()
      const updatedConnectors = sortByCreationDate(
        connectors.map((c) => (c.id === id ? updatedConnector : c)),
      )
      set({ connectors: updatedConnectors, isLoading: false })
    } catch (error) {
      errorToast('Failed to update connector', error)
      set({ isLoading: false })
      throw error
    }
  },

  deleteConnector: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      // Delete connector
      await db.delete('connectors', id)

      // Also delete associated sync state
      const { syncStates } = get()
      const syncState = syncStates.get(id)
      if (syncState) {
        await db.delete('connectorSyncStates', syncState.id)
      }

      // Update local state
      const { connectors } = get()
      const updatedConnectors = connectors.filter((c) => c.id !== id)
      const updatedSyncStates = new Map(syncStates)
      updatedSyncStates.delete(id)

      set({
        connectors: updatedConnectors,
        syncStates: updatedSyncStates,
        isLoading: false,
      })

      successToast('Connector deleted successfully')
    } catch (error) {
      errorToast('Failed to delete connector', error)
      set({ isLoading: false })
      throw error
    }
  },

  getConnector: (id: string) => {
    const { connectors } = get()
    return connectors.find((c) => c.id === id)
  },

  // =========================================================================
  // Filtering
  // =========================================================================

  getConnectorsByCategory: (category: ConnectorCategory) => {
    const { connectors } = get()
    return connectors.filter((c) => c.category === category)
  },

  getConnectorsByStatus: (status: ConnectorStatus) => {
    const { connectors } = get()
    return connectors.filter((c) => c.status === status)
  },

  getAppConnectors: () => {
    return get().getConnectorsByCategory('app')
  },

  getApiConnectors: () => {
    return get().getConnectorsByCategory('api')
  },

  getMcpConnectors: () => {
    return get().getConnectorsByCategory('mcp')
  },

  // =========================================================================
  // Sync State Management
  // =========================================================================

  updateSyncState: async (
    connectorId: string,
    stateUpdates: Partial<ConnectorSyncState>,
    options?: { silent?: boolean; skipPersist?: boolean },
  ) => {
    try {
      if (!options?.skipPersist && !db.isInitialized()) {
        await db.init()
      }

      const { syncStates, connectors } = get()
      const existingState = syncStates.get(connectorId)
      const connector = connectors.find((c) => c.id === connectorId)

      let updatedState: ConnectorSyncState

      if (existingState) {
        // Update existing sync state
        updatedState = {
          ...existingState,
          ...stateUpdates,
          connectorId,
        }
        // Only persist to DB if skipPersist is not true
        if (!options?.skipPersist) {
          await db.update('connectorSyncStates', updatedState)
        }
      } else {
        // Create new sync state
        updatedState = {
          id: crypto.randomUUID(),
          connectorId,
          cursor: null,
          lastSyncAt: new Date(),
          itemsSynced: 0,
          syncType: 'full',
          status: 'idle',
          ...stateUpdates,
        }
        // Only persist to DB if skipPersist is not true
        if (!options?.skipPersist) {
          await db.add('connectorSyncStates', updatedState)
        }
      }

      // Update local state
      const updatedSyncStates = new Map(syncStates)
      updatedSyncStates.set(connectorId, updatedState)
      set({ syncStates: updatedSyncStates })

      // Emit toast notifications based on state transitions (unless silent)
      if (!options?.silent && connector) {
        const providerName = getProviderDisplayName(connector)
        const previousStatus = existingState?.status

        // Sync started
        if (stateUpdates.status === 'syncing' && previousStatus !== 'syncing') {
          infoToast(`Syncing ${providerName}...`)
        }

        // Sync completed successfully
        if (stateUpdates.status === 'idle' && previousStatus === 'syncing') {
          const itemsSynced =
            stateUpdates.itemsSynced ?? updatedState.itemsSynced ?? 0
          successToast(`Synced ${itemsSynced} items from ${providerName}`)
        }

        // Sync failed
        if (stateUpdates.status === 'error' && previousStatus === 'syncing') {
          const errorMsg = stateUpdates.errorMessage || 'Unknown error'
          errorToast(`Failed to sync ${providerName}`, errorMsg)
        }
      }
    } catch (error) {
      errorToast('Failed to update sync state', error)
      throw error
    }
  },

  getSyncState: (connectorId: string) => {
    const { syncStates } = get()
    return syncStates.get(connectorId)
  },

  // =========================================================================
  // Actions
  // =========================================================================

  setConnectorStatus: async (
    id: string,
    status: ConnectorStatus,
    errorMessage?: string,
  ) => {
    try {
      const updates: Partial<Connector> = {
        status,
        errorMessage: errorMessage || undefined,
      }

      // If status is connected, clear error message
      if (status === 'connected') {
        updates.errorMessage = undefined
      }

      await get().updateConnector(id, updates)
    } catch (error) {
      errorToast('Failed to update connector status', error)
      throw error
    }
  },

  refreshConnectors: async () => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      // Reload connectors from database
      const connectors = await db.getAll('connectors')

      // Reload sync states
      const syncStatesArray = await db.getAll('connectorSyncStates')
      const syncStates = new Map<string, ConnectorSyncState>()
      for (const state of syncStatesArray) {
        syncStates.set(state.connectorId, state)
      }

      set({
        connectors: sortByCreationDate(connectors),
        syncStates,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to refresh connectors', error)
      set({ isLoading: false })
    }
  },
}))
