/**
 * Checkbox v2 compat: accepts v2 props like `color`, `radius`, `classNames`,
 * `isSelected`, `onValueChange`.
 */
import { Checkbox as HeroCheckbox } from '@heroui/react'
import type { ReactNode, ChangeEvent } from 'react'

interface CheckboxCompatProps {
  children?: ReactNode
  isSelected?: boolean
  defaultSelected?: boolean
  onValueChange?: (isSelected: boolean) => void
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  isIndeterminate?: boolean
  color?: string
  size?: string
  radius?: string
  lineThrough?: boolean
  classNames?: Record<string, string>
  className?: string
  value?: string
  name?: string
  'aria-label'?: string
  [key: string]: unknown
}

export function Checkbox({
  children,
  isSelected,
  defaultSelected,
  onValueChange,
  onChange,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  isIndeterminate,
  color: _color,
  size: _size,
  radius: _radius,
  lineThrough: _lineThrough,
  classNames: _classNames,
  className,
  value,
  name,
  ...rest
}: CheckboxCompatProps) {
  return (
    <HeroCheckbox
      className={className}
      isSelected={isSelected}
      defaultSelected={defaultSelected}
      onChange={onValueChange ? (v: boolean) => onValueChange(v) : undefined}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      isInvalid={isInvalid}
      isIndeterminate={isIndeterminate}
      value={value}
      name={name}
      aria-label={rest['aria-label'] as string}
    >
      {children}
    </HeroCheckbox>
  )
}
