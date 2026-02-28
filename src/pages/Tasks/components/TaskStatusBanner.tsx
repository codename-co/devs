import { memo } from 'react'
import { Chip, Progress, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'

export const TaskStatusBanner = memo(
  ({
    status,
    complexity,
    isOrchestrating,
    progress,
  }: {
    status: string
    complexity: string
    isOrchestrating: boolean
    progress?: number
  }) => {
    const { t } = useI18n()

    const statusColor =
      status === 'completed'
        ? 'success'
        : status === 'failed'
          ? 'danger'
          : status === 'in_progress'
            ? 'primary'
            : 'default'

    return (
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip size="sm" color={statusColor} variant="flat">
            {status.replace('_', ' ')}
          </Chip>
          <Chip size="sm" variant="flat" color="secondary">
            {complexity}
          </Chip>
          {isOrchestrating && (
            <div className="flex items-center gap-2 text-primary text-sm">
              <Spinner size="sm" />
              <span>{t('Agents working…')}</span>
            </div>
          )}
        </div>
        {isOrchestrating && progress !== undefined && progress > 0 && (
          <Progress
            size="sm"
            value={progress}
            color="primary"
            className="max-w-md"
            aria-label="Task progress"
          />
        )}
      </div>
    )
  },
)

TaskStatusBanner.displayName = 'TaskStatusBanner'
