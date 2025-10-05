import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Spinner, Chip, Progress, CheckboxGroup, Checkbox } from '@heroui/react'

import { useI18n } from '@/i18n'
import {
  Container,
  Icon,
  MarkdownRenderer,
  Section,
  SubTaskTree,
} from '@/components'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import { getAgentById } from '@/stores/agentStore'
import { useTaskStore } from '@/stores/taskStore'
import { useArtifactStore } from '@/stores/artifactStore'
import { useConversationStore } from '@/stores/conversationStore'
import {
  Agent,
  Task,
  TaskStep,
  Artifact as IArtifact,
  Conversation,
} from '@/types'
import { errorToast } from '@/lib/toast'
import { buildTimelineEvents, type TimelineEvent } from '@/lib/task-timeline'
import { WorkflowOrchestrator } from '@/lib/orchestrator'

export const TaskPage = () => {
  const { t, url } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  const [isLoading, setIsLoading] = useState(true)
  const [task, setTask] = useState<Task | null>(null)
  const [artifacts, setArtifacts] = useState<IArtifact[]>([])
  const [, setConversations] = useState<Conversation[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [agentCache, setAgentCache] = useState<Record<string, Agent>>({})
  const [hasTriggeredOrchestration, setHasTriggeredOrchestration] = useState<
    Set<string>
  >(new Set())
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [taskHierarchy, setTaskHierarchy] = useState<{
    task: Task
    children: Task[]
    parent?: Task
    siblings: Task[]
  } | null>(null)

  // Artifact panel state
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  )
  // const [isArtifactPanelMinimized, setIsArtifactPanelMinimized] =
  //   useState(false)

  // Helper function to format duration
  const formatDuration = (duration: number | undefined) => {
    if (!duration) return '—'

    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  // Helper function to get step status color
  const getStepStatusColor = (status: TaskStep['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'primary'
      case 'failed':
        return 'danger'
      default:
        return 'default'
    }
  }

  // Get task ID from URL params or query string
  const taskId =
    params.taskId ||
    location.search.replace('?id=', '') ||
    location.pathname.split('/tasks/')[1]

  const { getTaskById, getTaskHierarchy, tasks, loadTasks } = useTaskStore()
  const { getArtifactsByTask, loadArtifacts } = useArtifactStore()
  const { /* conversations: allConversations, */ loadConversations } =
    useConversationStore()

  const header: HeaderProps = {
    icon: {
      name: 'TriangleFlagTwoStripes',
      color: 'text-primary-300 dark:text-primary-600',
    },
    title: task?.title || t('Task Details'),
    subtitle: task ? `${task.complexity} • ${task.status}` : undefined,
  }

  // Helper function to get agent for caching
  const getAndCacheAgent = async (agentId: string): Promise<Agent | null> => {
    if (agentCache[agentId]) {
      return agentCache[agentId]
    }

    try {
      const agent = await getAgentById(agentId)
      if (agent) {
        setAgentCache((prev) => ({ ...prev, [agentId]: agent }))
        return agent
      }
    } catch (error) {
      console.warn(`Failed to load agent ${agentId}:`, error)
    }

    return null
  }

  // Build timeline events using the extracted timeline utility
  const buildTimelineEventsWithTranslation = async (
    task: Task,
    artifacts: IArtifact[],
    conversations: Conversation[],
    subTasks: Task[] = [],
  ) => {
    // Debug logging to help identify missing data
    console.log(`🔍 Building timeline for task ${task.id}:`, {
      requirements: task.requirements.length,
      artifacts: artifacts.length,
      conversations: conversations.length,
      subTasks: subTasks.length,
      taskStatus: task.status,
      requirementStatuses: task.requirements.map((r) => ({
        id: r.id,
        status: r.status,
        type: r.type,
      })),
      conversationMessages: conversations.reduce(
        (total, conv) => total + conv.messages.length,
        0,
      ),
    })

    const events = await buildTimelineEvents(
      task,
      artifacts,
      conversations,
      getAndCacheAgent,
      subTasks,
    )

    // Debug logging for generated events
    console.log(
      `📅 Generated ${events.length} timeline events:`,
      events.map((e) => ({
        type: e.type,
        title: e.title,
        timestamp: e.timestamp,
      })),
    )
    // Translation mapping for event types
    const eventTypeTranslations: Record<
      TimelineEvent['type'],
      string | ((event: TimelineEvent) => string)
    > = {
      task_created: t('Task Created'),
      agent_assigned: t('Agent Assigned'),
      artifact_created: (event: TimelineEvent) =>
        `${t('Artifact Created')}: ${event.artifact?.title}`,
      message: (event: TimelineEvent) =>
        event.message?.role === 'user'
          ? t('User Message')
          : t('Agent Response'),
      requirement_satisfied: t('Requirement Satisfied'),
      task_completed: t('Task Completed'),
      task_branched: t('Task Branched'),
      subtask_created: t('Sub-task Created'),
      subtask_completed: t('Sub-task Completed'),
      requirement_detected: t('Requirement Detected'),
      requirement_validated: t('Requirement Validated'),
      task_started: t('Task Started'),
    }

    const descriptionTranslations: Record<string, string> = {
      task_completed: t('All requirements satisfied'),
    }

    // Apply translations to the events
    return events.map((event) => ({
      ...event,
      title:
        typeof eventTypeTranslations[event.type] === 'function'
          ? (
              eventTypeTranslations[event.type] as (
                event: TimelineEvent,
              ) => string
            )(event)
          : (eventTypeTranslations[event.type] as string) || event.title,
      description: descriptionTranslations[event.type] || event.description,
    })) as TimelineEvent[]
  }

  // Load task data
  useEffect(() => {
    const loadTaskData = async () => {
      if (!taskId) {
        errorToast(t('No task ID provided'))
        navigate(url('/'))
        return
      }

      setIsLoading(true)

      try {
        // Ensure conversations, artifacts, and tasks are loaded first
        await Promise.all([loadConversations(), loadArtifacts(), loadTasks()])

        // Load task
        const taskData = await getTaskById(taskId)
        if (!taskData) {
          errorToast(t('Task not found'))
          navigate(url('/'))
          return
        }
        setTask(taskData)

        // Load assigned agent into cache if available
        if (taskData.assignedAgentId) {
          await getAndCacheAgent(taskData.assignedAgentId)
        }

        // Load task hierarchy
        try {
          const hierarchy = await getTaskHierarchy(taskData.id)
          setTaskHierarchy(hierarchy)
        } catch (error) {
          console.warn('Failed to load task hierarchy:', error)
        }

        // Get fresh conversations after loading
        const freshConversations = useConversationStore.getState().conversations

        // If task is pending and we have a description, trigger orchestration (but only once per task)
        if (
          taskData.status === 'pending' &&
          taskData.description &&
          !hasTriggeredOrchestration.has(taskData.id)
        ) {
          console.log(
            '🚀 Starting orchestration for pending task:',
            taskData.id,
          )

          // Mark this task as having orchestration triggered
          setHasTriggeredOrchestration((prev) => new Set(prev).add(taskData.id))
          setIsOrchestrating(true)

          // Set up periodic refresh during orchestration
          let refreshInterval: NodeJS.Timeout | null = null

          try {
            refreshInterval = setInterval(async () => {
              try {
                // Reload fresh data
                await Promise.all([loadConversations(), loadArtifacts()])

                const currentTaskData = await getTaskById(taskId)
                if (currentTaskData) {
                  const currentArtifacts = await getArtifactsByTask(taskId)
                  const currentConversations = useConversationStore
                    .getState()
                    .conversations.filter(
                      (conv) => conv.workflowId === currentTaskData.workflowId,
                    )

                  // Refresh task hierarchy if needed
                  let currentHierarchy = taskHierarchy
                  try {
                    currentHierarchy = await getTaskHierarchy(
                      currentTaskData.id,
                    )
                    if (
                      JSON.stringify(currentHierarchy) !==
                      JSON.stringify(taskHierarchy)
                    ) {
                      setTaskHierarchy(currentHierarchy)
                    }
                  } catch (error) {
                    // Keep existing hierarchy if refresh fails
                  }

                  // Update timeline with fresh data
                  const refreshedEvents =
                    await buildTimelineEventsWithTranslation(
                      currentTaskData,
                      currentArtifacts,
                      currentConversations,
                      currentHierarchy?.children || [],
                    )
                  setTimelineEvents(refreshedEvents)
                  setArtifacts(currentArtifacts)
                  setConversations(currentConversations)

                  // Update task if it changed
                  if (
                    JSON.stringify(currentTaskData) !== JSON.stringify(task)
                  ) {
                    setTask(currentTaskData)
                  }
                }
              } catch (error) {
                console.warn('Timeline refresh failed:', error)
              }
            }, 2000) // Refresh every 2 seconds during orchestration

            const result = await WorkflowOrchestrator.orchestrateTask(
              taskData.description,
              taskData.id,
            )
            console.log('✅ Task orchestration completed:', result)

            // Clear the refresh interval
            if (refreshInterval) clearInterval(refreshInterval)

            // Perform final comprehensive reload with multiple attempts to ensure all data is captured
            const performFinalReload = async (attempt = 1, maxAttempts = 3) => {
              try {
                console.log(
                  `📊 Final timeline reload attempt ${attempt}/${maxAttempts}`,
                )

                // Add a delay to ensure all data is persisted
                if (attempt === 1) {
                  await new Promise((resolve) => setTimeout(resolve, 1000))
                }

                // Force reload all data stores
                await Promise.all([
                  loadConversations(),
                  loadArtifacts(),
                  loadTasks(),
                ])

                // Reload task data after orchestration
                const updatedTaskData = await getTaskById(taskId)
                if (updatedTaskData) {
                  setTask(updatedTaskData)

                  // Reload task hierarchy
                  try {
                    const updatedHierarchy = await getTaskHierarchy(
                      updatedTaskData.id,
                    )
                    setTaskHierarchy(updatedHierarchy)
                  } catch (error) {
                    console.warn('Failed to reload task hierarchy:', error)
                  }

                  // Get fresh data from stores
                  const updatedArtifacts = await getArtifactsByTask(taskId)
                  const latestConversations =
                    useConversationStore.getState().conversations
                  const updatedConversations = latestConversations.filter(
                    (conv) => conv.workflowId === updatedTaskData.workflowId,
                  )

                  console.log(
                    `📈 Final reload stats: ${updatedConversations.length} conversations, ${updatedArtifacts.length} artifacts, ${updatedTaskData.requirements.length} requirements`,
                  )

                  setArtifacts(updatedArtifacts)
                  setConversations(updatedConversations)

                  // Rebuild timeline with all fresh data
                  const updatedEvents =
                    await buildTimelineEventsWithTranslation(
                      updatedTaskData,
                      updatedArtifacts,
                      updatedConversations,
                      taskHierarchy?.children || [],
                    )

                  console.log(
                    `🎯 Final timeline has ${updatedEvents.length} events`,
                  )
                  setTimelineEvents(updatedEvents)

                  // If we have fewer events than expected and haven't reached max attempts, try again
                  const hasMinimalEvents = updatedEvents.length < 5 // Expect at least task created, agent assigned, messages, artifacts
                  if (hasMinimalEvents && attempt < maxAttempts) {
                    console.log(
                      `⚠️ Timeline seems incomplete (${updatedEvents.length} events), retrying...`,
                    )
                    await new Promise((resolve) => setTimeout(resolve, 2000))
                    return performFinalReload(attempt + 1, maxAttempts)
                  }
                }
              } catch (error) {
                console.error(
                  `❌ Final reload attempt ${attempt} failed:`,
                  error,
                )
                if (attempt < maxAttempts) {
                  await new Promise((resolve) => setTimeout(resolve, 2000))
                  return performFinalReload(attempt + 1, maxAttempts)
                }
              }
            }

            await performFinalReload()
            setIsOrchestrating(false)
          } catch (error) {
            // Clear the refresh interval on error
            if (refreshInterval) clearInterval(refreshInterval)
            setIsOrchestrating(false)
            console.error('❌ Task orchestration failed:', error)

            // Don't show error for already in progress tasks - it's expected behavior
            if (
              error instanceof Error &&
              error.message.includes('already in progress')
            ) {
              console.log(
                '⏭️ Orchestration already in progress, continuing with existing execution',
              )
            } else {
              errorToast('Task orchestration failed', error)
            }
          }
        }

        // Load artifacts for this task
        const taskArtifacts = await getArtifactsByTask(taskId)
        setArtifacts(taskArtifacts)

        // Auto-select first artifact if none is selected
        if (taskArtifacts.length > 0 && !selectedArtifactId) {
          setSelectedArtifactId(taskArtifacts[0].id)
        }

        // Find conversations related to this task's workflow
        const relatedConversations = freshConversations.filter(
          (conv) => conv.workflowId === taskData.workflowId,
        )
        setConversations(relatedConversations)

        // Build timeline events
        const events = await buildTimelineEventsWithTranslation(
          taskData,
          taskArtifacts,
          relatedConversations,
          taskHierarchy?.children || [],
        )
        setTimelineEvents(events)
      } catch (error) {
        console.error('Error loading task data:', error)
        errorToast(t('Failed to load task data'))
        navigate(url('/'))
      } finally {
        setIsLoading(false)
      }
    }

    loadTaskData()
  }, [taskId, loadConversations, loadArtifacts])

  // Auto-select first artifact when artifacts change
  useEffect(() => {
    if (artifacts.length > 0 && !selectedArtifactId) {
      setSelectedArtifactId(artifacts[0].id)
    }
  }, [artifacts, selectedArtifactId])

  // Component to render a timeline event
  const TimelineEventDisplay = ({
    event,
    isLast,
    previousEvent,
  }: {
    event: TimelineEvent
    isLast: boolean
    previousEvent?: TimelineEvent
  }) => {
    const getEventIcon = () => {
      switch (event.type) {
        case 'task_created':
          return 'TriangleFlagTwoStripes'
        case 'task_started':
          return 'PlayArrow'
        case 'agent_assigned':
          return 'Sparks'
        case 'message':
          return 'ChatBubble'
        case 'artifact_created':
          return 'PagePlus'
        case 'task_completed':
          return 'CheckCircle'
        case 'requirement_satisfied':
        case 'requirement_detected':
        case 'requirement_validated':
          return 'CheckCircle'
        case 'task_branched':
          return 'ArrowRight'
        case 'subtask_created':
          return 'ArrowRight'
        case 'subtask_completed':
          return 'CheckCircle'
        default:
          return 'Circle'
      }
    }

    const getEventColor = () => {
      switch (event.type) {
        case 'task_created':
          return 'bg-blue-500'
        case 'task_started':
          return 'bg-green-500'
        case 'agent_assigned':
          return 'bg-purple-500'
        case 'message':
          return 'bg-gray-500'
        case 'artifact_created':
          return 'bg-orange-500'
        case 'task_completed':
          return 'bg-green-600'
        case 'requirement_satisfied':
          return 'bg-emerald-500'
        case 'requirement_detected':
          return 'bg-blue-400'
        case 'requirement_validated':
          return 'bg-indigo-500'
        case 'task_branched':
          return 'bg-yellow-500'
        case 'subtask_created':
          return 'bg-cyan-500'
        case 'subtask_completed':
          return 'bg-emerald-600'
        default:
          return 'bg-gray-400'
      }
    }

    return (
      <div className="flex gap-4 relative">
        {/* Timeline line */}
        {!isLast && (
          <div className="absolute left-4 top-12 w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
        )}

        {/* Event marker */}
        <div className="flex-none">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventColor()}`}
          >
            <Icon name={getEventIcon() as any} className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Event content */}
        <div className="flex-1 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground">{event.title}</h3>
            <Chip size="sm" variant="flat" className="text-tiny">
              <time
                dateTime={event.timestamp.toISOString()}
                title={event.timestamp.toLocaleString()}
              >
                {previousEvent
                  ? `+${((event.timestamp.getTime() - previousEvent.timestamp.getTime()) / 1000).toFixed(2)}s`
                  : 'Start'}
              </time>
            </Chip>
            {event.agent && (
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-tiny"
              >
                {event.agent.name}
              </Chip>
            )}
          </div>

          {event.description && (
            <p className="text-small text-default-600 mb-3">
              {event.description}
            </p>
          )}

          {/* Render specific content based on event type */}
          {event.message && (
            <div className="bg-default-100 rounded-lg p-3">
              <MarkdownRenderer
                content={event.message.content}
                className="prose dark:prose-invert prose-sm"
              />
            </div>
          )}

          {event.artifact && (
            <div
              className="border border-warning-500 rounded-lg p-4 cursor-pointer hover:border-warning-300 transition-colors"
              onClick={() => setSelectedArtifactId(event.artifact!.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{event.artifact.title}</h4>
                {/* <Badge color="primary" variant="flat">
                  {event.artifact.type}
                </Badge> */}
              </div>
              <p className="text-small text-default-600 mb-3">
                {event.artifact.description}
              </p>
              <details>
                <summary className="cursor-pointer text-small text-warning-600 hover:underline">
                  {t('View Content')}
                </summary>
                <div className="mt-2 bg-default-50 rounded p-3">
                  <MarkdownRenderer
                    content={event.artifact.content}
                    className="prose dark:prose-invert prose-sm"
                  />
                </div>
              </details>
            </div>
          )}

          {/* Sub-task specific rendering */}
          {event.subTask && (
            <div
              className="border border-default-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 transition-colors"
              onClick={() => navigate(url(`/tasks/${event.subTask!.id}`))}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{event.subTask.title}</h4>
                <div className="flex gap-2">
                  <Chip
                    size="sm"
                    color={
                      event.subTask.status === 'completed'
                        ? 'success'
                        : event.subTask.status === 'in_progress'
                          ? 'primary'
                          : event.subTask.status === 'failed'
                            ? 'danger'
                            : 'default'
                    }
                    variant="flat"
                  >
                    {event.subTask.status.replace('_', ' ')}
                  </Chip>
                  <Chip size="sm" variant="flat" color="secondary">
                    {event.subTask.complexity}
                  </Chip>
                </div>
              </div>
              <p className="text-small text-default-600 mb-2">
                {event.subTask.description}
              </p>
              {event.subTask.steps.length > 0 && (
                <div className="mt-2">
                  <Progress
                    size="sm"
                    value={Math.round(
                      (event.subTask.steps.filter(
                        (s) => s.status === 'completed',
                      ).length /
                        event.subTask.steps.length) *
                        100,
                    )}
                    color={
                      event.subTask.status === 'completed'
                        ? 'success'
                        : 'primary'
                    }
                    className="mb-1"
                    aria-label="Sub-task progress"
                  />
                  <div className="text-xs text-default-500">
                    {
                      event.subTask.steps.filter(
                        (s) => s.status === 'completed',
                      ).length
                    }{' '}
                    / {event.subTask.steps.length} steps completed
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task branching specific rendering */}
          {event.type === 'task_branched' && event.data && (
            <div className="border border-default-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="ArrowRight" className="w-4 h-4 text-warning" />
                <span className="font-medium">Task Decomposition</span>
              </div>
              <p className="text-small text-default-600 mb-2">
                Complex task broken down into {event.data.subTaskCount}{' '}
                manageable sub-tasks
              </p>
              <div className="flex gap-2 flex-wrap">
                {event.data.subTaskIds
                  ?.slice(0, 3)
                  .map((subTaskId: string, index: number) => (
                    <Chip
                      key={subTaskId}
                      size="sm"
                      variant="flat"
                      color="secondary"
                    >
                      Sub-task {index + 1}
                    </Chip>
                  ))}
                {event.data.subTaskIds?.length > 3 && (
                  <Chip size="sm" variant="flat" color="default">
                    +{event.data.subTaskIds.length - 3} more
                  </Chip>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" />
            <p className="mt-4 text-default-500">
              {t('Loading task details…')}
            </p>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  if (!task) {
    return (
      <DefaultLayout header={header}>
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
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout title={task.title} header={header}>
      <Section>
        <Container>
          <div
          // className={`grid gap-6 ${artifacts.length > 0 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}
          // className="grid gap-6"
          >
            {/* Main Content */}
            <div
              // className={artifacts.length > 0 ? 'lg:col-span-2' : 'col-span-1'}
              data-testid={
                task.status === 'completed' ? 'task-completed' : undefined
              }
            >
              {/* Task Overview */}
              <div
                className="mb-8 bg-default-50 rounded-lg p-6"
                data-testid="task-results"
              >
                <p className="text-default-800 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>

              {/* Agent Team Formation Section */}
              {task.assignedAgentId && (
                <div className="mb-8" data-testid="team-formation">
                  <h3 className="text-lg font-semibold mb-4">
                    {t('Active Agents')}
                  </h3>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    data-testid="active-agents"
                  >
                    <div data-testid="agent-card">
                      {agentCache[task.assignedAgentId] ? (
                        <div className="border border-default-200 rounded-lg p-4 bg-white dark:bg-default-50">
                          <div className="flex items-center gap-3 mb-2">
                            {agentCache[task.assignedAgentId].icon && (
                              <Icon
                                name={
                                  agentCache[task.assignedAgentId].icon as any
                                }
                                className="w-6 h-6"
                              />
                            )}
                            <h4 className="font-semibold">
                              {agentCache[task.assignedAgentId].name}
                            </h4>
                            <Chip size="sm" color="success" variant="flat">
                              Active
                            </Chip>
                          </div>
                          <p className="text-small text-default-600">
                            {agentCache[task.assignedAgentId].role}
                          </p>
                        </div>
                      ) : (
                        <div className="border border-default-200 rounded-lg p-4 bg-white dark:bg-default-50">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="animate-pulse w-6 h-6 bg-default-300 rounded"></div>
                            <div className="animate-pulse h-4 bg-default-300 rounded w-32"></div>
                            <Chip size="sm" color="success" variant="flat">
                              Active
                            </Chip>
                          </div>
                          <div className="animate-pulse h-3 bg-default-200 rounded w-full mt-2"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Task Steps Section */}
              {task.steps && task.steps.length > 0 && (
                <div className="mb-8" data-testid="task-analysis">
                  <h3 className="text-lg font-semibold mb-4">
                    {t('Task Steps')}
                  </h3>
                  <div className="space-y-3" data-testid="task-breakdown">
                    {task.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <div
                          key={step.id}
                          className="border border-default-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-small font-semibold text-default-600">
                                {index + 1}.
                              </span>
                              <div>
                                <h4 className="font-medium text-foreground">
                                  {step.name}
                                </h4>
                                <p className="text-small text-default-600 mt-1">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Chip
                                size="sm"
                                color={getStepStatusColor(step.status)}
                                variant="flat"
                              >
                                {step.status.replace('_', ' ')}
                              </Chip>
                              {step.agentId && agentCache[step.agentId] && (
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  className="text-tiny"
                                >
                                  {agentCache[step.agentId].name}
                                </Chip>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-small">
                            {step.startedAt && (
                              <div>
                                <span className="font-medium text-default-600">
                                  Started:
                                </span>
                                <p className="text-default-800">
                                  {step.startedAt.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {step.completedAt && (
                              <div>
                                <span className="font-medium text-default-600">
                                  Completed:
                                </span>
                                <p className="text-default-800">
                                  {step.completedAt.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {step.duration && (
                              <div>
                                <span className="font-medium text-default-600">
                                  Duration:
                                </span>
                                <p className="text-default-800 font-semibold">
                                  {formatDuration(step.duration)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Steps Summary */}
                  <div className="mt-4 p-4 bg-default-50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-small font-medium text-default-600">
                          Total Steps
                        </p>
                        <p className="text-large font-semibold">
                          {task.steps.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-small font-medium text-default-600">
                          Completed
                        </p>
                        <p className="text-large font-semibold text-success">
                          {
                            task.steps.filter((s) => s.status === 'completed')
                              .length
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-small font-medium text-default-600">
                          In Progress
                        </p>
                        <p className="text-large font-semibold text-primary">
                          {
                            task.steps.filter((s) => s.status === 'in_progress')
                              .length
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-small font-medium text-default-600">
                          Total Duration
                        </p>
                        <p className="text-large font-semibold">
                          {formatDuration(
                            task.steps
                              .filter((s) => s.duration)
                              .reduce((sum, s) => sum + (s.duration || 0), 0),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements Section */}
              {task.requirements.length > 0 && (
                <div className="mb-8" data-testid="requirements-list">
                  <h3 className="text-lg font-semibold mb-4">
                    {t('Requirements')}
                  </h3>
                  <div
                    className="space-y-3"
                    data-testid="requirement-validation"
                  >
                    <CheckboxGroup
                      // label={t('Requirements')}
                      value={task.requirements
                        .filter((req) => req.satisfiedAt)
                        .map((req) => req.id)}
                    >
                      {task.requirements.map((requirement) => (
                        <Checkbox
                          isDisabled
                          key={requirement.id}
                          value={requirement.id}
                        >
                          {requirement.description}
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                    {/* {task.requirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="border border-default-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          color={
                            requirement.status === 'satisfied'
                              ? 'success'
                              : 'default'
                          }
                          variant="flat"
                        >
                          {requirement.status}
                        </Chip>
                        <Chip size="sm" variant="flat">
                          {requirement.type}
                        </Chip>
                        <Chip size="sm" variant="flat" color="primary">
                          {requirement.priority}
                        </Chip>
                      </div>
                    </div>
                    <p className="text-default-800">
                      {requirement.description}
                    </p>
                    {requirement.validationCriteria.length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-small font-semibold text-default-600">
                          {t('Validation Criteria')}:
                        </h5>
                        <ul className="text-small text-default-600 ml-4 mt-1">
                          {requirement.validationCriteria.map(
                            (criteria, idx) => (
                              <li key={idx} className="list-disc">
                                {criteria}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))} */}
                  </div>
                </div>
              )}

              {/* Sub-Task Hierarchy Section */}
              {taskHierarchy &&
                (taskHierarchy.children.length > 0 ||
                  taskHierarchy.parent ||
                  taskHierarchy.siblings.length > 0) && (
                  <div className="mb-8">
                    <SubTaskTree
                      task={taskHierarchy.task}
                      children={taskHierarchy.children}
                      parent={taskHierarchy.parent}
                      siblings={taskHierarchy.siblings}
                      allTasks={tasks}
                    />
                  </div>
                )}

              {/* Timeline Section */}
              <div className="mb-8" data-testid="timeline">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-lg font-semibold">
                    {t('Task Timeline')}
                  </h3>
                  {isOrchestrating && (
                    <div
                      className="flex items-center gap-2 text-primary"
                      data-testid="workflow-status"
                    >
                      <Spinner size="sm" />
                      <span className="text-sm">Live updates active</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4" data-testid="workflow-chart">
                  {timelineEvents.map((event, index) => (
                    <TimelineEventDisplay
                      key={event.id}
                      event={event}
                      isLast={index === timelineEvents.length - 1}
                      previousEvent={
                        index > 0 ? timelineEvents[index - 1] : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Artifact Panel - Right Column */}
            {/* {artifacts.length > 0 && (
              <div className="lg:col-span-1" data-testid="artifacts">
                <Artifact
                  artifacts={artifacts}
                  selectedArtifactId={selectedArtifactId || undefined}
                  onArtifactSelect={setSelectedArtifactId}
                  isMinimized={isArtifactPanelMinimized}
                  onMinimize={() => setIsArtifactPanelMinimized(true)}
                  onExpand={() => setIsArtifactPanelMinimized(false)}
                  className="sticky top-4 bottom-4"
                />
              </div>
            )} */}
          </div>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
