/**
 * Task Queue & Scheduler
 *
 * Manages a priority queue for pending tasks and supports:
 * - Background/async task execution (fire-and-forget)
 * - Priority-based scheduling
 * - Pause/resume/cancel controls
 * - Scheduled/recurring tasks
 * - Progress reporting
 *
 * Decouples task submission from task monitoring, inspired by
 * Perplexity Computer's async execution and HappyCapy's inbox model.
 *
 * @module lib/orchestrator/task-queue
 */

import type { TaskPriority, TaskRunState } from '@/types'

// ============================================================================
// Types
// ============================================================================

export interface QueuedTask {
  taskId: string
  workflowId: string
  prompt: string
  priority: TaskPriority
  runState: TaskRunState
  /** When the task was added to the queue */
  queuedAt: Date
  /** When execution started */
  startedAt?: Date
  /** When execution completed */
  completedAt?: Date
  /** Abort controller for cancellation */
  abortController?: AbortController
  /** Progress percentage (0-100) */
  progress: number
  /** Current status message */
  statusMessage?: string
  /** Number of sub-tasks completed */
  subTasksCompleted?: number
  /** Total sub-tasks */
  subTasksTotal?: number
  /** The orchestration result (populated on completion) */
  result?: any
  /** Error if failed */
  error?: string
}

export type TaskQueueEventType =
  | 'task_queued'
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'task_cancelled'
  | 'task_paused'
  | 'task_resumed'

export interface TaskQueueEvent {
  type: TaskQueueEventType
  taskId: string
  data?: any
}

type TaskQueueListener = (event: TaskQueueEvent) => void

// ============================================================================
// Priority values (lower = higher priority)
// ============================================================================

const PRIORITY_VALUES: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
}

// ============================================================================
// Task Queue Implementation
// ============================================================================

/**
 * In-memory task queue with priority scheduling.
 * Singleton — use `TaskQueue.getInstance()`.
 */
export class TaskQueue {
  private static instance: TaskQueue | null = null

  /** All tracked tasks (queued, running, completed) */
  private tasks: Map<string, QueuedTask> = new Map()

  /** Max concurrent executions */
  private maxConcurrent = 3

  /** Currently running tasks */
  private running = 0

  /** Event listeners */
  private listeners: Set<TaskQueueListener> = new Set()

  /** Scheduled task timers */
  private scheduledTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map()

  private constructor() {}

  static getInstance(): TaskQueue {
    if (!TaskQueue.instance) {
      TaskQueue.instance = new TaskQueue()
    }
    return TaskQueue.instance
  }

