/**
 * Card v2 compat: accepts `shadow`, `isHoverable`, `isPressable`, `onPress`,
 * `classNames`, `radius` props. Preserves v3 compound sub-components.
 */
import { Card as HeroCard } from '@heroui/react'
import type { ReactNode } from 'react'

interface CardCompatProps {
  children?: ReactNode
  shadow?: string
  isHoverable?: boolean
  isPressable?: boolean
  onPress?: () => void
  classNames?: Record<string, string>
  radius?: string
  className?: string
  variant?: string
  'data-testid'?: string
  [key: string]: unknown
}

function CardCompat({
  children,
  shadow: _shadow,
  isHoverable,
  isPressable,
  onPress,
  classNames: _classNames,
  radius: _radius,
  className,
  variant,
  ...rest
}: CardCompatProps) {
  const hoverableClass = isHoverable ? 'hover:shadow-lg transition-shadow' : ''
  const pressableClass = isPressable || onPress ? 'cursor-pointer' : ''
  const combined = [className, hoverableClass, pressableClass].filter(Boolean).join(' ')

  return (
    <HeroCard
      className={combined}
      variant={variant as 'default' | 'surface' | undefined}
      onClick={onPress}
      data-testid={rest['data-testid'] as string}
    >
      {children}
    </HeroCard>
  )
}

CardCompat.Root = HeroCard.Root
CardCompat.Header = HeroCard.Header
CardCompat.Title = HeroCard.Title
CardCompat.Description = HeroCard.Description
CardCompat.Content = HeroCard.Content
CardCompat.Footer = HeroCard.Footer

export const Card = CardCompat as typeof CardCompat & typeof HeroCard
