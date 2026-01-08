import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Card,
  Link,
  Button,
  Textarea,
  Chip,
  Spinner,
  Checkbox,
  CheckboxGroup,
  Input,
  Tabs,
  Tab,
} from '@heroui/react'

import {
  useContextualPanelStore,
  type PanelBlock,
} from '@/stores/contextualPanelStore'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import { useConversationStore } from '@/stores/conversationStore'
import { MarkdownRenderer, Icon } from '@/components'
import type {
  Agent,
  AgentMemoryEntry,
  KnowledgeItem,
  Message,
  PinnedMessage,
} from '@/types'
import { useI18n, useUrl } from '@/i18n'
import { successToast, errorToast } from '@/lib/toast'
import { db } from '@/lib/db'
import { formatBytes } from '@/lib/format'
import { updateAgent } from '@/stores/agentStore'
import localI18n from './i18n'

/**
 * Custom hook to manage contextual panel blocks for agent run page
 */
export const useAgentContextPanel = (
  selectedAgent: Agent | null,
  currentConversationId: string | undefined,
  onAgentUpdate?: (agent: Agent) => void,
) => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)

  const selectedAgentRef = useRef(selectedAgent)
  selectedAgentRef.current = selectedAgent

  const onAgentUpdateRef = useRef(onAgentUpdate)
  onAgentUpdateRef.current = onAgentUpdate

  const currentConversationIdRef = useRef(currentConversationId)
  currentConversationIdRef.current = currentConversationId

  // Function to build all blocks - extracted to avoid recreation
  const buildBlocks = useCallback(async (): Promise<PanelBlock[]> => {
    const agent = selectedAgentRef.current
    const conversationId = currentConversationIdRef.current

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
        <EditableAgentProfile
          agent={agent}
          onAgentUpdate={onAgentUpdateRef.current}
        />
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
              <EditableSystemPrompt
                conversationId={conversationId}
                systemMessage={systemMessage}
              />
            ),
          })
        }
      } catch (error) {
        console.warn('Failed to load system prompt:', error)
      }
    }

    // Unified Agent Context block (Knowledge, Memories, Pinned)
    blocks.push({
      id: 'agent-context',
      title: t('Agent Context'),
      icon: 'Brain',
      priority: 2,
      defaultExpanded: false,
      content: (
        <AgentContextTabs
          agent={agent}
          conversationId={conversationId}
          onAgentUpdate={onAgentUpdateRef.current}
        />
      ),
    })

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
        .sort((a, b) => {
          // Sort by updatedAt (most recently active first), fallback to timestamp
          const timeA = a.updatedAt
            ? new Date(a.updatedAt).getTime()
            : new Date(a.timestamp).getTime()
          const timeB = b.updatedAt
            ? new Date(b.updatedAt).getTime()
            : new Date(b.timestamp).getTime()
          return timeB - timeA
        })
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
                  '…'
                const messageCount = conv.messages?.length || 0
                const isCurrentConversation = conv.id === conversationId

                return (
                  <Link
                    key={conv.id}
                    href={url(`/agents/run#${agent.id}/${conv.id}`)}
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

  // Subscribe to conversation store to detect when system prompt becomes available
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  )

  // Track if the current conversation has a system message
  const hasSystemMessage = currentConversation?.messages?.some(
    (m) => m.role === 'system',
  )

  // Main effect - depends on agent ID, conversation ID, and system message availability
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
  }, [selectedAgent, currentConversationId, hasSystemMessage, buildBlocks])

  // Cleanup effect - only runs on unmount
  useEffect(() => {
    return () => {
      useContextualPanelStore.getState().clearBlocks()
    }
  }, [])
}

