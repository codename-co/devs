/**
 * Tooltip v2 compat: accepts `content`, `placement`, `delay` props
 * and renders v3 compound pattern.
 */
import { Tooltip as HeroTooltip } from '@heroui/react'
import type { ComponentPropsWithRef, ReactNode } from 'react'

export interface TooltipCompatProps {
  content?: ReactNode
  placement?: string
  delay?: number
  closeDelay?: number
  offset?: number
  showArrow?: boolean
  color?: string
  className?: string
  children: ReactNode
  isDisabled?: boolean
}

export function Tooltip({
  content,
  placement,
  delay,
  closeDelay,
  offset,
  showArrow,
  color: _color,
  className,
  children,
  isDisabled,
  ...rest
}: TooltipCompatProps & Record<string, unknown>) {
  if (isDisabled || !content) {
    return <>{children}</>
  }

  return (
    <HeroTooltip delay={delay} closeDelay={closeDelay} {...rest}>
      <HeroTooltip.Trigger>{children}</HeroTooltip.Trigger>
      <HeroTooltip.Content
        className={className}
        offset={offset}
        showArrow={showArrow}
      >
        {content}
      </HeroTooltip.Content>
    </HeroTooltip>
  )
}
