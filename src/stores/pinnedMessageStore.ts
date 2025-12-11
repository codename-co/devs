import { create } from 'zustand'
import { db } from '@/lib/db'
import type { PinnedMessage } from '@/types'
import { errorToast, successToast } from '@/lib/toast'

// Feature toggles
const ENABLE_KEYWORD_MATCHING = false

interface PinnedMessageStore {
  // State
  pinnedMessages: PinnedMessage[]
  isLoading: boolean

  // CRUD Operations
  loadPinnedMessages: () => Promise<void>
  loadPinnedMessagesForAgent: (agentId: string) => Promise<void>
  loadPinnedMessagesForConversation: (conversationId: string) => Promise<void>
  createPinnedMessage: (
    data: Omit<PinnedMessage, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<PinnedMessage>
  updatePinnedMessage: (
    id: string,
    updates: Partial<PinnedMessage>,
  ) => Promise<void>
  deletePinnedMessage: (id: string) => Promise<void>
  deletePinnedMessageByMessageId: (messageId: string) => Promise<void>

  // Retrieval for Context Injection
  getRelevantPinnedMessages: (
    agentId: string,
    currentConversationId: string, // Exclude current conversation
    keywords?: string[],
    limit?: number,
  ) => PinnedMessage[]

  getRelevantPinnedMessagesAsync: (
    agentId: string,
    currentConversationId: string,
    keywords?: string[],
    limit?: number,
  ) => Promise<PinnedMessage[]>

  // Helpers
  isPinned: (messageId: string) => boolean
}

export const usePinnedMessageStore = create<PinnedMessageStore>((set, get) => ({
  pinnedMessages: [],
  isLoading: false,

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  loadPinnedMessages: async () => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const allPinnedMessages = await db.getAll('pinnedMessages')
      set({ pinnedMessages: allPinnedMessages, isLoading: false })
    } catch (error) {
      errorToast('Failed to load pinned messages', error)
      set({ isLoading: false })
    }
  },

  loadPinnedMessagesForAgent: async (agentId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const allPinnedMessages = await db.getAll('pinnedMessages')
      const agentPinnedMessages = allPinnedMessages.filter(
        (pm) => pm.agentId === agentId,
      )

      set({ pinnedMessages: agentPinnedMessages, isLoading: false })
    } catch (error) {
      errorToast('Failed to load pinned messages for agent', error)
      set({ isLoading: false })
    }
  },

