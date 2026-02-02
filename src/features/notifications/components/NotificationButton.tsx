/**
 * Notification Button Component
 *
 * Page action button that shows a badge with unread notification count.
 * Opens a popover with the notification panel when clicked.
 * Marks all notifications as read when the panel is opened.
 */
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '@heroui/react'
import { useEffect, useState } from 'react'

import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useNotificationStore } from '../stores/notificationStore'
import { NotificationPanel } from './NotificationPanel'

export function NotificationButton() {
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

  return (
    <Popover placement="bottom" isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip content={t('Notifications')} isDisabled={isOpen}>
        <span className="inline-flex">
          <PopoverTrigger>
            <Button aria-label={t('Notifications')}>
              <Badge
                content={unreadCount > 99 ? '99+' : unreadCount}
                color="danger"
                size="sm"
                shape="circle"
                isInvisible={unreadCount === 0}
                classNames={{
                  badge: 'text-[10px] font-medium',
                }}
              >
                <Icon name="Bell" className="size-4 lg:size-5" />
              </Badge>
            </Button>
          </PopoverTrigger>
        </span>
      </Tooltip>
      <PopoverContent className="p-0">
        <NotificationPanel onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