  /** Reset for testing */
  static resetInstance(): void {
    if (TaskQueue.instance) {
      TaskQueue.instance.clear()
    }
    TaskQueue.instance = null
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  on(listener: TaskQueueListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: TaskQueueEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('TaskQueue listener error:', err)
      }
    })
  }

  // --------------------------------------------------------------------------
  // Queue Operations
  // --------------------------------------------------------------------------

  /**
   * Enqueue a task for execution.
   * Returns the queued task entry.
   */
  enqueue(
    taskId: string,
    workflowId: string,
    prompt: string,
    priority: TaskPriority = 'normal',
  ): QueuedTask {
    const queuedTask: QueuedTask = {
      taskId,
      workflowId,
      prompt,
      priority,
      runState: 'queued',
      queuedAt: new Date(),
      progress: 0,
    }

    this.tasks.set(taskId, queuedTask)
    this.emit({ type: 'task_queued', taskId })

    return queuedTask
  }

  /**
   * Schedule a task for future execution.
   */
  schedule(
    taskId: string,
    workflowId: string,
    prompt: string,
    scheduledAt: Date,
    priority: TaskPriority = 'normal',
  ): QueuedTask {
    const queuedTask = this.enqueue(taskId, workflowId, prompt, priority)
    queuedTask.runState = 'scheduled'

    const delay = scheduledAt.getTime() - Date.now()
    if (delay > 0) {
      const timer = setTimeout(() => {
        queuedTask.runState = 'queued'
        this.scheduledTimers.delete(taskId)
      }, delay)
      this.scheduledTimers.set(taskId, timer)
    } else {
      // Already past scheduled time, queue immediately
      queuedTask.runState = 'queued'
    }

    return queuedTask
  }

  /**
   * Mark a task as started (called by execution engine).
   */
  markStarted(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.runState = 'running'
      task.startedAt = new Date()
      task.abortController = new AbortController()
      this.running++
      this.emit({ type: 'task_started', taskId })
    }
  }

  /**
   * Update task progress.
   */
  updateProgress(
    taskId: string,
    progress: number,
    statusMessage?: string,
    subTasksCompleted?: number,
    subTasksTotal?: number,
  ): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.progress = Math.min(100, Math.max(0, progress))
      if (statusMessage) task.statusMessage = statusMessage
      if (subTasksCompleted !== undefined)
        task.subTasksCompleted = subTasksCompleted
      if (subTasksTotal !== undefined) task.subTasksTotal = subTasksTotal
      this.emit({
        type: 'task_progress',
        taskId,
        data: {
          progress: task.progress,
          statusMessage,
          subTasksCompleted,
          subTasksTotal,
        },
      })
    }
  }

  /**
   * Mark a task as completed.
   */
  markCompleted(taskId: string, result?: any): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.runState = 'queued' // reset state
      task.completedAt = new Date()
      task.progress = 100
      task.result = result
      task.statusMessage = 'Completed'
      this.running = Math.max(0, this.running - 1)
      this.emit({ type: 'task_completed', taskId, data: result })
    }
  }

  /**
   * Mark a task as failed.
   */
  markFailed(taskId: string, error: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.runState = 'queued' // reset state
      task.completedAt = new Date()
      task.error = error
      task.statusMessage = `Failed: ${error}`
      this.running = Math.max(0, this.running - 1)
      this.emit({ type: 'task_failed', taskId, data: { error } })
    }
  }

  /**
   * Pause a running task.
   */
  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (task && task.runState === 'running') {
      task.runState = 'paused'
      this.emit({ type: 'task_paused', taskId })
      return true
    }
    return false
  }

  /**
   * Resume a paused task.
   */
  resume(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (task && task.runState === 'paused') {
      task.runState = 'running'
      this.emit({ type: 'task_resumed', taskId })
      return true
    }
    return false
  }

  /**
   * Cancel a running or queued task.
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    // Abort the running task
    if (task.abortController) {
      task.abortController.abort()
    }

    // Clear scheduled timer
    const timer = this.scheduledTimers.get(taskId)
    if (timer) {
      clearTimeout(timer)
      this.scheduledTimers.delete(taskId)
    }

    if (task.runState === 'running') {
      this.running = Math.max(0, this.running - 1)
    }

    task.runState = 'cancelled'
    task.statusMessage = 'Cancelled'
    this.emit({ type: 'task_cancelled', taskId })
    return true
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /** Get a queued task by ID */
  get(taskId: string): QueuedTask | undefined {
    return this.tasks.get(taskId)
  }

  /** Get the abort signal for a task (for passing to execution engine) */
  getSignal(taskId: string): AbortSignal | undefined {
    return this.tasks.get(taskId)?.abortController?.signal
  }

  /** Get all tasks sorted by priority then queue time */
  getAll(): QueuedTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => {
      const priDiff = PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority]
      if (priDiff !== 0) return priDiff
      return a.queuedAt.getTime() - b.queuedAt.getTime()
    })
  }

  /** Get next tasks ready for execution */
  getReady(): QueuedTask[] {
    return this.getAll().filter(
      (t) => t.runState === 'queued' && !t.completedAt,
    )
  }

  /** Get currently running tasks */
  getRunning(): QueuedTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.runState === 'running',
    )
  }

  /** Check if there's capacity for more concurrent tasks */
  hasCapacity(): boolean {
    return this.running < this.maxConcurrent
  }

  /** Get queue stats */
  getStats(): {
    total: number
    queued: number
    running: number
    completed: number
    failed: number
    cancelled: number
  } {
    const all = Array.from(this.tasks.values())
    return {
      total: all.length,
      queued: all.filter((t) => t.runState === 'queued' && !t.completedAt)
        .length,
      running: all.filter((t) => t.runState === 'running').length,
      completed: all.filter((t) => t.completedAt && !t.error).length,
      failed: all.filter((t) => !!t.error).length,
      cancelled: all.filter((t) => t.runState === 'cancelled').length,
    }
  }

  /** Set max concurrent tasks */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max)
  }

  /** Remove completed/failed/cancelled tasks from the queue */
  prune(): number {
    let pruned = 0
    for (const [taskId, task] of this.tasks) {
      if (task.completedAt || task.runState === 'cancelled') {
        this.tasks.delete(taskId)
        pruned++
      }
    }
    return pruned
  }

  /** Clear all tasks */
  clear(): void {
    // Cancel all running tasks first
    for (const task of this.tasks.values()) {
      if (task.abortController) {
        task.abortController.abort()
      }
    }
    // Clear all timers
    for (const timer of this.scheduledTimers.values()) {
      clearTimeout(timer)
    }
    this.scheduledTimers.clear()
    this.tasks.clear()
    this.running = 0
  }
}
