/**
 * TextArea v2 compat: accepts `label`, `description`, `minRows`, `maxRows`,
 * `onValueChange`, `isReadOnly`, `errorMessage` props.
 */
import {
  TextArea as HeroTextArea,
  TextField,
  Label,
  Description,
  FieldError,
} from '@heroui/react'
import type { ReactNode, ChangeEvent } from 'react'

interface TextAreaCompatProps {
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
  className?: string
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
  autoFocus?: boolean
  name?: string
  id?: string
  minRows?: number
  maxRows?: number
  'aria-label'?: string
  'data-testid'?: string
  [key: string]: unknown
}

export function TextArea({
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
  className,
  onChange,
  autoFocus,
  name,
  id,
  minRows: _minRows,
  maxRows: _maxRows,
  ...rest
}: TextAreaCompatProps) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
      data-testid={rest['data-testid'] as string}
    >
      {label && <Label>{label}</Label>}
      <HeroTextArea
        className={className}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        name={name}
        id={id}
        aria-label={rest['aria-label'] as string}
      />
      {description && !isInvalid && <Description>{description}</Description>}
      {isInvalid && errorMessage && <FieldError>{errorMessage}</FieldError>}
    </TextField>
  )
}
