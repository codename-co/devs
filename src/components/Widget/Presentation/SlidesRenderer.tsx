import { useEffect, useState } from 'react'
import {
  Button,
  ButtonGroup,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Tooltip,
} from '@heroui/react'
import { useI18n } from '@/i18n'
import localI18n from './i18n'
import { Icon } from '../../Icon'

/**
 * Slides presentation layout with built-in navigation logic
 */
export const SlidesRenderer = ({
  slides,
  children,
  className = '',
  onSlideChange,
  onExportPDF,
}: {
  slides: React.ReactNode[]
  children?: React.ReactNode
  className?: string
  onSlideChange?: (slideIndex: number) => void
  onExportPDF?: () => void
}) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const totalSlides = slides.length

  const { t } = useI18n(localI18n)

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index)
      onSlideChange?.(index)
    }
  }

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1)
    }
  }

  const goToNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      goToSlide(currentSlide + 1)
    }
  }

  const enterFullscreen = () => {
    setIsFullscreen(true)
  }

  const exitFullscreen = () => {
    setIsFullscreen(false)
  }

  // Keyboard navigation for fullscreen mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFullscreen) {
        switch (event.key) {
          case 'Escape':
            event.preventDefault()
            event.stopPropagation()
            exitFullscreen()
            break
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault()
            event.stopPropagation()
            goToPrevSlide()
            break
          case 'ArrowRight':
          case 'ArrowDown':
          case ' ':
            event.preventDefault()
            event.stopPropagation()
            goToNextSlide()
            break
          case 'Home':
            event.preventDefault()
            event.stopPropagation()
            goToSlide(0)
            break
          case 'End':
            event.preventDefault()
            event.stopPropagation()
            goToSlide(totalSlides - 1)
            break
        }
      }
    }

    if (isFullscreen) {
      // Add event listener with capture to ensure we get the event first
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isFullscreen, currentSlide, totalSlides])

  // Reset slide when slides change
  useEffect(() => {
    if (currentSlide >= totalSlides) {
      setCurrentSlide(0)
      onSlideChange?.(0)
    }
  }, [totalSlides, currentSlide, onSlideChange])

  return (
    <>
      {/* Fullscreen Modal */}
      <Modal isOpen={isFullscreen} onClose={exitFullscreen} size="full">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-full h-full max-w-none max-h-none">
                  {slides[currentSlide]}

                  {/* Navigation overlay - only show on hover */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    {/* Previous slide button */}
                    {currentSlide > 0 && (
                      <Button
                        isIconOnly
                        variant="light"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text--black/50 hover:bg-black/70"
                        onPress={goToPrevSlide}
                      >
                        <Icon name="ChevronLeft" className="w-6 h-6" />
                      </Button>
                    )}
                    {/* Next slide button */}
                    {currentSlide < totalSlides - 1 && (
                      <Button
                        isIconOnly
                        variant="light"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text--black/50 hover:bg-black/70"
                        onPress={goToNextSlide}
                      >
                        <Icon name="ChevronRight" className="w-6 h-6" />
                      </Button>
                    )}
                    {/* Slide counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-black/50 px-3 py-1 rounded-full text-sm z-200">
                      {currentSlide + 1} / {totalSlides}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalHeader>
          <ModalFooter className="absolute bottom-4 self-center">
            <Pagination
              loop
              isCompact
              showControls
              variant="light"
              page={currentSlide + 1}
              total={totalSlides}
              onChange={(i) => goToSlide(i - 1)}
            />
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div
        className={`slides-presentation @container/presentation ${className}`}
      >
        <div className="flex gap-4">
          {/* Slides Preview Panel */}
          {totalSlides > 1 && (
            <div className="slides-preview hidden @3xl/presentation:block flex-shrink-0 w-48">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {slides.map((slide, index) => (
                  <div
                    key={`slide-preview-${index}`}
                    className={`slide-preview cursor-pointer border-2 rounded-md overflow-hidden transition-all ${
                      index === currentSlide
                        ? 'border-primary-500 shadow-md'
                        : 'border-default-200 hover:border-default-300'
                    }`}
                    onClick={() => goToSlide(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        goToSlide(index)
                      }
                    }}
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    <div
                      className="relative bg-white"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <div
                        className="absolute inset-0 transform scale-[0.35] origin-top-left overflow-hidden"
                        style={{ width: '286%', height: '286%' }}
                      >
                        {slide}
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Slide Content */}
            <div
              className="slide-container bg-white border border-default-200 rounded-md mb-4 overflow-hidden"
              style={{ aspectRatio: '16/9', minHeight: '300px' }}
            >
              {slides[currentSlide]}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
              {totalSlides > 1 && (
                <Pagination
                  loop
                  isCompact
                  siblings={0}
                  showControls
                  variant="light"
                  page={currentSlide + 1}
                  total={totalSlides}
                  onChange={(i) => goToSlide(i - 1)}
                />
              )}

              {/* Action Buttons */}
              <ButtonGroup>
                <Tooltip content={t('Slideshow')}>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    onPress={enterFullscreen}
                    className="ml-auto"
                  >
                    <Icon name="Presentation" className="w-4 h-4 mr-1" />
                  </Button>
                </Tooltip>
                {onExportPDF && (
                  <Tooltip content={t('Export/Print')}>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={onExportPDF}
                      className="ml-auto"
                    >
                      <Icon name="Share" className="w-4 h-4 mr-1" />
                    </Button>
                  </Tooltip>
                )}
              </ButtonGroup>
            </div>
          </div>
        </div>

        {children}
      </div>
    </>
  )
}
