/**
 * ProgressBar v2 compat: accepts v2 props like `color`, `size`, `label`, `showValueLabel`.
 */
import { ProgressBar as HeroProgressBar } from '@heroui/react'
import type { ReactNode } from 'react'

interface ProgressBarCompatProps {
  value?: number
  minValue?: number
  maxValue?: number
  label?: ReactNode
  showValueLabel?: boolean
  color?: string
  size?: string
  radius?: string
  isIndeterminate?: boolean
  isStriped?: boolean
  classNames?: Record<string, string>
  className?: string
  formatOptions?: Intl.NumberFormatOptions
  valueLabel?: ReactNode
  'aria-label'?: string
  [key: string]: unknown
}

export function ProgressBar({
  value,
  minValue,
  maxValue,
  label: _label,
  showValueLabel: _showValueLabel,
  color: _color,
  size: _size,
  radius: _radius,
  isIndeterminate,
  isStriped: _isStriped,
  classNames: _classNames,
  className,
  formatOptions: _formatOptions,
  valueLabel: _valueLabel,
  ...rest
}: ProgressBarCompatProps) {
  return (
    <HeroProgressBar
      className={className}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      isIndeterminate={isIndeterminate}
      aria-label={rest['aria-label'] as string ?? 'Progress'}
    >
      <HeroProgressBar.Track>
        <HeroProgressBar.Fill />
      </HeroProgressBar.Track>
    </HeroProgressBar>
  )
}
