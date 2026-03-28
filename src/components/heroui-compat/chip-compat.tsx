/**
 * Chip v2 compat: maps v2 color values to v3.
 * v2 colors: default/primary/secondary/success/warning/danger
 * v3 colors: default/success/warning/danger/accent
 */
import { Chip as HeroChip } from '@heroui/react'
import type { ReactNode } from 'react'

interface ChipCompatProps {
  children?: ReactNode
  color?: string
  variant?: string
  size?: string
  radius?: string
  startContent?: ReactNode
  endContent?: ReactNode
  onClose?: () => void
  className?: string
  classNames?: Record<string, string>
  avatar?: ReactNode
  isDisabled?: boolean
  'data-testid'?: string
  [key: string]: unknown
}

function mapColor(color?: string): 'default' | 'success' | 'warning' | 'danger' | 'accent' | undefined {
  if (!color || color === 'default') return 'default'
  if (color === 'primary') return 'accent'
  if (color === 'secondary') return 'default'
  if (color === 'success') return 'success'
  if (color === 'warning') return 'warning'
  if (color === 'danger') return 'danger'
  return color as 'default' | 'success' | 'warning' | 'danger' | 'accent'
}

function mapVariant(variant?: string): 'primary' | 'secondary' | 'soft' | 'tertiary' | undefined {
  if (!variant || variant === 'solid') return 'primary'
  if (variant === 'flat' || variant === 'light') return 'soft'
  if (variant === 'bordered' || variant === 'faded' || variant === 'dot') return 'secondary'
  return variant as 'primary' | 'secondary' | 'soft' | 'tertiary'
}

export function Chip({
  children,
  color,
  variant,
  size,
  radius: _radius,
  startContent: _startContent,
  endContent: _endContent,
  onClose: _onClose,
  className,
  classNames: _classNames,
  avatar: _avatar,
  isDisabled: _isDisabled,
  ...rest
}: ChipCompatProps) {
  return (
    <HeroChip
      className={className}
      color={mapColor(color)}
      variant={mapVariant(variant)}
      size={size as 'sm' | 'md' | 'lg' | undefined}
      data-testid={rest['data-testid'] as string}
    >
      {children}
    </HeroChip>
  )
}
