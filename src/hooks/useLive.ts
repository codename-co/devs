/**
 * Real-time Data Hooks (Yjs-First Architecture)
 *
 * Provides Firebase-like instant reactivity by subscribing directly to Yjs CRDTs.
 * All state flows through Yjs, with IndexedDB serving only as local persistence.
 *
 * Usage:
 * - useConversations(), useAgents(), etc.: Subscribe to data collections
 * - useConversation(id), useAgent(id), etc.: Subscribe to single items
 * - useSyncReady(): Check if data is ready
 *
 * Benefits:
 * - Instant UI updates when remote changes arrive
 * - Automatic cleanup on unmount
 * - Works with React's concurrent rendering
 * - Simplified architecture - no IndexedDB fallbacks needed
 */
import { useEffect, useMemo, useState } from 'react'

import {
  agents,
  artifacts,
  conversations,
  credentials,
  knowledge,
  memories,
  studioEntries,
  tasks,
  useLiveMap,
  useLiveValue,
  useSyncReady,
} from '@/lib/yjs'
import { loadBuiltInAgents } from '@/stores/agentStore'
import {
  decryptFields,
  KNOWLEDGE_ENCRYPTED_FIELDS,
  CONVERSATION_ENCRYPTED_FIELDS,
} from '@/lib/crypto/content-encryption'
// Re-export agent hooks from agentStore (they handle built-in agent cache)
export { useAgents, useAgent } from '@/stores/agentStore'
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

// ============================================================================
// Re-export core hooks from @/lib/yjs for convenience
// ============================================================================

export { useLiveMap, useLiveValue, useSyncReady }

// ============================================================================
// Conversation Hooks
// ============================================================================

/**
 * Subscribe to all conversations with instant reactivity.
 * Returns raw data (may contain encrypted title/summary fields).
 */
export function useConversations(): Conversation[] {
  return useLiveMap(conversations)
}

/**
 * Subscribe to all conversations with metadata (title, summary) decrypted.
 * Async decryption runs in a useEffect; returns empty array on first render.
 */
export function useDecryptedConversations(): Conversation[] {
  const rawConversations = useLiveMap(conversations)
  const [decrypted, setDecrypted] = useState<Conversation[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      rawConversations.map(
        (conv) =>
          decryptFields(conv, [
            ...CONVERSATION_ENCRYPTED_FIELDS,
          ]) as Promise<Conversation>,
      ),
    ).then((result) => {
      if (!cancelled) setDecrypted(result)
    })
    return () => {
      cancelled = true
    }
  }, [rawConversations])

  return decrypted
}

/**
 * Subscribe to a single conversation with instant reactivity.
 */
export function useConversation(
  id: string | undefined,
): Conversation | undefined {
  return useLiveValue(conversations, id)
}

// ============================================================================
// Agent Hooks
// ============================================================================

// Note: useAgents and useAgent are exported from @/stores/agentStore above
// They handle built-in agent cache fallback

/**
 * Subscribe to all agents (built-in + custom) with instant reactivity.
 * Built-in agents are loaded once and cached, custom agents update in real-time.
 */
export function useAllAgents(): Agent[] {
  const customAgents = useLiveMap(agents)
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

// ============================================================================
// Knowledge Hooks
// ============================================================================

/**
 * Subscribe to all knowledge items with instant reactivity.
 * Returns raw data (may contain encrypted content fields).
 */
export function useKnowledge(): KnowledgeItem[] {
  return useLiveMap(knowledge)
}

/**
 * Subscribe to a single knowledge item with instant reactivity.
 * Returns raw data (may contain encrypted content fields).
 */
export function useKnowledgeItem(
  id: string | undefined,
): KnowledgeItem | undefined {
  return useLiveValue(knowledge, id)
}

/**
 * Subscribe to all knowledge items with content decrypted.
 * Async decryption runs in a useEffect; returns empty array on first render.
 */
export function useDecryptedKnowledge(): KnowledgeItem[] {
  const rawItems = useLiveMap(knowledge)
  const [decrypted, setDecrypted] = useState<KnowledgeItem[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      rawItems.map(
        (item) =>
          decryptFields(item, [
            ...KNOWLEDGE_ENCRYPTED_FIELDS,
          ]) as Promise<KnowledgeItem>,
      ),
    ).then((result) => {
      if (!cancelled) setDecrypted(result)
    })
    return () => {
      cancelled = true
    }
  }, [rawItems])

  return decrypted
}

/**
 * Subscribe to a single knowledge item with content decrypted.
 * Async decryption runs in a useEffect; returns undefined until decrypted.
 */
