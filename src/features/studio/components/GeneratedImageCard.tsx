/**
 * GeneratedImageCard Component
 *
 * Card displaying a single generated image with actions.
 */

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Image,
  Modal,
  ModalContent,
  ModalBody,
  useDisclosure,
} from '@heroui/react'
import { useState, useCallback } from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { GeneratedImage } from '../types'

interface GeneratedImageCardProps {
  lang: Lang
  image: GeneratedImage
  prompt?: string
  isSelected?: boolean
  onSelect?: () => void
  onDownload?: () => void
  onDelete?: () => void
  onCopyPrompt?: () => void
  onUseAsReference?: () => void
  onFavorite?: () => void
  isFavorite?: boolean
  showActions?: boolean
}

export function GeneratedImageCard({
  lang,
  image,
  prompt,
  isSelected = false,
  onSelect: _onSelect,
  onDownload,
  onDelete,
  onCopyPrompt,
  onUseAsReference,
  onFavorite,
  isFavorite = false,
  showActions = true,
}: GeneratedImageCardProps) {
  const { t } = useI18n(lang as any)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isLoading, setIsLoading] = useState(true)

  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleImageClick = useCallback(() => {
    onOpen()
  }, [onOpen])

  const imageUrl = image.base64
    ? `data:image/${image.format};base64,${image.base64}`
    : image.url

  return (
    <>
      <Card
        isHoverable
        className={`group relative transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
      >
        <CardBody className="p-0 overflow-hidden">
          {/* Image - click to preview fullscreen */}
          <div
            className="relative aspect-square cursor-pointer"
            onClick={handleImageClick}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-default-100">
                <Icon
                  name="MediaImage"
                  size="lg"
                  className="text-default-300 animate-pulse"
                />
              </div>
            )}
            <Image
              src={imageUrl}
              alt="Generated image"
              className="w-full h-full object-cover"
              classNames={{
                wrapper: 'w-full h-full !max-w-full',
                img: 'w-full h-full object-cover',
              }}
              onLoad={handleImageLoad}
              radius="none"
              loading="lazy"
            />

            {/* Overlay with actions on hover */}
            {showActions && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Tooltip content={t('View full size')}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="bg-white/20 backdrop-blur-sm"
                    onPress={onOpen}
                  >
                    <Icon name="Expand" size="sm" className="text-white" />
                  </Button>
                </Tooltip>

                {onDownload && (
                  <Tooltip content={t('Download')}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      className="bg-white/20 backdrop-blur-sm"
                      onPress={onDownload}
                    >
                      <Icon name="Download" size="sm" className="text-white" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Favorite toggle button - top right corner, visible on hover or when favorited */}
            {onFavorite && (
              <div
                className={`absolute z-10 top-2 right-2 transition-opacity ${isFavorite ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
              >
                <Tooltip content={isFavorite ? t('Unfavorite') : t('Favorite')}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="bg-black/30 backdrop-blur-sm min-w-8 w-8 h-8"
                    onPress={onFavorite}
                  >
                    <Icon
                      name={isFavorite ? 'HeartSolid' : 'Heart'}
                      size="sm"
                      className={isFavorite ? 'text-danger' : 'text-white'}
                    />
                  </Button>
                </Tooltip>
              </div>
            )}

            {/* Favorite indicator (when no onFavorite handler) */}
            {!onFavorite && isFavorite && (
              <div className="absolute top-2 right-2">
                <Icon
                  name="HeartSolid"
                  size="sm"
                  className="text-danger drop-shadow-lg"
                />
              </div>
            )}
          </div>
        </CardBody>

        {showActions && (
          <CardFooter className="p-2 justify-between gap-2">
            {/* Prompt */}
            <span
              className="text-xs text-default-500 line-clamp-2 flex-1"
              title={prompt || image.revisedPrompt}
            >
              {prompt || image.revisedPrompt || '—'}
            </span>

            {/* More actions dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="light">
                  <Icon name="MoreHoriz" size="sm" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Image actions"
                onAction={(key) => {
                  if (key === 'download') onDownload?.()
                  if (key === 'copy-prompt') onCopyPrompt?.()
                  if (key === 'reference') onUseAsReference?.()
                  if (key === 'delete') onDelete?.()
                }}
              >
                <DropdownItem
                  key="download"
                  startContent={<Icon name="Download" size="sm" />}
                >
                  {t('Download')}
                </DropdownItem>
                <DropdownItem
                  key="copy-prompt"
                  startContent={<Icon name="Copy" size="sm" />}
                  className={
                    !onCopyPrompt || !image.revisedPrompt ? 'hidden' : ''
                  }
                >
                  {t('Copy revised prompt')}
                </DropdownItem>
                <DropdownItem
                  key="reference"
                  startContent={<Icon name="MediaImage" size="sm" />}
                  className={!onUseAsReference ? 'hidden' : ''}
                >
                  {t('Use as reference')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  startContent={<Icon name="Trash" size="sm" />}
                  color="danger"
                  className={!onDelete ? 'hidden text-danger' : 'text-danger'}
                >
                  {t('Delete')}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </CardFooter>
        )}
      </Card>

      {/* Fullscreen modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="full"
        classNames={{
          body: 'p-0',
          closeButton: 'z-50 bg-white/20 backdrop-blur-sm hover:bg-white/40',
        }}
      >
        <ModalContent>
          <ModalBody className="flex items-center justify-center bg-black/90 min-h-screen">
            <img
              src={imageUrl}
              alt="Generated image full size"
              className="max-w-full max-h-screen object-contain"
            />

            {/* Bottom actions bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              {onDownload && (
                <Button
                  size="sm"
                  variant="flat"
                  className="text-white"
                  startContent={<Icon name="Download" size="sm" />}
                  onPress={onDownload}
                >
                  {t('Download')}
                </Button>
              )}
              {onUseAsReference && (
                <Button
                  size="sm"
                  variant="flat"
                  className="text-white"
                  startContent={<Icon name="MediaImage" size="sm" />}
                  onPress={onUseAsReference}
                >
                  {t('Use as reference')}
                </Button>
              )}
            </div>

            {/* Image info */}
            {image.revisedPrompt && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl px-4">
                <p className="text-white/70 text-sm text-center line-clamp-2">
                  {image.revisedPrompt}
                </p>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