  loadPinnedMessagesForConversation: async (conversationId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const allPinnedMessages = await db.getAll('pinnedMessages')
      const conversationPinnedMessages = allPinnedMessages.filter(
        (pm) => pm.conversationId === conversationId,
      )

      set({ pinnedMessages: conversationPinnedMessages, isLoading: false })
    } catch (error) {
      errorToast('Failed to load pinned messages for conversation', error)
      set({ isLoading: false })
    }
  },

  createPinnedMessage: async (pinnedMessageData) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const pinnedMessage: PinnedMessage = {
        ...pinnedMessageData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.add('pinnedMessages', pinnedMessage)

      const updatedPinnedMessages = [...get().pinnedMessages, pinnedMessage]
      set({ pinnedMessages: updatedPinnedMessages, isLoading: false })

      successToast('Message pinned successfully')
      return pinnedMessage
    } catch (error) {
      errorToast('Failed to pin message', error)
      set({ isLoading: false })
      throw error
    }
  },

  updatePinnedMessage: async (id: string, updates: Partial<PinnedMessage>) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const existing = await db.get('pinnedMessages', id)
      if (!existing) {
        throw new Error('Pinned message not found')
      }

      const updatedPinnedMessage: PinnedMessage = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date(),
      }

      await db.update('pinnedMessages', updatedPinnedMessage)

      const { pinnedMessages } = get()
      const updatedPinnedMessages = pinnedMessages.map((pm) =>
        pm.id === id ? updatedPinnedMessage : pm,
      )
      set({ pinnedMessages: updatedPinnedMessages, isLoading: false })

      successToast('Pinned message updated')
    } catch (error) {
      errorToast('Failed to update pinned message', error)
      set({ isLoading: false })
      throw error
    }
  },

  deletePinnedMessage: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      await db.delete('pinnedMessages', id)

      const { pinnedMessages } = get()
      const updatedPinnedMessages = pinnedMessages.filter((pm) => pm.id !== id)
      set({ pinnedMessages: updatedPinnedMessages, isLoading: false })

      successToast('Message unpinned')
    } catch (error) {
      errorToast('Failed to unpin message', error)
      set({ isLoading: false })
    }
  },

  deletePinnedMessageByMessageId: async (messageId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      // Find pinned message by messageId
      const { pinnedMessages } = get()
      const pinnedMessage = pinnedMessages.find(
        (pm) => pm.messageId === messageId,
      )

      if (pinnedMessage) {
        await db.delete('pinnedMessages', pinnedMessage.id)

        const updatedPinnedMessages = pinnedMessages.filter(
          (pm) => pm.id !== pinnedMessage.id,
        )
        set({ pinnedMessages: updatedPinnedMessages, isLoading: false })

        successToast('Message unpinned')
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to unpin message', error)
      set({ isLoading: false })
    }
  },

  // =========================================================================
  // Retrieval for Context Injection
  // =========================================================================

  getRelevantPinnedMessages: (
    agentId: string,
    currentConversationId: string,
    keywords: string[] = [],
    limit: number = 10,
  ) => {
    const { pinnedMessages } = get()

    // Filter to get messages for this agent, excluding current conversation
    const relevantMessages = pinnedMessages.filter(
      (pm) =>
        pm.agentId === agentId && pm.conversationId !== currentConversationId,
    )

    if (relevantMessages.length === 0) {
      return []
    }

    // Score messages by relevance
    const scoredMessages = relevantMessages.map((pm) => {
      let score = 0

      // Keyword match
      if (ENABLE_KEYWORD_MATCHING && keywords.length > 0) {
        const messageText =
          `${pm.description} ${pm.content} ${(pm.keywords || []).join(' ')}`.toLowerCase()
        keywords.forEach((keyword) => {
          if (messageText.includes(keyword.toLowerCase())) {
            score += 2
          }
        })
      }

      // Boost by recency
      const daysSincePinned =
        (Date.now() - new Date(pm.pinnedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSincePinned < 7) score += 2
      else if (daysSincePinned < 30) score += 1

      // Base score for all pinned messages
      score += 1

      return { pinnedMessage: pm, score }
    })

    // Sort by score and return top N
    return scoredMessages
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.pinnedMessage)
  },

  getRelevantPinnedMessagesAsync: async (
    agentId: string,
    currentConversationId: string,
    keywords: string[] = [],
    limit: number = 10,
  ) => {
    // Ensure pinned messages are loaded from IndexedDB
    if (!db.isInitialized()) {
      await db.init()
    }

    // Load all pinned messages from IndexedDB
    const allPinnedMessages = await db.getAll('pinnedMessages')

    // Filter to get messages for this agent, excluding current conversation
    const relevantMessages = allPinnedMessages.filter(
      (pm) =>
        pm.agentId === agentId && pm.conversationId !== currentConversationId,
    )

    if (relevantMessages.length === 0) {
      return []
    }

    // Score messages by relevance
    const scoredMessages = relevantMessages.map((pm) => {
      let score = 0

      // Keyword match
      if (ENABLE_KEYWORD_MATCHING && keywords.length > 0) {
        const messageText =
          `${pm.description} ${pm.content} ${(pm.keywords || []).join(' ')}`.toLowerCase()
        keywords.forEach((keyword) => {
          if (messageText.includes(keyword.toLowerCase())) {
            score += 2
          }
        })
      }

      // Boost by recency
      const daysSincePinned =
        (Date.now() - new Date(pm.pinnedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSincePinned < 7) score += 2
      else if (daysSincePinned < 30) score += 1

      // Base score for all pinned messages
      score += 1

      return { pinnedMessage: pm, score }
    })

    // Sort by score and return top N
    return scoredMessages
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.pinnedMessage)
  },

  // =========================================================================
  // Helpers
  // =========================================================================

  isPinned: (messageId: string) => {
    const { pinnedMessages } = get()
    return pinnedMessages.some((pm) => pm.messageId === messageId)
  },
}))

/**
 * Build context injection string from relevant pinned messages
 * This is used to inject pinned messages into chat context
 */
export async function buildPinnedContextForChat(
  agentId: string,
  conversationId: string,
  userPrompt: string,
): Promise<string> {
  const { getRelevantPinnedMessagesAsync } = usePinnedMessageStore.getState()

  // Extract keywords from user prompt (simple tokenization)
  const keywords = userPrompt
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 10)

  // Get relevant pinned messages (async to ensure loading from IndexedDB)
  const relevantPinnedMessages = await getRelevantPinnedMessagesAsync(
    agentId,
    conversationId,
    keywords,
    10,
  )

  if (relevantPinnedMessages.length === 0) {
    return ''
  }

  // Build context string
  const pinnedContext = relevantPinnedMessages
    .map((pm) => {
      const snippet =
        pm.content.length > 200
          ? pm.content.substring(0, 200) + '...'
          : pm.content
      return `• **${pm.description}**: ${snippet}`
    })
    .join('\n')

  return /* md */ `## Important Past Conversations

The following are key moments from previous conversations that may be relevant:

${pinnedContext}

Consider this context when providing your response.

---

`
}
