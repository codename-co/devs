import {
  Alert as HeroAlert,
  Kbd as HeroKbd,
  ButtonGroup as HeroBtnGroup,
  ScrollShadow as HeroScrollShadow,
  ListBox as HeroListBox,
  ListBoxItem as HeroListBoxItem,
  ListBoxSection as HeroListBoxSection,
} from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const Alert: V2Compat = (props) => {
  const { children, title: _t, description: _d, color: _c, variant: _v,
    icon: _i, startContent: _s, endContent: _e, isVisible: _iv,
    hideIconWrapper: _h, classNames: _cn, className, onClose: _oc, ...rest } = props
  return <HeroAlert className={className} {...rest}>{children}</HeroAlert>
}

export const Kbd: V2Compat = (props) => {
  const { children, keys: _k, classNames: _cn, className, ...rest } = props
  return <HeroKbd className={className} {...rest}>{children}</HeroKbd>
}

export const ButtonGroup: V2Compat = (props) => {
  const { children, variant: _v, color: _c, size: _s, radius: _r,
    fullWidth: _fw, className, ...rest } = props
  return <HeroBtnGroup className={className} {...rest}>{children}</HeroBtnGroup>
}

export const ScrollShadow: V2Compat = (props) => {
  const { children, className, size: _s, offset: _o, orientation: _or,
    isEnabled: _ie, hideScrollBar: _h, visibility: _vi, ...rest } = props
  return <HeroScrollShadow className={className} {...rest}>{children}</HeroScrollShadow>
}

export const ListBoxItem: V2Compat = (props) => {
  const { children, title: _t, description: _d, startContent: _s,
    endContent: _e, classNames: _cn, color: _c, isReadOnly: _r, ...rest } = props
  return <HeroListBoxItem {...rest}>{children}</HeroListBoxItem>
}

export const ListBoxSection: V2Compat = (props) => {
  const { children, title: _t, showDivider: _s, classNames: _cn, ...rest } = props
  return <HeroListBoxSection {...rest}>{children}</HeroListBoxSection>
}

export const ListBox = withCompound(
  (props) => {
    const { children, items: _i, selectionMode: _s, selectedKeys: _sk,
      onSelectionChange: _osc, disallowEmptySelection: _d, className,
      classNames: _cn, emptyContent: _ec, ...rest } = props
    return <HeroListBox className={className} aria-label={rest['aria-label']}>{children}</HeroListBox>
  },
  {
    Root: HeroListBox.Root,
    Item: ListBoxItem,
    Section: ListBoxSection,
  }
)
