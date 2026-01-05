/**
 * Sync Manager
 *
 * Manages real-time synchronization via WebSocket.
 * Uses y-websocket for reliable Yjs document sync.
 */
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import { getYDoc } from './yjs-doc'

// Default WebSocket server URL
const getDefaultServerUrl = (): string => {
  return 'wss://signal.devs.new' // TODO: Let the user override this in the advanced settings

  // Use current hostname to allow network devices to connect
  // Falls back to localhost for local-only development
  return `wss://${window.location.hostname || 'localhost'}`
}

let wsProvider: WebsocketProvider | null = null

export interface SyncConfig {
  roomId: string
  password?: string
  serverUrl?: string
}

export type SyncStatus = 'disabled' | 'connecting' | 'connected'

type SyncEventCallback = (status: {
  connected: boolean
  peerCount: number
}) => void

let statusCallback: SyncEventCallback | null = null

/**
 * Enable sync with the given configuration
 */
export function enableSync(config: SyncConfig): void {
  if (wsProvider) {
    disableSync()
  }

  const ydoc = getYDoc()
  const serverUrl = config.serverUrl || getDefaultServerUrl()

  console.log('[Sync] Enabling sync for room:', config.roomId)
  console.log('[Sync] Server URL:', serverUrl)
  console.log('[Sync] Y.Doc clientID:', ydoc.clientID)

  // Log current state of maps BEFORE connecting
  const agentsMap = ydoc.getMap('agents')
  const conversationsMap = ydoc.getMap('conversations')
  console.log('[Sync] Before connect - agents map size:', agentsMap.size)
  console.log(
    '[Sync] Before connect - conversations map size:',
    conversationsMap.size,
  )

  wsProvider = new WebsocketProvider(serverUrl, config.roomId, ydoc)

  // Connection status events
  wsProvider.on('status', (event: { status: string }) => {
    console.log('[Sync] Connection status:', event.status)
    notifyStatus()
  })

  wsProvider.on('sync', (isSynced: boolean) => {
    console.log('[Sync] Synced:', isSynced)
    // Log state AFTER sync
    console.log('[Sync] After sync - agents map size:', agentsMap.size)
    console.log(
      '[Sync] After sync - conversations map size:',
      conversationsMap.size,
    )
    if (agentsMap.size > 0) {
      console.log('[Sync] Agent IDs:', Array.from(agentsMap.keys()))
    }
    notifyStatus()
  })

  // Debug: observe ALL changes to the doc
  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    console.log(
      '[Sync] Y.Doc update, origin:',
      origin,
      'size:',
      update.length,
      'bytes',
    )
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

function notifyStatus(): void {
  if (statusCallback) {
    statusCallback({
      connected: getSyncStatus() === 'connected',
      peerCount: getPeerCount(),
    })
  }
}

/**
 * Get the WebSocket provider (for advanced usage)
 */
export function getProvider(): WebsocketProvider | null {
  return wsProvider
}
