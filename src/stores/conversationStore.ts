import { create } from 'zustand'
import { conversations, whenReady } from '@/lib/yjs'
import type { Conversation, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import { ConversationTitleGenerator } from '@/lib/conversation-title-generator'
import { getAgentById } from '@/stores/agentStore'
import {
  encryptFields,
  decryptFields,
  encryptField,
  MESSAGE_ENCRYPTED_FIELDS,
  CONVERSATION_ENCRYPTED_FIELDS,
  encryptStringArray,
  decryptStringArray,
  encryptAttachments,
  decryptAttachments,
  safeString,
} from '@/lib/crypto/content-encryption'

// ============================================================================
// Encryption Helpers
// ============================================================================

/**
 * Encrypt a conversation's content fields for storage in Yjs.
 * Encrypts message.content and pinnedDescription, message attachments (data + name),
 * conversation.summary, conversation.title, and quickReplies.
 */
async function encryptConversationForStorage(
  conv: Conversation,
): Promise<Conversation> {
  const encryptedMessages = await Promise.all(
    conv.messages.map(async (msg) => {
      // Encrypt flat string fields (content, pinnedDescription)
      const encryptedMsg = (await encryptFields(msg, [
        ...MESSAGE_ENCRYPTED_FIELDS,
      ])) as Message
      // Encrypt attachment data + name
      if (msg.attachments && msg.attachments.length > 0) {
        encryptedMsg.attachments = await encryptAttachments(msg.attachments)
      }
      return encryptedMsg
    }),
  )
  const result = { ...conv, messages: encryptedMessages as Message[] }
  // Encrypt quickReplies (string array)
  if (conv.quickReplies && conv.quickReplies.length > 0) {
    result.quickReplies = (await encryptStringArray(
      conv.quickReplies,
    )) as string[]
  }
  // Encrypt conversation-level fields (summary, title)
  return encryptFields(result, [
    ...CONVERSATION_ENCRYPTED_FIELDS,
  ]) as Promise<Conversation>
}

/**
 * Decrypt a conversation's content fields after reading from Yjs.
 * Handles backward compatibility: unencrypted data passes through unchanged.
 */
async function decryptConversationFromStorage(
  conv: Conversation,
): Promise<Conversation> {
  const decryptedMessages = await Promise.all(
    conv.messages.map(async (msg) => {
      // Decrypt flat string fields (content, pinnedDescription)
      const decryptedMsg = (await decryptFields(msg, [
        ...MESSAGE_ENCRYPTED_FIELDS,
      ])) as Message
      // Decrypt attachment data + name
      if (msg.attachments && msg.attachments.length > 0) {
        decryptedMsg.attachments = await decryptAttachments(msg.attachments)
      }
      return decryptedMsg
    }),
  )
  const result = { ...conv, messages: decryptedMessages as Message[] }
  // Decrypt quickReplies
  if (conv.quickReplies && conv.quickReplies.length > 0) {
    result.quickReplies = (await decryptStringArray(
      conv.quickReplies as (
        | string
        | import('@/lib/crypto/content-encryption').EncryptedField
      )[],
    )) as string[]
  }
  // Decrypt conversation-level fields (summary, title)
  return decryptFields(result, [
    ...CONVERSATION_ENCRYPTED_FIELDS,
  ]) as Promise<Conversation>
}

/**
 * Lightweight decryption of conversation metadata (title, summary) for sidebar display.
 * Does NOT decrypt message content or attachments — much faster for list rendering.
 */
async function decryptConversationMetadata(
  conv: Conversation,
): Promise<Conversation> {
  return decryptFields(conv, [
    ...CONVERSATION_ENCRYPTED_FIELDS,
  ]) as Promise<Conversation>
}

// ============================================================================
// Helper: Normalize a date value that may have been corrupted by Yjs binary
// serialization (Date objects have no enumerable properties, so Yjs encodes
// them as empty plain objects {} which survive as {} after page reload).
// ============================================================================
function normalizeYjsDate(value: unknown): string | Date {
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString()
  if (typeof value === 'string' || typeof value === 'number')
    return value as string
  // Yjs encoded the Date as {} — return epoch 0 (clearly invalid, but safe; avoids
  // claiming this conversation was created "right now" which would corrupt backups)
  return new Date(0).toISOString()
}

// ============================================================================
// Helper: Get all conversations from Yjs map
// ============================================================================
function getAllConversations(): Conversation[] {
  return Array.from(conversations.values()).map((conv) => ({
    ...conv,
    timestamp: normalizeYjsDate(conv.timestamp),
    updatedAt: normalizeYjsDate(conv.updatedAt),
  }))
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

  // Quick replies
  updateQuickReplies: (
    conversationId: string,
    quickReplies: string[],
  ) => Promise<void>
}

export const useConversationStore = create<ConversationStore>((set, get) => {
  // Subscribe to Yjs changes to keep Zustand state in sync
  conversations.observe(() => {
    const allConversations = getAllConversations()
    const { currentConversation } = get()

    // Decrypt metadata (title, summary) for sidebar display
    Promise.all(
      allConversations.map((conv) => decryptConversationMetadata(conv)),
    ).then((decryptedList) => {
      set({ conversations: decryptedList })
    })

    // If current conversation changed in Yjs, async-decrypt and update state
    if (currentConversation) {
      const rawUpdated = conversations.get(currentConversation.id)
      if (rawUpdated) {
        decryptConversationFromStorage(rawUpdated).then((decrypted) => {
          set({ currentConversation: decrypted })
        })
      } else {
        set({ currentConversation: null })
      }
    }
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
        // Decrypt metadata (title, summary) for sidebar display
        const decryptedList = await Promise.all(
          allConversations.map((conv) => decryptConversationMetadata(conv)),
        )
        set({ conversations: decryptedList, isLoading: false })
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
          // Decrypt content fields from storage
          const decrypted = await decryptConversationFromStorage(conversation)

          // Migrate legacy conversations: backfill agentSlug if missing
          if (!decrypted.agentSlug && decrypted.agentId) {
            const agent = await getAgentById(decrypted.agentId)
            if (agent?.slug) {
              const updatedConversation = {
                ...decrypted,
                agentSlug: agent.slug,
              }
              // Persist the migration to Yjs (re-encrypt)
              const encrypted =
                await encryptConversationForStorage(updatedConversation)
              conversations.set(id, encrypted)
              set({
                currentConversation: updatedConversation,
                isLoading: false,
              })
              return updatedConversation
            }
          }

          set({ currentConversation: decrypted, isLoading: false })
          return decrypted
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
        const now = new Date().toISOString()
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
          timestamp: new Date().toISOString(),
        }

        // Encrypt the new message content and pinnedDescription for Yjs storage
        const encryptedMessage = (await encryptFields(newMessage, [
          ...MESSAGE_ENCRYPTED_FIELDS,
        ])) as Message

        // Encrypt attachments (data + name) if present
        if (newMessage.attachments && newMessage.attachments.length > 0) {
          encryptedMessage.attachments = await encryptAttachments(
            newMessage.attachments,
          )
        }

        // Clone for immutability — work with the raw (encrypted) conversation from Yjs
        const updatedConversation = { ...conversation }

        // If this is an assistant message with an agentId, add agent to participating agents
        if (message.role === 'assistant' && message.agentId) {
          // Initialize participatingAgents if it doesn't exist (backward compatibility)
          if (!updatedConversation.participatingAgents) {
            updatedConversation.participatingAgents = [
              updatedConversation.agentId,
            ]
          }
          if (
            !updatedConversation.participatingAgents.includes(message.agentId)
          ) {
            updatedConversation.participatingAgents = [
              ...updatedConversation.participatingAgents,
              message.agentId,
            ]
          }
        }

        // Add encrypted message to the array (existing messages already encrypted)
        updatedConversation.messages = [
          ...conversation.messages,
          encryptedMessage,
        ]
        updatedConversation.updatedAt = new Date().toISOString()

        // Write encrypted conversation to Yjs
        conversations.set(conversationId, updatedConversation)

        // For Zustand state, use the decrypted version from existing state + plaintext new message
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          const decryptedState = {
            ...currentConversation,
            ...(!currentConversation.participatingAgents
              ? {}
              : {
                  participatingAgents: updatedConversation.participatingAgents,
                }),
            messages: [...currentConversation.messages, newMessage],
            updatedAt: updatedConversation.updatedAt,
          }
          set({ currentConversation: decryptedState, isLoading: false })
        } else {
          set({ isLoading: false })
        }

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
          updatedConversation.participatingAgents = [
            updatedConversation.agentId,
          ]
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
      // Use stored title if available and it is a string (not an encrypted field)
      const title = safeString(conversation.title)
      if (title) {
        return title
      }

      // Fallback to first user message truncation (legacy behavior)
      const firstUserMessage = conversation.messages.find(
        (msg) => msg.role === 'user',
      )

      if (firstUserMessage && typeof firstUserMessage.content === 'string') {
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
        const title =
          await ConversationTitleGenerator.generateTitle(conversation)

        // Encrypt title for Yjs storage
        const encryptedTitle = await encryptField(title)
        const updatedConversation = {
          ...conversation,
          title: (encryptedTitle ?? title) as unknown as string,
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        // Update currentConversation with plaintext title
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({
            currentConversation: { ...currentConversation, title },
          })
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

        // Encrypt title for Yjs storage
        const encryptedTitle = await encryptField(title)
        const updatedConversation = {
          ...conversation,
          title: (encryptedTitle ?? title) as unknown as string,
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        // Update currentConversation with plaintext title
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({
            currentConversation: { ...currentConversation, title },
          })
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
        // Search in title (skip if encrypted — typeof check)
        if (
          typeof conversation.title === 'string' &&
          conversation.title.toLowerCase().includes(lowerQuery)
        ) {
          return true
        }

        // Search in summary (skip if encrypted — typeof check)
        if (
          typeof conversation.summary === 'string' &&
          conversation.summary.toLowerCase().includes(lowerQuery)
        ) {
          return true
        }

        // Search in message content (skip encrypted messages — typeof check)
        return conversation.messages.some(
          (message) =>
            typeof message.content === 'string' &&
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
          pinnedAt: new Date().toISOString(),
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
          updatedAt: new Date().toISOString(),
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
          updatedAt: new Date().toISOString(),
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

        // Encrypt the new content for Yjs storage
        const encryptedContent = await encryptField(content)

        // Clone conversation and messages — update with encrypted content for Yjs
        const updatedMessages = [...conversation.messages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          content: (encryptedContent ?? content) as unknown as string,
        }

        const updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        }

        // Write encrypted to Yjs
        conversations.set(conversationId, updatedConversation)

        // For Zustand state, use plaintext content
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          const stateMessages = [...currentConversation.messages]
          if (messageIndex < stateMessages.length) {
            stateMessages[messageIndex] = {
              ...stateMessages[messageIndex],
              content,
            }
          }
          set({
            currentConversation: {
              ...currentConversation,
              messages: stateMessages,
              updatedAt: updatedConversation.updatedAt,
            },
          })
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

        // Decrypt conversation for the summarizer to work with plaintext
        const decrypted = await decryptConversationFromStorage(conversation)

        // Dynamically import the summarizer to avoid circular dependencies
        const { ConversationSummarizer } = await import(
          '@/lib/conversation-summarizer'
        )

        const summary =
          await ConversationSummarizer.summarizeConversation(decrypted)

        // Encrypt the summary for Yjs storage
        const encryptedSummary = await encryptField(summary)

        // Update conversation with encrypted summary in Yjs
        const updatedConversation = {
          ...conversation,
          summary: (encryptedSummary ?? summary) as unknown as string,
          updatedAt: new Date().toISOString(),
        }

        // Write encrypted to Yjs
        conversations.set(conversationId, updatedConversation)

        // For Zustand state, use plaintext summary
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({
            currentConversation: {
              ...currentConversation,
              summary,
              updatedAt: updatedConversation.updatedAt,
            },
          })
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

        const trimmedTitle = newTitle.trim()

        // Encrypt title for Yjs storage
        const encryptedTitle = await encryptField(trimmedTitle)
        const updatedConversation = {
          ...conversation,
          title: (encryptedTitle ?? trimmedTitle) as unknown as string,
          updatedAt: new Date().toISOString(),
        }

        // Write to Yjs
        conversations.set(conversationId, updatedConversation)

        // For Zustand state, use plaintext title
        const { currentConversation } = get()
        if (currentConversation?.id === conversationId) {
          set({
            currentConversation: {
              ...currentConversation,
              title: trimmedTitle,
              updatedAt: updatedConversation.updatedAt,
            },
          })
        }
      } catch (error) {
        errorToast('Failed to rename conversation', error)
        throw error
      }
    },

    updateQuickReplies: async (
      conversationId: string,
      quickReplies: string[],
    ) => {
      const conversation = conversations.get(conversationId)
      if (!conversation) return

      // Encrypt quickReplies for Yjs storage
      const encryptedReplies =
        quickReplies.length > 0
          ? ((await encryptStringArray(quickReplies)) as string[])
          : undefined

      const updatedConversation = {
        ...conversation,
        quickReplies: encryptedReplies,
      }

      conversations.set(conversationId, updatedConversation)

      // For Zustand state, use plaintext quickReplies
      const { currentConversation } = get()
      if (currentConversation?.id === conversationId) {
        set({
          currentConversation: {
            ...currentConversation,
            quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
          },
        })
      }
    },
  }
})
