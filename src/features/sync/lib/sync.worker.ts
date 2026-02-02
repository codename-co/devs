/**
 * Sync Worker
 *
 * Dedicated Web Worker that handles all Yjs sync operations off the main thread.
 * This includes:
 * - Yjs document management
 * - IndexedDB persistence (y-indexeddb)
 * - WebSocket sync (y-websocket)
 * - Remote change detection and notification
 *
 * The worker communicates with the main thread via postMessage.
 */
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'

import type {
  SyncWorkerMessage,
  SyncWorkerResponse,
  SyncedStoreName,
  SerializedItem,
  TimestampedPreference,
  SyncedPreferenceKey,
} from './sync-worker-types'
import { SYNCED_STORES, SYNCED_PREFERENCE_KEYS } from './sync-worker-types'

// ============================================================================
// Constants
// ============================================================================

const YJS_DB_NAME = 'devs-yjs-sync'
const DEFAULT_SERVER_URL = 'wss://signal.devs.new'
const PERSISTENCE_TIMEOUT_MS = 10_000
const IDB_CHECK_TIMEOUT_MS = 5_000

// ============================================================================
// State
// ============================================================================

let ydoc: Y.Doc | null = null
let persistence: IndexeddbPersistence | null = null
let wsProvider: WebsocketProvider | null = null
let persistenceReady = false

// Track if we're applying remote changes to prevent notification loops
let isApplyingRemoteChange = false

// ============================================================================
// Logging Helpers
// ============================================================================

function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: unknown,
): void {
  const msg: SyncWorkerResponse = {
    type: 'LOG',
    payload: { level, message, data },
  }
  self.postMessage(msg)

  // Also log to console for debugging
  const consoleMethod = level === 'debug' ? 'log' : level
  if (data !== undefined) {
    console[consoleMethod](`[SyncWorker] ${message}`, data)
  } else {
    console[consoleMethod](`[SyncWorker] ${message}`)
  }
}

function sendMessage(msg: SyncWorkerResponse): void {
  self.postMessage(msg)
}

// ============================================================================
// Yjs Document Management
// ============================================================================

function getYDoc(): Y.Doc {
  if (!ydoc) {
    ydoc = new Y.Doc()
    log('info', 'Created new Y.Doc', { clientID: ydoc.clientID })
  }
  return ydoc
}

function getMap(storeName: SyncedStoreName): Y.Map<unknown> {
  const doc = getYDoc()
  switch (storeName) {
    case 'agents':
      return doc.getMap('agents')
    case 'battles':
      return doc.getMap('battles')
    case 'conversations':
      return doc.getMap('conversations')
    case 'knowledgeItems':
      return doc.getMap('knowledge')
    case 'agentMemories':
      return doc.getMap('memories')
    case 'tasks':
      return doc.getMap('tasks')
    case 'pinnedMessages':
      return doc.getMap('pinnedMessages')
    case 'credentials':
      return doc.getMap('credentials')
    case 'studioEntries':
      return doc.getMap('studioEntries')
  }
}

function getPreferencesMap(): Y.Map<unknown> {
  return getYDoc().getMap('preferences')
}

// ============================================================================
// Serialization
// ============================================================================

function serializeForYjs<T>(data: T): unknown {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() }
      }
      return value
    }),
  )
}

function deserializeFromYjs<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data), (_, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value)
    }
    return value
  }) as T
}

// ============================================================================
// Timestamp-based Conflict Resolution
// ============================================================================

function getItemTimestamp(item: unknown): Date | null {
  if (!item || typeof item !== 'object') return null

  const record = item as Record<string, unknown>

  // Try updatedAt first (most common for updated items)
  if (record.updatedAt) {
    const date = toDate(record.updatedAt)
    if (date) return date
  }

  // Fall back to createdAt
  if (record.createdAt) {
    const date = toDate(record.createdAt)
    if (date) return date
  }

  // Fall back to timestamp (used by conversations)
  if (record.timestamp) {
    const date = toDate(record.timestamp)
    if (date) return date
  }

  // Fall back to learnedAt (used by memories)
  if (record.learnedAt) {
    const date = toDate(record.learnedAt)
    if (date) return date
  }

  return null
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  if (
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).__type === 'Date'
  ) {
    return new Date((value as { value: string }).value)
  }
  return null
}

