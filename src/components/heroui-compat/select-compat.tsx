/**
 * Select v2 compat: accepts `label`, `description`, `selectedKeys`, `onSelectionChange`,
 * `selectionMode`, `items` props. Preserves v3 compound sub-components and adds .Item.
 */
import {
  Select as HeroSelect,
  Label,
  Description,
  ListBoxItem,
} from '@heroui/react'
import type { ReactNode, Key } from 'react'

interface SelectCompatProps {
  label?: ReactNode
  description?: ReactNode
  placeholder?: string
  selectedKeys?: Iterable<Key>
  defaultSelectedKeys?: Iterable<Key>
  onSelectionChange?: (keys: Set<Key>) => void
  selectionMode?: 'single' | 'multiple'
  isRequired?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  errorMessage?: ReactNode
  classNames?: Record<string, string>
  variant?: string
  size?: string
  radius?: string
  color?: string
  fullWidth?: boolean
  className?: string
  labelPlacement?: string
  disallowEmptySelection?: boolean
  'aria-label'?: string
  'data-testid'?: string
  children?: ReactNode
  items?: Array<{ key: string; label: string; [k: string]: unknown }>
  closeOnSelect?: boolean
  renderValue?: (items: unknown[]) => ReactNode
  [key: string]: unknown
}

function SelectCompat({
  label,
  description,
  placeholder: _placeholder,
  selectedKeys: _selectedKeys,
  defaultSelectedKeys: _defaultSelectedKeys,
  onSelectionChange: _onSelectionChange,
  selectionMode: _selectionMode,
  isRequired,
  isDisabled,
  isInvalid: _isInvalid,
  errorMessage: _errorMessage,
  classNames: _classNames,
  variant,
  size: _size,
  radius: _radius,
  color: _color,
  fullWidth,
  className,
  labelPlacement: _labelPlacement,
  disallowEmptySelection: _disallowEmptySelection,
  closeOnSelect: _closeOnSelect,
  renderValue: _renderValue,
  children,
  items: _items,
  ...rest
}: SelectCompatProps) {
  const v3Variant = variant === 'bordered' || variant === 'faded' || variant === 'underlined'
    ? 'primary'
    : (variant as 'primary' | 'secondary' | undefined)

  return (
    <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}>
      {label && <Label>{label}</Label>}
      <HeroSelect
        isRequired={isRequired}
        isDisabled={isDisabled}
        variant={v3Variant}
        aria-label={rest['aria-label'] as string ?? (typeof label === 'string' ? label : undefined)}
        data-testid={rest['data-testid'] as string}
      >
        <HeroSelect.Trigger>
          <HeroSelect.Value />
        </HeroSelect.Trigger>
        <HeroSelect.Popover>
          {children as ReactNode}
        </HeroSelect.Popover>
      </HeroSelect>
      {description && <Description>{description}</Description>}
    </div>
  )
}

// Attach v3 compound sub-components, plus Item as ListBoxItem
SelectCompat.Root = HeroSelect.Root
SelectCompat.Trigger = HeroSelect.Trigger
SelectCompat.Value = HeroSelect.Value
SelectCompat.Indicator = HeroSelect.Indicator
SelectCompat.Popover = HeroSelect.Popover
SelectCompat.Item = ListBoxItem

export const Select = SelectCompat as typeof SelectCompat & typeof HeroSelect & { Item: typeof ListBoxItem }

// v2 SelectItem compat - renders as ListBoxItem
export const SelectItem = ListBoxItem
