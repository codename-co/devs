import { useEffect, useRef, useCallback } from 'react'
import { Button, Card, Chip, Link } from '@heroui/react'

import {
  useContextualPanelStore,
  type PanelBlock,
} from '@/stores/contextualPanelStore'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import { useConversationStore } from '@/stores/conversationStore'
import { MarkdownRenderer, Icon } from '@/components'
import type { Agent, AgentMemoryEntry } from '@/types'
import { useI18n } from '@/i18n'

/**
 * Custom hook to manage contextual panel blocks for agent run page
 */
export const useAgentContextPanel = (
  selectedAgent: Agent | null,
  currentConversationId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, options?: Record<string, unknown>) => string,
) => {
  const { lang } = useI18n()

  // Store values in refs to avoid them being dependencies
  const tRef = useRef(t)
  tRef.current = t

  const selectedAgentRef = useRef(selectedAgent)
  selectedAgentRef.current = selectedAgent

  const currentConversationIdRef = useRef(currentConversationId)
  currentConversationIdRef.current = currentConversationId

  // Function to build all blocks - extracted to avoid recreation
  const buildBlocks = useCallback(async (): Promise<PanelBlock[]> => {
    const agent = selectedAgentRef.current
    const conversationId = currentConversationIdRef.current
    const t = tRef.current

    if (!agent) return []

    const blocks: PanelBlock[] = []

    // Agent profile block (sync)
    blocks.push({
      id: 'agent-profile',
      title: t('Agent Profile'),
      icon: 'User',
      priority: 1,
      defaultExpanded: false,
      content: (
        <div className="space-y-4">
          {agent.role && (
            <div>
              <h4 className="text-sm font-semibold text-default-700 mb-1">
                {t('Role')}
              </h4>
              <p className="text-sm text-default-600">{agent.role}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-default-700 mb-1">
              {t('Instructions')}
            </h4>
            <MarkdownRenderer
              content={agent.instructions || t('No instructions defined.')}
              className="prose dark:prose-invert prose-sm text-default-700"
              renderWidgets={false}
            />
          </div>
        </div>
      ),
    })

    // System prompt block - shows the actual system prompt from the conversation
    if (conversationId) {
      try {
        const { currentConversation } = useConversationStore.getState()
        const systemMessage = currentConversation?.messages?.find(
          (m) => m.role === 'system',
        )

        if (systemMessage) {
          blocks.push({
            id: 'system-prompt',
            title: t('System Prompt'),
            icon: 'Terminal',
            priority: 1.5,
            defaultExpanded: false,
            content: (
              <MarkdownRenderer
                content={systemMessage.content}
                className="prose dark:prose-invert prose-sm text-default-700"
                renderWidgets={false}
              />
            ),
          })
        }
      } catch (error) {
        console.warn('Failed to load system prompt:', error)
      }
    }

    // Load memories (async)
    try {
      const { getRelevantMemoriesAsync } = useAgentMemoryStore.getState()
      const memories = await getRelevantMemoriesAsync(agent.id)

      blocks.push({
        id: 'agent-memories',
        title: t('Memories'),
        icon: 'Brain',
        priority: 3,
        defaultExpanded: false,
        content:
          memories.length === 0 ? (
            <p className="text-default-500 text-sm">
              {t(
                'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.',
              )}
            </p>
          ) : (
            <MemoriesContent memories={memories} t={t} />
          ),
      })
    } catch (error) {
      console.warn('Failed to load agent memories:', error)
    }

    // Load pinned messages (async)
    try {
      const { getRelevantPinnedMessagesAsync } =
        usePinnedMessageStore.getState()
      const pinnedMessages = await getRelevantPinnedMessagesAsync(
        agent.id,
        conversationId || '',
        [],
        20,
      )

      blocks.push({
        id: 'pinned-messages',
        title: t('Pinned'),
        icon: 'Pin',
        priority: 4,
        defaultExpanded: false,
        content:
          pinnedMessages.length === 0 ? (
            <p className="text-default-500 text-sm">
              {t(
                'No pinned messages yet. Pin important messages from conversations to make them available here.',
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {pinnedMessages.map((pm) => (
                <Link
                  key={pm.id}
                  href={`/agents/run#${pm.agentId}/${pm.conversationId}?message=${pm.messageId}`}
                  className="block"
                >
                  <Card className="p-3 hover:bg-default-100 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {pm.description}
                          </span>
                          <span className="text-xs text-default-400">
                            {new Date(pm.pinnedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-default-600 mt-1 line-clamp-2">
                          {pm.content.length > 150
                            ? pm.content.substring(0, 150) + '…'
                            : pm.content}
                        </p>
                      </div>
                      <Icon
                        name="NavArrowRight"
                        className="w-4 h-4 text-default-400 mt-0.5 flex-shrink-0"
                      />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ),
      })
    } catch (error) {
      console.warn('Failed to load pinned messages:', error)
    }

    // Load conversation history (async)
    try {
      const { conversations, loadConversations } =
        useConversationStore.getState()

      if (conversations.length === 0) {
        await loadConversations()
      }

      const { conversations: loadedConversations } =
        useConversationStore.getState()

      const agentConversations = loadedConversations
        .filter(
          (conv) =>
            conv.agentId === agent.id ||
            conv.participatingAgents?.includes(agent.id),
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 10)

      blocks.push({
        id: 'conversation-history',
        title: t('Conversations history'),
        icon: 'ChatBubble',
        priority: 5,
        defaultExpanded: false,
        content:
          agentConversations.length === 0 ? (
            <p className="text-default-500 text-sm">
              {t(
                'No conversation history yet. Start chatting with this agent to build history.',
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {agentConversations.map((conv) => {
                const title =
                  conv.title ||
                  conv.messages?.[0]?.content?.substring(0, 50) ||
                  t('Untitled conversation')
                const messageCount = conv.messages?.length || 0
                const isCurrentConversation = conv.id === conversationId

                return (
                  <Link
                    key={conv.id}
                    href={`/agents/run#${agent.id}/${conv.id}`}
                    className="block"
                  >
                    <Card
                      className={`p-3 hover:bg-default-100 transition-colors cursor-pointer ${
                        isCurrentConversation ? 'border-primary border-2' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm line-clamp-1">
                              {title.length > 40
                                ? title.substring(0, 40) + '…'
                                : title}
                            </span>
                            {/* {isCurrentConversation && (
                              <Chip size="sm" color="primary" variant="flat">
                                {t('Current')}
                              </Chip>
                            )} */}
                            {conv.isPinned && (
                              <Icon
                                name="Pin"
                                className="w-3 h-3 text-warning"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-default-400">
                              {new Date(conv.timestamp).toLocaleDateString(
                                lang,
                              )}
                            </span>
                            <span className="text-xs text-default-400">•</span>
                            <span className="text-xs text-default-400">
                              {t('{count} messages', {
                                count: messageCount,
                              })}
                            </span>
                          </div>
                        </div>
                        <Icon
                          name="NavArrowRight"
                          className="w-4 h-4 text-default-400 mt-0.5 flex-shrink-0"
                        />
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ),
      })
    } catch (error) {
      console.warn('Failed to load conversation history:', error)
    }

    return blocks
  }, [])

  // Main effect - only depends on agent ID and conversation ID
  useEffect(() => {
    const { setBlocks, clearBlocks } = useContextualPanelStore.getState()
    let isCancelled = false

    if (!selectedAgent) {
      clearBlocks()
      return
    }

    const loadAllBlocks = async () => {
      const blocks = await buildBlocks()
      if (!isCancelled) {
        setBlocks(blocks)
      }
    }

    loadAllBlocks()

    return () => {
      isCancelled = true
    }
  }, [selectedAgent?.id, currentConversationId, buildBlocks])

  // Cleanup effect - only runs on unmount
  useEffect(() => {
    return () => {
      useContextualPanelStore.getState().clearBlocks()
    }
  }, [])
}

// Separate component for memories to handle the reload action
const MemoriesContent = ({
  memories,
  t,
}: {
  memories: AgentMemoryEntry[]
  t: (key: string, options?: Record<string, unknown>) => string
}) => {
  const handleToggleGlobal = async (memory: AgentMemoryEntry) => {
    const { upgradeToGlobal, downgradeFromGlobal } =
      useAgentMemoryStore.getState()
    try {
      if (memory.isGlobal) {
        await downgradeFromGlobal(memory.id)
      } else {
        await upgradeToGlobal(memory.id)
      }
      // Note: This won't automatically refresh the panel
      // User needs to navigate away and back, or we'd need a more complex refresh mechanism
    } catch (error) {
      console.error('Failed to update memory global status:', error)
    }
  }

  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <Card key={memory.id} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{memory.title}</span>
                {memory.isGlobal && (
                  <Chip size="sm" color="primary" variant="flat">
                    {t('Global')}
                  </Chip>
                )}
                <Chip size="sm" color="default" variant="flat">
                  {memory.category}
                </Chip>
              </div>
              <p className="text-sm text-default-600 mt-1">{memory.content}</p>
            </div>
            <Button
              size="sm"
              variant="light"
              color={memory.isGlobal ? 'danger' : 'primary'}
              startContent={
                <Icon size="sm" name={memory.isGlobal ? 'Xmark' : 'Share'} />
              }
              onPress={() => handleToggleGlobal(memory)}
            >
              {memory.isGlobal ? t('Remove Global') : t('Make Global')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
