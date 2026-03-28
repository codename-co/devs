/**
 * AgentTeamBar
 *
 * Horizontal row of agent chips showing the team working on a workflow.
 * Active agents get a pulsing indicator; completed agents get a checkmark.
 *
 * Intentionally simple — chips in a row, no org chart.
 */

import { memo, useMemo } from 'react'
import { Chip, Spinner } from '@/components/heroui-compat'

import { getAgentById } from '@/stores/agentStore'
import type { WorkflowProgressState } from '@/hooks/useOrchestrationStreaming'

// ============================================================================
// Component
// ============================================================================

interface AgentTeamBarProps {
  /** All agent IDs participating in the workflow. */
  participatingAgentIds: string[]
  /** Live progress data from the streaming hook. */
  liveProgress?: WorkflowProgressState | null
}

export const AgentTeamBar = memo(
  ({ participatingAgentIds, liveProgress }: AgentTeamBarProps) => {
    const activeAgentIds = useMemo(
      () => new Set((liveProgress?.activeAgents ?? []).map((a) => a.agentId)),
      [liveProgress?.activeAgents],
    )

    const agents = useMemo(
      () =>
        participatingAgentIds.map((id) => {
          const agent = getAgentById(id)
          return {
            id,
            name: agent?.name ?? id.slice(0, 8),
            role: agent?.role ?? '',
          }
        }),
      [participatingAgentIds],
    )

    if (agents.length === 0) return null

    return (
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-default-400 text-xs font-medium">Team:</span>
        {agents.map((agent) => {
          const isActive = activeAgentIds.has(agent.id)
          return (
            <Chip
              key={agent.id}
              size="sm"
              variant={isActive ? 'solid' : 'flat'}
              color={isActive ? 'primary' : 'default'}
              startContent={
                isActive ? <Spinner size="sm" className="mr-1" /> : undefined
              }
            >
              {agent.name}
            </Chip>
          )
        })}
      </div>
    )
  },
)

AgentTeamBar.displayName = 'AgentTeamBar'
