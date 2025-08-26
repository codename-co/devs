import { useContextStore } from '@/stores/contextStore'
import type { SharedContext, Agent } from '@/types'

export interface ContextSubscription {
  agentId: string
  keywords: string[]
  contextTypes: SharedContext['contextType'][]
  callback?: (contexts: SharedContext[]) => void
}

export class ContextBroker {
  private static subscriptions: Map<string, ContextSubscription> = new Map()

  static async publishContext(
    contextData: Omit<SharedContext, 'id' | 'createdAt'>,
  ): Promise<SharedContext> {
    try {
      const { publishContext } = useContextStore.getState()
      const context = await publishContext(contextData)

      // Notify subscribers
      await this.notifySubscribers(context)

      return context
    } catch (error) {
      console.error('Failed to publish context:', error)
      throw error
    }
  }

  static async subscribeToContext(
    subscription: ContextSubscription,
  ): Promise<void> {
    this.subscriptions.set(subscription.agentId, subscription)

    // Immediately send relevant existing contexts
    const relevantContexts = await this.getRelevantContexts(
      subscription.agentId,
      subscription.keywords,
      subscription.contextTypes,
    )

    if (subscription.callback && relevantContexts.length > 0) {
      subscription.callback(relevantContexts)
    }
  }

  static unsubscribeFromContext(agentId: string): void {
    this.subscriptions.delete(agentId)
  }

  static async getRelevantContexts(
    agentId: string,
    keywords: string[] = [],
    contextTypes: SharedContext['contextType'][] = [],
  ): Promise<SharedContext[]> {
    const { contexts } = useContextStore.getState()
    const now = new Date()

    return contexts.filter((context) => {
      // Check if context is expired
      if (context.expiryDate && context.expiryDate <= now) {
        return false
      }

      // Check if agent is in relevant agents list
      if (context.relevantAgents.includes(agentId)) {
        return true
      }

      // Check context type filter
      if (
        contextTypes.length > 0 &&
        !contextTypes.includes(context.contextType)
      ) {
        return false
      }

      // Check keyword matches
      if (keywords.length > 0) {
        const searchText = (context.title + ' ' + context.content).toLowerCase()
        return keywords.some((keyword) =>
          searchText.includes(keyword.toLowerCase()),
        )
      }

      return false
    })
  }

  static async updateContextRelevance(
    contextId: string,
    additionalRelevantAgents: string[],
  ): Promise<void> {
    try {
      const { updateContext, contexts } = useContextStore.getState()
      const context = contexts.find((c) => c.id === contextId)

      if (!context) {
        throw new Error('Context not found')
      }

      const updatedRelevantAgents = [
        ...new Set([...context.relevantAgents, ...additionalRelevantAgents]),
      ]

      await updateContext(contextId, {
        relevantAgents: updatedRelevantAgents,
      })

      // Notify newly relevant agents
      const updatedContext = {
        ...context,
        relevantAgents: updatedRelevantAgents,
      }
      await this.notifySpecificAgents(updatedContext, additionalRelevantAgents)
    } catch (error) {
      console.error('Failed to update context relevance:', error)
      throw error
    }
  }

  static async expireContext(contextId: string): Promise<void> {
    try {
      const { expireContext } = useContextStore.getState()
      await expireContext(contextId)
    } catch (error) {
      console.error('Failed to expire context:', error)
      throw error
    }
  }

  static async cleanupExpiredContexts(): Promise<void> {
    try {
      const { cleanupExpiredContexts } = useContextStore.getState()
      await cleanupExpiredContexts()
    } catch (error) {
      console.error('Failed to cleanup expired contexts:', error)
      throw error
    }
  }

  static async getContextsByTask(taskId: string): Promise<SharedContext[]> {
    const { getContextsByTask } = useContextStore.getState()
    return getContextsByTask(taskId)
  }

  static async getContextsByAgent(agentId: string): Promise<SharedContext[]> {
    const { getContextsByAgent } = useContextStore.getState()
    return getContextsByAgent(agentId)
  }

  static async getContextsByType(
    contextType: SharedContext['contextType'],
  ): Promise<SharedContext[]> {
    const { getContextsByType } = useContextStore.getState()
    return getContextsByType(contextType)
  }

  private static async notifySubscribers(
    context: SharedContext,
  ): Promise<void> {
    for (const [agentId, subscription] of this.subscriptions) {
      try {
        // Check if agent should receive this context
        const shouldNotify = await this.shouldNotifyAgent(
          agentId,
          context,
          subscription,
        )

        if (shouldNotify && subscription.callback) {
          subscription.callback([context])
        }
      } catch (error) {
        console.error(`Failed to notify agent ${agentId}:`, error)
      }
    }
  }

  private static async notifySpecificAgents(
    context: SharedContext,
    agentIds: string[],
  ): Promise<void> {
    for (const agentId of agentIds) {
      const subscription = this.subscriptions.get(agentId)
      if (subscription?.callback) {
        try {
          subscription.callback([context])
        } catch (error) {
          console.error(`Failed to notify agent ${agentId}:`, error)
        }
      }
    }
  }

  private static async shouldNotifyAgent(
    agentId: string,
    context: SharedContext,
    subscription: ContextSubscription,
  ): Promise<boolean> {
    // Check if agent is explicitly listed as relevant
    if (context.relevantAgents.includes(agentId)) {
      return true
    }

    // Check context type filter
    if (
      subscription.contextTypes.length > 0 &&
      !subscription.contextTypes.includes(context.contextType)
    ) {
      return false
    }

    // Check keyword matches
    if (subscription.keywords.length > 0) {
      const searchText = (context.title + ' ' + context.content).toLowerCase()
      return subscription.keywords.some((keyword) =>
        searchText.includes(keyword.toLowerCase()),
      )
    }

    return false
  }

  static async generateSmartRelevance(
    context: SharedContext,
    availableAgents: Agent[],
  ): Promise<string[]> {
    // Smart algorithm to determine which agents should receive this context
    const relevantAgents: string[] = [...context.relevantAgents]

    const contextKeywords = this.extractKeywords(
      context.title + ' ' + context.content,
    )

    for (const agent of availableAgents) {
      if (relevantAgents.includes(agent.id)) {
        continue // Already relevant
      }

      const agentKeywords = this.extractKeywords(
        agent.name +
          ' ' +
          agent.role +
          ' ' +
          (agent.tags?.join(' ') || '') +
          ' ' +
          agent.instructions,
      )

      // Calculate relevance score
      const commonKeywords = contextKeywords.filter((keyword) =>
        agentKeywords.some(
          (agentKeyword) =>
            agentKeyword.includes(keyword) || keyword.includes(agentKeyword),
        ),
      )

      if (commonKeywords.length > 0) {
        relevantAgents.push(agent.id)
      }
    }

    return relevantAgents
  }

  private static extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            'this',
            'that',
            'with',
            'have',
            'will',
            'from',
            'they',
            'been',
            'were',
          ].includes(word),
      )
  }

  static getSubscriptionStats(): {
    totalSubscriptions: number
    agentIds: string[]
    contextTypeCoverage: Record<SharedContext['contextType'], number>
  } {
    const agentIds = Array.from(this.subscriptions.keys())
    const contextTypeCoverage: Record<SharedContext['contextType'], number> = {
      decision: 0,
      finding: 0,
      resource: 0,
      constraint: 0,
    }

    for (const subscription of this.subscriptions.values()) {
      for (const contextType of subscription.contextTypes) {
        contextTypeCoverage[contextType]++
      }
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      agentIds,
      contextTypeCoverage,
    }
  }
}
