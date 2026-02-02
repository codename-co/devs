/**
 * Sync Worker Client
 *
 * Main thread interface for communicating with the sync Web Worker.
 * Provides a promise-based API for sync operations.
 */
import type {
  SyncWorkerMessage,
  SyncWorkerResponse,
  SyncedStoreName,
  SerializedItem,
  SyncedPreferenceKey,
} from './sync-worker-types'

// ============================================================================
// Types
// ============================================================================

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

export interface RemoteChange {
  storeName: SyncedStoreName
  changes: {
    added: SerializedItem[]
    updated: SerializedItem[]
    deleted: string[]
  }
}

export interface PreferenceChange {
  key: SyncedPreferenceKey
  value: unknown
  timestamp: Date
}

type StatusCallback = (status: {
  status: SyncStatus
  peerCount: number
  peers: PeerInfo[]
  localClientId: number | null
}) => void

type RemoteChangeCallback = (change: RemoteChange) => void
type PreferenceChangeCallback = (change: PreferenceChange) => void
type ActivityCallback = (activity: SyncActivity) => void

// ============================================================================
// Singleton Worker Instance
// ============================================================================

let worker: Worker | null = null
let workerReady = false
let readyPromise: Promise<void> | null = null
let readyResolve: (() => void) | null = null
let readyReject: ((error: Error) => void) | null = null

// Callbacks
let statusCallback: StatusCallback | null = null
let remoteChangeCallback: RemoteChangeCallback | null = null
let preferenceChangeCallback: PreferenceChangeCallback | null = null
let activityCallback: ActivityCallback | null = null

// Pending requests waiting for responses (includes initialization requests)
const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }
>()

let requestIdCounter = 0

// Track pending initialization to handle concurrent calls
let pendingInitPromise: Promise<void> | null = null

// ============================================================================
// Worker Management
// ============================================================================

const WORKER_READY_TIMEOUT_MS = 10_000

function getWorker(): Worker {
  if (!worker) {
    // Use Vite's worker import syntax
    worker = new Worker(new URL('./sync.worker.ts', import.meta.url), {
      type: 'module',
      name: 'sync-worker',
    })

    worker.onmessage = handleWorkerMessage
    worker.onerror = handleWorkerError

    // Create ready promise with timeout
    readyPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        readyReject = null
        reject(new Error('Worker failed to start within timeout'))
      }, WORKER_READY_TIMEOUT_MS)

      readyReject = (error: Error) => {
        clearTimeout(timeoutId)
        reject(error)
      }

      readyResolve = () => {
        clearTimeout(timeoutId)
        readyReject = null
        resolve()
      }
    })
  }

  return worker
}

function handleWorkerMessage(event: MessageEvent<SyncWorkerResponse>): void {
  const msg = event.data

  switch (msg.type) {
    case 'SYNC_READY':
      workerReady = true
      readyResolve?.()
      console.log('[SyncClient] Worker ready')
      break

    case 'SYNC_INITIALIZED': {
      // Handle SYNC_INITIALIZED via pendingRequests (using requestId if available)
      const initRequestId = (msg as { requestId?: string }).requestId
      if (initRequestId) {
        const pending = pendingRequests.get(initRequestId)
        if (pending) {
          pendingRequests.delete(initRequestId)
          if (msg.payload.success) {
            pending.resolve(undefined)
          } else {
            pending.reject(
              new Error(msg.payload.error || 'Sync initialization failed'),
            )
          }
        }
      }
      break
    }

    case 'SYNC_STATUS':
      statusCallback?.({
        status: msg.payload.status,
        peerCount: msg.payload.peerCount,
        peers: msg.payload.peers,
        localClientId: msg.payload.localClientId,
      })
      break

    case 'REMOTE_CHANGE':
      remoteChangeCallback?.({
        storeName: msg.payload.storeName,
        changes: msg.payload.changes,
      })
      break

    case 'PREFERENCE_CHANGE':
      preferenceChangeCallback?.({
        key: msg.payload.key as SyncedPreferenceKey,
        value: msg.payload.value,
        timestamp: new Date(msg.payload.timestamp),
      })
      break

    case 'SYNC_ACTIVITY':
      activityCallback?.({
        type: msg.payload.type,
        bytes: msg.payload.bytes,
        timestamp: new Date(msg.payload.timestamp),
      })
      break

    case 'RESPONSE': {
      const pending = pendingRequests.get(msg.requestId)
      if (pending) {
        pendingRequests.delete(msg.requestId)
        if (msg.error) {
          pending.reject(new Error(msg.error))
        } else {
          pending.resolve(msg.payload)
        }
      }
      break
    }

    case 'SYNC_ERROR':
      console.error('[SyncClient] Worker error:', msg.payload.message)
      break

    case 'LOG':
      // Forward worker logs to console
      const { level, message, data } = msg.payload
      const consoleMethod = level === 'debug' ? 'log' : level
      if (data !== undefined) {
        console[consoleMethod](`[SyncWorker] ${message}`, data)
      } else {
        console[consoleMethod](`[SyncWorker] ${message}`)
      }
      break
  }
}

function handleWorkerError(error: ErrorEvent): void {
  console.error('[SyncClient] Worker error:', error.message)
  // If worker errors during startup, reject the ready promise
  if (!workerReady && readyReject) {
    readyReject(new Error(`Worker startup failed: ${error.message}`))
  }
}

async function waitForReady(): Promise<void> {
  getWorker()
  if (workerReady) return
  if (!readyPromise) {
    throw new Error('Worker not initialized')
  }
  await readyPromise
}

