/**
 * @module yjs/sync
 *
 * WebSocket Sync Control
 *
 * Manages **optional** peer-to-peer synchronization via a WebSocket
 * signalling server (`y-websocket`).  When enabled, every mutation on
 * the local Yjs document is automatically broadcast to all peers in
 * the same room, and incoming changes are merged conflict-free via the
 * CRDT algorithm built into Yjs.
 *
 * Sync is entirely opt-in — the application works fully offline.  The
 * UI exposes a "Sync" panel in Settings where users enter a room ID
 * and a password.
 *
 * ## Lifecycle
 *
 * 1. User calls {@link enableSync} with a {@link SyncConfig}.
 * 2. A `WebsocketProvider` connects to the signalling server.
 * 3. Status transitions: `disabled → connecting → connected`.
 * 4. Document updates flow bidirectionally.
 * 5. User calls {@link disableSync} to tear down the connection.
 *
 * @example
 * ```ts
 * import { enableSync, disableSync, onSyncStatusChange } from '@/lib/yjs'
 *
 * const unsub = onSyncStatusChange((status) => console.log(status))
 * enableSync({ roomId: 'my-team', password: 's3cret' })
 * // … later …
 * disableSync()
 * unsub()
 * ```
 */
import { WebsocketProvider } from 'y-websocket'

import { deriveEncryptionKey } from './crypto'
import { ydoc } from './doc'
import { createEncryptedWebSocketClass } from './encrypted-ws'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Configuration required to establish a WebSocket sync session.
 */
export interface SyncConfig {
  /** Unique room identifier — all peers sharing this ID sync together. */
  roomId: string
  /**
   * WebSocket signalling server URL.
   * @defaultValue `'wss://signal.devs.new'`
   */
  server?: string
  /**
   * Room password – **mandatory**.
   *
   * Used to:
   * 1. Derive the effective room name via PBKDF2 (wrong passwords
   *    land in a different, empty room).
   * 2. Derive an AES-GCM-256 key for E2E encryption of all Yjs sync
   *    messages — the signalling server never sees plaintext.
   * 3. By {@link SecureStorage} to derive a portable encryption key
   *    for credentials.
   *
   * **Note:** the password is NOT sent over the wire.
   */
  password: string
}

/**
 * Possible states of the sync connection.
 *
 * - `'disabled'`   — no provider exists; sync is off.
 * - `'connecting'` — provider created but WebSocket handshake incomplete.
 * - `'connected'`  — WebSocket open and document syncing.
 */
export type SyncStatus = 'disabled' | 'connecting' | 'connected'

/**
 * Describes a single peer visible through the Yjs awareness protocol.
 */
export interface PeerInfo {
  /** Yjs-assigned numeric client identifier (unique per tab). */
  clientId: number
  /** `true` when this entry represents the local client. */
  isLocal: boolean
}

/**
 * Represents a single sync data-transfer event.
 */
export interface SyncActivity {
  /** Direction of data flow relative to the local client. */
  type: 'sent' | 'received'
  /** Size of the Yjs update in bytes. */
  bytes: number
  /** When the activity was recorded. */
  timestamp: Date
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Room derivation — password becomes part of the room identity
// ---------------------------------------------------------------------------

/** Number of PBKDF2 iterations — meets OWASP 2023 recommendation (≥210K for SHA-256). */
const PBKDF2_ITERATIONS = 210_000

/**
 * Derive the actual WebSocket room name from a user-visible room ID and
 * password using PBKDF2-SHA-256.
 *
 * The y-websocket signalling server uses the room name to segregate Yjs
 * documents — it does **not** validate passwords.  By deriving the room
 * via a slow KDF we ensure that:
 *
 * 1. Different passwords always map to entirely separate rooms, so an
 *    incorrect password connects a peer to an empty, unrelated document.
 * 2. Brute-forcing weak passwords is computationally expensive — each
 *    attempt costs {@link PBKDF2_ITERATIONS} rounds of HMAC-SHA-256.
 *
 * The `roomId` is used as the PBKDF2 salt (ensuring the same password
 * maps to different rooms for different room IDs).
 *
 * @param roomId   The human-readable room identifier shared between peers.
 * @param password The room password.
 * @returns A hex-encoded 256-bit key used as the effective room name.
 */
export async function deriveRoomName(
  roomId: string,
  password: string,
): Promise<string> {
  const encoder = new TextEncoder()

  // Import the password as raw key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  // Use the roomId as the salt, length-prefixed to avoid collisions
  // (e.g. roomId="a:b" vs roomId="a" with different password prefixes)
  const salt = encoder.encode(`devs-sync:${roomId.length}:${roomId}`)

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256, // 256 bits = 32 bytes = 64 hex chars
  )

