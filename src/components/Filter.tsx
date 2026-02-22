import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Badge,
  Chip,
} from '@heroui/react'
import { Icon } from './Icon'
import { IconName } from '@/lib/types'

export interface FilterOption<T = string> {
  key: T
  label: string
  count?: number
  icon?: IconName
  hidden?: boolean
}

export interface FilterSection<T = string> {
  key: string
  title: string
  options: FilterOption<T>[]
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

export interface MultiFilterSelection {
  [sectionKey: string]: string
}

export interface MultiFilterProps {
  label: string
  sections: FilterSection[]
  selectedKeys: MultiFilterSelection
  onSelectionChange: (selection: MultiFilterSelection) => void
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
        {selectedOption?.hidden ? '' : selectedOption?.label || label}
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

/**
 * Multi-section Filter component that allows filtering by multiple criteria simultaneously.
 * Each section represents a different filter dimension (e.g., type, source).
 *
 * @example
 * ```tsx
 * const sections = [
 *   {
 *     key: 'type',
 *     title: 'File Type',
 *     options: [
 *       { key: 'all', label: 'All Types', count: 100 },
 *       { key: 'document', label: 'Documents', count: 50, icon: 'Document' },
 *     ]
 *   },
 *   {
 *     key: 'source',
 *     title: 'Source',
 *     options: [
 *       { key: 'all', label: 'All Sources', count: 100 },
 *       { key: 'manual', label: 'Manual Upload', count: 30, icon: 'Upload' },
 *     ]
 *   }
 * ]
 *
 * <MultiFilter
 *   label="Filters"
 *   sections={sections}
 *   selectedKeys={{ type: 'all', source: 'manual' }}
 *   onSelectionChange={(selection) => setFilters(selection)}
 * />
 * ```
 */
export function MultiFilter({
  label,
  sections,
  selectedKeys,
  onSelectionChange,
  showCounts = 'options-only',
  variant = 'button',
  size = 'sm',
  color = 'default',
  className = '',
}: MultiFilterProps) {
  // Count active filters (those not set to their first "all" option)
  const activeFilterCount = sections.filter((section) => {
    const selected = selectedKeys[section.key]
    const firstOption = section.options[0]?.key
    return selected && selected !== firstOption
  }).length

  const hasActiveFilter = activeFilterCount > 0

  // Get labels for active filters
  const getActiveFilterLabels = (): string[] => {
    return sections
      .filter((section) => {
        const selected = selectedKeys[section.key]
        const firstOption = section.options[0]?.key
        return selected && selected !== firstOption
      })
      .map((section) => {
        const selected = selectedKeys[section.key]
        const option = section.options.find((opt) => opt.key === selected)
        return option?.label || ''
      })
      .filter(Boolean)
  }

  const handleOptionClick = (sectionKey: string, optionKey: string) => {
    onSelectionChange({
      ...selectedKeys,
      [sectionKey]: optionKey,
    })
  }

  // Helper to determine if count should be shown in dropdown
  const shouldShowCountInDropdown = () => {
    if (showCounts === 'none') return false
    return true
  }

  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <Button isIconOnly size={size} variant="flat" color={color}>
          <Badge
            content={activeFilterCount > 0 ? activeFilterCount : ''}
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

    const activeLabels = getActiveFilterLabels()
    const displayLabel =
      activeLabels.length > 0
        ? activeLabels.length === 1
          ? activeLabels[0]
          : `${activeLabels.length} filters`
        : label

    return (
      <Button
        size={size}
        variant="flat"
        color={hasActiveFilter ? 'primary' : color}
        startContent={<Icon name="Filter" className="w-4 h-4" />}
        endContent={
          hasActiveFilter ? (
            <Chip color="primary" size="sm" className="ml-1 min-w-5 h-5">
              {activeFilterCount}
            </Chip>
          ) : undefined
        }
      >
        {displayLabel}
      </Button>
    )
  }

  return (
    <Dropdown className={className} placement="bottom-end">
      <DropdownTrigger>{renderTrigger()}</DropdownTrigger>
      <DropdownMenu
        aria-label={label}
        closeOnSelect={false}
        className="min-w-[220px]"
      >
        {sections.map((section, sectionIndex) => {
          // Check if any option in this section has an icon
          const hasAnyIcon = section.options.some((opt) => opt.icon)
          const selectedInSection = selectedKeys[section.key]

          return (
            <DropdownSection
              key={section.key}
              title={section.title}
              showDivider={sectionIndex < sections.length - 1}
            >
              {section.options.map((option) => {
                const isSelected = selectedInSection === option.key

                return (
                  <DropdownItem
                    key={`${section.key}:${option.key}`}
                    textValue={option.label}
                    onPress={() => handleOptionClick(section.key, option.key)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {hasAnyIcon && (
                          <div className="w-4 h-4 flex items-center justify-center">
                            {option.icon && (
                              <Icon name={option.icon} className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <span className={isSelected ? 'font-semibold' : ''}>
                          {option.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {shouldShowCountInDropdown() &&
                          option.count !== undefined && (
                            <span className="text-xs text-default-400">
                              {option.count}
                            </span>
                          )}
                        {isSelected && (
                          <Icon name="Check" className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </DropdownItem>
                )
              })}
            </DropdownSection>
          )
        })}
      </DropdownMenu>
    </Dropdown>
  )
}

// Type helper for selection
type Selection = Set<string> | 'all'
