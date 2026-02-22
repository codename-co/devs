import { create } from 'zustand'
import {
  memories,
  memoryLearningEvents,
  agentMemoryDocuments,
  whenReady,
  transact,
  useLiveMap,
} from '@/lib/yjs'

// Feature toggles
const ENABLE_KEYWORD_MATCHING = false

import type {
  AgentMemoryEntry,
  MemoryLearningEvent,
  AgentMemoryDocument,
  MemoryCategory,
  MemoryConfidence,
  MemoryValidationStatus,
} from '@/types'
import { errorToast, successToast } from '@/lib/toast'
import { getT } from '@/i18n/utils'
import {
  encryptFields,
  decryptFields,
  MEMORY_ENCRYPTED_FIELDS,
} from '@/lib/crypto/content-encryption'

const t = getT()

// =========================================================================
// Helper functions for Yjs-First architecture
// =========================================================================

/**
 * Get all memories from Yjs (excludes expired)
 */
function getAllMemories(): AgentMemoryEntry[] {
  const now = new Date()
  return Array.from(memories.values()).filter(
    (m) => !m.expiresAt || new Date(m.expiresAt) > now,
  )
}

/**
 * Get a memory by ID from Yjs (raw, may be encrypted).
 * For decrypted content, use {@link getMemoryByIdDecrypted}.
 */
export function getMemoryById(id: string): AgentMemoryEntry | undefined {
  return memories.get(id)
}

/**
 * Get all memories for a specific agent (excludes expired, raw).
 * For decrypted content, use {@link getMemoriesByAgentIdDecrypted}.
 */
export function getMemoriesByAgentId(agentId: string): AgentMemoryEntry[] {
  const now = new Date()
  return Array.from(memories.values()).filter(
    (m) =>
      m.agentId === agentId && (!m.expiresAt || new Date(m.expiresAt) > now),
  )
}

/**
 * Get a memory by ID with content decrypted.
 */
export async function getMemoryByIdDecrypted(
  id: string,
): Promise<AgentMemoryEntry | undefined> {
  const entry = memories.get(id)
  if (!entry) return undefined
  return decryptFields(entry, [
    ...MEMORY_ENCRYPTED_FIELDS,
  ]) as Promise<AgentMemoryEntry>
}

/**
 * Get all memories for a specific agent with content decrypted.
 */
export async function getMemoriesByAgentIdDecrypted(
  agentId: string,
): Promise<AgentMemoryEntry[]> {
  const raw = getMemoriesByAgentId(agentId)
  return Promise.all(
    raw.map(
      (m) =>
        decryptFields(m, [
          ...MEMORY_ENCRYPTED_FIELDS,
        ]) as Promise<AgentMemoryEntry>,
    ),
  )
}

// =========================================================================
// React Hook for reactive memory access
// =========================================================================

/**
 * React hook to get all memories reactively
 * Re-renders when any memory changes
 */
export function useMemories(): AgentMemoryEntry[] {
  const allMemories = useLiveMap(memories)
  const now = new Date()
  return allMemories.filter((m) => !m.expiresAt || new Date(m.expiresAt) > now)
}

/**
 * React hook to get memories for a specific agent reactively
 */
export function useAgentMemories(agentId: string): AgentMemoryEntry[] {
  const allMemories = useLiveMap(memories)
  const now = new Date()
  return allMemories.filter(
    (m) =>
      m.agentId === agentId && (!m.expiresAt || new Date(m.expiresAt) > now),
  )
}

// =========================================================================
// Store Interface
// =========================================================================

interface AgentMemoryStore {
  // State (for learning events, memory documents, and UI state)
  // Note: 'memories' state removed - use Yjs directly or useMemories() hook
  learningEvents: MemoryLearningEvent[]
  memoryDocuments: AgentMemoryDocument[]
  isLoading: boolean
  currentAgentId: string | null

