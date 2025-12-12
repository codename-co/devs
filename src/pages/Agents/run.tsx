import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Spinner,
  Chip,
  Card,
  CardBody,
  Accordion,
  AccordionItem,
  Button,
  Textarea,
  Input,
  ButtonGroup,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
} from '@heroui/react'
import { Pin, PinSlash } from 'iconoir-react'

import { useI18n } from '@/i18n'
import {
  Container,
  Icon,
  MarkdownRenderer,
  PromptArea,
  Section,
  Widget,
} from '@/components'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import { getAgentById } from '@/stores/agentStore'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import {
  Agent,
  Message,
  Artifact,
  AgentMemoryEntry,
  MemoryCategory,
  PinnedMessage,
} from '@/types'
import { errorToast, successToast } from '@/lib/toast'
import { submitChat } from '@/lib/chat'
import {
  learnFromMessage,
  processPendingLearningEvents,
} from '@/lib/memory-learning-service'
import { MessageDescriptionGenerator } from '@/lib/message-description-generator'
import { useConversationStore } from '@/stores/conversationStore'
import { useArtifactStore } from '@/stores/artifactStore'
import { categoryLabels } from '../Knowledge'

// Timeline item types for interleaving messages and memories
type TimelineItem =
  | { type: 'message'; data: Message; timestamp: Date }
  | { type: 'memory'; data: AgentMemoryEntry; timestamp: Date }

