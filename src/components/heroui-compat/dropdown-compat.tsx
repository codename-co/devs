/**
 * Dropdown v2 compat: preserves v3 compound sub-components and provides
 * v2-compatible DropdownItem, DropdownSection, DropdownMenu, DropdownTrigger.
 */
import { Dropdown as HeroDropdown } from '@heroui/react'
import type { ReactNode, Key } from 'react'

interface DropdownCompatProps {
  children?: ReactNode
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  placement?: string
  closeOnSelect?: boolean
  className?: string
  classNames?: Record<string, string>
  [key: string]: unknown
}

function DropdownCompat({
  children,
  isOpen: _isOpen,
  onOpenChange: _onOpenChange,
  placement: _placement,
  closeOnSelect: _closeOnSelect,
  className: _className,
  classNames: _classNames,
  ...rest
}: DropdownCompatProps) {
  return <HeroDropdown {...rest}>{children}</HeroDropdown>
}

DropdownCompat.Root = HeroDropdown.Root
DropdownCompat.Trigger = HeroDropdown.Trigger
DropdownCompat.Popover = HeroDropdown.Popover
DropdownCompat.Menu = HeroDropdown.Menu
DropdownCompat.Section = HeroDropdown.Section
DropdownCompat.Item = HeroDropdown.Item
DropdownCompat.ItemIndicator = HeroDropdown.ItemIndicator
DropdownCompat.SubmenuIndicator = HeroDropdown.SubmenuIndicator
DropdownCompat.SubmenuTrigger = HeroDropdown.SubmenuTrigger

export const Dropdown = DropdownCompat as typeof DropdownCompat & typeof HeroDropdown