function postMessage(msg: SyncWorkerMessage): void {
  getWorker().postMessage(msg)
}

async function request<T>(
  msg: SyncWorkerMessage & { requestId: string },
): Promise<T> {
  await waitForReady()

  return new Promise((resolve, reject) => {
    pendingRequests.set(msg.requestId, {
      resolve: resolve as (value: unknown) => void,
      reject,
    })
    postMessage(msg)

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(msg.requestId)) {
        pendingRequests.delete(msg.requestId)
        reject(new Error('Request timed out'))
      }
    }, 30_000)
  })
}

function generateRequestId(): string {
  return `req_${++requestIdCounter}_${Date.now()}`
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the sync worker
 *
 * This function is idempotent - concurrent calls will share the same promise.
 */
export async function initSyncWorker(
  options: {
    roomId?: string
    serverUrl?: string
    password?: string
  } = {},
): Promise<void> {
  // If there's already a pending initialization, wait for it
  if (pendingInitPromise) {
    return pendingInitPromise
  }

  await waitForReady()

  const requestId = generateRequestId()

  pendingInitPromise = new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId)
      pendingInitPromise = null
      reject(new Error('Sync initialization timed out'))
    }, 30_000)

    pendingRequests.set(requestId, {
      resolve: () => {
        clearTimeout(timeoutId)
        pendingInitPromise = null
        resolve()
      },
      reject: (error: Error) => {
        clearTimeout(timeoutId)
        pendingInitPromise = null
        reject(error)
      },
    })

    postMessage({
      type: 'SYNC_INIT',
      requestId,
      payload: options,
    })
  })

  return pendingInitPromise
}

/**
 * Enable P2P sync
 */
export async function enableSync(
  roomId: string,
  serverUrl?: string,
  password?: string,
): Promise<void> {
  await waitForReady()

  postMessage({
    type: 'SYNC_ENABLE',
    payload: { roomId, serverUrl, password },
  })
}

/**
 * Disable P2P sync
 */
export async function disableSync(): Promise<void> {
  await waitForReady()

  postMessage({ type: 'SYNC_DISABLE' })
}

/**
 * Sync an item to Yjs
 */
export async function syncItem(
  storeName: SyncedStoreName,
  item: SerializedItem,
): Promise<void> {
  await waitForReady()

  postMessage({
    type: 'SYNC_ITEM',
    payload: { storeName, item },
  })
}

/**
 * Delete an item from Yjs
 */
export async function deleteItem(
  storeName: SyncedStoreName,
  id: string,
): Promise<void> {
  await waitForReady()

  postMessage({
    type: 'DELETE_ITEM',
    payload: { storeName, id },
  })
}

/**
 * Load data for a store into Yjs
 */
export async function loadStoreData(
  storeName: SyncedStoreName,
  items: SerializedItem[],
): Promise<void> {
  await waitForReady()

  postMessage({
    type: 'LOAD_DATA',
    payload: { storeName, items },
  })
}

/**
 * Force load all data to Yjs (for initial sync)
 */
export async function forceLoadData(
  stores: Array<{ storeName: SyncedStoreName; items: SerializedItem[] }>,
): Promise<void> {
  await waitForReady()

  postMessage({
    type: 'FORCE_LOAD_DATA',
    payload: { stores },
  })
}

/**
 * Clear preferences before joining a room
 */
export async function clearPreferences(): Promise<void> {
  await waitForReady()

  postMessage({ type: 'CLEAR_PREFERENCES' })
}

/**
 * Set a preference value
 */
export async function setPreference(
  key: string,
  value: unknown,
  timestamp?: Date,
): Promise<void> {
  await waitForReady()

  postMessage({
    type: 'SET_PREFERENCE',
    payload: {
      key,
      value,
      timestamp: (timestamp ?? new Date()).toISOString(),
    },
  })
}

/**
 * Get all synced preferences
 */
export async function getPreferences(): Promise<
  Record<string, { value: unknown; timestamp: string }>
> {
  return request({
    type: 'GET_PREFERENCES',
    requestId: generateRequestId(),
  })
}

/**
 * Get data for a store from Yjs
 */
export async function getStoreData(
  storeName: SyncedStoreName,
): Promise<SerializedItem[]> {
  return request({
    type: 'GET_STORE_DATA',
    requestId: generateRequestId(),
    payload: { storeName },
  })
}

/**
 * Get current sync status
 */
export async function getStatus(): Promise<{
  persistenceReady: boolean
  connected: boolean
}> {
  return request({
    type: 'GET_STATUS',
    requestId: generateRequestId(),
  })
}

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to sync status changes
 */
export function onStatusChange(callback: StatusCallback): () => void {
  statusCallback = callback
  return () => {
    statusCallback = null
  }
}

/**
 * Subscribe to remote changes from peers
 */
export function onRemoteChange(callback: RemoteChangeCallback): () => void {
  remoteChangeCallback = callback
  return () => {
    remoteChangeCallback = null
  }
}

/**
 * Subscribe to preference changes from peers
 */
export function onPreferenceChange(
  callback: PreferenceChangeCallback,
): () => void {
  preferenceChangeCallback = callback
  return () => {
    preferenceChangeCallback = null
  }
}

/**
 * Subscribe to sync activity
 */
export function onActivity(callback: ActivityCallback): () => void {
  activityCallback = callback
  return () => {
    activityCallback = null
  }
}

/**
 * Check if worker is initialized
 */
export function isWorkerReady(): boolean {
  return workerReady
}

/**
 * Terminate the worker (for cleanup)
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
    workerReady = false
    readyPromise = null
    readyResolve = null
    pendingRequests.clear()
  }
}
