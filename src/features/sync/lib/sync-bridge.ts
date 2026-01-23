/**
 * Sync Bridge
 *
 * Bridges existing IndexedDB storage with Yjs for P2P sync.
 * Mirrors data changes between the two stores.
 *
 * Strategy for MVP:
 * 1. On init: Load existing IndexedDB data into Yjs
 * 2. On local change: Update Yjs (which propagates to peers)
 * 3. On remote change (Yjs): Update IndexedDB and notify stores
 */
import * as Y from 'yjs'

import { db } from '@/lib/db'

import {
  getAgentsMap,
  getBattlesMap,
  getConversationsMap,
  getKnowledgeMap,
  getMemoriesMap,
  getPreferencesMap,
  getSpansMap,
  getStudioEntriesMap,
  getTasksMap,
  getTracesMap,
  getYDoc,
} from './yjs-doc'
import { initPersistence, isPersistenceReady } from './yjs-persistence'
import { userSettings, type UserSettings } from '@/stores/userStore'
import type { Lang } from '@/i18n/utils'

// Stores that are synced via Yjs
// Using string type to allow flexibility with DB store names
type SyncedStoreName =
  | 'agents'
  | 'battles'
  | 'conversations'
  | 'knowledgeItems'
  | 'agentMemories'
  | 'tasks'
  | 'pinnedMessages'
  | 'credentials'
  | 'preferences'
  | 'studioEntries'
  | 'traces'
  | 'spans'

// Map store names to Yjs map getters
// Uses type assertion because this function handles generic operations

function getYjsMapForStore(storeName: SyncedStoreName): Y.Map<any> {
  const ydoc = getYDoc()
  switch (storeName) {
    case 'agents':
      return getAgentsMap()
    case 'battles':
      return getBattlesMap()
    case 'conversations':
      return getConversationsMap()
    case 'knowledgeItems':
      return getKnowledgeMap()
    case 'agentMemories':
      return getMemoriesMap()
    case 'tasks':
      return getTasksMap()
    case 'pinnedMessages':
      return ydoc.getMap('pinnedMessages')
    case 'credentials':
      return ydoc.getMap('credentials')
    case 'preferences':
      return getPreferencesMap()
    case 'studioEntries':
      return getStudioEntriesMap()
    case 'traces':
      return getTracesMap()
    case 'spans':
      return getSpansMap()
  }
}

// All synced stores (IndexedDB-based)
const SYNCED_STORES: SyncedStoreName[] = [
  'agents',
  'battles',
  'conversations',
  'knowledgeItems',
  'agentMemories',
  'tasks',
  'pinnedMessages',
  'credentials',
  'studioEntries',
  'traces',
  'spans',
]

// Keys from userSettings that should be synced via P2P
const SYNCED_PREFERENCE_KEYS: (keyof UserSettings)[] = [
  'platformName',
  'language',
  'hideDefaultAgents',
]

// Track if we're applying remote changes to prevent loops
let isApplyingRemoteChange = false

// Callbacks for notifying stores of remote changes
const changeCallbacks: Map<SyncedStoreName, Set<() => void>> = new Map()

// ============================================================================
// Timestamp-based Merge Utilities
// ============================================================================

/**
 * Extract the most recent timestamp from an item for conflict resolution.
 * Checks updatedAt first, then falls back to createdAt, timestamp, or learnedAt.
 */
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

/**
 * Convert various date formats to Date object
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  // Handle serialized date objects from Yjs
  if (
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).__type === 'Date'
  ) {
    return new Date((value as { value: string }).value)
  }
  return null
}

/**
 * Compare two items and determine which should win based on timestamps.
 * Returns true if newItem should replace existingItem.
 */
function shouldReplaceItem(existingItem: unknown, newItem: unknown): boolean {
  const existingTimestamp = getItemTimestamp(existingItem)
  const newTimestamp = getItemTimestamp(newItem)

  // If we can't determine timestamps, prefer the new item (backward compatibility)
  if (!existingTimestamp || !newTimestamp) {
    return true
  }

  // New item wins if it's newer or equal (for consistency across peers)
  return newTimestamp.getTime() >= existingTimestamp.getTime()
}

// Queue for pending sync operations when persistence isn't ready
interface PendingSyncOp {
  type: 'set' | 'delete'
  storeName: SyncedStoreName
  id: string
  item?: unknown
}
const pendingSyncOps: PendingSyncOp[] = []
let pendingOpsProcessed = false

/**
 * Process pending sync operations once persistence is ready
 */