function shouldReplaceItem(existingItem: unknown, newItem: unknown): boolean {
  const existingTimestamp = getItemTimestamp(existingItem)
  const newTimestamp = getItemTimestamp(newItem)

  if (!existingTimestamp || !newTimestamp) {
    return true
  }

  return newTimestamp.getTime() >= existingTimestamp.getTime()
}

function isTimestampedPreference(
  entry: unknown,
): entry is TimestampedPreference {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    'value' in entry &&
    'updatedAt' in entry &&
    typeof (entry as TimestampedPreference).updatedAt === 'string'
  )
}

function extractPreferenceValue(entry: unknown): {
  value: unknown
  updatedAt: Date | null
} {
  if (isTimestampedPreference(entry)) {
    return {
      value: entry.value,
      updatedAt: new Date(entry.updatedAt),
    }
  }
  return {
    value: entry,
    updatedAt: null,
  }
}

// ============================================================================
// Persistence
// ============================================================================

async function initPersistence(): Promise<void> {
  if (persistence) {
    log('info', 'Persistence already initialized')
    return
  }

  log('info', 'Initializing persistence...')
  const startTime = Date.now()

  // Check if IndexedDB is available
  try {
    const testDBName = '__devs_idb_worker_test__'
    const request = indexedDB.open(testDBName)

    const available = await new Promise<boolean>((resolve) => {
      // Add timeout to prevent hanging on IndexedDB issues
      const timeoutId = setTimeout(() => {
        log('warn', 'IndexedDB availability check timed out')
        resolve(false)
      }, IDB_CHECK_TIMEOUT_MS)

      request.onerror = () => {
        clearTimeout(timeoutId)
        resolve(false)
      }
      request.onsuccess = () => {
        clearTimeout(timeoutId)
        request.result.close()
        indexedDB.deleteDatabase(testDBName)
        resolve(true)
      }
    })

    if (!available) {
      log('warn', 'IndexedDB not available, continuing without persistence')
      return
    }
  } catch {
    log('warn', 'IndexedDB check failed, continuing without persistence')
    return
  }

  const doc = getYDoc()

  try {
    persistence = new IndexeddbPersistence(YJS_DB_NAME, doc)
  } catch (err) {
    log('warn', 'Failed to create IndexeddbPersistence', { error: String(err) })
    return
  }

  await new Promise<void>((resolve) => {
    let resolved = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      resolved = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }

    persistence!.once('synced', () => {
      if (resolved) return
      cleanup()
      persistenceReady = true
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      log('info', `Persistence synced (${elapsed}s)`)
      resolve()
    })

    persistence!.on('error', (err: Error) => {
      if (resolved) return
      cleanup()
      log('warn', 'Persistence error', { error: err.message })
      resolve()
    })

    timeoutId = setTimeout(() => {
      if (resolved) return
      cleanup()
      persistenceReady = true
      log('warn', 'Persistence sync timed out, continuing with partial data')
      resolve()
    }, PERSISTENCE_TIMEOUT_MS)
  })
}

// ============================================================================
// WebSocket Sync
// ============================================================================

function enableSync(
  roomId: string,
  serverUrl?: string,
  _password?: string,
): void {
  if (wsProvider) {
    disableSync()
  }

  const doc = getYDoc()
  const url = serverUrl || DEFAULT_SERVER_URL

  log('info', `Enabling sync for room: ${roomId}`, { serverUrl: url })

  wsProvider = new WebsocketProvider(url, roomId, doc)

  // Connection status
  wsProvider.on('status', (event: { status: string }) => {
    log('info', `Connection status: ${event.status}`)
    notifyStatus()
  })

  wsProvider.on('sync', (isSynced: boolean) => {
    log('info', `Synced: ${isSynced}`)
    notifyStatus()

    if (isSynced) {
      // Notify main thread about initial sync
      sendMessage({
        type: 'SYNC_INITIALIZED',
        payload: { success: true },
      })
    }
  })

  // Track awareness changes
  wsProvider.awareness.on('change', () => {
    notifyStatus()
  })

  // Track document updates for activity visualization
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    const isRemote = origin === wsProvider

    sendMessage({
      type: 'SYNC_ACTIVITY',
      payload: {
        type: isRemote ? 'received' : 'sent',
        bytes: update.length,
        timestamp: new Date().toISOString(),
      },
    })
  })
}

function disableSync(): void {
  if (wsProvider) {
    log('info', 'Disabling sync')
    wsProvider.destroy()
    wsProvider = null
    notifyStatus()
  }
}

