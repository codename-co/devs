/**
 * Sync Store
 * Manages synchronization state and provider orchestration
 */

import { create } from 'zustand'
import type { SyncStatus, SyncState } from '@/types'
import type { SyncProvider, SyncProviderEvent } from '@/lib/sync/providers'
import { getCRDTManager, type EntityChange } from '@/lib/sync/crdt-adapter'
import { encrypt, decrypt, generateEncryptionKey, exportKey, importKey } from '@/lib/sync/encryption'

interface WorkspaceSyncState {
  status: SyncStatus
  encryptionKeyId: string | null
  lastError: string | null
}

interface SyncStoreState {
  // Global sync state
  isEnabled: boolean
  globalStatus: SyncState
  
  // Per-workspace sync state
  workspaceSyncStates: Map<string, WorkspaceSyncState>
  
  // Registered providers
  providers: Map<string, SyncProvider>
  
  // Workspace encryption keys (runtime only, not persisted)
  _encryptionKeys: Map<string, CryptoKey>
  
  // Event log for debugging
  eventLog: Array<{ timestamp: Date; event: string; data?: unknown }>
}

interface SyncStoreActions {
  // Provider management
  registerProvider: (provider: SyncProvider) => void
  unregisterProvider: (providerId: string) => void
  getProvider: (providerId: string) => SyncProvider | undefined
  
  // Sync control
  enableSync: () => void
  disableSync: () => void
  
  // Workspace sync
  initializeWorkspaceSync: (workspaceId: string) => Promise<void>
  syncWorkspace: (workspaceId: string) => Promise<void>
  stopWorkspaceSync: (workspaceId: string) => void
  
  // Encryption keys
  createWorkspaceKey: (workspaceId: string) => Promise<string>
  setWorkspaceKey: (workspaceId: string, keyBase64: string) => Promise<void>
  getWorkspaceKey: (workspaceId: string) => CryptoKey | undefined
  
  // Status
  getWorkspaceSyncStatus: (workspaceId: string) => WorkspaceSyncState | undefined
  updateWorkspaceStatus: (workspaceId: string, status: Partial<WorkspaceSyncState>) => void
  
  // Event logging
  logEvent: (event: string, data?: unknown) => void
  clearEventLog: () => void
  
  // Push/pull operations
  pushChanges: (workspaceId: string, changes: EntityChange[]) => Promise<void>
  pullChanges: (workspaceId: string) => Promise<void>
}

type SyncStore = SyncStoreState & SyncStoreActions

const initialState: SyncStoreState = {
  isEnabled: false,
  globalStatus: 'offline',
  workspaceSyncStates: new Map(),
  providers: new Map(),
  _encryptionKeys: new Map(),
  eventLog: []
}