function processPendingOps(): void {
  if (pendingOpsProcessed || !isPersistenceReady()) return
  pendingOpsProcessed = true

  if (pendingSyncOps.length > 0) {
    console.debug(
      `[SyncBridge] Processing ${pendingSyncOps.length} pending sync operations`,
    )
    const ydoc = getYDoc()
    ydoc.transact(() => {
      for (const op of pendingSyncOps) {
        const yjsMap = getYjsMapForStore(op.storeName)
        if (op.type === 'set' && op.item) {
          yjsMap.set(op.id, serializeForYjs(op.item))
        } else if (op.type === 'delete') {
          yjsMap.delete(op.id)
        }
      }
    })
    pendingSyncOps.length = 0
    console.debug('[SyncBridge] Pending sync operations processed')
  }
}

/**
 * Initialize the sync bridge
 * Loads existing data into Yjs and sets up observers
 */
export async function initSyncBridge(): Promise<void> {
  // Initialize Yjs persistence first
  await initPersistence()

  // Process any pending sync operations that were queued before init
  processPendingOps()

  // Ensure main DB is ready
  if (!db.isInitialized()) {
    await db.init()
  }

  // Load existing data into Yjs (only if Yjs is empty - first time setup)
  await loadExistingDataToYjs()

  // Load user preferences to Yjs
  loadPreferencesToYjs()

  // Set up Yjs observers for remote changes
  setupYjsObservers()

  // Set up observer for remote preference changes
  setupPreferencesObserver()

  // Subscribe to local preference changes
  subscribeToPreferenceChanges()

  console.log('[SyncBridge] Initialized')
}

/**
 * Force load all IndexedDB data into Yjs
 * Call this when sync is enabled to ensure data is pushed to peers
 */
export async function forceLoadDataToYjs(): Promise<void> {
  console.debug('[SyncBridge] Force loading data to Yjs...')

  const ydoc = getYDoc()

  for (const storeName of SYNCED_STORES) {
    try {
      // Check if store exists in DB
      if (!db.hasStore(storeName)) {
        console.debug(
          `[SyncBridge] Store ${storeName} does not exist in DB, skipping`,
        )
        continue
      }

      const items = await db.getAll(
        storeName as keyof typeof db extends 'getAll' ? never : never,
      )

      console.debug(
        `[SyncBridge] Loading ${items.length} ${storeName} items to Yjs`,
      )

      if (items.length === 0) {
        console.debug(`[SyncBridge] No items in ${storeName} to load`)
        continue
      }

      const yjsMap = getYjsMapForStore(storeName)

      ydoc.transact(() => {
        for (const item of items) {
          if (item && typeof item === 'object' && 'id' in item) {
            yjsMap.set((item as { id: string }).id, serializeForYjs(item))
          }
        }
      })

      console.debug(
        `[SyncBridge] ${storeName} map now has ${yjsMap.size} items`,
      )
    } catch (error) {
      console.warn(`[SyncBridge] Error loading ${storeName}:`, error)
    }
  }

  // Also force load user preferences
  forceLoadPreferencesToYjs()

  console.debug('[SyncBridge] Force load complete')
}

/**
 * Force load user preferences from localStorage to Yjs
 * Called when sync is explicitly enabled to push local preferences to peers
 */
function forceLoadPreferencesToYjs(): void {
  console.debug('[SyncBridge] Force loading preferences to Yjs...')
  const prefsMap = getPreferencesMap()
  const currentSettings = userSettings.getState()
  const ydoc = getYDoc()

  ydoc.transact(() => {
    for (const key of SYNCED_PREFERENCE_KEYS) {
      const value = currentSettings[key]
      if (value !== undefined) {
        prefsMap.set(key, value)
      }
    }
  })

  console.debug(`[SyncBridge] Loaded ${prefsMap.size} preferences to Yjs`)
}

/**
 * Load existing IndexedDB data into Yjs with bidirectional merge
 * Always performs a proper merge to handle the case where both local
 * and remote have data (e.g., when connecting 4+ devices)
 */
