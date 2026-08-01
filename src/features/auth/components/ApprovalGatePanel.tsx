/**
 * @module features/auth/components/ApprovalGatePanel
 *
 * Approval Gate Panel — shows pending approval requests from shared
 * orchestration runs that any team member can approve or reject.
 */

import { memo, useCallback } from 'react'
import { Button, Card, CardBody, Chip } from '@heroui/react'
import { usePendingApprovals } from '@/lib/teams/shared-orchestration-hooks'
import { resolveApproval } from '@/lib/teams/shared-orchestration'
import { useTeamsUser } from '@/features/auth/hooks'
import { isTeams } from '@/lib/teams/config'
import type { SharedApprovalRequest } from '@/lib/teams/shared-orchestration'

function ApprovalCard({ approval }: { approval: SharedApprovalRequest }) {
  const user = useTeamsUser()

  const handleApprove = useCallback(() => {
    if (!user) return
    resolveApproval(approval.spaceId, approval.id, 'approved', user.id)
  }, [approval, user])

  const handleReject = useCallback(() => {
    if (!user) return
    resolveApproval(approval.spaceId, approval.id, 'rejected', user.id)
  }, [approval, user])

  const age = Date.now() - approval.createdAt
  const ageStr =
    age < 60_000
      ? 'just now'
      : age < 3600_000
        ? `${Math.floor(age / 60_000)}m ago`
        : `${Math.floor(age / 3600_000)}h ago`

  return (
    <Card shadow="sm" className="border border-warning-200 bg-warning-50/30">
      <CardBody className="p-3 gap-2">
        <div className="flex items-center justify-between">
          <Chip size="sm" color="warning" variant="flat">
            Approval needed
          </Chip>
          <span className="text-xs text-default-400">{ageStr}</span>
        </div>

        <p className="text-sm text-default-700">{approval.description}</p>

        <div className="text-xs text-default-400">
          Requested by {approval.requestedBy}
        </div>

        <div className="flex gap-2 justify-end mt-1">
          <Button
            size="sm"
            color="danger"
            variant="light"
            onPress={handleReject}
          >
            Reject
          </Button>
          <Button size="sm" color="success" variant="flat" onPress={handleApprove}>
            Approve
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

interface ApprovalGatePanelProps {
  spaceId: string | undefined
  className?: string
}

/**
 * Shows pending approval requests in an Enterprise space.
 *
 * Any authenticated team member can approve or reject. The resolution
 * is written to the Y.Doc and syncs to all peers, including the
 * orchestrator initiator who will resume the workflow.
 */
export const ApprovalGatePanel = memo(function ApprovalGatePanel({
  spaceId,
  className = '',
}: ApprovalGatePanelProps) {
  if (!isTeams) return null

  const pendingApprovals = usePendingApprovals(spaceId)

  if (pendingApprovals.length === 0) return null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
        <span className="text-xs font-medium text-default-600">
          {pendingApprovals.length} pending approval
          {pendingApprovals.length > 1 ? 's' : ''}
        </span>
      </div>
      {pendingApprovals.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} />
      ))}
    </div>
  )
})
