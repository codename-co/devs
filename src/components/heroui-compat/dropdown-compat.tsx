import { Dropdown as HeroDropdown } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

// Re-export collection items directly — wrapping them in a regular component
// breaks React Aria's collection traversal ("cannot be rendered outside a collection").
export const DropdownItem = HeroDropdown.Item as unknown as V2Compat
export const DropdownSection = HeroDropdown.Section as unknown as V2Compat

export const DropdownMenu: V2Compat = (props) => {
  const {
    children,
    closeOnSelect: _c,
    selectionMode: _s,
    selectedKeys: _sk,
    onSelectionChange: _osc,
    disallowEmptySelection: _d,
    classNames: _cn,
    color: _co,
    variant: _v,
    ...rest
  } = props
  return <HeroDropdown.Menu {...rest}>{children}</HeroDropdown.Menu>
}

export const Dropdown = withCompound(
  (props) => {
    const {
      children,
      isOpen: _,
      onOpenChange: _o,
      placement: _p,
      closeOnSelect: _c,
      classNames: _cn,
      ...rest
    } = props
    return <HeroDropdown {...rest}>{children}</HeroDropdown>
  },
  {
    Root: HeroDropdown.Root,
    Trigger: HeroDropdown.Trigger,
    Popover: HeroDropdown.Popover,
    Menu: DropdownMenu,
    Section: HeroDropdown.Section as unknown as V2Compat,
    Item: HeroDropdown.Item as unknown as V2Compat,
    ItemIndicator: HeroDropdown.ItemIndicator,
    SubmenuIndicator: HeroDropdown.SubmenuIndicator,
    SubmenuTrigger: HeroDropdown.SubmenuTrigger,
  },
)
