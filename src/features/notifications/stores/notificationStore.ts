/**
 * Notification Store
 *
 * Zustand store for managing notifications with IndexedDB persistence.
 */
import { create } from 'zustand'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import type { Notification, NotificationStore } from '../types'

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // State
  notifications: [],
  isLoading: false,
  isInitialized: false,

  // Initialize the store by loading notifications from IndexedDB
  initialize: async () => {
    const { isInitialized } = get()
    if (isInitialized) return

    set({ isLoading: true })
    try {
      await db.init()
      const notifications = await db.getAll<'notifications'>('notifications')
      // Sort by createdAt descending (newest first)
      notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      set({ notifications, isInitialized: true })
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // Add a new notification
  addNotification: async (notification) => {
    const newNotification: Notification = {
      id: uuidv4(),
      ...notification,
      read: false,
      createdAt: new Date(),
    }

    try {
      await db.init()
      await db.add('notifications', newNotification)

      set((state) => ({
        notifications: [newNotification, ...state.notifications],
      }))

      return newNotification
    } catch (error) {
      console.error('Failed to add notification:', error)
      throw error
    }
  },

  // Mark a single notification as read
  markAsRead: async (id: string) => {
    const { notifications } = get()
    const notification = notifications.find((n) => n.id === id)
    if (!notification || notification.read) return

    const updatedNotification: Notification = {
      ...notification,
      read: true,
      readAt: new Date(),
    }

    try {
      await db.init()
      await db.update('notifications', updatedNotification)

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? updatedNotification : n,
        ),
      }))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      throw error
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const { notifications } = get()
    const unreadNotifications = notifications.filter((n) => !n.read)
    if (unreadNotifications.length === 0) return

    const now = new Date()
    const updatedNotifications = notifications.map((n) =>
      n.read
        ? n
        : {
            ...n,
            read: true,
            readAt: now,
          },
    )

    try {
      await db.init()
      // Update all unread notifications in the database
      await Promise.all(
        updatedNotifications
          .filter((n) => !notifications.find((orig) => orig.id === n.id)?.read)
          .map((n) => db.update('notifications', n)),
      )

      set({ notifications: updatedNotifications })
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      throw error
    }
  },

  // Delete a single notification
  deleteNotification: async (id: string) => {
    try {
      await db.init()
      await db.delete('notifications', id)

      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    } catch (error) {
      console.error('Failed to delete notification:', error)
      throw error
    }
  },

  // Clear all notifications
  clearAll: async () => {
    try {
      await db.init()
      await db.clear('notifications')

      set({ notifications: [] })
    } catch (error) {
      console.error('Failed to clear notifications:', error)
      throw error
    }
  },

  // Get unread count
  getUnreadCount: () => {
    const { notifications } = get()
    return notifications.filter((n) => !n.read).length
  },

  // Get total notification count
  getNotificationCount: () => {
    const { notifications } = get()
    return notifications.length
  },
}))

// ============================================================================
// Non-hook exports for use outside React components
// ============================================================================

/**
 * Get the notification store state directly (for use in non-React code)
 */
export const getNotificationStore = () => useNotificationStore.getState()

/**
 * Add a notification from anywhere in the app
 */
export const addNotification = (
  notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'readAt'>,
) => getNotificationStore().addNotification(notification)

/**
 * Get unread notification count
 */
export const getUnreadCount = () => getNotificationStore().getUnreadCount()

/**
 * Get total notification count
 */
export const getNotificationCount = () =>
  getNotificationStore().getNotificationCount()

/**
 * Initialize the notification store
 */
export const initializeNotificationStore = () =>
  getNotificationStore().initialize()
