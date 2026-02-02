import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react'
import { PRODUCT } from '@/config/product'
import { AboutPage } from '@/pages/About'
import { DevsIconXL } from './DevsIcon'
import { useI18n } from '@/i18n'

interface AboutModalProps {
  isOpen: boolean
  onClose?: () => void
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  const { lang } = useI18n()

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
            <DevsIconXL />
            {/* <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500">
            </div> */}
            <div className="flex flex-row gap-3 items-baseline">
              <h2 className="text-2xl font-bold">{PRODUCT.displayName}</h2>
              <span className="text-xs opacity-50">v{__APP_VERSION__}</span>
              <time
                className="text-xs opacity-50"
                dateTime={new Date(__BUILD_TIME__).toISOString()}
              >
                {new Date(__BUILD_TIME__).toLocaleString(lang, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </time>
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
