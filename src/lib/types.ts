import { IconName as _IconName } from '@/components'

export type IconName = _IconName

export interface HeaderProps {
  color?: string
  icon?: {
    name: IconName
    color: string
  }
  title?: string
  subtitle?: string
  cta?: {
    label: string
    href: string
    icon?: IconName
  }
}
