/**
 * Service Worker Bridge
 *
 * Extends the existing Service Worker with background orchestration
 * notification capabilities. This module runs on the main thread and
 * communicates with the SW via postMessage for:
 *
 * 1. Showing notifications when background tasks complete/fail
 * 2. Keeping the SW alive during background orchestration
 * 3. Future: full off-tab orchestration via SW fetch
 *
 * Note: Full orchestration inside the SW is architecturally complex
 * (Yjs access, store access, LLM streaming) and is deferred. This
 * bridge provides the notification and keepalive layer.
 *
 * @module lib/orchestrator/sw-bridge
 */

// ============================================================================
// Message Types
// ============================================================================

export interface SWBridgeMessage {
  type:
    | 'BACKGROUND_TASK_STARTED'
    | 'BACKGROUND_TASK_PROGRESS'
    | 'BACKGROUND_TASK_COMPLETED'
    | 'BACKGROUND_TASK_FAILED'
    | 'BACKGROUND_TASK_CANCELLED'
    | 'BACKGROUND_KEEPALIVE'
  payload: {
    entryId: string
    prompt?: string
    progress?: number
    message?: string
    error?: string
  }
}

// ============================================================================
// State
// ============================================================================

let keepaliveTimer: ReturnType<typeof setInterval> | null = null

// ============================================================================
// SW Communication
// ============================================================================

/**
 * Send a message to the active Service Worker.
 * Gracefully handles cases where no SW is available.
 */
function postToSW(message: SWBridgeMessage): void {
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage(message)
    }
  } catch {
    // SW not available — silent failure is fine
  }
}

// ============================================================================
// Notification API
// ============================================================================

/**
 * Request notification permission if not already granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Show a browser notification for a background task event.
 */
function showNotification(title: string, body: string, tag?: string): void {
  if (Notification.permission !== 'granted') return

  try {
    // Try via SW for better lifecycle handling
    navigator.serviceWorker?.ready
      ?.then((reg) => {
        reg.showNotification(title, {
          body,
          tag: tag || 'devs-background-task',
          icon: '/devs.svg',
          badge: '/devs.svg',
          requireInteraction: false,
          silent: false,
        })
      })
      .catch(() => {
        // Fallback to direct Notification API
        new Notification(title, { body, tag: tag || 'devs-background-task' })
      })
  } catch {
    // Notification not supported
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Notify that a background task has started.
 */
export function notifyTaskStarted(entryId: string, prompt: string): void {
  postToSW({
    type: 'BACKGROUND_TASK_STARTED',
    payload: { entryId, prompt },
  })

  // Start keepalive pings to prevent SW from going idle
  startKeepalive(entryId)
}

/**
 * Notify progress update.
 */
export function notifyTaskProgress(
  entryId: string,
  progress: number,
  message?: string,
): void {
  postToSW({
    type: 'BACKGROUND_TASK_PROGRESS',
    payload: { entryId, progress, message },
  })
}

/**
 * Notify that a background task completed successfully.
 */
export function notifyTaskCompleted(entryId: string, prompt: string): void {
  postToSW({
    type: 'BACKGROUND_TASK_COMPLETED',
    payload: { entryId, prompt },
  })

  showNotification(
    'Task Completed',
    `Background task finished: ${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}`,
    `devs-task-${entryId}`,
  )

  stopKeepalive()
}

/**
 * Notify that a background task failed.
 */
export function notifyTaskFailed(
  entryId: string,
  prompt: string,
  error: string,
): void {
  postToSW({
    type: 'BACKGROUND_TASK_FAILED',
    payload: { entryId, prompt, error },
  })

  showNotification(
    'Task Failed',
    `Background task failed: ${error.slice(0, 100)}`,
    `devs-task-${entryId}`,
  )

  stopKeepalive()
}

/**
 * Notify that a background task was cancelled.
 */
export function notifyTaskCancelled(entryId: string): void {
  postToSW({
    type: 'BACKGROUND_TASK_CANCELLED',
    payload: { entryId },
  })

  stopKeepalive()
}

// ============================================================================
// Keepalive
// ============================================================================

/**
 * Start sending periodic keepalive pings to the SW.
 * This prevents the SW from going idle during long orchestration runs.
 */
function startKeepalive(entryId: string): void {
  if (keepaliveTimer) return

  keepaliveTimer = setInterval(() => {
    postToSW({
      type: 'BACKGROUND_KEEPALIVE',
      payload: { entryId },
    })
  }, 20_000) // Every 20 seconds
}

/**
 * Stop the keepalive timer.
 */
function stopKeepalive(): void {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer)
    keepaliveTimer = null
  }
}

/**
 * Check if the Service Worker supports background task notifications.
 */
export function isSWBridgeAvailable(): boolean {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller
}
