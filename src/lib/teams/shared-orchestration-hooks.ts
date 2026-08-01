/**
 * @module lib/teams/shared-orchestration-hooks
 *
 * React hooks for observing shared orchestration in Enterprise spaces.
 *
 * These hooks subscribe to Y.Map changes in the Enterprise doc and
 * re-render when orchestration runs, events, or approval requests change.
 */

import { useEffect, useState } from 'react'
import {
  getSharedRuns,
  getSharedRun,
  getRunEvents,
  getPendingApprovals,
  getRunsMap,
  getEventsMap,
  getApprovalsMap,
  type SharedOrchestrationRun,
  type SharedOrchestrationEvent,
  type SharedApprovalRequest,
} from './shared-orchestration'

/**
 * Subscribe to all orchestration runs in an Enterprise space.
 *
 * @param spaceId - Enterprise space ID
 * @param status - Optional filter by status
 * @returns Live-updating array of runs
 */
export function useSharedRuns(
  spaceId: string | undefined,
  status?: SharedOrchestrationRun['status'],
): SharedOrchestrationRun[] {
  const [runs, setRuns] = useState<SharedOrchestrationRun[]>([])

  useEffect(() => {
    if (!spaceId) {
      setRuns([])
      return
    }

    // Get initial
    setRuns(getSharedRuns(spaceId, status))

    // Subscribe to Y.Map changes
    const runsMap = getRunsMap(spaceId)
    if (!runsMap) return

    const handler = () => {
      setRuns(getSharedRuns(spaceId, status))
    }

    runsMap.observe(handler)
    return () => runsMap.unobserve(handler)
  }, [spaceId, status])

  return runs
}

/**
 * Subscribe to a specific orchestration run.
 *
 * @param spaceId - Enterprise space ID
 * @param runId - Run/workflow ID
 * @returns Live-updating run or undefined
 */
export function useSharedRun(
  spaceId: string | undefined,
  runId: string | undefined,
): SharedOrchestrationRun | undefined {
  const [run, setRun] = useState<SharedOrchestrationRun | undefined>()

  useEffect(() => {
    if (!spaceId || !runId) {
      setRun(undefined)
      return
    }

    setRun(getSharedRun(spaceId, runId))

    const runsMap = getRunsMap(spaceId)
    if (!runsMap) return

    const handler = () => {
      setRun(getSharedRun(spaceId, runId))
    }

    runsMap.observe(handler)
    return () => runsMap.unobserve(handler)
  }, [spaceId, runId])

  return run
}

/**
 * Subscribe to orchestration events for a run.
 *
 * @param spaceId - Enterprise space ID
 * @param runId - Run/workflow ID
 * @returns Live-updating array of events, sorted by timestamp
 */
export function useRunEvents(
  spaceId: string | undefined,
  runId: string | undefined,
): SharedOrchestrationEvent[] {
  const [events, setEvents] = useState<SharedOrchestrationEvent[]>([])

  useEffect(() => {
    if (!spaceId || !runId) {
      setEvents([])
      return
    }

    setEvents(getRunEvents(spaceId, runId))

    const eventsMap = getEventsMap(spaceId)
    if (!eventsMap) return

    const handler = () => {
      setEvents(getRunEvents(spaceId, runId))
    }

    eventsMap.observe(handler)
    return () => eventsMap.unobserve(handler)
  }, [spaceId, runId])

  return events
}

/**
 * Subscribe to pending approval requests in a space.
 *
 * @param spaceId - Enterprise space ID
 * @returns Live-updating array of pending approvals
 */
export function usePendingApprovals(
  spaceId: string | undefined,
): SharedApprovalRequest[] {
  const [approvals, setApprovals] = useState<SharedApprovalRequest[]>([])

  useEffect(() => {
    if (!spaceId) {
      setApprovals([])
      return
    }

    setApprovals(getPendingApprovals(spaceId))

    const approvalsMap = getApprovalsMap(spaceId)
    if (!approvalsMap) return

    const handler = () => {
      setApprovals(getPendingApprovals(spaceId))
    }

    approvalsMap.observe(handler)
    return () => approvalsMap.unobserve(handler)
  }, [spaceId])

  return approvals
}

/**
 * Check if there are any active (running) orchestrations in a space.
 *
 * Useful for showing a "work in progress" indicator in the space header.
 */
export function useHasActiveRuns(spaceId: string | undefined): boolean {
  const runs = useSharedRuns(spaceId, 'running')
  return runs.length > 0
}