async function loadExistingDataToYjs(): Promise<void> {
  const ydoc = getYDoc()

  for (const storeName of SYNCED_STORES) {
    try {
      // Check if store exists in DB
      if (!db.hasStore(storeName)) {
        continue
      }

      const yjsMap = getYjsMapForStore(storeName)
      const localItems = await db.getAll(storeName as any)

      if (yjsMap.size === 0 && localItems.length === 0) {
        // Both empty, nothing to do
        continue
      }

      if (yjsMap.size === 0) {
        // Yjs is empty, load from IndexedDB
        console.debug(
          `[SyncBridge] Loading ${localItems.length} ${storeName} to Yjs`,
        )
        ydoc.transact(() => {
          for (const item of localItems) {
            if (item && typeof item === 'object' && 'id' in item) {
              yjsMap.set((item as { id: string }).id, serializeForYjs(item))
            }
          }
        })
      } else if (localItems.length === 0) {
        // Local is empty, sync from Yjs
        console.debug(
          `[SyncBridge] Yjs has ${yjsMap.size} ${storeName}, syncing to empty IndexedDB`,
        )
        await syncYjsToIndexedDB(storeName)
      } else {
        // Both have data: perform bidirectional merge
        console.debug(
          `[SyncBridge] Merging ${storeName}: ${localItems.length} local, ${yjsMap.size} remote`,
        )
        await syncYjsToIndexedDB(storeName)
      }
    } catch (error) {
      console.warn(`[SyncBridge] Error syncing ${storeName}:`, error)
    }
  }
}

/**
 * Sync Yjs data back to IndexedDB with bidirectional merge
 * - Remote items newer than local: update local
 * - Local items newer than remote: push to Yjs
 * - Local-only items: push to Yjs
 */
async function syncYjsToIndexedDB(storeName: SyncedStoreName): Promise<void> {
  const yjsMap = getYjsMapForStore(storeName)
  const ydoc = getYDoc()

  // Track which local IDs we've processed
  const processedIds = new Set<string>()

  isApplyingRemoteChange = true
  try {
    // First pass: sync remote items to local
    for (const [id, value] of yjsMap.entries()) {
      processedIds.add(id)
      const remoteItem = deserializeFromYjs(value)
      try {
        const localItem = await db.get(storeName as any, id)
        if (!localItem) {
          // Remote-only item: add to local
          await db.add(storeName as any, remoteItem)
        } else {
          // Both exist: use timestamp-based merge
          if (shouldReplaceItem(localItem, remoteItem)) {
            await db.update(storeName as any, remoteItem)
          } else {
            // Local is newer: push to Yjs (will be handled in second pass)
          }
        }
      } catch (error) {
        console.warn(
          `[SyncBridge] Error syncing item ${id} to ${storeName}:`,
          error,
        )
      }
    }

    // Second pass: find local items that aren't in Yjs and push them
    if (db.hasStore(storeName)) {
      const localItems = await db.getAll(storeName as any)
      const itemsToAdd: Array<{ id: string; item: unknown }> = []

      for (const localItem of localItems) {
        if (localItem && typeof localItem === 'object' && 'id' in localItem) {
          const id = (localItem as { id: string }).id
          if (!processedIds.has(id)) {
            // Local-only item: queue for Yjs
            itemsToAdd.push({ id, item: localItem })
          } else {
            // Both exist: check if local is newer and should override remote
            const remoteValue = yjsMap.get(id)
            if (remoteValue) {
              const remoteItem = deserializeFromYjs(remoteValue)
              if (!shouldReplaceItem(localItem, remoteItem)) {
                // Local is newer: queue for Yjs update
                itemsToAdd.push({ id, item: localItem })
              }
            }
          }
        }
      }

      // Push local-only and newer local items to Yjs
      if (itemsToAdd.length > 0) {
        console.debug(
          `[SyncBridge] Pushing ${itemsToAdd.length} local ${storeName} items to Yjs`,
        )
        ydoc.transact(() => {
          for (const { id, item } of itemsToAdd) {
            yjsMap.set(id, serializeForYjs(item))
          }
        })
      }
    }
  } finally {
    isApplyingRemoteChange = false
  }

  // Notify listeners
  notifyStoreChange(storeName)
}

/**
 * Set up Yjs observers to detect remote changes
 */
function setupYjsObservers(): void {
  console.debug('[SyncBridge] Setting up Yjs observers')

  for (const storeName of SYNCED_STORES) {
    const yjsMap = getYjsMapForStore(storeName)

    yjsMap.observe((event) => {
      if (isApplyingRemoteChange) {
        return
      }
      if (!event.transaction.local) {
        console.debug(`[SyncBridge] Remote ${storeName} change detected`)
        handleRemoteChange(storeName, event)
      }
    })
  }

  console.debug('[SyncBridge] Observers set up complete')
}

/**
 * Handle remote changes from Yjs peers with timestamp-based conflict resolution
 */
