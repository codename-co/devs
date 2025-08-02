import * as Icons from 'iconoir-react'
import { type ComponentProps } from 'react'

type IconName = keyof typeof Icons
type IconProps = ComponentProps<'svg'> & {
  name: IconName
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
}

export function Icon({ name, size = 'md', ...props }: IconProps) {
  const IconComponent = Icons[name] as any

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

  return (
    <IconComponent width={sizeMap[size]} height={sizeMap[size]} {...props} />
  )
}
