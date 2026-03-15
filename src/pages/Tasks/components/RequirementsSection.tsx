import { memo } from 'react'

import { useI18n } from '@/i18n'
import { Icon, Title } from '@/components'
import type { Requirement } from '@/types'
import { SubTaskStatusIcon } from './SubTaskStatusIcon'

/** Map requirement status to a task-like status for the icon */
const requirementStatusToTaskStatus = (req: Requirement): string => {
  if (req.status === 'satisfied' || req.satisfiedAt) return 'completed'
  if (req.status === 'failed') return 'failed'
  if (req.status === 'in_progress') return 'in_progress'
  return 'pending'
}

export const RequirementsSection = memo(
  ({ requirements }: { requirements: Requirement[] }) => {
    const { t } = useI18n()

    if (!requirements.length) return null

    return (
      <div>
        <div className="flex items-center gap-2">
          <Icon name="CheckCircle" size="sm" />
          <Title level={4}>{t('Requirements')}</Title>
        </div>
        <div className="space-y-1">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-center gap-2 py-1.5">
              <SubTaskStatusIcon status={requirementStatusToTaskStatus(req)} />
              <span className="text-sm text-default-700">
                {req.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  },
)

RequirementsSection.displayName = 'RequirementsSection'
