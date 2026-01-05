import { create } from 'zustand'
import { db } from '@/lib/db'
import { deleteFromYjs, syncToYjs } from '@/lib/sync'
import type { Conversation, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import { ConversationTitleGenerator } from '@/lib/conversation-title-generator'

interface ConversationStore {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  searchQuery: string
  showPinnedOnly: boolean

  loadConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<Conversation | null>
  createConversation: (
    agentId: string,
    workflowId: string,
  ) => Promise<Conversation>
  addMessage: (
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>,
  ) => Promise<void>
  addAgentToConversation: (
    conversationId: string,
    agentId: string,
  ) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  clearCurrentConversation: () => void
  getConversationTitle: (conversation: Conversation) => string
  generateAndUpdateTitle: (conversationId: string) => Promise<void>
  generateTitleForMessage: (
    conversationId: string,
    userMessage: string,
  ) => Promise<void>

  // Search
  setSearchQuery: (query: string) => void
  searchConversations: (query: string) => Conversation[]
  setShowPinnedOnly: (show: boolean) => void

  // Pinning conversations
  pinConversation: (id: string) => Promise<void>
  unpinConversation: (id: string) => Promise<void>

  // Pinning messages
  pinMessage: (conversationId: string, messageId: string) => Promise<void>
  unpinMessage: (conversationId: string, messageId: string) => Promise<void>

  // Update message
  updateMessage: (
    conversationId: string,
    messageId: string,
    content: string,
  ) => Promise<void>

  // Summarization
  summarizeConversation: (conversationId: string) => Promise<string>

  // Rename conversation
  renameConversation: (
    conversationId: string,
    newTitle: string,
  ) => Promise<void>
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  searchQuery: '',
  showPinnedOnly: false,

  loadConversations: async () => {
    set({ isLoading: true })
    try {
      // Ensure database is initialized
      if (!db.isInitialized()) {
        await db.init()
      }
      const conversations = await db.getAll('conversations')
      set({ conversations, isLoading: false })
    } catch (error) {
      errorToast('Failed to load conversations', error)
      set({ isLoading: false })
    }
  },

  loadConversation: async (id: string) => {
    set({ isLoading: true })
    try {
      // Ensure database is initialized
      if (!db.isInitialized()) {
        await db.init()
      }
      const conversation = await db.get('conversations', id)
      if (conversation) {
        set({ currentConversation: conversation, isLoading: false })
        return conversation
      } else {
        errorToast(
          'Conversation not found',
          'The requested conversation could not be found',
        )
        set({ isLoading: false })
        return null
      }
    } catch (error) {
      errorToast('Failed to load conversations', error)
      set({ isLoading: false })
      return null
    }
  },

  createConversation: async (agentId: string, workflowId: string) => {
    set({ isLoading: true })
    try {
      // Ensure database is initialized
      if (!db.isInitialized()) {
        await db.init()
      }

      // Create conversation without initial system message
      // The system prompt will be dynamically built and added by chat.ts when messages are sent
      const conversation: Conversation = {
        id: crypto.randomUUID(),
        agentId,
        participatingAgents: [agentId],
        workflowId,
        timestamp: new Date(),
        messages: [],
      }

      await db.add('conversations', conversation)

      // Sync to Yjs for P2P sync
      syncToYjs('conversations', conversation)

      const updatedConversations = [...get().conversations, conversation]
      set({
        conversations: updatedConversations,
        currentConversation: conversation,
        isLoading: false,
      })

      return conversation
    } catch (error) {
      errorToast('Failed to create conversation', error)
      set({ isLoading: false })
      throw error
    }
  },

  addMessage: async (
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>,
  ) => {
    set({ isLoading: true })
    try {
      // Ensure database is initialized
      if (!db.isInitialized()) {
        await db.init()
      }
      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      }

      // If this is an assistant message with an agentId, add agent to participating agents
      if (message.role === 'assistant' && message.agentId) {
        // Initialize participatingAgents if it doesn't exist (backward compatibility)
        if (!conversation.participatingAgents) {
          conversation.participatingAgents = [conversation.agentId]
        }
        if (!conversation.participatingAgents.includes(message.agentId)) {
          conversation.participatingAgents.push(message.agentId)
        }
      }

      conversation.messages.push(newMessage)
      await db.update('conversations', conversation)

      // Sync to Yjs for P2P sync
      syncToYjs('conversations', conversation)

      const { conversations, currentConversation } = get()

      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? conversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? conversation
            : currentConversation,
        isLoading: false,
      })

      // Generate title if this is the first user message and no title exists
      if (message.role === 'user' && !conversation.title) {
        const userMessagesCount = conversation.messages.filter(
          (m) => m.role === 'user',
        ).length
        if (userMessagesCount === 1) {
          // Generate title asynchronously without blocking the UI
          get()
            .generateTitleForMessage(conversationId, message.content)
            .catch((error) => {
              console.warn(
                'Title generation failed, but message was saved:',
                error,
              )
            })
        }
      }
    } catch (error) {
      errorToast('Failed to add message', error)
      set({ isLoading: false })
    }
  },

  deleteConversation: async (id: string) => {
    set({ isLoading: true })
    try {
      // Ensure database is initialized
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.delete('conversations', id)

      // Sync deletion to Yjs
      deleteFromYjs('conversations', id)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.filter((c) => c.id !== id)

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === id ? null : currentConversation,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to delete conversations', error)
      set({ isLoading: false })
    }
  },

  clearCurrentConversation: () => {
    set({ currentConversation: null })
  },

  addAgentToConversation: async (conversationId: string, agentId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Initialize participatingAgents if it doesn't exist (backward compatibility)
      if (!conversation.participatingAgents) {
        conversation.participatingAgents = [conversation.agentId]
      }

      if (!conversation.participatingAgents.includes(agentId)) {
        conversation.participatingAgents.push(agentId)
        await db.update('conversations', conversation)
        syncToYjs('conversations', conversation)

        const { conversations, currentConversation } = get()
        const updatedConversations = conversations.map((c) =>
          c.id === conversationId ? conversation : c,
        )

        set({
          conversations: updatedConversations,
          currentConversation:
            currentConversation?.id === conversationId
              ? conversation
              : currentConversation,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to add agent to conversation', error)
      set({ isLoading: false })
    }
  },

  getConversationTitle: (conversation: Conversation) => {
    // Use stored title if available
    if (conversation.title) {
      return conversation.title
    }

    // Fallback to first user message truncation (legacy behavior)
    const firstUserMessage = conversation.messages.find(
      (msg) => msg.role === 'user',
    )

    if (firstUserMessage) {
      // Truncate to 50 characters for title
      const title = firstUserMessage.content.slice(0, 50)
      return title.length < firstUserMessage.content.length
        ? title + '...'
        : title
    }

    return 'New Conversation'
  },

  generateAndUpdateTitle: async (conversationId: string) => {
    try {
      const conversation = get().conversations.find(
        (c) => c.id === conversationId,
      )
      if (!conversation) {
        console.warn(
          'Conversation not found for title generation:',
          conversationId,
        )
        return
      }

      // Generate title using LLM
      const title = await ConversationTitleGenerator.generateTitle(conversation)

      // Update conversation with generated title
      const updatedConversation = { ...conversation, title }

      // Update in database
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.update('conversations', updatedConversation)
      syncToYjs('conversations', updatedConversation)

      // Update in store
      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? updatedConversation
            : currentConversation,
      })
    } catch (error) {
      console.error('Failed to generate conversation title:', error)
      // Don't show error toast for title generation failures as it's not critical
    }
  },

  generateTitleForMessage: async (
    conversationId: string,
    userMessage: string,
  ) => {
    try {
      // Generate title immediately from the user message
      const title =
        await ConversationTitleGenerator.generateTitleForNewConversation(
          conversationId,
          userMessage,
        )

      // Update conversation with generated title
      const conversation = get().conversations.find(
        (c) => c.id === conversationId,
      )
      if (!conversation) {
        console.warn(
          'Conversation not found for title generation:',
          conversationId,
        )
        return
      }

      const updatedConversation = { ...conversation, title }

      // Update in database
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.update('conversations', updatedConversation)
      syncToYjs('conversations', updatedConversation)

      // Update in store
      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? updatedConversation
            : currentConversation,
      })
    } catch (error) {
      console.error('Failed to generate title for new message:', error)
      // Don't show error toast for title generation failures as it's not critical
    }
  },

  // =========================================================================
  // Search Methods
  // =========================================================================

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  searchConversations: (query: string) => {
    const { conversations } = get()
    if (!query || query.trim() === '') {
      return conversations
    }

    const lowerQuery = query.toLowerCase()
    return conversations.filter((conversation) => {
      // Search in title
      if (conversation.title?.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // Search in summary
      if (conversation.summary?.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // Search in message content
      return conversation.messages.some((message) =>
        message.content.toLowerCase().includes(lowerQuery),
      )
    })
  },

  setShowPinnedOnly: (show: boolean) => {
    set({ showPinnedOnly: show })
  },

  // =========================================================================
  // Pinning Conversations
  // =========================================================================

  pinConversation: async (id: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const updatedConversation = { ...conversation, isPinned: true }
      await db.update('conversations', updatedConversation)
      syncToYjs('conversations', updatedConversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === id ? updatedConversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === id
            ? updatedConversation
            : currentConversation,
      })
    } catch (error) {
      errorToast('Failed to pin conversation', error)
    }
  },

  unpinConversation: async (id: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const updatedConversation = { ...conversation, isPinned: false }
      await db.update('conversations', updatedConversation)
      syncToYjs('conversations', updatedConversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === id ? updatedConversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === id
            ? updatedConversation
            : currentConversation,
      })
    } catch (error) {
      errorToast('Failed to unpin conversation', error)
    }
  },

  // =========================================================================
  // Pinning Messages
  // =========================================================================

  pinMessage: async (conversationId: string, messageId: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Find the message
      const message = conversation.messages.find((m) => m.id === messageId)
      if (!message) {
        throw new Error('Message not found')
      }

      // Update message with pinned status
      message.isPinned = true
      message.pinnedAt = new Date()

      // Add to pinnedMessageIds array if not present
      if (!conversation.pinnedMessageIds) {
        conversation.pinnedMessageIds = []
      }
      if (!conversation.pinnedMessageIds.includes(messageId)) {
        conversation.pinnedMessageIds.push(messageId)
      }

      await db.update('conversations', conversation)
      syncToYjs('conversations', conversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? conversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? conversation
            : currentConversation,
      })
    } catch (error) {
      errorToast('Failed to pin message', error)
    }
  },

  unpinMessage: async (conversationId: string, messageId: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Find the message
      const message = conversation.messages.find((m) => m.id === messageId)
      if (!message) {
        throw new Error('Message not found')
      }

      // Update message with unpinned status
      message.isPinned = false
      message.pinnedAt = undefined
      message.pinnedDescription = undefined

      // Remove from pinnedMessageIds array
      if (conversation.pinnedMessageIds) {
        conversation.pinnedMessageIds = conversation.pinnedMessageIds.filter(
          (id) => id !== messageId,
        )
      }

      await db.update('conversations', conversation)
      syncToYjs('conversations', conversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? conversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? conversation
            : currentConversation,
      })
    } catch (error) {
      errorToast('Failed to unpin message', error)
    }
  },

  // =========================================================================
  // Update Message
  // =========================================================================

  updateMessage: async (
    conversationId: string,
    messageId: string,
    content: string,
  ) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Find and update the message
      const messageIndex = conversation.messages.findIndex(
        (m) => m.id === messageId,
      )
      if (messageIndex === -1) {
        throw new Error('Message not found')
      }

      conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        content,
      }

      await db.update('conversations', conversation)
      syncToYjs('conversations', conversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? conversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? conversation
            : currentConversation,
      })
    } catch (error) {
      errorToast('Failed to update message', error)
    }
  },

  // =========================================================================
  // Summarization
  // =========================================================================

  summarizeConversation: async (conversationId: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Dynamically import the summarizer to avoid circular dependencies
      const { ConversationSummarizer } = await import(
        '@/lib/conversation-summarizer'
      )

      const summary =
        await ConversationSummarizer.summarizeConversation(conversation)

      // Update conversation with summary
      const updatedConversation = { ...conversation, summary }
      await db.update('conversations', updatedConversation)
      syncToYjs('conversations', updatedConversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? updatedConversation
            : currentConversation,
      })

      return summary
    } catch (error) {
      errorToast('Failed to summarize conversation', error)
      throw error
    }
  },

  // =========================================================================
  // Rename conversation
  // =========================================================================

  renameConversation: async (conversationId: string, newTitle: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const conversation = await db.get('conversations', conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Update conversation with new title
      const updatedConversation = { ...conversation, title: newTitle.trim() }
      await db.update('conversations', updatedConversation)
      syncToYjs('conversations', updatedConversation)

      const { conversations, currentConversation } = get()
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? updatedConversation : c,
      )

      set({
        conversations: updatedConversations,
        currentConversation:
          currentConversation?.id === conversationId
            ? updatedConversation
            : currentConversation,
      })
    } catch (error) {
      errorToast('Failed to rename conversation', error)
      throw error
    }
  },
}))
