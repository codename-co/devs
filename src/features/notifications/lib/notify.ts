/**
 * Notification Utility
 *
 * Global utility for triggering notifications from anywhere in the app.
 * This provides a simple API that other features can use to create notifications.
 */
import type { NotificationType } from '../types'
import { addNotification } from '../stores/notificationStore'

export interface NotifyOptions {
  /** Short title for the notification */
  title: string
  /** Optional longer description */
  description?: string
  /** Optional action URL to navigate to when clicked */
  actionUrl?: string
  /** Optional action label */
  actionLabel?: string
}

/**
 * Create a notification of a specific type
 */
export const notify = (
  type: NotificationType,
  options: NotifyOptions,
): Promise<void> => {
  return addNotification({
    type,
    title: options.title,
    description: options.description,
    actionUrl: options.actionUrl,
    actionLabel: options.actionLabel,
  }).then(() => {})
}

/**
 * Create an info notification
 */
export const notifyInfo = (options: NotifyOptions): Promise<void> =>
  notify('info', options)

/**
 * Create a success notification
 */
export const notifySuccess = (options: NotifyOptions): Promise<void> =>
  notify('success', options)

/**
 * Create a warning notification
 */
export const notifyWarning = (options: NotifyOptions): Promise<void> =>
  notify('warning', options)

/**
 * Create an error notification
 */
export const notifyError = (options: NotifyOptions): Promise<void> =>
  notify('error', options)