  // Memory CRUD
  loadMemoriesForAgent: (agentId: string) => Promise<void>
  loadAllMemories: () => Promise<void>
  createMemory: (
    memory: Omit<
      AgentMemoryEntry,
      'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount'
    >,
  ) => Promise<AgentMemoryEntry>
  updateMemory: (
    id: string,
    updates: Partial<AgentMemoryEntry>,
  ) => Promise<void>
  deleteMemory: (id: string) => Promise<void>

  // Learning Events
  loadLearningEventsForAgent: (agentId: string) => Promise<void>
  createLearningEvent: (
    event: Omit<MemoryLearningEvent, 'id' | 'extractedAt' | 'processed'>,
  ) => Promise<MemoryLearningEvent>
  markLearningEventProcessed: (
    id: string,
    resultingMemoryId?: string,
    discardedReason?: string,
  ) => Promise<void>
  getPendingLearningEvents: (agentId: string) => MemoryLearningEvent[]

  // Memory Document (Agent's persistent working document)
  loadMemoryDocument: (agentId: string) => Promise<AgentMemoryDocument | null>
  createOrUpdateMemoryDocument: (
    agentId: string,
    updates: Partial<Omit<AgentMemoryDocument, 'id' | 'agentId' | 'createdAt'>>,
  ) => Promise<AgentMemoryDocument>
  updateSynthesis: (agentId: string, synthesis: string) => Promise<void>

  // Human Review
  getPendingReviewMemories: (agentId?: string) => Promise<AgentMemoryEntry[]>
  approveMemory: (id: string, reviewNotes?: string) => Promise<void>
  rejectMemory: (id: string, reviewNotes?: string) => Promise<void>
  editAndApproveMemory: (
    id: string,
    editedContent: string,
    reviewNotes?: string,
  ) => Promise<void>

  // Memory Retrieval for Context
  getRelevantMemories: (
    agentId: string,
    keywords?: string[],
    categories?: MemoryCategory[],
    limit?: number,
  ) => AgentMemoryEntry[]
  getRelevantMemoriesAsync: (
    agentId: string,
    keywords?: string[],
    categories?: MemoryCategory[],
    limit?: number,
  ) => Promise<AgentMemoryEntry[]>
  recordMemoryUsage: (memoryId: string) => Promise<void>

  // Statistics
  getMemoryStats: (agentId: string) => {
    total: number
    byCategory: Record<MemoryCategory, number>
    byConfidence: Record<MemoryConfidence, number>
    byValidation: Record<MemoryValidationStatus, number>
    pendingReview: number
  }

  // Bulk Operations
  bulkApproveMemories: (ids: string[]) => Promise<void>
  bulkRejectMemories: (ids: string[]) => Promise<void>
  cleanupExpiredMemories: () => Promise<number>

  // Global Memory Operations
  upgradeToGlobal: (id: string) => Promise<void>
  downgradeFromGlobal: (id: string) => Promise<void>
  getGlobalMemoriesAsync: (
    keywords?: string[],
    categories?: MemoryCategory[],
    limit?: number,
  ) => Promise<AgentMemoryEntry[]>
}

