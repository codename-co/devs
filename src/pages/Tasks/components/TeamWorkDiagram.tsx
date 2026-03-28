/**
 * TeamWorkDiagram
 *
 * Custom live-updated visual representation of the agent team at work.
 * Shows three complementary views:
 *
 * 1. **Pipeline** — DAG of sub-tasks with dependency arrows, showing
 *    parallel/sequential execution lanes, agent avatars, and live status.
 *
 * 2. **Agent roster** — compact strip of agent avatars with role, task count,
 *    and pulsing indicator when actively working.
 *
 * 3. **Activity feed** — last few inter-agent messages (findings/status).
 *
 * Uses agent avatars (portraits/icons) for visual identity. Entirely custom
 * React rendering — no Mermaid dependency.
 */

import { memo, useMemo, useEffect, useState, useRef } from 'react'
import { Chip, ProgressBar, Spinner, Tooltip } from '@heroui/react'

import { AgentAvatar } from '@/components/AgentAvatar'
import { Icon } from '@/components'
import type { IconName } from '@/lib/types'
import { useMailboxStore } from '@/stores/mailboxStore'
import { getAgentById } from '@/stores/agentStore'
import type { Agent, AgentMessage, OrchestrationWorkflow, Task } from '@/types'
import type { WorkflowProgressState } from '@/hooks/useOrchestrationStreaming'

// ============================================================================
// Helpers
// ============================================================================

function resolveAgent(id: string | undefined): Agent | null {
  if (!id) return null
  return getAgentById(id) ?? null
}

function statusColor(
  status: string,
): 'success' | 'primary' | 'danger' | 'default' | 'warning' {
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

function statusIcon(status: string): IconName {
  switch (status) {
    case 'completed':
      return 'CheckCircleSolid'
    case 'in_progress':
      return 'PlaySolid'
    case 'failed':
      return 'WarningTriangleSolid'
    default:
      return 'ClockSolid'
  }
}

/** Compute parallel "lanes" by topologically sorting sub-tasks into rows
 *  where each row's tasks can execute concurrently (all deps satisfied). */
function computeLanes(subTasks: Task[]): Task[][] {
  if (subTasks.length === 0) return []

  const taskMap = new Map(subTasks.map((t) => [t.id, t]))
  const placed = new Set<string>()
  const lanes: Task[][] = []

  // Iteratively place tasks whose deps are all placed
  let safety = subTasks.length + 1
  while (placed.size < subTasks.length && safety-- > 0) {
    const lane: Task[] = []
    for (const task of subTasks) {
      if (placed.has(task.id)) continue
      const depsOk = (task.dependencies ?? []).every(
        (dep) => placed.has(dep) || !taskMap.has(dep),
      )
      if (depsOk) lane.push(task)
    }
    if (lane.length === 0) {
      // Remaining tasks have unresolvable deps — dump them in a final lane
      const remaining = subTasks.filter((t) => !placed.has(t.id))
      if (remaining.length > 0) lanes.push(remaining)
      break
    }
    lane.forEach((t) => placed.add(t.id))
    lanes.push(lane)
  }

  return lanes
}

/** Format a timestamp as HH:MM. */
function formatTime(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Sub-components
// ============================================================================

/** A single task node in the pipeline. */
const TaskNode = memo(
  ({
    task,
    isActive,
    agent,
  }: {
    task: Task
    isActive: boolean
    agent: Agent | null
  }) => {
    const color = statusColor(task.status)
    const isRunning = task.status === 'in_progress' || isActive

    return (
      <Tooltip
        content={
          <div className="max-w-xs p-1">
            <p className="font-medium text-sm">{task.title}</p>
            {task.description && (
              <p className="text-xs text-default-400 mt-1 line-clamp-3">
                {task.description}
              </p>
            )}
            {agent && (
              <p className="text-xs mt-1">
                Agent: <strong>{agent.name}</strong> — {agent.role}
              </p>
            )}
          </div>
        }
        placement="top"
        delay={300}
      >
        <div
          className={`
            relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border
            transition-all duration-300 min-w-0 max-w-48
            ${
              isRunning
                ? 'border-primary-300 bg-primary-50 dark:bg-primary-950/30 shadow-sm shadow-primary-200/50'
                : task.status === 'completed'
                  ? 'border-success-200 bg-success-50/50 dark:bg-success-950/20'
                  : task.status === 'failed'
                    ? 'border-danger-200 bg-danger-50/50 dark:bg-danger-950/20'
                    : 'border-default-200 bg-default-50 dark:bg-default-100/5'
            }
          `}
        >
          {/* Pulsing ring when active */}
          {isRunning && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500" />
            </span>
          )}

          {/* Agent avatar */}
          {agent ? (
            <AgentAvatar agent={agent} size="sm" />
          ) : (
            <Icon
              name={statusIcon(task.status)}
              className={`w-4 h-4 shrink-0 text-${color}`}
            />
          )}

          {/* Title */}
          <span className="text-xs font-medium truncate leading-tight">
            {task.title}
          </span>
        </div>
      </Tooltip>
    )
  },
)
TaskNode.displayName = 'TaskNode'

/** Dependency arrow drawn between lanes. */
const LaneConnector = memo(({ parallel }: { parallel: boolean }) => {
  return (
    <div className="flex items-center justify-center py-0.5 text-default-300">
      {parallel ? (
        <Icon name="NavArrowDown" className="w-3.5 h-3.5" />
      ) : (
        <Icon name="NavArrowDown" className="w-3.5 h-3.5" />
      )}
    </div>
  )
})
LaneConnector.displayName = 'LaneConnector'

/** Agent roster chip — small avatar + name + task count + activity ring. */
const AgentChip = memo(
  ({
    agent,
    taskCount,
    completedCount,
    isActive,
  }: {
    agent: Agent
    taskCount: number
    completedCount: number
    isActive: boolean
  }) => {
    return (
      <Tooltip
        content={`${agent.name} — ${agent.role} (${completedCount}/${taskCount} tasks)`}
        placement="top"
        delay={200}
      >
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
            <AgentAvatar agent={agent} size="sm" />
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
              </span>
            )}
          </div>
          <span className="text-[10px] text-default-500 truncate max-w-14 leading-tight">
            {agent.name}
          </span>
          {taskCount > 0 && (
            <div className="w-full">
              <ProgressBar
                size="sm"
                value={taskCount > 0 ? (completedCount / taskCount) * 100 : 0}
                color={completedCount === taskCount ? 'success' : 'primary'}
                className="max-w-14"
                aria-label={`${completedCount}/${taskCount}`}
              />
            </div>
          )}
        </div>
      </Tooltip>
    )
  },
)
AgentChip.displayName = 'AgentChip'

