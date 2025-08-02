export type IconName = string

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
