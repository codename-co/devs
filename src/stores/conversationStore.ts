import { create } from 'zustand'
import { conversations, whenReady } from '@/lib/yjs'
import type { Conversation, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import { ConversationTitleGenerator } from '@/lib/conversation-title-generator'
import { getAgentById } from '@/stores/agentStore'

// ============================================================================
// Helper: Get all conversations from Yjs map
// ============================================================================
function getAllConversations(): Conversation[] {
  return Array.from(conversations.values())
}

// ============================================================================
// Store Interface
// ============================================================================
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

export const useConversationStore = create<ConversationStore>((set, get) => {
  // Subscribe to Yjs changes to keep Zustand state in sync
  conversations.observe(() => {
    const allConversations = getAllConversations()
    const { currentConversation } = get()

    // Update currentConversation if it changed in Yjs
    const updatedCurrent = currentConversation
      ? conversations.get(currentConversation.id) ?? null
      : null

    set({
      conversations: allConversations,
      currentConversation: updatedCurrent,
    })
  })

  return {
    conversations: [],
    currentConversation: null,
    isLoading: false,
    searchQuery: '',
    showPinnedOnly: false,

    loadConversations: async () => {
      set({ isLoading: true })
      try {
        // Wait for Yjs to be ready (IndexedDB synced)
        await whenReady

        const allConversations = getAllConversations()
        set({ conversations: allConversations, isLoading: false })
      } catch (error) {
        errorToast('Failed to load conversations', error)
        set({ isLoading: false })
      }
    },

    loadConversation: async (id: string) => {
      set({ isLoading: true })
      try {
        // Wait for Yjs to be ready
        await whenReady

        const conversation = conversations.get(id)
        if (conversation) {
          // Migrate legacy conversations: backfill agentSlug if missing
          if (!conversation.agentSlug && conversation.agentId) {
            const agent = await getAgentById(conversation.agentId)
            if (agent?.slug) {
              const updatedConversation = {
                ...conversation,
                agentSlug: agent.slug,
              }
              // Persist the migration to Yjs
              conversations.set(id, updatedConversation)
              set({ currentConversation: updatedConversation, isLoading: false })
              return updatedConversation
            }
          }

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
        // Wait for Yjs to be ready
        await whenReady

        // Get agent to retrieve slug
        const agent = await getAgentById(agentId)
        const agentSlug = agent?.slug

        // Create conversation without initial system message
        // The system prompt will be dynamically built and added by chat.ts when messages are sent
        const now = new Date()
        const conversation: Conversation = {
          id: crypto.randomUUID(),
          agentId,
          agentSlug,
          participatingAgents: [agentId],
          workflowId,
          timestamp: now,
          updatedAt: now,
          messages: [],
        }

        // Write to Yjs (single source of truth)
        conversations.set(conversation.id, conversation)

        // Update local state
        set({
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
        // Wait for Yjs to be ready
        await whenReady

        const conversation = conversations.get(conversationId)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        }

        // Clone for immutability
        const updatedConversation = { ...conversation }

        // If this is an assistant message with an agentId, add agent to participating agents
        if (message.role === 'assistant' && message.agentId) {
          // Initialize participatingAgents if it doesn't exist (backward compatibility)
          if (!updatedConversation.participatingAgents) {
            updatedConversation.participatingAgents = [updatedConversation.agentId]
          }
          if (!updatedConversation.participatingAgents.includes(message.agentId)) {
            updatedConversation.participatingAgents = [
              ...updatedConversation.participatingAgents,
              message.agentId,
            ]
          }
        }

        updatedConversation.messages = [...conversation.messages, newMessage]
        updatedConversation.updatedAt = new Date()

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        const { currentConversation } = get()
        set({
          currentConversation:
            currentConversation?.id === conversationId
              ? updatedConversation
              : currentConversation,
          isLoading: false,
        })

        // Generate title if this is the first user message and no title exists
        if (message.role === 'user' && !updatedConversation.title) {
          const userMessagesCount = updatedConversation.messages.filter(
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
        // Wait for Yjs to be ready
        await whenReady

        // Delete from Yjs (hard delete for conversations)
        conversations.delete(id)

        const { currentConversation } = get()
        set({
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
        // Wait for Yjs to be ready
        await whenReady

        const conversation = conversations.get(conversationId)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        // Clone for immutability
        const updatedConversation = { ...conversation }

        // Initialize participatingAgents if it doesn't exist (backward compatibility)
        if (!updatedConversation.participatingAgents) {
          updatedConversation.participatingAgents = [updatedConversation.agentId]
        }

        if (!updatedConversation.participatingAgents.includes(agentId)) {
          updatedConversation.participatingAgents = [
            ...updatedConversation.participatingAgents,
            agentId,
          ]

          // Write to Yjs
          conversations.set(conversationId, updatedConversation)

          const { currentConversation } = get()
          set({
            currentConversation:
              currentConversation?.id === conversationId
                ? updatedConversation
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
        const conversation = conversations.get(conversationId)
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

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        // Update currentConversation if needed
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }
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
        const conversation = conversations.get(conversationId)
        if (!conversation) {
          console.warn(
            'Conversation not found for title generation:',
            conversationId,
          )
          return
        }

        const updatedConversation = { ...conversation, title }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        // Update currentConversation if needed
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }
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
      const allConversations = getAllConversations()
      if (!query || query.trim() === '') {
        return allConversations
      }

      const lowerQuery = query.toLowerCase()
      return allConversations.filter((conversation) => {
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
        await whenReady

        const conversation = conversations.get(id)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        const updatedConversation = {
          ...conversation,
          isPinned: true,
        }

        // Write to Yjs
        conversations.set(id, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === id) {
          set({ currentConversation: updatedConversation })
        }
      } catch (error) {
        errorToast('Failed to pin conversation', error)
      }
    },

    unpinConversation: async (id: string) => {
      try {
        await whenReady

        const conversation = conversations.get(id)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        const updatedConversation = {
          ...conversation,
          isPinned: false,
        }

        // Write to Yjs
        conversations.set(id, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === id) {
          set({ currentConversation: updatedConversation })
        }
      } catch (error) {
        errorToast('Failed to unpin conversation', error)
      }
    },

    // =========================================================================
    // Pinning Messages
    // =========================================================================

    pinMessage: async (conversationId: string, messageId: string) => {
      try {
        await whenReady

        const conversation = conversations.get(conversationId)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        // Find the message index
        const messageIndex = conversation.messages.findIndex(
          (m) => m.id === messageId,
        )
        if (messageIndex === -1) {
          throw new Error('Message not found')
        }

        // Clone conversation and messages for immutability
        const updatedMessages = [...conversation.messages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          isPinned: true,
          pinnedAt: new Date(),
        }

        // Add to pinnedMessageIds array if not present
        const pinnedMessageIds = conversation.pinnedMessageIds
          ? [...conversation.pinnedMessageIds]
          : []
        if (!pinnedMessageIds.includes(messageId)) {
          pinnedMessageIds.push(messageId)
        }

        const updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          pinnedMessageIds,
          updatedAt: new Date(),
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }
      } catch (error) {
        errorToast('Failed to pin message', error)
      }
    },

    unpinMessage: async (conversationId: string, messageId: string) => {
      try {
        await whenReady

        const conversation = conversations.get(conversationId)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        // Find the message index
        const messageIndex = conversation.messages.findIndex(
          (m) => m.id === messageId,
        )
        if (messageIndex === -1) {
          throw new Error('Message not found')
        }

        // Clone conversation and messages for immutability
        const updatedMessages = [...conversation.messages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          isPinned: false,
          pinnedAt: undefined,
          pinnedDescription: undefined,
        }

        // Remove from pinnedMessageIds array
        const pinnedMessageIds = conversation.pinnedMessageIds
          ? conversation.pinnedMessageIds.filter((id) => id !== messageId)
          : []

        const updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          pinnedMessageIds,
          updatedAt: new Date(),
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }
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
        await whenReady

        const conversation = conversations.get(conversationId)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        // Find the message index
        const messageIndex = conversation.messages.findIndex(
          (m) => m.id === messageId,
        )
        if (messageIndex === -1) {
          throw new Error('Message not found')
        }

        // Clone conversation and messages for immutability
        const updatedMessages = [...conversation.messages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          content,
        }

        const updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          updatedAt: new Date(),
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }
      } catch (error) {
        errorToast('Failed to update message', error)
      }
    },

    // =========================================================================
    // Summarization
    // =========================================================================

    summarizeConversation: async (conversationId: string) => {
      try {
        await whenReady

        const conversation = conversations.get(conversationId)
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
        const updatedConversation = {
          ...conversation,
          summary,
          updatedAt: new Date(),
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }

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
        await whenReady

        const conversation = conversations.get(conversationId)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        // Update conversation with new title
        const updatedConversation = {
          ...conversation,
          title: newTitle.trim(),
          updatedAt: new Date(),
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({ currentConversation: updatedConversation })
        }
      } catch (error) {
        errorToast('Failed to rename conversation', error)
        throw error
      }
    },
  }
})
