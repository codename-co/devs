/**
 * @module lib/teams/shared-orchestration
 *
 * Shared Orchestration for Enterprise Spaces
 *
 * When the orchestrator runs in an Enterprise space, this module writes
 * real-time events to the Enterprise Y.Doc so that all team members can
 * observe progress via Yjs sync.
 *
 * ## How it works
 *
 * ```
 * Alice submits a prompt in Engineering space
 *   → Orchestrator runs in Alice's tab
 *   → Events written to Enterprise Y.Doc via this module
 *   → Bob sees real-time progress via Yjs sync
 *   → If Alice disconnects: workflow pauses, UI shows "Paused"
 *   → Alice reconnects: workflow resumes from Y.Doc state
 * ```
 *
 * ## Architecture
 *
 * The orchestrator's event bus (src/lib/orchestrator/events.ts) emits events
 * locally. This module bridges those events into the Enterprise Y.Doc by:
 *
 * 1. Subscribing to the orchestrator event bus
 * 2. Writing each event as a `SharedOrchestrationEvent` to a Y.Map
 * 3. Maintaining a `SharedOrchestrationRun` record for active runs
 * 4. Detecting initiator disconnect via presence awareness
 *
 * The Enterprise Y.Doc syncs to all peers, so everyone sees the updates.
 */

import * as Y from 'yjs'
import { getExistingEnterpriseDoc } from './enterprise-doc'
import { onAny, type OrchestrationEvent } from '@/lib/orchestrator/events'

// ============================================================================
// Types
// ============================================================================

/**
 * An active orchestration run visible to all team members.
 */
export interface SharedOrchestrationRun {
  /** Unique run ID (same as workflowId) */
  id: string
  /** The user who initiated the run */
  initiator: {
    userId: string
    name: string
  }
  /** Space this run belongs to */
  spaceId: string
  /** Original prompt */
  prompt: string
  /** Current status */
  status: 'running' | 'paused' | 'completed' | 'failed'
  /** Current phase description */
  phase: string
  /** Progress 0-100 */
  progress: number
  /** When the run was started */
  startedAt: number
  /** When the run completed (if finished) */
  completedAt?: number
  /** Error message (if failed) */
  error?: string
  /** IDs of agents currently working */
  activeAgentIds: string[]
  /** Count of completed sub-tasks */
  subTasksCompleted: number
  /** Total sub-tasks */
  subTasksTotal: number
}

/**
 * A single orchestration event stored in the Enterprise Y.Doc timeline.
 */
export interface SharedOrchestrationEvent {
  /** Unique event ID */
  id: string
  /** The run this event belongs to */
  runId: string
  /** Space ID */
  spaceId: string
  /** Event type from the orchestrator */
  type: OrchestrationEvent['type']
  /** Event payload */
  payload: Record<string, unknown>
  /** When this event occurred */
  timestamp: number
}

/**
 * Approval request written to Y.Doc for team-wide approval gates.
 */
export interface SharedApprovalRequest {
  /** Unique request ID */
  id: string
  /** The run this approval belongs to */
  runId: string
  /** Space ID */
  spaceId: string
  /** Description of what needs approval */
  description: string
  /** Status of the approval */
  status: 'pending' | 'approved' | 'rejected'
  /** Who requested the approval */
  requestedBy: string
  /** Who approved/rejected (if resolved) */
  resolvedBy?: string
  /** When the request was created */
  createdAt: number
  /** When the request was resolved */
  resolvedAt?: number
}

// ============================================================================
// Y.Doc map names for shared orchestration data
// ============================================================================

const RUNS_MAP_NAME = 'orchestrationRuns'
const EVENTS_MAP_NAME = 'orchestrationEvents'
const APPROVALS_MAP_NAME = 'orchestrationApprovals'

// ============================================================================
// Core API
// ============================================================================

/**
 * Get the shared orchestration runs map from an Enterprise doc.
 */
export function getRunsMap(
  spaceId: string,
): Y.Map<SharedOrchestrationRun> | null {
  const doc = getExistingEnterpriseDoc(spaceId)
  if (!doc) return null
  return doc.doc.getMap<SharedOrchestrationRun>(RUNS_MAP_NAME)
}

/**
 * Get the shared orchestration events map from an Enterprise doc.
 */
export function getEventsMap(
  spaceId: string,
): Y.Map<SharedOrchestrationEvent> | null {
  const doc = getExistingEnterpriseDoc(spaceId)
  if (!doc) return null
  return doc.doc.getMap<SharedOrchestrationEvent>(EVENTS_MAP_NAME)
}

/**
 * Get the shared approval requests map from an Enterprise doc.
 */
export function getApprovalsMap(
  spaceId: string,
): Y.Map<SharedApprovalRequest> | null {
  const doc = getExistingEnterpriseDoc(spaceId)
  if (!doc) return null
  return doc.doc.getMap<SharedApprovalRequest>(APPROVALS_MAP_NAME)
}

/**
 * Start a shared orchestration run.
 *
 * Creates a run record in the Enterprise Y.Doc and returns a bridge
 * that writes orchestration events to the doc in real time.
 *
 * @param spaceId - Enterprise space ID
 * @param workflowId - Orchestrator workflow ID (becomes the run ID)
 * @param prompt - The user's original prompt
 * @param initiator - Identity of the user who triggered the run
 * @returns A SharedOrchestrationBridge that auto-syncs events, or null if not enterprise
 */
