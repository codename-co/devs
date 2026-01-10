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

interface FolderSyncState {
  // Sync state
  isEnabled: boolean
  isInitializing: boolean
  isSyncing: boolean
  lastSync: Date | null
  error: string | null

  // Config (persisted reference, actual handle stored separately)
  basePath: string | null
  syncAgents: boolean
  syncConversations: boolean
  syncMemories: boolean
  syncKnowledge: boolean
  syncTasks: boolean

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
  }) => void
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
      folderSyncService.onSyncEvent((event) => {
        const recentEvents = [event, ...get().recentEvents].slice(0, 50)
        set({
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
        })
      })

      return {
        // Initial state
        isEnabled: false,
        isInitializing: false,
        isSyncing: false,
        lastSync: null,
        error: null,
        basePath: null,
        syncAgents: true,
        syncConversations: true,
        syncMemories: true,
        syncKnowledge: true,
        syncTasks: true,
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

        updateSyncOptions: (options) => {
          set({
            syncAgents: options.syncAgents ?? get().syncAgents,
            syncConversations:
              options.syncConversations ?? get().syncConversations,
            syncMemories: options.syncMemories ?? get().syncMemories,
            syncKnowledge: options.syncKnowledge ?? get().syncKnowledge,
            syncTasks: options.syncTasks ?? get().syncTasks,
          })
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
