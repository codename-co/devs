/**
 * @module features/auth/components/SharedRunStatus
 *
 * Shared Orchestration Run Status — shows active orchestration runs
 * being performed by team members in an Enterprise space.
 *
 * Displays a compact card for each active run with:
 * - Initiator name
 * - Progress bar
 * - Current phase
 * - Active agents
 * - Paused indicator if initiator disconnected
 */

import { memo } from 'react'
import { Card, CardBody, Progress, Chip, Avatar } from '@heroui/react'
import { useSharedRuns } from '@/lib/teams/shared-orchestration-hooks'
import { isTeams } from '@/lib/teams/config'
import type { SharedOrchestrationRun } from '@/lib/teams/shared-orchestration'

// ============================================================================
// Sub-components
// ============================================================================

function RunCard({ run }: { run: SharedOrchestrationRun }) {
  const statusColor =
    run.status === 'running'
      ? 'primary'
      : run.status === 'paused'
        ? 'warning'
        : run.status === 'completed'
          ? 'success'
          : 'danger'

  const statusLabel =
    run.status === 'running'
      ? 'Running'
      : run.status === 'paused'
        ? `Paused — ${run.initiator.name} went offline`
        : run.status === 'completed'
          ? 'Completed'
          : 'Failed'

  const elapsed = Date.now() - run.startedAt
  const elapsedStr =
    elapsed < 60_000
      ? `${Math.floor(elapsed / 1000)}s`
      : `${Math.floor(elapsed / 60_000)}m`

  return (
    <Card
      shadow="sm"
      className="border border-default-200 bg-default-50"
    >
      <CardBody className="p-3 gap-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              name={run.initiator.name.charAt(0)}
              size="sm"
              classNames={{ base: 'w-6 h-6 text-xs' }}
            />
            <span className="text-sm font-medium truncate">
              {run.initiator.name}
            </span>
          </div>
          <Chip size="sm" color={statusColor} variant="flat">
            {statusLabel}
          </Chip>
        </div>

        {/* Prompt preview */}
        <p className="text-xs text-default-500 line-clamp-1">{run.prompt}</p>

        {/* Progress */}
        <Progress
          size="sm"
          value={run.progress}
          color={statusColor}
          className="w-full"
          aria-label={`${run.progress}% complete`}
        />

        {/* Phase + meta */}
        <div className="flex items-center justify-between text-xs text-default-400">
          <span className="truncate">{run.phase}</span>
          <div className="flex items-center gap-2 shrink-0">
            {run.subTasksTotal > 0 && (
              <span>
                {run.subTasksCompleted}/{run.subTasksTotal} tasks
              </span>
            )}
            <span>{elapsedStr}</span>
          </div>
        </div>

        {/* Active agents */}
        {run.activeAgentIds.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {run.activeAgentIds.map((agentId) => (
              <Chip
                key={agentId}
                size="sm"
                variant="dot"
                color="primary"
                classNames={{ base: 'text-xs h-5' }}
              >
                {agentId}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ============================================================================
// Main component
// ============================================================================

interface SharedRunStatusProps {
  /** Enterprise space ID */
  spaceId: string | undefined
  /** Additional CSS classes */
  className?: string
}

/**
 * Shows active/paused orchestration runs happening in a space.
 *
 * Only visible in Teams mode. Displays a stack of compact cards for
 * runs that are currently in progress.
 *
 * Returns `null` when not in Teams mode or no active runs exist.
 */
export const SharedRunStatus = memo(function SharedRunStatus({
  spaceId,
  className = '',
}: SharedRunStatusProps) {
  if (!isTeams) return null

  const activeRuns = useSharedRuns(spaceId, 'running')
  const pausedRuns = useSharedRuns(spaceId, 'paused')

  const runs = [...activeRuns, ...pausedRuns]

  if (runs.length === 0) return null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-medium text-default-600">
          {runs.length} active orchestration{runs.length > 1 ? 's' : ''}
        </span>
      </div>
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  )
})
