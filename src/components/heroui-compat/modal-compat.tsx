import { Modal as HeroModal } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'
import type { ReactNode } from 'react'

export interface ModalCompatProps {
  children?: ReactNode
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  [key: string]: any
}

export const ModalContent: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Dialog className={className} {...rest}>{typeof children === 'function' ? children(() => {}) : children}</HeroModal.Dialog>
}

export const ModalHeader: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Header className={className} {...rest}>{children}</HeroModal.Header>
}

export const ModalBody: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Body className={className} {...rest}>{children}</HeroModal.Body>
}

export const ModalFooter: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Footer className={className} {...rest}>{children}</HeroModal.Footer>
}

export const Modal = withCompound(
  (props) => {
    const { children, isOpen: _io, onOpenChange: _ooc, size: _s,
      placement: _p, backdrop: _b, scrollBehavior: _sb,
      isDismissable: _id, isKeyboardDismissDisabled: _ikd,
      hideCloseButton: _hcb, closeButton: _cb,
      classNames: _cn, className, ...rest } = props
    return <HeroModal className={className} {...rest}>{children}</HeroModal>
  },
  {
    Root: HeroModal.Root,
    Backdrop: HeroModal.Backdrop,
    Container: HeroModal.Container,
    Dialog: HeroModal.Dialog,
    Header: ModalHeader,
    Heading: HeroModal.Heading,
    Body: ModalBody,
    Footer: ModalFooter,
    Content: ModalContent,
  }
)
