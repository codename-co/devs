import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import { Container, Icon, PromptArea, Section, Title } from '@/components'
import { MessageBubble } from '@/components/chat'
import RunLayout from '@/layouts/Run'
import type { HeaderProps } from '@/lib/types'
import { getAgentById } from '@/stores/agentStore'
import { useTaskStore } from '@/stores/taskStore'
import { useConversationStore } from '@/stores/conversationStore'
import {
  useTask,
  useTasks,
  useConversations,
  useArtifacts,
  useSyncReady,
  useOrchestrationStreaming,
} from '@/hooks'
import type { Agent, Message, Conversation, InstalledSkill } from '@/types'
import { notifyError } from '@/features/notifications'
import { WorkflowOrchestrator } from '@/lib/orchestrator'
import {
  submitChat,
  type ResponseUpdate,
  type ResponseStatus,
} from '@/lib/chat'
import { copyRichText } from '@/lib/clipboard'
import { successToast } from '@/lib/toast'
import {
  decryptFields,
  MESSAGE_ENCRYPTED_FIELDS,
  CONVERSATION_ENCRYPTED_FIELDS,
  isEncryptedField,
  decryptAttachments,
} from '@/lib/crypto/content-encryption'
import {
  type ConversationStep,
  createStepFromStatus,
  completeLastStep,
  addToolDataToStep,
} from '../Agents/ConversationStepTracker'

import {
  ArtifactsSection,
  SubTasksSection,
  TaskStatusBanner,
  TaskStepsSection,
} from './components'

// ============================================================================
// Main Task Page
// ============================================================================

