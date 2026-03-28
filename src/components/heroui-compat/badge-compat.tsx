/**
 * Badge v2 compat: maps v2 color values to v3.
 */
import { Badge as HeroBadge } from '@heroui/react'
import type { ReactNode } from 'react'

interface BadgeCompatProps {
  children?: ReactNode
  content?: ReactNode
  color?: string
  variant?: string
  size?: string
  shape?: string
  placement?: string
  showOutline?: boolean
  isInvisible?: boolean
  isOneChar?: boolean
  isDot?: boolean
  disableAnimation?: boolean
  classNames?: Record<string, string>
  className?: string
  [key: string]: unknown
}

function mapColor(color?: string): 'default' | 'success' | 'warning' | 'danger' | 'accent' | undefined {
  if (!color || color === 'default') return 'default'
  if (color === 'primary') return 'accent'
  if (color === 'secondary') return 'default'
  if (color === 'success') return 'success'
  if (color === 'warning') return 'warning'
  if (color === 'danger') return 'danger'
  return undefined
}

export function Badge({
  children,
  content: _content,
  color,
  variant: _variant,
  size: _size,
  shape: _shape,
  placement: _placement,
  showOutline: _showOutline,
  isInvisible: _isInvisible,
  isOneChar: _isOneChar,
  isDot: _isDot,
  disableAnimation: _disableAnimation,
  classNames: _classNames,
  className,
  ...rest
}: BadgeCompatProps) {
  return (
    <HeroBadge
      className={className}
      color={mapColor(color)}
      data-testid={rest['data-testid'] as string}
    >
      {children}
    </HeroBadge>
  )
}
