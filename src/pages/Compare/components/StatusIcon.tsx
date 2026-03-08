import { Icon } from '@/components'

export type ComparisonStatus = 'yes' | 'no' | 'partial'

export const StatusIcon = ({ status }: { status: ComparisonStatus }) => {
  if (status === 'yes')
    return <Icon name="CheckCircle" className="text-success-600" size="md" />
  if (status === 'no')
    return <Icon name="Xmark" className="text-danger-500" size="md" />
  return <Icon name="WarningTriangle" className="text-warning-500" size="md" />
}
