/**
 * Notification System Types
 *
 * Type definitions for the notification center feature.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  /** Type of notification - affects icon and color */
  type: NotificationType
  /** Short title for the notification */
  title: string
  /** Optional longer description */
  description?: string
  /** Whether the notification has been read */
  read: boolean
  /** When the notification was created */
  createdAt: Date
  /** When the notification was marked as read */
  readAt?: Date
  /** Optional action URL to navigate to when clicked */
  actionUrl?: string
  /** Optional action label */
  actionLabel?: string
}

export interface NotificationStore {
  // State
  notifications: Notification[]
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  addNotification: (
    notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'readAt'>,
  ) => Promise<Notification>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAll: () => Promise<void>

  // Computed
  getUnreadCount: () => number
  getNotificationCount: () => number
}
