/**
 * Web Notifications Service
 *
 * Uses the Web Notification API to send browser-level notifications when:
 * - A task completes (or fails)
 * - A HITL (Human-In-The-Loop) request needs user attention
 *
 * Notifications only fire when the document is hidden (tab in background),
 * so they don't spam the user while they're actively looking at the app.
 *
 * @module lib/web-notifications
 */

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Request permission for web notifications.
 * Returns true if permission is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Check if web notifications are supported and permitted.
 */
export function canSendNotification(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

// ============================================================================
// Notification Senders
// ============================================================================

/**
 * Send a web notification if the tab is not focused and permission is granted.
 */
function sendIfHidden(title: string, options?: NotificationOptions): void {
  if (!canSendNotification()) return
  if (!document.hidden) return

  const notification = new Notification(title, {
    icon: '/agents/devs.svg',
    ...options,
  })

  // Focus the tab when the notification is clicked
  notification.addEventListener('click', () => {
    window.focus()
    notification.close()
  })
}

/**
 * Notify the user that a task has completed.
 */
export function notifyTaskCompleted(taskTitle: string): void {
  sendIfHidden('Task Completed', {
    body: taskTitle,
    tag: 'task-completed',
  })
}

/**
 * Notify the user that a task has failed.
 */
export function notifyTaskFailed(taskTitle: string): void {
  sendIfHidden('Task Failed', {
    body: taskTitle,
    tag: 'task-failed',
  })
}

/**
 * Notify the user that a HITL request needs their attention.
 */
export function notifyHitlRequest(question: string): void {
  sendIfHidden('Input Needed', {
    body: question,
    tag: 'hitl-request',
    requireInteraction: true,
  })
}
