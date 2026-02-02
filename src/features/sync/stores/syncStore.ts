/**
 * Sync Store
 *
 * Zustand store for managing sync state and settings.
 * Persists sync configuration to localStorage.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { SecureStorage } from '@/lib/crypto'

import {
  whenReady,
  enableSync as yjsEnableSync,
  disableSync as yjsDisableSync,
  onSyncStatusChange,
  onSyncActivity,
  getSyncStatus,
  getPeerCount,
  getPeers,
  getLocalClientId,
  preferences,
} from '@/lib/yjs'
import type { PeerInfo, SyncActivity, SyncStatus } from '@/lib/yjs'

export type SyncMode = 'share' | 'join'

interface SyncState {
  // Persisted settings
  enabled: boolean
  roomId: string | null
  mode: SyncMode | null

  // Runtime state
  status: SyncStatus
  peerCount: number
  peers: PeerInfo[]
  localClientId: number | null
  recentActivity: SyncActivity[]
  initialized: boolean
  lastSyncAt: Date | null

  // Actions
  initialize: () => Promise<void>
  enableSync: (
    roomId: string,
    password?: string,
    mode?: SyncMode,
  ) => Promise<void>
  disableSync: () => Promise<void>
  generateRoomId: () => string
}

/**
 * Generate a random room ID for personal sync
 * Uses 32 bytes (256 bits) for a long, secure room ID
 */
function generateRandomRoomId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Persisted
      enabled: false,
      roomId: null,
      mode: null,

      // Runtime
      status: 'disabled',
      peerCount: 0,
      peers: [],
      localClientId: null,
      recentActivity: [],
      initialized: false,
      lastSyncAt: null,

      initialize: async () => {
        if (get().initialized) return

        console.log('[SyncStore] Initializing...')

        // Always initialize Yjs persistence to load existing data from IndexedDB
        // This is needed for reactive hooks to work and to preserve existing user data
        await whenReady

        const { enabled, roomId } = get()

        if (enabled && roomId) {
          console.log('[SyncStore] Sync enabled, initializing P2P...')

          // Subscribe to sync status changes
          onSyncStatusChange(() => {
            set({
              status: getSyncStatus(),
              peerCount: getPeerCount(),
              peers: getPeers(),
              localClientId: getLocalClientId(),
              lastSyncAt:
                getSyncStatus() === 'connected' ? new Date() : get().lastSyncAt,
            })
          })

          // Subscribe to sync activity events
          onSyncActivity((activity) => {
            set((state) => ({
              recentActivity: [activity, ...state.recentActivity].slice(0, 50),
            }))
          })

          // Auto-reconnect to room
          console.log('[SyncStore] Auto-reconnecting to room:', roomId)
          yjsEnableSync({ roomId })
        } else {
          console.log('[SyncStore] Sync not enabled, skipping P2P')
        }

        set({ initialized: true })
        console.log('[SyncStore] Initialized')
      },

      enableSync: async (
        roomId: string,
        password?: string,
        mode?: SyncMode,
      ) => {
        // Ensure store is initialized
        if (!get().initialized) {
          await get().initialize()
        }

        const effectiveMode = mode || get().mode || 'share'

        console.log('[SyncStore] Enabling sync...', { mode: effectiveMode })

        // Subscribe to sync status changes
        onSyncStatusChange(() => {
          set({
            status: getSyncStatus(),
            peerCount: getPeerCount(),
            peers: getPeers(),
            localClientId: getLocalClientId(),
            lastSyncAt:
              getSyncStatus() === 'connected' ? new Date() : get().lastSyncAt,
          })
        })

        // Subscribe to sync activity events
        onSyncActivity((activity) => {
          set((state) => ({
            recentActivity: [activity, ...state.recentActivity].slice(0, 50),
          }))
        })

        // Only force load local data when SHARING (creating a new room)
        // When JOINING an existing room, we want to receive remote data, not push local data
        if (effectiveMode !== 'share') {
          console.log(
            '[SyncStore] Joining room - clearing preferences to prefer remote state',
          )
          preferences.clear()
        }

        // Enable sync encryption mode if password is provided
        if (password) {
          try {
            await SecureStorage.enableSyncMode(password)
          } catch (err) {
            console.warn(
              '[SyncStore] Failed to enable sync encryption mode (may be private browsing):',
              err,
            )
          }
        }

        yjsEnableSync({ roomId, password })
        set({
          enabled: true,
          roomId,
          mode: effectiveMode,
          status: 'connecting',
          peerCount: 0,
          peers: [],
          localClientId: null,
        })
      },

      disableSync: async () => {
        // Disable sync encryption mode (re-encrypt with local key)
        // May fail in private browsing mode - that's OK
        try {
          await SecureStorage.disableSyncMode()
        } catch (err) {
          console.warn(
            '[SyncStore] Failed to disable sync encryption mode:',
            err,
          )
        }

        yjsDisableSync()

        set({
          enabled: false,
          roomId: null,
          mode: null,
          status: 'disabled',
          peerCount: 0,
          peers: [],
          localClientId: null,
          recentActivity: [],
        })
      },

      generateRoomId: () => {
        const roomId = generateRandomRoomId()
        set({ roomId })
        return roomId
      },
    }),
    {
      name: 'devs-sync-settings',
      partialize: (state) => ({
        enabled: state.enabled,
        roomId: state.roomId,
        mode: state.mode,
      }),
    },
  ),
)
