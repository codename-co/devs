/**
 * Sync Store
 *
 * Zustand store for managing sync state and settings.
 * Persists sync configuration to localStorage.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  disableSync as disableSyncManager,
  enableSync as enableSyncManager,
  getLocalClientId,
  getPeerCount,
  getPeers,
  getRecentActivity,
  getSyncStatus,
  onSyncActivity,
  onSyncStatusChange,
} from '../lib/sync-manager'
import { forceLoadDataToYjs, initSyncBridge } from '../lib/sync-bridge'
import type { PeerInfo, SyncActivity, SyncStatus } from '../lib/sync-manager'

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
  disableSync: () => void
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

        // Initialize sync bridge (Yjs + IndexedDB mirroring)
        await initSyncBridge()

        // Subscribe to sync status changes
        onSyncStatusChange(({ connected, peerCount, peers }) => {
          set({
            status: connected ? 'connected' : 'connecting',
            peerCount,
            peers,
            localClientId: getLocalClientId(),
            lastSyncAt: connected ? new Date() : get().lastSyncAt,
          })
        })

        // Subscribe to sync activity events
        onSyncActivity((activity) => {
          set((state) => ({
            recentActivity: [activity, ...state.recentActivity].slice(0, 50),
          }))
        })

        // Auto-reconnect if sync was previously enabled
        const { enabled, roomId } = get()
        if (enabled && roomId) {
          console.log('[SyncStore] Auto-reconnecting to room:', roomId)
          // Force load data before reconnecting
          await forceLoadDataToYjs()
          enableSyncManager({ roomId })
          set({
            status: getSyncStatus(),
            peerCount: getPeerCount(),
            peers: getPeers(),
            localClientId: getLocalClientId(),
            recentActivity: getRecentActivity(),
          })
        }

        set({ initialized: true })
        console.log('[SyncStore] Initialized')
      },

      enableSync: async (
        roomId: string,
        password?: string,
        mode?: SyncMode,
      ) => {
        // Ensure persistence is ready
        if (!get().initialized) {
          await get().initialize()
        }

        // Force load all local data to Yjs before connecting
        await forceLoadDataToYjs()

        enableSyncManager({ roomId, password })
        set({
          enabled: true,
          roomId,
          mode: mode || get().mode || 'share',
          status: getSyncStatus(),
          peerCount: getPeerCount(),
          peers: getPeers(),
          localClientId: getLocalClientId(),
        })
      },

      disableSync: () => {
        disableSyncManager()
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