export function useDecryptedKnowledgeItem(
  id: string | undefined,
): KnowledgeItem | undefined {
  const rawItem = useLiveValue(knowledge, id)
  const [decrypted, setDecrypted] = useState<KnowledgeItem | undefined>()

  useEffect(() => {
    let cancelled = false
    if (!rawItem) {
      setDecrypted(undefined)
      return
    }
    ;(
      decryptFields(rawItem, [
        ...KNOWLEDGE_ENCRYPTED_FIELDS,
      ]) as Promise<KnowledgeItem>
    ).then((result) => {
      if (!cancelled) setDecrypted(result)
    })
    return () => {
      cancelled = true
    }
  }, [rawItem])

  return decrypted
}

// ============================================================================
// Task Hooks
// ============================================================================

/**
 * Subscribe to all tasks with instant reactivity.
 */
export function useTasks(): Task[] {
  return useLiveMap(tasks)
}

/**
 * Subscribe to a single task with instant reactivity.
 */
export function useTask(id: string | undefined): Task | undefined {
  return useLiveValue(tasks, id)
}

// ============================================================================
// Memory Hooks
// ============================================================================

/**
 * Subscribe to all agent memories with instant reactivity.
 * Filters out expired memories.
 */
export function useMemories(): AgentMemoryEntry[] {
  const allMemories = useLiveMap(memories)
  return useMemo(() => {
    const now = new Date()
    return allMemories.filter(
      (m) => !m.expiresAt || new Date(m.expiresAt) > now,
    )
  }, [allMemories])
}

/**
 * Subscribe to memories for a specific agent.
 * Filters out expired memories.
 */
export function useAgentMemories(
  agentId: string | undefined,
): AgentMemoryEntry[] {
  const allMemories = useLiveMap(memories)

  return useMemo(() => {
    if (!agentId) return []
    const now = new Date()
    return allMemories.filter(
      (m) =>
        m.agentId === agentId && (!m.expiresAt || new Date(m.expiresAt) > now),
    )
  }, [allMemories, agentId])
}

// ============================================================================
// Artifact Hooks
// ============================================================================

/**
 * Subscribe to all artifacts with instant reactivity.
 */
export function useArtifacts(): Artifact[] {
  return useLiveMap(artifacts)
}

/**
 * Subscribe to a single artifact with instant reactivity.
 */
export function useArtifact(id: string | undefined): Artifact | undefined {
  return useLiveValue(artifacts, id)
}

// ============================================================================
// Credential Hooks
// ============================================================================

/**
 * Subscribe to all credentials with instant reactivity.
 */
export function useCredentials(): Credential[] {
  return useLiveMap(credentials)
}

// ============================================================================
// Studio Hooks
// ============================================================================

/**
 * Subscribe to all studio entries with instant reactivity.
 */
export function useStudioEntries(): StudioEntry[] {
  return useLiveMap(studioEntries)
}

/**
 * Subscribe to a single studio entry with instant reactivity.
 */
export function useStudioEntry(
  id: string | undefined,
): StudioEntry | undefined {
  return useLiveValue(studioEntries, id)
}

/**
 * Subscribe to favorite studio entries with instant reactivity.
 */
export function useFavoriteStudioEntries(): StudioEntry[] {
  const allEntries = useLiveMap(studioEntries)

  return useMemo(() => {
    return allEntries.filter((entry) => entry.isFavorite === true)
  }, [allEntries])
}

// Note: Traces and spans are NOT available as live hooks.
// They are local observability data stored in IndexedDB via TraceService.
// Use useTraceStore from '@/stores/traceStore' instead.

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Subscribe to a filtered subset of data.
 *
 * @example
 * const pinnedConversations = useFiltered(
 *   conversations,
 *   (conv) => conv.isPinned === true
 * )
 */
export function useFiltered<T>(
  map: Parameters<typeof useLiveMap<T>>[0],
  filterFn: (item: T) => boolean,
): T[] {
  const allItems = useLiveMap(map)

  return useMemo(() => allItems.filter(filterFn), [allItems, filterFn])
}

/**
 * Subscribe to a sorted subset of data.
 *
 * @example
 * const sortedConversations = useSorted(
 *   conversations,
 *   (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
 * )
 */
export function useSorted<T>(
  map: Parameters<typeof useLiveMap<T>>[0],
  compareFn: (a: T, b: T) => number,
): T[] {
  const allItems = useLiveMap(map)

  return useMemo(() => [...allItems].sort(compareFn), [allItems, compareFn])
}

/**
 * Get the count of items in a collection.
 */
export function useCount<T>(map: Parameters<typeof useLiveMap<T>>[0]): number {
  const allItems = useLiveMap(map)
  return allItems.length
}
