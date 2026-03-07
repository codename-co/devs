/**
 * WorkflowHeader
 *
 * Richer replacement for TaskStatusBanner when an OrchestrationWorkflow exists.
 * Shows tier badge, status pill, phase message, progress bar, and duration.
 */

import { memo, useState, useEffect, useRef } from 'react'
import { Chip, Progress, Spinner } from '@heroui/react'

import type { OrchestrationWorkflow } from '@/types'
import type { WorkflowProgressState } from '@/hooks/useOrchestrationStreaming'

// ============================================================================
// Helpers
// ============================================================================

const STATUS_COLOR: Record<
  OrchestrationWorkflow['status'],
  'primary' | 'warning' | 'success' | 'danger' | 'secondary' | 'default'
> = {
  analyzing: 'primary',
  decomposing: 'primary',
  recruiting: 'secondary',
  executing: 'warning',
  validating: 'warning',
  synthesizing: 'primary',
  completed: 'success',
  failed: 'danger',
  interrupted: 'warning',
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

// ============================================================================
// Component
// ============================================================================

interface WorkflowHeaderProps {
  workflow: OrchestrationWorkflow
  /** Live progress from the streaming hook (updates faster than the store). */
  liveProgress?: WorkflowProgressState | null
}

export const WorkflowHeader = memo(
  ({ workflow, liveProgress }: WorkflowHeaderProps) => {
    // Duration ticker — updates every second while workflow is active
    const [elapsed, setElapsed] = useState(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const isTerminal = ['completed', 'failed', 'interrupted'].includes(
      workflow.status,
    )

    useEffect(() => {
      if (isTerminal) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        // Calculate final elapsed
        const start = new Date(workflow.createdAt).getTime()
        const end = workflow.completedAt
          ? new Date(workflow.completedAt).getTime()
          : new Date(workflow.updatedAt).getTime()
        // Guard against corrupted dates (Yjs may serialize Date as {})
        const diff = end - start
        setElapsed(diff > 0 ? diff : 0)
        return
      }

      const start = new Date(workflow.createdAt).getTime()
      // Guard: if createdAt is corrupted (epoch), don't show nonsensical elapsed
      if (isNaN(start) || start === 0) {
        setElapsed(0)
        return
      }
      const tick = () => setElapsed(Math.max(0, Date.now() - start))
      tick()
      intervalRef.current = setInterval(tick, 1000)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, [
      isTerminal,
      workflow.createdAt,
      workflow.completedAt,
      workflow.updatedAt,
    ])

    // Prefer live progress (from events) over stored workflow data
    const phase = liveProgress?.phase || workflow.phase || workflow.status
    const phaseMessage = liveProgress?.phaseMessage || workflow.phase || ''
    const progress = liveProgress?.progress ?? workflow.progress ?? 0

    const tierLabel = workflow.tier === 0 ? 'Direct' : 'Team'
    const tierColor = workflow.tier === 0 ? 'default' : 'secondary'
    const statusColor = STATUS_COLOR[workflow.status] ?? 'default'

    return (
      <div className="mb-4 flex flex-col gap-2">
        {/* Row 1: Badges + status + phase info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Chip size="sm" variant="flat" color={tierColor}>
            {tierLabel}
          </Chip>
          <Chip size="sm" variant="flat" color={statusColor}>
            {workflow.status.replace(/_/g, ' ')}
          </Chip>
          {!isTerminal && (
            <div className="flex items-center gap-2 text-primary text-sm">
              <Spinner size="sm" />
              <span>{phaseMessage || phase}</span>
            </div>
          )}
          <span className="text-default-400 text-xs ml-auto">
            {formatDuration(elapsed)}
          </span>
        </div>

        {/* Row 2: Progress bar (only while active) */}
        {!isTerminal && progress > 0 && (
          <Progress
            size="sm"
            value={progress}
            color="primary"
            className="max-w-md"
            label={phaseMessage}
            showValueLabel
            aria-label="Workflow progress"
          />
        )}

        {/* Row 3: Error message if failed */}
        {workflow.error && (
          <p className="text-danger text-sm">{workflow.error}</p>
        )}
      </div>
    )
  },
)

WorkflowHeader.displayName = 'WorkflowHeader'
