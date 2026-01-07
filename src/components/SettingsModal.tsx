import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react'
import { useI18n } from '@/i18n'
import { Icon } from './Icon'

// Lazy load the settings content to avoid circular dependencies
import { lazy, Suspense } from 'react'
const SettingsContent = lazy(() =>
  import('@/pages/Settings/SettingsContent').then((m) => ({
    default: m.SettingsContent,
  })),
)

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { t } = useI18n()

  return (
    <Modal
      size="4xl"
      scrollBehavior="inside"
      placement="center"
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      classNames={{
        base: 'max-h-[90vh]',
        body: 'p-0',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 border-b border-default-200">
          <Icon name="Settings" className="h-5 w-5 text-default-400" />
          <span>{t('Settings')}</span>
        </ModalHeader>
        <ModalBody className="py-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            }
          >
            <SettingsContent isModal />
          </Suspense>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
