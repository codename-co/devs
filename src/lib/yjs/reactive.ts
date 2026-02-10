/**
 * @module yjs/reactive
 *
 * React Hooks for Yjs Reactivity
 *
 * Bridges Yjs's event-driven model with React's rendering cycle using
 * `useSyncExternalStore` — the React 18+ primitive for subscribing to
 * external data sources without tearing.
 *
 * ## Available hooks
 *
 * | Hook              | Purpose                                          |
 * | ----------------- | ------------------------------------------------ |
 * | {@link useLiveMap}    | Subscribe to **all** values in a `Y.Map`.            |
 * | {@link useLiveValue}  | Subscribe to a **single** value in a `Y.Map` by key. |
 * | {@link useSyncReady}  | Returns `true` once IndexedDB hydration is done.     |
 *
 * ## Design notes
 *
 * - Each hook uses a **ref-based cache** (`cacheRef`) to preserve
 *   referential identity across renders when the underlying data has
 *   not actually changed.  This avoids unnecessary child re-renders.
 * - The `subscribe` callback wires up `Y.Map.observe` and returns an
 *   unsubscribe function, matching the contract of
 *   `useSyncExternalStore`.
 * - The same `getSnapshot` function is passed as both the client and
 *   server snapshot (SSR is not used, but React requires both).
 *
 * ## Usage
 *
 * Components should rarely import these hooks directly — prefer
 * domain-specific hooks from the stores (e.g. `useAgents()` from
 * `agentStore`).  These low-level hooks are exported for cases where
 * store-level wrappers don't exist yet.
 *
 * @example
 * ```tsx
 * import { useLiveMap, useLiveValue } from '@/lib/yjs'
 * import { agents } from '@/lib/yjs'
 *
 * function AgentList() {
 *   const allAgents = useLiveMap(agents)
 *   return <ul>{allAgents.map(a => <li key={a.id}>{a.name}</li>)}</ul>
 * }
 *
 * function AgentDetail({ id }: { id: string }) {
 *   const agent = useLiveValue(agents, id)
 *   if (!agent) return <p>Not found</p>
 *   return <h1>{agent.name}</h1>
 * }
 * ```
 */
import { useCallback, useRef, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'

import { isReady } from './doc'

/**
 * Subscribe to **all values** in a `Y.Map`.
 *
 * Returns a stable array reference that only changes when the map
 * contents actually differ (shallow element-wise comparison).  The
 * component re-renders whenever entries are added, updated, or removed.
 *
 * @typeParam T - The value type stored in the map.
 * @param map - A typed `Y.Map<T>` obtained from `maps.ts`.
 * @returns An array of all current values in insertion order.
 *
 * @example
 * ```tsx
 * const allTasks = useLiveMap(tasks)
 * ```
 */
export function useLiveMap<T>(map: Y.Map<T>): T[] {
  const cacheRef = useRef<T[]>([])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => onStoreChange()
      map.observe(handler)
      return () => map.unobserve(handler)
    },
    [map],
  )

  const getSnapshot = useCallback(() => {
    const values = Array.from(map.values())
    // Only update cache reference if values actually changed
    if (
      values.length !== cacheRef.current.length ||
      values.some((v, i) => v !== cacheRef.current[i])
    ) {
      cacheRef.current = values
    }
    return cacheRef.current
  }, [map])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Subscribe to a **single value** in a `Y.Map` by its key.
 *
 * Efficiently re-renders only when the value associated with the given
 * `id` changes.  If `id` is `undefined` the hook always returns
 * `undefined` (useful for optional selections).
 *
 * @typeParam T - The value type stored in the map.
 * @param map - A typed `Y.Map<T>` obtained from `maps.ts`.
 * @param id  - The map key to observe, or `undefined` to skip.
 * @returns The current value, or `undefined` if the key does not exist
 *          or `id` was not provided.
 *
 * @example
 * ```tsx
 * const agent = useLiveValue(agents, agentId)
 * ```
 */
export function useLiveValue<T>(
  map: Y.Map<T>,
  id: string | undefined,
): T | undefined {
  const cacheRef = useRef<T | undefined>(undefined)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => onStoreChange()
      map.observe(handler)
      return () => map.unobserve(handler)
    },
    [map],
  )

  const getSnapshot = useCallback(() => {
    if (!id) return undefined
    const value = map.get(id)
    // Only update cache if value changed
    if (value !== cacheRef.current) {
      cacheRef.current = value
    }
    return cacheRef.current
  }, [map, id])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook that resolves to `true` once the Yjs document has been hydrated
 * from IndexedDB.
 *
 * Use this at the top of a component tree to gate rendering until
 * persisted data is available.  The hook polls every 50 ms (typically
 * resolves in < 100 ms) and re-renders exactly once when ready.
 *
 * @returns `true` after IndexedDB sync is complete; `false` while loading.
 *
 * @example
 * ```tsx
 * function App() {
 *   const ready = useSyncReady()
 *   if (!ready) return <Spinner />
 *   return <MainLayout />
 * }
 * ```
 */
export function useSyncReady(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    // If already ready, no need to subscribe
    if (isReady()) return () => {}

    // Poll until ready (simple approach, typically resolves quickly)
    const interval = setInterval(() => {
      if (isReady()) {
        clearInterval(interval)
        onStoreChange()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  const getSnapshot = useCallback(() => isReady(), [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
