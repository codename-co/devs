import { useState, useEffect, useCallback } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Tooltip,
  Progress,
  Card,
  CardBody,
} from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { twMerge } from 'tailwind-merge'
import {
  Check,
  RefreshDouble,
  CloudXmark,
  WarningTriangle,
  Cloud,
  Group,
} from 'iconoir-react'
import { useI18n } from '@/i18n'
import type { SyncStatus, SyncState } from '@/types/collaboration'

const localI18n = {
  en: [
    'Synced',
    'Syncing...',
    'Offline',
    'Sync Error',
    'All changes synced',
    'Syncing {count} changes...',
    "You're offline. Changes saved locally.",
    'Sync failed',
    'Retry',
    'Force Sync',
    'Last synced',
    'Pending changes',
    'Connected peers',
    'just now',
    '{count} seconds ago',
    '{count} minute ago',
    '{count} minutes ago',
    '{count} hour ago',
    '{count} hours ago',
    '{count} day ago',
    '{count} days ago',
    '{count} pending',
    'Sync Status',
  ] as const,
  fr: {
    Synced: 'Synchronisé',
    'Syncing...': 'Synchronisation...',
    Offline: 'Hors ligne',
    'Sync Error': 'Erreur de sync',
    'All changes synced': 'Tous les changements synchronisés',
    'Syncing {count} changes...': 'Synchronisation de {count} changements...',
    "You're offline. Changes saved locally.":
      'Vous êtes hors ligne. Changements sauvegardés localement.',
    'Sync failed': 'Échec de la synchronisation',
    Retry: 'Réessayer',
    'Force Sync': 'Forcer la sync',
    'Last synced': 'Dernière sync',
    'Pending changes': 'Changements en attente',
    'Connected peers': 'Pairs connectés',
    'just now': "à l'instant",
    '{count} seconds ago': 'il y a {count} secondes',
    '{count} minute ago': 'il y a {count} minute',
    '{count} minutes ago': 'il y a {count} minutes',
    '{count} hour ago': 'il y a {count} heure',
    '{count} hours ago': 'il y a {count} heures',
    '{count} day ago': 'il y a {count} jour',
    '{count} days ago': 'il y a {count} jours',
    '{count} pending': '{count} en attente',
    'Sync Status': 'État de synchronisation',
  },
}

export interface SyncStatusIndicatorProps {
  status: SyncStatus
  variant?: 'minimal' | 'compact' | 'detailed'
  showPeerCount?: boolean
  onRetry?: () => void
  onForceSync?: () => void
  className?: string
}

const stateConfig: Record<
  SyncState,
  {
    color: string
    bgColor: string
    textColor: string
    iconColor: string
  }
> = {
  synced: {
    color: '#22c55e',
    bgColor: 'bg-success-50 dark:bg-success-900/20',
    textColor: 'text-success-600 dark:text-success-400',
    iconColor: 'text-success',
  },
  syncing: {
    color: '#3b82f6',
    bgColor: 'bg-primary-50 dark:bg-primary-900/20',
    textColor: 'text-primary-600 dark:text-primary-400',
    iconColor: 'text-primary',
  },
  offline: {
    color: '#6b7280',
    bgColor: 'bg-default-100 dark:bg-default-800/20',
    textColor: 'text-default-500',
    iconColor: 'text-default-400',
  },
  error: {
    color: '#ef4444',
    bgColor: 'bg-danger-50 dark:bg-danger-900/20',
    textColor: 'text-danger-600 dark:text-danger-400',
    iconColor: 'text-danger',
  },
}

function getStateIcon(state: SyncState, className?: string) {
  const iconProps = { className: twMerge('w-4 h-4', className) }

  switch (state) {
    case 'synced':
      return <Check {...iconProps} />
    case 'syncing':
      return <RefreshDouble {...iconProps} />
    case 'offline':
      return <CloudXmark {...iconProps} />
    case 'error':
      return <WarningTriangle {...iconProps} />
    default:
      return <Cloud {...iconProps} />
  }
}

