/**
 * Pagination v2 compat: accepts v2 props.
 */
import { Pagination as HeroPagination } from '@heroui/react'
import type { ReactNode } from 'react'

interface PaginationCompatProps {
  total?: number
  page?: number
  initialPage?: number
  onChange?: (page: number) => void
  color?: string
  variant?: string
  size?: string
  radius?: string
  showControls?: boolean
  isCompact?: boolean
  isDisabled?: boolean
  loop?: boolean
  siblings?: number
  boundaries?: number
  classNames?: Record<string, string>
  className?: string
  [key: string]: unknown
}

export function Pagination({
  total: _total,
  page: _page,
  initialPage: _initialPage,
  onChange: _onChange,
  color: _color,
  variant: _variant,
  size: _size,
  radius: _radius,
  showControls: _showControls,
  isCompact: _isCompact,
  isDisabled: _isDisabled,
  loop: _loop,
  siblings: _siblings,
  boundaries: _boundaries,
  classNames: _classNames,
  className,
  ...rest
}: PaginationCompatProps) {
  // v3 Pagination is completely different (uses compound components)
  // For now, render a basic pagination
  return (
    <HeroPagination className={className} data-testid={rest['data-testid'] as string}>
      <HeroPagination.Previous />
      <HeroPagination.Content />
      <HeroPagination.Next />
    </HeroPagination>
  )
}
