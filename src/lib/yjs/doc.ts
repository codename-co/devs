/**
 * @module yjs/doc
 *
 * Yjs Document Singleton
 *
 * Creates and manages the **single `Y.Doc` instance** that serves as the
 * source of truth for all application state.  Every typed map exported by
 * `maps.ts` is derived from this document.
 *
 * ## Persistence
 *
 * Local persistence is provided by `y-indexeddb` under the database name
 * `"devs"`.  The provider is **lazily** initialized so that unit-test
 * environments (which lack a real `indexedDB`) can import this module
 * without side-effects.
 *
 * ## Readiness
 *
 * Consumers that need data on startup should `await whenReady` before
 * their first read.  In production this waits for `y-indexeddb` to replay
 * its stored updates; in tests it resolves immediately.
 *
 * @example
 * ```ts
 * import { ydoc, whenReady, transact } from '@/lib/yjs'
 *
 * await whenReady
 * transact(() => {
 *   ydoc.getMap('agents').set('a1', { id: 'a1', name: 'Coder' })
 * })
 * ```
 */
import * as Y from 'yjs'
import type { IndexeddbPersistence } from 'y-indexeddb'

/**
 * The singleton Yjs document shared across the entire application.
 *
 * All typed maps (agents, conversations, …) are obtained from this
 * document via `ydoc.getMap<T>(name)`.  There is exactly **one**
 * instance per browser tab.
 */
export const ydoc = new Y.Doc()

/** IndexedDB persistence provider — `null` until {@link initPersistence} runs. */
let persistence: IndexeddbPersistence | null = null

/** De-duplicates concurrent calls to {@link initPersistence}. */
let initPromise: Promise<void> | null = null

/**
 * Lazily initialize the `y-indexeddb` persistence provider.
 *
 * The dynamic `import()` ensures that `y-indexeddb` is never loaded in
 * test environments where `indexedDB` is unavailable.  Subsequent calls
 * are no-ops — the same promise is returned.
 *
 * @returns A promise that resolves once the provider has replayed all
 *          stored updates (i.e. "synced").
 */
async function initPersistence(): Promise<void> {
  if (persistence !== null) return
  if (initPromise !== null) return initPromise

  initPromise = (async () => {
    // Dynamic import keeps y-indexeddb out of the test bundle
    const { IndexeddbPersistence: IdbPersistence } = await import('y-indexeddb')
    const p: IndexeddbPersistence = new IdbPersistence('devs', ydoc)
    persistence = p

    // Wait for the provider to finish replaying stored updates
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

/**
 * A promise that resolves once the Yjs document has been hydrated from
 * IndexedDB.  Await this before performing any reads that depend on
 * persisted state.
 *
 * In test environments (no `indexedDB` global) the promise resolves
 * immediately so tests can run synchronously.
 *
 * @example
 * ```ts
 * import { whenReady, agents } from '@/lib/yjs'
 *
 * await whenReady
 * console.log('Agents loaded:', agents.size)
 * ```
 */
export const whenReady: Promise<void> = (async () => {
  if (typeof indexedDB !== 'undefined') {
    await initPersistence()
  }
  // In test environments without indexedDB, resolves immediately
})()

/**
 * Check whether the Yjs document has finished syncing with IndexedDB.
 *
 * Useful for synchronous guards where you cannot `await whenReady`.
 * In test environments without `indexedDB` this always returns `true`.
 *
 * @returns `true` if the document is fully hydrated and safe to read.
 */
export function isReady(): boolean {
  if (!persistence) return typeof indexedDB === 'undefined'
  return persistence.synced
}

/**
 * Execute a function inside a Yjs transaction.
 *
 * All mutations performed within `fn` are batched into a single update
 * event, which is more efficient and triggers only one re-render cycle
 * in subscribed React hooks.
 *
 * @typeParam T - The return type of `fn`.
 * @param fn - A synchronous function that performs Yjs mutations.
 * @returns The value returned by `fn`.
 *
 * @example
 * ```ts
 * import { transact, agents, tasks } from '@/lib/yjs'
 *
 * transact(() => {
 *   agents.set(agent.id, agent)
 *   tasks.set(task.id, task)
 * })
 * ```
 */
export function transact<T>(fn: () => T): T {
  return ydoc.transact(fn)
}

/**
 * Reset the Yjs document by clearing every application-level map.
 *
 * **⚠️ Testing only** — this wipes all in-memory state.  It does **not**
 * clear the IndexedDB persistence layer; the data will be restored on
 * the next page load unless the database is also deleted.
 */
export function resetYDoc(): void {
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

  for (const name of mapNames) {
    const map = ydoc.getMap(name)
    map.clear()
  }
}
