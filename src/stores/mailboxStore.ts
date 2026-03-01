/**
 * Mailbox Store
 *
 * Yjs-backed store for AgentMessage entities — inter-agent communication
 * within orchestration workflows.
 *
 * MVP scope: only 'finding' and 'status' message types.
 * Future types: 'question', 'decision', 'handoff', 'review'.
 *
 * @module stores/mailboxStore
 */

import { create } from 'zustand'
import { agentMessages, whenReady, isReady } from '@/lib/yjs'
import type { AgentMessage } from '@/types'
import { errorToast } from '@/lib/toast'

// ============================================================================
// Helpers
// ============================================================================

function normalizeYjsDate(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString()
  if (
    typeof value === 'string' &&
    value.length > 0 &&
    !isNaN(Date.parse(value))
  )
    return value
  if (typeof value === 'number') return new Date(value).toISOString()
  return new Date(0).toISOString()
}

function getAllMessages(): AgentMessage[] {
  return Array.from(agentMessages.values()).map((m) => {
    const msg = m as unknown as Record<string, unknown>
    return {
      ...msg,
      timestamp: normalizeYjsDate(msg.timestamp),
    } as unknown as AgentMessage
  })
}

// ============================================================================
// Store Interface
// ============================================================================

interface MailboxStore {
  messages: AgentMessage[]
  isLoading: boolean

  loadMessages: () => Promise<void>
  sendMessage: (
    msg: Omit<AgentMessage, 'id' | 'timestamp' | 'read'>,
  ) => Promise<AgentMessage>
  getMessagesForAgent: (agentId: string, workflowId: string) => AgentMessage[]
  getUnreadMessages: (agentId: string, workflowId: string) => AgentMessage[]
  markRead: (messageId: string) => Promise<void>
  getMessagesByWorkflow: (workflowId: string) => AgentMessage[]
  deleteMessagesByWorkflow: (workflowId: string) => Promise<void>
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMailboxStore = create<MailboxStore>((set, get) => ({
  messages: [],
  isLoading: false,

  loadMessages: async () => {
    set({ isLoading: true })
    try {
      if (!isReady()) await whenReady
      set({ messages: getAllMessages(), isLoading: false })
    } catch (error) {
      errorToast('Failed to load messages', error)
      set({ isLoading: false })
    }
  },

  sendMessage: async (msg) => {
    try {
      if (!isReady()) await whenReady

      const message = {
        ...msg,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        read: false,
      } as unknown as AgentMessage

      agentMessages.set(message.id, message)
      set({ messages: [...get().messages, message] })

      return message
    } catch (error) {
      errorToast('Failed to send message', error)
      throw error
    }
  },

  getMessagesForAgent: (agentId, workflowId) => {
    return getAllMessages().filter(
      (m) =>
        m.workflowId === workflowId &&
        (m.to === agentId || m.to === 'broadcast'),
    )
  },

  getUnreadMessages: (agentId, workflowId) => {
    return getAllMessages().filter(
      (m) =>
        m.workflowId === workflowId &&
        (m.to === agentId || m.to === 'broadcast') &&
        !m.read,
    )
  },

  markRead: async (messageId) => {
    try {
      if (!isReady()) await whenReady

      const msg = agentMessages.get(messageId)
      if (!msg) return

      const updated = { ...msg, read: true }
      agentMessages.set(messageId, updated)

      set({
        messages: get().messages.map((m) =>
          m.id === messageId ? (updated as AgentMessage) : m,
        ),
      })
    } catch (error) {
      errorToast('Failed to mark message as read', error)
    }
  },

  getMessagesByWorkflow: (workflowId) => {
    return getAllMessages()
      .filter((m) => m.workflowId === workflowId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
  },

  deleteMessagesByWorkflow: async (workflowId) => {
    try {
      if (!isReady()) await whenReady

      const toDelete = getAllMessages().filter(
        (m) => m.workflowId === workflowId,
      )
      for (const msg of toDelete) {
        agentMessages.delete(msg.id)
      }

      set({
        messages: get().messages.filter((m) => m.workflowId !== workflowId),
      })
    } catch (error) {
      errorToast('Failed to delete messages', error)
    }
  },
}))

// ============================================================================
// Non-React Exports (for use in lib/ code)
// ============================================================================

export function sendMessage(
  msg: Omit<AgentMessage, 'id' | 'timestamp' | 'read'>,
): Promise<AgentMessage> {
  return useMailboxStore.getState().sendMessage(msg)
}

export function getMessagesForAgent(
  agentId: string,
  workflowId: string,
): AgentMessage[] {
  return useMailboxStore.getState().getMessagesForAgent(agentId, workflowId)
}

export function getUnreadMessages(
  agentId: string,
  workflowId: string,
): AgentMessage[] {
  return useMailboxStore.getState().getUnreadMessages(agentId, workflowId)
}

export function markRead(messageId: string): Promise<void> {
  return useMailboxStore.getState().markRead(messageId)
}

export function getMessagesByWorkflow(workflowId: string): AgentMessage[] {
  return useMailboxStore.getState().getMessagesByWorkflow(workflowId)
}
