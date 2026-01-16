/**
 * GeneratedVideoCard Component
 *
 * Card displaying a single generated video with playback controls and actions.
 */

import {
  Button,
  Card,
  CardBody,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Modal,
  ModalContent,
  ModalBody,
  useDisclosure,
  Progress,
} from '@heroui/react'
import { useState, useCallback, useRef, useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { GeneratedVideo } from '../types'
import localI18n from '../i18n'

interface GeneratedVideoCardProps {
  lang: Lang
  video: GeneratedVideo
  prompt?: string
  isSelected?: boolean
  onSelect?: () => void
  onDownload?: () => void
  onDelete?: () => void
  onCopyPrompt?: () => void
  onFavorite?: () => void
  isFavorite?: boolean
  showActions?: boolean
  /** External preview handler - when provided, disables internal modal */
  onPreview?: () => void
}

export function GeneratedVideoCard({
  lang: _lang,
  video,
  prompt,
  isSelected = false,
  onSelect: _onSelect,
  onDownload,
  onDelete,
  onCopyPrompt,
  onFavorite,
  isFavorite = false,
  showActions = true,
  onPreview,
}: GeneratedVideoCardProps) {
  const { t } = useI18n(localI18n)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Compute the video URL: use base64 data URL if available, fallback to original URL
  const videoUrl = useMemo(() => {
    // If we have base64 data, construct a data URL (this is persisted and always valid)
    if (video.base64) {
      return `data:video/${video.format};base64,${video.base64}`
    }
    // Otherwise use the original URL (may be a blob URL that's only valid in this session)
    return video.url
  }, [video.base64, video.format, video.url])

  const handleVideoLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  const handleVideoClick = useCallback(() => {
    if (onPreview) {
      onPreview()
    } else {
      onOpen()
    }
  }, [onPreview, onOpen])

  const togglePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
      }
    },
    [isPlaying],
  )

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <Card
        isHoverable
        className={`group relative transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
      >
        <CardBody className="p-0 overflow-hidden">
          {/* Video container - use aspect-square to match image cards in grid */}
          <div
            className="relative aspect-square cursor-pointer bg-black"
            onClick={handleVideoClick}
          >
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-default-100">
                <Icon
                  name="MediaVideo"
                  size="lg"
                  className="text-default-300 animate-pulse"
                />
              </div>
            )}
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onLoadedData={handleVideoLoad}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              playsInline
              muted={false}
            />

            {/* Play/Pause overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              onClick={togglePlayPause}
            >
              {!isPlaying && isLoaded && (
                <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
                  <Icon name="PlaySolid" size="lg" className="text-white" />
                </div>
              )}
            </div>

            {/* Duration badge */}
            <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 text-xs text-white">
              {formatDuration(currentTime)} / {formatDuration(video.duration)}
            </div>

            {/* Audio indicator */}
            {video.hasAudio && (
              <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-1">
                <Icon name="SoundHigh" size="sm" className="text-white" />
              </div>
            )}

            {/* Progress bar */}
            {isLoaded && (
              <div className="absolute bottom-0 left-0 right-0">
                <Progress
                  size="sm"
                  value={(currentTime / video.duration) * 100}
                  className="rounded-none"
                  classNames={{
                    track: 'bg-white/20',
                    indicator: 'bg-primary',
                  }}
                />
              </div>
            )}

            {/* Overlay with actions on hover */}
            {showActions && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                <div className="pointer-events-auto flex gap-2">
                  <Tooltip content={t('View full size')}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      className="bg-white/20 backdrop-blur-sm"
                      onPress={onPreview || onOpen}
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
                        <Icon
                          name="Download"
                          size="sm"
                          className="text-white"
                        />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}

            {/* Favorite toggle button */}
            {onFavorite && (
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                className={`absolute top-2 right-2 bg-black/30 backdrop-blur-sm transition-opacity ${
                  isFavorite
                    ? 'opacity-100'
                    : 'opacity-70 group-hover:opacity-100'
                }`}
                onPress={() => {
                  onFavorite()
                }}
              >
                <Icon
                  name={isFavorite ? 'HeartSolid' : 'Heart'}
                  size="sm"
                  className={isFavorite ? 'text-danger' : 'text-white'}
                />
              </Button>
            )}

            {/* Video type badge */}
            <div className="absolute top-2 left-2 bg-primary/80 rounded px-2 py-1 text-xs text-white font-medium">
              {video.width}x{video.height}
            </div>
          </div>
        </CardBody>

        {/* Actions footer - shown on hover */}
        {showActions && (onDelete || onCopyPrompt) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-end gap-1">
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="bg-white/20 backdrop-blur-sm min-w-6 w-6 h-6"
                  >
                    <Icon name="MoreHoriz" size="sm" className="text-white" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Video actions"
                  items={
                    [
                      prompt && onCopyPrompt
                        ? {
                            key: 'copy',
                            label: t('Copy prompt'),
                            icon: 'Copy' as const,
                            action: onCopyPrompt,
                          }
                        : null,
                      onDelete
                        ? {
                            key: 'delete',
                            label: t('Delete'),
                            icon: 'Trash' as const,
                            action: onDelete,
                            isDanger: true,
                          }
                        : null,
                    ].filter(Boolean) as {
                      key: string
                      label: string
                      icon: 'Copy' | 'Trash'
                      action: () => void
                      isDanger?: boolean
                    }[]
                  }
                >
                  {(item) => (
                    <DropdownItem
                      key={item.key}
                      className={item.isDanger ? 'text-danger' : ''}
                      color={item.isDanger ? 'danger' : 'default'}
                      startContent={<Icon name={item.icon} size="sm" />}
                      onPress={item.action}
                    >
                      {item.label}
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        )}
      </Card>

      {/* Fullscreen Modal for video preview */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        classNames={{
          backdrop: 'bg-black/90',
          base: 'bg-transparent shadow-none',
          body: 'p-0',
        }}
      >
        <ModalContent>
          <ModalBody>
            <div className="relative">
              <video
                src={videoUrl}
                className="max-w-full max-h-[85vh] mx-auto rounded-lg"
                controls
                autoPlay
                playsInline
              />
              <Button
                isIconOnly
                size="lg"
                variant="flat"
                className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm"
                onPress={onClose}
              >
                <Icon name="Xmark" size="md" className="text-white" />
              </Button>
            </div>

            {/* Actions below video */}
            <div className="flex justify-center gap-4 mt-4">
              {onDownload && (
                <Button
                  variant="flat"
                  className="bg-white/10 text-white"
                  startContent={<Icon name="Download" size="sm" />}
                  onPress={onDownload}
                >
                  {t('Download')}
                </Button>
              )}
              {onFavorite && (
                <Button
                  variant="flat"
                  className="bg-white/10 text-white"
                  startContent={
                    <Icon
                      name={isFavorite ? 'HeartSolid' : 'Heart'}
                      size="sm"
                      className={isFavorite ? 'text-danger' : ''}
                    />
                  }
                  onPress={onFavorite}
                >
                  {isFavorite
                    ? t('Remove from favorites')
                    : t('Add to favorites')}
                </Button>
              )}
            </div>

            {/* Prompt display */}
            {prompt && (
              <div className="mt-4 p-4 bg-black/30 rounded-lg backdrop-blur-sm">
                <p className="text-white/80 text-sm">{prompt}</p>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