export const useSyncStore = create<SyncStore>()((set, get) => ({
  ...initialState,
  
  registerProvider: (provider: SyncProvider) => {
    // Set up event listeners
    const events: SyncProviderEvent[] = [
      'connected',
      'disconnected', 
      'sync_start',
      'sync_complete',
      'sync_error',
      'peer_joined',
      'peer_left'
    ]
    
    events.forEach(event => {
      provider.on(event, (data) => {
        get().logEvent(`${provider.id}:${event}`, data)
        
        // Update global status based on provider events
        if (event === 'connected') {
          set({ globalStatus: 'synced' })
        } else if (event === 'disconnected') {
          const providers = get().providers
          const anyConnected = Array.from(providers.values()).some(p => p.isConnected())
          set({ globalStatus: anyConnected ? 'synced' : 'offline' })
        } else if (event === 'sync_error') {
          set({ globalStatus: 'error' })
        }
      })
    })
    
    set((state) => {
      const newProviders = new Map(state.providers)
      newProviders.set(provider.id, provider)
      return { providers: newProviders }
    })
    
    get().logEvent('provider_registered', { providerId: provider.id, type: provider.type })
  },
  
  unregisterProvider: (providerId: string) => {
    const provider = get().providers.get(providerId)
    
    if (provider) {
      provider.disconnect()
    }
    
    set((state) => {
      const newProviders = new Map(state.providers)
      newProviders.delete(providerId)
      return { providers: newProviders }
    })
    
    get().logEvent('provider_unregistered', { providerId })
  },
  
  getProvider: (providerId: string) => {
    return get().providers.get(providerId)
  },
  
  enableSync: () => {
    set({ isEnabled: true, globalStatus: 'syncing' })
    
    // Connect all providers
    const providers = get().providers
    providers.forEach(async (provider) => {
      try {
        await provider.connect()
      } catch (error) {
        get().logEvent('provider_connect_error', { 
          providerId: provider.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    })
    
    get().logEvent('sync_enabled')
  },
  
  disableSync: () => {
    // Disconnect all providers
    const providers = get().providers
    providers.forEach(async (provider) => {
      try {
        await provider.disconnect()
      } catch (error) {
        get().logEvent('provider_disconnect_error', { 
          providerId: provider.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    })
    
    set({ isEnabled: false, globalStatus: 'offline' })
    get().logEvent('sync_disabled')
  },
  
  initializeWorkspaceSync: async (workspaceId: string) => {
    const state = get()
    
    // Check if already initialized
    if (state.workspaceSyncStates.has(workspaceId)) {
      return
    }
    
    // Initialize workspace sync state
    const syncState: WorkspaceSyncState = {
      status: {
        state: 'offline',
        pendingChanges: 0
      },
      encryptionKeyId: null,
      lastError: null
    }
    
    set((state) => {
      const newStates = new Map(state.workspaceSyncStates)
      newStates.set(workspaceId, syncState)
      return { workspaceSyncStates: newStates }
    })
    
    // Subscribe to CRDT changes
    const crdtManager = getCRDTManager()
    crdtManager.subscribe(workspaceId, async (changes) => {
      if (get().isEnabled) {
        await get().pushChanges(workspaceId, changes)
      }
    })
    
    get().logEvent('workspace_sync_initialized', { workspaceId })
  },
  
  syncWorkspace: async (workspaceId: string) => {
    const state = get()
    
    if (!state.isEnabled) {
      get().logEvent('sync_skipped_disabled', { workspaceId })
      return
    }
    
    get().updateWorkspaceStatus(workspaceId, {
      status: { ...state.workspaceSyncStates.get(workspaceId)?.status!, state: 'syncing' }
    })
    
    try {
      // Pull changes from all providers
      await get().pullChanges(workspaceId)
      
      get().updateWorkspaceStatus(workspaceId, {
        status: { 
          state: 'synced', 
          pendingChanges: 0,
          lastSyncTime: new Date()
        }
      })
      
      get().logEvent('workspace_sync_complete', { workspaceId })
    } catch (error) {
      get().updateWorkspaceStatus(workspaceId, {
        status: { state: 'error', pendingChanges: 0 },
        lastError: error instanceof Error ? error.message : 'Sync failed'
      })
      
      get().logEvent('workspace_sync_error', { 
        workspaceId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  },
  
  stopWorkspaceSync: (workspaceId: string) => {
    set((state) => {
      const newStates = new Map(state.workspaceSyncStates)
      newStates.delete(workspaceId)
      return { workspaceSyncStates: newStates }
    })
    
    get().logEvent('workspace_sync_stopped', { workspaceId })
  },
  
  createWorkspaceKey: async (workspaceId: string) => {
    const key = await generateEncryptionKey()
    const keyBase64 = await exportKey(key)
    
    set((state) => {
      const newKeys = new Map(state._encryptionKeys)
      newKeys.set(workspaceId, key)
      return { _encryptionKeys: newKeys }
    })
    
    get().updateWorkspaceStatus(workspaceId, { encryptionKeyId: workspaceId })
    get().logEvent('workspace_key_created', { workspaceId })
    
    return keyBase64
  },
  
  setWorkspaceKey: async (workspaceId: string, keyBase64: string) => {
    const key = await importKey(keyBase64)
    
    set((state) => {
      const newKeys = new Map(state._encryptionKeys)
      newKeys.set(workspaceId, key)
      return { _encryptionKeys: newKeys }
    })
    
    get().updateWorkspaceStatus(workspaceId, { encryptionKeyId: workspaceId })
    get().logEvent('workspace_key_set', { workspaceId })
  },
  
  getWorkspaceKey: (workspaceId: string) => {
    return get()._encryptionKeys.get(workspaceId)
  },
  
  getWorkspaceSyncStatus: (workspaceId: string) => {
    return get().workspaceSyncStates.get(workspaceId)
  },
  
  updateWorkspaceStatus: (workspaceId: string, updates: Partial<WorkspaceSyncState>) => {
    set((state) => {
      const newStates = new Map(state.workspaceSyncStates)
      const current = newStates.get(workspaceId)
      
      if (current) {
        newStates.set(workspaceId, { ...current, ...updates })
      }
      
      return { workspaceSyncStates: newStates }
    })
  },
  
  logEvent: (event: string, data?: unknown) => {
    set((state) => ({
      eventLog: [
        ...state.eventLog.slice(-99), // Keep last 100 events
        { timestamp: new Date(), event, data }
      ]
    }))
  },
  
  clearEventLog: () => {
    set({ eventLog: [] })
  },
  
  pushChanges: async (workspaceId: string, changes: EntityChange[]) => {
    const state = get()
    const key = state._encryptionKeys.get(workspaceId)
    
    if (!key) {
      get().logEvent('push_skipped_no_key', { workspaceId })
      return
    }
    
    // Encrypt changes
    const encrypted = await encrypt(key, changes, workspaceId)
    
    // Push to all providers
    const providers = state.providers
    const pushPromises: Promise<void>[] = []
    
    providers.forEach((provider) => {
      if (provider.isConnected()) {
        pushPromises.push(
          provider.push(workspaceId, encrypted).catch((error) => {
            get().logEvent('push_provider_error', {
              providerId: provider.id,
              workspaceId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          })
        )
      }
    })
    
    await Promise.all(pushPromises)
    get().logEvent('changes_pushed', { workspaceId, changeCount: changes.length })
  },
  
  pullChanges: async (workspaceId: string) => {
    const state = get()
    const key = state._encryptionKeys.get(workspaceId)
    
    if (!key) {
      get().logEvent('pull_skipped_no_key', { workspaceId })
      return
    }
    
    const crdtManager = getCRDTManager()
    
    // Pull from all providers
    for (const provider of state.providers.values()) {
      if (!provider.isConnected()) continue
      
      try {
        const encryptedChanges = await provider.pull(workspaceId)
        
        for (const encrypted of encryptedChanges) {
          try {
            const changesJson = await decrypt(key, encrypted)
            const changes = JSON.parse(changesJson) as EntityChange[]
            
            // Apply changes to CRDT
            for (const change of changes) {
              if (change.operation === 'delete') {
                crdtManager.deleteEntity(workspaceId, change.entityType, change.id)
              } else if (change.data) {
                crdtManager.setEntity(
                  workspaceId, 
                  change.entityType, 
                  change.id, 
                  change.data as Record<string, unknown>
                )
              }
            }
          } catch (decryptError) {
            get().logEvent('decrypt_error', { 
              workspaceId, 
              error: decryptError instanceof Error ? decryptError.message : 'Decrypt failed' 
            })
          }
        }
      } catch (pullError) {
        get().logEvent('pull_provider_error', {
          providerId: provider.id,
          workspaceId,
          error: pullError instanceof Error ? pullError.message : 'Pull failed'
        })
      }
    }
    
    get().logEvent('changes_pulled', { workspaceId })
  }
}))

// Selector hooks
export const useSyncEnabled = () => useSyncStore((state) => state.isEnabled)
export const useGlobalSyncStatus = () => useSyncStore((state) => state.globalStatus)
export const useWorkspaceSyncStatus = (workspaceId: string) => 
  useSyncStore((state) => state.workspaceSyncStates.get(workspaceId))
export const useSyncProviders = () => useSyncStore((state) => Array.from(state.providers.values()))