export function startSharedRun(
  spaceId: string,
  workflowId: string,
  prompt: string,
  initiator: { userId: string; name: string },
): SharedOrchestrationBridge | null {
  const runsMap = getRunsMap(spaceId)
  if (!runsMap) return null

  const run: SharedOrchestrationRun = {
    id: workflowId,
    initiator,
    spaceId,
    prompt,
    status: 'running',
    phase: 'Starting...',
    progress: 0,
    startedAt: Date.now(),
    activeAgentIds: [],
    subTasksCompleted: 0,
    subTasksTotal: 0,
  }

  runsMap.set(workflowId, run)

  return new SharedOrchestrationBridge(spaceId, workflowId)
}

/**
 * Bridge that connects the local orchestrator event bus to the Enterprise
 * Y.Doc, making orchestration progress visible to all team members.
 */
export class SharedOrchestrationBridge {
  private spaceId: string
  private runId: string
  private unsubscribe: (() => void) | null = null
  private eventCounter = 0

  constructor(spaceId: string, runId: string) {
    this.spaceId = spaceId
    this.runId = runId
  }

  /**
   * Start listening to the orchestrator event bus and forwarding
   * events to the Enterprise Y.Doc.
   */
  connect(): void {
    this.unsubscribe = onAny((event) => {
      // Only capture events for our workflow
      if ('workflowId' in event && event.workflowId !== this.runId) return

      this.writeEvent(event)
      this.updateRun(event)
    })
  }

  /**
   * Stop listening and mark the run as completed or paused.
   */
  disconnect(reason: 'completed' | 'failed' | 'paused' = 'paused'): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    const runsMap = getRunsMap(this.spaceId)
    if (!runsMap) return

    const run = runsMap.get(this.runId)
    if (run) {
      runsMap.set(this.runId, {
        ...run,
        status: reason,
        ...(reason !== 'paused' ? { completedAt: Date.now() } : {}),
      })
    }
  }

  /**
   * Write an orchestration event to the Enterprise Y.Doc.
   */
  private writeEvent(event: OrchestrationEvent): void {
    const eventsMap = getEventsMap(this.spaceId)
    if (!eventsMap) return

    const eventId = `${this.runId}-${++this.eventCounter}`
    const sharedEvent: SharedOrchestrationEvent = {
      id: eventId,
      runId: this.runId,
      spaceId: this.spaceId,
      type: event.type,
      payload: { ...event } as unknown as Record<string, unknown>,
      timestamp: Date.now(),
    }

    eventsMap.set(eventId, sharedEvent)
  }

  /**
   * Update the run record based on an orchestration event.
   */
  private updateRun(event: OrchestrationEvent): void {
    const runsMap = getRunsMap(this.spaceId)
    if (!runsMap) return

    const run = runsMap.get(this.runId)
    if (!run) return

    const updates: Partial<SharedOrchestrationRun> = {}

    switch (event.type) {
      case 'agent-start':
        updates.activeAgentIds = [
          ...new Set([...run.activeAgentIds, event.agentId]),
        ]
        break

      case 'agent-complete':
        updates.activeAgentIds = run.activeAgentIds.filter(
          (id) => id !== event.agentId,
        )
        updates.subTasksCompleted = run.subTasksCompleted + 1
        break

      case 'phase-change':
        updates.phase = event.message
        updates.progress = event.progress
        break
    }

    if (Object.keys(updates).length > 0) {
      runsMap.set(this.runId, { ...run, ...updates })
    }
  }

  /**
   * Create an approval request visible to all team members.
   */
  requestApproval(description: string, requestedBy: string): string {
    const approvalsMap = getApprovalsMap(this.spaceId)
    if (!approvalsMap) return ''

    const id = `${this.runId}-approval-${Date.now()}`
    const request: SharedApprovalRequest = {
      id,
      runId: this.runId,
      spaceId: this.spaceId,
      description,
      status: 'pending',
      requestedBy,
      createdAt: Date.now(),
    }

    approvalsMap.set(id, request)
    return id
  }
}

/**
 * Resolve an approval request (approve or reject).
 *
 * Any team member can approve — the gate is written to Y.Doc,
 * so anyone with access can resolve it.
 */
export function resolveApproval(
  spaceId: string,
  approvalId: string,
  decision: 'approved' | 'rejected',
  resolvedBy: string,
): void {
  const approvalsMap = getApprovalsMap(spaceId)
  if (!approvalsMap) return

  const request = approvalsMap.get(approvalId)
  if (!request || request.status !== 'pending') return

  approvalsMap.set(approvalId, {
    ...request,
    status: decision,
    resolvedBy,
    resolvedAt: Date.now(),
  })
}

/**
 * Get all runs for a space, optionally filtered by status.
 */
export function getSharedRuns(
  spaceId: string,
  status?: SharedOrchestrationRun['status'],
): SharedOrchestrationRun[] {
  const runsMap = getRunsMap(spaceId)
  if (!runsMap) return []

  const runs = Array.from(runsMap.values())
  if (status) return runs.filter((r) => r.status === status)
  return runs
}

/**
 * Get a specific shared run.
 */
export function getSharedRun(
  spaceId: string,
  runId: string,
): SharedOrchestrationRun | undefined {
  const runsMap = getRunsMap(spaceId)
  return runsMap?.get(runId)
}

/**
 * Get events for a specific run, sorted by timestamp.
 */
export function getRunEvents(
  spaceId: string,
  runId: string,
): SharedOrchestrationEvent[] {
  const eventsMap = getEventsMap(spaceId)
  if (!eventsMap) return []

  return Array.from(eventsMap.values())
    .filter((e) => e.runId === runId)
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Get pending approval requests for a space.
 */
export function getPendingApprovals(
  spaceId: string,
): SharedApprovalRequest[] {
  const approvalsMap = getApprovalsMap(spaceId)
  if (!approvalsMap) return []

  return Array.from(approvalsMap.values())
    .filter((a) => a.status === 'pending')
    .sort((a, b) => a.createdAt - b.createdAt)
}