export const TaskPage = () => {
  const { t, lang, url } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // Get task ID from URL params or query string
  const taskId =
    params.taskId ||
    location.search.replace('?id=', '') ||
    location.pathname.split('/tasks/')[1]

  // Reactive hooks
  const task = useTask(taskId)
  const allTasks = useTasks()
  const allConversations = useConversations()
  const allArtifacts = useArtifacts()
  const isSyncReady = useSyncReady()

  // Subscribe to real-time streaming from the orchestration engine
  const streamingMap = useOrchestrationStreaming(task?.workflowId)

  // Core state
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [response, setResponse] = useState('')
  const [conversationSteps, setConversationSteps] = useState<
    ConversationStep[]
  >([])
  const [_currentStatus, setCurrentStatus] = useState<ResponseStatus | null>(
    null,
  )
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // Agent cache for resolving cross-agent messages
  const [agentCache, setAgentCache] = useState<Record<string, Agent>>({})

  // Orchestration state
  const [hasTriggeredOrchestration, setHasTriggeredOrchestration] = useState<
    Set<string>
  >(new Set())
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [orchestrationProgress, setOrchestrationProgress] = useState(0)

  // Auto-scroll
  const streamingEndRef = useRef<HTMLDivElement | null>(null)
  const userHasScrolledUpRef = useRef(false)
  const isAutoScrollingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Delete confirmation modal
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure()
  const [isDeleting, setIsDeleting] = useState(false)

  const isLoading = !isSyncReady || (!task && !!taskId)

  // ── Sub-tasks ──────────────────────────────────────────────────────────
  const subTasks = useMemo(
    () =>
      task
        ? allTasks
            .filter((t) => t.parentTaskId === task.id)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )
        : [],
    [allTasks, task],
  )

  // ── Artifacts for this task (direct only) ──────────────────────────────
  const parentArtifacts = useMemo(
    () => (task ? allArtifacts.filter((a) => a.taskId === task.id) : []),
    [allArtifacts, task],
  )

  // ── Collect all workflow IDs (parent + sub-tasks) for conversation lookup
  const relevantWorkflowIds = useMemo(() => {
    const ids = new Set<string>()
    if (task?.workflowId) ids.add(task.workflowId)
    for (const st of subTasks) {
      if (st.workflowId) ids.add(st.workflowId)
    }
    return ids
  }, [task?.workflowId, subTasks])

  // ── All conversations relevant to this task tree (raw / encrypted) ─────
  const rawRelevantConversations = useMemo(
    () =>
      relevantWorkflowIds.size > 0
        ? allConversations.filter((conv) =>
            relevantWorkflowIds.has(conv.workflowId),
          )
        : [],
    [allConversations, relevantWorkflowIds],
  )

  // Decrypt message content (stored encrypted in Yjs)
  const [decryptedConversations, setDecryptedConversations] = useState<
    Conversation[]
  >([])
  useEffect(() => {
    let cancelled = false
    const decrypt = async () => {
      const decrypted = await Promise.all(
        rawRelevantConversations.map(async (conv) => {
          const decryptedMessages = await Promise.all(
            conv.messages.map(async (msg) => {
              // Only decrypt if content looks encrypted
              if (
                isEncryptedField(
                  (msg as unknown as Record<string, unknown>).content,
                )
              ) {
                const decryptedMsg = (await decryptFields(msg, [
                  ...MESSAGE_ENCRYPTED_FIELDS,
                ])) as Message
                if (msg.attachments && msg.attachments.length > 0) {
                  decryptedMsg.attachments = await decryptAttachments(
                    msg.attachments,
                  )
                }
                return decryptedMsg
              }
              return msg
            }),
          )
          const result = { ...conv, messages: decryptedMessages as Message[] }
          return decryptFields(result, [
            ...CONVERSATION_ENCRYPTED_FIELDS,
          ]) as Promise<Conversation>
        }),
      )
      if (!cancelled) setDecryptedConversations(decrypted)
    }
    decrypt()
    return () => {
      cancelled = true
    }
  }, [rawRelevantConversations])

  // ── Aggregate all messages from the entire task tree ─────────────────
  const allMessages = useMemo(() => {
    const msgs: (Message & { _conversationId: string })[] = []
    for (const conv of decryptedConversations) {
      for (const msg of conv.messages) {
        if (msg.role !== 'system') {
          msgs.push({ ...msg, _conversationId: conv.id })
        }
      }
    }
    return msgs.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
  }, [decryptedConversations])

  // ── Header ─────────────────────────────────────────────────────────────
  const header: HeaderProps = useMemo(
    () => ({
      icon: {
        name: 'PcCheck',
        color: 'text-secondary-500 dark:text-white',
      },
      title: task?.title || t('Task Details'),
      subtitle: task
        ? `${task.complexity} • ${task.status.replace('_', ' ')}${subTasks.length ? ` • ${subTasks.length} sub-tasks` : ''}`
        : undefined,
      // cta: {
      //   label: t('Share'),
      //   // href: '',
      //   icon: 'ShareAndroid',
      // },
      moreActions: [
        {
          label: t('Delete task'),
          onClick: onDeleteModalOpen,
          icon: 'Trash',
        },
      ],
    }),
    [
      task?.title,
      task?.complexity,
      task?.status,
      subTasks.length,
      t,
      onDeleteModalOpen,
    ],
  )

  // ── Load agents for all messages + sub-tasks into cache ────────────────
  useEffect(() => {
    const loadAgents = async () => {
      const agentIds = new Set<string>()

      // Agents from messages
      for (const msg of allMessages) {
        if (msg.agentId && !agentCache[msg.agentId]) {
          agentIds.add(msg.agentId)
        }
      }

      // Agents from task and sub-tasks
      if (task?.assignedAgentId && !agentCache[task.assignedAgentId]) {
        agentIds.add(task.assignedAgentId)
      }
      for (const st of subTasks) {
        if (st.assignedAgentId && !agentCache[st.assignedAgentId]) {
          agentIds.add(st.assignedAgentId)
        }
        for (const step of st.steps) {
          if (step.agentId && !agentCache[step.agentId]) {
            agentIds.add(step.agentId)
          }
        }
      }

      // Agents from parent task steps
      if (task?.steps) {
        for (const step of task.steps) {
          if (step.agentId && !agentCache[step.agentId]) {
            agentIds.add(step.agentId)
          }
        }
      }

      if (agentIds.size === 0) return

      const updates: Record<string, Agent> = {}
      for (const id of agentIds) {
        try {
          const agent = await getAgentById(id)
          if (agent) {
            updates[id] = agent
            if (!selectedAgent && task?.assignedAgentId === id) {
              setSelectedAgent(agent)
            }
          }
        } catch (error) {
          console.warn(`Failed to load agent ${id}:`, error)
        }
      }
      if (Object.keys(updates).length > 0) {
        setAgentCache((prev) => ({ ...prev, ...updates }))
      }
    }
    loadAgents()
  }, [allMessages, task?.assignedAgentId, task?.steps, subTasks])

  // ── Auto-scroll during streaming ──────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (!isSending) return
      if (isAutoScrollingRef.current) return
      const scrollBottom = window.innerHeight + window.scrollY
      const docHeight = document.documentElement.scrollHeight
      if (docHeight - scrollBottom > 150) {
        userHasScrolledUpRef.current = true
      } else {
        userHasScrolledUpRef.current = false
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isSending])

  useEffect(() => {
    if (isSending) userHasScrolledUpRef.current = false
  }, [isSending])

  useEffect(() => {
    if (isSending && !userHasScrolledUpRef.current && streamingEndRef.current) {
      isAutoScrollingRef.current = true
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'instant',
      })
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false
      })
    }
  }, [isSending, response, conversationSteps])

  // ── Handle navigation when task ID is missing ─────────────────────────
  useEffect(() => {
    if (!taskId) {
      notifyError({
        title: 'Task Error',
        description: t('No task ID provided'),
      })
      navigate(url(''))
    }
  }, [taskId, navigate, url, t])

  useEffect(() => {
    if (isSyncReady && taskId && !task) {
      const timeout = setTimeout(() => {
        if (!task) {
          notifyError({
            title: 'Task Not Found',
            description: t('Task not found'),
          })
          navigate(url(''))
        }
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isSyncReady, taskId, task, navigate, url, t])

  // ── Trigger orchestration for pending tasks ───────────────────────────
  useEffect(() => {
    const orchestrateTask = async () => {
      if (
        !task ||
        task.status !== 'pending' ||
        !task.description ||
        hasTriggeredOrchestration.has(task.id)
      ) {
        return
      }

      setHasTriggeredOrchestration((prev) => new Set(prev).add(task.id))
      setIsOrchestrating(true)

      try {
        const result = await WorkflowOrchestrator.orchestrateTask(
          task.description,
          task.id,
        )
        console.log('✅ Task orchestration completed:', result)
      } catch (error) {
        console.error('❌ Task orchestration failed:', error)
        if (
          !(
            error instanceof Error &&
            error.message.includes('already in progress')
          )
        ) {
          notifyError({
            title: 'Task Orchestration Failed',
            description:
              error instanceof Error
                ? error.message
                : 'Task orchestration failed',
          })
        }
      } finally {
        setIsOrchestrating(false)
        setOrchestrationProgress(0)
      }
    }

    orchestrateTask()
  }, [task?.id, task?.status, task?.description, hasTriggeredOrchestration])

  // ── Copy handler ──────────────────────────────────────────────────────
  const handleCopy = useCallback(
    async (content: string) => {
      await copyRichText(content)
      successToast(t('Copied to clipboard'))
    },
    [t],
  )

  // ── File to base64 ────────────────────────────────────────────────────
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
    })
  }, [])

  // ── Submit follow-up message ──────────────────────────────────────────
  const onSubmit = useCallback(
    async (
      cleanedPrompt?: string,
      mentionedAgent?: Agent,
      _mentionedMethodology?: unknown,
      mentionedSkills?: InstalledSkill[],
    ) => {
      const promptToUse = cleanedPrompt ?? prompt
      const agentToUse = mentionedAgent || selectedAgent
      if (!promptToUse.trim() || isSending || !agentToUse) return

      setIsSending(true)
      setPrompt('')
      setResponse('')
      setCurrentStatus(null)
      setConversationSteps([
        createStepFromStatus({ icon: 'Sparks', i18nKey: 'Thinking…' }),
      ])

      const filesData = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await fileToBase64(file),
        })),
      )

      // Get conversation messages for history
      const conversationMessages = allMessages.map((m) => ({
        ...m,
        _conversationId: undefined,
      })) as Message[]

      // Build activated skills from /mentions
      const activatedSkills = mentionedSkills?.map((skill) => ({
        name: skill.name,
        skillMdContent: skill.skillMdContent || skill.description,
      }))

      const controller = new AbortController()
      abortControllerRef.current = controller

      await submitChat({
        prompt: promptToUse,
        agent: agentToUse,
        conversationMessages,
        includeHistory: true,
        clearResponseAfterSubmit: true,
        attachments: filesData,
        activatedSkills,
        lang,
        t,
        signal: controller.signal,
        onResponseUpdate: (update: ResponseUpdate) => {
          if (update.type === 'content') {
            setResponse(update.content)
            setCurrentStatus(null)
            setConversationSteps((prev) => completeLastStep(prev))
          } else if (update.type === 'tool_results') {
            setConversationSteps((prev) =>
              addToolDataToStep(prev, update.toolCalls),
            )
          } else {
            setCurrentStatus(update.status)
            setConversationSteps((prev) => {
              const completed = completeLastStep(prev)
              return [...completed, createStepFromStatus(update.status)]
            })
          }
        },
        onPromptClear: () => setPrompt(''),
        onResponseClear: () => {},
      })

      abortControllerRef.current = null
      setSelectedFiles([])
      setIsSending(false)
      setResponse('')
      setCurrentStatus(null)
      setConversationSteps([])
    },
    [
      prompt,
      isSending,
      selectedAgent,
      allMessages,
      selectedFiles,
      fileToBase64,
      lang,
      t,
    ],
  )

  // ── Delete handler ─────────────────────────────────────────────────────
  const handleConfirmDelete = useCallback(async () => {
    if (!task) return
    setIsDeleting(true)
    try {
      const taskStore = useTaskStore.getState()
      const convStore = useConversationStore.getState()

      // Delete related conversations (from parent + sub-task workflows)
      for (const conv of decryptedConversations) {
        await convStore.deleteConversation(conv.id)
      }

      // Delete sub-tasks
      for (const st of subTasks) {
        await taskStore.deleteTask(st.id)
      }

      // Delete the parent task
      await taskStore.deleteTask(task.id)

      onDeleteModalClose()
      navigate(url(''))
    } catch (error) {
      notifyError({
        title: 'Delete Failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete task',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [
    task,
    subTasks,
    decryptedConversations,
    navigate,
    url,
    onDeleteModalClose,
  ])

  // ── Stop handler ──────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsSending(false)
    setResponse('')
    setCurrentStatus(null)
    setConversationSteps([])
  }, [])

  // ── Timeline items (messages + streaming) ─────────────────────────────
  const timelineItems = useMemo(() => {
    const items = [...allMessages]

    // Add streaming message
    if (isSending) {
      items.push({
        id: '__streaming__',
        role: 'assistant' as const,
        content: response || '',
        timestamp: new Date(),
        agentId: selectedAgent?.id,
        _conversationId: '',
      } as Message & { _conversationId: string })
    }

    return items.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
  }, [allMessages, isSending, response, conversationSteps, selectedAgent?.id])

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <RunLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-default-500">
              {t('Loading task details…')}
            </p>
          </div>
        </Section>
      </RunLayout>
    )
  }

  if (!task) {
    return (
      <RunLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Icon name="Xmark" className="w-16 h-16 text-danger mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t('Task Not Found')}
            </h2>
            <p className="text-default-500">
              {t('The requested task could not be found.')}
            </p>
          </div>
        </Section>
      </RunLayout>
    )
  }

  return (
    <RunLayout title={task.title} header={header}>
      <div className="px-6 lg:px-8 pb-16">
        <Section mainClassName="bg-transparent" size={2}>
          <Container>
            {/* Task description */}
            <div className="mb-6 bg-default-50 rounded-lg p-4">
              <p className="text-default-800 whitespace-pre-wrap text-sm">
                {task.description}
              </p>
            </div>

            {/* Status banner */}
            <TaskStatusBanner
              status={task.status}
              complexity={task.complexity}
              isOrchestrating={isOrchestrating}
              progress={orchestrationProgress}
            />

            {/* Steps section */}
            <TaskStepsSection steps={task.steps} agentCache={agentCache} />

            {/* Sub-tasks & requirements section */}
            <SubTasksSection
              subTasks={subTasks}
              requirements={task.requirements}
              allConversations={decryptedConversations}
              allArtifacts={allArtifacts}
              agentCache={agentCache}
              onCopy={handleCopy}
              streamingMap={streamingMap}
            />

            {/* Parent-level artifacts */}
            <ArtifactsSection artifacts={parentArtifacts} />

            {/* Cross-agent conversation timeline */}
            {timelineItems.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="ChatBubble" size="sm" />
                  <Title level={4}>{t('Conversation')}</Title>
                </div>
                <div className="relative flex flex-col gap-6">
                  {timelineItems.map((item) => (
                    <MessageBubble
                      key={item.id}
                      message={item}
                      agent={item.agentId ? agentCache[item.agentId] : null}
                      showAgentChip={item.role === 'assistant'}
                      isStreaming={item.id === '__streaming__'}
                      liveSteps={
                        item.id === '__streaming__'
                          ? conversationSteps
                          : undefined
                      }
                      onCopy={handleCopy}
                    />
                  ))}
                  <div ref={streamingEndRef} aria-hidden="true" />
                </div>
              </div>
            )}

            {/* Empty state when orchestration hasn't produced messages yet */}
            {timelineItems.length === 0 && !isOrchestrating && (
              <div className="text-center py-12 text-default-400">
                <Icon
                  name="ChatBubble"
                  className="w-12 h-12 mx-auto mb-4 opacity-50"
                />
                <p>{t('No messages yet. The task is being processed…')}</p>
              </div>
            )}
          </Container>
        </Section>

        {/* Prompt area for follow-up conversation */}
        {task.status !== 'pending' && (
          <PromptArea
            lang={lang}
            autoFocus={false}
            className="!max-w-2xl mx-auto sticky bottom-20 md:bottom-4"
            value={prompt}
            onValueChange={setPrompt}
            onSubmitToAgent={onSubmit}
            onFilesChange={setSelectedFiles}
            isSending={isSending}
            onStop={handleStop}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            placeholder={t('Continue the conversation…')}
          />
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon name="Trash" size="sm" className="text-danger" />
              {t('Delete task')}
            </div>
          </ModalHeader>
          <ModalBody>
            <p>
              {t(
                'Are you sure you want to delete this task? This action cannot be undone.',
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={onDeleteModalClose}
              isDisabled={isDeleting}
            >
              {t('Cancel')}
            </Button>
            <Button
              color="danger"
              onPress={handleConfirmDelete}
              isLoading={isDeleting}
            >
              {t('Delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </RunLayout>
  )
}