function useRelativeTime(
  date: Date | undefined,
  t: ReturnType<typeof useI18n<typeof localI18n>>['t'],
) {
  const [relativeTime, setRelativeTime] = useState('')

  const formatRelativeTime = useCallback(() => {
    if (!date) return ''

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 10) {
      return t('just now')
    } else if (diffSeconds < 60) {
      return t('{count} seconds ago', { count: diffSeconds })
    } else if (diffMinutes === 1) {
      return t('{count} minute ago', { count: 1 })
    } else if (diffMinutes < 60) {
      return t('{count} minutes ago', { count: diffMinutes })
    } else if (diffHours === 1) {
      return t('{count} hour ago', { count: 1 })
    } else if (diffHours < 24) {
      return t('{count} hours ago', { count: diffHours })
    } else if (diffDays === 1) {
      return t('{count} day ago', { count: 1 })
    } else {
      return t('{count} days ago', { count: diffDays })
    }
  }, [date, t])

  useEffect(() => {
    setRelativeTime(formatRelativeTime())

    // Update every minute
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime())
    }, 60000)

    return () => clearInterval(interval)
  }, [formatRelativeTime])

  return relativeTime
}

function MinimalIndicator({
  status,
  className,
}: {
  status: SyncStatus
  className?: string
}) {
  const { t } = useI18n(localI18n)
  const config = stateConfig[status.state]

  const getTooltipContent = () => {
    switch (status.state) {
      case 'synced':
        return t('All changes synced')
      case 'syncing':
        return t('Syncing {count} changes...', { count: status.pendingChanges })
      case 'offline':
        return t("You're offline. Changes saved locally.")
      case 'error':
        return status.lastError || t('Sync failed')
    }
  }

  return (
    <Tooltip content={getTooltipContent()} placement="top" size="sm">
      <motion.span
        className={twMerge(
          'relative inline-block w-2.5 h-2.5 rounded-full cursor-default',
          className,
        )}
        style={{ backgroundColor: config.color }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        role="status"
        aria-label={getTooltipContent()}
      >
        {status.state === 'syncing' && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.span>
    </Tooltip>
  )
}

function DetailedContent({
  status,
  showPeerCount = true,
  onRetry,
  onForceSync,
}: {
  status: SyncStatus
  showPeerCount?: boolean
  onRetry?: () => void
  onForceSync?: () => void
}) {
  const { t } = useI18n(localI18n)
  const config = stateConfig[status.state]
  const relativeTime = useRelativeTime(status.lastSyncTime, t)

  const getStatusMessage = () => {
    switch (status.state) {
      case 'synced':
        return t('All changes synced')
      case 'syncing':
        return t('Syncing {count} changes...', { count: status.pendingChanges })
      case 'offline':
        return t("You're offline. Changes saved locally.")
      case 'error':
        return status.lastError || t('Sync failed')
    }
  }

  return (
    <div className="p-4 space-y-4 min-w-[280px]">
      {/* Header with icon and state */}
      <div className="flex items-center gap-3">
        <motion.div
          className={twMerge(
            'flex items-center justify-center w-10 h-10 rounded-full',
            config.bgColor,
          )}
          animate={status.state === 'syncing' ? { rotate: 360 } : {}}
          transition={
            status.state === 'syncing'
              ? { duration: 1.5, repeat: Infinity, ease: 'linear' }
              : {}
          }
        >
          {getStateIcon(status.state, twMerge('w-5 h-5', config.iconColor))}
        </motion.div>
        <div>
          <p className={twMerge('font-medium', config.textColor)}>
            {getStatusMessage()}
          </p>
          {status.lastSyncTime && status.state !== 'syncing' && (
            <p className="text-xs text-default-400">
              {t('Last synced')}: {relativeTime}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar for syncing state */}
      <AnimatePresence>
        {status.state === 'syncing' && status.pendingChanges > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Progress
              size="sm"
              isIndeterminate
              color="primary"
              className="w-full"
              aria-label={t('Syncing...')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        {/* Pending changes */}
        {status.pendingChanges > 0 && status.state !== 'syncing' && (
          <div className="flex items-center gap-1.5 text-default-500">
            <Cloud className="w-4 h-4" />
            <span>
              {t('Pending changes')}: {status.pendingChanges}
            </span>
          </div>
        )}

        {/* Connected peers */}
        {showPeerCount && status.connectedPeers !== undefined && (
          <div className="flex items-center gap-1.5 text-default-500">
            <Group className="w-4 h-4" />
            <span>
              {t('Connected peers')}: {status.connectedPeers}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        {status.state === 'error' && onRetry && (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={onRetry}
            startContent={<RefreshDouble className="w-4 h-4" />}
          >
            {t('Retry')}
          </Button>
        )}
        {onForceSync && status.state !== 'syncing' && (
          <Button
            size="sm"
            variant="flat"
            onPress={onForceSync}
            startContent={<RefreshDouble className="w-4 h-4" />}
          >
            {t('Force Sync')}
          </Button>
        )}
      </div>
    </div>
  )
}

function CompactIndicator({
  status,
  showPeerCount = true,
  onRetry,
  onForceSync,
  className,
}: {
  status: SyncStatus
  showPeerCount?: boolean
  onRetry?: () => void
  onForceSync?: () => void
  className?: string
}) {
  const { t } = useI18n(localI18n)
  const [isOpen, setIsOpen] = useState(false)
  const config = stateConfig[status.state]

  const getStateLabel = () => {
    switch (status.state) {
      case 'synced':
        return t('Synced')
      case 'syncing':
        return t('Syncing...')
      case 'offline':
        return t('Offline')
      case 'error':
        return t('Sync Error')
    }
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom"
      showArrow
    >
      <PopoverTrigger>
        <button
          className={twMerge(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm',
            'hover:bg-default-100 transition-colors cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            className,
          )}
          aria-label={t('Sync Status')}
          aria-expanded={isOpen}
        >
          {/* Icon with animation */}
          <motion.span
            className={twMerge('inline-flex', config.iconColor)}
            animate={status.state === 'syncing' ? { rotate: 360 } : {}}
            transition={
              status.state === 'syncing'
                ? { duration: 1.5, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            {getStateIcon(status.state)}
          </motion.span>

          {/* Label */}
          <span className={config.textColor}>{getStateLabel()}</span>

          {/* Pending badge */}
          <AnimatePresence>
            {status.pendingChanges > 0 && status.state !== 'synced' && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={twMerge(
                  'inline-flex items-center px-1.5 py-0.5 text-xs rounded-full',
                  'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
                )}
              >
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {t('{count} pending', { count: status.pendingChanges })}
                </motion.span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <DetailedContent
          status={status}
          showPeerCount={showPeerCount}
          onRetry={onRetry}
          onForceSync={onForceSync}
        />
      </PopoverContent>
    </Popover>
  )
}

function DetailedIndicator({
  status,
  showPeerCount = true,
  onRetry,
  onForceSync,
  className,
}: {
  status: SyncStatus
  showPeerCount?: boolean
  onRetry?: () => void
  onForceSync?: () => void
  className?: string
}) {
  return (
    <Card
      className={twMerge('border border-default-200', className)}
      shadow="sm"
    >
      <CardBody className="p-0">
        <DetailedContent
          status={status}
          showPeerCount={showPeerCount}
          onRetry={onRetry}
          onForceSync={onForceSync}
        />
      </CardBody>
    </Card>
  )
}

/**
 * SyncStatusIndicator - Shows sync state with detailed information
 *
 * Displays the current synchronization status with support for
 * minimal (dot), compact (icon + text), or detailed (full card) variants.
 *
 * @example
 * ```tsx
 * <SyncStatusIndicator
 *   status={{ state: 'syncing', pendingChanges: 3, connectedPeers: 2 }}
 *   variant="compact"
 *   onRetry={() => handleRetry()}
 *   onForceSync={() => handleForceSync()}
 * />
 * ```
 */
export function SyncStatusIndicator({
  status,
  variant = 'compact',
  showPeerCount = true,
  onRetry,
  onForceSync,
  className,
}: SyncStatusIndicatorProps) {
  const { t } = useI18n(localI18n)

  // Announce status changes to screen readers
  useEffect(() => {
    const getAnnouncement = () => {
      switch (status.state) {
        case 'synced':
          return t('All changes synced')
        case 'syncing':
          return t('Syncing {count} changes...', {
            count: status.pendingChanges,
          })
        case 'offline':
          return t("You're offline. Changes saved locally.")
        case 'error':
          return status.lastError || t('Sync failed')
      }
    }

    // Create a live region announcement
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = getAnnouncement()
    document.body.appendChild(announcement)

    // Remove after announcement
    const timeout = setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)

    return () => {
      clearTimeout(timeout)
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement)
      }
    }
  }, [status.state, status.pendingChanges, status.lastError, t])

  switch (variant) {
    case 'minimal':
      return <MinimalIndicator status={status} className={className} />
    case 'detailed':
      return (
        <DetailedIndicator
          status={status}
          showPeerCount={showPeerCount}
          onRetry={onRetry}
          onForceSync={onForceSync}
          className={className}
        />
      )
    case 'compact':
    default:
      return (
        <CompactIndicator
          status={status}
          showPeerCount={showPeerCount}
          onRetry={onRetry}
          onForceSync={onForceSync}
          className={className}
        />
      )
  }
}

export default SyncStatusIndicator
