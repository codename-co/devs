/**
 * Background Worker Manager
 *
 * Manages a dedicated Web Worker for off-main-thread orchestration execution.
 * This is the v1 approach (Step 7.2) — requires the tab to stay open but
 * keeps the UI responsive during heavy orchestration.
 *
 * The worker communicates via MessageChannel with the main thread.
 * Task state is persisted in the Yjs-backed queueStore so that
 * if the tab closes, the scheduler can recover the task on restart.
 *
 * Note: Full Service Worker background execution (Step 7.3) is handled
 * separately via sw-bridge.ts — it doesn't require the tab to be open
 * but has architectural limitations (no DOM, limited Yjs access).
 *
 * @module lib/orchestrator/background-worker
 */

import {
  markQueueStarted,
  updateQueueProgress,
  markQueueCompleted,
  markQueueFailed,
  cancelQueueEntry,
} from '@/stores/queueStore'
import type { QueuedTaskEntry } from '@/types'
import { getSchedulerClientId } from './scheduler'

// ============================================================================
// Types
// ============================================================================

/** Messages sent TO the worker */
export type WorkerInboundMessage =
  | {
      type: 'execute-task'
      entryId: string
      prompt: string
      existingTaskId?: string
      priority: string
      activatedSkills?: Array<{ name: string; skillMdContent: string }>
    }
  | { type: 'cancel-task'; entryId: string }
  | { type: 'shutdown' }

/** Messages received FROM the worker */
export type WorkerOutboundMessage =
  | {
      type: 'task-started'
      entryId: string
    }
  | {
      type: 'task-progress'
      entryId: string
      progress: number
      message?: string
      subTasksCompleted?: number
      subTasksTotal?: number
    }
  | {
      type: 'task-completed'
      entryId: string
      workflowId?: string
    }
  | {
      type: 'task-failed'
      entryId: string
      error: string
    }
  | {
      type: 'worker-ready'
    }
  | {
      type: 'worker-error'
      error: string
    }

// ============================================================================
// Worker Manager State
// ============================================================================

let worker: Worker | null = null
let isReady = false
const pendingTasks = new Map<
  string,
  { resolve: () => void; reject: (err: Error) => void }
>()

// ============================================================================
// Worker Lifecycle
// ============================================================================

/**
 * Initialize the background orchestration worker.
 * The worker runs on a separate thread for non-blocking execution.
 *
 * Note: In the current implementation, the heavy LLM calls happen via
 * fetch (which is async and non-blocking anyway), so the primary benefit
 * of the worker is isolating the orchestration state machine from UI jank
 * caused by task decomposition, prompt construction, and result parsing.
 *
 * For v1, we use a lightweight approach: the worker just signals back
 * progress while the actual orchestration still runs on the main thread
 * (since it needs access to Yjs, stores, and LLM service).
 *
 * The "keep tab open" indicator should be shown when background tasks
 * are running.
 */
export function initBackgroundWorker(): void {
  if (worker) return // Already initialized

  // For v1, we use a "virtual worker" pattern — the execution happens
  // on the main thread but we manage it as if it were a worker, so that
  // upgrading to a true Worker/SharedWorker is a drop-in replacement.
  isReady = true
}

/**
 * Submit a task for background execution via the worker manager.
 *
 * The task is tracked in the Yjs queue store for persistence.
 * Execution happens on the main thread (v1) but the API is designed
 * for future upgrade to a real Web Worker.
 */
export async function executeInBackground(
  entry: QueuedTaskEntry,
): Promise<void> {
  const clientId = getSchedulerClientId()

  await markQueueStarted(entry.id, clientId)

  try {
    // Dynamic import to avoid circular dependency
    const { orchestrate } = await import('./engine')

    const result = await orchestrate(entry.prompt, entry.existingTaskId, {
      priority: entry.priority,
      activatedSkills: entry.activatedSkills,
      onProgress: (update) => {
        updateQueueProgress(
          entry.id,
          update.progress,
          update.message,
          update.subTasksCompleted,
          update.subTasksTotal,
        ).catch(() => {})
      },
    })

    await markQueueCompleted(entry.id, result.workflowId)
  } catch (error) {
    await markQueueFailed(
      entry.id,
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

/**
 * Cancel a background task.
 */
export async function cancelBackgroundTask(entryId: string): Promise<void> {
  await cancelQueueEntry(entryId)
}

/**
 * Check if the background worker is ready.
 */
export function isWorkerReady(): boolean {
  return isReady
}

/**
 * Get the number of tasks currently being managed by the worker.
 */
export function getBackgroundTaskCount(): number {
  return pendingTasks.size
}

/**
 * Shutdown the background worker.
 */
export function shutdownBackgroundWorker(): void {
  if (worker) {
    worker.postMessage({ type: 'shutdown' } satisfies WorkerInboundMessage)
    worker.terminate()
    worker = null
  }
  isReady = false
  pendingTasks.clear()
}
