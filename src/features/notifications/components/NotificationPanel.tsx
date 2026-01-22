/**
 * Notification Panel Component
 *
 * Displays the list of notifications with read/unread state,
 * action buttons, and empty state.
 */
import { Button, Chip, ScrollShadow, Spinner } from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useNotificationStore } from '../stores/notificationStore'
import type { Notification, NotificationType } from '../types'
import type { IconName } from '@/lib/types'

interface NotificationPanelProps {
  onClose?: () => void
}

/**
 * Get icon name for notification type
 */
const getIconName = (type: NotificationType): IconName => {
  switch (type) {
    case 'success':
      return 'CheckCircleSolid'
    case 'warning':
      return 'WarningCircleSolid'
    case 'error':
      return 'XmarkCircleSolid'
    case 'info':
    default:
      return 'InfoCircleSolid'
  }
}

/**
 * Get color class for notification type
 */
const getColorClass = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-danger'
    case 'info':
    default:
      return 'text-primary'
  }
}

/**
 * Format relative time for notification
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

/**
 * Single notification item
 */
function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification
  onClose?: () => void
}) {
  const navigate = useNavigate()
  const { deleteNotification } = useNotificationStore()

  const handleClick = () => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
      onClose?.()
    }
  }

  return (
    <div
      className={`
        group relative p-3 rounded-medium transition-colors
        ${notification.actionUrl ? 'cursor-pointer hover:bg-default-100' : ''}
        ${!notification.read ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`mt-0.5 ${getColorClass(notification.type)}`}>
          <Icon name={getIconName(notification.type)} size="sm" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-default-600'}`}
            >
              {notification.title}
            </p>
            <span className="text-xs text-default-400 whitespace-nowrap">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
          {notification.description && (
            <p className="text-xs text-default-500 mt-0.5 line-clamp-2">
              {notification.description}
            </p>
          )}
          {notification.actionLabel && (
            <Chip size="sm" variant="flat" color="primary" className="mt-2">
              {notification.actionLabel}
            </Chip>
          )}
        </div>

        {/* Delete button */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="opacity-0 group-hover:opacity-100 absolute top-2 end-2"
          onPress={() => deleteNotification(notification.id)}
          aria-label="Delete notification"
        >
          <Icon name="Xmark" size="sm" />
        </Button>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <span className="absolute top-3 start-1 w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </div>
  )
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { t } = useI18n()
  const { notifications, isLoading } = useNotificationStore()

  if (isLoading) {
    return (
      <div className="w-80 p-6 flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div className="w-80 max-w-full">
      {/* Header */}
      {/* <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{t('Notifications')}</h3>
          {unreadCount > 0 && (
            <Chip size="sm" color="primary" variant="flat">
              {unreadCount}
            </Chip>
          )}
        </div>
        {notifications.length > 0 && (
          <Button size="sm" variant="light" onPress={clearAll}>
            {t('Clear all')}
          </Button>
        )}
      </div> */}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="p-6 text-center">
          <Icon
            name="Bell"
            size="lg"
            className="mx-auto mb-2 text-default-300"
          />
          <p className="text-sm text-default-500">{t('No notifications')}</p>
        </div>
      ) : (
        <ScrollShadow className="max-h-96">
          <div className="p-1 space-y-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={onClose}
              />
            ))}
          </div>
        </ScrollShadow>
      )}
    </div>
  )
}
