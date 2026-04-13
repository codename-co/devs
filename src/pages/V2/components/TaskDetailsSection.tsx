import { Chip, Disclosure } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useTasks } from '@/hooks'
import type { IconName } from '@/lib/types'
import type { Agent, Requirement, Task } from '@/types'

// ── Status helpers ──────────────────────────────────────────────────────

const reqStatusIcon = (req: Requirement): IconName =>
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

const taskStatusIcon = (status: string | undefined): IconName =>
  status === 'completed'
    ? 'Check'
    : status === 'in_progress' || status === 'claimed'
      ? 'Running'
      : status === 'failed'
        ? 'X'
        : 'Clock'

const taskStatusColor = (status: string | undefined): string =>
  status === 'completed'
    ? 'text-success-500'
    : status === 'in_progress' || status === 'claimed'
      ? 'text-primary-500'
      : status === 'failed'
        ? 'text-danger-500'
        : 'text-default-400'

const STATUS_CHIP_COLOR: Record<
  string,
  'success' | 'danger' | 'accent' | 'default'
> = {
  completed: 'success',
  failed: 'danger',
  in_progress: 'accent',
  claimed: 'accent',
}

const TOOL_ICON: Record<string, IconName> = {
  web: 'Internet',
  api: 'Code',
  file: 'Page',
  shell: 'Terminal',
  custom: 'Settings',
}

// ── Component ───────────────────────────────────────────────────────────

interface TaskDetailsSectionProps {
  task: Task
  agentMap?: Map<string, Agent>
}

/**
 * Renders full task details in the V2 feed: status, tools, requirements,
 * steps, and sub-tasks — mirroring the V1 task page information.
 */
