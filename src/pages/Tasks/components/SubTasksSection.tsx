import { memo } from 'react'
import { AccordionItem, Chip } from '@heroui/react'

import { useI18n } from '@/i18n'
import { AccordionTracker, ArtifactCard, Icon, Title } from '@/components'
import type { IconName } from '@/lib/types'
import type {
  Agent,
  Task,
  Artifact as ArtifactType,
  Conversation,
  Requirement,
} from '@/types'
import type { SubTaskStreamingState } from '@/hooks/useOrchestrationStreaming'

import { SubTaskStatusIcon } from './SubTaskStatusIcon'
import { SubTaskConversation } from './SubTaskConversation'
import localI18n from '../i18n'

/** Map requirement status to a task-like status for the icon */
const requirementStatusToTaskStatus = (req: Requirement): string => {
  if (req.status === 'satisfied' || req.satisfiedAt) return 'completed'
  if (req.status === 'failed') return 'failed'
  if (req.status === 'in_progress') return 'in_progress'
  return 'pending'
}

export const SubTasksSection = memo(
  ({
    subTasks,
    requirements = [],
    allConversations,
    allArtifacts,
    agentCache,
    onCopy,
    streamingMap,
  }: {
    subTasks: Task[]
    requirements?: Requirement[]
    allConversations: Conversation[]
    allArtifacts: ArtifactType[]
    agentCache: Record<string, Agent>
    onCopy: (content: string) => void
    /** Per-sub-task streaming state from the orchestration event bus. */
    streamingMap?: Map<string, SubTaskStreamingState>
  }) => {
    const { t } = useI18n(localI18n)

    const totalItems = subTasks.length + requirements.length
    if (!totalItems) return null

    return (
      <div className="mb-6">
        {/* Header with summary chips, like ConversationStepTracker */}
        <div className="flex items-center gap-2 mb-2 text-default-500">
          <Icon name="SplitSquareDashed" size="sm" />
          <Title level={5}>{t('Sub-Tasks')}</Title>
        </div>

        {/* Vertical inline list of sub-tasks */}
        <AccordionTracker>
          {[
            // Requirements rendered as sub-task items
            ...requirements.map((req) => {
              const mappedStatus = requirementStatusToTaskStatus(req)
              return (
                <AccordionItem
                  key={req.id}
                  startContent={<SubTaskStatusIcon status={mappedStatus} />}
                  title={req.description}
                  isDisabled
                  hideIndicator
                />
              )
            }),

            ...subTasks.map((subTask) => {
              const agent = subTask.assignedAgentId
                ? agentCache[subTask.assignedAgentId]
                : null
              const subArtifacts = allArtifacts.filter(
                (a) => a.taskId === subTask.id,
              )
              const isRunning = subTask.status === 'in_progress'
              const streamingState = streamingMap?.get(subTask.id)
              const isStreaming = !!streamingState?.isStreaming

              return (
                <AccordionItem key={subTask.id} title={subTask.title}>
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

                  {/* Expanded content: always visible for running/streaming tasks, indented with border */}
                  {(isRunning ||
                    isStreaming ||
                    subTask.description ||
                    subArtifacts.length > 0) && (
                    <div className="ml-5 pl-3 border-l border-default-200 space-y-3 pb-2">
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
                </AccordionItem>
              )
            }),
          ]}
        </AccordionTracker>
      </div>
    )
  },
)

SubTasksSection.displayName = 'SubTasksSection'