function notifyStatus(): void {
  const localClientId = wsProvider?.awareness.clientID ?? null
  const peers: Array<{ clientId: number; isLocal: boolean }> = []

  if (wsProvider) {
    wsProvider.awareness.getStates().forEach((_, clientId) => {
      peers.push({
        clientId,
        isLocal: clientId === localClientId,
      })
    })
  }

  sendMessage({
    type: 'SYNC_STATUS',
    payload: {
      status: !wsProvider
        ? 'disabled'
        : wsProvider.wsconnected
          ? 'connected'
          : 'connecting',
      peerCount: Math.max(0, peers.length - 1),
      peers,
      localClientId,
    },
  })
}

// ============================================================================
// Store Operations
// ============================================================================

function setupStoreObservers(): void {
  log('info', 'Setting up store observers')

  for (const storeName of SYNCED_STORES) {
    const map = getMap(storeName)

    map.observe((event) => {
      if (isApplyingRemoteChange) return
      if (event.transaction.local) return

      log('debug', `Remote ${storeName} change detected`)

      const added: SerializedItem[] = []
      const updated: SerializedItem[] = []
      const deleted: string[] = []

      for (const [key, change] of event.changes.keys) {
        if (change.action === 'add') {
          const value = map.get(key)
          if (value) {
            const item = deserializeFromYjs<Record<string, unknown>>(value)
            added.push({ ...item, id: key })
          }
        } else if (change.action === 'update') {
          const value = map.get(key)
          if (value) {
            const item = deserializeFromYjs<Record<string, unknown>>(value)
            updated.push({ ...item, id: key })
          }
        } else if (change.action === 'delete') {
          deleted.push(key)
        }
      }

      if (added.length > 0 || updated.length > 0 || deleted.length > 0) {
        sendMessage({
          type: 'REMOTE_CHANGE',
          payload: {
            storeName,
            changes: { added, updated, deleted },
          },
        })
      }
    })
  }

  // Setup preferences observer
  const prefsMap = getPreferencesMap()
  prefsMap.observe((event) => {
    if (isApplyingRemoteChange) return
    if (event.transaction.local) return

    for (const [key] of event.changes.keys) {
      if (SYNCED_PREFERENCE_KEYS.includes(key as SyncedPreferenceKey)) {
        const entry = prefsMap.get(key)
        const { value, updatedAt } = extractPreferenceValue(entry)

        sendMessage({
          type: 'PREFERENCE_CHANGE',
          payload: {
            key,
            value,
            timestamp: updatedAt?.toISOString() ?? new Date().toISOString(),
          },
        })
      }
    }
  })

  log('info', 'Store observers set up')
}

function syncItem(storeName: SyncedStoreName, item: SerializedItem): void {
  if (!persistenceReady) {
    log(
      'debug',
      `Skipping sync for ${storeName}/${item.id} - persistence not ready`,
    )
    return
  }

  const map = getMap(storeName)
  map.set(item.id, serializeForYjs(item))
  log('debug', `Synced ${storeName}/${item.id}`)
}

function deleteItem(storeName: SyncedStoreName, id: string): void {
  if (!persistenceReady) return

  const map = getMap(storeName)
  map.delete(id)
  log('debug', `Deleted ${storeName}/${id}`)
}

function loadStoreData(
  storeName: SyncedStoreName,
  items: SerializedItem[],
): void {
  const map = getMap(storeName)
  const doc = getYDoc()

  log('info', `Loading ${items.length} ${storeName} items to Yjs`)

  isApplyingRemoteChange = true
  try {
    doc.transact(() => {
      for (const item of items) {
        if (map.size === 0 || !map.has(item.id)) {
          // Only add if Yjs doesn't have it
          map.set(item.id, serializeForYjs(item))
        } else {
          // Both exist - use timestamp-based merge
          const existingValue = map.get(item.id)
          const existingItem = deserializeFromYjs(existingValue)
          if (shouldReplaceItem(existingItem, item)) {
            map.set(item.id, serializeForYjs(item))
          }
        }
      }
    })
  } finally {
    isApplyingRemoteChange = false
  }

  log('info', `Loaded ${storeName}, map now has ${map.size} items`)
}

function forceLoadData(
  stores: Array<{ storeName: SyncedStoreName; items: SerializedItem[] }>,
): void {
  log('info', 'Force loading all data to Yjs')

  for (const { storeName, items } of stores) {
    loadStoreData(storeName, items)
  }

  log('info', 'Force load complete')
}

