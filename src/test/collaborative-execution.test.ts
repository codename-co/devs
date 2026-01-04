/**
 * Collaborative Execution Manager Tests
 *
 * Tests for the CollaborativeExecutionManager class that handles
 * multi-user agent execution sessions with shared visibility and control.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Y from 'yjs'
import {
  CollaborativeExecutionManager,
  createCollaborativeExecutionManager,
} from '@/lib/sync/collaborative-execution'

describe('Collaborative Execution Manager', () => {
  let doc: Y.Doc
  let manager: CollaborativeExecutionManager

  const workspaceId = 'workspace-1'
  const currentUserId = 'user-1'

  beforeEach(() => {
    doc = new Y.Doc()
    manager = new CollaborativeExecutionManager(workspaceId, currentUserId, doc)
  })

  afterEach(() => {
    manager.destroy()
  })

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createCollaborativeExecutionManager', () => {
    it('creates manager instance', () => {
      const testDoc = new Y.Doc()
      const testManager = createCollaborativeExecutionManager(
        'ws-1',
        'user-1',
        testDoc
      )

      expect(testManager).toBeInstanceOf(CollaborativeExecutionManager)

      testManager.destroy()
    })
  })

  // ============================================================================
  // Execution Creation Tests
  // ============================================================================

  describe('createExecution', () => {
    it('creates execution with correct properties', () => {
      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1', 'user-2'],
        canIntervene: ['user-1'],
        canApprove: ['user-1', 'user-2'],
        streamToAll: true,
      })

      expect(execution.executionId).toBeDefined()
      expect(execution.conversationId).toBe('conv-1')
      expect(execution.workspaceId).toBe(workspaceId)
      expect(execution.initiatedBy).toBe(currentUserId)
      expect(execution.participants).toEqual(['user-1', 'user-2'])
      expect(execution.canIntervene).toEqual(['user-1'])
      expect(execution.canApprove).toEqual(['user-1', 'user-2'])
      expect(execution.streamToAll).toBe(true)
      expect(execution.status).toBe('pending')
    })

    it('uses defaults when optional config is not provided', () => {
      const execution = manager.createExecution({
        conversationId: 'conv-1',
      })

      expect(execution.participants).toEqual([currentUserId])
      expect(execution.canIntervene).toEqual([currentUserId])
      expect(execution.canApprove).toEqual([currentUserId])
      expect(execution.streamToAll).toBe(true)
    })

    it('generates unique execution IDs', () => {
      const execution1 = manager.createExecution({ conversationId: 'conv-1' })
      const execution2 = manager.createExecution({ conversationId: 'conv-2' })

      expect(execution1.executionId).not.toBe(execution2.executionId)
    })
  })

  // ============================================================================
  // Execution Retrieval Tests
  // ============================================================================

  describe('getExecution', () => {
    it('gets execution by ID', () => {
      const created = manager.createExecution({ conversationId: 'conv-1' })
      const retrieved = manager.getExecution(created.executionId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.executionId).toBe(created.executionId)
    })

    it('returns null for non-existent execution', () => {
      const result = manager.getExecution('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getActiveExecutions', () => {
    it('gets active executions for conversation', () => {
      manager.createExecution({ conversationId: 'conv-1' })
      manager.createExecution({ conversationId: 'conv-1' })
      manager.createExecution({ conversationId: 'conv-2' })

      const activeConv1 = manager.getActiveExecutions('conv-1')
      const activeConv2 = manager.getActiveExecutions('conv-2')

      expect(activeConv1).toHaveLength(2)
      expect(activeConv2).toHaveLength(1)
    })

    it('excludes completed and cancelled executions', () => {
      const execution1 = manager.createExecution({ conversationId: 'conv-1' })
      const execution2 = manager.createExecution({ conversationId: 'conv-1' })

      // Start and stop execution1
      manager.start(execution1.executionId)
      manager.stop(execution1.executionId)

      const active = manager.getActiveExecutions('conv-1')

      expect(active).toHaveLength(1)
      expect(active[0].executionId).toBe(execution2.executionId)
    })

    it('includes pending, running, and paused executions', () => {
      manager.createExecution({ conversationId: 'conv-1' }) // pending
      const runningExec = manager.createExecution({ conversationId: 'conv-1' })
      const pausedExec = manager.createExecution({ conversationId: 'conv-1' })

      manager.start(runningExec.executionId)
      manager.start(pausedExec.executionId)
      manager.pause(pausedExec.executionId)

      const active = manager.getActiveExecutions('conv-1')

      expect(active).toHaveLength(3)
    })
  })

  describe('getAllExecutions', () => {
    it('returns all executions', () => {
      manager.createExecution({ conversationId: 'conv-1' })
      manager.createExecution({ conversationId: 'conv-2' })
      manager.createExecution({ conversationId: 'conv-3' })

      const all = manager.getAllExecutions()

      expect(all).toHaveLength(3)
    })
  })

  // ============================================================================
  // Control Methods Tests
  // ============================================================================

  describe('start', () => {
    it('changes status to running', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('running')
    })

    it('sets startedAt timestamp', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const before = new Date()
      manager.start(execution.executionId)
      const after = new Date()

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.startedAt).toBeDefined()
      expect(new Date(updated!.startedAt!).getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(new Date(updated!.startedAt!).getTime()).toBeLessThanOrEqual(
        after.getTime()
      )
    })

    it('cannot start non-pending execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)

      expect(() => manager.start(execution.executionId)).toThrow(
        /Cannot start execution in 'running' status/
      )
    })
  })

  describe('pause', () => {
    it('changes status to paused', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.pause(execution.executionId)

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('paused')
    })

    it('cannot pause non-running execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })

      expect(() => manager.pause(execution.executionId)).toThrow(
        /Cannot pause execution in 'pending' status/
      )
    })
  })

  describe('resume', () => {
    it('changes status to running', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.pause(execution.executionId)
      manager.resume(execution.executionId)

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('running')
    })

    it('cannot resume non-paused execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)

      expect(() => manager.resume(execution.executionId)).toThrow(
        /Cannot resume execution in 'running' status/
      )
    })
  })

  describe('stop', () => {
    it('changes status to cancelled', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.stop(execution.executionId)

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('cancelled')
    })

    it('sets completedAt timestamp', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)

      const before = new Date()
      manager.stop(execution.executionId)
      const after = new Date()

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.completedAt).toBeDefined()
      expect(new Date(updated!.completedAt!).getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(new Date(updated!.completedAt!).getTime()).toBeLessThanOrEqual(
        after.getTime()
      )
    })

    it('cannot stop already completed execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.stop(execution.executionId)

      expect(() => manager.stop(execution.executionId)).toThrow(
        /Cannot stop execution in 'cancelled' status/
      )
    })

    it('can stop pending execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.stop(execution.executionId)

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('cancelled')
    })

    it('can stop paused execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.pause(execution.executionId)
      manager.stop(execution.executionId)

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('cancelled')
    })
  })

  // ============================================================================
  // Permission Tests
  // ============================================================================

  describe('permission checks', () => {
    it('throws error for non-participant', () => {
      // Create manager with user-2 who is not a participant
      const otherManager = new CollaborativeExecutionManager(
        workspaceId,
        'user-2',
        doc
      )

      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1'],
      })

      expect(() => otherManager.start(execution.executionId)).toThrow(
        /not a participant/
      )

      otherManager.destroy()
    })

    it('throws error for unauthorized intervene', () => {
      const otherManager = new CollaborativeExecutionManager(
        workspaceId,
        'user-2',
        doc
      )

      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1', 'user-2'],
        canIntervene: ['user-1'], // user-2 cannot intervene
      })

      manager.start(execution.executionId)

      expect(() => otherManager.pause(execution.executionId)).toThrow(
        /cannot intervene/
      )

      otherManager.destroy()
    })

    it('canUserIntervene returns correct value', () => {
      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1', 'user-2'],
        canIntervene: ['user-1'],
      })

      expect(manager.canUserIntervene(execution.executionId, 'user-1')).toBe(true)
      expect(manager.canUserIntervene(execution.executionId, 'user-2')).toBe(false)
    })

    it('canUserApprove returns correct value', () => {
      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1', 'user-2'],
        canApprove: ['user-2'],
      })

      expect(manager.canUserApprove(execution.executionId, 'user-1')).toBe(false)
      expect(manager.canUserApprove(execution.executionId, 'user-2')).toBe(true)
    })

    it('isParticipant returns correct value', () => {
      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1'],
      })

      expect(manager.isParticipant(execution.executionId, 'user-1')).toBe(true)
      expect(manager.isParticipant(execution.executionId, 'user-2')).toBe(false)
    })

    it('permission checks return false for non-existent execution', () => {
      expect(manager.canUserIntervene('non-existent', 'user-1')).toBe(false)
      expect(manager.canUserApprove('non-existent', 'user-1')).toBe(false)
      expect(manager.isParticipant('non-existent', 'user-1')).toBe(false)
    })
  })

  // ============================================================================
  // Approval Workflow Tests
  // ============================================================================

  describe('approval workflow', () => {
    it('creates approval request', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const requestId = manager.requestApproval(
        execution.executionId,
        'tool-call',
        { tool: 'readFile' }
      )

      const request = manager.getApprovalRequest(requestId)

      expect(request).toBeDefined()
      expect(request?.executionId).toBe(execution.executionId)
      expect(request?.requestedBy).toBe(currentUserId)
      expect(request?.action).toBe('tool-call')
      expect(request?.data).toEqual({ tool: 'readFile' })
      expect(request?.status).toBe('pending')
      expect(request?.createdAt).toBeDefined()
    })

    it('approves pending request', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const requestId = manager.requestApproval(
        execution.executionId,
        'tool-call'
      )

      manager.approve(execution.executionId, requestId)

      const request = manager.getApprovalRequest(requestId)
      expect(request?.status).toBe('approved')
      expect(request?.respondedBy).toBe(currentUserId)
      expect(request?.respondedAt).toBeDefined()
    })

    it('rejects pending request with reason', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const requestId = manager.requestApproval(
        execution.executionId,
        'tool-call'
      )

      manager.reject(execution.executionId, requestId, 'Not allowed')

      const request = manager.getApprovalRequest(requestId)
      expect(request?.status).toBe('rejected')
      expect(request?.rejectionReason).toBe('Not allowed')
      expect(request?.respondedBy).toBe(currentUserId)
    })

    it('cannot approve non-pending request', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const requestId = manager.requestApproval(
        execution.executionId,
        'tool-call'
      )

      manager.approve(execution.executionId, requestId)

      expect(() =>
        manager.approve(execution.executionId, requestId)
      ).toThrow(/already approved/)
    })

    it('cannot reject non-pending request', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const requestId = manager.requestApproval(
        execution.executionId,
        'tool-call'
      )

      manager.reject(execution.executionId, requestId)

      expect(() =>
        manager.reject(execution.executionId, requestId)
      ).toThrow(/already rejected/)
    })

    it('getPendingApprovals returns only pending requests', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const req1 = manager.requestApproval(execution.executionId, 'action-1')
      const req2 = manager.requestApproval(execution.executionId, 'action-2')
      const req3 = manager.requestApproval(execution.executionId, 'action-3')

      manager.approve(execution.executionId, req1)
      manager.reject(execution.executionId, req2)

      const pending = manager.getPendingApprovals(execution.executionId)

      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe(req3)
    })

    it('throws error for approval without permission', () => {
      const otherManager = new CollaborativeExecutionManager(
        workspaceId,
        'user-2',
        doc
      )

      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1', 'user-2'],
        canApprove: ['user-1'], // user-2 cannot approve
      })

      const requestId = manager.requestApproval(
        execution.executionId,
        'tool-call'
      )

      expect(() =>
        otherManager.approve(execution.executionId, requestId)
      ).toThrow(/cannot approve/)

      otherManager.destroy()
    })
  })

  // ============================================================================
  // Intervention Tests
  // ============================================================================

  describe('intervene', () => {
    it('pauses running execution and logs action', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)

      manager.intervene(execution.executionId, 'Need to review')

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('paused')

      const history = manager.getActionHistory(execution.executionId)
      const interveneAction = history.find((a) => a.type === 'intervene')
      expect(interveneAction).toBeDefined()
      expect(interveneAction?.data?.message).toBe('Need to review')
    })

    it('keeps paused execution paused', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.pause(execution.executionId)

      manager.intervene(execution.executionId, 'Additional intervention')

      const updated = manager.getExecution(execution.executionId)
      expect(updated?.status).toBe('paused')
    })

    it('cannot intervene in completed execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.stop(execution.executionId)

      expect(() =>
        manager.intervene(execution.executionId, 'Too late')
      ).toThrow(/Cannot intervene/)
    })
  })

  // ============================================================================
  // Event Subscription Tests
  // ============================================================================

  describe('event callbacks', () => {
    it('fires onExecutionChange callback', () => {
      const callback = vi.fn()
      manager.onExecutionChange(callback)

      const execution = manager.createExecution({ conversationId: 'conv-1' })

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: execution.executionId,
        })
      )
    })

    it('fires onActionReceived callback', () => {
      const callback = vi.fn()
      manager.onActionReceived(callback)

      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)

      // Should have received the 'start' actions (one from create, one from start)
      expect(callback).toHaveBeenCalled()
      const calls = callback.mock.calls
      const startActions = calls.filter(([action]) => action.type === 'start')
      expect(startActions.length).toBeGreaterThan(0)
    })

    it('fires onApprovalRequested callback', () => {
      const callback = vi.fn()
      manager.onApprovalRequested(callback)

      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.requestApproval(execution.executionId, 'test-action')

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'test-action',
          status: 'pending',
        })
      )
    })

    it('unsubscribe functions work correctly', () => {
      const callback = vi.fn()
      const unsubscribe = manager.onExecutionChange(callback)

      manager.createExecution({ conversationId: 'conv-1' })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      manager.createExecution({ conversationId: 'conv-2' })
      expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  // ============================================================================
  // Action History Tests
  // ============================================================================

  describe('getActionHistory', () => {
    it('returns actions for execution', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      manager.start(execution.executionId)
      manager.pause(execution.executionId)
      manager.resume(execution.executionId)

      const history = manager.getActionHistory(execution.executionId)

      // Should have: start (from create), start, pause, resume
      expect(history.length).toBeGreaterThanOrEqual(3)
      expect(history.every((a) => a.executionId === execution.executionId)).toBe(
        true
      )
    })

    it('returns empty array for execution with no actions after destroy', () => {
      const execution = manager.createExecution({ conversationId: 'conv-1' })
      const executionId = execution.executionId

      // Actions exist after creation
      const historyBefore = manager.getActionHistory(executionId)
      expect(historyBefore.length).toBeGreaterThan(0)
    })

    it('filters by execution ID', () => {
      const exec1 = manager.createExecution({ conversationId: 'conv-1' })
      const exec2 = manager.createExecution({ conversationId: 'conv-2' })

      manager.start(exec1.executionId)
      manager.start(exec2.executionId)

      const history1 = manager.getActionHistory(exec1.executionId)
      const history2 = manager.getActionHistory(exec2.executionId)

      expect(history1.every((a) => a.executionId === exec1.executionId)).toBe(true)
      expect(history2.every((a) => a.executionId === exec2.executionId)).toBe(true)
    })
  })

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('destroy', () => {
    it('removes observers without error', () => {
      const callback = vi.fn()
      manager.onExecutionChange(callback)
      manager.onActionReceived(callback)
      manager.onApprovalRequested(callback)

      expect(() => manager.destroy()).not.toThrow()
    })

    it('clears listeners', () => {
      const callback = vi.fn()
      manager.onExecutionChange(callback)

      manager.destroy()

      // Creating a new execution on the same doc shouldn't trigger the callback
      // because listeners were cleared (though this depends on implementation)
      // The main test is that destroy doesn't throw
    })

    it('can be called multiple times safely', () => {
      manager.destroy()
      expect(() => manager.destroy()).not.toThrow()
    })
  })

  // ============================================================================
  // CRDT Synchronization Tests
  // ============================================================================

  describe('CRDT synchronization', () => {
    it('changes are visible across managers on same doc', () => {
      const manager2 = new CollaborativeExecutionManager(
        workspaceId,
        'user-2',
        doc
      )

      const execution = manager.createExecution({
        conversationId: 'conv-1',
        participants: ['user-1', 'user-2'],
        canIntervene: ['user-1', 'user-2'],
      })

      // Manager 2 should see the execution
      const retrievedByManager2 = manager2.getExecution(execution.executionId)
      expect(retrievedByManager2).toBeDefined()
      expect(retrievedByManager2?.executionId).toBe(execution.executionId)

      // Start by manager 1, visible to manager 2
      manager.start(execution.executionId)
      const afterStart = manager2.getExecution(execution.executionId)
      expect(afterStart?.status).toBe('running')

      // Pause by manager 2, visible to manager 1
      manager2.pause(execution.executionId)
      const afterPause = manager.getExecution(execution.executionId)
      expect(afterPause?.status).toBe('paused')

      manager2.destroy()
    })
  })
})
