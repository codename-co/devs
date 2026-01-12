/**
 * Real-time Data Hooks
 *
 * Provides Firebase-like instant reactivity by subscribing directly to CRDT changes.
 * These hooks bypass the IndexedDB → Store → React chain for immediate UI updates.
 *
 * Usage:
 * - useConversations(), useAgents(), etc.: Subscribe to data collections
 * - useConversation(id), useAgent(id), etc.: Subscribe to single items
 * - useSyncReady(): Check if data is ready
 *
 * Benefits:
 * - Instant UI updates when remote changes arrive (no IndexedDB round-trip)
 * - Automatic cleanup on unmount
 * - Works with React's concurrent rendering
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import * as Y from 'yjs'

import {
  getAgentsMap,
  getConversationsMap,
  getKnowledgeMap,
  getMemoriesMap,
  getSpansMap,
  getStudioEntriesMap,
  getTasksMap,
  getArtifactsMap,
  getSecretsMap,
  getTracesMap,
  isPersistenceReady,
} from '@/features/sync'
import { loadBuiltInAgents } from '@/stores/agentStore'
import type {
  Agent,
  AgentMemoryEntry,
  Artifact,
  Conversation,
  Credential,
  KnowledgeItem,
  Task,
} from '@/types'
import type { StudioEntry } from '@/features/studio/types'
import type { Trace, Span } from '@/features/traces/types'

// ============================================================================
// Core Hook: useLiveMap
// ============================================================================

/**
 * Subscribe to all values in a map with instant reactivity.
 *
 * @param getMap - Function that returns the map to subscribe to
 * @returns Array of all values in the map, updates instantly on changes
 *
 * @example
 * const conversations = useLiveMap(getConversationsMap)
 */
export function useLiveMap<T>(getMap: () => Y.Map<T>): T[] {
  // Cache for the current snapshot to avoid recreating arrays
  // We track a version that only increments when the observer fires
  const cacheRef = useRef<{
    version: number
    lastReadVersion: number
    data: T[]
  }>({
    version: 0,
    lastReadVersion: -1,
    data: [],
  })

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Set up the observer on the map
      const setupObserver = () => {
        const map = getMap()

        const handler = () => {
          cacheRef.current.version++
          onStoreChange()
        }

        // Observe deep changes (including nested object modifications)
        map.observeDeep(handler)

        return () => {
          map.unobserveDeep(handler)
        }
      }

      if (!isPersistenceReady()) {
        // If persistence isn't ready, poll until it is, then set up observer
        let cleanup: (() => void) | null = null
        const checkReady = setInterval(() => {
          if (isPersistenceReady()) {
            clearInterval(checkReady)
            // Increment version to signal data is now available
            cacheRef.current.version++
            cleanup = setupObserver()
            onStoreChange() // Trigger re-render with new data
          }
        }, 100)
        return () => {
          clearInterval(checkReady)
          cleanup?.()
        }
      }

      return setupObserver()
    },
    [getMap],
  )

  // Get current snapshot - MUST return cached value if data hasn't changed
  const getSnapshot = useCallback((): T[] => {
    if (!isPersistenceReady()) {
      // Always return the same empty array reference when not ready
      return cacheRef.current.data
    }

    // Only rebuild the array if version has changed since last read
    if (cacheRef.current.lastReadVersion !== cacheRef.current.version) {
      const map = getMap()
      cacheRef.current.data = Array.from(map.values())
      cacheRef.current.lastReadVersion = cacheRef.current.version
    }

    return cacheRef.current.data
  }, [getMap])

  // Server snapshot (same as client for our use case)
  const getServerSnapshot = getSnapshot

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// ============================================================================
// Core Hook: useLiveValue
// ============================================================================

/**
 * Subscribe to a single value in a map with instant reactivity.
 *
 * @param getMap - Function that returns the map
 * @param id - The key to subscribe to
 * @returns The value or undefined, updates instantly on changes
 *
 * @example
 * const conversation = useLiveValue(getConversationsMap, conversationId)
 */
