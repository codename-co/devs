/**
 * Tests for shared orchestration in Enterprise spaces.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import {
  startSharedRun,
  getSharedRuns,
  getSharedRun,
  getRunEvents,
  resolveApproval,
  getPendingApprovals,
  getRunsMap,
  getEventsMap,
  getApprovalsMap,
  SharedOrchestrationBridge,
} from '@/lib/teams/shared-orchestration'
import {
  getEnterpriseDoc,
  destroyAllEnterpriseDocs,
} from '@/lib/teams/enterprise-doc'
import { emit } from '@/lib/orchestrator/events'

// ============================================================================
// Setup
// ============================================================================

describe('Shared Orchestration', () => {
  beforeEach(() => {
    // Create an enterprise doc for our test space
    getEnterpriseDoc('space-1', 'acme')
  })

  afterEach(() => {
    destroyAllEnterpriseDocs()
  })

  describe('startSharedRun', () => {
    it('creates a run record in the enterprise doc', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Build a dashboard', {
        userId: 'user-1',
        name: 'Alice',
      })

      expect(bridge).not.toBeNull()

      const run = getSharedRun('space-1', 'wf-1')
      expect(run).toBeDefined()
      expect(run!.id).toBe('wf-1')
      expect(run!.prompt).toBe('Build a dashboard')
      expect(run!.initiator.userId).toBe('user-1')
      expect(run!.status).toBe('running')
      expect(run!.progress).toBe(0)
      expect(run!.activeAgentIds).toEqual([])
      expect(run!.subTasksCompleted).toBe(0)
      expect(run!.subTasksTotal).toBe(0)
      expect(run!.startedAt).toBeGreaterThan(0)
    })

    it('returns null for non-enterprise spaces', () => {
      const bridge = startSharedRun('nonexistent', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })

      expect(bridge).toBeNull()
    })
  })

  describe('getSharedRuns', () => {
    it('returns all runs for a space', () => {
      startSharedRun('space-1', 'wf-1', 'Task A', {
        userId: 'user-1',
        name: 'Alice',
      })
      startSharedRun('space-1', 'wf-2', 'Task B', {
        userId: 'user-2',
        name: 'Bob',
      })

      const runs = getSharedRuns('space-1')
      expect(runs).toHaveLength(2)
    })

    it('filters by status', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Task A', {
        userId: 'user-1',
        name: 'Alice',
      })
      startSharedRun('space-1', 'wf-2', 'Task B', {
        userId: 'user-2',
        name: 'Bob',
      })

      // Complete wf-1
      bridge!.disconnect('completed')

      const running = getSharedRuns('space-1', 'running')
      expect(running).toHaveLength(1)
      expect(running[0].id).toBe('wf-2')

      const completed = getSharedRuns('space-1', 'completed')
      expect(completed).toHaveLength(1)
      expect(completed[0].id).toBe('wf-1')
    })

    it('returns empty array for unknown spaces', () => {
      expect(getSharedRuns('unknown')).toEqual([])
    })
  })

  describe('SharedOrchestrationBridge', () => {
    it('writes events to the enterprise doc on connect', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()

      // Simulate an orchestration event by directly importing and emitting
      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Researcher',
        workflowId: 'wf-1',
      })

      const events = getRunEvents('space-1', 'wf-1')
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('agent-start')
      expect(events[0].runId).toBe('wf-1')

      bridge.disconnect('completed')
    })

    it('updates run record on agent-start event', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Researcher',
        workflowId: 'wf-1',
      })

      const run = getSharedRun('space-1', 'wf-1')
      expect(run!.activeAgentIds).toContain('agent-1')

      bridge.disconnect('completed')
    })

    it('updates run record on agent-complete event', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Researcher',
        workflowId: 'wf-1',
      })

      emit({
        type: 'agent-complete',
        taskId: 'task-1',
        agentId: 'agent-1',
        workflowId: 'wf-1',
        success: true,
      })

      const run = getSharedRun('space-1', 'wf-1')
      expect(run!.activeAgentIds).not.toContain('agent-1')
      expect(run!.subTasksCompleted).toBe(1)

      bridge.disconnect('completed')
    })

    it('updates run record on phase-change event', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()

      emit({
        type: 'phase-change',
        workflowId: 'wf-1',
        phase: 'executing',
        message: 'Executing strategy...',
        progress: 50,
      })

      const run = getSharedRun('space-1', 'wf-1')
      expect(run!.phase).toBe('Executing strategy...')
      expect(run!.progress).toBe(50)

      bridge.disconnect('completed')
    })

    it('ignores events from other workflows', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Other',
        workflowId: 'other-wf',
      })

      const events = getRunEvents('space-1', 'wf-1')
      expect(events).toHaveLength(0)

      bridge.disconnect('completed')
    })

    it('marks run as paused on disconnect without reason', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()
      bridge.disconnect('paused')

      const run = getSharedRun('space-1', 'wf-1')
      expect(run!.status).toBe('paused')
      expect(run!.completedAt).toBeUndefined()
    })

    it('marks run as completed with timestamp', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()
      bridge.disconnect('completed')

      const run = getSharedRun('space-1', 'wf-1')
      expect(run!.status).toBe('completed')
      expect(run!.completedAt).toBeGreaterThan(0)
    })
  })

  describe('Approval gates', () => {
    it('creates a pending approval request', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      const approvalId = bridge.requestApproval(
        'Deploy to production?',
        'user-1',
      )

      expect(approvalId).toBeTruthy()

      const pending = getPendingApprovals('space-1')
      expect(pending).toHaveLength(1)
      expect(pending[0].description).toBe('Deploy to production?')
      expect(pending[0].status).toBe('pending')
      expect(pending[0].requestedBy).toBe('user-1')
    })

    it('resolves an approval as approved', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      const approvalId = bridge.requestApproval(
        'Deploy to production?',
        'user-1',
      )

      resolveApproval('space-1', approvalId, 'approved', 'user-2')

      const pending = getPendingApprovals('space-1')
      expect(pending).toHaveLength(0)

      const approvalsMap = getApprovalsMap('space-1')
      const resolved = approvalsMap?.get(approvalId)
      expect(resolved!.status).toBe('approved')
      expect(resolved!.resolvedBy).toBe('user-2')
      expect(resolved!.resolvedAt).toBeGreaterThan(0)
    })

    it('resolves an approval as rejected', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      const approvalId = bridge.requestApproval('Proceed?', 'user-1')

      resolveApproval('space-1', approvalId, 'rejected', 'user-3')

      const approvalsMap = getApprovalsMap('space-1')
      const resolved = approvalsMap?.get(approvalId)
      expect(resolved!.status).toBe('rejected')
    })

    it('does not re-resolve already resolved approvals', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      const approvalId = bridge.requestApproval('Proceed?', 'user-1')
      resolveApproval('space-1', approvalId, 'approved', 'user-2')
      resolveApproval('space-1', approvalId, 'rejected', 'user-3')

      const approvalsMap = getApprovalsMap('space-1')
      const resolved = approvalsMap?.get(approvalId)
      expect(resolved!.status).toBe('approved') // first resolution wins
      expect(resolved!.resolvedBy).toBe('user-2')
    })

    it('returns empty string for non-enterprise spaces', () => {
      // Create a bridge without a real enterprise doc
      const bridge = new SharedOrchestrationBridge(
        'nonexistent' as any,
        'wf-1',
      )
      const id = bridge.requestApproval('Test', 'user-1')
      expect(id).toBe('')
    })
  })

  describe('getRunEvents', () => {
    it('returns events sorted by timestamp', () => {
      const bridge = startSharedRun('space-1', 'wf-1', 'Test', {
        userId: 'user-1',
        name: 'Alice',
      })!

      bridge.connect()

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'A',
        workflowId: 'wf-1',
      })
      emit({
        type: 'agent-complete',
        taskId: 'task-1',
        agentId: 'agent-1',
        workflowId: 'wf-1',
        success: true,
      })

      const events = getRunEvents('space-1', 'wf-1')
      expect(events).toHaveLength(2)
      expect(events[0].timestamp).toBeLessThanOrEqual(events[1].timestamp)

      bridge.disconnect('completed')
    })

    it('returns empty for unknown spaces', () => {
      expect(getRunEvents('unknown', 'wf-1')).toEqual([])
    })
  })

  describe('getRunsMap / getEventsMap / getApprovalsMap', () => {
    it('returns null for non-enterprise spaces', () => {
      expect(getRunsMap('nonexistent')).toBeNull()
      expect(getEventsMap('nonexistent')).toBeNull()
      expect(getApprovalsMap('nonexistent')).toBeNull()
    })

    it('returns Y.Map for enterprise spaces', () => {
      expect(getRunsMap('space-1')).toBeDefined()
      expect(getEventsMap('space-1')).toBeDefined()
      expect(getApprovalsMap('space-1')).toBeDefined()
    })
  })
})
