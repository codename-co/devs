import { Modal, ModalContent, ModalBody } from '@heroui/react'

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
  return (
    <Modal
      size="3xl"
      scrollBehavior="inside"
      placement="bottom-center"
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      classNames={{
        base: 'max-h-[90vh]',
        body: 'p-0',
      }}
      hideCloseButton={false}
    >
      <ModalContent>
        <ModalBody className="p-0 min-h-[500px]">
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
