/**
 * Modal v2 compat: accepts `isOpen`, `onOpenChange`, `onClose`, `size`,
 * `scrollBehavior`, `isDismissable`, `backdrop` props.
 *
 * Also preserves v3 compound sub-components (Modal.Dialog, Modal.Header, etc.)
 * and re-exports ModalContent, ModalHeader, ModalBody, ModalFooter.
 */
import { Modal as HeroModal } from '@heroui/react'
import type { ReactNode } from 'react'

export interface ModalCompatProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onClose?: () => void
  size?: string
  scrollBehavior?: string
  isDismissable?: boolean
  backdrop?: string
  classNames?: Record<string, string>
  className?: string
  placement?: string
  hideCloseButton?: boolean
  children?: ReactNode
  [key: string]: unknown
}

function ModalCompat({
  isOpen,
  onOpenChange,
  onClose,
  size: _size,
  scrollBehavior: _scrollBehavior,
  isDismissable: _isDismissable,
  backdrop: _backdrop,
  classNames: _classNames,
  className: _className,
  placement: _placement,
  hideCloseButton: _hideCloseButton,
  children,
  ...rest
}: ModalCompatProps) {
  const handleOpenChange = (open: boolean) => {
    onOpenChange?.(open)
    if (!open) onClose?.()
  }

  return (
    <HeroModal isOpen={isOpen} onOpenChange={handleOpenChange} {...rest}>
      {children}
    </HeroModal>
  )
}

// Attach v3 compound sub-components so Modal.Dialog, Modal.Header etc. work
ModalCompat.Root = HeroModal.Root
ModalCompat.Trigger = HeroModal.Trigger
ModalCompat.Backdrop = HeroModal.Backdrop
ModalCompat.Container = HeroModal.Container
ModalCompat.Dialog = HeroModal.Dialog
ModalCompat.Header = HeroModal.Header
ModalCompat.Icon = HeroModal.Icon
ModalCompat.Heading = HeroModal.Heading
ModalCompat.Body = HeroModal.Body
ModalCompat.Footer = HeroModal.Footer
ModalCompat.CloseTrigger = HeroModal.CloseTrigger

export const Modal = ModalCompat as typeof ModalCompat & typeof HeroModal

// v2 ModalContent was a direct child of Modal
export function ModalContent({
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

export const ModalHeader = HeroModal.Header
export const ModalBody = HeroModal.Body
export const ModalFooter = HeroModal.Footer
