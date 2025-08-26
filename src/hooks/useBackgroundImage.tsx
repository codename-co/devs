import { useState, useRef, useCallback, useEffect } from 'react'
import { useI18n } from '@/i18n'
import { errorToast, successToast } from '@/lib/toast'
import { userSettings } from '@/stores/userStore'
import { addToast, Button } from '@heroui/react'

interface UseBackgroundImageReturn {
  backgroundImage: string | undefined
  backgroundLoaded: boolean
  isDragOver: boolean
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  handleImageFile: (file: File) => Promise<void>
  setBackgroundImage: (backgroundImage: string | undefined) => void
}

const MAX_FILE_SIZE_MB = 10

export const useBackgroundImage = (): UseBackgroundImageReturn => {
  const { t } = useI18n()
  const [isDragOver, setIsDragOver] = useState(false)
  const [backgroundLoaded, setBackgroundLoaded] = useState(false)
  const dragCounterRef = useRef(0)

  const backgroundImage = userSettings((state) => state.backgroundImage)
  const setBackgroundImage = userSettings((state) => state.setBackgroundImage)

  const handleImageUrl = useCallback(
    async (url: string, onSuccess: () => void) => {
      try {
        // Validate that the URL points to an image
        const response = await fetch(url, { method: 'HEAD' })
        const contentType = response.headers.get('content-type')

        if (!contentType || !contentType.startsWith('image/')) {
          errorToast(t('The URL does not point to a valid image'))
          return
        }

        // Check image size if Content-Length header is available
        const contentLength = response.headers.get('content-length')
        if (
          contentLength &&
          parseInt(contentLength) > MAX_FILE_SIZE_MB * 1024 * 1024
        ) {
          errorToast(
            t(
              'Image file is too large. Please select a file smaller than {size}MB.',
              {
                size: MAX_FILE_SIZE_MB,
              },
            ),
          )
          return
        }

        // Convert URL to base64 for consistent storage
        const imgResponse = await fetch(url)
        const blob = await imgResponse.blob()

        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setBackgroundImage(base64)
          onSuccess()
          setBackgroundLoaded(false) // Reset to trigger fade-in
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        console.error('Error loading image from URL:', error)
        errorToast(
          t(
            'Failed to load image from URL. Please check the URL and try again.',
          ),
        )
      }
    },
    [setBackgroundImage, t],
  )

  const showUndoableToast = useCallback(() => {
    const handleUndo = () => {
      setBackgroundImage(undefined)
      successToast(t('Background image removed'))
    }

    // Show success toast
    addToast({
      title: t('Background image updated'),
      color: 'success',
      severity: 'success',
      endContent: (
        <Button size="sm" color="success" variant="flat" onPress={handleUndo}>
          {t('Undo')}
        </Button>
      ),
    })
  }, [setBackgroundImage, t])

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        errorToast(t('Please select an image file'))
        return
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errorToast(
          t(
            'Image file is too large. Please select a file smaller than {size}MB.',
            {
              size: MAX_FILE_SIZE_MB,
            },
          ),
        )
        return
      }

      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setBackgroundImage(base64)
          showUndoableToast()
          setBackgroundLoaded(false) // Reset to trigger fade-in
        }
        reader.readAsDataURL(file)
      } catch (error) {
        errorToast(t('Failed to process image file'))
      }
    },
    [setBackgroundImage, showUndoableToast, t],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    // Accept both files and URLs (images from web/other tabs)
    if (
      e.dataTransfer.types.includes('Files') ||
      e.dataTransfer.types.includes('text/uri-list')
    ) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      dragCounterRef.current = 0

      // Check for files first
      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith('image/'))

      if (imageFile) {
        handleImageFile(imageFile)
        return
      }

      // Check for URLs (images dragged from web pages/other tabs)
      const urlData =
        e.dataTransfer.getData('text/uri-list') ||
        e.dataTransfer.getData('text/plain')
      if (urlData) {
        const urls = urlData
          .split('\n')
          .filter((url) => url.trim() && !url.startsWith('#'))
        const imageUrl = urls.find((url) => {
          try {
            new URL(url) // Validate URL format
            return url.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?|$)/i) // Basic image extension check
          } catch {
            return false
          }
        })

        if (imageUrl) {
          handleImageUrl(imageUrl, showUndoableToast)
          return
        }

        // If we have a URL but it doesn't look like an image, try it anyway
        const firstUrl = urls[0]
        if (firstUrl) {
          try {
            new URL(firstUrl)
            handleImageUrl(firstUrl, showUndoableToast)
            return
          } catch {
            // Invalid URL format
          }
        }
      }

      // No valid files or URLs found
      if (files.length > 0) {
        errorToast(t('Please drop an image file'))
      } else {
        errorToast(
          t('Please drop an image file or drag an image from a website'),
        )
      }
    },
    [handleImageFile, handleImageUrl, showUndoableToast, t],
  )

  useEffect(() => {
    if (backgroundImage && !backgroundLoaded) {
      // Preload image to ensure smooth fade-in
      const img = new Image()
      img.onload = () => setBackgroundLoaded(true)
      img.src = backgroundImage
    }
  }, [backgroundImage, backgroundLoaded])

  return {
    backgroundImage,
    backgroundLoaded,
    isDragOver,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    handleImageFile,
    setBackgroundImage,
  }
}
