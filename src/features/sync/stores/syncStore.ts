/**
 * Sync Store
 *
 * Zustand store for managing sync state and settings.
 * Persists sync configuration to localStorage.
 *
 * Password is **mandatory** for all sync sessions (E2E encryption).
 * The password itself is never persisted — on app restart the user must
 * re-enter it before re-connecting to the room.
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
} from '@/lib/yjs'
import type { PeerInfo, SyncActivity, SyncStatus } from '@/lib/yjs'

export type SyncMode = 'share' | 'join'

// Track unsubscribe functions for sync event listeners to prevent leaks
let unsubStatus: (() => void) | null = null
let unsubActivity: (() => void) | null = null

interface SyncState {
  // Persisted settings
  enabled: boolean
  roomId: string | null
  mode: SyncMode | null
  /** True when a previous session exists but needs password re-entry */
  needsPasswordReentry: boolean

  /**
   * Room ID extracted from a `?join=` URL.
   * When set, the SyncPasswordModal is displayed as a fullscreen
   * non-closeable overlay requiring the user to enter the room password
   * before any sync can proceed.
   */
  pendingJoinRoomId: string | null

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
    password: string,
    mode?: SyncMode,
  ) => Promise<void>
  disableSync: () => Promise<void>
  generateRoomId: () => string
  /** Queue a room ID for the password modal flow (from ?join= URLs) */
  setPendingJoinRoomId: (roomId: string | null) => void
  /** Clear password re-entry requirement (after disconnect or re-entry) */
  clearPasswordReentry: () => void
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
      needsPasswordReentry: false,

      // Runtime (not persisted)
      pendingJoinRoomId: null,
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
          // A previous sync session exists but the password is not persisted.
          // Mark that the user needs to re-enter their password before
          // we can reconnect.
          console.log(
            '[SyncStore] Sync was enabled — waiting for password re-entry',
          )
          set({ needsPasswordReentry: true })
        } else {
          console.log('[SyncStore] Sync not enabled, skipping P2P')
        }

        set({ initialized: true })
        console.log('[SyncStore] Initialized')
      },

      enableSync: async (roomId: string, password: string, mode?: SyncMode) => {
        if (!password) {
          throw new Error('Password is required for E2E encrypted sync')
        }

        // Ensure store is initialized
        if (!get().initialized) {
          await get().initialize()
        }

        const effectiveMode = mode || get().mode || 'share'

        console.log('[SyncStore] Enabling sync...', { mode: effectiveMode })

        // Cleanup previous subscriptions to prevent accumulating listeners
        if (unsubStatus) unsubStatus()
        if (unsubActivity) unsubActivity()

        // Subscribe to sync status changes
        unsubStatus = onSyncStatusChange(() => {
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
        unsubActivity = onSyncActivity((activity) => {
          set((state) => ({
            recentActivity: [activity, ...state.recentActivity].slice(0, 50),
          }))
        })

        // Note: We intentionally do NOT clear local data when joining.
        // In Yjs CRDTs, map.clear() creates delete tombstones that propagate
        // to all peers, which would destroy the source device's data.
        // Instead, we let the CRDT merge handle conflicts naturally —
        // the joiner receives the sharer's state and both converge.

        // Enable sync encryption mode with password (for credential encryption)
        try {
          await SecureStorage.enableSyncMode(password, roomId)
        } catch (err) {
          console.warn(
            '[SyncStore] Failed to enable sync encryption mode (may be private browsing):',
            err,
          )
        }

        await yjsEnableSync({ roomId, password })
        set({
          enabled: true,
          roomId,
          mode: effectiveMode,
          needsPasswordReentry: false,
          pendingJoinRoomId: null,
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

        // Cleanup sync event subscriptions
        if (unsubStatus) {
          unsubStatus()
          unsubStatus = null
        }
        if (unsubActivity) {
          unsubActivity()
          unsubActivity = null
        }

        yjsDisableSync()

        set({
          enabled: false,
          roomId: null,
          mode: null,
          needsPasswordReentry: false,
          pendingJoinRoomId: null,
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

      setPendingJoinRoomId: (roomId: string | null) => {
        set({ pendingJoinRoomId: roomId })
      },

      clearPasswordReentry: () => {
        set({ needsPasswordReentry: false })
      },
    }),
    {
      name: 'devs-sync-settings',
      partialize: (state) => ({
        enabled: state.enabled,
        roomId: state.roomId,
        mode: state.mode,
        needsPasswordReentry: state.needsPasswordReentry,
      }),
    },
  ),
)
