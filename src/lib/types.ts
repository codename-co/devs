import { Icons } from '@/components'

export type IconName = keyof typeof Icons

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
