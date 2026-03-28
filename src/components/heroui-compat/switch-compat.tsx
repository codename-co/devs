/**
 * Switch v2 compat: accepts v2 props like `color`, `size`, `classNames`,
 * `startContent`, `endContent`, `thumbIcon`.
 */
import { Switch as HeroSwitch } from '@heroui/react'
import type { ReactNode, ChangeEvent } from 'react'

interface SwitchCompatProps {
  children?: ReactNode
  isSelected?: boolean
  defaultSelected?: boolean
  onValueChange?: (isSelected: boolean) => void
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  isDisabled?: boolean
  isReadOnly?: boolean
  color?: string
  size?: string
  startContent?: ReactNode
  endContent?: ReactNode
  thumbIcon?: ReactNode
  classNames?: Record<string, string>
  className?: string
  value?: string
  name?: string
  'aria-label'?: string
  [key: string]: unknown
}

export function Switch({
  children,
  isSelected,
  defaultSelected,
  onValueChange,
  onChange,
  isDisabled,
  isReadOnly: _isReadOnly,
  color: _color,
  size: _size,
  startContent: _startContent,
  endContent: _endContent,
  thumbIcon: _thumbIcon,
  classNames: _classNames,
  className,
  value,
  name,
  ...rest
}: SwitchCompatProps) {
  return (
    <HeroSwitch
      className={className}
      isSelected={isSelected}
      defaultSelected={defaultSelected}
      onChange={onValueChange ? (v: boolean) => onValueChange(v) : undefined}
      isDisabled={isDisabled}
      value={value}
      name={name}
      aria-label={rest['aria-label'] as string}
    >
      {children}
    </HeroSwitch>
  )
}
