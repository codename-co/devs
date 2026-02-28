import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Progress,
  Spinner,
  Tooltip,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import {
  Container,
  Icon,
  MarkdownRenderer,
  PromptArea,
  Section,
} from '@/components'
import { MessageBubble } from '@/components/chat'
import RunLayout from '@/layouts/Run'
import type { HeaderProps, IconName } from '@/lib/types'
import { getAgentById } from '@/stores/agentStore'
import {
  useTask,
  useTasks,
  useConversations,
  useArtifacts,
  useSyncReady,
} from '@/hooks'
import type {
  Agent,
  Message,
  Task,
  Artifact as ArtifactType,
  Conversation,
} from '@/types'
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
import { openInspector } from '@/stores/inspectorPanelStore'

// ============================================================================
// Task Steps Section
// ============================================================================

const TaskStepsSection = memo(
  ({
    steps,
    agentCache,
  }: {
    steps: Task['steps']
    agentCache: Record<string, Agent>
  }) => {
    const { t } = useI18n()

    if (!steps.length) return null

    const completed = steps.filter((s) => s.status === 'completed').length

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="List" className="w-4 h-4 text-default-500" />
          <h3 className="text-sm font-semibold text-default-700">
            {(t as any)('Steps')} ({completed}/{steps.length})
          </h3>
          <Progress
            size="sm"
            value={(completed / steps.length) * 100}
            color="success"
            className="max-w-[120px]"
            aria-label="Steps progress"
          />
        </div>
        <div className="space-y-1">
          {[...steps]
            .sort((a, b) => a.order - b.order)
            .map((step) => {
              const agent = step.agentId ? agentCache[step.agentId] : null
              const statusIcon =
                step.status === 'completed'
                  ? 'Check'
                  : step.status === 'in_progress'
                    ? 'Running'
                    : step.status === 'failed'
                      ? 'X'
                      : 'Clock'
              const statusColor =
                step.status === 'completed'
                  ? 'text-success-500'
                  : step.status === 'in_progress'
                    ? 'text-primary-500'
                    : step.status === 'failed'
                      ? 'text-danger-500'
                      : 'text-default-400'

              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-default-50 transition-colors"
                >
                  <Icon
                    name={statusIcon as IconName}
                    className={`w-4 h-4 flex-shrink-0 ${statusColor}`}
                  />
                  <span className="text-sm font-medium text-default-800 flex-1 truncate">
                    {step.name}
                  </span>
                  {agent && (
                    <Chip
                      size="sm"
                      variant="flat"
                      color="primary"
                      className="text-tiny flex-shrink-0"
                      startContent={
                        agent.icon ? (
                          <Icon
                            name={agent.icon as IconName}
                            className="w-3 h-3"
                          />
                        ) : undefined
                      }
                    >
                      {agent.name}
                    </Chip>
                  )}
                  {step.duration != null && (
                    <span className="text-tiny text-default-400 flex-shrink-0">
                      {step.duration < 1000
                        ? `${Math.round(step.duration)}ms`
                        : `${(step.duration / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    )
  },
)

TaskStepsSection.displayName = 'TaskStepsSection'

// ============================================================================
// Sub-Task Conversation (messages for a single sub-task)
// ============================================================================

const SubTaskConversation = memo(
  ({
    subTask,
    conversations,
    agentCache,
    onCopy,
  }: {
    subTask: Task
    conversations: Conversation[]
    agentCache: Record<string, Agent>
    onCopy: (content: string) => void
  }) => {
    const { t } = useI18n()
    const agent = subTask.assignedAgentId
      ? agentCache[subTask.assignedAgentId]
      : null

    const subTaskConversations = useMemo(
      () => conversations.filter((c) => c.workflowId === subTask.workflowId),
      [conversations, subTask.workflowId],
    )

    const messages = useMemo(() => {
      const msgs: Message[] = []
      for (const conv of subTaskConversations) {
        for (const msg of conv.messages) {
          if (msg.role !== 'system') {
            msgs.push(msg)
          }
        }
      }
      return msgs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
    }, [subTaskConversations])

    const stepsDone = subTask.steps.filter(
      (s) => s.status === 'completed',
    ).length

    return (
      <div className="space-y-3">
        {subTask.description && (
          <p className="text-sm text-default-600 whitespace-pre-wrap">
            {subTask.description}
          </p>
        )}

        {subTask.steps.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-tiny text-default-500">
              {(t as any)('Steps')}: {stepsDone}/{subTask.steps.length}
            </span>
            {subTask.steps.map((step) => (
              <Chip
                key={step.id}
                size="sm"
                variant="flat"
                color={
                  step.status === 'completed'
                    ? 'success'
                    : step.status === 'failed'
                      ? 'danger'
                      : step.status === 'in_progress'
                        ? 'primary'
                        : 'default'
                }
                className="text-tiny"
              >
                {step.name}
              </Chip>
            ))}
          </div>
        )}

        {messages.length > 0 ? (
          <div className="flex flex-col gap-4 pl-2 border-l-2 border-default-200">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                agent={msg.agentId ? agentCache[msg.agentId] : agent}
                showAgentChip={msg.role === 'assistant'}
                onCopy={onCopy}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-default-400 italic">
            {(t as any)('No conversation messages yet.')}
          </p>
        )}
      </div>
    )
  },
)

SubTaskConversation.displayName = 'SubTaskConversation'

// ============================================================================
// Sub-Tasks Section
// ============================================================================

/** Status icon for a sub-task, mirrors ConversationStepTracker's StepStatusIcon */
const SubTaskStatusIcon = memo(({ status }: { status: string }) => {
  switch (status) {
    case 'in_progress':
      return <Spinner size="sm" classNames={{ wrapper: 'w-4 h-4' }} />
    case 'completed':
      return (
        <Icon name="CheckCircleSolid" size="sm" className="text-success-500" />
      )
    case 'failed':
      return (
        <Icon name="XmarkCircleSolid" size="sm" className="text-danger-400" />
      )
    default:
      return <Icon name="Clock" size="sm" className="text-default-400" />
  }
})
SubTaskStatusIcon.displayName = 'SubTaskStatusIcon'

const SubTasksSection = memo(
  ({
    subTasks,
    allConversations,
    allArtifacts,
    agentCache,
    onCopy,
  }: {
    subTasks: Task[]
    allConversations: Conversation[]
    allArtifacts: ArtifactType[]
    agentCache: Record<string, Agent>
    onCopy: (content: string) => void
  }) => {
    const { t } = useI18n()

    if (!subTasks.length) return null

    const completed = subTasks.filter((st) => st.status === 'completed').length

    return (
      <div className="mb-6">
        {/* Header with summary chips, like ConversationStepTracker */}
        <div className="flex items-center gap-2 mb-2">
          <Icon name="GitFork" className="w-4 h-4 text-default-500" />
          <span className="text-tiny font-medium text-default-500">
            {(t as any)('Sub-Tasks')}
          </span>
          {subTasks.filter((s) => s.status === 'in_progress').length > 0 && (
            <Chip size="sm" color="primary" variant="flat">
              {subTasks.filter((s) => s.status === 'in_progress').length}{' '}
              running
            </Chip>
          )}
          {completed > 0 && (
            <Chip size="sm" variant="bordered">
              {completed}
            </Chip>
          )}
          {subTasks.filter((s) => s.status === 'failed').length > 0 && (
            <Chip size="sm" color="danger" variant="flat">
              {subTasks.filter((s) => s.status === 'failed').length}
            </Chip>
          )}
        </div>

        {/* Vertical inline list of sub-tasks */}
        <div className="space-y-1">
          {subTasks.map((subTask) => {
            const agent = subTask.assignedAgentId
              ? agentCache[subTask.assignedAgentId]
              : null
            const subArtifacts = allArtifacts.filter(
              (a) => a.taskId === subTask.id,
            )
            const isRunning = subTask.status === 'in_progress'

            return (
              <div key={subTask.id}>
                {/* Step row: icon + title + chips */}
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-default-100 transition-colors">
                  <SubTaskStatusIcon status={subTask.status} />
                  <span
                    className={`text-sm font-medium flex-1 truncate ${
                      subTask.status === 'failed'
                        ? 'text-danger-600'
                        : 'text-default-600'
                    }`}
                  >
                    {subTask.title}
                  </span>
                  {agent && (
                    <Chip
                      size="sm"
                      variant="flat"
                      color="primary"
                      className="text-tiny flex-shrink-0"
                      startContent={
                        agent.icon ? (
                          <Icon
                            name={agent.icon as IconName}
                            className="w-3 h-3"
                          />
                        ) : undefined
                      }
                    >
                      {agent.name}
                    </Chip>
                  )}
                  {subTask.complexity === 'complex' && (
                    <Chip
                      size="sm"
                      variant="flat"
                      color="warning"
                      className="text-tiny flex-shrink-0"
                    >
                      complex
                    </Chip>
                  )}
                </div>

                {/* Expanded content: always visible for running tasks, indented with border */}
                {(isRunning ||
                  subTask.description ||
                  subArtifacts.length > 0) && (
                  <div className="ml-5 pl-3 border-l border-default-200 space-y-3 pb-2">
                    {/* Sub-task conversation */}
                    <SubTaskConversation
                      subTask={subTask}
                      conversations={allConversations}
                      agentCache={agentCache}
                      onCopy={onCopy}
                    />
                    {/* Sub-task artifacts */}
                    {subArtifacts.length > 0 && (
                      <div>
                        <h4 className="text-tiny font-semibold text-default-500 mb-2 flex items-center gap-1">
                          <Icon name="Page" className="w-3 h-3" />
                          {(t as any)('Artifacts')} ({subArtifacts.length})
                        </h4>
                        <div className="space-y-2">
                          {subArtifacts.map((artifact) => (
                            <ArtifactCard
                              key={artifact.id}
                              artifact={artifact}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)

SubTasksSection.displayName = 'SubTasksSection'

// ============================================================================
// Artifact Card (compact inline)
// ============================================================================

const ArtifactCard = memo(({ artifact }: { artifact: ArtifactType }) => {
  const statusColor =
    artifact.status === 'approved' || artifact.status === 'final'
      ? 'success'
      : artifact.status === 'rejected'
        ? 'danger'
        : 'warning'

  return (
    <Card className="shadow-sm">
      <CardBody className="p-3">
        <div className="flex justify-between items-start w-full mb-2">
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
          <div className="flex items-center gap-2">
            <span className="text-tiny text-default-500">
              {artifact.content.length.toLocaleString()} chars
            </span>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              aria-label="Expand artifact"
              onPress={() => openInspector({ type: 'artifact', artifact })}
            >
              <Icon name="Expand" size="sm" className="text-default-500" />
            </Button>
          </div>
        </div>
        {artifact.description && (
          <p className="text-small text-default-600 mb-2">
            {artifact.description}
          </p>
        )}
        <div className="p-2 bg-default-100 rounded-small max-h-48 overflow-y-auto">
          <MarkdownRenderer
            content={artifact.content}
            className="prose dark:prose-invert prose-sm text-small"
          />
        </div>
        <div className="flex justify-between text-tiny text-default-500 mt-2">
          <span>
            Created: {new Date(artifact.createdAt).toLocaleDateString()}
          </span>
          <span>v{artifact.version}</span>
        </div>
      </CardBody>
    </Card>
  )
})

ArtifactCard.displayName = 'ArtifactCard'

// ============================================================================
// Artifacts Section
// ============================================================================

const ArtifactsSection = memo(
  ({ artifacts }: { artifacts: ArtifactType[] }) => {
    const { t } = useI18n()

    if (!artifacts.length) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Page" className="w-4 h-4 text-default-500" />
          <h3 className="text-sm font-semibold text-default-700">
            {(t as any)('Artifacts')} ({artifacts.length})
          </h3>
        </div>
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} />
          ))}
        </div>
      </div>
    )
  },
)

ArtifactsSection.displayName = 'ArtifactsSection'

// ============================================================================
// Task Status Banner
// ============================================================================

const TaskStatusBanner = memo(
  ({
    status,
    complexity,
    isOrchestrating,
    progress,
  }: {
    status: string
    complexity: string
    isOrchestrating: boolean
    progress?: number
  }) => {
    const { t } = useI18n()

    const statusColor =
      status === 'completed'
        ? 'success'
        : status === 'failed'
          ? 'danger'
          : status === 'in_progress'
            ? 'primary'
            : 'default'

    return (
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip size="sm" color={statusColor} variant="flat">
            {status.replace('_', ' ')}
          </Chip>
          <Chip size="sm" variant="flat" color="secondary">
            {complexity}
          </Chip>
          {isOrchestrating && (
            <div className="flex items-center gap-2 text-primary text-sm">
              <Spinner size="sm" />
              <span>{(t as any)('Agents working…')}</span>
            </div>
          )}
        </div>
        {isOrchestrating && progress !== undefined && progress > 0 && (
          <Progress
            size="sm"
            value={progress}
            color="primary"
            className="max-w-md"
            aria-label="Task progress"
          />
        )}
      </div>
    )
  },
)

TaskStatusBanner.displayName = 'TaskStatusBanner'

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

  // ── Related conversations for the parent task ──────────────────────────
  const relatedConversations = useMemo(
    () =>
      task
        ? decryptedConversations.filter(
            (conv) => conv.workflowId === task.workflowId,
          )
        : [],
    [decryptedConversations, task],
  )

  // ── Aggregate all messages from related conversations ──────────────────
  const allMessages = useMemo(() => {
    const msgs: (Message & { _conversationId: string })[] = []
    for (const conv of relatedConversations) {
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
  }, [relatedConversations])

  // ── Header ─────────────────────────────────────────────────────────────
  const header: HeaderProps = useMemo(
    () => ({
      icon: {
        name: 'TriangleFlagTwoStripes',
        color: 'text-primary-300 dark:text-primary-600',
      },
      title: task?.title || t('Task Details'),
      subtitle: task
        ? `${task.complexity} • ${task.status.replace('_', ' ')}${subTasks.length ? ` • ${subTasks.length} sub-tasks` : ''}`
        : undefined,
    }),
    [task?.title, task?.complexity, task?.status, subTasks.length, t],
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
      successToast((t as any)('Copied to clipboard'))
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
    async (cleanedPrompt?: string, mentionedAgent?: Agent) => {
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

      const controller = new AbortController()
      abortControllerRef.current = controller

      await submitChat({
        prompt: promptToUse,
        agent: agentToUse,
        conversationMessages,
        includeHistory: true,
        clearResponseAfterSubmit: true,
        attachments: filesData,
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
            <Icon name="X" className="w-16 h-16 text-danger mb-4" />
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

            {/* Requirements (compact) */}
            {task.requirements.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Check" className="w-4 h-4 text-default-500" />
                  <h3 className="text-sm font-semibold text-default-700">
                    {(t as any)('Requirements')} ({task.requirements.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {task.requirements.map((req) => (
                    <Tooltip key={req.id} content={req.description}>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          req.status === 'satisfied' || req.satisfiedAt
                            ? 'success'
                            : req.status === 'failed'
                              ? 'danger'
                              : 'default'
                        }
                        startContent={
                          req.status === 'satisfied' || req.satisfiedAt ? (
                            <Icon name="Check" className="w-3 h-3" />
                          ) : req.status === 'failed' ? (
                            <Icon name="X" className="w-3 h-3" />
                          ) : undefined
                        }
                      >
                        {req.description.length > 50
                          ? req.description.slice(0, 50) + '…'
                          : req.description}
                      </Chip>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Steps section */}
            <TaskStepsSection steps={task.steps} agentCache={agentCache} />

            {/* Sub-tasks section */}
            <SubTasksSection
              subTasks={subTasks}
              allConversations={decryptedConversations}
              allArtifacts={allArtifacts}
              agentCache={agentCache}
              onCopy={handleCopy}
            />

            {/* Parent-level artifacts */}
            <ArtifactsSection artifacts={parentArtifacts} />

            <Divider className="mb-6" />

            {/* Cross-agent conversation timeline */}
            {timelineItems.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    name="ChatBubble"
                    className="w-4 h-4 text-default-500"
                  />
                  <h3 className="text-sm font-semibold text-default-700">
                    {(t as any)('Conversation')}
                  </h3>
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
                <p>
                  {(t as any)('No messages yet. The task is being processed…')}
                </p>
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
    </RunLayout>
  )
}
