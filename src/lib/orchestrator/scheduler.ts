/**
 * Scheduling Engine
 *
 * Manages automatic draining of the persistent task queue and
 * scheduled/recurring task execution. Runs on the main thread
 * with an interval-based tick loop.
 *
 * The scheduler is responsible for:
 * 1. Polling the Yjs-backed queue for ready tasks
 * 2. Promoting due scheduled tasks to "queued"
 * 3. Dispatching tasks for execution (main thread or Web Worker)
 * 4. Leader election to prevent duplicate execution across tabs
 *
 * @module lib/orchestrator/scheduler
 */

import {
  useQueueStore,
  getReadyEntries,
  getRunningEntries,
  getDueScheduledEntries,
  markQueueStarted,
  updateQueueProgress,
  markQueueCompleted,
  markQueueFailed,
  MAX_CONCURRENT,
} from '@/stores/queueStore'
import type { QueuedTaskEntry } from '@/types'

// ============================================================================
// Constants
// ============================================================================

/** How often (ms) the scheduler checks for work */
const TICK_INTERVAL_MS = 5_000

/** BroadcastChannel name for leader election */
const LEADER_CHANNEL = 'devs-scheduler-leader'

/** How often (ms) the leader sends heartbeats */
const HEARTBEAT_INTERVAL_MS = 3_000

/** How long (ms) before a missing heartbeat means the leader is dead */
const HEARTBEAT_TIMEOUT_MS = 10_000

// ============================================================================
// Scheduler State
// ============================================================================

let tickTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let isLeader = false
let lastLeaderHeartbeat = 0
let clientId = ''
let broadcastChannel: BroadcastChannel | null = null
let isRunning = false

/** AbortControllers for running tasks, keyed by queue entry ID */
const runningAbortControllers = new Map<string, AbortController>()

// ============================================================================
// Leader Election (Tab Coordination)
// ============================================================================

/**
 * Simple leader election using BroadcastChannel.
 *
 * When a tab starts, it announces itself. The tab with the lowest
 * clientId (lexicographic) becomes the leader. The leader sends
 * periodic heartbeats. If heartbeats stop, other tabs try to claim
 * leadership.
 *
 * This prevents multiple tabs from draining the same queue simultaneously.
 */
function initLeaderElection(): void {
  clientId = crypto.randomUUID()

  try {
    broadcastChannel = new BroadcastChannel(LEADER_CHANNEL)
  } catch {
    // BroadcastChannel not supported (e.g., some older browsers)
    // Fall back to always being the leader
    isLeader = true
    return
  }

  broadcastChannel.onmessage = (event) => {
    const msg = event.data as {
      type: 'announce' | 'heartbeat' | 'claim' | 'yield'
      clientId: string
    }

    switch (msg.type) {
      case 'announce':
        // A new tab announced itself — if we're the leader, send a heartbeat
        if (isLeader) {
          broadcastChannel?.postMessage({
            type: 'heartbeat',
            clientId,
          })
        }
        break

      case 'heartbeat':
        lastLeaderHeartbeat = Date.now()
        // If someone else is sending heartbeats, we're not the leader
        if (msg.clientId !== clientId) {
          isLeader = false
        }
        break

      case 'claim':
        // Another tab is claiming leadership
        if (msg.clientId < clientId) {
          // They have a lower ID, yield
          isLeader = false
        } else if (isLeader) {
          // We have priority, reassert
          broadcastChannel?.postMessage({
            type: 'heartbeat',
            clientId,
          })
        }
        break

      case 'yield':
        // The leader is shutting down
        if (!isLeader) {
          // Try to claim leadership
          tryClaimLeadership()
        }
        break
    }
  }

  // Announce ourselves
  broadcastChannel.postMessage({ type: 'announce', clientId })

  // Wait briefly for existing leaders to respond, then try to claim
  setTimeout(() => {
    if (!isLeader && Date.now() - lastLeaderHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      tryClaimLeadership()
    }
  }, 2_000)
}

function tryClaimLeadership(): void {
  isLeader = true
  lastLeaderHeartbeat = Date.now()
  broadcastChannel?.postMessage({ type: 'claim', clientId })

  // Start sending heartbeats
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = setInterval(() => {
    if (isLeader) {
      lastLeaderHeartbeat = Date.now()
      broadcastChannel?.postMessage({ type: 'heartbeat', clientId })
    }
  }, HEARTBEAT_INTERVAL_MS)
}

