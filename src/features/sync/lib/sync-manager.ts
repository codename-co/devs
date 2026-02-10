/**
 * Sync Manager
 *
 * Manages real-time synchronization via WebSocket.
 * Uses y-websocket for reliable Yjs document sync.
 */
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import { deriveEncryptionKey } from '@/lib/yjs/crypto'
import { createEncryptedWebSocketClass } from '@/lib/yjs/encrypted-ws'

import { getYDoc } from './yjs-doc'
import { errorToast, successToast } from '@/lib/toast'

// Default WebSocket server URL
const getDefaultServerUrl = (): string => {
  return 'wss://signal.devs.new' // TODO: Let the user override this in the advanced settings
}

let wsProvider: WebsocketProvider | null = null

// Track if cleanup listener is registered
let cleanupListenerRegistered = false

/**
 * Gracefully disconnect WebSocket on page unload to prevent Firefox warnings
 * about interrupted connections during page load
 */
function handlePageUnload(): void {
  if (wsProvider) {
    console.log('[Sync] Page unloading, disconnecting WebSocket gracefully')
    wsProvider.disconnect()
  }
}

/**
 * Register cleanup listener for page unload events
 */
function registerCleanupListener(): void {
  if (cleanupListenerRegistered) return

  // Use pagehide for better browser support (including mobile)
  // pagehide fires before beforeunload and is more reliable
  window.addEventListener('pagehide', handlePageUnload)

  // Also listen to beforeunload as a fallback
  window.addEventListener('beforeunload', handlePageUnload)

  cleanupListenerRegistered = true
}

/**
 * Unregister cleanup listener
 */
function unregisterCleanupListener(): void {
  if (!cleanupListenerRegistered) return

  window.removeEventListener('pagehide', handlePageUnload)
  window.removeEventListener('beforeunload', handlePageUnload)

  cleanupListenerRegistered = false
}

export interface SyncConfig {
  roomId: string
  password: string
  serverUrl?: string
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

type SyncEventCallback = (status: {
  connected: boolean
  peerCount: number
  peers: PeerInfo[]
}) => void

type SyncActivityCallback = (activity: SyncActivity) => void
type InitialSyncCallback = () => void

let statusCallback: SyncEventCallback | null = null
let activityCallback: SyncActivityCallback | null = null
let initialSyncCallback: InitialSyncCallback | null = null

// Track recent sync activity for visualization
const recentActivity: SyncActivity[] = []
const MAX_ACTIVITY_ENTRIES = 50

/** Number of PBKDF2 iterations — meets OWASP 2023 recommendation (≥210K for SHA-256). */
const PBKDF2_ITERATIONS = 210_000

/**
 * Derive the actual WebSocket room name using PBKDF2-SHA-256.
 * This ensures different passwords result in different rooms on the
 * signalling server, and brute-forcing weak passwords is expensive.
 */
async function deriveRoomName(
  roomId: string,
  password: string,
): Promise<string> {
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const salt = encoder.encode(`devs-sync:${roomId.length}:${roomId}`)

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  const hashArray = new Uint8Array(derivedBits)
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Enable sync with the given configuration
 */
export async function enableSync(config: SyncConfig): Promise<void> {
  if (!config.password) {
    throw new Error('[Sync] Password is required for sync')
  }

  if (wsProvider) {
    disableSync()
  }

  const ydoc = getYDoc()
  const serverUrl = config.serverUrl || getDefaultServerUrl()

  // Derive room name and encryption key in parallel (both use PBKDF2).
  const [effectiveRoom, encryptionKey] = await Promise.all([
    deriveRoomName(config.roomId, config.password),
    deriveEncryptionKey(config.password, config.roomId),
  ])

  const EncryptedWS = createEncryptedWebSocketClass(encryptionKey)

  console.log(
    '[Sync] Enabling E2E encrypted sync for room:',
    config.roomId,
    '(room:',
    effectiveRoom.slice(0, 12) + '…)',
  )
  console.log('[Sync] Server URL:', serverUrl)
  console.log('[Sync] Y.Doc clientID:', ydoc.clientID)

  wsProvider = new WebsocketProvider(serverUrl, effectiveRoom, ydoc, {
    WebSocketPolyfill: EncryptedWS as unknown as typeof WebSocket,
  })

  // Register cleanup listener to gracefully disconnect on page unload
  registerCleanupListener()

  // Connection status events
  wsProvider.on('status', (event: { status: string }) => {
    console.log('[Sync] Connection status:', event.status)
    notifyStatus()
  })

  wsProvider.on('sync', (isSynced: boolean) => {
    console.log('[Sync] Synced:', isSynced)

    // Log detailed sync state for debugging document divergence issues
    if (isSynced) {
      const stateVector = Y.encodeStateVector(ydoc)
      console.log('[Sync] State vector size:', stateVector.length, 'bytes')
      console.log('[Sync] Y.Doc clientID:', ydoc.clientID)
      console.log(
        '[Sync] Preferences map size:',
        ydoc.getMap('preferences').size,
      )
      console.log(
        '[Sync] Preferences map keys:',
        Array.from(ydoc.getMap('preferences').keys()),
      )
    }

    notifyStatus()
    if (isSynced) {
      successToast('Sync connected successfully!')
      // Notify initial sync callback
      if (initialSyncCallback) {
        console.log('[Sync] Calling initial sync callback')
        initialSyncCallback()
      }
    } else {
      errorToast('Sync disconnected.')
    }
  })

  // Track awareness changes (peers joining/leaving)
  wsProvider.awareness.on('change', () => {
    notifyStatus()
  })

  // Debug: observe ALL changes to the doc and track activity
  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    const isRemote = origin === wsProvider
    console.log(
      '[Sync] Y.Doc update:',
      'origin=' +
        (origin === wsProvider
          ? 'wsProvider'
          : origin === null
            ? 'null'
            : 'other'),
      'isRemote=' + isRemote,
      'size=' + update.length + 'bytes',
    )

    // Track sync activity
    const activity: SyncActivity = {
      type: isRemote ? 'received' : 'sent',
      bytes: update.length,
      timestamp: new Date(),
    }

    recentActivity.unshift(activity)
    if (recentActivity.length > MAX_ACTIVITY_ENTRIES) {
      recentActivity.pop()
    }

    // Notify activity listeners
    if (activityCallback) {
      activityCallback(activity)
    }
  })
}