export function TaskDetailsSection({
  task,
  agentMap,
}: TaskDetailsSectionProps) {
  const { t } = useI18n()
  const allTasks = useTasks()

  const requirements = task.requirements ?? []
  const steps = task.steps ?? []
  const agent =
    task.agent ??
    (task.assignedAgentId ? agentMap?.get(task.assignedAgentId) : undefined)
  const tools = agent?.tools ?? []
  const subTasks = allTasks
    .filter((st) => st.parentTaskId === task.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

  const hasContent =
    requirements.length > 0 ||
    steps.length > 0 ||
    subTasks.length > 0 ||
    tools.length > 0

  return (
    <div className="flex flex-col gap-2 py-3">
      {/* Status + complexity chips */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <Chip
          size="sm"
          variant="soft"
          color={STATUS_CHIP_COLOR[task.status] ?? 'default'}
        >
          {task.status.replace('_', ' ')}
        </Chip>
        <Chip size="sm" variant="soft">
          {task.complexity}
        </Chip>
        {agent && (
          <Chip size="sm" variant="soft" color="accent">
            {agent.name}
          </Chip>
        )}
      </div>

      {!hasContent && null}

      {/* Tools used by the assigned agent */}
      {tools.length > 0 && (
        <Disclosure defaultExpanded={false}>
          <Disclosure.Heading>
            <Disclosure.Trigger className="bg-default-100/50 hover:bg-default-100 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors">
              <Icon name="Hammer" size="sm" className="text-muted shrink-0" />
              <span className="text-muted text-xs font-medium">
                {t('Tools')}
              </span>
              <span className="text-muted ml-auto mr-1 text-xs tabular-nums">
                {tools.length}
              </span>
              <Disclosure.Indicator className="text-muted h-3.5 w-3.5 shrink-0 transition-transform" />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="px-1 pt-1 pb-1">
              <div className="space-y-0.5">
                {tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  >
                    <Icon
                      name={TOOL_ICON[tool.type] ?? 'Settings'}
                      className="text-muted h-4 w-4 shrink-0"
                    />
                    <span className="text-foreground text-xs font-medium">
                      {tool.name}
                    </span>
                    {tool.description && (
                      <span className="text-muted text-xs flex-1 truncate">
                        — {tool.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      )}

      {/* Requirements */}
      {requirements.length > 0 && (
        <Disclosure defaultExpanded={false}>
          <Disclosure.Heading>
            <Disclosure.Trigger className="bg-default-100/50 hover:bg-default-100 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors">
              <Icon
                name="DoubleCheck"
                size="sm"
                className="text-muted shrink-0"
              />
              <span className="text-muted text-xs font-medium">
                {t('Requirements')}
              </span>
              <span className="text-muted ml-auto mr-1 text-xs tabular-nums">
                {
                  requirements.filter(
                    (r) => r.status === 'satisfied' || r.satisfiedAt,
                  ).length
                }
                /{requirements.length}
              </span>
              <Disclosure.Indicator className="text-muted h-3.5 w-3.5 shrink-0 transition-transform" />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="px-1 pt-1 pb-1">
              <div className="space-y-0.5">
                {requirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  >
                    <Icon
                      name={reqStatusIcon(req)}
                      className={`h-4 w-4 shrink-0 ${reqStatusColor(req)}`}
                    />
                    <span className="text-foreground text-xs flex-1">
                      {req.description}
                    </span>
                  </div>
                ))}
              </div>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <Disclosure defaultExpanded={false}>
          <Disclosure.Heading>
            <Disclosure.Trigger className="bg-default-100/50 hover:bg-default-100 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors">
              <Icon name="TaskList" size="sm" className="text-muted shrink-0" />
              <span className="text-muted text-xs font-medium">
                {t('Steps')}
              </span>
              <span className="text-muted ml-auto mr-1 text-xs tabular-nums">
                {steps.filter((s) => s.status === 'completed').length}/
                {steps.length}
              </span>
              <Disclosure.Indicator className="text-muted h-3.5 w-3.5 shrink-0 transition-transform" />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="px-1 pt-1 pb-1">
              <div className="space-y-0.5">
                {[...steps]
                  .sort((a, b) => a.order - b.order)
                  .map((step) => {
                    const stepAgent = step.agentId
                      ? agentMap?.get(step.agentId)
                      : undefined
                    return (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                      >
                        <Icon
                          name={taskStatusIcon(step.status)}
                          className={`h-4 w-4 shrink-0 ${taskStatusColor(step.status)}`}
                        />
                        <span className="text-foreground text-xs flex-1 truncate">
                          {step.name}
                        </span>
                        {stepAgent && (
                          <Chip
                            size="sm"
                            variant="soft"
                            className="shrink-0 text-[10px]"
                          >
                            {stepAgent.name}
                          </Chip>
                        )}
                        {step.duration != null && step.duration > 0 && (
                          <span className="text-muted shrink-0 text-[10px] tabular-nums">
                            {step.duration < 1000
                              ? `${Math.round(step.duration)}ms`
                              : `${(step.duration / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      )}

      {/* Sub-tasks */}
      {subTasks.length > 0 && (
        <Disclosure defaultExpanded={false}>
          <Disclosure.Heading>
            <Disclosure.Trigger className="bg-default-100/50 hover:bg-default-100 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors">
              <Icon name="GitFork" size="sm" className="text-muted shrink-0" />
              <span className="text-muted text-xs font-medium">
                {t('Sub-tasks' as any)}
              </span>
              <span className="text-muted ml-auto mr-1 text-xs tabular-nums">
                {subTasks.filter((s) => s.status === 'completed').length}/
                {subTasks.length}
              </span>
              <Disclosure.Indicator className="text-muted h-3.5 w-3.5 shrink-0 transition-transform" />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="px-1 pt-1 pb-1">
              <div className="space-y-0.5">
                {subTasks.map((sub) => {
                  const subAgent = sub.assignedAgentId
                    ? agentMap?.get(sub.assignedAgentId)
                    : undefined
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                    >
                      <Icon
                        name={taskStatusIcon(sub.status)}
                        className={`h-4 w-4 shrink-0 ${taskStatusColor(sub.status)}`}
                      />
                      <span className="text-foreground text-xs flex-1 truncate">
                        {sub.title}
                      </span>
                      {subAgent && (
                        <Chip
                          size="sm"
                          variant="soft"
                          className="shrink-0 text-[10px]"
                        >
                          {subAgent.name}
                        </Chip>
                      )}
                    </div>
                  )
                })}
              </div>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      )}
    </div>
  )
}
