import { create } from 'zustand'
import { db } from '@/lib/db'
import type { SharedContext } from '@/types'
import { errorToast, successToast } from '@/lib/toast'

interface ContextStore {
  contexts: SharedContext[]
  isLoading: boolean

  loadContexts: () => Promise<void>
  publishContext: (
    contextData: Omit<SharedContext, 'id' | 'createdAt'>,
  ) => Promise<SharedContext>
  updateContext: (id: string, updates: Partial<SharedContext>) => Promise<void>
  deleteContext: (id: string) => Promise<void>
  expireContext: (id: string) => Promise<void>
  cleanupExpiredContexts: () => Promise<void>
  getContextsByTask: (taskId: string) => SharedContext[]
  getContextsByAgent: (agentId: string) => SharedContext[]
  getContextsByType: (
    contextType: SharedContext['contextType'],
  ) => SharedContext[]
  getRelevantContexts: (agentId: string, keywords?: string[]) => SharedContext[]
  subscribeToContext: (agentId: string, keywords: string[]) => SharedContext[]
}

export const useContextStore = create<ContextStore>((set, get) => ({
  contexts: [],
  isLoading: false,

  loadContexts: async () => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      const contexts = await db.getAll('contexts')

      // Filter out expired contexts
      const now = new Date()
      const validContexts = contexts.filter(
        (ctx) => !ctx.expiryDate || ctx.expiryDate > now,
      )

      set({ contexts: validContexts, isLoading: false })
    } catch (error) {
      errorToast('Failed to load contexts', error)
      set({ isLoading: false })
    }
  },

  publishContext: async (contextData) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const context: SharedContext = {
        ...contextData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      }

      await db.add('contexts', context)

      const updatedContexts = [...get().contexts, context]
      set({
        contexts: updatedContexts,
        isLoading: false,
      })

      return context
    } catch (error) {
      errorToast('Failed to publish context', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateContext: async (id: string, updates: Partial<SharedContext>) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const context = await db.get('contexts', id)
      if (!context) {
        throw new Error('Context not found')
      }

      const updatedContext: SharedContext = {
        ...context,
        ...updates,
        id,
      }

      await db.update('contexts', updatedContext)

      const { contexts } = get()
      const updatedContexts = contexts.map((c) =>
        c.id === id ? updatedContext : c,
      )

      set({
        contexts: updatedContexts,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to update context', error)
      set({ isLoading: false })
    }
  },

  deleteContext: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.delete('contexts', id)

      const { contexts } = get()
      const updatedContexts = contexts.filter((c) => c.id !== id)

      set({
        contexts: updatedContexts,
        isLoading: false,
      })

      successToast('Context deleted successfully')
    } catch (error) {
      errorToast('Failed to delete context', error)
      set({ isLoading: false })
    }
  },

  expireContext: async (id: string) => {
    await get().updateContext(id, { expiryDate: new Date() })
  },

  cleanupExpiredContexts: async () => {
    set({ isLoading: true })
    try {
      const now = new Date()
      const { contexts } = get()
      const expiredContexts = contexts.filter(
        (ctx) => ctx.expiryDate && ctx.expiryDate <= now,
      )

      for (const context of expiredContexts) {
        await get().deleteContext(context.id)
      }

      set({ isLoading: false })
    } catch (error) {
      errorToast('Failed to cleanup expired contexts', error)
      set({ isLoading: false })
    }
  },

  getContextsByTask: (taskId: string) => {
    const now = new Date()
    return get().contexts.filter(
      (context) =>
        context.taskId === taskId &&
        (!context.expiryDate || context.expiryDate > now),
    )
  },

  getContextsByAgent: (agentId: string) => {
    const now = new Date()
    return get().contexts.filter(
      (context) =>
        context.agentId === agentId &&
        (!context.expiryDate || context.expiryDate > now),
    )
  },

  getContextsByType: (contextType: SharedContext['contextType']) => {
    const now = new Date()
    return get().contexts.filter(
      (context) =>
        context.contextType === contextType &&
        (!context.expiryDate || context.expiryDate > now),
    )
  },

  getRelevantContexts: (agentId: string, keywords: string[] = []) => {
    const now = new Date()
    return get().contexts.filter((context) => {
      // Check if context is expired
      if (context.expiryDate && context.expiryDate <= now) return false

      // Check if agent is in relevant agents list
      if (context.relevantAgents.includes(agentId)) return true

      // If keywords provided, check if any keyword matches title or content
      if (keywords.length > 0) {
        const searchText = (context.title + ' ' + context.content).toLowerCase()
        return keywords.some((keyword) =>
          searchText.includes(keyword.toLowerCase()),
        )
      }

      return false
    })
  },

  subscribeToContext: (agentId: string, keywords: string[]) => {
    return get().getRelevantContexts(agentId, keywords)
  },
}))