function yieldLeadership(): void {
  isLeader = false
  broadcastChannel?.postMessage({ type: 'yield', clientId })
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// ============================================================================
// Tick Loop
// ============================================================================

/**
 * Main scheduling tick. Called every TICK_INTERVAL_MS.
 * Only the leader tab processes tasks.
 */
async function tick(): Promise<void> {
  if (!isLeader) {
    // Check if the leader is still alive
    if (
      lastLeaderHeartbeat > 0 &&
      Date.now() - lastLeaderHeartbeat > HEARTBEAT_TIMEOUT_MS
    ) {
      tryClaimLeadership()
    }
    return
  }

  try {
    // 1. Promote due scheduled tasks to queued
    await promoteDueScheduled()

    // 2. Check capacity and dispatch ready tasks
    const running = getRunningEntries()
    const availableSlots = MAX_CONCURRENT - running.length

    if (availableSlots <= 0) return

    const ready = getReadyEntries()
    const batch = ready.slice(0, availableSlots)

    for (const entry of batch) {
      // Don't await — fire each task in parallel
      dispatchTask(entry).catch((err) => {
        console.error(`Scheduler: dispatch failed for ${entry.id}:`, err)
      })
    }
  } catch (error) {
    console.error('Scheduler tick error:', error)
  }
}

/**
 * Promote scheduled tasks whose nextRunAt has passed to "queued".
 */
async function promoteDueScheduled(): Promise<void> {
  const due = getDueScheduledEntries()
  const { updateEntry } = useQueueStore.getState()

  for (const entry of due) {
    await updateEntry(entry.id, { runState: 'queued' })
  }
}

/**
 * Dispatch a single queue entry for execution on the main thread.
 */
async function dispatchTask(entry: QueuedTaskEntry): Promise<void> {
  const abortController = new AbortController()
  runningAbortControllers.set(entry.id, abortController)

  await markQueueStarted(entry.id, clientId)

  try {
    // Dynamic import to avoid circular dependency
    const { orchestrate } = await import('./engine')

    const result = await orchestrate(entry.prompt, entry.existingTaskId, {
      signal: abortController.signal,
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
    if (abortController.signal.aborted) {
      // Task was cancelled — don't mark as failed
      return
    }
    await markQueueFailed(
      entry.id,
      error instanceof Error ? error.message : 'Unknown error',
    )
  } finally {
    runningAbortControllers.delete(entry.id)
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the scheduler. Call once on app init (after Yjs is ready).
 *
 * The scheduler uses leader election so only one tab processes tasks,
 * then a tick-based loop that polls the Yjs queue for work.
 */
export function startScheduler(): void {
  if (isRunning) return
  isRunning = true

  initLeaderElection()

  // Initial tick after a short delay (let leader election settle)
  setTimeout(() => {
    tick()
  }, 3_000)

  tickTimer = setInterval(tick, TICK_INTERVAL_MS)
}

/**
 * Stop the scheduler. Call on app teardown.
 */
export function stopScheduler(): void {
  isRunning = false

  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }

  yieldLeadership()

  if (broadcastChannel) {
    broadcastChannel.close()
    broadcastChannel = null
  }

  // Abort all running tasks
  for (const [, controller] of runningAbortControllers) {
    controller.abort()
  }
  runningAbortControllers.clear()
}

/**
 * Cancel a specific task being executed by this scheduler.
 */
export function cancelScheduledTask(entryId: string): boolean {
  const controller = runningAbortControllers.get(entryId)
  if (controller) {
    controller.abort()
    runningAbortControllers.delete(entryId)
    return true
  }
  return false
}

/**
 * Check if this tab is the scheduler leader.
 */
export function isSchedulerLeader(): boolean {
  return isLeader
}

/**
 * Get the current scheduler client ID.
 */
export function getSchedulerClientId(): string {
  return clientId
}

/**
 * Force a manual tick (for testing or immediate dispatch).
 */
export async function forceTick(): Promise<void> {
  // Temporarily act as leader for this tick
  const wasLeader = isLeader
  isLeader = true
  await tick()
  isLeader = wasLeader
}