function getStoreData(storeName: SyncedStoreName): SerializedItem[] {
  const map = getMap(storeName)
  const items: SerializedItem[] = []

  for (const [id, value] of map.entries()) {
    const item = deserializeFromYjs<Record<string, unknown>>(value)
    items.push({ ...item, id })
  }

  return items
}

// ============================================================================
// Preferences Operations
// ============================================================================

function clearPreferences(): void {
  const prefsMap = getPreferencesMap()
  const doc = getYDoc()

  log('info', 'Clearing preferences')

  doc.transact(() => {
    for (const key of Array.from(prefsMap.keys())) {
      prefsMap.delete(key)
    }
  })
}

function setPreference(key: string, value: unknown, timestamp: string): void {
  const prefsMap = getPreferencesMap()

  const timestampedValue: TimestampedPreference = {
    value,
    updatedAt: timestamp,
  }

  prefsMap.set(key, timestampedValue)
  log('debug', `Set preference ${key}`)
}

function getPreferences(): Record<
  string,
  { value: unknown; timestamp: string }
> {
  const prefsMap = getPreferencesMap()
  const prefs: Record<string, { value: unknown; timestamp: string }> = {}

  for (const key of SYNCED_PREFERENCE_KEYS) {
    const entry = prefsMap.get(key)
    if (entry !== undefined) {
      const { value, updatedAt } = extractPreferenceValue(entry)
      prefs[key] = {
        value,
        timestamp: updatedAt?.toISOString() ?? '',
      }
    }
  }

  return prefs
}

// ============================================================================
// Message Handler
// ============================================================================

async function handleMessage(msg: SyncWorkerMessage): Promise<void> {
  switch (msg.type) {
    case 'SYNC_INIT': {
      log('info', 'Initializing sync worker...', msg.payload)

      await initPersistence()
      setupStoreObservers()

      if (msg.payload.roomId) {
        enableSync(
          msg.payload.roomId,
          msg.payload.serverUrl,
          msg.payload.password,
        )
      }

      sendMessage({
        type: 'SYNC_INITIALIZED',
        requestId: msg.requestId,
        payload: { success: true },
      })
      break
    }

    case 'SYNC_ENABLE': {
      enableSync(
        msg.payload.roomId,
        msg.payload.serverUrl,
        msg.payload.password,
      )
      break
    }

    case 'SYNC_DISABLE': {
      disableSync()
      break
    }

    case 'SYNC_ITEM': {
      syncItem(msg.payload.storeName, msg.payload.item)
      break
    }

    case 'DELETE_ITEM': {
      deleteItem(msg.payload.storeName, msg.payload.id)
      break
    }

    case 'LOAD_DATA': {
      loadStoreData(msg.payload.storeName, msg.payload.items)
      break
    }

    case 'FORCE_LOAD_DATA': {
      forceLoadData(msg.payload.stores)
      break
    }

    case 'CLEAR_PREFERENCES': {
      clearPreferences()
      break
    }

    case 'SET_PREFERENCE': {
      setPreference(msg.payload.key, msg.payload.value, msg.payload.timestamp)
      break
    }

    case 'GET_PREFERENCES': {
      const prefs = getPreferences()
      sendMessage({
        type: 'RESPONSE',
        requestId: msg.requestId,
        payload: prefs,
      })
      break
    }

    case 'GET_STORE_DATA': {
      const data = getStoreData(msg.payload.storeName)
      sendMessage({
        type: 'RESPONSE',
        requestId: msg.requestId,
        payload: data,
      })
      break
    }

    case 'GET_STATUS': {
      notifyStatus()
      sendMessage({
        type: 'RESPONSE',
        requestId: msg.requestId,
        payload: {
          persistenceReady,
          connected: wsProvider?.wsconnected ?? false,
        },
      })
      break
    }
  }
}

// ============================================================================
// Worker Entry Point
// ============================================================================

self.onmessage = async (event: MessageEvent<SyncWorkerMessage>) => {
  try {
    await handleMessage(event.data)
  } catch (error) {
    log('error', 'Error handling message', {
      type: event.data.type,
      error: String(error),
    })

    sendMessage({
      type: 'SYNC_ERROR',
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

// Notify main thread that worker is ready
sendMessage({ type: 'SYNC_READY' })
log('info', 'Sync worker started')
