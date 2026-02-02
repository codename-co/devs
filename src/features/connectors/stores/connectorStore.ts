import { create } from 'zustand'
import {
  connectors as connectorsMap,
  connectorSyncStates as syncStatesMap,
} from '@/lib/yjs/maps'
import type {
  Connector,
  ConnectorSyncState,
  ConnectorCategory,
  ConnectorStatus,
  AppConnectorProvider,
} from '@/features/connectors/types'
import { infoToast } from '@/lib/toast'
import { notifyError, notifySuccess } from '@/features/notifications'
import { ProviderRegistry } from '@/features/connectors/provider-registry'
import { SecureStorage } from '@/lib/crypto'
import {
  CONNECTOR_STORAGE_PREFIX,
  storeEncryptionMetadata,
} from '@/features/connectors/connector-provider'

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
  validateConnectorTokens: () => Promise<void>
  refreshConnectorToken: (connectorId: string) => Promise<boolean>
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
      // Load connectors from Yjs map
      const connectors = Array.from(connectorsMap.values())

      // Load sync states from Yjs map
      const syncStatesArray = Array.from(syncStatesMap.values())
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

      // Observe Yjs changes for real-time sync from other devices
      connectorsMap.observe(() => {
        const updatedConnectors = Array.from(connectorsMap.values())
        set({ connectors: sortByCreationDate(updatedConnectors) })
      })

      syncStatesMap.observe(() => {
        const syncStatesArray = Array.from(syncStatesMap.values())
        const newSyncStates = new Map<string, ConnectorSyncState>()
        for (const state of syncStatesArray) {
          newSyncStates.set(state.connectorId, state)
        }
        set({ syncStates: newSyncStates })
      })
    } catch (error) {
      notifyError({
        title: 'Connector Initialization Failed',
        description:
          'Failed to initialize connectors. Please refresh the page.',
      })
      set({ isLoading: false })
    }
  },

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  addConnector: async (connectorData) => {
    set({ isLoading: true })
    try {
      const id = crypto.randomUUID()
      const now = new Date()

      const connector: Connector = {
        ...connectorData,
        id,
        createdAt: now,
        updatedAt: now,
      }

      connectorsMap.set(id, connector)

      const updatedConnectors = sortByCreationDate([
        ...get().connectors,
        connector,
      ])
      set({ connectors: updatedConnectors, isLoading: false })

      // Inline feedback - keep as toast
      return id
    } catch (error) {
      notifyError({
        title: 'Connector Error',
        description: 'Failed to add connector',
      })
      set({ isLoading: false })
      throw error
    }
  },

  updateConnector: async (id: string, updates: Partial<Connector>) => {
    set({ isLoading: true })
    try {
      const existing = connectorsMap.get(id)
      if (!existing) {
        throw new Error('Connector not found')
      }

      const updatedConnector: Connector = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date(),
      }

      connectorsMap.set(id, updatedConnector)

      const { connectors } = get()
      const updatedConnectors = sortByCreationDate(
        connectors.map((c) => (c.id === id ? updatedConnector : c)),
      )
      set({ connectors: updatedConnectors, isLoading: false })
    } catch (error) {
      notifyError({
        title: 'Connector Error',
        description: 'Failed to update connector',
      })
      set({ isLoading: false })
      throw error
    }
  },

  deleteConnector: async (id: string) => {
    set({ isLoading: true })
    try {
      // Delete connector from Yjs map
      connectorsMap.delete(id)

      // Also delete associated sync state
      const { syncStates } = get()
      const syncState = syncStates.get(id)
      if (syncState) {
        syncStatesMap.delete(syncState.id)
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

      // Inline feedback - no toast needed
    } catch (error) {
      notifyError({
        title: 'Connector Error',
        description: 'Failed to delete connector',
      })
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
        // Only persist to Yjs if skipPersist is not true
        if (!options?.skipPersist) {
          syncStatesMap.set(existingState.id, updatedState)
        }
      } else {
        // Create new sync state
        const newId = crypto.randomUUID()
        updatedState = {
          id: newId,
          connectorId,
          cursor: null,
          lastSyncAt: new Date(),
          itemsSynced: 0,
          syncType: 'full',
          status: 'idle',
          ...stateUpdates,
        }
        // Only persist to Yjs if skipPersist is not true
        if (!options?.skipPersist) {
          syncStatesMap.set(newId, updatedState)
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

        // Sync completed successfully - use persistent notification for record
        if (stateUpdates.status === 'idle' && previousStatus === 'syncing') {
          const itemsSynced =
            stateUpdates.itemsSynced ?? updatedState.itemsSynced ?? 0
          notifySuccess({
            title: 'Sync Completed',
            description: `Synced ${itemsSynced} items from ${providerName}`,
          })
        }

        // Sync failed - use persistent notification for investigation
        if (stateUpdates.status === 'error' && previousStatus === 'syncing') {
          const errorMsg = stateUpdates.errorMessage || 'Unknown error'
          notifyError({
            title: 'Sync Failed',
            description: `Failed to sync ${providerName}: ${errorMsg}`,
          })
        }
      }
    } catch (error) {
      notifyError({
        title: 'Sync State Error',
        description: 'Failed to update sync state',
      })
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
      notifyError({
        title: 'Connector Error',
        description: 'Failed to update connector status',
      })
      throw error
    }
  },

  refreshConnectors: async () => {
    set({ isLoading: true })
    try {
      // Reload connectors from Yjs map
      const connectors = Array.from(connectorsMap.values())

      // Reload sync states from Yjs map
      const syncStatesArray = Array.from(syncStatesMap.values())
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
      notifyError({
        title: 'Connector Refresh Failed',
        description: 'Failed to refresh connectors',
      })
      set({ isLoading: false })
    }
  },

  /**
   * Validate tokens for all connected app connectors.
   * Checks if tokens are expired (via tokenExpiresAt) or invalid (via API call).
   * Automatically attempts to refresh tokens before marking as expired.
   */
  validateConnectorTokens: async () => {
    const { connectors, updateConnector, refreshConnectorToken } = get()

    // Only validate app connectors with 'connected' status
    const connectedAppConnectors = connectors.filter(
      (c) => c.category === 'app' && c.status === 'connected',
    )

    if (connectedAppConnectors.length === 0) return

    // Validate each connector in parallel
    const validationPromises = connectedAppConnectors.map(async (connector) => {
      try {
        let needsRefresh = false
        let refreshReason = ''

        // First check: tokenExpiresAt (quick local check)
        if (connector.tokenExpiresAt) {
          const expiresAt = new Date(connector.tokenExpiresAt)
          if (expiresAt <= new Date()) {
            needsRefresh = true
            refreshReason = 'Token expired based on expiry time'
          }
        }

        // Second check: validate token with the provider API (only if not already flagged)
        if (!needsRefresh) {
          const provider = connector.provider as AppConnectorProvider
          const providerInstance =
            await ProviderRegistry.getAppProvider(provider)

          if (providerInstance.validateToken && connector.encryptedToken) {
            const iv = localStorage.getItem(
              `${CONNECTOR_STORAGE_PREFIX}-${connector.id}-iv`,
            )
            // Salt is empty after migration to non-extractable keys
            const salt =
              localStorage.getItem(
                `${CONNECTOR_STORAGE_PREFIX}-${connector.id}-salt`,
              ) ?? ''

            if (iv) {
              try {
                const token = await SecureStorage.decryptCredential(
                  connector.encryptedToken,
                  iv,
                  salt,
                )

                const isValid = await providerInstance.validateToken(token)

                if (!isValid) {
                  needsRefresh = true
                  refreshReason = 'Token validation failed (revoked or invalid)'
                }
              } catch (decryptError) {
                console.error(
                  `[ConnectorStore] Token decryption failed for ${connector.provider}:`,
                  decryptError,
                )
                // Can't validate without decrypting, mark as needing refresh
                needsRefresh = true
                refreshReason = 'Token decryption failed'
              }
            } else {
              console.warn(
                `[ConnectorStore] Missing encryption metadata for ${connector.provider}`,
              )
            }
          }
        }

        // Attempt automatic token refresh if needed
        if (needsRefresh) {
          console.log(
            `[ConnectorStore] ${refreshReason} for ${connector.provider}, attempting refresh...`,
          )

          const refreshed = await refreshConnectorToken(connector.id)

          if (!refreshed) {
            // Refresh failed, mark as expired
            console.log(
              `[ConnectorStore] Token refresh failed for ${connector.provider}, marking as expired`,
            )
            await updateConnector(connector.id, {
              status: 'expired',
              errorMessage:
                'Access token has expired and refresh failed. Please reconnect.',
            })
          }
        }
      } catch (error) {
        // Log error but don't fail the whole validation
        console.warn(
          `[ConnectorStore] Failed to validate token for ${connector.provider}:`,
          error,
        )
      }
    })

    await Promise.allSettled(validationPromises)
  },

  /**
   * Attempt to refresh an expired access token for a connector.
   * Uses the provider's refresh token to obtain a new access token.
   *
   * @param connectorId - The ID of the connector to refresh
   * @returns True if refresh was successful, false otherwise
   */
  refreshConnectorToken: async (connectorId: string): Promise<boolean> => {
    const { connectors, updateConnector } = get()
    const connector = connectors.find((c) => c.id === connectorId)

    if (!connector) {
      console.warn(`[ConnectorStore] Connector not found: ${connectorId}`)
      return false
    }

    // Check if refresh token is available
    if (!connector.encryptedRefreshToken) {
      console.warn(
        `[ConnectorStore] No refresh token available for ${connector.provider}`,
      )
      return false
    }

    try {
      console.log(
        `[ConnectorStore] Attempting token refresh for ${connector.provider}`,
      )

      const provider = connector.provider as AppConnectorProvider
      const providerInstance = await ProviderRegistry.getAppProvider(provider)

      // Refresh the token using the provider
      const refreshResult = await providerInstance.refreshToken(connector)

      // Encrypt the new access token
      await SecureStorage.init()
      const {
        encrypted: encryptedToken,
        iv,
        salt,
      } = await SecureStorage.encryptCredential(refreshResult.accessToken)

      // Calculate new expiry time
      const tokenExpiresAt = refreshResult.expiresIn
        ? new Date(Date.now() + refreshResult.expiresIn * 1000)
        : undefined

      // Update the connector in the store
      await updateConnector(connector.id, {
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
        errorMessage: undefined,
      })

      // Store new encryption metadata
      storeEncryptionMetadata(connector.id, iv, salt, false)

      console.log(
        `[ConnectorStore] Token refreshed successfully for ${connector.provider}`,
      )
      return true
    } catch (error) {
      console.error(
        `[ConnectorStore] Failed to refresh token for ${connector.provider}:`,
        error,
      )
      return false
    }
  },
}))
