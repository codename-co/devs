/**
 * React Hooks for Yjs Reactivity
 *
 * Provides React hooks that subscribe to Yjs data structures
 * and trigger re-renders when data changes.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'

import { isReady } from './doc'

/**
 * Subscribe to all values in a Y.Map.
 * Returns an array of all values, re-rendering when any value changes.
 */
export function useLiveMap<T>(map: Y.Map<T>): T[] {
  const cacheRef = useRef<T[]>([])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => onStoreChange()
      map.observe(handler)
      return () => map.unobserve(handler)
    },
    [map]
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
 * Subscribe to a single value in a Y.Map by its key.
 * Returns the value or undefined, re-rendering when it changes.
 */
export function useLiveValue<T>(map: Y.Map<T>, id: string | undefined): T | undefined {
  const cacheRef = useRef<T | undefined>(undefined)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => onStoreChange()
      map.observe(handler)
      return () => map.unobserve(handler)
    },
    [map]
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
 * Hook to check if Yjs data is ready (IndexedDB synced).
 * Re-renders once when sync completes.
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
