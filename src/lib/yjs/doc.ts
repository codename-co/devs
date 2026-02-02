/**
 * Yjs Document Singleton
 *
 * Creates and manages the single Y.Doc instance that serves as the
 * source of truth for all application state. Persistence is handled
 * via IndexedDB, and the document is ready once initial sync completes.
 *
 * Note: IndexedDB persistence is lazily initialized to support test
 * environments where indexedDB may not be available.
 */
import * as Y from 'yjs'
import type { IndexeddbPersistence } from 'y-indexeddb'

/** The singleton Yjs document */
export const ydoc = new Y.Doc()

/** IndexedDB persistence provider (lazily initialized) */
let persistence: IndexeddbPersistence | null = null
let initPromise: Promise<void> | null = null

/**
 * Initialize the IndexedDB persistence provider.
 * Called lazily to support test environments.
 * Returns a promise that resolves when synced.
 */
async function initPersistence(): Promise<void> {
  if (persistence !== null) return
  if (initPromise !== null) return initPromise

  initPromise = (async () => {
    // Dynamically import to avoid loading y-indexeddb in test environments
    const { IndexeddbPersistence: IdbPersistence } = await import('y-indexeddb')
    const p: IndexeddbPersistence = new IdbPersistence('devs', ydoc)
    persistence = p

    return new Promise<void>((resolve) => {
      if (p.synced) {
        resolve()
      } else {
        p.once('synced', () => resolve())
      }
    })
  })()

  return initPromise
}

/** Promise that resolves when IndexedDB sync is complete */
export const whenReady: Promise<void> = (async () => {
  // Initialize persistence when accessed (lazy initialization)
  if (typeof indexedDB !== 'undefined') {
    await initPersistence()
  }
  // In test environments without indexedDB, resolves immediately
})()

/** Check if the document has synced with IndexedDB */
export function isReady(): boolean {
  if (!persistence) return typeof indexedDB === 'undefined' // Ready if no indexedDB (test env)
  return persistence.synced
}

/**
 * Execute a function within a Yjs transaction for batched writes.
 * All changes within the transaction are applied atomically.
 */
export function transact<T>(fn: () => T): T {
  return ydoc.transact(fn)
}

/**
 * Reset the Yjs document by clearing all maps.
 * Intended for testing purposes only.
 */
export function resetYDoc(): void {
  // Get all map names used by the application
  const mapNames = [
    'agents',
    'conversations',
    'knowledge',
    'tasks',
    'artifacts',
    'memories',
    'preferences',
    'credentials',
    'studioEntries',
    'workflows',
    'battles',
  ]

  // Clear each map
  for (const name of mapNames) {
    const map = ydoc.getMap(name)
    map.clear()
  }
}
