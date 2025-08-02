import * as IconoirIcons from 'iconoir-react'
import { JSX, type ComponentProps } from 'react'
import * as SimpleIcons from 'simple-icons'

const CustomIcons: Record<string, (props: any) => JSX.Element> = {
  OpenRouter: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
      fill="currentColor"
    >
      <path
        d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945"
        stroke-width="90"
      />
      <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" />
      <path
        d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377"
        stroke-width="90"
      />
      <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" />
    </svg>
  ),
}

export type IconName =
  | keyof typeof SimpleIcons
  | keyof typeof IconoirIcons
  | keyof typeof CustomIcons

export const Icons = {
  ...Object.fromEntries(
    Object.entries(SimpleIcons).map(([name, icon]) => [
      name,
      SimpleIconToComponent(icon),
    ]),
  ),
  ...IconoirIcons,
  ...CustomIcons,
}

const SimpleIconToComponent = (icon: any) => {
  return (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  )
}

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
  const IconComponent = Icons[
    name as keyof typeof Icons
  ] as React.ComponentType<any>

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

  return (
    <IconComponent
      width={sizeMap[size]}
      height={sizeMap[size]}
      className="shrink-0"
      {...props}
    />
  )
}
