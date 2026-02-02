/**
 * WebSocket Sync Control
 *
 * Manages optional P2P synchronization via WebSocket.
 * When enabled, changes propagate to all connected peers in real-time.
 */
import { WebsocketProvider } from 'y-websocket'

import { ydoc } from './doc'

export interface SyncConfig {
  roomId: string
  server?: string
  password?: string
}

export type SyncStatus = 'disabled' | 'connecting' | 'connected'

export interface PeerInfo {
  clientId: number
  isLocal: boolean
}

export interface SyncActivity {
  type: 'sent' | 'received'
  bytes: number
  timestamp: Date
}

let provider: WebsocketProvider | null = null

// Alias for consistency with other modules
const wsProvider = (): WebsocketProvider | null => provider

// Status change callbacks
type StatusCallback = (status: SyncStatus) => void
let statusCallbacks: StatusCallback[] = []

// Activity tracking
type ActivityCallback = (activity: SyncActivity) => void
let activityCallbacks: ActivityCallback[] = []
const recentActivity: SyncActivity[] = []
const MAX_RECENT_ACTIVITY = 100

/**
 * Enable WebSocket synchronization with peers.
 * Creates a WebsocketProvider that syncs the document.
 */
export function enableSync(config: SyncConfig): void {
  if (provider) {
    disableSync()
  }

  const server = config.server ?? 'wss://signal.devs.new'
  console.log('[Sync] Connecting to', server, 'room:', config.roomId)

  provider = new WebsocketProvider(server, config.roomId, ydoc, {
    params: config.password ? { password: config.password } : undefined,
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
 * Disable WebSocket synchronization.
 * Destroys the provider and disconnects from peers.
 */
export function disableSync(): void {
  if (provider) {
    provider.destroy()
    provider = null
  }
}

/**
 * Get the current sync status.
 */
export function getSyncStatus(): SyncStatus {
  if (!provider) return 'disabled'
  return provider.wsconnected ? 'connected' : 'connecting'
}

/**
 * Get the number of connected peers.
 */
export function getPeerCount(): number {
  if (!provider) return 0
  return provider.awareness.getStates().size
}

/**
 * Get detailed information about all connected peers.
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
 * Get the local client ID.
 */
export function getLocalClientId(): number | null {
  if (!wsProvider()) return null
  return wsProvider()!.awareness.clientID
}

/**
 * Check if sync is currently enabled.
 */
export function isSyncEnabled(): boolean {
  return wsProvider() !== null
}

/**
 * Subscribe to sync activity events.
 * Returns an unsubscribe function.
 */
export function onSyncActivity(callback: ActivityCallback): () => void {
  activityCallbacks.push(callback)
  return () => {
    activityCallbacks = activityCallbacks.filter((cb) => cb !== callback)
  }
}

/**
 * Get recent sync activity entries.
 */
export function getRecentActivity(): SyncActivity[] {
  return [...recentActivity]
}

/**
 * Internal function to record activity.
 */
function recordActivity(activity: SyncActivity): void {
  recentActivity.push(activity)
  if (recentActivity.length > MAX_RECENT_ACTIVITY) {
    recentActivity.shift()
  }
  activityCallbacks.forEach((cb) => cb(activity))
}

/**
 * Subscribe to sync status changes.
 * Returns an unsubscribe function.
 */
export function onSyncStatusChange(callback: StatusCallback): () => void {
  statusCallbacks.push(callback)
  return () => {
    statusCallbacks = statusCallbacks.filter((cb) => cb !== callback)
  }
}
