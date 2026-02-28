import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskQueue } from '@/lib/orchestrator/task-queue'

describe('TaskQueue', () => {
  let queue: TaskQueue

  beforeEach(() => {
    TaskQueue.resetInstance()
    queue = TaskQueue.getInstance()
  })

  afterEach(() => {
    TaskQueue.resetInstance()
  })

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const q1 = TaskQueue.getInstance()
      const q2 = TaskQueue.getInstance()
      expect(q1).toBe(q2)
    })

    it('should create a new instance after reset', () => {
      const q1 = TaskQueue.getInstance()
      TaskQueue.resetInstance()
      const q2 = TaskQueue.getInstance()
      expect(q1).not.toBe(q2)
    })
  })

  describe('enqueue', () => {
    it('should add a task to the queue', () => {
      const task = queue.enqueue('task-1', 'wf-1', 'Do something', 'normal')
      expect(task.taskId).toBe('task-1')
      expect(task.workflowId).toBe('wf-1')
      expect(task.prompt).toBe('Do something')
      expect(task.priority).toBe('normal')
      expect(task.runState).toBe('queued')
      expect(task.progress).toBe(0)
    })

    it('should emit task_queued event', () => {
      const listener = vi.fn()
      queue.on(listener)
      queue.enqueue('task-1', 'wf-1', 'prompt')
      expect(listener).toHaveBeenCalledWith({
        type: 'task_queued',
        taskId: 'task-1',
      })
    })

    it('should default priority to normal', () => {
      const task = queue.enqueue('task-1', 'wf-1', 'prompt')
      expect(task.priority).toBe('normal')
    })
  })

  describe('markStarted', () => {
    it('should set task to running state', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      const task = queue.get('task-1')
      expect(task?.runState).toBe('running')
      expect(task?.startedAt).toBeDefined()
      expect(task?.abortController).toBeDefined()
    })

    it('should emit task_started event', () => {
      const listener = vi.fn()
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.on(listener)
      queue.markStarted('task-1')
      expect(listener).toHaveBeenCalledWith({
        type: 'task_started',
        taskId: 'task-1',
      })
    })
  })

  describe('updateProgress', () => {
    it('should update progress and status message', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.updateProgress('task-1', 50, 'Halfway done')
      const task = queue.get('task-1')
      expect(task?.progress).toBe(50)
      expect(task?.statusMessage).toBe('Halfway done')
    })

    it('should clamp progress between 0 and 100', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.updateProgress('task-1', 150)
      expect(queue.get('task-1')?.progress).toBe(100)
      queue.updateProgress('task-1', -10)
      expect(queue.get('task-1')?.progress).toBe(0)
    })

    it('should update sub-task progress', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.updateProgress('task-1', 60, 'Working...', 3, 5)
      const task = queue.get('task-1')
      expect(task?.subTasksCompleted).toBe(3)
      expect(task?.subTasksTotal).toBe(5)
    })
  })

  describe('markCompleted', () => {
    it('should mark task as completed', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      queue.markCompleted('task-1', { data: 'result' })
      const task = queue.get('task-1')
      expect(task?.completedAt).toBeDefined()
      expect(task?.progress).toBe(100)
      expect(task?.result).toEqual({ data: 'result' })
    })

    it('should emit task_completed event', () => {
      const listener = vi.fn()
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      queue.on(listener)
      queue.markCompleted('task-1', 'result')
      expect(listener).toHaveBeenCalledWith({
        type: 'task_completed',
        taskId: 'task-1',
        data: 'result',
      })
    })
  })

  describe('markFailed', () => {
    it('should mark task as failed', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      queue.markFailed('task-1', 'Something broke')
      const task = queue.get('task-1')
      expect(task?.completedAt).toBeDefined()
      expect(task?.error).toBe('Something broke')
    })
  })

  describe('pause / resume', () => {
    it('should pause a running task', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      expect(queue.pause('task-1')).toBe(true)
      expect(queue.get('task-1')?.runState).toBe('paused')
    })

    it('should resume a paused task', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      queue.pause('task-1')
      expect(queue.resume('task-1')).toBe(true)
      expect(queue.get('task-1')?.runState).toBe('running')
    })

    it('should not pause a non-running task', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      expect(queue.pause('task-1')).toBe(false)
    })

    it('should not resume a non-paused task', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      expect(queue.resume('task-1')).toBe(false)
    })
  })

  describe('cancel', () => {
    it('should cancel a running task', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      expect(queue.cancel('task-1')).toBe(true)
      expect(queue.get('task-1')?.runState).toBe('cancelled')
    })

    it('should cancel a queued task', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      expect(queue.cancel('task-1')).toBe(true)
      expect(queue.get('task-1')?.runState).toBe('cancelled')
    })

    it('should abort the controller on cancel', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.markStarted('task-1')
      const signal = queue.getSignal('task-1')
      expect(signal?.aborted).toBe(false)
      queue.cancel('task-1')
      expect(signal?.aborted).toBe(true)
    })

    it('should return false for non-existent task', () => {
      expect(queue.cancel('nonexistent')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return tasks sorted by priority then queue time', () => {
      queue.enqueue('task-low', 'wf-1', 'low', 'low')
      queue.enqueue('task-high', 'wf-1', 'high', 'high')
      queue.enqueue('task-critical', 'wf-1', 'critical', 'critical')
      queue.enqueue('task-normal', 'wf-1', 'normal', 'normal')

      const all = queue.getAll()
      expect(all[0].taskId).toBe('task-critical')
      expect(all[1].taskId).toBe('task-high')
      expect(all[2].taskId).toBe('task-normal')
      expect(all[3].taskId).toBe('task-low')
    })
  })

  describe('getReady', () => {
    it('should return only queued incomplete tasks', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.enqueue('task-2', 'wf-1', 'prompt')
      queue.enqueue('task-3', 'wf-1', 'prompt')
      queue.markStarted('task-2')

      const ready = queue.getReady()
      expect(ready).toHaveLength(2)
      expect(ready.map((t) => t.taskId)).toContain('task-1')
      expect(ready.map((t) => t.taskId)).toContain('task-3')
    })
  })

  describe('getRunning', () => {
    it('should return only running tasks', () => {
      queue.enqueue('task-1', 'wf-1', 'prompt')
      queue.enqueue('task-2', 'wf-1', 'prompt')
      queue.markStarted('task-1')

      const running = queue.getRunning()
      expect(running).toHaveLength(1)
      expect(running[0].taskId).toBe('task-1')
    })
  })

  describe('hasCapacity', () => {
    it('should return true when under capacity', () => {
      expect(queue.hasCapacity()).toBe(true)
    })

    it('should return false when at capacity', () => {
      queue.setMaxConcurrent(2)
      queue.enqueue('task-1', 'wf-1', 'p')
      queue.enqueue('task-2', 'wf-1', 'p')
      queue.markStarted('task-1')
      queue.markStarted('task-2')
      expect(queue.hasCapacity()).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
      queue.enqueue('task-1', 'wf-1', 'p')
      queue.enqueue('task-2', 'wf-1', 'p')
      queue.enqueue('task-3', 'wf-1', 'p')
      queue.markStarted('task-2')
      queue.markStarted('task-3')
      queue.markCompleted('task-3')

      const stats = queue.getStats()
      expect(stats.total).toBe(3)
      expect(stats.queued).toBe(1)
      expect(stats.running).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })
  })

  describe('prune', () => {
    it('should remove completed and cancelled tasks', () => {
      queue.enqueue('task-1', 'wf-1', 'p')
      queue.enqueue('task-2', 'wf-1', 'p')
      queue.enqueue('task-3', 'wf-1', 'p')
      queue.markStarted('task-2')
      queue.markCompleted('task-2')
      queue.cancel('task-3')

      const pruned = queue.prune()
      expect(pruned).toBe(2)
      expect(queue.getAll()).toHaveLength(1)
      expect(queue.get('task-1')).toBeDefined()
    })
  })

  describe('clear', () => {
    it('should remove all tasks', () => {
      queue.enqueue('task-1', 'wf-1', 'p')
      queue.enqueue('task-2', 'wf-1', 'p')
      queue.clear()
      expect(queue.getAll()).toHaveLength(0)
    })

    it('should abort running tasks on clear', () => {
      queue.enqueue('task-1', 'wf-1', 'p')
      queue.markStarted('task-1')
      const signal = queue.getSignal('task-1')
      queue.clear()
      expect(signal?.aborted).toBe(true)
    })
  })

  describe('event listener lifecycle', () => {
    it('should unsubscribe when calling returned function', () => {
      const listener = vi.fn()
      const unsub = queue.on(listener)
      queue.enqueue('task-1', 'wf-1', 'p')
      expect(listener).toHaveBeenCalledTimes(1)

      unsub()
      queue.enqueue('task-2', 'wf-1', 'p')
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('schedule', () => {
    it('should schedule a task for future execution', () => {
      vi.useFakeTimers()
      const futureTime = new Date(Date.now() + 5000)
      const task = queue.schedule('task-1', 'wf-1', 'p', futureTime)
      expect(task.runState).toBe('scheduled')

      vi.advanceTimersByTime(5000)
      expect(queue.get('task-1')?.runState).toBe('queued')
      vi.useRealTimers()
    })

    it('should immediately queue if scheduled time is past', () => {
      const pastTime = new Date(Date.now() - 1000)
      const task = queue.schedule('task-1', 'wf-1', 'p', pastTime)
      expect(task.runState).toBe('queued')
    })
  })
})
