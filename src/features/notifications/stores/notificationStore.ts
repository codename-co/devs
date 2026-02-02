/**
 * Notification Store
 *
 * Zustand store for managing notifications with localStorage persistence.
 * Notifications are local-only and not synced across devices.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Notification, NotificationStore } from '../types'

// Maximum number of notifications to keep
const MAX_NOTIFICATIONS = 100

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // State
      notifications: [],
      isLoading: false,
      isInitialized: true, // Always initialized since we use localStorage

      // Initialize the store (no-op for localStorage, kept for API compatibility)
      initialize: async () => {
        // No-op - Zustand persist handles loading automatically
      },

      // Add a new notification
      addNotification: async (notification) => {
        const newNotification: Notification = {
          id: uuidv4(),
          ...notification,
          read: false,
          createdAt: new Date(),
        }

        set((state) => {
          // Keep only the most recent notifications
          const updatedNotifications = [
            newNotification,
            ...state.notifications,
          ].slice(0, MAX_NOTIFICATIONS)
          return { notifications: updatedNotifications }
        })

        return newNotification
      },

      // Mark a single notification as read
      markAsRead: async (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id && !n.read
              ? { ...n, read: true, readAt: new Date() }
              : n,
          ),
        }))
      },

      // Mark all notifications as read
      markAllAsRead: async () => {
        const now = new Date()
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.read ? n : { ...n, read: true, readAt: now },
          ),
        }))
      },

      // Delete a single notification
      deleteNotification: async (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      // Clear all notifications
      clearAll: async () => {
        set({ notifications: [] })
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
    }),
    {
      name: 'devs-notifications',
      // Only persist notifications array
      partialize: (state) => ({ notifications: state.notifications }),
    },
  ),
)

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
