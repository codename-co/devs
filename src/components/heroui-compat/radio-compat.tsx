/**
 * Radio/RadioGroup v2 compat: accepts v2 props like `color`, `size`, `description`.
 */
import {
  Radio as HeroRadio,
  RadioGroup as HeroRadioGroup,
  Label,
  Description,
} from '@heroui/react'
import type { ReactNode } from 'react'

interface RadioGroupCompatProps {
  children?: ReactNode
  label?: ReactNode
  description?: ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  color?: string
  size?: string
  isDisabled?: boolean
  isRequired?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  errorMessage?: ReactNode
  classNames?: Record<string, string>
  className?: string
  name?: string
  'aria-label'?: string
  [key: string]: unknown
}

export function RadioGroup({
  children,
  label,
  description,
  value,
  defaultValue,
  onValueChange,
  orientation,
  color: _color,
  size: _size,
  isDisabled,
  isRequired,
  isReadOnly,
  isInvalid,
  errorMessage: _errorMessage,
  classNames: _classNames,
  className,
  name,
  ...rest
}: RadioGroupCompatProps) {
  return (
    <HeroRadioGroup
      className={className}
      value={value}
      defaultValue={defaultValue}
      onChange={onValueChange}
      orientation={orientation}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isReadOnly={isReadOnly}
      isInvalid={isInvalid}
      name={name}
      aria-label={rest['aria-label'] as string ?? (typeof label === 'string' ? label : undefined)}
    >
      {label && <Label>{label}</Label>}
      {children}
      {description && <Description>{description}</Description>}
    </HeroRadioGroup>
  )
}

interface RadioCompatProps {
  children?: ReactNode
  value: string
  description?: ReactNode
  color?: string
  size?: string
  isDisabled?: boolean
  classNames?: Record<string, string>
  className?: string
  [key: string]: unknown
}

export function Radio({
  children,
  value,
  description: _description,
  color: _color,
  size: _size,
  isDisabled,
  classNames: _classNames,
  className,
  ...rest
}: RadioCompatProps) {
  return (
    <HeroRadio
      className={className}
      value={value}
      isDisabled={isDisabled}
      aria-label={rest['aria-label'] as string}
    >
      {children}
    </HeroRadio>
  )
}
