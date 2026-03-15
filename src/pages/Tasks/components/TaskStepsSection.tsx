import { memo } from 'react'
import { Accordion, AccordionItem, Chip } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { IconName } from '@/lib/types'
import type { Agent, Requirement, Task } from '@/types'

/** Map requirement status to step-like icon/color */
const reqStatusIcon = (req: Requirement): string =>
  req.status === 'satisfied' || req.satisfiedAt
    ? 'Check'
    : req.status === 'failed'
      ? 'X'
      : req.status === 'in_progress'
        ? 'Running'
        : 'Clock'

const reqStatusColor = (req: Requirement): string =>
  req.status === 'satisfied' || req.satisfiedAt
    ? 'text-success-500'
    : req.status === 'failed'
      ? 'text-danger-500'
      : req.status === 'in_progress'
        ? 'text-primary-500'
        : 'text-default-400'

export const TaskStepsSection = memo(
  ({
    steps,
    requirements = [],
    agentCache,
  }: {
    steps: Task['steps']
    requirements?: Requirement[]
    agentCache: Record<string, Agent>
  }) => {
    const { t } = useI18n()

    const totalItems = requirements.length + steps.length
    if (!totalItems) return null

    return (
      <div>
        <div className="space-y-1">
          {/* Requirements in a collapsed accordion */}
          {requirements.length > 0 && (
            // <div
            //   key="requirements"
            //   className="flex items-center gap-2 px-2 rounded-md hover:bg-default-50 transition-colors"
            // >
            // </div>
            <Accordion isCompact className="px-0">
              <AccordionItem
                key="requirements"
                startContent={
                  <Icon
                    name="DoubleCheck"
                    className={`w-4 h-4 flex-shrink-0`}
                  />
                }
                title={
                  <span className="text-sm font-medium text-default-800 flex-1 truncate">
                    {t('Requirements')}
                  </span>
                }
                classNames={{ trigger: 'py-1.5 px-2', content: 'pb-2' }}
              >
                <div className="space-y-1">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-default-50 transition-colors"
                    >
                      <Icon
                        name={reqStatusIcon(req) as IconName}
                        className={`w-4 h-4 flex-shrink-0 ${reqStatusColor(req)}`}
                      />
                      <span className="text-sm text-default-700 flex-1">
                        {req.description}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            </Accordion>
          )}
          {/* Steps */}
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
                  {step.duration != null && step.duration > 0 && (
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
