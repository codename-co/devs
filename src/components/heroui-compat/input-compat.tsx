/**
 * Input v2 compat: accepts `label`, `description`, `startContent`, `endContent`,
 * `onValueChange`, `isReadOnly`, `errorMessage`, `isInvalid` props.
 * Renders v3 TextField > Label + Input + Description pattern.
 */
import {
  Input as HeroInput,
  TextField,
  Label,
  Description,
  FieldError,
} from '@heroui/react'
import type { ReactNode, ChangeEvent, ComponentPropsWithRef } from 'react'

interface InputCompatProps {
  label?: ReactNode
  description?: ReactNode
  errorMessage?: ReactNode
  isInvalid?: boolean
  startContent?: ReactNode
  endContent?: ReactNode
  onValueChange?: (value: string) => void
  isReadOnly?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  isClearable?: boolean
  classNames?: Record<string, string>
  labelPlacement?: string
  variant?: string
  size?: string
  radius?: string
  color?: string
  fullWidth?: boolean
  placeholder?: string
  value?: string
  defaultValue?: string
  type?: string
  className?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  autoFocus?: boolean
  name?: string
  id?: string
  min?: string | number
  max?: string | number
  step?: string | number
  autoComplete?: string
  'aria-label'?: string
  'data-testid'?: string
  [key: string]: unknown
}

export function Input({
  label,
  description,
  errorMessage,
  isInvalid,
  startContent: _startContent,
  endContent: _endContent,
  onValueChange,
  isReadOnly,
  isRequired,
  isDisabled,
  isClearable: _isClearable,
  classNames: _classNames,
  labelPlacement: _labelPlacement,
  variant,
  size: _size,
  radius: _radius,
  color: _color,
  fullWidth,
  placeholder,
  value,
  defaultValue,
  type,
  className,
  onChange,
  onClear: _onClear,
  autoFocus,
  name,
  id,
  min,
  max,
  step,
  autoComplete,
  'data-testid': dataTestId,
  ...rest
}: InputCompatProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    onValueChange?.(e.target.value)
  }

  const v3Variant = variant === 'bordered' || variant === 'faded' || variant === 'underlined'
    ? 'primary'
    : (variant as 'primary' | 'secondary' | undefined)

  return (
    <TextField
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      fullWidth={fullWidth}
      variant={v3Variant}
      className="flex flex-col gap-1"
      data-testid={dataTestId}
    >
      {label && <Label>{label}</Label>}
      <HeroInput
        className={className}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        type={type}
        onChange={handleChange}
        autoFocus={autoFocus}
        name={name}
        id={id}
        min={min as string}
        max={max as string}
        step={step as string}
        autoComplete={autoComplete}
        aria-label={rest['aria-label'] as string}
      />
      {description && !isInvalid && <Description>{description}</Description>}
      {isInvalid && errorMessage && <FieldError>{errorMessage}</FieldError>}
    </TextField>
  )
}