async function handleRemoteChange(
  storeName: SyncedStoreName,
  event: Y.YMapEvent<unknown>,
): Promise<void> {
  isApplyingRemoteChange = true

  try {
    const yjsMap = getYjsMapForStore(storeName)
    const ydoc = getYDoc()

    // Track items where local version is newer (need to push back to Yjs)
    const localWinsItems: Array<{ id: string; item: unknown }> = []

    // Process changes
    for (const [key, change] of event.changes.keys) {
      try {
        if (change.action === 'add' || change.action === 'update') {
          const value = yjsMap.get(key)
          if (value) {
            const remoteItem = deserializeFromYjs(value)
            const localItem = await db.get(storeName as any, key)

            if (!localItem) {
              // Remote-only: add to local
              await db.add(storeName as any, remoteItem)
            } else {
              // Both exist: use timestamp-based merge
              if (shouldReplaceItem(localItem, remoteItem)) {
                // Remote is newer: update local
                await db.update(storeName as any, remoteItem)
              } else {
                // Local is newer: queue to push back to Yjs
                console.debug(
                  `[SyncBridge] Local ${storeName}/${key} is newer than remote, will restore`,
                )
                localWinsItems.push({ id: key, item: localItem })
              }
            }
          }
        } else if (change.action === 'delete') {
          // For deletes, check if local item exists and is newer
          const localItem = await db.get(storeName as any, key)
          if (localItem) {
            const localTimestamp = getItemTimestamp(localItem)
            // If local item was updated after the delete event, preserve it
            // We use the current time as proxy for when the delete happened
            // This is imperfect but prevents recent items from being deleted
            if (localTimestamp) {
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
              if (localTimestamp > fiveMinutesAgo) {
                console.debug(
                  `[SyncBridge] Preserving recently updated local ${storeName}/${key} despite remote delete`,
                )
                localWinsItems.push({ id: key, item: localItem })
                continue
              }
            }
          }
          await db.delete(storeName as any, key)
        }
      } catch (error) {
        console.warn(
          `[SyncBridge] Error handling remote change for ${key} in ${storeName}:`,
          error,
        )
      }
    }

    // Push local-wins items back to Yjs
    if (localWinsItems.length > 0) {
      console.debug(
        `[SyncBridge] Restoring ${localWinsItems.length} newer local ${storeName} items to Yjs`,
      )
      // Use setTimeout to avoid nested transactions
      setTimeout(() => {
        ydoc.transact(() => {
          for (const { id, item } of localWinsItems) {
            yjsMap.set(id, serializeForYjs(item))
          }
        })
      }, 0)
    }

    // Notify store listeners to refresh their state
    notifyStoreChange(storeName)
  } finally {
    isApplyingRemoteChange = false
  }
}

/**
 * Called by stores when local data changes
 * Mirrors the change to Yjs for sync
 */
export function syncToYjs<T extends { id: string }>(
  storeName: SyncedStoreName,
  item: T,
): void {
  if (isApplyingRemoteChange) {
    console.debug(
      `[SyncBridge] Skipping sync for ${storeName}/${item.id} (applying remote change)`,
    )
    return
  }
  if (!isPersistenceReady()) {
    // Queue the operation for when persistence is ready
    pendingSyncOps.push({ type: 'set', storeName, id: item.id, item })
    console.debug(
      `[SyncBridge] Queued sync for ${storeName}/${item.id} (persistence not ready)`,
    )
    return
  }

  const yjsMap = getYjsMapForStore(storeName)
  console.debug(
    `[SyncBridge] Syncing ${storeName}/${item.id} to Yjs (map size before: ${yjsMap.size})`,
  )
  yjsMap.set(item.id, serializeForYjs(item))
  console.debug(
    `[SyncBridge] Synced ${storeName}/${item.id} to Yjs (map size after: ${yjsMap.size})`,
  )
}

/**
 * Called by stores when item is deleted
 */
export function deleteFromYjs(storeName: SyncedStoreName, id: string): void {
  if (isApplyingRemoteChange) return
  if (!isPersistenceReady()) {
    // Queue the operation for when persistence is ready
    pendingSyncOps.push({ type: 'delete', storeName, id })
    console.debug(
      `[SyncBridge] Queued delete for ${storeName}/${id} (persistence not ready)`,
    )
    return
  }

  const yjsMap = getYjsMapForStore(storeName)
  yjsMap.delete(id)
}

/**
 * Subscribe to remote changes for a store
 */
export function onRemoteChange(
  storeName: SyncedStoreName,
  callback: () => void,
): () => void {
  if (!changeCallbacks.has(storeName)) {
    changeCallbacks.set(storeName, new Set())
  }
  changeCallbacks.get(storeName)!.add(callback)

  return () => {
    changeCallbacks.get(storeName)?.delete(callback)
  }
}

