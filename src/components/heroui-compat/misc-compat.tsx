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
  const {
    children,
    title: _t,
    description: _d,
    color: _c,
    variant: _v,
    icon: _i,
    startContent: _s,
    endContent: _e,
    isVisible: _iv,
    hideIconWrapper: _h,
    classNames: _cn,
    className,
    onClose: _oc,
    ...rest
  } = props
  return (
    <HeroAlert className={className} {...rest}>
      {children}
    </HeroAlert>
  )
}

export const Kbd: V2Compat = (props) => {
  const { children, keys: _k, classNames: _cn, className, ...rest } = props
  return (
    <HeroKbd className={className} {...rest}>
      {children}
    </HeroKbd>
  )
}

export const ButtonGroup: V2Compat = (props) => {
  const {
    children,
    variant: _v,
    color: _c,
    size: _s,
    radius: _r,
    fullWidth: _fw,
    className,
    ...rest
  } = props
  return (
    <HeroBtnGroup className={className} {...rest}>
      {children}
    </HeroBtnGroup>
  )
}

export const ScrollShadow: V2Compat = (props) => {
  const {
    children,
    className,
    size: _s,
    offset: _o,
    orientation: _or,
    isEnabled: _ie,
    hideScrollBar: _h,
    visibility: _vi,
    ...rest
  } = props
  return (
    <HeroScrollShadow className={className} {...rest}>
      {children}
    </HeroScrollShadow>
  )
}

// Re-export collection items directly — wrapping them in a regular component
// breaks React Aria's collection traversal ("cannot be rendered outside a collection").
export const ListBoxItem = HeroListBoxItem as unknown as V2Compat
export const ListBoxSection = HeroListBoxSection as unknown as V2Compat

export const ListBox = withCompound(
  (props) => {
    const {
      children,
      items: _i,
      disallowEmptySelection: _d,
      classNames: _cn,
      emptyContent: _ec,
      ...rest
    } = props
    return <HeroListBox {...rest}>{children}</HeroListBox>
  },
  {
    Root: HeroListBox.Root,
    // Use native HeroUI v3 compounds to preserve React Aria collection identity.
    // Casting as V2Compat allows v2 props (classNames, title, etc.) to pass through
    // without TS errors; unknown props are harmlessly spread by HeroUI's ...rest.
    Item: HeroListBox.Item as unknown as V2Compat,
    Section: HeroListBox.Section as unknown as V2Compat,
  },
)
