/**
 * Collaborative Execution Module
 * Manages multi-user agent execution sessions with shared visibility and control
 */

import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import type { CollaborativeExecution } from '@/types'

// ============================================================================
// Types
// ============================================================================

export interface ApprovalRequest {
  id: string
  executionId: string
  requestedBy: string
  action: string
  data?: unknown
  status: 'pending' | 'approved' | 'rejected'
  respondedBy?: string
  respondedAt?: Date
  rejectionReason?: string
  createdAt: Date
  expiresAt?: Date
}

export interface ExecutionAction {
  id: string
  executionId: string
  type: 'start' | 'pause' | 'resume' | 'stop' | 'approve' | 'reject' | 'intervene'
  userId: string
  timestamp: Date
  data?: Record<string, unknown>
}

export interface CreateExecutionConfig {
  conversationId: string
  participants?: string[]
  canIntervene?: string[]
  canApprove?: string[]
  streamToAll?: boolean
}

type ExecutionChangeCallback = (execution: CollaborativeExecution) => void
type ActionCallback = (action: ExecutionAction) => void
type ApprovalCallback = (request: ApprovalRequest) => void

// ============================================================================
// CollaborativeExecutionManager
// ============================================================================

export class CollaborativeExecutionManager {
  private workspaceId: string
  private currentUserId: string
  private doc: Y.Doc

  // CRDT structures
  private executionsMap: Y.Map<CollaborativeExecution>
  private actionsArray: Y.Array<ExecutionAction>
  private approvalsMap: Y.Map<ApprovalRequest>

  // Event listeners
  private executionChangeListeners: Set<ExecutionChangeCallback> = new Set()
  private actionListeners: Set<ActionCallback> = new Set()
  private approvalListeners: Set<ApprovalCallback> = new Set()

  // Cleanup
  private observers: (() => void)[] = []

  constructor(workspaceId: string, currentUserId: string, crdtDoc: Y.Doc) {
    this.workspaceId = workspaceId
    this.currentUserId = currentUserId
    this.doc = crdtDoc

    // Initialize CRDT structures
    this.executionsMap = this.doc.getMap<CollaborativeExecution>('collaborative-executions')
    this.actionsArray = this.doc.getArray<ExecutionAction>('execution-actions')
    this.approvalsMap = this.doc.getMap<ApprovalRequest>('approval-requests')

    // Set up observers
    this.setupObservers()
  }

