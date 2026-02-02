/**
 * Folder Sync Store
 *
 * Zustand store for managing folder sync state and configuration.
 * Persists sync settings to localStorage.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  folderSyncService,
  type FolderSyncEvent,
} from '../lib/local-backup-service'
import { db } from '@/lib/db'
import * as Y from '@/lib/yjs/maps'

export interface SyncStats {
  agents: number
  conversations: number
  memories: number
  knowledge: number
  tasks: number
  studio: number
  fullExport: boolean
}

interface FolderSyncState {
  // Sync state
  isEnabled: boolean
  isInitializing: boolean
  isSyncing: boolean
  lastSync: Date | null
  syncStats: SyncStats | null
  error: string | null

  // Config (persisted reference, actual handle stored separately)
  basePath: string | null
  syncAgents: boolean
  syncConversations: boolean
  syncMemories: boolean
  syncKnowledge: boolean
  syncTasks: boolean
  syncStudio: boolean
  syncFullExport: boolean

  // Activity
  recentEvents: FolderSyncEvent[]

  // Actions
  enableSync: (
    directoryHandle: FileSystemDirectoryHandle,
    options?: {
      syncAgents?: boolean
      syncConversations?: boolean
      syncMemories?: boolean
      syncKnowledge?: boolean
      syncTasks?: boolean
      syncStudio?: boolean
      syncFullExport?: boolean
    },
  ) => Promise<void>
  disableSync: () => void
  triggerSync: () => Promise<void>
  updateSyncOptions: (options: {
    syncAgents?: boolean
    syncConversations?: boolean
    syncMemories?: boolean
    syncKnowledge?: boolean
    syncTasks?: boolean
    syncStudio?: boolean
    syncFullExport?: boolean
  }) => Promise<void>
  reconnect: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>
  clearError: () => void
}

// Store the directory handle in IndexedDB (can't be serialized to localStorage)
const HANDLE_STORE_KEY = 'folderSyncHandle'

async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  try {
    if (!db.isInitialized()) {
      await db.init()
    }
    // Store in a simple key-value style using the fileHandles store
    const entry = {
      id: HANDLE_STORE_KEY,
      handle,
      createdAt: new Date(),
    }
    const existing = await db.get('fileHandles', HANDLE_STORE_KEY)
    if (existing) {
      await db.update('fileHandles', entry)
    } else {
      await db.add('fileHandles', entry)
    }
  } catch (error) {
    console.error('Failed to store directory handle:', error)
  }
}

async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!db.isInitialized()) {
      await db.init()
    }
    const entry = await db.get('fileHandles', HANDLE_STORE_KEY)
    return entry?.handle ?? null
  } catch (error) {
    console.error('Failed to retrieve directory handle:', error)
    return null
  }
}

async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    if (!db.isInitialized()) {
      await db.init()
    }
    await db.delete('fileHandles', HANDLE_STORE_KEY)
  } catch (error) {
    console.error('Failed to clear directory handle:', error)
  }
}

export const useFolderSyncStore = create<FolderSyncState>()(
  persist(
    (set, get) => {
      // Set up event listener for sync service
      folderSyncService.onSyncEvent(async (event) => {
        const recentEvents = [event, ...get().recentEvents].slice(0, 50)
        const updates: Partial<FolderSyncState> = {
          recentEvents,
          isSyncing:
            event.type === 'sync_start'
              ? true
              : event.type === 'sync_complete' || event.type === 'sync_error'
                ? false
                : get().isSyncing,
          lastSync:
            event.type === 'sync_complete' ? new Date() : get().lastSync,
          error: event.type === 'sync_error' ? event.error : get().error,
        }

        // Update stats on sync complete
        if (event.type === 'sync_complete') {
          try {
            const state = get()
            // Use Yjs maps to compute sync stats
            const agents = Array.from(Y.agents.values())
            const conversations = Array.from(Y.conversations.values())
            const memories = Array.from(Y.memories.values())
            const knowledgeItems = Array.from(Y.knowledge.values())
            const tasks = Array.from(Y.tasks.values())
            const studioItems = Array.from(Y.studioEntries.values())

            const stats: SyncStats = {
              agents: state.syncAgents
                ? agents.filter((a) => !a.deletedAt).length
                : 0,
              conversations: state.syncConversations ? conversations.length : 0,
              memories: state.syncMemories ? memories.length : 0,
              knowledge: state.syncKnowledge
                ? knowledgeItems.filter((k) => k.type === 'file').length
                : 0,
              tasks: state.syncTasks ? tasks.length : 0,
              studio: state.syncStudio ? studioItems.length : 0,
              fullExport: state.syncFullExport,
            }
            updates.syncStats = stats
          } catch (err) {
            console.error('Failed to fetch sync stats:', err)
          }
        }

        set(updates)
      })

      return {
        // Initial state
        isEnabled: false,
        isInitializing: false,
        isSyncing: false,
        lastSync: null,
        syncStats: null,
        error: null,
        basePath: null,
        syncAgents: true,
        syncConversations: true,
        syncMemories: true,
        syncKnowledge: true,
        syncTasks: true,
        syncStudio: true,
        syncFullExport: true,
        recentEvents: [],

        // Actions
        enableSync: async (directoryHandle, options = {}) => {
          set({ isInitializing: true, error: null })

          try {
            const config = await folderSyncService.initialize(directoryHandle, {
              syncAgents: options.syncAgents ?? get().syncAgents,
              syncConversations:
                options.syncConversations ?? get().syncConversations,
              syncMemories: options.syncMemories ?? get().syncMemories,
              syncKnowledge: options.syncKnowledge ?? get().syncKnowledge,
              syncTasks: options.syncTasks ?? get().syncTasks,
              syncStudio: options.syncStudio ?? get().syncStudio,
              syncFullExport: options.syncFullExport ?? get().syncFullExport,
            })

            // Store handle for reconnection
            await storeDirectoryHandle(directoryHandle)

            set({
              isEnabled: true,
              isInitializing: false,
              basePath: config.basePath,
              lastSync: config.lastSync,
              syncAgents: config.syncAgents,
              syncConversations: config.syncConversations,
              syncMemories: config.syncMemories,
              syncKnowledge: config.syncKnowledge,
              syncTasks: config.syncTasks,
              syncStudio: config.syncStudio,
              syncFullExport: config.syncFullExport,
            })
          } catch (error) {
            set({
              isInitializing: false,
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },

        disableSync: () => {
          folderSyncService.stop()
          clearStoredDirectoryHandle()
          set({
            isEnabled: false,
            basePath: null,
            syncStats: null,
            error: null,
          })
        },

        triggerSync: async () => {
          if (!get().isEnabled) return

          set({ isSyncing: true })
          try {
            await folderSyncService.syncToFiles()
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : String(error),
            })
          } finally {
            set({ isSyncing: false })
          }
        },

        updateSyncOptions: async (options) => {
          // Update local state
          set({
            syncAgents: options.syncAgents ?? get().syncAgents,
            syncConversations:
              options.syncConversations ?? get().syncConversations,
            syncMemories: options.syncMemories ?? get().syncMemories,
            syncKnowledge: options.syncKnowledge ?? get().syncKnowledge,
            syncTasks: options.syncTasks ?? get().syncTasks,
            syncStudio: options.syncStudio ?? get().syncStudio,
            syncFullExport: options.syncFullExport ?? get().syncFullExport,
          })

          // Update service config
          folderSyncService.updateConfig(options)

          // Trigger sync if enabled to apply new options
          if (get().isEnabled) {
            set({ isSyncing: true })
            try {
              await folderSyncService.syncToFiles()
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : String(error),
              })
            } finally {
              set({ isSyncing: false })
            }
          }
        },

        reconnect: async (directoryHandle) => {
          const state = get()
          if (!state.isEnabled) return

          set({ isInitializing: true, error: null })

          try {
            await folderSyncService.initialize(directoryHandle, {
              syncAgents: state.syncAgents,
              syncConversations: state.syncConversations,
              syncMemories: state.syncMemories,
              syncKnowledge: state.syncKnowledge,
              syncTasks: state.syncTasks,
              syncStudio: state.syncStudio,
              syncFullExport: state.syncFullExport,
            })

            await storeDirectoryHandle(directoryHandle)

            set({
              isInitializing: false,
              basePath: directoryHandle.name,
            })
          } catch (error) {
            set({
              isInitializing: false,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        },

        clearError: () => set({ error: null }),
      }
    },
    {
      name: 'devs-local-backup',
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        basePath: state.basePath,
        syncAgents: state.syncAgents,
        syncConversations: state.syncConversations,
        syncMemories: state.syncMemories,
        syncKnowledge: state.syncKnowledge,
        syncTasks: state.syncTasks,
        syncStudio: state.syncStudio,
        syncFullExport: state.syncFullExport,
      }),
    },
  ),
)

/**
 * Try to reconnect to a previously stored directory handle on app startup
 */
export async function tryReconnectFolderSync(): Promise<boolean> {
  const store = useFolderSyncStore.getState()
  if (!store.isEnabled || !store.basePath) {
    return false
  }

  const handle = await getStoredDirectoryHandle()
  if (!handle) {
    return false
  }

  try {
    // Check if we still have permission
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') {
      await store.reconnect(handle)
      return true
    }
    // If permission is 'prompt', we'll need user interaction
    return false
  } catch (error) {
    console.error('Failed to reconnect folder sync:', error)
    return false
  }
}
