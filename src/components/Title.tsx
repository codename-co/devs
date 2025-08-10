import { cn } from '@/lib/utils'
import { JSX } from 'react/jsx-runtime'

export interface TitleProps {
  children: React.ReactNode
  subtitle?: string | React.ReactNode
  id?: string
  subtitleId?: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
  size?:
    | 'xs'
    | 'sm'
    | 'base'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
  className?: string
  style?: React.CSSProperties
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span'
}

const defaultSizeForLevel = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'base',
  6: 'sm',
} as const

const mobileSizeForLevel = {
  1: 'xl',
  2: 'lg',
  3: 'base',
  4: 'sm',
  5: 'xs',
  6: 'xs',
} as const

const sizeClasses = {
  xs: 'sm:text-xs',
  sm: 'sm:text-sm',
  base: 'sm:text-base',
  lg: 'sm:text-lg',
  xl: 'sm:text-xl',
  '2xl': 'sm:text-2xl',
  '3xl': 'sm:text-3xl',
  '4xl': 'sm:text-4xl',
  '5xl': 'sm:text-5xl',
  '6xl': 'sm:text-6xl',
} as const

const mobileClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
} as const

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
} as const

export const Title = ({
  children,
  subtitle,
  id,
  subtitleId,
  level = 1,
  size,
  weight = 'bold',
  className,
  style,
  as,
}: TitleProps) => {
  // Determine the HTML element to use
  const Component = (as ||
    (`h${level}` as keyof JSX.IntrinsicElements)) as React.ElementType

  // Determine the size - use explicit size prop or default based on level
  const sizeClass = sizeClasses[size || defaultSizeForLevel[level]]
  const mobileClass = mobileClasses[mobileSizeForLevel[level]]

  // Build the className
  const titleClassName = cn(
    mobileClass,
    sizeClass,
    weightClasses[weight],
    'text-foreground',
    subtitle && 'mb-2',
    className,
  )

  if (subtitle) {
    return (
      <div>
        <Component id={id} className={titleClassName} {...{ style }}>
          {children}
        </Component>
        <p id={subtitleId} className="text-muted-foreground">
          {subtitle}
        </p>
      </div>
    )
  }

  return (
    <Component id={id} className={titleClassName} {...{ style }}>
      {children}
    </Component>
  )
}
