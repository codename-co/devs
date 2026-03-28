import { memo } from 'react'
import { Chip } from '@heroui/react'

import { useI18n } from '@/i18n'
import { AccordionTracker, ArtifactCard, Icon, Title } from '@/components'
import type { IconName } from '@/lib/types'
import type {
  Agent,
  Task,
  Artifact as ArtifactType,
  Conversation,
} from '@/types'
import type { SubTaskStreamingState } from '@/hooks/useOrchestrationStreaming'

import { SubTaskStatusIcon } from './SubTaskStatusIcon'
import { SubTaskConversation } from './SubTaskConversation'
import localI18n from '../i18n'

export const SubTasksSection = memo(
  ({
    subTasks,
    allTasks = [],
    allConversations,
    allArtifacts,
    agentCache,
    onCopy,
    streamingMap,
  }: {
    subTasks: Task[]
    /** All tasks in the system, used to find nested sub-tasks (refinements). */
    allTasks?: Task[]
    allConversations: Conversation[]
    allArtifacts: ArtifactType[]
    agentCache: Record<string, Agent>
    onCopy: (content: string) => void
    /** Per-sub-task streaming state from the orchestration event bus. */
    streamingMap?: Map<string, SubTaskStreamingState>
  }) => {
    const { t } = useI18n(localI18n)

    if (!subTasks.length) return null

    /** Render a list of sub-tasks recursively (handles nested refinement tasks). */
    const renderSubTasks = (tasks: Task[], depth: number = 0) =>
      tasks.map((subTask) => {
        const agent = subTask.assignedAgentId
          ? agentCache[subTask.assignedAgentId]
          : null
        const subArtifacts = allArtifacts.filter((a) => a.taskId === subTask.id)
        const isRunning = subTask.status === 'in_progress'
        const streamingState = streamingMap?.get(subTask.id)
        const isStreaming = !!streamingState?.isStreaming

        // Find nested sub-tasks (e.g. refinement tasks)
        const nestedSubTasks = allTasks
          .filter((t) => t.parentTaskId === subTask.id)
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )

        return (
          <Accordion.Item
            id={subTask.id}
            startContent={<SubTaskStatusIcon status={subTask.status} />}
            title={
              <div className="flex items-center gap-2">
                <span
                  className={`flex-1 ${
                    subTask.status === 'failed' ? 'text-danger-600' : ''
                  }`}
                >
                  {subTask.title}
                </span>
                {agent && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="accent"
                    startContent={
                      agent.icon ? (
                        <Icon
                          name={agent.icon as IconName}
                          className="w-3 h-3"
                        />
                      ) : undefined
                    }
                    className="font-sans"
                  >
                    {agent.name}
                  </Chip>
                )}
              </div>
            }
            classNames={{
              content: 'ms-4 ps-4 border-l-2 border-default-200',
            }}
          >
            {/* Expanded content: always visible for running/streaming tasks, indented with border */}
            {(isRunning ||
              isStreaming ||
              subTask.description ||
              subArtifacts.length > 0 ||
              nestedSubTasks.length > 0) && (
              <div className="space-y-3 pb-2">
                {/* Sub-task conversation */}
                <SubTaskConversation
                  subTask={subTask}
                  conversations={allConversations}
                  agentCache={agentCache}
                  onCopy={onCopy}
                  streaming={streamingState}
                />
                {/* Sub-task artifacts */}
                {subArtifacts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-default-500">
                      <Icon name="Page" size="sm" />
                      <Title level={5}>
                        {t('Artifacts')} ({subArtifacts.length})
                      </Title>
                    </div>
                    <div className="space-y-2">
                      {subArtifacts.map((artifact) => (
                        <ArtifactCard key={artifact.id} artifact={artifact} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Nested sub-tasks (refinement tasks) */}
                {nestedSubTasks.length > 0 && (
                  <AccordionTracker>
                    {renderSubTasks(nestedSubTasks, depth + 1)}
                  </AccordionTracker>
                )}
              </div>
            )}
          </Accordion.Item>
        )
      })

    return (
      <div className="mb-6">
        {/* Vertical inline list of sub-tasks */}
        <AccordionTracker>{renderSubTasks(subTasks)}</AccordionTracker>
      </div>
    )
  },
)

SubTasksSection.displayName = 'SubTasksSection'
