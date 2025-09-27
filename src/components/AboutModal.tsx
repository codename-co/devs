import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react'
import { PRODUCT } from '@/config/product'
import { AboutPage } from '@/pages/About'
import { Icon } from './Icon'

interface AboutModalProps {
  isOpen: boolean
  onClose?: () => void
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      size="3xl"
      scrollBehavior="inside"
      placement="center"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Icon name="DevsAnimated" size="xl" />
            {/* <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500">
            </div> */}
            <div>
              <h2 className="text-2xl font-bold">{PRODUCT.displayName}</h2>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="gap-6">
          <AboutPage />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
