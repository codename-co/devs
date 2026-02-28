import { memo } from 'react'
import { Spinner } from '@heroui/react'

import { Icon } from '@/components'

export const SubTaskStatusIcon = memo(({ status }: { status: string }) => {
  switch (status) {
    case 'in_progress':
      return <Spinner size="sm" classNames={{ wrapper: 'w-4 h-4' }} />
    case 'completed':
      return (
        <Icon name="CheckCircleSolid" size="sm" className="text-default-400" />
      )
    case 'failed':
      return (
        <Icon name="XmarkCircleSolid" size="sm" className="text-danger-400" />
      )
    default:
      return <Icon name="Clock" size="sm" className="text-default-400" />
  }
})

SubTaskStatusIcon.displayName = 'SubTaskStatusIcon'
