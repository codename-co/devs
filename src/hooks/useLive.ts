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
import { useEffect, useMemo, useRef, useState } from 'react'

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
import { loadBuiltInAgents, getAgentById } from '@/stores/agentStore'
import {
  decryptFields,
  decryptAttachments,
  KNOWLEDGE_ENCRYPTED_FIELDS,
  CONVERSATION_ENCRYPTED_FIELDS,
  MESSAGE_ENCRYPTED_FIELDS,
  MEMORY_ENCRYPTED_FIELDS,
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
  const raw = useLiveMap(conversations)
  return useMemo(
    () =>
      raw.map((t) => ({
        ...t,
        agent: t.agentId ? getAgentById(t.agentId) : undefined,
      })),
    [raw],
  )
}

/**
 * Subscribe to all conversations with metadata (title, summary) decrypted.
 * Async decryption runs in a useEffect; returns empty array on first render.
 */
export function useDecryptedConversations(): Conversation[] {
  const rawConversations = useLiveMap(conversations)
  const [decrypted, setDecrypted] = useState<Conversation[]>([])
  const cacheRef = useRef(
    new Map<string, { fingerprint: string; result: Conversation }>(),
  )

  useEffect(() => {
    let cancelled = false
    const prevCache = cacheRef.current
    const nextCache = new Map<
      string,
      { fingerprint: string; result: Conversation }
    >()

    Promise.all(
      rawConversations.map(async (conv) => {
        // Only title/summary matter for metadata decryption
        const fp = `${conv.id}|${conv.updatedAt}|${conv.title}|${conv.summary}`
        const cached = prevCache.get(conv.id)
        if (cached && cached.fingerprint === fp) {
          nextCache.set(conv.id, cached)
          return cached.result
        }
        const result = (await decryptFields(conv, [
          ...CONVERSATION_ENCRYPTED_FIELDS,
        ])) as Conversation
        nextCache.set(conv.id, { fingerprint: fp, result })
        return result
      }),
    ).then((result) => {
      if (!cancelled) {
        cacheRef.current = nextCache
        setDecrypted(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [rawConversations])

  return decrypted
}

/**
 * Subscribe to all conversations with full decryption (metadata AND message content).
 * More expensive than useDecryptedConversations — use only when message content is needed.
 */
/** Build a fingerprint for a conversation to detect actual changes. */
function convDecryptFingerprint(conv: Conversation): string {
  const lastMsg = conv.messages[conv.messages.length - 1]
  return `${conv.id}|${conv.updatedAt}|${conv.messages.length}|${lastMsg?.id ?? ''}|${lastMsg?.timestamp ?? ''}|${conv.title}|${conv.summary}`
}

/**
 * Decrypt a single conversation (all messages + metadata).
 * Extracted so it can be called per-item from the caching layer.
 */
async function decryptConversationFully(
  conv: Conversation,
): Promise<Conversation> {
  const decryptedMessages = await Promise.all(
    conv.messages.map(async (msg) => {
      const decryptedMsg = (await decryptFields(msg, [
        ...MESSAGE_ENCRYPTED_FIELDS,
      ])) as import('@/types').Message
      if (msg.attachments && msg.attachments.length > 0) {
        decryptedMsg.attachments = await decryptAttachments(msg.attachments)
      }
      return decryptedMsg
    }),
  )
  const result = {
    ...conv,
    messages: decryptedMessages as import('@/types').Message[],
  }
  return decryptFields(result, [
    ...CONVERSATION_ENCRYPTED_FIELDS,
  ]) as Promise<Conversation>
}

export function useFullyDecryptedConversations(): Conversation[] {
  const rawConversations = useLiveMap(conversations)
  const [decrypted, setDecrypted] = useState<Conversation[]>([])
  const cacheRef = useRef(
    new Map<string, { fingerprint: string; result: Conversation }>(),
  )

  useEffect(() => {
    let cancelled = false
    const prevCache = cacheRef.current
    const nextCache = new Map<
      string,
      { fingerprint: string; result: Conversation }
    >()

    Promise.all(
      rawConversations.map(async (conv) => {
        const fp = convDecryptFingerprint(conv)
        const cached = prevCache.get(conv.id)
        if (cached && cached.fingerprint === fp) {
          nextCache.set(conv.id, cached)
          return cached.result
        }
        const result = await decryptConversationFully(conv)
        nextCache.set(conv.id, { fingerprint: fp, result })
        return result
      }),
    ).then((result) => {
      if (!cancelled) {
        cacheRef.current = nextCache
        setDecrypted(result)
      }
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
 * Normalizes date fields that Yjs may have corrupted during serialization.
 */
export function useTasks(): Task[] {
  const raw = useLiveMap(tasks)
  return useMemo(
    () =>
      raw.map((t) => ({
        ...t,
        createdAt: normalizeDate(t.createdAt),
        updatedAt: normalizeDate(t.updatedAt),
        ...(t.completedAt !== undefined && {
          completedAt: normalizeDate(t.completedAt),
        }),
        ...(t.dueDate !== undefined && { dueDate: normalizeDate(t.dueDate) }),
        ...(t.assignedAt !== undefined && {
          assignedAt: normalizeDate(t.assignedAt),
        }),
        agent: t.assignedAgentId ? getAgentById(t.assignedAgentId) : undefined,
      })),
    [raw],
  )
}

/**
 * Subscribe to a single task with instant reactivity.
 */
export function useTask(id: string | undefined): Task | undefined {
  const raw = useLiveValue(tasks, id)
  return useMemo(
    () =>
      raw
        ? {
            ...raw,
            createdAt: normalizeDate(raw.createdAt),
            updatedAt: normalizeDate(raw.updatedAt),
            ...(raw.completedAt !== undefined && {
              completedAt: normalizeDate(raw.completedAt),
            }),
            ...(raw.dueDate !== undefined && {
              dueDate: normalizeDate(raw.dueDate),
            }),
            ...(raw.assignedAt !== undefined && {
              assignedAt: normalizeDate(raw.assignedAt),
            }),
            agent: raw.assignedAgentId
              ? getAgentById(raw.assignedAgentId)
              : undefined,
          }
        : undefined,
    [raw],
  )
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
 * Subscribe to all agent memories with title/content decrypted.
 * Async decryption runs in a useEffect; returns empty array on first render.
 */
export function useDecryptedMemories(): AgentMemoryEntry[] {
  const rawMemories = useMemories()
  const [decrypted, setDecrypted] = useState<AgentMemoryEntry[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      rawMemories.map(
        (m) =>
          decryptFields(m, [
            ...MEMORY_ENCRYPTED_FIELDS,
          ]) as Promise<AgentMemoryEntry>,
      ),
    ).then((result) => {
      if (!cancelled) setDecrypted(result)
    })
    return () => {
      cancelled = true
    }
  }, [rawMemories])

  return decrypted
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

/**
 * Subscribe to memories for a specific agent with title/content decrypted.
 * Async decryption runs in a useEffect; returns empty array on first render.
 */
export function useDecryptedAgentMemories(
  agentId: string | undefined,
): AgentMemoryEntry[] {
  const rawMemories = useAgentMemories(agentId)
  const [decrypted, setDecrypted] = useState<AgentMemoryEntry[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      rawMemories.map(
        (m) =>
          decryptFields(m, [
            ...MEMORY_ENCRYPTED_FIELDS,
          ]) as Promise<AgentMemoryEntry>,
      ),
    ).then((result) => {
      if (!cancelled) setDecrypted(result)
    })
    return () => {
      cancelled = true
    }
  }, [rawMemories])

  return decrypted
}

// ============================================================================
// Artifact Hooks
// ============================================================================

/**
 * Normalize a date value that may have been corrupted by Yjs binary
 * serialization (Date objects become empty `{}` after a round-trip).
 */
function normalizeDate(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString()
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number') return new Date(value).toISOString()
  return new Date(0).toISOString()
}

function normalizeArtifact(a: Artifact): Artifact {
  return {
    ...a,
    createdAt: normalizeDate(a.createdAt),
    updatedAt: normalizeDate(a.updatedAt),
  }
}

/**
 * Subscribe to all artifacts with instant reactivity.
 */
export function useArtifacts(): Artifact[] {
  const raw = useLiveMap(artifacts)
  return useMemo(() => raw.map(normalizeArtifact), [raw])
}

/**
 * Subscribe to a single artifact with instant reactivity.
 */
export function useArtifact(id: string | undefined): Artifact | undefined {
  const raw = useLiveValue(artifacts, id)
  return useMemo(() => (raw ? normalizeArtifact(raw) : undefined), [raw])
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
