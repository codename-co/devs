import { Icons } from '@/components'

export type IconName = keyof typeof Icons

export interface HeaderProps {
  color?: string
  icon?: {
    name: IconName
    color: string
  }
  title?: string | React.ReactNode
  subtitle?: string | React.ReactNode
  cta?: {
    label: string
    href: string
    icon?: IconName
  }
  moreActions?: {
    label: string
    onClick: () => void | Promise<void>
    icon?: IconName
  }[]
}
