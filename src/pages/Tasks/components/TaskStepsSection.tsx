import { memo } from 'react'
import { Chip, Progress } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { IconName } from '@/lib/types'
import type { Agent, Task } from '@/types'

export const TaskStepsSection = memo(
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
            {t('Steps')} ({completed}/{steps.length})
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