// Separate component for editable agent profile
const EditableAgentProfile = ({
  agent,
  onAgentUpdate,
}: {
  agent: Agent
  onAgentUpdate?: (agent: Agent) => void
}) => {
  const { t } = useI18n(localI18n)
  const [isEditing, setIsEditing] = useState(false)
  const [editedRole, setEditedRole] = useState(agent.role || '')
  const [editedInstructions, setEditedInstructions] = useState(
    agent.instructions || '',
  )
  const [isSaving, setIsSaving] = useState(false)

  // Sync edited values when agent prop changes (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setEditedRole(agent.role || '')
      setEditedInstructions(agent.instructions || '')
    }
  }, [agent.role, agent.instructions, isEditing])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { updateAgent } = await import('@/stores/agentStore')
      const updatedAgent = await updateAgent(agent.id, {
        role: editedRole,
        instructions: editedInstructions,
      })
      // Notify parent to update the agent state
      onAgentUpdate?.(updatedAgent)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update agent profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedRole(agent.role || '')
    setEditedInstructions(agent.instructions || '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-default-700 mb-1">
            {t('Role')}
          </h4>
          <Textarea
            value={editedRole}
            onValueChange={setEditedRole}
            minRows={1}
            maxRows={3}
            placeholder={t('Enter agent role...')}
            classNames={{
              input: 'text-sm',
            }}
          />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-default-700 mb-1">
            {t('Instructions')}
          </h4>
          <Textarea
            value={editedInstructions}
            onValueChange={setEditedInstructions}
            minRows={10}
            maxRows={20}
            placeholder={t('Enter agent instructions...')}
            classNames={{
              input: 'text-sm font-mono',
            }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="flat"
            onPress={handleCancel}
            isDisabled={isSaving}
          >
            {t('Cancel')}
          </Button>
          <Button
            size="sm"
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
          >
            {t('Save')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
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
            className="text-sm prose dark:prose-invert prose-sm text-default-500"
            renderWidgets={false}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="light"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onPress={() => setIsEditing(true)}
        startContent={<Icon name="EditPencil" className="w-4 h-4" />}
      >
        {t('Edit')}
      </Button>
    </div>
  )
}

// Separate component for editable system prompt
const EditableSystemPrompt = ({
  conversationId,
  systemMessage,
}: {
  conversationId: string
  systemMessage: Message
}) => {
  const { t } = useI18n(localI18n)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(systemMessage.content)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await useConversationStore
        .getState()
        .updateMessage(conversationId, systemMessage.id, editedContent)
      successToast(t('System prompt updated successfully'))
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update system prompt:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedContent(systemMessage.content)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <Textarea
          value={editedContent}
          onValueChange={setEditedContent}
          minRows={10}
          maxRows={20}
          classNames={{
            input: 'text-sm font-mono',
          }}
        />
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="flat"
            onPress={handleCancel}
            isDisabled={isSaving}
          >
            {t('Cancel')}
          </Button>
          <Button
            size="sm"
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
          >
            {t('Save')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      <MarkdownRenderer
        content={systemMessage.content}
        className="prose dark:prose-invert prose-sm text-default-700"
        renderWidgets={false}
      />
      <Button
        size="sm"
        variant="light"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onPress={() => setIsEditing(true)}
        startContent={<Icon name="EditPencil" className="w-4 h-4" />}
      >
        {t('Edit')}
      </Button>
    </div>
  )
}

// Separate component for memories to handle the reload action
const MemoriesContent = ({ memories }: { memories: AgentMemoryEntry[] }) => {
  const { url } = useI18n()

  // const handleToggleGlobal = async (memory: AgentMemoryEntry) => {
  //   const { upgradeToGlobal, downgradeFromGlobal } =
  //     useAgentMemoryStore.getState()
  //   try {
  //     if (memory.isGlobal) {
  //       await downgradeFromGlobal(memory.id)
  //     } else {
  //       await upgradeToGlobal(memory.id)
  //     }
  //     // Note: This won't automatically refresh the panel
  //     // User needs to navigate away and back, or we'd need a more complex refresh mechanism
  //   } catch (error) {
  //     console.error('Failed to update memory global status:', error)
  //   }
  // }

  return (
    <div className="space-y-2">
      {memories.map((memory) => (
        <Link
          key={memory.id}
          href={url(`/knowledge/memories`)}
          className="block"
        >
          <Card className="p-3 hover:bg-default-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{memory.title}</span>
              {/* <span className="pulled-right">
              {memory.isGlobal && (
                <Chip size="sm" color="primary" variant="flat">
                  {t('Global')}
                </Chip>
              )}
              {memory.category.split('|').map((cat, idx) => (
                <Chip key={idx} size="sm" color="default" variant="flat">
                  {t(titleize(cat.replace(/_/g, ' ')) as any)}
                </Chip>
              ))}
            </span> */}
              {/* <Button
              size="sm"
              variant="light"
              color={memory.isGlobal ? 'danger' : 'primary'}
              isIconOnly
              title={memory.isGlobal ? t('Remove Global') : t('Make Global')}
              onPress={() => handleToggleGlobal(memory)}
            >
              <Icon size="sm" name={memory.isGlobal ? 'Xmark' : 'Share'} />
            </Button> */}
            </div>
            <p className="text-sm text-default-600 mt-1">{memory.content}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// Separate component for agent knowledge items
const AgentKnowledgeContent = ({
  agent,
  onAgentUpdate,
}: {
  agent: Agent
  onAgentUpdate?: (agent: Agent) => void
}) => {
  const { t, lang } = useI18n(localI18n)
  const { url } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [allKnowledgeItems, setAllKnowledgeItems] = useState<KnowledgeItem[]>(
    [],
  )
  const [selectedIds, setSelectedIds] = useState<string[]>(
    agent.knowledgeItemIds || [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load knowledge items
  useEffect(() => {
    const loadKnowledgeItems = async () => {
      setIsLoading(true)
      try {
        if (!db.isInitialized()) {
          await db.init()
        }

        if (!db.hasStore('knowledgeItems')) {
          setKnowledgeItems([])
          setAllKnowledgeItems([])
          setIsLoading(false)
          return
        }

        const items = await db.getAll('knowledgeItems')
        // Only show files, not folders
        const fileItems = items.filter((item) => item.type === 'file')
        fileItems.sort(
          (a, b) =>
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime(),
        )
        setAllKnowledgeItems(fileItems)

        // Filter to only show associated knowledge items initially
        const associatedItems = fileItems.filter((item) =>
          agent.knowledgeItemIds?.includes(item.id),
        )
        setKnowledgeItems(associatedItems)
      } catch (error) {
        console.error('Error loading knowledge items:', error)
        setKnowledgeItems([])
        setAllKnowledgeItems([])
      } finally {
        setIsLoading(false)
      }
    }

    loadKnowledgeItems()
  }, [agent.knowledgeItemIds])

  // Sync selectedIds when agent prop changes
  useEffect(() => {
    if (!isEditing) {
      setSelectedIds(agent.knowledgeItemIds || [])
    }
  }, [agent.knowledgeItemIds, isEditing])

  // Filter all knowledge items based on search term
  const filteredItems = allKnowledgeItems.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(term))
    )
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedAgent = await updateAgent(agent.id, {
        knowledgeItemIds: selectedIds,
      })
      onAgentUpdate?.(updatedAgent)
      // Update displayed items to reflect new selection
      const newAssociatedItems = allKnowledgeItems.filter((item) =>
        selectedIds.includes(item.id),
      )
      setKnowledgeItems(newAssociatedItems)
      setIsEditing(false)
      successToast(t('Knowledge items updated successfully'))
    } catch (error) {
      console.error('Failed to update agent knowledge:', error)
      errorToast(t('Failed to update knowledge items'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedIds(agent.knowledgeItemIds || [])
    setSearchTerm('')
    setIsEditing(false)
  }

  const handleSelectionChange = (values: string[]) => {
    setSelectedIds(values)
  }

  const getFileIcon = (item: KnowledgeItem) => {
    switch (item.fileType) {
      case 'image':
        return <Icon name="Page" className="w-4 h-4 text-success" />
      case 'document':
        return <Icon name="Document" className="w-4 h-4 text-warning" />
      case 'text':
      default:
        return <Icon name="Page" className="w-4 h-4 text-primary" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-3 overflow-hidden">
        <Input
          placeholder={t('Search knowledge items…')}
          value={searchTerm}
          onValueChange={setSearchTerm}
          size="sm"
          startContent={
            <Icon name="PageSearch" className="w-4 h-4 text-default-400" />
          }
        />

        {allKnowledgeItems.length === 0 ? (
          <div className="text-center text-default-500 py-4">
            <Icon name="Book" className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('No knowledge items found.')}</p>
            <Link
              href={url('/knowledge')}
              className="text-sm text-primary mt-1 block"
            >
              {t('Add files to your knowledge base')}
            </Link>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto overflow-x-hidden">
            <CheckboxGroup
              value={selectedIds}
              onValueChange={handleSelectionChange}
              className="gap-1"
            >
              {filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                const toggleSelection = () => {
                  if (isSelected) {
                    handleSelectionChange(
                      selectedIds.filter((id) => id !== item.id),
                    )
                  } else {
                    handleSelectionChange([...selectedIds, item.id])
                  }
                }
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded-lg hover:bg-default-100 cursor-pointer transition-colors min-w-0 w-full ${
                      isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                    onClick={toggleSelection}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleSelection()
                      }
                    }}
                  >
                    <Checkbox
                      value={item.id}
                      size="sm"
                      isSelected={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                    <span className="flex-shrink-0">{getFileIcon(item)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{item.name}</p>
                      <span className="text-xs text-default-400 block">
                        {formatBytes(item.size || 0, lang)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </CheckboxGroup>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Chip size="sm" variant="flat" color="primary">
            {t('{count} selected', { count: selectedIds.length })}
          </Chip>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={handleCancel}
              isDisabled={isSaving}
            >
              {t('Cancel')}
            </Button>
            <Button
              size="sm"
              color="primary"
              onPress={handleSave}
              isLoading={isSaving}
            >
              {t('Save')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Display mode
  if (knowledgeItems.length === 0) {
    return (
      <div className="relative group">
        <p className="text-default-500 text-sm">
          {t('No knowledge items associated with this agent.')}
        </p>
        <Button
          size="sm"
          variant="light"
          className="mt-2"
          onPress={() => setIsEditing(true)}
          startContent={<Icon name="Plus" className="w-4 h-4" />}
        >
          {t('Add knowledge')}
        </Button>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="space-y-2">
        {knowledgeItems.map((item) => (
          <Card key={item.id} className="p-2">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className="flex-shrink-0">{getFileIcon(item)}</span>
              <div className="flex-1 min-w-0 overflow-hidden">
                <span className="text-sm font-medium truncate block">
                  {item.name}
                </span>
                <span className="text-xs text-default-400">
                  {formatBytes(item.size || 0, lang)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button
        size="sm"
        variant="light"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onPress={() => setIsEditing(true)}
        startContent={<Icon name="EditPencil" className="w-4 h-4" />}
      >
        {t('Edit')}
      </Button>
    </div>
  )
}

// Unified Agent Context component with tabs for Knowledge, Memories, and Pinned
const AgentContextTabs = ({
  agent,
  conversationId,
  onAgentUpdate,
}: {
  agent: Agent
  conversationId: string | undefined
  onAgentUpdate?: (agent: Agent) => void
}) => {
  const { t, lang } = useI18n(localI18n)
  const url = useUrl(lang)
  const [selectedTab, setSelectedTab] = useState<string>('knowledge')
  const [memories, setMemories] = useState<AgentMemoryEntry[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [isLoadingMemories, setIsLoadingMemories] = useState(true)
  const [isLoadingPinned, setIsLoadingPinned] = useState(true)

  // Load memories
  useEffect(() => {
    const loadMemories = async () => {
      setIsLoadingMemories(true)
      try {
        const { getRelevantMemoriesAsync } = useAgentMemoryStore.getState()
        const loadedMemories = await getRelevantMemoriesAsync(agent.id)
        setMemories(loadedMemories)
      } catch (error) {
        console.warn('Failed to load agent memories:', error)
        setMemories([])
      } finally {
        setIsLoadingMemories(false)
      }
    }
    loadMemories()
  }, [agent.id])

  // Load pinned messages
  useEffect(() => {
    const loadPinned = async () => {
      setIsLoadingPinned(true)
      try {
        const { getRelevantPinnedMessagesAsync } =
          usePinnedMessageStore.getState()
        const loadedPinned = await getRelevantPinnedMessagesAsync(
          agent.id,
          conversationId || '',
          [],
          20,
        )
        setPinnedMessages(loadedPinned)
      } catch (error) {
        console.warn('Failed to load pinned messages:', error)
        setPinnedMessages([])
      } finally {
        setIsLoadingPinned(false)
      }
    }
    loadPinned()
  }, [agent.id, conversationId])

  return (
    <div className="space-y-3">
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        size="sm"
        variant="light"
      >
        <Tab key="knowledge" title={t('Files')} />
        <Tab key="memories" title={t('Memories')} />
        <Tab key="pinned" title={t('Messages')} />
      </Tabs>

      <div className="pt-1">
        {selectedTab === 'knowledge' && (
          <AgentKnowledgeContent agent={agent} onAgentUpdate={onAgentUpdate} />
        )}

        {selectedTab === 'memories' && (
          <>
            {isLoadingMemories ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : memories.length === 0 ? (
              <p className="text-default-500 text-sm">
                {t(
                  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.',
                )}
              </p>
            ) : (
              <MemoriesContent memories={memories} />
            )}
          </>
        )}

        {selectedTab === 'pinned' && (
          <>
            {isLoadingPinned ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : pinnedMessages.length === 0 ? (
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
                    href={url(
                      `/agents/run#${pm.agentId}/${pm.conversationId}?message=${pm.messageId}`,
                    )}
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
