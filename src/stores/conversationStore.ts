import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Conversation, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import { getAgentById } from '@/stores/agentStore'

interface ConversationStore {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean

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
  deleteConversation: (id: string) => Promise<void>
  clearCurrentConversation: () => void
  getConversationTitle: (conversation: Conversation) => string
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,

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

      // Create system message with agent's name, role, and instructions
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `You are ${agent.name}.

### Role:
${agent.role}

### Instructions:
${agent.instructions}`,
        timestamp: new Date(),
      }

      const conversation: Conversation = {
        id: crypto.randomUUID(),
        agentId,
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

  getConversationTitle: (conversation: Conversation) => {
    // Try to get a meaningful title from the first user message
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
}))
