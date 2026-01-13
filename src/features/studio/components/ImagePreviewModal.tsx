/**
 * ImagePreviewModal Component
 *
 * Fullscreen modal for previewing generated images with navigation.
 */

import { Button, Modal, ModalContent, ModalBody, Tooltip } from '@heroui/react'
import { useEffect } from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { GeneratedImage } from '../types'
import localI18n from '../i18n'

interface ImagePreviewModalProps {
  lang: Lang
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Current image to display */
  image: GeneratedImage | null
  /** Prompt text for the image */
  prompt?: string
  /** Whether there's a previous image */
  hasPrevious?: boolean
  /** Whether there's a next image */
  hasNext?: boolean
  /** Navigate to previous image */
  onPrevious?: () => void
  /** Navigate to next image */
  onNext?: () => void
  /** Download current image */
  onDownload?: () => void
  /** Use current image as reference */
  onUseAsReference?: () => void
  /** Toggle favorite */
  onFavorite?: () => void
  /** Whether current image is favorite */
  isFavorite?: boolean
}

export function ImagePreviewModal({
  lang: _lang,
  isOpen,
  onClose,
  image,
  prompt,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  onDownload,
  onUseAsReference,
  onFavorite,
  isFavorite = false,
}: ImagePreviewModalProps) {
  const { t } = useI18n(localI18n)

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault()
        onPrevious?.()
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault()
        onNext?.()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose])

  if (!image) return null

  const imageUrl = image.base64
    ? `data:image/${image.format};base64,${image.base64}`
    : image.url

  const displayPrompt = prompt || image.revisedPrompt

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      classNames={{
        body: 'p-0',
        closeButton:
          'z-50 top-4 end-4 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white',
      }}
      hideCloseButton={false}
    >
      <ModalContent>
        <ModalBody className="flex items-center justify-center bg-black/95 min-h-screen p-0 relative">
          {/* Main image */}
          <img
            src={imageUrl}
            alt="Generated image full size"
            className="max-w-full max-h-screen object-contain select-none"
            draggable={false}
          />

          {/* Previous button */}
          {hasPrevious && onPrevious && (
            <Button
              isIconOnly
              size="lg"
              variant="flat"
              className="absolute start-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white min-w-12 w-12 h-12"
              onPress={onPrevious}
              aria-label={t('Previous image')}
            >
              <Icon name="NavArrowLeft" size="lg" />
            </Button>
          )}

          {/* Next button */}
          {hasNext && onNext && (
            <Button
              isIconOnly
              size="lg"
              variant="flat"
              className="absolute end-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white min-w-12 w-12 h-12"
              onPress={onNext}
              aria-label={t('Next image')}
            >
              <Icon name="NavArrowRight" size="lg" />
            </Button>
          )}

          {/* Top bar with favorite */}
          {onFavorite && (
            <div className="absolute top-4 start-4">
              <Tooltip content={isFavorite ? t('Unfavorite') : t('Favorite')}>
                <Button
                  isIconOnly
                  size="md"
                  variant="flat"
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 min-w-10 w-10 h-10"
                  onPress={onFavorite}
                >
                  <Icon
                    name={isFavorite ? 'HeartSolid' : 'Heart'}
                    size="md"
                    className={isFavorite ? 'text-danger' : 'text-white'}
                  />
                </Button>
              </Tooltip>
            </div>
          )}

          {/* Bottom actions bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
            {onDownload && (
              <Tooltip content={t('Download')}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  className="text-white bg-transparent hover:bg-white/20"
                  onPress={onDownload}
                >
                  <Icon name="Download" size="sm" />
                </Button>
              </Tooltip>
            )}
            {onUseAsReference && (
              <Tooltip content={t('Use as reference')}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  className="text-white bg-transparent hover:bg-white/20"
                  onPress={() => {
                    onUseAsReference()
                    onClose()
                  }}
                >
                  <Icon name="MediaImage" size="sm" />
                </Button>
              </Tooltip>
            )}
          </div>

          {/* Prompt text */}
          {displayPrompt && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl px-4">
              <p className="text-white/70 text-sm text-center line-clamp-3">
                {displayPrompt}
              </p>
            </div>
          )}

          {/* Keyboard hints */}
          <div className="absolute bottom-6 end-4 flex gap-2 text-white/40 text-xs">
            <span>← →</span>
            <span>{t('Navigate')}</span>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
