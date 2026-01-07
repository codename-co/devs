import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Badge,
} from '@heroui/react'
import { Icon } from './Icon'
import { IconName } from '@/lib/types'

export interface FilterOption<T = string> {
  key: T
  label: string
  count?: number
  icon?: IconName
}

export type ShowCountsMode = 'all' | 'options-only' | 'none'

export interface FilterProps<T = string> {
  label: string
  options: FilterOption<T>[]
  selectedKey: T
  onSelectionChange: (key: T) => void
  showCounts?: ShowCountsMode
  variant?: 'button' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  className?: string
}

/**
 * Generic Filter component using HeroUI Dropdown and Filter icon
 *
 * @example
 * ```tsx
 * const options = [
 *   { key: 'all', label: 'All', count: 10 },
 *   { key: 'active', label: 'Active', count: 5 },
 *   { key: 'completed', label: 'Completed', count: 5 }
 * ]
 *
 * <Filter
 *   label="Status"
 *   options={options}
 *   selectedKey={selectedStatus}
 *   onSelectionChange={setSelectedStatus}
 * />
 * ```
 */
export function Filter<T extends string = string>({
  label,
  options,
  selectedKey,
  onSelectionChange,
  showCounts = 'options-only',
  variant = 'button',
  size = 'sm',
  color = 'default',
  className = '',
}: FilterProps<T>) {
  const selectedOption = options.find((opt) => opt.key === selectedKey)
  const hasActiveFilter = selectedKey !== options[0]?.key

  // Check if any option has an icon - if so, reserve space for all
  const hasAnyIcon = options.some((opt) => opt.icon)

  const handleSelectionChange = (keys: Selection) => {
    const selected = Array.from(keys)[0] as T
    if (selected) {
      onSelectionChange(selected)
    }
  }

  // Helper to determine if count should be shown in button
  const shouldShowCountInButton = showCounts === 'all'

  // Helper to determine if count should be shown in dropdown
  const shouldShowCountInDropdown = () => {
    if (showCounts === 'none') return false
    if (showCounts === 'all') return true
    // options-only mode: only show count in dropdown
    return true
  }

  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <Button isIconOnly size={size} variant="flat" color={color}>
          <Badge
            content=""
            color="primary"
            size="sm"
            isInvisible={!hasActiveFilter}
            placement="top-right"
            shape="circle"
          >
            <Icon name="Filter" className="w-4 h-4" />
          </Badge>
        </Button>
      )
    }

    return (
      <Button
        size={size}
        variant="flat"
        color={hasActiveFilter ? 'primary' : color}
        startContent={<Icon name="Filter" className="w-4 h-4" />}
      >
        {selectedOption?.label || label}
        {shouldShowCountInButton && selectedOption?.count !== undefined && (
          <span className="ml-1 text-xs opacity-70">
            ({selectedOption.count})
          </span>
        )}
      </Button>
    )
  }

  return (
    <Dropdown className={className}>
      <DropdownTrigger>{renderTrigger()}</DropdownTrigger>
      <DropdownMenu
        aria-label={label}
        selectionMode="single"
        selectedKeys={new Set([selectedKey])}
        onSelectionChange={handleSelectionChange as any}
      >
        {options.map((option) => (
          <DropdownItem key={option.key} textValue={option.label}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {hasAnyIcon && (
                  <div className="w-4 h-4 flex items-center justify-center">
                    {option.icon && (
                      <Icon name={option.icon} className="w-4 h-4" />
                    )}
                  </div>
                )}
                {!hasAnyIcon && option.icon && (
                  <Icon name={option.icon} className="w-4 h-4" />
                )}
                <span>{option.label}</span>
              </div>
              {shouldShowCountInDropdown() && option.count !== undefined && (
                <span className="ml-2 text-xs text-default-400">
                  {option.count}
                </span>
              )}
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}

// Type helper for selection
type Selection = Set<string> | 'all'