/**
 * Manually request sync (for debugging)
 */
export function requestSync(): void {
  if (!wsProvider) {
    console.log('[Sync] Cannot request sync - not connected')
    return
  }

  console.log('[Sync] Manually requesting sync...')

  const ydoc = getYDoc()
  const agentsMap = ydoc.getMap('agents')
  const conversationsMap = ydoc.getMap('conversations')

  console.log(
    '[Sync] Current state - agents:',
    agentsMap.size,
    'conversations:',
    conversationsMap.size,
  )

  // Force broadcast our full state
  const fullState = Y.encodeStateAsUpdate(ydoc)
  console.log('[Sync] Broadcasting full state:', fullState.length, 'bytes')
  Y.applyUpdate(ydoc, fullState, 'manual-sync')
}

/**
 * Get debug info about current sync state
 */
export function getSyncDebugInfo(): object {
  const ydoc = getYDoc()
  return {
    connected: wsProvider?.wsconnected ?? false,
    synced: wsProvider?.synced ?? false,
    clientID: ydoc.clientID,
    agentsCount: ydoc.getMap('agents').size,
    conversationsCount: ydoc.getMap('conversations').size,
    messagesCount: ydoc.getMap('messages').size,
    awarenessStates: wsProvider?.awareness.getStates().size ?? 0,
  }
}

/**
 * Get detailed debug info about WebSocket connection
 */
export function getWebrtcDebugInfo(): object {
  if (!wsProvider) {
    return { error: 'Provider not initialized' }
  }

  return {
    connected: wsProvider.wsconnected,
    synced: wsProvider.synced,
    room: wsProvider.roomname,
    serverUrl: wsProvider.url,
    awarenessClientId: wsProvider.awareness.clientID,
    awarenessStatesCount: wsProvider.awareness.getStates().size,
    wsReadyState: wsProvider.ws?.readyState ?? 'none',
    wsReadyStateLabel: getReadyStateLabel(wsProvider.ws?.readyState),
  }
}

function getReadyStateLabel(state: number | undefined): string {
  switch (state) {
    case 0:
      return 'CONNECTING'
    case 1:
      return 'OPEN'
    case 2:
      return 'CLOSING'
    case 3:
      return 'CLOSED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * Disable sync
 */
export function disableSync(): void {
  if (wsProvider) {
    console.log('[Sync] Disabling sync')
    wsProvider.destroy()
    wsProvider = null
    unregisterCleanupListener()
    notifyStatus()
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  if (!wsProvider) return 'disabled'
  return wsProvider.wsconnected ? 'connected' : 'connecting'
}

/**
 * Get number of connected peers
 */
export function getPeerCount(): number {
  if (!wsProvider) return 0
  return wsProvider.awareness.getStates().size - 1 // Exclude self
}

/**
 * Get detailed information about connected peers
 */
export function getPeers(): PeerInfo[] {
  if (!wsProvider) return []

  const localClientId = wsProvider.awareness.clientID
  const peers: PeerInfo[] = []

  wsProvider.awareness.getStates().forEach((_, clientId) => {
    peers.push({
      clientId,
      isLocal: clientId === localClientId,
    })
  })

  return peers
}

/**
 * Get local client ID
 */
export function getLocalClientId(): number | null {
  return wsProvider?.awareness.clientID ?? null
}

/**
 * Get recent sync activity
 */
export function getRecentActivity(): SyncActivity[] {
  return [...recentActivity]
}

/**
 * Subscribe to sync activity events
 */
export function onSyncActivity(callback: SyncActivityCallback): () => void {
  activityCallback = callback
  return () => {
    activityCallback = null
  }
}

/**
 * Check if sync is enabled
 */
export function isSyncEnabled(): boolean {
  return wsProvider !== null
}

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(callback: SyncEventCallback): () => void {
  statusCallback = callback
  return () => {
    statusCallback = null
  }
}

/**
 * Subscribe to initial sync completion
 * Called once when WebSocket sync is first established after connecting
 */
export function onInitialSync(callback: InitialSyncCallback): () => void {
  initialSyncCallback = callback
  return () => {
    initialSyncCallback = null
  }
}

function notifyStatus(): void {
  if (statusCallback) {
    statusCallback({
      connected: getSyncStatus() === 'connected',
      peerCount: getPeerCount(),
      peers: getPeers(),
    })
  }
}

/**
 * Get the WebSocket provider (for advanced usage)
 */
export function getProvider(): WebsocketProvider | null {
  return wsProvider
}

/**
 * Get the current room name for debugging
 */
export function getCurrentRoom(): string | null {
  return wsProvider?.roomname ?? null
}