function notifyStoreChange(storeName: SyncedStoreName): void {
  const callbacks = changeCallbacks.get(storeName)
  if (callbacks) {
    callbacks.forEach((cb) => cb())
  }
}

/**
 * Serialize data for Yjs storage
 * Converts Dates to ISO strings
 */
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

/**
 * Deserialize data from Yjs storage
 * Converts ISO strings back to Dates
 */
function deserializeFromYjs<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data), (_, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value)
    }
    return value
  }) as T
}

// ============================================================================
// User Preferences Sync (localStorage-based)
// ============================================================================

// Track if we're applying remote preference changes to prevent loops
let isApplyingRemotePreference = false

// Store the unsubscribe function for zustand subscription
let preferencesUnsubscribe: (() => void) | null = null

/**
 * Load user preferences from localStorage to Yjs
 */
function loadPreferencesToYjs(): void {
  const prefsMap = getPreferencesMap()
  const currentSettings = userSettings.getState()

  // Only load local preferences to Yjs if the Yjs map is empty
  // (meaning this is the first sync or no peer has shared preferences yet)
  if (prefsMap.size === 0) {
    console.debug('[SyncBridge] Loading local preferences to Yjs')
    const ydoc = getYDoc()
    ydoc.transact(() => {
      for (const key of SYNCED_PREFERENCE_KEYS) {
        const value = currentSettings[key]
        if (value !== undefined) {
          prefsMap.set(key, value)
        }
      }
    })
    console.debug(`[SyncBridge] Loaded ${prefsMap.size} preferences to Yjs`)
  } else {
    // Yjs has preferences from peers, apply them locally
    console.debug('[SyncBridge] Applying remote preferences from Yjs')
    applyRemotePreferences()
  }
}

/**
 * Apply remote preferences from Yjs to local userSettings store
 */
function applyRemotePreferences(): void {
  const prefsMap = getPreferencesMap()
  isApplyingRemotePreference = true

  try {
    for (const key of SYNCED_PREFERENCE_KEYS) {
      const remoteValue = prefsMap.get(key)
      if (remoteValue !== undefined) {
        const currentSettings = userSettings.getState()
        const currentValue = currentSettings[key]

        // Only update if different
        if (JSON.stringify(remoteValue) !== JSON.stringify(currentValue)) {
          console.debug(
            `[SyncBridge] Applying remote preference: ${key} = ${remoteValue}`,
          )
          switch (key) {
            case 'platformName':
              userSettings.getState().setPlatformName(remoteValue as string)
              break
            case 'language':
              userSettings.getState().setLanguage(remoteValue as Lang)
              break
            case 'hideDefaultAgents':
              userSettings
                .getState()
                .setHideDefaultAgents(remoteValue as boolean)
              break
          }
        }
      }
    }
  } finally {
    isApplyingRemotePreference = false
  }
}

/**
 * Set up Yjs observer for remote preference changes
 */
function setupPreferencesObserver(): void {
  const prefsMap = getPreferencesMap()

  prefsMap.observe((event) => {
    if (isApplyingRemotePreference) return
    if (!event.transaction.local) {
      console.debug('[SyncBridge] Remote preferences change detected')
      applyRemotePreferences()
    }
  })

  console.debug('[SyncBridge] Preferences observer set up')
}

/**
 * Subscribe to local preference changes and sync to Yjs
 */
function subscribeToPreferenceChanges(): void {
  // Unsubscribe from previous subscription if any
  if (preferencesUnsubscribe) {
    preferencesUnsubscribe()
  }

  // Subscribe to userSettings changes
  preferencesUnsubscribe = userSettings.subscribe((state, prevState) => {
    if (isApplyingRemotePreference) return
    if (!isPersistenceReady()) return

    const prefsMap = getPreferencesMap()

    // Check each synced preference key for changes
    for (const key of SYNCED_PREFERENCE_KEYS) {
      const currentValue = state[key]
      const prevValue = prevState[key]

      if (JSON.stringify(currentValue) !== JSON.stringify(prevValue)) {
        console.debug(
          `[SyncBridge] Local preference changed: ${key} = ${currentValue}`,
        )
        if (currentValue !== undefined) {
          prefsMap.set(key, currentValue)
        } else {
          prefsMap.delete(key)
        }
      }
    }
  })

  console.debug('[SyncBridge] Subscribed to local preference changes')
}
