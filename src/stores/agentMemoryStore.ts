import { create } from 'zustand'
import { db } from '@/lib/db'
import { deleteFromYjs, syncToYjs } from '@/features/sync'

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

const t = getT()

interface AgentMemoryStore {
  // State
  memories: AgentMemoryEntry[]
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
  getPendingReviewMemories: (agentId?: string) => AgentMemoryEntry[]
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
  memories: [],
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
      if (!db.isInitialized()) {
        await db.init()
      }

      const allMemories = await db.getAll('agentMemories')
      const agentMemories = allMemories.filter((m) => m.agentId === agentId)

      // Filter out expired memories
      const now = new Date()
      const validMemories = agentMemories.filter(
        (m) => !m.expiresAt || new Date(m.expiresAt) > now,
      )

      set({ memories: validMemories, isLoading: false })
    } catch (error) {
      errorToast(t('Failed to load agent memories'), error)
      set({ isLoading: false })
    }
  },

  loadAllMemories: async () => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const allMemories = await db.getAll('agentMemories')

      // Filter out expired memories
      const now = new Date()
      const validMemories = allMemories.filter(
        (m) => !m.expiresAt || new Date(m.expiresAt) > now,
      )

      set({ memories: validMemories, isLoading: false })
    } catch (error) {
      errorToast(t('Failed to load memories'), error)
      set({ isLoading: false })
    }
  },

  createMemory: async (memoryData) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const memory: AgentMemoryEntry = {
        ...memoryData,
        id: crypto.randomUUID(),
        version: 1,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.add('agentMemories', memory)
      syncToYjs('agentMemories', memory)

      const updatedMemories = [...get().memories, memory]
      set({ memories: updatedMemories, isLoading: false })

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const existing = await db.get('agentMemories', id)
      if (!existing) {
        throw new Error('Memory not found')
      }

      const updatedMemory: AgentMemoryEntry = {
        ...existing,
        ...updates,
        id,
        version: existing.version + 1,
        updatedAt: new Date(),
      }

      await db.update('agentMemories', updatedMemory)
      syncToYjs('agentMemories', updatedMemory)

      const { memories } = get()
      const updatedMemories = memories.map((m) =>
        m.id === id ? updatedMemory : m,
      )
      set({ memories: updatedMemories, isLoading: false })
    } catch (error) {
      errorToast(t('Failed to update memory'), error)
      set({ isLoading: false })
      throw error
    }
  },

  deleteMemory: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      await db.delete('agentMemories', id)
      deleteFromYjs('agentMemories', id)

      const { memories } = get()
      const updatedMemories = memories.filter((m) => m.id !== id)
      set({ memories: updatedMemories, isLoading: false })

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const allEvents = await db.getAll('memoryLearningEvents')
      const agentEvents = allEvents.filter((e) => e.agentId === agentId)

      set({ learningEvents: agentEvents, isLoading: false })
    } catch (error) {
      errorToast(t('Failed to load learning events'), error)
      set({ isLoading: false })
    }
  },

  createLearningEvent: async (eventData) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const event: MemoryLearningEvent = {
        ...eventData,
        id: crypto.randomUUID(),
        processed: false,
        extractedAt: new Date(),
      }

      await db.add('memoryLearningEvents', event)

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const existing = await db.get('memoryLearningEvents', id)
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

      await db.update('memoryLearningEvents', updatedEvent)

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const allDocs = await db.getAll('agentMemoryDocuments')
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
      if (!db.isInitialized()) {
        await db.init()
      }

      const allDocs = await db.getAll('agentMemoryDocuments')
      const existing = allDocs.find((d) => d.agentId === agentId)

      if (existing) {
        const updatedDoc: AgentMemoryDocument = {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        }
        await db.update('agentMemoryDocuments', updatedDoc)

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
        await db.add('agentMemoryDocuments', newDoc)

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

  getPendingReviewMemories: (agentId?: string) => {
    const { memories } = get()
    return memories.filter(
      (m) =>
        m.validationStatus === 'pending' &&
        (agentId ? m.agentId === agentId : true),
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
    const { memories } = get()

    // Only return approved or auto-approved memories for context injection
    const validatedMemories = memories.filter(
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

      // Keyword match
      if (ENABLE_KEYWORD_MATCHING) {
        const memoryText =
          `${m.title} ${m.content} ${(m.tags || []).join(' ')} ${(m.keywords || []).join(' ')}`.toLowerCase()
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
    // Ensure memories are loaded from IndexedDB
    if (!db.isInitialized()) {
      await db.init()
    }

    // Load all memories from IndexedDB
    const allMemories = await db.getAll('agentMemories')
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

      // Keyword match
      if (ENABLE_KEYWORD_MATCHING) {
        const memoryText =
          `${m.title} ${m.content} ${(m.tags || []).join(' ')} ${(m.keywords || []).join(' ')}`.toLowerCase()
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
      const memory = get().memories.find((m) => m.id === memoryId)
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
    const { memories } = get()
    const agentMemories = memories.filter((m) => m.agentId === agentId)

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
      for (const id of ids) {
        await get().approveMemory(id)
      }
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
      for (const id of ids) {
        await get().rejectMemory(id)
      }
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
      if (!db.isInitialized()) {
        await db.init()
      }

      const { memories } = get()
      const now = new Date()
      const expiredIds = memories
        .filter((m) => m.expiresAt && new Date(m.expiresAt) < now)
        .map((m) => m.id)

      for (const id of expiredIds) {
        await db.delete('agentMemories', id)
      }

      const validMemories = memories.filter((m) => !expiredIds.includes(m.id))
      set({ memories: validMemories, isLoading: false })

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
    if (!db.isInitialized()) {
      await db.init()
    }

    const allMemories = await db.getAll('agentMemories')
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

      // Keyword match
      if (ENABLE_KEYWORD_MATCHING) {
        const memoryText =
          `${m.title} ${m.content} ${(m.tags || []).join(' ')} ${(m.keywords || []).join(' ')}`.toLowerCase()
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
