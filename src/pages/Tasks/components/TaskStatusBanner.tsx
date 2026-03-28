import { memo } from 'react'
import { Chip, ProgressBar, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'

export const TaskStatusBanner = memo(
  ({
    status,
    complexity,
    isOrchestrating,
    progress,
    phaseMessage,
  }: {
    status: string
    complexity: string
    isOrchestrating: boolean
    progress?: number
    phaseMessage?: string
  }) => {
    const { t } = useI18n()

    const statusColor =
      status === 'completed'
        ? 'success'
        : status === 'failed'
          ? 'danger'
          : status === 'in_progress' || status === 'claimed'
            ? 'primary'
            : 'default'

    return (
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip size="sm" color={statusColor} variant="soft">
            {status.replace('_', ' ')}
          </Chip>
          <Chip size="sm" variant="soft" color="default">
            {complexity}
          </Chip>
          {isOrchestrating && (
            <div className="flex items-center gap-2 text-primary text-sm">
              <Spinner size="sm" />
              <span>{phaseMessage || t('Agents working…')}</span>
            </div>
          )}
        </div>
        {isOrchestrating && progress !== undefined && progress > 0 && (
          <ProgressBar
            size="sm"
            value={progress}
            color="primary"
            className="max-w-md"
            label={phaseMessage}
            showValueLabel
            aria-label="Task progress"
          />
        )}
      </div>
    )
  },
)

TaskStatusBanner.displayName = 'TaskStatusBanner'