export function useLiveValue<T>(
  getMap: () => Y.Map<T>,
  id: string | undefined,
): T | undefined {
  const cacheRef = useRef<{
    version: number
    lastReadVersion: number
    data: T | undefined
  }>({
    version: 0,
    lastReadVersion: -1,
    data: undefined,
  })

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!id) {
        return () => {}
      }

      // Set up the observer on the map
      const setupObserver = () => {
        const map = getMap()

        const handler = (event: Y.YMapEvent<T>) => {
          // Only trigger update if our specific key changed
          if (event.keysChanged.has(id)) {
            cacheRef.current.version++
            onStoreChange()
          }
        }

        map.observe(handler)

        return () => {
          map.unobserve(handler)
        }
      }

      if (!isPersistenceReady()) {
        // If persistence isn't ready, poll until it is, then set up observer
        let cleanup: (() => void) | null = null
        const checkReady = setInterval(() => {
          if (isPersistenceReady()) {
            clearInterval(checkReady)
            // Increment version to signal data is now available
            cacheRef.current.version++
            cleanup = setupObserver()
            onStoreChange() // Trigger re-render with new data
          }
        }, 100)
        return () => {
          clearInterval(checkReady)
          cleanup?.()
        }
      }

      return setupObserver()
    },
    [getMap, id],
  )

  // Get current snapshot - MUST return cached value if data hasn't changed
  const getSnapshot = useCallback((): T | undefined => {
    if (!id || !isPersistenceReady()) {
      return cacheRef.current.data
    }

    // Only fetch the value if version has changed since last read
    if (cacheRef.current.lastReadVersion !== cacheRef.current.version) {
      const map = getMap()
      cacheRef.current.data = map.get(id)
      cacheRef.current.lastReadVersion = cacheRef.current.version
    }

    return cacheRef.current.data
  }, [getMap, id])

  const getServerSnapshot = getSnapshot

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// ============================================================================
// Data Hooks - Subscribe to synced data with instant reactivity
// ============================================================================

/**
 * Subscribe to all conversations with instant reactivity.
 */
export function useConversations(): Conversation[] {
  return useLiveMap(getConversationsMap)
}

/**
 * Subscribe to a single conversation with instant reactivity.
 */
export function useConversation(
  id: string | undefined,
): Conversation | undefined {
  return useLiveValue(getConversationsMap, id)
}

/**
 * Subscribe to all custom agents with instant reactivity.
 * Note: This only returns agents stored in IndexedDB (custom agents).
 * For all agents including built-in ones, use useAllAgents.
 */
export function useAgents(): Agent[] {
  return useLiveMap(getAgentsMap)
}

/**
 * Subscribe to all agents (built-in + custom) with instant reactivity.
 * Built-in agents are loaded once and cached, custom agents update in real-time.
 */
export function useAllAgents(): Agent[] {
  const customAgents = useLiveMap(getAgentsMap)
  const [builtInAgents, setBuiltInAgents] = useState<Agent[]>([])

  useEffect(() => {
    loadBuiltInAgents().then(setBuiltInAgents)
  }, [])

  return useMemo(() => {
    // Combine built-in and custom agents, with custom agents taking precedence
    const customAgentIds = new Set(customAgents.map((a) => a.id))
    const filteredBuiltIn = builtInAgents.filter(
      (a) => !customAgentIds.has(a.id) && !a.deletedAt,
    )
    return [...filteredBuiltIn, ...customAgents.filter((a) => !a.deletedAt)]
  }, [builtInAgents, customAgents])
}

/**
 * Subscribe to a single agent with instant reactivity.
 */
export function useAgent(id: string | undefined): Agent | undefined {
  return useLiveValue(getAgentsMap, id)
}

/**
 * Subscribe to all knowledge items with instant reactivity.
 */
export function useKnowledge(): KnowledgeItem[] {
  return useLiveMap(getKnowledgeMap)
}

/**
 * Subscribe to a single knowledge item with instant reactivity.
 */
export function useKnowledgeItem(
  id: string | undefined,
): KnowledgeItem | undefined {
  return useLiveValue(getKnowledgeMap, id)
}

/**
 * Subscribe to all tasks with instant reactivity.
 */
export function useTasks(): Task[] {
  return useLiveMap(getTasksMap)
}

/**
 * Subscribe to a single task with instant reactivity.
 */
export function useTask(id: string | undefined): Task | undefined {
  return useLiveValue(getTasksMap, id)
}

/**
 * Subscribe to all agent memories with instant reactivity.
 */
export function useMemories(): AgentMemoryEntry[] {
  return useLiveMap(getMemoriesMap)
}

/**
 * Subscribe to memories for a specific agent.
 */
export function useAgentMemories(
  agentId: string | undefined,
): AgentMemoryEntry[] {
  const allMemories = useLiveMap(getMemoriesMap)

  return useMemo(() => {
    if (!agentId) return []
    return allMemories.filter((m) => m.agentId === agentId)
  }, [allMemories, agentId])
}

/**
 * Subscribe to all artifacts with instant reactivity.
 */
export function useArtifacts(): Artifact[] {
  return useLiveMap(getArtifactsMap)
}

