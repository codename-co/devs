import { Popover as HeroPopover } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const PopoverTrigger: V2Compat = (props) => {
  const { children, ...rest } = props
  return <HeroPopover.Trigger {...rest}>{children}</HeroPopover.Trigger>
}

export const PopoverContent: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroPopover.Content className={className} {...rest}>{children ?? null}</HeroPopover.Content>
}

export const Popover = withCompound(
  (props) => {
    const { children, isOpen: _io, onOpenChange: _ooc, placement: _p,
      offset: _o, showArrow: _sa, triggerScaleOnOpen: _ts,
      classNames: _cn, className, ...rest } = props
    return <HeroPopover className={className} {...rest}>{children}</HeroPopover>
  },
  {
    Root: HeroPopover.Root,
    Trigger: PopoverTrigger,
    Content: PopoverContent,
  }
)
