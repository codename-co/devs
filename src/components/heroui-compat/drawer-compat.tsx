import { Drawer as HeroDrawer } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const DrawerContent: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Content className={className} {...rest}>{children}</HeroDrawer.Content>
}

export const DrawerHeader: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Header className={className} {...rest}>{children}</HeroDrawer.Header>
}

export const DrawerBody: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Body className={className} {...rest}>{children}</HeroDrawer.Body>
}

export const DrawerFooter: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Footer className={className} {...rest}>{children}</HeroDrawer.Footer>
}

export const Drawer = withCompound(
  (props) => {
    const { children, isOpen: _io, onOpenChange: _ooc, placement: _p,
      size: _s, classNames: _cn, className, ...rest } = props
    return <HeroDrawer className={className} {...rest}>{children}</HeroDrawer>
  },
  {
    Root: HeroDrawer.Root,
    Content: DrawerContent,
    Header: DrawerHeader,
    Body: DrawerBody,
    Footer: DrawerFooter,
  }
)
