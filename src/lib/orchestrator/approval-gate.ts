/**
 * Approval Gate
 *
 * Human-in-the-loop gate logic for background orchestration tasks.
 * Allows users to configure approval checkpoints at key decision points,
 * preventing runaway LLM token spend on background tasks.
 *
 * Gates can trigger at:
 * - before-execution: Before any LLM calls start
 * - after-decomposition: After task breakdown, before agent execution
 * - before-synthesis: After sub-tasks complete, before final synthesis
 * - on-budget-exceed: When estimated token usage exceeds a threshold
 *
 * Auto-approve policies for unattended background execution:
 * - always: Auto-approve all gates (fire-and-forget)
 * - under-budget: Auto-approve only if within budget threshold
 * - never: Always require human approval (default)
 *
 * @module lib/orchestrator/approval-gate
 */

import type { ApprovalGate, QueuedTaskEntry } from '@/types'
import { useQueueStore } from '@/stores/queueStore'

// ============================================================================
// Gate Creation Helpers
// ============================================================================

/**
 * Create a default set of approval gates for background tasks.
 * Users can customize which gates are active.
 */
export function createDefaultGates(
  policy: ApprovalGate['autoApprovePolicy'] = 'never',
): ApprovalGate[] {
  return [
    {
      id: crypto.randomUUID(),
      trigger: 'before-execution',
      status: policy === 'always' ? 'auto-approved' : 'pending',
      autoApprovePolicy: policy,
    },
  ]
}

/**
 * Create a full set of gates for comprehensive human oversight.
 */
export function createComprehensiveGates(
  policy: ApprovalGate['autoApprovePolicy'] = 'never',
  budgetThreshold?: number,
): ApprovalGate[] {
  const gates: ApprovalGate[] = [
    {
      id: crypto.randomUUID(),
      trigger: 'before-execution',
      status: policy === 'always' ? 'auto-approved' : 'pending',
      autoApprovePolicy: policy,
    },
    {
      id: crypto.randomUUID(),
      trigger: 'after-decomposition',
      status: policy === 'always' ? 'auto-approved' : 'pending',
      autoApprovePolicy: policy,
    },
    {
      id: crypto.randomUUID(),
      trigger: 'before-synthesis',
      status: policy === 'always' ? 'auto-approved' : 'pending',
      autoApprovePolicy: policy,
    },
  ]

  if (budgetThreshold) {
    gates.push({
      id: crypto.randomUUID(),
      trigger: 'on-budget-exceed',
      status: 'pending',
      autoApprovePolicy: policy === 'always' ? 'always' : 'under-budget',
      budgetThreshold,
    })
  }

  return gates
}

// ============================================================================
// Gate Evaluation
// ============================================================================

/**
 * Check if a specific gate trigger should block execution.
 * Returns the gate that is blocking, or null if execution can proceed.
 */
export function checkGate(
  entry: QueuedTaskEntry,
  trigger: ApprovalGate['trigger'],
  currentTokenEstimate?: number,
): ApprovalGate | null {
  if (!entry.approvalGates) return null

  const gate = entry.approvalGates.find((g) => g.trigger === trigger)
  if (!gate) return null

  // Already approved or rejected
  if (gate.status === 'approved' || gate.status === 'auto-approved') {
    return null
  }
  if (gate.status === 'rejected') {
    return gate // Blocked — task should be cancelled
  }

  // Pending — evaluate auto-approve policy
  switch (gate.autoApprovePolicy) {
    case 'always':
      // Auto-approve
      return null

    case 'under-budget':
      if (
        gate.budgetThreshold &&
        currentTokenEstimate !== undefined &&
        currentTokenEstimate <= gate.budgetThreshold
      ) {
        return null // Under budget, auto-approve
      }
      return gate // Over budget or no estimate, block

    case 'never':
    default:
      return gate // Always block for manual review
  }
}

/**
 * Check if any pending gates exist for an entry at a given trigger point.
 */
export function hasPendingGate(
  entry: QueuedTaskEntry,
  trigger: ApprovalGate['trigger'],
): boolean {
  return checkGate(entry, trigger) !== null
}

/**
 * Check if any gate has been rejected.
 */
export function hasRejectedGate(entry: QueuedTaskEntry): boolean {
  return entry.approvalGates?.some((g) => g.status === 'rejected') ?? false
}

// ============================================================================
// Gate Actions
// ============================================================================

/**
 * Approve a specific gate on a queue entry.
 */
export async function approveGate(
  entryId: string,
  gateId: string,
  reviewedBy?: string,
  note?: string,
): Promise<void> {
  const store = useQueueStore.getState()
  const entry = store.getEntryById(entryId)
  if (!entry?.approvalGates) return

  const updatedGates = entry.approvalGates.map((g) =>
    g.id === gateId
      ? {
          ...g,
          status: 'approved' as const,
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          note,
        }
      : g,
  )

  await store.updateEntry(entryId, { approvalGates: updatedGates })
}

/**
 * Reject a specific gate on a queue entry.
 * This effectively cancels the task.
 */
export async function rejectGate(
  entryId: string,
  gateId: string,
  reviewedBy?: string,
  note?: string,
): Promise<void> {
  const store = useQueueStore.getState()
  const entry = store.getEntryById(entryId)
  if (!entry?.approvalGates) return

  const updatedGates = entry.approvalGates.map((g) =>
    g.id === gateId
      ? {
          ...g,
          status: 'rejected' as const,
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          note,
        }
      : g,
  )

  await store.updateEntry(entryId, {
    approvalGates: updatedGates,
    runState: 'cancelled',
    statusMessage: `Rejected: ${note || 'Gate rejected by reviewer'}`,
  })
}

/**
 * Auto-approve all pending gates for an entry based on policy.
 * Used when the user configures fire-and-forget mode.
 */
export async function autoApproveAll(
  entryId: string,
  currentTokenEstimate?: number,
): Promise<{ allApproved: boolean; blockedGateId?: string }> {
  const store = useQueueStore.getState()
  const entry = store.getEntryById(entryId)
  if (!entry?.approvalGates) return { allApproved: true }

  let allApproved = true
  let blockedGateId: string | undefined

  const updatedGates = entry.approvalGates.map((g) => {
    if (g.status !== 'pending') return g

    switch (g.autoApprovePolicy) {
      case 'always':
        return {
          ...g,
          status: 'auto-approved' as const,
          reviewedAt: new Date().toISOString(),
        }

      case 'under-budget':
        if (
          g.budgetThreshold &&
          currentTokenEstimate !== undefined &&
          currentTokenEstimate <= g.budgetThreshold
        ) {
          return {
            ...g,
            status: 'auto-approved' as const,
            reviewedAt: new Date().toISOString(),
          }
        }
        allApproved = false
        blockedGateId = g.id
        return g

      default:
        allApproved = false
        blockedGateId = g.id
        return g
    }
  })

  await store.updateEntry(entryId, { approvalGates: updatedGates })
  return { allApproved, blockedGateId }
}

/**
 * Get all queue entries with pending approval gates.
 * Used by the UI to show a review queue.
 */
export function getPendingApprovals(): Array<{
  entry: QueuedTaskEntry
  pendingGates: ApprovalGate[]
}> {
  const entries = useQueueStore.getState().entries

  return entries
    .filter((e) => e.approvalGates?.some((g) => g.status === 'pending'))
    .map((e) => ({
      entry: e,
      pendingGates: e.approvalGates!.filter((g) => g.status === 'pending'),
    }))
}
