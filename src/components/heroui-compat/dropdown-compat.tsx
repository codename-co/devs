import { Dropdown as HeroDropdown } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const DropdownItem: V2Compat = (props) => {
  const { children, title: _, description: _d, startContent: _s, endContent: _e,
    color: _c, closeOnSelect: _cs, isReadOnly: _r, showDivider: _sd,
    classNames: _cn, ...rest } = props
  return <HeroDropdown.Item {...rest}>{children}</HeroDropdown.Item>
}

export const DropdownSection: V2Compat = (props) => {
  const { children, title: _, showDivider: _s, classNames: _cn, ...rest } = props
  return <HeroDropdown.Section {...rest}>{children}</HeroDropdown.Section>
}

export const DropdownMenu: V2Compat = (props) => {
  const { children, closeOnSelect: _c, selectionMode: _s, selectedKeys: _sk,
    onSelectionChange: _osc, disallowEmptySelection: _d, classNames: _cn,
    color: _co, variant: _v, ...rest } = props
  return <HeroDropdown.Menu {...rest}>{children}</HeroDropdown.Menu>
}

export const Dropdown = withCompound(
  (props) => {
    const { children, isOpen: _, onOpenChange: _o, placement: _p,
      closeOnSelect: _c, classNames: _cn, ...rest } = props
    return <HeroDropdown {...rest}>{children}</HeroDropdown>
  },
  {
    Root: HeroDropdown.Root,
    Trigger: HeroDropdown.Trigger,
    Popover: HeroDropdown.Popover,
    Menu: DropdownMenu,
    Section: DropdownSection,
    Item: DropdownItem,
    ItemIndicator: HeroDropdown.ItemIndicator,
    SubmenuIndicator: HeroDropdown.SubmenuIndicator,
    SubmenuTrigger: HeroDropdown.SubmenuTrigger,
  }
)
