/**
 * Spinner v2 compat: accepts v2 props like `color`, `size`, `label`.
 */
import { Spinner as HeroSpinner } from '@heroui/react'
import type { ReactNode } from 'react'

interface SpinnerCompatProps {
  color?: string
  size?: string
  label?: ReactNode
  labelColor?: string
  classNames?: Record<string, string>
  className?: string
  [key: string]: unknown
}

export function Spinner({
  color: _color,
  size,
  label: _label,
  labelColor: _labelColor,
  classNames: _classNames,
  className,
  ...rest
}: SpinnerCompatProps) {
  return (
    <HeroSpinner
      className={className}
      size={size as 'sm' | 'md' | 'lg' | undefined}
      aria-label={rest['aria-label'] as string ?? 'Loading'}
    />
  )
}