/** A single message in the activity feed. */
const MessageRow = memo(({ msg }: { msg: AgentMessage }) => {
  const fromAgent = resolveAgent(msg.from)
  const typeIcon = msg.type === 'finding' ? 'LightBulbOn' : 'Activity'

  return (
    <div className="flex items-start gap-1.5 py-0.5">
      <span className="text-[10px] text-default-300 whitespace-nowrap mt-0.5">
        {formatTime(msg.timestamp)}
      </span>
      {fromAgent ? (
        <AgentAvatar agent={fromAgent} size="sm" />
      ) : (
        <Icon name="User" className="w-3.5 h-3.5 text-default-400 mt-0.5" />
      )}
      <Icon
        name={typeIcon}
        className={`w-3 h-3 mt-0.5 shrink-0 ${
          msg.type === 'finding' ? 'text-warning-500' : 'text-primary-400'
        }`}
      />
      <span className="text-xs text-default-600 line-clamp-1 leading-tight">
        {msg.content}
      </span>
    </div>
  )
})
MessageRow.displayName = 'MessageRow'

// ============================================================================
// Main Component
// ============================================================================

interface TeamWorkDiagramProps {
  workflowId: string | undefined
  workflow: OrchestrationWorkflow | null
  liveProgress: WorkflowProgressState | null
  subTasks: Task[]
}

