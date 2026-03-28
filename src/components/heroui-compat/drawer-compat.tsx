/**
 * Drawer v2 compat: accepts `isOpen`, `onOpenChange`, `onClose`, `size`,
 * `placement`, `isDismissable` props. Preserves v3 compound sub-components.
 */
import { Drawer as HeroDrawer } from '@heroui/react'
import type { ReactNode } from 'react'

interface DrawerCompatProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onClose?: () => void
  size?: string
  placement?: string
  isDismissable?: boolean
  backdrop?: string
  classNames?: Record<string, string>
  className?: string
  hideCloseButton?: boolean
  children?: ReactNode
  [key: string]: unknown
}

function DrawerCompat({
  isOpen,
  onOpenChange,
  onClose,
  size: _size,
  placement: _placement,
  isDismissable: _isDismissable,
  backdrop: _backdrop,
  classNames: _classNames,
  className: _className,
  hideCloseButton: _hideCloseButton,
  children,
  ...rest
}: DrawerCompatProps) {
  const handleOpenChange = (open: boolean) => {
    onOpenChange?.(open)
    if (!open) onClose?.()
  }

  return (
    <HeroDrawer isOpen={isOpen} onOpenChange={handleOpenChange} {...rest}>
      {children}
    </HeroDrawer>
  )
}

DrawerCompat.Root = HeroDrawer.Root
DrawerCompat.Trigger = HeroDrawer.Trigger
DrawerCompat.Backdrop = HeroDrawer.Backdrop
DrawerCompat.Content = HeroDrawer.Content
DrawerCompat.Dialog = HeroDrawer.Dialog
DrawerCompat.Header = HeroDrawer.Header
DrawerCompat.Heading = HeroDrawer.Heading
DrawerCompat.Body = HeroDrawer.Body
DrawerCompat.Footer = HeroDrawer.Footer
DrawerCompat.Handle = HeroDrawer.Handle
DrawerCompat.CloseTrigger = HeroDrawer.CloseTrigger

export const Drawer = DrawerCompat as typeof DrawerCompat & typeof HeroDrawer

export function DrawerContent({
  children,
  className: _className,
}: {
  children?: ReactNode | ((onClose: () => void) => ReactNode)
  className?: string
}) {
  if (typeof children === 'function') {
    return <>{children(() => {})}</>
  }
  return <>{children}</>
}

export const DrawerHeader = HeroDrawer.Header
export const DrawerBody = HeroDrawer.Body
export const DrawerFooter = HeroDrawer.Footer
