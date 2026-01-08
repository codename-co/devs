import { Modal, ModalContent, ModalBody } from '@heroui/react'

import { ContentPreview } from './ContentPreview'
import type {
  ContentPreviewProps,
  ContentPreviewCallbacks,
} from './ContentPreview'

type ContentPreviewModalProps = {
  isOpen: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
} & Omit<ContentPreviewProps, 'onClose' | 'mode'> &
  ContentPreviewCallbacks

/**
 * Modal wrapper for ContentPreview
 *
 * Provides a full-screen modal experience for previewing
 * KnowledgeItems or Artifacts with all their details.
 */
export const ContentPreviewModal = ({
  isOpen,
  onClose,
  size = '5xl',
  onRequestProcessing,
  ...previewProps
}: ContentPreviewModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalBody>
          <ContentPreview
            {...(previewProps as ContentPreviewProps)}
            mode="full"
            onRequestProcessing={onRequestProcessing}
            className="border-0 rounded-none"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
