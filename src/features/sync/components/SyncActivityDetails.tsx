/**
 * Sync Activity Details Component
 *
 * Visual representation of sync data activity.
 */
import { Card, CardBody, Progress } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import type { SyncActivity } from '../lib/sync-manager'

interface SyncActivityDetailsProps {
  recentActivity: SyncActivity[]
  status: 'disabled' | 'connecting' | 'connected'
}

export function SyncActivityDetails({
  recentActivity,
  status,
}: SyncActivityDetailsProps) {
  const { t } = useI18n()
  const [animatedActivity, setAnimatedActivity] = useState<SyncActivity[]>([])

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} ${t('bytes')}`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('KB')}`
    return `${(bytes / (1024 * 1024)).toFixed(2)} ${t('MB')}`
  }

  // Animate new activity entries
  useEffect(() => {
    setAnimatedActivity(recentActivity.slice(0, 8))
  }, [recentActivity])

  // Calculate stats
  const stats = useMemo(() => {
    const sent = recentActivity
      .filter((a) => a.type === 'sent')
      .reduce((sum, a) => sum + a.bytes, 0)
    const received = recentActivity
      .filter((a) => a.type === 'received')
      .reduce((sum, a) => sum + a.bytes, 0)
    return { sent, received, total: sent + received }
  }, [recentActivity])

  const maxBytes = useMemo(
    () => Math.max(...recentActivity.map((a) => a.bytes), 100),
    [recentActivity],
  )

  // Render activity bar
  const renderActivityBar = (activity: SyncActivity, index: number) => {
    const percentage = Math.max(5, (activity.bytes / maxBytes) * 100)
    const isSent = activity.type === 'sent'

    return (
      <div
        key={`${activity.timestamp.getTime()}-${index}`}
        className="flex items-center gap-2 h-5"
      >
        <Icon
          name={isSent ? 'Upload' : 'Download'}
          size="sm"
          className={isSent ? 'text-primary-500' : 'text-success-500'}
        />
        <div className="flex-1 h-2 bg-default-100 dark:bg-default-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isSent
                ? 'bg-gradient-to-r from-primary-400 to-primary-500'
                : 'bg-gradient-to-r from-success-400 to-success-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] text-default-500 w-16 text-right tabular-nums">
          {formatBytes(activity.bytes)}
        </span>
      </div>
    )
  }

  if (status === 'disabled') {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Activity Feed */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-default-600">
              {t('Data Activity')}
            </span>
            {stats.total > 0 && (
              <span className="text-[10px] text-default-400">
                {t('Total synced')}: {formatBytes(stats.total)}
              </span>
            )}
          </div>

          {/* Activity Progress Bars */}
          <div className="space-y-1.5">
            {animatedActivity.length > 0 ? (
              animatedActivity.map((activity, index) =>
                renderActivityBar(activity, index),
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-default-400">
                <Icon name="CloudSync" size="lg" className="opacity-30 mb-2" />
                <span className="text-xs">{t('No activity')}</span>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {stats.total > 0 && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-default-200 dark:border-default-700">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon name="Upload" size="sm" className="text-primary-500" />
                  <span className="text-[10px] text-default-500">
                    {t('Sent')}
                  </span>
                </div>
                <Progress
                  size="sm"
                  value={(stats.sent / stats.total) * 100}
                  color="primary"
                  className="h-1"
                />
                <span className="text-[10px] text-default-600 mt-0.5 block">
                  {formatBytes(stats.sent)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon
                    name="Download"
                    size="sm"
                    className="text-success-500"
                  />
                  <span className="text-[10px] text-default-500">
                    {t('Received')}
                  </span>
                </div>
                <Progress
                  size="sm"
                  value={(stats.received / stats.total) * 100}
                  color="success"
                  className="h-1"
                />
                <span className="text-[10px] text-default-600 mt-0.5 block">
                  {formatBytes(stats.received)}
                </span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