/**
 * Subscribe to a single artifact with instant reactivity.
 */
export function useArtifact(id: string | undefined): Artifact | undefined {
  return useLiveValue(getArtifactsMap, id)
}

/**
 * Subscribe to all credentials with instant reactivity.
 */
export function useCredentials(): Credential[] {
  return useLiveMap(getSecretsMap)
}

// ============================================================================
// Studio Hooks
// ============================================================================

/**
 * Subscribe to all studio entries with instant reactivity.
 */
export function useStudioEntries(): StudioEntry[] {
  return useLiveMap(getStudioEntriesMap)
}

/**
 * Subscribe to a single studio entry with instant reactivity.
 */
export function useStudioEntry(
  id: string | undefined,
): StudioEntry | undefined {
  return useLiveValue(getStudioEntriesMap, id)
}

/**
 * Subscribe to favorite studio entries with instant reactivity.
 */
export function useFavoriteStudioEntries(): StudioEntry[] {
  const allEntries = useLiveMap(getStudioEntriesMap)

  return useMemo(() => {
    return allEntries.filter((entry) => entry.isFavorite === true)
  }, [allEntries])
}

// ============================================================================
// Traces Hooks
// ============================================================================

/**
 * Subscribe to all traces with instant reactivity.
 */
export function useTraces(): Trace[] {
  return useLiveMap(getTracesMap)
}

/**
 * Subscribe to a single trace with instant reactivity.
 */
export function useTrace(id: string | undefined): Trace | undefined {
  return useLiveValue(getTracesMap, id)
}

/**
 * Subscribe to all spans with instant reactivity.
 */
export function useSpans(): Span[] {
  return useLiveMap(getSpansMap)
}

/**
 * Subscribe to a single span with instant reactivity.
 */
export function useSpan(id: string | undefined): Span | undefined {
  return useLiveValue(getSpansMap, id)
}

/**
 * Subscribe to spans for a specific trace.
 */
export function useTraceSpans(traceId: string | undefined): Span[] {
  const allSpans = useLiveMap(getSpansMap)

  return useMemo(() => {
    if (!traceId) return []
    return allSpans.filter((span) => span.traceId === traceId)
  }, [allSpans, traceId])
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Subscribe to a filtered subset of data.
 *
 * @example
 * const pinnedConversations = useFiltered(
 *   getConversationsMap,
 *   (conv) => conv.pinned === true
 * )
 */
export function useFiltered<T>(
  getMap: () => Y.Map<T>,
  filterFn: (item: T) => boolean,
): T[] {
  const allItems = useLiveMap(getMap)

  return useMemo(() => allItems.filter(filterFn), [allItems, filterFn])
}

/**
 * Subscribe to a sorted subset of data.
 *
 * @example
 * const sortedConversations = useSorted(
 *   getConversationsMap,
 *   (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
 * )
 */
export function useSorted<T>(
  getMap: () => Y.Map<T>,
  compareFn: (a: T, b: T) => number,
): T[] {
  const allItems = useLiveMap(getMap)

  return useMemo(() => [...allItems].sort(compareFn), [allItems, compareFn])
}

/**
 * Get the count of items in a collection (lightweight, doesn't load all data).
 */
export function useCount(getMap: () => Y.Map<unknown>): number {
  const cacheRef = useRef<number>(0)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isPersistenceReady()) {
        const checkReady = setInterval(() => {
          if (isPersistenceReady()) {
            clearInterval(checkReady)
            onStoreChange()
          }
        }, 100)
        return () => clearInterval(checkReady)
      }

      const map = getMap()

      const handler = () => {
        const newCount = map.size
        if (newCount !== cacheRef.current) {
          cacheRef.current = newCount
          onStoreChange()
        }
      }

      map.observe(handler)
      return () => map.unobserve(handler)
    },
    [getMap],
  )

  const getSnapshot = useCallback(() => {
    if (!isPersistenceReady()) return 0
    const map = getMap()
    cacheRef.current = map.size
    return cacheRef.current
  }, [getMap])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ============================================================================
// Sync Status Hook
// ============================================================================

/**
 * Hook to check if data sync is ready.
 * Use this to show loading states before data is available.
 */
export function useSyncReady(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (isPersistenceReady()) {
      return () => {}
    }

    const checkReady = setInterval(() => {
      if (isPersistenceReady()) {
        clearInterval(checkReady)
        onStoreChange()
      }
    }, 50)

    return () => clearInterval(checkReady)
  }, [])

  const getSnapshot = useCallback(() => isPersistenceReady(), [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