export const useAgentMemoryStore = create<AgentMemoryStore>((set, get) => ({
  // Note: 'memories' state removed - use Yjs directly or useMemories() hook
  learningEvents: [],
  memoryDocuments: [],
  isLoading: false,
  currentAgentId: null,

  // =========================================================================
  // Memory CRUD Operations
  // =========================================================================

  loadMemoriesForAgent: async (agentId: string) => {
    set({ isLoading: true, currentAgentId: agentId })
    try {
      await whenReady
      // Memories are now in Yjs, just mark as loaded
      set({ isLoading: false })
    } catch (error) {
      errorToast(t('Failed to load agent memories'), error)
      set({ isLoading: false })
    }
  },

  loadAllMemories: async () => {
    set({ isLoading: true })
    try {
      await whenReady
      // Memories are now in Yjs, just mark as loaded
      set({ isLoading: false })
    } catch (error) {
      errorToast(t('Failed to load memories'), error)
      set({ isLoading: false })
    }
  },

  createMemory: async (memoryData) => {
    set({ isLoading: true })
    try {
      await whenReady

      const memory: AgentMemoryEntry = {
        ...memoryData,
        id: crypto.randomUUID(),
        version: 1,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Encrypt content fields before saving to Yjs
      const encrypted = await encryptFields(memory, [
        ...MEMORY_ENCRYPTED_FIELDS,
      ])

      // Save to Yjs (single source of truth)
      memories.set(memory.id, encrypted as unknown as AgentMemoryEntry)

      set({ isLoading: false })

      return memory
    } catch (error) {
      errorToast(t('Failed to create memory'), error)
      set({ isLoading: false })
      throw error
    }
  },

  updateMemory: async (id: string, updates: Partial<AgentMemoryEntry>) => {
    set({ isLoading: true })
    try {
      await whenReady

      const existing = memories.get(id)
      if (!existing) {
        throw new Error('Memory not found')
      }

      // Decrypt existing to merge with updates (so we re-encrypt the full object)
      const decrypted = (await decryptFields(existing, [
        ...MEMORY_ENCRYPTED_FIELDS,
      ])) as AgentMemoryEntry

      const updatedMemory: AgentMemoryEntry = {
        ...decrypted,
        ...updates,
        id,
        version: existing.version + 1,
        updatedAt: new Date(),
      }

      // Encrypt content fields before saving to Yjs
      const encrypted = await encryptFields(updatedMemory, [
        ...MEMORY_ENCRYPTED_FIELDS,
      ])

      // Save to Yjs (single source of truth)
      memories.set(id, encrypted as unknown as AgentMemoryEntry)

      set({ isLoading: false })
    } catch (error) {
      errorToast(t('Failed to update memory'), error)
      set({ isLoading: false })
      throw error
    }
  },

  deleteMemory: async (id: string) => {
    set({ isLoading: true })
    try {
      await whenReady

      // Delete from Yjs (single source of truth)
      memories.delete(id)

      set({ isLoading: false })

      successToast(t('Memory deleted'))
    } catch (error) {
      errorToast(t('Failed to delete memory'), error)
      set({ isLoading: false })
    }
  },

  // =========================================================================
  // Learning Events
  // =========================================================================

  loadLearningEventsForAgent: async (agentId: string) => {
    set({ isLoading: true })
    try {
      await whenReady

      const allEvents = Array.from(memoryLearningEvents.values())
      const agentEvents = allEvents.filter((e) => e.agentId === agentId)

      set({ learningEvents: agentEvents, isLoading: false })
    } catch (error) {
      errorToast(t('Failed to load learning events'), error)
      set({ isLoading: false })
    }
  },

  createLearningEvent: async (eventData) => {
    try {
      await whenReady

      const event: MemoryLearningEvent = {
        ...eventData,
        id: crypto.randomUUID(),
        processed: false,
        extractedAt: new Date(),
      }

      memoryLearningEvents.set(event.id, event)

      const updatedEvents = [...get().learningEvents, event]
      set({ learningEvents: updatedEvents })

      return event
    } catch (error) {
      console.error('Failed to create learning event:', error)
      throw error
    }
  },

  markLearningEventProcessed: async (
    id: string,
    resultingMemoryId?: string,
    discardedReason?: string,
  ) => {
    try {
      await whenReady

      const existing = memoryLearningEvents.get(id)
      if (!existing) {
        throw new Error('Learning event not found')
      }

      const updatedEvent: MemoryLearningEvent = {
        ...existing,
        processed: true,
        resultingMemoryId,
        discardedReason,
        processedAt: new Date(),
      }

      memoryLearningEvents.set(id, updatedEvent)

      const { learningEvents } = get()
      const updatedEvents = learningEvents.map((e) =>
        e.id === id ? updatedEvent : e,
      )
      set({ learningEvents: updatedEvents })
    } catch (error) {
      console.error('Failed to mark learning event processed:', error)
      throw error
    }
  },

  getPendingLearningEvents: (agentId: string) => {
    const { learningEvents } = get()
    return learningEvents.filter((e) => e.agentId === agentId && !e.processed)
  },

  // =========================================================================
  // Memory Document (Agent's persistent working document)
  // =========================================================================

  loadMemoryDocument: async (agentId: string) => {
    try {
      await whenReady

      const allDocs = Array.from(agentMemoryDocuments.values())
      const doc = allDocs.find((d) => d.agentId === agentId)

      if (doc) {
        const { memoryDocuments } = get()
        const updatedDocs = memoryDocuments.filter((d) => d.agentId !== agentId)
        updatedDocs.push(doc)
        set({ memoryDocuments: updatedDocs })
      }

      return doc || null
    } catch (error) {
      console.error('Failed to load memory document:', error)
      return null
    }
  },

  createOrUpdateMemoryDocument: async (agentId, updates) => {
    try {
      await whenReady

      const allDocs = Array.from(agentMemoryDocuments.values())
      const existing = allDocs.find((d) => d.agentId === agentId)

      if (existing) {
        const updatedDoc: AgentMemoryDocument = {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        }
        agentMemoryDocuments.set(existing.id, updatedDoc)

        const { memoryDocuments } = get()
        const updatedDocs = memoryDocuments.map((d) =>
          d.agentId === agentId ? updatedDoc : d,
        )
        set({ memoryDocuments: updatedDocs })

        return updatedDoc
      } else {
        const newDoc: AgentMemoryDocument = {
          id: crypto.randomUUID(),
          agentId,
          synthesis: updates.synthesis || '',
          lastSynthesisAt: updates.lastSynthesisAt || new Date(),
          totalMemories: updates.totalMemories || 0,
          memoriesByCategory: updates.memoriesByCategory || {
            fact: 0,
            preference: 0,
            behavior: 0,
            domain_knowledge: 0,
            relationship: 0,
            procedure: 0,
            correction: 0,
          },
          memoriesByConfidence: updates.memoriesByConfidence || {
            high: 0,
            medium: 0,
            low: 0,
          },
          pendingReviewCount: updates.pendingReviewCount || 0,
          autoLearnEnabled: updates.autoLearnEnabled ?? true,
          autoApproveHighConfidence: updates.autoApproveHighConfidence ?? false,
          autoApproveDelayHours: updates.autoApproveDelayHours ?? 24,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        agentMemoryDocuments.set(newDoc.id, newDoc)

        const { memoryDocuments } = get()
        set({ memoryDocuments: [...memoryDocuments, newDoc] })

        return newDoc
      }
    } catch (error) {
      errorToast(t('Failed to update memory document'), error)
      throw error
    }
  },

  updateSynthesis: async (agentId: string, synthesis: string) => {
    await get().createOrUpdateMemoryDocument(agentId, {
      synthesis,
      lastSynthesisAt: new Date(),
    })
  },

  // =========================================================================
  // Human Review
  // =========================================================================

  getPendingReviewMemories: async (agentId?: string) => {
    const allMemories = getAllMemories()
    const filtered = allMemories.filter(
      (m) =>
        m.validationStatus === 'pending' &&
        (agentId ? m.agentId === agentId : true),
    )
    return Promise.all(
      filtered.map(
        (m) =>
          decryptFields(m, [
            ...MEMORY_ENCRYPTED_FIELDS,
          ]) as Promise<AgentMemoryEntry>,
      ),
    )
  },

  approveMemory: async (id: string, reviewNotes?: string) => {
    await get().updateMemory(id, {
      validationStatus: 'approved',
      reviewedAt: new Date(),
      reviewedBy: 'human',
      reviewNotes,
    })
    successToast(t('Memory approved'))
  },

  rejectMemory: async (id: string, reviewNotes?: string) => {
    await get().updateMemory(id, {
      validationStatus: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: 'human',
      reviewNotes,
    })
    successToast(t('Memory rejected'))
  },

  editAndApproveMemory: async (
    id: string,
    editedContent: string,
    reviewNotes?: string,
  ) => {
    console.debug('.')
    await get().updateMemory(id, {
      content: editedContent,
      validationStatus: 'approved',
      reviewedAt: new Date(),
      reviewedBy: 'human',
      reviewNotes: reviewNotes || t('Edited during review'),
    })
    successToast(t('Memory edited and approved'))
  },

  // =========================================================================
  // Memory Retrieval for Context
  // =========================================================================

  getRelevantMemories: (
    agentId: string,
    keywords: string[] = [],
    categories: MemoryCategory[] = [],
    limit: number = 20,
  ) => {
    const allMemories = getAllMemories()

    // Only return approved or auto-approved memories for context injection
    const validatedMemories = allMemories.filter(
      (m) =>
        m.agentId === agentId &&
        (m.validationStatus === 'approved' ||
          m.validationStatus === 'auto_approved') &&
        (!m.expiresAt || new Date(m.expiresAt) > new Date()),
    )

    // Score memories by relevance
    const scoredMemories = validatedMemories.map((m) => {
      let score = 0

      // Category match
      if (categories.length === 0 || categories.includes(m.category)) {
        score += 1
      }

      // Keyword match (content may be encrypted — use typeof checks)
      if (ENABLE_KEYWORD_MATCHING) {
        const titleText = typeof m.title === 'string' ? m.title : ''
        const contentText = typeof m.content === 'string' ? m.content : ''
        const memoryText =
          `${titleText} ${contentText} ${(m.tags || []).join(' ')} ${(m.keywords || []).join(' ')}`.toLowerCase()
        keywords.forEach((keyword) => {
          if (memoryText.includes(keyword.toLowerCase())) {
            score += 2
          }
        })
      }

      // Boost by confidence
      if (m.confidence === 'high') score += 3
      else if (m.confidence === 'medium') score += 2
      else score += 1

      // Boost by usage (more used = more relevant)
      score += Math.min(m.usageCount * 0.1, 2)

      // Boost by recency
      const daysSinceUpdate =
        (Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceUpdate < 7) score += 1
      if (daysSinceUpdate < 1) score += 1

      return { memory: m, score }
    })

    // Sort by score and return top N
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.memory)
  },

  getRelevantMemoriesAsync: async (
    agentId: string,
    keywords: string[] = [],
    categories: MemoryCategory[] = [],
    limit: number = 20,
  ) => {
    // Ensure Yjs is ready
    await whenReady

    const allMemories = getAllMemories()
    const now = new Date()

    // Filter to get validated, non-expired memories for this agent OR global memories
    const validatedMemories = allMemories.filter(
      (m) =>
        (m.agentId === agentId || m.isGlobal === true) &&
        (m.validationStatus === 'approved' ||
          m.validationStatus === 'auto_approved') &&
        (!m.expiresAt || new Date(m.expiresAt) > now),
    )

    if (validatedMemories.length === 0) {
      return []
    }

    // Score memories by relevance
    const scoredMemories = validatedMemories.map((m) => {
      let score = 0

      // Category match
      if (categories.length === 0 || categories.includes(m.category)) {
        score += 1
      }

      // Keyword match (content may be encrypted — use typeof checks)
      if (ENABLE_KEYWORD_MATCHING) {
        const titleText = typeof m.title === 'string' ? m.title : ''
        const contentText = typeof m.content === 'string' ? m.content : ''
        const memoryText =
          `${titleText} ${contentText} ${(m.tags || []).join(' ')} ${(m.keywords || []).join(' ')}`.toLowerCase()
        keywords.forEach((keyword) => {
          if (memoryText.includes(keyword.toLowerCase())) {
            score += 2
          }
        })
      }

      // Boost by confidence
      if (m.confidence === 'high') score += 3
      else if (m.confidence === 'medium') score += 2
      else score += 1

      // Boost by usage (more used = more relevant)
      score += Math.min(m.usageCount * 0.1, 2)

      // Boost by recency
      const daysSinceUpdate =
        (Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceUpdate < 7) score += 1
      if (daysSinceUpdate < 1) score += 1

      // Slight boost for agent-specific memories over global ones
      if (m.agentId === agentId && !m.isGlobal) score += 0.5

      return { memory: m, score }
    })

    // Sort by score and return top N
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.memory)
  },

  recordMemoryUsage: async (memoryId: string) => {
    try {
      const memory = memories.get(memoryId)
      if (memory) {
        await get().updateMemory(memoryId, {
          lastUsedAt: new Date(),
          usageCount: memory.usageCount + 1,
        })
      }
    } catch (error) {
      console.warn('Failed to record memory usage:', error)
    }
  },

  // =========================================================================
  // Statistics
  // =========================================================================

  getMemoryStats: (agentId: string) => {
    const allMemories = getAllMemories()
    const agentMemories = allMemories.filter((m) => m.agentId === agentId)

    const byCategory: Record<MemoryCategory, number> = {
      fact: 0,
      preference: 0,
      behavior: 0,
      domain_knowledge: 0,
      relationship: 0,
      procedure: 0,
      correction: 0,
    }

    const byConfidence: Record<MemoryConfidence, number> = {
      high: 0,
      medium: 0,
      low: 0,
    }

    const byValidation: Record<MemoryValidationStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      auto_approved: 0,
    }

    agentMemories.forEach((m) => {
      byCategory[m.category]++
      byConfidence[m.confidence]++
      byValidation[m.validationStatus]++
    })

    return {
      total: agentMemories.length,
      byCategory,
      byConfidence,
      byValidation,
      pendingReview: byValidation.pending,
    }
  },

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  bulkApproveMemories: async (ids: string[]) => {
    set({ isLoading: true })
    try {
      await whenReady

      // Use transact for batched writes
      transact(() => {
        for (const id of ids) {
          const existing = memories.get(id)
          if (existing) {
            memories.set(id, {
              ...existing,
              validationStatus: 'approved',
              reviewedAt: new Date(),
              reviewedBy: 'human',
              version: existing.version + 1,
              updatedAt: new Date(),
            })
          }
        }
      })

      successToast(t(`{count} memories approved`, { count: ids.length }))
    } catch (error) {
      errorToast(t('Failed to bulk approve memories'), error)
    } finally {
      set({ isLoading: false })
    }
  },

  bulkRejectMemories: async (ids: string[]) => {
    set({ isLoading: true })
    try {
      await whenReady

      // Use transact for batched writes
      transact(() => {
        for (const id of ids) {
          const existing = memories.get(id)
          if (existing) {
            memories.set(id, {
              ...existing,
              validationStatus: 'rejected',
              reviewedAt: new Date(),
              reviewedBy: 'human',
              version: existing.version + 1,
              updatedAt: new Date(),
            })
          }
        }
      })

      successToast(t(`{count} memories rejected`, { count: ids.length }))
    } catch (error) {
      errorToast(t('Failed to bulk reject memories'), error)
    } finally {
      set({ isLoading: false })
    }
  },

  cleanupExpiredMemories: async () => {
    set({ isLoading: true })
    try {
      await whenReady

      const allMemories = Array.from(memories.values())
      const now = new Date()
      const expiredIds = allMemories
        .filter((m) => m.expiresAt && new Date(m.expiresAt) < now)
        .map((m) => m.id)

      // Use transact for batched deletes
      transact(() => {
        for (const id of expiredIds) {
          memories.delete(id)
        }
      })

      set({ isLoading: false })

      if (expiredIds.length > 0) {
        console.log(`Cleaned up ${expiredIds.length} expired memories`)
      }

      return expiredIds.length
    } catch (error) {
      console.error('Failed to cleanup expired memories:', error)
      set({ isLoading: false })
      return 0
    }
  },

  // =========================================================================
  // Global Memory Operations
  // =========================================================================

  upgradeToGlobal: async (id: string) => {
    await get().updateMemory(id, { isGlobal: true })
    successToast(t('Memory upgraded to global'))
  },

  downgradeFromGlobal: async (id: string) => {
    await get().updateMemory(id, { isGlobal: false })
    successToast(t('Memory downgraded from global'))
  },

  getGlobalMemoriesAsync: async (
    keywords: string[] = [],
    categories: MemoryCategory[] = [],
    limit: number = 20,
  ) => {
    await whenReady

    const allMemories = getAllMemories()
    const now = new Date()

    // Filter to get global, validated, non-expired memories
    const globalMemories = allMemories.filter(
      (m) =>
        m.isGlobal === true &&
        (m.validationStatus === 'approved' ||
          m.validationStatus === 'auto_approved') &&
        (!m.expiresAt || new Date(m.expiresAt) > now),
    )

    if (globalMemories.length === 0) {
      return []
    }

    // Score memories by relevance
    const scoredMemories = globalMemories.map((m) => {
      let score = 0

      // Category match
      if (categories.length === 0 || categories.includes(m.category)) {
        score += 1
      }

      // Keyword match (content may be encrypted — use typeof checks)
      if (ENABLE_KEYWORD_MATCHING) {
        const titleText = typeof m.title === 'string' ? m.title : ''
        const contentText = typeof m.content === 'string' ? m.content : ''
        const memoryText =
          `${titleText} ${contentText} ${(m.tags || []).join(' ')} ${(m.keywords || []).join(' ')}`.toLowerCase()
        keywords.forEach((keyword) => {
          if (memoryText.includes(keyword.toLowerCase())) {
            score += 2
          }
        })
      }

      // Boost by confidence
      if (m.confidence === 'high') score += 3
      else if (m.confidence === 'medium') score += 2
      else score += 1

      // Boost by usage
      score += Math.min(m.usageCount * 0.1, 2)

      // Boost by recency
      const daysSinceUpdate =
        (Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceUpdate < 7) score += 1
      if (daysSinceUpdate < 1) score += 1

      return { memory: m, score }
    })

    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.memory)
  },
}))

// =========================================================================
// Yjs Observers for P2P sync
// =========================================================================

/**
 * Initialize Yjs observers for real-time sync.
 * When memories or learning events are modified on another device,
 * this ensures the Zustand store stays in sync.
 */
function initYjsObservers(): void {
  // Observe learning events map for remote changes
  memoryLearningEvents.observe(() => {
    const currentAgentId = useAgentMemoryStore.getState().currentAgentId
    if (currentAgentId) {
      const allEvents = Array.from(memoryLearningEvents.values())
      const agentEvents = allEvents.filter((e) => e.agentId === currentAgentId)
      useAgentMemoryStore.setState({ learningEvents: agentEvents })
    }
  })

  // Observe memory documents map for remote changes
  agentMemoryDocuments.observe(() => {
    const currentAgentId = useAgentMemoryStore.getState().currentAgentId
    if (currentAgentId) {
      const allDocs = Array.from(agentMemoryDocuments.values())
      const agentDocs = allDocs.filter((d) => d.agentId === currentAgentId)
      useAgentMemoryStore.setState({ memoryDocuments: agentDocs })
    }
  })

  // Note: memories map uses useLiveMap() hook for reactivity
  // so no observer needed for memories state
}

// Initialize observers when module loads
initYjsObservers()
