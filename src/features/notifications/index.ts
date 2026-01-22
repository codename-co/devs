/**
 * Notifications Feature - Public API
 *
 * Notification center feature for displaying in-app notifications.
 * Provides components, store, and utilities for managing notifications.
 */

// ============================================================================
// Components
// ============================================================================

export { NotificationButton } from './components/NotificationButton'
export { NotificationPanel } from './components/NotificationPanel'

// ============================================================================
// Store
// ============================================================================

export {
  useNotificationStore,
  getNotificationStore,
  addNotification,
  getUnreadCount,
  getNotificationCount,
  initializeNotificationStore,
} from './stores/notificationStore'

// ============================================================================
// Lib - Utilities
// ============================================================================

export {
  notify,
  notifyInfo,
  notifySuccess,
  notifyWarning,
  notifyError,
} from './lib/notify'

export type { NotifyOptions } from './lib/notify'

// ============================================================================
// Types
// ============================================================================

export type { Notification, NotificationType, NotificationStore } from './types'
