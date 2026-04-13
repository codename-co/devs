/**
 * @module yjs/local-cache
 *
 * localStorage Cache for Yjs-Derived State
 *
 * Yjs data is persisted in IndexedDB via y-indexeddb, which requires an
 * async hydration step on page load. During this window, Zustand stores
 * that derive their state from Yjs maps start with empty defaults,
 * causing a visible "flash" in the UI.
 *
 * This module provides a lightweight localStorage cache that lets stores
 * seed their initial state synchronously from the last-known Yjs values.
 * Once `y-indexeddb` finishes hydrating, the Yjs observers overwrite the
 * cache with authoritative data.
 *
 * @example
 * ```ts
 * import { createYjsCache } from '@/lib/yjs/local-cache'
 *
 * const cache = createYjsCache<MyData[]>('devs-my-data')
 *
 * // Use as initial state in a Zustand store:
 * const useMyStore = create(() => ({
 *   items: cache.load() ?? [],
 * }))
 *
 * // Update cache whenever Yjs observer fires:
 * myYjsMap.observe(() => {
 *   const items = Array.from(myYjsMap.values())
 *   cache.save(items)
 *   useMyStore.setState({ items })
 * })
 * ```
 */

export interface YjsCache<T> {
  /** Load cached value from localStorage (synchronous). */
  load(): T | undefined
  /** Save value to localStorage (called from Yjs observers). */
  save(data: T): void
  /** Remove cached value. */
  clear(): void
}

/**
 * Create a localStorage cache for Yjs-derived state.
 *
 * @param key - A unique localStorage key (e.g. `'devs-installed-extensions'`).
 * @returns A cache object with `load`, `save`, and `clear` methods.
 */
export function createYjsCache<T>(key: string): YjsCache<T> {
  return {
    load(): T | undefined {
      try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : undefined
      } catch {
        return undefined
      }
    },
    save(data: T): void {
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch {
        // Quota exceeded — silently ignore
      }
    },
    clear(): void {
      localStorage.removeItem(key)
    },
  }
}
