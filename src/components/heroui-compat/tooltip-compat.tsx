/**
 * Tooltip v2 compat: accepts `content`, `placement`, `delay` props.
 */
import { Tooltip as HeroTooltip } from '@heroui/react'
import type { ReactNode } from 'react'

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
  [key: string]: any
}

export function Tooltip(props: TooltipCompatProps) {
  const { content, placement: _p, delay, closeDelay,
    offset, showArrow, color: _c, className, children,
    isDisabled, ...rest } = props

  if (isDisabled || !content) {
    return <>{children}</>
  }

  return (
    <HeroTooltip delay={delay} closeDelay={closeDelay} {...rest}>
      <HeroTooltip.Trigger>{children}</HeroTooltip.Trigger>
      <HeroTooltip.Content className={className} offset={offset} showArrow={showArrow}>
        {content}
      </HeroTooltip.Content>
    </HeroTooltip>
  )
}