// Component to display a single message with proper agent context
const MessageDisplay = memo(
  ({
    message,
    selectedAgent,
    getMessageAgent,
    detectContentType,
    isPinned,
    onPinClick,
    onLearnClick,
    isLearning,
    conversationId,
  }: {
    message: Message
    selectedAgent: Agent | null
    getMessageAgent: (message: Message) => Promise<Agent | null>
    detectContentType: (content: string) => string
    isPinned: boolean
    onPinClick: (message: Message) => void
    onLearnClick: (message: Message) => void
    isLearning: boolean
    conversationId: string | undefined
  }) => {
    const { t } = useI18n()
    const [messageAgent, setMessageAgent] = useState<Agent | null>(null)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
      if (message.role === 'assistant') {
        getMessageAgent(message).then(setMessageAgent)
      }
    }, [message, getMessageAgent])

    const displayAgent = messageAgent || selectedAgent
    const isFromDifferentAgent =
      messageAgent && messageAgent.id !== selectedAgent?.id

    // Only show pin button for assistant messages in saved conversations
    const showPinButton = message.role === 'assistant' && conversationId
    // Show learn button for assistant messages in saved conversations
    const showLearnButton = message.role === 'assistant' && conversationId

    return (
      <div
        key={message.id}
        aria-hidden="false"
        tabIndex={0}
        className="flex w-full gap-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`rounded-medium text-foreground group relative overflow-hidden font-medium ${
            message.role === 'user'
              ? 'bg-default-100 px-4 py-3 ml-auto max-w-[80%]'
              : 'bg-transparent px-1 py-0'
          } ${isPinned ? 'border-l-4 border-warning-400 pl-4' : ''}`}
        >
          {/* Pinned indicator chip */}
          {isPinned && (
            <div className="mb-2">
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                startContent={<Pin className="w-3 h-3" />}
                className="text-tiny"
              >
                {t('Pinned')}
              </Chip>
            </div>
          )}
          {/* Show agent name if different from current agent */}
          {isFromDifferentAgent && displayAgent && (
            <div className="mb-2">
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-tiny"
              >
                {displayAgent.name}
              </Chip>
            </div>
          )}
          <div className="text-small text-left">
            <div className="prose prose-neutral text-medium break-words">
              {detectContentType(message.content) === 'marpit-presentation' ? (
                <Widget type="marpit" language="yaml" code={message.content} />
              ) : (
                <MarkdownRenderer
                  content={message.content}
                  className="prose dark:prose-invert prose-sm"
                />
              )}
            </div>
          </div>
          {/* Action buttons - show on hover for assistant messages */}
          {(showPinButton || showLearnButton) && isHovered && (
            <div className="mt-2 flex justify-end gap-1">
              {showLearnButton && (
                <Tooltip content={t('Learn from this message')}>
                  <Button
                    size="sm"
                    variant="light"
                    color="secondary"
                    isIconOnly
                    isLoading={isLearning}
                    onPress={() => onLearnClick(message)}
                  >
                    <Icon name="Brain" className="w-4 h-4" />
                  </Button>
                </Tooltip>
              )}
              {showPinButton && (
                <Tooltip
                  content={isPinned ? t('Unpin message') : t('Pin message')}
                >
                  <Button
                    size="sm"
                    variant={isPinned ? 'flat' : 'light'}
                    color={isPinned ? 'warning' : 'default'}
                    isIconOnly
                    onPress={() => onPinClick(message)}
                  >
                    {isPinned ? (
                      <PinSlash className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
          {/* Show pinned indicator when not hovered */}
          {isPinned && !isHovered && (
            <div className="mt-2 flex justify-end">
              <Tooltip content={t('Unpin message')}>
                <Button
                  size="sm"
                  variant="flat"
                  color="warning"
                  isIconOnly
                  onPress={() => onPinClick(message)}
                >
                  <PinSlash className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    )
  },
)

MessageDisplay.displayName = 'MessageDisplay'

// Component to display artifacts in side panel
const ArtifactWidget = memo(({ artifact }: { artifact: Artifact }) => {
  const characterCount = artifact.content.length
  const statusColor =
    artifact.status === 'approved' || artifact.status === 'final'
      ? 'success'
      : artifact.status === 'rejected'
        ? 'danger'
        : 'warning'

  return (
    <Card className="mb-3">
      <CardBody className="p-3">
        <Accordion selectionMode="single" className="px-0">
          <AccordionItem
            key={artifact.id}
            aria-label={artifact.title}
            title={
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{artifact.title}</span>
                  <div className="flex gap-2 mt-1">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={statusColor}
                      className="text-tiny"
                    >
                      {artifact.status}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="default"
                      className="text-tiny"
                    >
                      {artifact.type}
                    </Chip>
                  </div>
                </div>
                <div className="text-tiny text-default-500">
                  {characterCount.toLocaleString()} chars
                </div>
              </div>
            }
          >
            <div className="space-y-3">
              {artifact.description && (
                <div>
                  <span className="text-tiny font-medium text-default-700">
                    Description:
                  </span>
                  <p className="text-small text-default-600 mt-1">
                    {artifact.description}
                  </p>
                </div>
              )}
              <div>
                <span className="text-tiny font-medium text-default-700">
                  Content:
                </span>
                <div className="mt-1 p-2 bg-default-100 rounded-small max-h-48 overflow-y-auto">
                  <MarkdownRenderer
                    content={artifact.content}
                    className="prose dark:prose-invert prose-sm text-small"
                  />
                </div>
              </div>
              <div className="flex justify-between text-tiny text-default-500">
                <span>
                  Created: {new Date(artifact.createdAt).toLocaleDateString()}
                </span>
                <span>v{artifact.version}</span>
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  )
})

ArtifactWidget.displayName = 'ArtifactWidget'

// Component to display a single inline memory with review actions
const InlineMemoryDisplay = memo(
  ({
    memory,
    onApprove,
    onReject,
    onEdit,
    onRemoveFromList,
  }: {
    memory: AgentMemoryEntry
    onApprove: (id: string) => Promise<void>
    onReject: (id: string) => Promise<void>
    onEdit: (id: string, newContent: string, newTitle?: string) => Promise<void>
    onRemoveFromList: (id: string) => void
  }) => {
    const { t } = useI18n()
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(memory.content)
    const [editTitle, setEditTitle] = useState(memory.title)
    const [isProcessing, setIsProcessing] = useState(false)

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'fact':
          return 'primary'
        case 'preference':
          return 'secondary'
        case 'behavior':
          return 'warning'
        case 'domain_knowledge':
          return 'success'
        case 'relationship':
          return 'danger'
        case 'procedure':
          return 'default'
        case 'correction':
          return 'warning'
        default:
          return 'default'
      }
    }

    // const getConfidenceColor = (confidence: string) => {
    //   switch (confidence) {
    //     case 'high':
    //       return 'success'
    //     case 'medium':
    //       return 'warning'
    //     case 'low':
    //       return 'danger'
    //     default:
    //       return 'default'
    //   }
    // }

    const handleApprove = async () => {
      setIsProcessing(true)
      try {
        await onApprove(memory.id)
        onRemoveFromList(memory.id)
      } finally {
        setIsProcessing(false)
      }
    }

    const handleReject = async () => {
      setIsProcessing(true)
      try {
        await onReject(memory.id)
        onRemoveFromList(memory.id)
      } finally {
        setIsProcessing(false)
      }
    }

    const handleStartEdit = () => {
      setIsEditing(true)
      setEditContent(memory.content)
      setEditTitle(memory.title)
    }

    const handleCancelEdit = () => {
      setIsEditing(false)
      setEditContent(memory.content)
      setEditTitle(memory.title)
    }

    const handleSaveEdit = async () => {
      setIsProcessing(true)
      try {
        await onEdit(memory.id, editContent, editTitle)
        onRemoveFromList(memory.id)
        setIsEditing(false)
      } finally {
        setIsProcessing(false)
      }
    }

    // const formattedTime = new Date(memory.learnedAt).toLocaleTimeString([], {
    //   hour: '2-digit',
    //   minute: '2-digit',
    // })

    return (
      <div className="flex w-full gap-3 animate-appearance-in">
        <div className="w-full">
          <div className="border-l-4 border-secondary-400 dark:border-secondary-600 pl-4 py-2 bg-secondary-50/50 dark:bg-secondary-900/20 rounded-r-lg">
            {/* Header with icon and timestamp */}
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Brain" className="w-4 h-4 text-secondary-500" />
              <span className="text-tiny font-medium text-secondary-600 dark:text-secondary-400">
                {t('Insight')}
              </span>
              <Chip
                size="sm"
                variant="flat"
                color={getCategoryColor(memory.category)}
                className="text-tiny"
              >
                {t(categoryLabels[memory.category as MemoryCategory] as any)}
              </Chip>
            </div>

            {isEditing ? (
              // Edit mode
              <div className="space-y-3">
                <Input
                  label={t('Title')}
                  value={editTitle}
                  onValueChange={setEditTitle}
                  size="sm"
                  variant="bordered"
                />
                <Textarea
                  label={t('Content')}
                  value={editContent}
                  onValueChange={setEditContent}
                  minRows={2}
                  size="sm"
                  variant="bordered"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="flat" onPress={handleCancelEdit}>
                    {t('Cancel')}
                  </Button>
                  <Button
                    size="sm"
                    color="success"
                    isLoading={isProcessing}
                    onPress={handleSaveEdit}
                  >
                    {t('Save & Approve')}
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{memory.title}</span>
                  {/* <Chip
                    size="sm"
                    variant="dot"
                    color={getConfidenceColor(memory.confidence) as any}
                    className="text-tiny"
                  >
                    {memory.confidence}
                  </Chip> */}
                </div>
                <p className="text-sm text-default-600">{memory.content}</p>
                {/* {memory.keywords.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {memory.keywords.slice(0, 5).map((keyword, idx) => (
                      <Chip
                        key={idx}
                        size="sm"
                        variant="bordered"
                        className="text-tiny"
                      >
                        {keyword}
                      </Chip>
                    ))}
                  </div>
                )} */}

                {/* Action buttons */}
                <ButtonGroup size="sm" variant="flat">
                  <Button
                    color="danger"
                    startContent={<Icon name="Xmark" className="w-3 h-3" />}
                    isLoading={isProcessing}
                    onPress={handleReject}
                  >
                    {t('Forget')}
                  </Button>
                  <Button
                    color="default"
                    startContent={
                      <Icon name="EditPencil" className="w-3 h-3" />
                    }
                    onPress={handleStartEdit}
                  >
                    {t('Edit')}
                  </Button>
                  <Button
                    variant="solid"
                    color="success"
                    startContent={<Icon name="Check" className="w-3 h-3" />}
                    isLoading={isProcessing}
                    onPress={handleApprove}
                  >
                    {t('Memorize')}
                  </Button>
                </ButtonGroup>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
)

InlineMemoryDisplay.displayName = 'InlineMemoryDisplay'

export const AgentRunPage = () => {
  const { t, lang, url } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()

  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [response, setResponse] = useState<string>('')
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    [],
  )
  const [agentCache, setAgentCache] = useState<Record<string, Agent>>({})
  const [_conversationArtifacts, setConversationArtifacts] = useState<
    Artifact[]
  >([])

  const {
    currentConversation,
    createConversation,
    loadConversation,
    clearCurrentConversation,
  } = useConversationStore()

  const { artifacts, loadArtifacts } = useArtifactStore()

  // Pinned message state
  const {
    loadPinnedMessagesForConversation,
    createPinnedMessage,
    deletePinnedMessageByMessageId,
    isPinned: checkIsPinned,
    getRelevantPinnedMessagesAsync,
  } = usePinnedMessageStore()

  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [showMemories, setShowMemories] = useState(false)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [agentMemories, setAgentMemories] = useState<AgentMemoryEntry[]>([])
  const [availablePinnedMessages, setAvailablePinnedMessages] = useState<
    PinnedMessage[]
  >([])
  const [learningMessageId, setLearningMessageId] = useState<string | null>(
    null,
  )
  const [newlyLearnedMemories, setNewlyLearnedMemories] = useState<
    AgentMemoryEntry[]
  >([])

  // Pin modal state
  const {
    isOpen: isPinModalOpen,
    onOpen: onPinModalOpen,
    onClose: onPinModalClose,
  } = useDisclosure()
  const [messageToPin, setMessageToPin] = useState<Message | null>(null)
  const [pinDescription, setPinDescription] = useState('')
  const [isPinning, setIsPinning] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  const isConversationPristine = useMemo(
    () => !(Number(currentConversation?.messages.length) > 0),
    [currentConversation],
  )

  // Load agent memories when agent changes
  useEffect(() => {
    const loadMemories = async () => {
      if (selectedAgent) {
        const { getRelevantMemoriesAsync } = useAgentMemoryStore.getState()
        try {
          const memories = await getRelevantMemoriesAsync(selectedAgent.id)
          setAgentMemories(memories)
        } catch (error) {
          console.warn('Failed to load agent memories:', error)
          setAgentMemories([])
        }
      }
    }
    loadMemories()
  }, [selectedAgent?.id])

  // Load available pinned messages from other conversations when agent changes
  useEffect(() => {
    const loadPinnedMessages = async () => {
      if (selectedAgent) {
        try {
          // Get pinned messages excluding current conversation
          const pinnedMessages = await getRelevantPinnedMessagesAsync(
            selectedAgent.id,
            currentConversation?.id || '', // Exclude current conversation
            [],
            20, // Load up to 20 pinned messages
          )
          setAvailablePinnedMessages(pinnedMessages)
        } catch (error) {
          console.warn('Failed to load pinned messages:', error)
          setAvailablePinnedMessages([])
        }
      }
    }
    loadPinnedMessages()
  }, [
    selectedAgent?.id,
    currentConversation?.id,
    getRelevantPinnedMessagesAsync,
  ])

  // Load pending review memories when agent/conversation loads
  // Filter to only show memories from the current conversation
  useEffect(() => {
    const loadPendingMemories = async () => {
      if (selectedAgent && currentConversation?.id) {
        const { loadMemoriesForAgent, getPendingReviewMemories } =
          useAgentMemoryStore.getState()
        try {
          // First ensure memories are loaded from DB
          await loadMemoriesForAgent(selectedAgent.id)
          // Then get pending review memories filtered by current conversation
          const pendingMemories = getPendingReviewMemories(selectedAgent.id)
          const conversationMemories = pendingMemories.filter((m) =>
            m.sourceConversationIds?.includes(currentConversation.id),
          )
          setNewlyLearnedMemories(conversationMemories)
        } catch (error) {
          console.warn('Failed to load pending memories:', error)
        }
      } else {
        // Clear memories if no conversation
        setNewlyLearnedMemories([])
      }
    }
    loadPendingMemories()
  }, [selectedAgent?.id, currentConversation?.id])

  // Load pinned messages when conversation changes
  useEffect(() => {
    if (currentConversation?.id) {
      loadPinnedMessagesForConversation(currentConversation.id)
    }
  }, [currentConversation?.id, loadPinnedMessagesForConversation])

  // Handle pin button click
  const handlePinClick = useCallback(
    async (message: Message) => {
      if (!currentConversation?.id || !selectedAgent?.id) return

      const isAlreadyPinned = checkIsPinned(message.id)

      if (isAlreadyPinned) {
        // Unpin the message
        await deletePinnedMessageByMessageId(message.id)
      } else {
        // Open modal to pin with description
        setMessageToPin(message)
        setPinDescription('')
        setIsGeneratingDescription(true)
        onPinModalOpen()

        // Generate description in background
        try {
          const result = await MessageDescriptionGenerator.generateDescription(
            message.content,
            conversationMessages.slice(-5),
          )
          setPinDescription(result.description)
        } catch (error) {
          console.warn('Failed to generate description:', error)
          setPinDescription('')
        } finally {
          setIsGeneratingDescription(false)
        }
      }
    },
    [
      currentConversation?.id,
      selectedAgent?.id,
      checkIsPinned,
      deletePinnedMessageByMessageId,
      conversationMessages,
      onPinModalOpen,
    ],
  )

  // Handle pin submission
  const handlePinSubmit = useCallback(async () => {
    if (!messageToPin || !currentConversation?.id || !selectedAgent?.id) return

    setIsPinning(true)
    try {
      // Generate keywords
      let keywords: string[] = []
      try {
        const result = await MessageDescriptionGenerator.generateDescription(
          messageToPin.content,
          conversationMessages.slice(-5),
        )
        keywords = result.keywords
      } catch {
        keywords = []
      }

      await createPinnedMessage({
        conversationId: currentConversation.id,
        messageId: messageToPin.id,
        agentId: selectedAgent.id,
        content: messageToPin.content,
        description: pinDescription || 'Pinned message',
        keywords,
        pinnedAt: new Date(),
      })

      successToast(t('Message pinned successfully'))
      onPinModalClose()
      setMessageToPin(null)
      setPinDescription('')
    } catch (error) {
      errorToast('Failed to pin message')
      console.error('Pin error:', error)
    } finally {
      setIsPinning(false)
    }
  }, [
    messageToPin,
    currentConversation?.id,
    selectedAgent?.id,
    pinDescription,
    conversationMessages,
    createPinnedMessage,
    onPinModalClose,
    t,
  ])

  // Handle learn from message click
  const handleLearnClick = useCallback(
    async (message: Message) => {
      if (!currentConversation?.id || !selectedAgent?.id) return
      if (learningMessageId) return // Already learning from another message

      // Find the user message that precedes this assistant message
      const messageIndex = conversationMessages.findIndex(
        (m) => m.id === message.id,
      )
      if (messageIndex < 1) {
        errorToast('Cannot learn from this message - no preceding user message')
        return
      }

      const userMessage = conversationMessages[messageIndex - 1]
      if (userMessage.role !== 'user') {
        errorToast('Cannot learn from this message - no preceding user message')
        return
      }

      setLearningMessageId(message.id)
      try {
        const events = await learnFromMessage(
          userMessage.content,
          message.content,
          selectedAgent.id,
          currentConversation.id,
          lang,
        )

        if (events.length > 0) {
          const learnedMemories = await processPendingLearningEvents(
            selectedAgent.id,
          )
          // Add newly learned memories to display inline
          if (learnedMemories.length > 0) {
            setNewlyLearnedMemories((prev) => [...prev, ...learnedMemories])
            successToast(
              t('{count} insights extracted', {
                count: learnedMemories.length,
              }),
            )
          }
          // Reload agent memories list
          const { getRelevantMemoriesAsync } = useAgentMemoryStore.getState()
          const newMemories = await getRelevantMemoriesAsync(selectedAgent.id)
          setAgentMemories(newMemories)
        } else {
          successToast(t('No new insights found in this message'))
        }
      } catch (error) {
        console.error('Memory learning failed:', error)
        errorToast('Failed to learn from message')
      } finally {
        setLearningMessageId(null)
      }
    },
    [
      currentConversation?.id,
      selectedAgent?.id,
      conversationMessages,
      learningMessageId,
      lang,
      t,
    ],
  )

  const header: HeaderProps = useMemo(
    () => ({
      icon: {
        name: (selectedAgent?.icon as any) || 'Sparks',
        color: 'text-primary-300 dark:text-primary-600',
      },
      title: selectedAgent?.i18n?.[lang]?.name ?? selectedAgent?.name ?? '…',
      subtitle: (
        <>
          <div className="flex gap-2">
            <Button
              variant={showSystemPrompt ? 'solid' : 'light'}
              size="sm"
              startContent={<Icon name="Terminal" />}
              onPress={() => setShowSystemPrompt((v) => !v)}
            >
              {t('System Prompt')}
            </Button>
            <Button
              variant={showMemories ? 'solid' : 'light'}
              size="sm"
              startContent={<Icon name="Brain" />}
              onPress={() => setShowMemories((v) => !v)}
            >
              {t('Memories')}
              {agentMemories.length > 0 && (
                <Chip size="sm" variant="flat">
                  {agentMemories.length}
                </Chip>
              )}
            </Button>
            <Button
              variant={showPinnedMessages ? 'solid' : 'light'}
              size="sm"
              startContent={<Pin className="w-4 h-4" />}
              onPress={() => setShowPinnedMessages((v) => !v)}
            >
              {t('Pinned')}
              {availablePinnedMessages.length > 0 && (
                <Chip size="sm" variant="flat">
                  {availablePinnedMessages.length}
                </Chip>
              )}
            </Button>
          </div>
          {showSystemPrompt && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              <MarkdownRenderer
                content={
                  selectedAgent?.instructions || t('No system prompt defined.')
                }
                className="prose dark:prose-invert prose-sm text-default-700"
                renderWidgets={false}
              />
            </div>
          )}
          {showMemories && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              {agentMemories.length === 0 ? (
                <p className="text-default-500 text-sm">
                  {t(
                    'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.',
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {agentMemories.map((memory) => (
                    <Card key={memory.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {memory.title}
                            </span>
                            {memory.isGlobal && (
                              <Chip size="sm" color="primary" variant="flat">
                                {t('Global')}
                              </Chip>
                            )}
                            <Chip size="sm" color="default" variant="flat">
                              {memory.category}
                            </Chip>
                          </div>
                          <p className="text-sm text-default-600 mt-1">
                            {memory.content}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="light"
                          color={memory.isGlobal ? 'danger' : 'primary'}
                          startContent={
                            <Icon
                              size="sm"
                              name={memory.isGlobal ? 'Xmark' : 'Share'}
                            />
                          }
                          onPress={async () => {
                            const { upgradeToGlobal, downgradeFromGlobal } =
                              useAgentMemoryStore.getState()
                            try {
                              if (memory.isGlobal) {
                                await downgradeFromGlobal(memory.id)
                              } else {
                                await upgradeToGlobal(memory.id)
                              }
                              // Reload memories
                              const { getRelevantMemoriesAsync } =
                                useAgentMemoryStore.getState()
                              const newMemories =
                                await getRelevantMemoriesAsync(
                                  selectedAgent?.id || '',
                                )
                              setAgentMemories(newMemories)
                            } catch (error) {
                              console.error(
                                'Failed to update memory global status:',
                                error,
                              )
                            }
                          }}
                        >
                          {memory.isGlobal
                            ? t('Remove Global')
                            : t('Make Global')}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {showPinnedMessages && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              {availablePinnedMessages.length === 0 ? (
                <p className="text-default-500 text-sm">
                  {t(
                    'No pinned messages yet. Pin important messages from conversations to make them available here.',
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {availablePinnedMessages.map((pm) => (
                    <Card key={pm.id} className="p-3">
                      <div className="flex items-start gap-2">
                        <Pin className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
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
                              ? pm.content.substring(0, 150) + '...'
                              : pm.content}
                          </p>
                          {pm.keywords && pm.keywords.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {pm.keywords.slice(0, 3).map((keyword, idx) => (
                                <Chip key={idx} size="sm" variant="flat">
                                  {keyword}
                                </Chip>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ),
      // subtitle: selectedAgent?.desc || t('AI Assistant'),
      cta: {
        label: t('New chat'),
        href: url(`/agents/start#${selectedAgent?.id}`),
        icon: 'Plus',
      },
    }),
    [
      selectedAgent?.icon,
      selectedAgent?.name,
      showSystemPrompt,
      showMemories,
      showPinnedMessages,
      agentMemories,
      availablePinnedMessages,
      isConversationPristine,
      currentConversation,
      selectedAgent,
    ],
  )

  // Parse the hash to get agentId and optional conversationId
  const parseHash = useCallback(() => {
    const hash = location.hash.replace('#', '')
    const parts = hash.split('/')
    return {
      agentId: parts[0] || 'default',
      conversationId: parts[1] || null,
    }
  }, [location.hash])

  const { agentId, conversationId } = useMemo(() => parseHash(), [parseHash])

  // Helper function to detect content type
  const detectContentType = useCallback((content: string) => {
    // Check for Marpit presentation by looking for YAML frontmatter with marp: true
    const yamlFrontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(yamlFrontmatterRegex)

    if (match) {
      const frontmatter = match[1]
      if (
        frontmatter.includes('marp: true') ||
        frontmatter.includes('marp:true')
      ) {
        return 'marpit-presentation'
      }
    }

    return 'markdown'
  }, [])

  // Helper function to get agent for a message
  const getMessageAgent = useCallback(
    async (message: Message): Promise<Agent | null> => {
      if (message.role !== 'assistant') return null

      const messageAgentId = message.agentId || selectedAgent?.id
      if (!messageAgentId) return selectedAgent

      // Check cache first
      if (agentCache[messageAgentId]) {
        return agentCache[messageAgentId]
      }

      // Fetch and cache the agent
      try {
        const agent = await getAgentById(messageAgentId)
        if (agent) {
          setAgentCache((prev) => ({ ...prev, [messageAgentId]: agent }))
          return agent
        }
      } catch (error) {
        console.warn(`Failed to load agent ${messageAgentId}:`, error)
      }

      return selectedAgent
    },
    [selectedAgent, agentCache],
  )

  // Load agent and conversation on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      try {
        // Load the specified agent
        const agent = await getAgentById(agentId)
        if (!agent) {
          errorToast(`Agent "${agentId}" not found`)
          navigate('/')
          return
        }
        setSelectedAgent(agent)

        // If conversationId is provided, try to load that specific conversation
        if (conversationId) {
          try {
            await loadConversation(conversationId)
            // The conversation will be set in the store, but we also want to display its messages
            if (currentConversation?.messages) {
              setConversationMessages(currentConversation.messages)
            }
          } catch (error) {
            console.warn(
              `Conversation ${conversationId} not found, will create new one when user sends first message`,
            )
            setConversationMessages([])
          }
        } else {
          // Clear current conversation since we're starting with a specific agent
          clearCurrentConversation()
          setConversationMessages([])
          setNewlyLearnedMemories([]) // Clear learned memories for new conversation
        }

        // Check for pending prompt from Index page
        const pendingPrompt = sessionStorage.getItem('pendingPrompt')
        const pendingAgentData = sessionStorage.getItem('pendingAgent')
        const pendingFilesData = sessionStorage.getItem('pendingFiles')

        if (pendingPrompt && pendingAgentData) {
          const pendingAgent = JSON.parse(pendingAgentData)
          const pendingFiles = pendingFilesData
            ? JSON.parse(pendingFilesData)
            : []

          // Clear the session storage
          sessionStorage.removeItem('pendingPrompt')
          sessionStorage.removeItem('pendingAgent')
          sessionStorage.removeItem('pendingFiles')

          // Set the prompt and auto-submit if the agent matches
          if (pendingAgent.id === agent.id) {
            // setPrompt(pendingPrompt)

            // Auto-submit after a short delay to ensure everything is loaded
            setTimeout(() => {
              handleAutoSubmit(pendingPrompt, agent, pendingFiles)
            }, 100)
          }
        }
      } catch (error) {
        console.error('Error loading agent/conversation:', error)
        errorToast('Failed to load agent or conversation')
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [agentId, conversationId, loadConversation, createConversation, navigate])

  // Update conversation messages when currentConversation changes
  useEffect(() => {
    if (currentConversation?.messages) {
      setConversationMessages(currentConversation.messages)
    }
  }, [currentConversation])

  // Update URL hash when conversation ID becomes available
  // Only update when there's no conversationId in the URL yet (new conversation created)
  useEffect(() => {
    if (currentConversation?.id && selectedAgent?.id) {
      const { conversationId: urlConversationId } = parseHash()

      // Only update hash if there's no conversation ID in the URL yet
      // This prevents navigation loops when switching between existing conversations
      if (!urlConversationId) {
        const newHash = `#${selectedAgent.id}/${currentConversation.id}`
        navigate(newHash, { replace: true })
      }
    }
  }, [currentConversation?.id, selectedAgent?.id, parseHash, navigate])

  // Load artifacts on mount
  useEffect(() => {
    loadArtifacts()
  }, [loadArtifacts])

  // Update conversation artifacts when artifacts or current conversation changes
  useEffect(() => {
    if (!currentConversation || !artifacts.length) {
      setConversationArtifacts([])
      return
    }

    // Get artifacts created by any agent participating in this conversation
    const participatingAgents = currentConversation.participatingAgents || [
      currentConversation.agentId,
    ]
    const relatedArtifacts = artifacts.filter((artifact) =>
      participatingAgents.includes(artifact.agentId),
    )

    setConversationArtifacts(relatedArtifacts)
  }, [artifacts, currentConversation])

  // Callback to refresh pending memories after memory learning completes
  const handleMemoryLearningComplete = useCallback(
    async (conversationId: string, agentId: string) => {
      try {
        const { loadMemoriesForAgent, getPendingReviewMemories } =
          useAgentMemoryStore.getState()
        // Reload memories from DB
        await loadMemoriesForAgent(agentId)
        // Get pending memories for this conversation
        const pendingMemories = getPendingReviewMemories(agentId)
        const conversationMemories = pendingMemories.filter((m) =>
          m.sourceConversationIds?.includes(conversationId),
        )
        setNewlyLearnedMemories(conversationMemories)
      } catch (error) {
        console.warn('Failed to refresh pending memories:', error)
      }
    },
    [],
  )

  // Auto-submit handler for prompts from Index page
  const handleAutoSubmit = useCallback(
    async (
      promptText: string,
      agent: Agent,
      files: Array<{
        name: string
        type: string
        size: number
        data: string
      }> = [],
    ) => {
      if (isSending) return

      setIsSending(true)
      setResponse('')
      setPrompt('')

      await submitChat({
        prompt: promptText,
        agent,
        conversationMessages,
        includeHistory: true,
        clearResponseAfterSubmit: true,
        attachments: files,
        lang,
        t,
        onResponseUpdate: setResponse,
        onPromptClear: () => setPrompt(''),
        onResponseClear: () => setResponse(''),
        onMemoryLearningComplete: handleMemoryLearningComplete,
      })

      setIsSending(false)
    },
    [isSending, conversationMessages, lang, t, handleMemoryLearningComplete],
  )

  const onSubmit = useCallback(async () => {
    if (!prompt.trim() || isSending || !selectedAgent) return

    setIsSending(true)
    setPrompt('')
    setResponse('')

    await submitChat({
      prompt,
      agent: selectedAgent,
      conversationMessages,
      includeHistory: true,
      clearResponseAfterSubmit: true,
      lang,
      t,
      onResponseUpdate: setResponse,
      onPromptClear: () => setPrompt(''),
      onResponseClear: () => setResponse(''),
      onMemoryLearningComplete: handleMemoryLearningComplete,
    })

    setIsSending(false)
  }, [
    prompt,
    isSending,
    selectedAgent,
    conversationMessages,
    lang,
    t,
    handleMemoryLearningComplete,
  ])

  // Create memory action handlers to avoid repetition
  const memoryActions = useMemo(
    () => ({
      onApprove: async (id: string) => {
        const { approveMemory, getRelevantMemoriesAsync } =
          useAgentMemoryStore.getState()
        await approveMemory(id)
        if (selectedAgent) {
          const memories = await getRelevantMemoriesAsync(selectedAgent.id)
          setAgentMemories(memories)
        }
      },
      onReject: async (id: string) => {
        const { rejectMemory } = useAgentMemoryStore.getState()
        await rejectMemory(id)
      },
      onEdit: async (id: string, newContent: string, newTitle?: string) => {
        const { updateMemory, approveMemory, getRelevantMemoriesAsync } =
          useAgentMemoryStore.getState()
        await updateMemory(id, {
          content: newContent,
          ...(newTitle && { title: newTitle }),
        })
        await approveMemory(id, 'Edited during review')
        if (selectedAgent) {
          const memories = await getRelevantMemoriesAsync(selectedAgent.id)
          setAgentMemories(memories)
        }
      },
      onRemoveFromList: (id: string) =>
        setNewlyLearnedMemories((prev) => prev.filter((m) => m.id !== id)),
    }),
    [selectedAgent],
  )

  // Build timeline items: combine messages and memories, sorted by timestamp
  const timelineItems = useMemo((): TimelineItem[] => {
    const messageItems: TimelineItem[] = conversationMessages
      .filter((msg) => msg.role !== 'system')
      .map((message) => ({
        type: 'message' as const,
        data: message,
        timestamp: new Date(message.timestamp),
      }))

    const memoryItems: TimelineItem[] = newlyLearnedMemories.map((memory) => ({
      type: 'memory' as const,
      data: memory,
      timestamp: new Date(memory.learnedAt),
    }))

    // Combine and sort by timestamp
    return [...messageItems, ...memoryItems].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    )
  }, [conversationMessages, newlyLearnedMemories])

  if (isLoading) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-default-500">
              {t('Loading agent and conversation…')}
            </p>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout title={selectedAgent?.name} header={header}>
      <Section>
        {/* <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"> */}
        <div className="gap-6 mx-auto">
          {/* Main conversation area */}
          <div
          // className="lg:col-span-3"
          >
            <Container>
              {/* Display timeline: messages and memories interleaved by timestamp */}
              {timelineItems.length > 0 && (
                <div className="duration-600 relative flex flex-col gap-6">
                  {timelineItems.map((item) =>
                    item.type === 'message' ? (
                      <MessageDisplay
                        key={item.data.id}
                        message={item.data}
                        selectedAgent={selectedAgent}
                        getMessageAgent={getMessageAgent}
                        detectContentType={detectContentType}
                        isPinned={checkIsPinned(item.data.id)}
                        onPinClick={handlePinClick}
                        onLearnClick={handleLearnClick}
                        isLearning={learningMessageId === item.data.id}
                        conversationId={currentConversation?.id}
                      />
                    ) : (
                      <InlineMemoryDisplay
                        key={item.data.id}
                        memory={item.data}
                        onApprove={memoryActions.onApprove}
                        onReject={memoryActions.onReject}
                        onEdit={memoryActions.onEdit}
                        onRemoveFromList={memoryActions.onRemoveFromList}
                      />
                    ),
                  )}
                  <span
                    aria-hidden="true"
                    className="w-px h-px block"
                    style={{ marginLeft: '0.25rem', marginTop: '3rem' }}
                  />

                  {/* Display streaming response */}
                  {response && (
                    <>
                      <div
                        aria-hidden="false"
                        tabIndex={0}
                        className="flex w-full gap-3"
                      >
                        <div className="relative flex-none">
                          <div className="border-1 border-default-300 dark:border-default-200 flex h-7 w-7 items-center justify-center rounded-full">
                            <Icon
                              name={(selectedAgent?.icon as any) || 'Sparks'}
                              className="w-4 h-4 text-default-600"
                            />
                          </div>
                        </div>
                        <div className="rounded-medium text-foreground group relative w-full overflow-hidden font-medium bg-transparent px-1 py-0">
                          <div className="text-small">
                            <div className="prose prose-neutral text-medium break-words">
                              {detectContentType(response) ===
                              'marpit-presentation' ? (
                                <Widget
                                  type="marpit"
                                  language="yaml"
                                  code={response}
                                />
                              ) : (
                                <MarkdownRenderer
                                  content={response}
                                  className="prose dark:prose-invert prose-sm"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span
                        aria-hidden="true"
                        className="w-px h-px block"
                        style={{ marginLeft: '0.25rem', marginTop: '3rem' }}
                      />
                    </>
                  )}
                </div>
              )}
            </Container>
          </div>

          {/* Artifacts side panel */}
          {/* {conversationArtifacts.length > 0 && (
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="sticky top-4">
                <Card className="mb-4">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon
                        name="PageSearch"
                        className="w-5 h-5 text-primary"
                      />
                      <h3 className="text-medium font-semibold">
                        {t('Artifacts')}
                      </h3>
                      <Chip
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="text-tiny"
                      >
                        {conversationArtifacts.length}
                      </Chip>
                    </div>

                    {conversationArtifacts.length > 0 ? (
                      <div className="space-y-3">
                        {conversationArtifacts
                          .sort(
                            (a, b) =>
                              new Date(b.updatedAt).getTime() -
                              new Date(a.updatedAt).getTime(),
                          )
                          .map((artifact) => (
                            <ArtifactWidget
                              key={artifact.id}
                              artifact={artifact}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Icon
                          name="PageSearch"
                          className="w-8 h-8 text-default-300 mx-auto mb-2"
                        />
                        <p className="text-small text-default-500">
                          {t('No artifacts created yet')}
                        </p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </div>
          )} */}
        </div>

        <PromptArea
          lang={lang}
          autoFocus={!conversationId} // Only autofocus for new conversations
          className="max-w-4xl mx-auto mt-6"
          value={prompt}
          onValueChange={setPrompt}
          onSubmitToAgent={onSubmit}
          isSending={isSending}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          disabledAgentPicker
          placeholder={
            conversationMessages.length > 0
              ? t('Continue the conversation…')
              : t(`Start chatting with {agentName}…`, {
                  agentName: selectedAgent?.name || t('this agent'),
                })
          }
        />

        {isConversationPristine && (
          <div className="flex gap-2 flex-wrap">
            {selectedAgent?.examples?.map((example) => (
              <Button
                key={example.id}
                variant="ghost"
                size="md"
                className="inline-flex justify-start"
                // startContent={
                //   selectedAgent.icon && (
                //     <Icon
                //       name={selectedAgent.icon}
                //       size="lg"
                //       className="text-default-500"
                //     />
                //   )
                // }
                endContent={
                  <Icon
                    name="NavArrowRight"
                    size="md"
                    className="text-default-500"
                  />
                }
                onPress={() => {
                  setPrompt(
                    selectedAgent.i18n?.[lang]?.examples?.find(
                      (ex) => ex.id === example.id,
                    )?.prompt ?? example.prompt,
                  )

                  // submit
                  setTimeout(() => {
                    const submitButton = document.querySelector(
                      '#prompt-area [type="submit"]',
                    ) as HTMLButtonElement | null
                    submitButton?.click()
                  }, 150)
                }}
              >
                <span className="font-semibold">
                  {selectedAgent.i18n?.[lang]?.examples?.find(
                    (ex) => ex.id === example.id,
                  )?.title ?? example.title}
                </span>
              </Button>
            ))}
          </div>
        )}
      </Section>

      {/* Pin Message Modal */}
      <Modal isOpen={isPinModalOpen} onClose={onPinModalClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-warning-500" />
              {t('Pin message')}
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500 mb-4">
              {t(
                'Add a description to help you remember why this message is important.',
              )}
            </p>

            {/* Message Preview */}
            <div className="bg-default-100 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <p className="text-small text-default-700 line-clamp-4">
                {messageToPin?.content?.slice(0, 300)}
                {(messageToPin?.content?.length ?? 0) > 300 && '...'}
              </p>
            </div>

            <Input
              label={t('Description')}
              placeholder={t('Brief description of why this is important...')}
              value={pinDescription}
              onValueChange={setPinDescription}
              isDisabled={isGeneratingDescription}
              description={
                isGeneratingDescription
                  ? t('Generating description...')
                  : undefined
              }
              endContent={isGeneratingDescription && <Spinner size="sm" />}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onPinModalClose}>
              {t('Cancel')}
            </Button>
            <Button
              color="warning"
              onPress={handlePinSubmit}
              isLoading={isPinning}
              startContent={!isPinning && <Pin className="w-4 h-4" />}
            >
              {t('Pin it')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  )
}
