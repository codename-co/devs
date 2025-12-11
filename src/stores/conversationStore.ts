import { create } from 'zustand'
import { db } from '@/lib/db'
import type {
  Conversation,
  Message,
  AgentMemoryEntry,
  PinnedMessage,
} from '@/types'
import { errorToast } from '@/lib/toast'
import { getAgentById } from '@/stores/agentStore'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import { ConversationTitleGenerator } from '@/lib/conversation-title-generator'

interface ConversationStore {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  searchQuery: string
  showPinnedOnly: boolean

  loadConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
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

  // Summarization
  summarizeConversation: (conversationId: string) => Promise<string>
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
      } else {
        errorToast(
          'Conversation not found',
          'The requested conversation could not be found',
        )
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to load conversations', error)
      set({ isLoading: false })
    }
  },

  createConversation: async (agentId: string, workflowId: string) => {
    set({ isLoading: true })
    try {
      // Ensure database is initialized
      if (!db.isInitialized()) {
        await db.init()
      }

      // Get agent information to create system prompt
      const agent = await getAgentById(agentId)
      if (!agent) {
        throw new Error(`Agent with id ${agentId} not found`)
      }

      // Create a temporary conversation ID to exclude from pinned messages
      const newConversationId = crypto.randomUUID()

      // Fetch relevant memories (agent-specific + global)
      const { getRelevantMemoriesAsync } = useAgentMemoryStore.getState()
      let memories: AgentMemoryEntry[] = []
      try {
        memories = await getRelevantMemoriesAsync(agentId, [], [], 20)
      } catch (error) {
        console.warn('Failed to fetch memories for conversation:', error)
      }

      // Fetch relevant pinned messages from previous conversations
      const { getRelevantPinnedMessagesAsync } =
        usePinnedMessageStore.getState()
      let pinnedMessages: PinnedMessage[] = []
      try {
        pinnedMessages = await getRelevantPinnedMessagesAsync(
          agentId,
          newConversationId, // Exclude current conversation (will be empty for new)
          [],
          10,
        )
      } catch (error) {
        console.warn('Failed to fetch pinned messages for conversation:', error)
      }

      // Build memory context section if there are memories
      let memoryContext = ''
      if (memories.length > 0) {
        const memoryItems = memories.map((m) => {
          const globalTag = m.isGlobal ? ' [Global]' : ''
          return `- **${m.title}**${globalTag}: ${m.content}`
        })
        memoryContext = `

### Learned Context:
The following information has been learned from previous conversations. Use this context to provide more personalized and relevant responses:

${memoryItems.join('\n')}`
      }

      // Build pinned messages context section if there are pinned messages
      let pinnedContext = ''
      if (pinnedMessages.length > 0) {
        const pinnedItems = pinnedMessages.map((pm) => {
          const date = new Date(pm.pinnedAt).toLocaleDateString()
          const snippet =
            pm.content.length > 150
              ? pm.content.substring(0, 150) + '...'
              : pm.content
          return `- **${pm.description}**: ${snippet} (from ${date})`
        })
        pinnedContext = `

### Important Past Conversations:
The following are key moments from your previous conversations with the user:

${pinnedItems.join('\n')}`
      }

      // Create system message with agent's name, role, instructions, memories, and pinned messages
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `You are ${agent.name}.

### Role:
${agent.role}

### Instructions:
${agent.instructions}${memoryContext}${pinnedContext}`,
        timestamp: new Date(),
      }

      const conversation: Conversation = {
        id: newConversationId,
        agentId,
        participatingAgents: [agentId],
        workflowId,
        timestamp: new Date(),
        messages: [systemMessage],
      }

      await db.add('conversations', conversation)

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
}))