export const TeamWorkDiagram = memo(
  ({ workflowId, workflow, liveProgress, subTasks }: TeamWorkDiagramProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const feedRef = useRef<HTMLDivElement>(null)

    // ── Mailbox messages ────────────────────────────────────────────────
    const allMessages = useMailboxStore((s) => s.messages)
    const loadMessages = useMailboxStore((s) => s.loadMessages)

    useEffect(() => {
      if (workflowId) loadMessages()
    }, [workflowId, loadMessages])

    const messages: AgentMessage[] = useMemo(() => {
      if (!workflowId) return []
      return allMessages
        .filter((m) => m.workflowId === workflowId)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )
    }, [allMessages, workflowId])

    // ── Derived data ────────────────────────────────────────────────────
    const activeTaskIds = useMemo(
      () => new Set(liveProgress?.activeAgents?.map((a) => a.taskId) ?? []),
      [liveProgress?.activeAgents],
    )

    const activeAgentIds = useMemo(
      () => new Set(liveProgress?.activeAgents?.map((a) => a.agentId) ?? []),
      [liveProgress?.activeAgents],
    )

    // Collect every agent referenced anywhere
    const agentRoster = useMemo(() => {
      const idSet = new Set<string>()
      if (workflow?.leadAgentId) idSet.add(workflow.leadAgentId)
      workflow?.participatingAgentIds?.forEach((id) => idSet.add(id))
      subTasks.forEach((st) => {
        if (st.assignedAgentId) idSet.add(st.assignedAgentId)
        st.steps?.forEach((s) => {
          if (s.agentId) idSet.add(s.agentId)
        })
      })
      messages.forEach((m) => {
        idSet.add(m.from)
        if (m.to !== 'broadcast') idSet.add(m.to)
      })
      liveProgress?.activeAgents?.forEach((a) => idSet.add(a.agentId))

      // Resolve and compute stats
      const result: Array<{
        agent: Agent
        taskCount: number
        completedCount: number
        isLead: boolean
      }> = []
      for (const id of idSet) {
        const agent = resolveAgent(id)
        if (!agent) continue
        const assigned = subTasks.filter((st) => st.assignedAgentId === id)
        result.push({
          agent,
          taskCount: assigned.length,
          completedCount: assigned.filter((st) => st.status === 'completed')
            .length,
          isLead: id === workflow?.leadAgentId,
        })
      }
      // Lead first
      result.sort((a, b) => (a.isLead ? -1 : b.isLead ? 1 : 0))
      return result
    }, [workflow, subTasks, messages, liveProgress?.activeAgents])

    // Pipeline lanes
    const lanes = useMemo(() => computeLanes(subTasks), [subTasks])

    // Auto-scroll feed
    useEffect(() => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight
      }
    }, [messages.length])

    // ── Visibility check ────────────────────────────────────────────────
    const hasContent =
      agentRoster.length > 0 ||
      subTasks.length > 0 ||
      messages.length > 0 ||
      (liveProgress?.activeAgents?.length ?? 0) > 0

    if (!workflowId || !hasContent) return null

    const activeCount = liveProgress?.activeAgents?.length ?? 0
    const completedCount = subTasks.filter(
      (st) => st.status === 'completed',
    ).length
    const totalCount = subTasks.length

    return (
      <div className="mb-4 border border-default-200 rounded-lg overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 bg-default-50 hover:bg-default-100 transition-colors cursor-pointer"
          onClick={() => setIsExpanded((v) => !v)}
        >
          <Icon name="Community" size="sm" />
          <span className="text-sm font-medium">Team Work</span>
          {activeCount > 0 && (
            <Chip
              size="sm"
              variant="soft"
              color="accent"
              startContent={<Spinner size="sm" className="mr-0.5" />}
            >
              {activeCount} active
            </Chip>
          )}
          {totalCount > 0 && (
            <Chip size="sm" variant="soft" color="default">
              {completedCount}/{totalCount}
            </Chip>
          )}
          <span className="ml-auto text-default-400 text-xs">
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>

        {/* ── Expanded body ──────────────────────────────────────────── */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3">
            {/* Overall progress bar */}
            {totalCount > 0 && (
              <ProgressBar
                size="sm"
                value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
                color={completedCount === totalCount ? 'success' : 'primary'}
                aria-label={`${completedCount}/${totalCount} tasks`}
                className="mt-2"
              />
            )}

            {/* ── Agent roster ───────────────────────────────────────── */}
            {agentRoster.length > 0 && (
              <div className="flex items-end gap-3 overflow-x-auto pb-1">
                {agentRoster.map(
                  ({ agent, taskCount, completedCount: cc, isLead }) => (
                    <div key={agent.id} className="flex flex-col items-center">
                      {isLead && (
                        <span className="text-[9px] text-warning-500 font-semibold mb-0.5">
                          LEAD
                        </span>
                      )}
                      <AgentChip
                        agent={agent}
                        taskCount={taskCount}
                        completedCount={cc}
                        isActive={activeAgentIds.has(agent.id)}
                      />
                    </div>
                  ),
                )}
              </div>
            )}

            {/* ── Pipeline (dependency DAG) ──────────────────────────── */}
            {lanes.length > 0 && (
              <div className="flex flex-col items-center gap-0">
                {lanes.map((lane, laneIdx) => (
                  <div key={laneIdx}>
                    {laneIdx > 0 && (
                      <LaneConnector parallel={lane.length > 1} />
                    )}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {lane.length > 1 && (
                        <span className="text-[9px] text-default-400 font-mono mr-1">
                          ∥
                        </span>
                      )}
                      {lane.map((task) => (
                        <TaskNode
                          key={task.id}
                          task={task}
                          isActive={activeTaskIds.has(task.id)}
                          agent={resolveAgent(task.assignedAgentId)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Phase indicator ─────────────────────────────────────── */}
            {liveProgress?.phase && (
              <div className="text-center">
                <Chip
                  size="sm"
                  variant="soft"
                  color="accent"
                  className="text-xs"
                >
                  {liveProgress.phaseMessage || liveProgress.phase}
                </Chip>
              </div>
            )}

            {/* ── Activity feed (last messages) ──────────────────────── */}
            {messages.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Icon
                    name="ChatBubble"
                    className="w-3 h-3 text-default-400"
                  />
                  <span className="text-[10px] text-default-400 font-medium uppercase tracking-wide">
                    Activity
                  </span>
                </div>
                <div
                  ref={feedRef}
                  className="max-h-24 overflow-y-auto space-y-0.5"
                >
                  {messages.slice(-8).map((msg) => (
                    <MessageRow key={msg.id} msg={msg} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
)

TeamWorkDiagram.displayName = 'TeamWorkDiagram'
