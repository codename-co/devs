import { Modal } from '@/components/heroui-compat'

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
      onOpenChange={(v: any) => !v && (onClose)()}
      size={size}
      scrollBehavior="inside"
    >
      <Modal.Dialog>
        <Modal.Body>
          <ContentPreview
            {...(previewProps as ContentPreviewProps)}
            mode="full"
            onRequestProcessing={onRequestProcessing}
            className="border-0 rounded-none"
          />
        </Modal.Body>
      </Modal.Dialog>
    </Modal>
  )
}