  private setupObservers(): void {
    // Observe execution changes
    const executionObserver = (event: Y.YMapEvent<CollaborativeExecution>) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const execution = this.executionsMap.get(key)
          if (execution) {
            this.executionChangeListeners.forEach((cb) => cb(execution))
          }
        }
      })
    }
    this.executionsMap.observe(executionObserver)
    this.observers.push(() => this.executionsMap.unobserve(executionObserver))

    // Observe new actions
    const actionObserver = (event: Y.YArrayEvent<ExecutionAction>) => {
      event.changes.added.forEach((item) => {
        item.content.getContent().forEach((action) => {
          this.actionListeners.forEach((cb) => cb(action as ExecutionAction))
        })
      })
    }
    this.actionsArray.observe(actionObserver)
    this.observers.push(() => this.actionsArray.unobserve(actionObserver))

    // Observe approval requests
    const approvalObserver = (event: Y.YMapEvent<ApprovalRequest>) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add') {
          const request = this.approvalsMap.get(key)
          if (request && request.status === 'pending') {
            this.approvalListeners.forEach((cb) => cb(request))
          }
        }
      })
    }
    this.approvalsMap.observe(approvalObserver)
    this.observers.push(() => this.approvalsMap.unobserve(approvalObserver))
  }

  // ============================================================================
  // Execution Management
  // ============================================================================

  createExecution(config: CreateExecutionConfig): CollaborativeExecution {
    const executionId = nanoid()

    const execution: CollaborativeExecution = {
      executionId,
      conversationId: config.conversationId,
      workspaceId: this.workspaceId,
      initiatedBy: this.currentUserId,
      participants: config.participants ?? [this.currentUserId],
      canIntervene: config.canIntervene ?? [this.currentUserId],
      canApprove: config.canApprove ?? [this.currentUserId],
      streamToAll: config.streamToAll ?? true,
      status: 'pending',
    }

    // Store in CRDT
    this.doc.transact(() => {
      this.executionsMap.set(executionId, execution)
    })

    // Log action
    this.logAction(executionId, 'start', { config })

    return execution
  }

  getExecution(executionId: string): CollaborativeExecution | null {
    return this.executionsMap.get(executionId) ?? null
  }

  getActiveExecutions(conversationId: string): CollaborativeExecution[] {
    const executions: CollaborativeExecution[] = []
    this.executionsMap.forEach((execution) => {
      if (
        execution.conversationId === conversationId &&
        ['pending', 'running', 'paused'].includes(execution.status)
      ) {
        executions.push(execution)
      }
    })
    return executions
  }

  getAllExecutions(): CollaborativeExecution[] {
    const executions: CollaborativeExecution[] = []
    this.executionsMap.forEach((execution) => {
      executions.push(execution)
    })
    return executions
  }

  // ============================================================================
  // Control Methods
  // ============================================================================

  start(executionId: string): void {
    this.checkParticipant(executionId)
    const execution = this.getExecutionOrThrow(executionId)

    if (execution.status !== 'pending') {
      throw new Error(`Cannot start execution in '${execution.status}' status`)
    }

    this.updateExecution(executionId, {
      status: 'running',
      startedAt: new Date(),
    })

    this.logAction(executionId, 'start')
  }

  pause(executionId: string): void {
    this.checkIntervenePermission(executionId)
    const execution = this.getExecutionOrThrow(executionId)

    if (execution.status !== 'running') {
      throw new Error(`Cannot pause execution in '${execution.status}' status`)
    }

    this.updateExecution(executionId, { status: 'paused' })
    this.logAction(executionId, 'pause')
  }

  resume(executionId: string): void {
    this.checkIntervenePermission(executionId)
    const execution = this.getExecutionOrThrow(executionId)

    if (execution.status !== 'paused') {
      throw new Error(`Cannot resume execution in '${execution.status}' status`)
    }

    this.updateExecution(executionId, { status: 'running' })
    this.logAction(executionId, 'resume')
  }

  stop(executionId: string): void {
    this.checkIntervenePermission(executionId)
    const execution = this.getExecutionOrThrow(executionId)

    if (['completed', 'cancelled'].includes(execution.status)) {
      throw new Error(`Cannot stop execution in '${execution.status}' status`)
    }

    this.updateExecution(executionId, {
      status: 'cancelled',
      completedAt: new Date(),
    })

    this.logAction(executionId, 'stop')
  }

  complete(executionId: string): void {
    this.checkParticipant(executionId)
    const execution = this.getExecutionOrThrow(executionId)

    if (execution.status !== 'running') {
      throw new Error(`Cannot complete execution in '${execution.status}' status`)
    }

    this.updateExecution(executionId, {
      status: 'completed',
      completedAt: new Date(),
    })
  }

  // ============================================================================
  // Approval Workflow
  // ============================================================================

  requestApproval(executionId: string, action: string, data?: unknown): string {
    this.checkParticipant(executionId)
    this.getExecutionOrThrow(executionId)

    const requestId = nanoid()
    const request: ApprovalRequest = {
      id: requestId,
      executionId,
      requestedBy: this.currentUserId,
      action,
      data,
      status: 'pending',
      createdAt: new Date(),
    }

    this.doc.transact(() => {
      this.approvalsMap.set(requestId, request)
    })

    return requestId
  }

  approve(executionId: string, requestId: string): void {
    this.checkApprovePermission(executionId)

    const request = this.approvalsMap.get(requestId)
    if (!request) {
      throw new Error(`Approval request '${requestId}' not found`)
    }

    if (request.executionId !== executionId) {
      throw new Error(`Request '${requestId}' does not belong to execution '${executionId}'`)
    }

    if (request.status !== 'pending') {
      throw new Error(`Request '${requestId}' is already ${request.status}`)
    }

    const updatedRequest: ApprovalRequest = {
      ...request,
      status: 'approved',
      respondedBy: this.currentUserId,
      respondedAt: new Date(),
    }

    this.doc.transact(() => {
      this.approvalsMap.set(requestId, updatedRequest)
    })

    this.logAction(executionId, 'approve', { requestId })
  }

  reject(executionId: string, requestId: string, reason?: string): void {
    this.checkApprovePermission(executionId)

    const request = this.approvalsMap.get(requestId)
    if (!request) {
      throw new Error(`Approval request '${requestId}' not found`)
    }

    if (request.executionId !== executionId) {
      throw new Error(`Request '${requestId}' does not belong to execution '${executionId}'`)
    }

    if (request.status !== 'pending') {
      throw new Error(`Request '${requestId}' is already ${request.status}`)
    }

    const updatedRequest: ApprovalRequest = {
      ...request,
      status: 'rejected',
      respondedBy: this.currentUserId,
      respondedAt: new Date(),
      rejectionReason: reason,
    }

    this.doc.transact(() => {
      this.approvalsMap.set(requestId, updatedRequest)
    })

    this.logAction(executionId, 'reject', { requestId, reason })
  }

  getApprovalRequest(requestId: string): ApprovalRequest | null {
    return this.approvalsMap.get(requestId) ?? null
  }

  getPendingApprovals(executionId: string): ApprovalRequest[] {
    const requests: ApprovalRequest[] = []
    this.approvalsMap.forEach((request) => {
      if (request.executionId === executionId && request.status === 'pending') {
        requests.push(request)
      }
    })
    return requests
  }

  // ============================================================================
  // Intervention
  // ============================================================================

  intervene(executionId: string, message: string): void {
    this.checkIntervenePermission(executionId)
    const execution = this.getExecutionOrThrow(executionId)

    if (!['running', 'paused'].includes(execution.status)) {
      throw new Error(`Cannot intervene in execution with '${execution.status}' status`)
    }

    // Pause the execution
    if (execution.status === 'running') {
      this.updateExecution(executionId, { status: 'paused' })
    }

    this.logAction(executionId, 'intervene', { message })
  }

  // ============================================================================
  // Permission Checks
  // ============================================================================

  canUserIntervene(executionId: string, userId: string): boolean {
    const execution = this.executionsMap.get(executionId)
    if (!execution) return false
    return execution.canIntervene.includes(userId)
  }

  canUserApprove(executionId: string, userId: string): boolean {
    const execution = this.executionsMap.get(executionId)
    if (!execution) return false
    return execution.canApprove.includes(userId)
  }

  isParticipant(executionId: string, userId: string): boolean {
    const execution = this.executionsMap.get(executionId)
    if (!execution) return false
    return execution.participants.includes(userId)
  }

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  onExecutionChange(callback: ExecutionChangeCallback): () => void {
    this.executionChangeListeners.add(callback)
    return () => {
      this.executionChangeListeners.delete(callback)
    }
  }

  onActionReceived(callback: ActionCallback): () => void {
    this.actionListeners.add(callback)
    return () => {
      this.actionListeners.delete(callback)
    }
  }

  onApprovalRequested(callback: ApprovalCallback): () => void {
    this.approvalListeners.add(callback)
    return () => {
      this.approvalListeners.delete(callback)
    }
  }

  // ============================================================================
  // Action History
  // ============================================================================

  getActionHistory(executionId: string): ExecutionAction[] {
    return this.actionsArray.toArray().filter((action) => action.executionId === executionId)
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    // Remove all observers
    this.observers.forEach((cleanup) => cleanup())
    this.observers = []

    // Clear listeners
    this.executionChangeListeners.clear()
    this.actionListeners.clear()
    this.approvalListeners.clear()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getExecutionOrThrow(executionId: string): CollaborativeExecution {
    const execution = this.executionsMap.get(executionId)
    if (!execution) {
      throw new Error(`Execution '${executionId}' not found`)
    }
    return execution
  }

  private checkParticipant(executionId: string): void {
    if (!this.isParticipant(executionId, this.currentUserId)) {
      throw new Error(`User '${this.currentUserId}' is not a participant in execution '${executionId}'`)
    }
  }

  private checkIntervenePermission(executionId: string): void {
    if (!this.canUserIntervene(executionId, this.currentUserId)) {
      throw new Error(`User '${this.currentUserId}' cannot intervene in execution '${executionId}'`)
    }
  }

  private checkApprovePermission(executionId: string): void {
    if (!this.canUserApprove(executionId, this.currentUserId)) {
      throw new Error(`User '${this.currentUserId}' cannot approve in execution '${executionId}'`)
    }
  }

  private updateExecution(
    executionId: string,
    updates: Partial<CollaborativeExecution>
  ): void {
    const execution = this.getExecutionOrThrow(executionId)
    const updated = { ...execution, ...updates }

    this.doc.transact(() => {
      this.executionsMap.set(executionId, updated)
    })
  }

  private logAction(
    executionId: string,
    type: ExecutionAction['type'],
    data?: Record<string, unknown>
  ): void {
    const action: ExecutionAction = {
      id: nanoid(),
      executionId,
      type,
      userId: this.currentUserId,
      timestamp: new Date(),
      data,
    }

    this.doc.transact(() => {
      this.actionsArray.push([action])
    })
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCollaborativeExecutionManager(
  workspaceId: string,
  currentUserId: string,
  crdtDoc: Y.Doc
): CollaborativeExecutionManager {
  return new CollaborativeExecutionManager(workspaceId, currentUserId, crdtDoc)
}