  const hashArray = new Uint8Array(derivedBits)
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Active WebSocket provider, or `null` when sync is disabled. */
let provider: WebsocketProvider | null = null

/** Convenience accessor — avoids scattering `provider` null-checks. */
const wsProvider = (): WebsocketProvider | null => provider

/** Callback type for {@link onSyncStatusChange}. */
type StatusCallback = (status: SyncStatus) => void
let statusCallbacks: StatusCallback[] = []

/** Callback type for {@link onSyncActivity}. */
type ActivityCallback = (activity: SyncActivity) => void
let activityCallbacks: ActivityCallback[] = []

/** Circular buffer of recent sync events for the diagnostics UI. */
const recentActivity: SyncActivity[] = []
/** Maximum number of activity entries to retain. */
const MAX_RECENT_ACTIVITY = 100

/**
 * Enable WebSocket synchronization with peers.
 *
 * Creates a `WebsocketProvider` that connects to the signalling server
 * and begins bidirectional document sync.  If sync is already active it
 * is torn down first so the new config takes effect cleanly.
 *
 * @param config - Connection parameters (room, server, password).
 */
export async function enableSync(config: SyncConfig): Promise<void> {
  if (!config.password) {
    throw new Error('[Sync] Password is required for E2E encrypted sync')
  }

  if (provider) {
    disableSync()
  }

  const server = config.server ?? 'wss://signal.devs.new'

  // Derive room name and encryption key in parallel (both use PBKDF2).
  const [effectiveRoom, encryptionKey] = await Promise.all([
    deriveRoomName(config.roomId, config.password),
    deriveEncryptionKey(config.password, config.roomId),
  ])

  const EncryptedWS = createEncryptedWebSocketClass(encryptionKey)

  console.log(
    '[Sync] Connecting to',
    server,
    'room:',
    config.roomId,
    '(E2E encrypted, room:',
    effectiveRoom.slice(0, 12) + '…)',
  )

  provider = new WebsocketProvider(server, effectiveRoom, ydoc, {
    WebSocketPolyfill: EncryptedWS as unknown as typeof WebSocket,
  })

  // Notify status callbacks on connection status changes
  provider.on('status', ({ status }: { status: string }) => {
    console.log('[Sync] Status:', status)
    const syncStatus = getSyncStatus()
    statusCallbacks.forEach((cb) => cb(syncStatus))
  })

  // Log connection events
  provider.on('sync', (synced: boolean) => {
    console.log('[Sync] Document synced:', synced)
  })

  // Track sync activity on document updates
  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    const isRemote = origin === provider
    const activity: SyncActivity = {
      type: isRemote ? 'received' : 'sent',
      bytes: update.length,
      timestamp: new Date(),
    }
    console.log(
      `[Sync] ${isRemote ? '⬇️ Received' : '⬆️ Sent'} ${update.length} bytes`,
    )
    recordActivity(activity)
  })
}

/**
 * Disable WebSocket synchronization and disconnect from all peers.
 *
 * Safe to call even if sync is already disabled (no-op).
 */
export function disableSync(): void {
  if (provider) {
    provider.destroy()
    provider = null
  }
}

/**
 * Get the current sync connection status.
 *
 * @returns The current {@link SyncStatus} — `'disabled'`, `'connecting'`, or `'connected'`.
 */
export function getSyncStatus(): SyncStatus {
  if (!provider) return 'disabled'
  return provider.wsconnected ? 'connected' : 'connecting'
}

/**
 * Get the number of peers visible via the Yjs awareness protocol.
 *
 * The count includes the local client, so a value of `1` means
 * "only me" and `0` means sync is disabled.
 *
 * @returns Number of awareness states (peers + self).
 */
export function getPeerCount(): number {
  if (!provider) return 0
  return provider.awareness.getStates().size
}

/**
 * Get detailed information about every connected peer.
 *
 * @returns An array of {@link PeerInfo} objects, one per awareness state.
 *          Returns an empty array when sync is disabled.
 */
export function getPeers(): PeerInfo[] {
  if (!wsProvider()) return []
  const awareness = wsProvider()!.awareness
  const localId = awareness.clientID
  const states = awareness.getStates()
  return Array.from(states.keys()).map((clientId) => ({
    clientId,
    isLocal: clientId === localId,
  }))
}

/**
 * Get the local Yjs awareness client ID.
 *
 * @returns The numeric client ID assigned to this tab, or `null` if
 *          sync is disabled.
 */
export function getLocalClientId(): number | null {
  if (!wsProvider()) return null
  return wsProvider()!.awareness.clientID
}

/**
 * Check whether a WebSocket sync session is currently active.
 *
 * @returns `true` if a provider exists (regardless of connection state).
 */
export function isSyncEnabled(): boolean {
  return wsProvider() !== null
}

/**
 * Subscribe to sync activity (sent/received) events.
 *
 * @param callback - Invoked each time a Yjs update is sent or received.
 * @returns An unsubscribe function.  Call it to stop receiving events.
 */
export function onSyncActivity(callback: ActivityCallback): () => void {
  activityCallbacks.push(callback)
  return () => {
    activityCallbacks = activityCallbacks.filter((cb) => cb !== callback)
  }
}

/**
 * Retrieve a shallow copy of the most recent sync activity entries.
 *
 * The buffer holds up to {@link MAX_RECENT_ACTIVITY} entries (FIFO).
 *
 * @returns A new array of {@link SyncActivity} objects.
 */
export function getRecentActivity(): SyncActivity[] {
  return [...recentActivity]
}

/**
 * Append an activity entry to the circular buffer and notify subscribers.
 *
 * @internal
 * @param activity - The activity event to record.
 */
function recordActivity(activity: SyncActivity): void {
  recentActivity.push(activity)
  if (recentActivity.length > MAX_RECENT_ACTIVITY) {
    recentActivity.shift()
  }
  activityCallbacks.forEach((cb) => cb(activity))
}

/**
 * Subscribe to sync status transitions.
 *
 * The callback fires whenever the status changes between `'disabled'`,
 * `'connecting'`, and `'connected'`.
 *
 * @param callback - Invoked with the new {@link SyncStatus}.
 * @returns An unsubscribe function.
 */
export function onSyncStatusChange(callback: StatusCallback): () => void {
  statusCallbacks.push(callback)
  return () => {
    statusCallbacks = statusCallbacks.filter((cb) => cb !== callback)
  }
}
