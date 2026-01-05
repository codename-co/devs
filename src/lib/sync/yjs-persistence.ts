/**
 * Yjs IndexedDB Persistence
 *
 * Persists Yjs document to IndexedDB for offline-first support.
 * Data is automatically loaded on init and saved on changes.
 */
import { IndexeddbPersistence } from 'y-indexeddb'

import { getYDoc } from './yjs-doc'

const DB_NAME = 'devs-yjs-sync'

let persistence: IndexeddbPersistence | null = null
let initPromise: Promise<void> | null = null

/**
 * Initialize Yjs persistence to IndexedDB
 * Returns a promise that resolves when initial data is loaded
 */
export async function initPersistence(): Promise<void> {
  if (persistence) {
    return initPromise!
  }

  const ydoc = getYDoc()
  persistence = new IndexeddbPersistence(DB_NAME, ydoc)

  initPromise = new Promise((resolve, reject) => {
    persistence!.once('synced', () => {
      console.log('[Yjs] Persistence synced from IndexedDB')
      resolve()
    })

    // Handle errors
    persistence!.on('error', (err: Error) => {
      console.error('[Yjs] Persistence error:', err)
      reject(err)
    })
  })

  return initPromise
}

/**
 * Check if persistence is initialized and synced
 */
export function isPersistenceReady(): boolean {
  return persistence?.synced ?? false
}

/**
 * Get the persistence instance
 */
export function getPersistence(): IndexeddbPersistence | null {
  return persistence
}

/**
 * Destroy persistence (for cleanup/testing)
 */
export async function destroyPersistence(): Promise<void> {
  if (persistence) {
    await persistence.destroy()
    persistence = null
    initPromise = null
  }
}

/**
 * Clear all persisted data
 */
export async function clearPersistedData(): Promise<void> {
  await destroyPersistence()
  // Delete the IndexedDB database
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
