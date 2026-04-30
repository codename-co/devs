/**
 * Notification Button Component (HeroUI v3)
 *
 * Sidebar-compatible notification button using HeroUI v3 components.
 * Shows a badge with unread notification count.
 * Opens a popover with the notification panel when clicked.
 * Marks all notifications as read when the panel is opened.
 */
import { Badge, Button, Popover, Tooltip } from '@heroui/react_3'
import { useEffect, useState } from 'react'

import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useNotificationStore } from '../stores/notificationStore'
import { NotificationPanel } from './NotificationPanel'

export function NotificationButtonV3({
  showKbd,
}: {
  showKbd?: boolean
} = {}) {
  const { t } = useI18n()
  const { initialize, markAllAsRead, getUnreadCount } = useNotificationStore()
  const [isOpen, setIsOpen] = useState(false)

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  const unreadCount = getUnreadCount()

  // Mark all as read when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const badgeContent = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip delay={0}>
        <Popover.Trigger>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label={t('Notifications')}
          >
            {unreadCount > 0 ? (
              <Badge color="danger" size="sm">
                <Badge.Anchor>
                  <Icon name="Bell" className="text-muted" size="sm" />
                </Badge.Anchor>
                <Badge.Label>{badgeContent}</Badge.Label>
              </Badge>
            ) : (
              <Icon name="Bell" className="text-muted" size="sm" />
            )}
          </Button>
        </Popover.Trigger>
        {!isOpen && (
          <Tooltip.Content placement={showKbd ? undefined : 'right'}>
            {t('Notifications')}
          </Tooltip.Content>
        )}
      </Tooltip>
      <Popover.Content placement="bottom end">
        <Popover.Dialog>
          <NotificationPanel onClose={() => setIsOpen(false)} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
