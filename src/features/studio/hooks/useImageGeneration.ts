/**
 * useImageGeneration Hook
 *
 * React hook for managing image generation state and actions.
 */

import { useState, useCallback, useRef } from 'react'
import {
  ImageGenerationSettings,
  ImageGenerationResponse,
  GeneratedImage,
  ImageProviderConfig,
  ImageProvider,
  DEFAULT_IMAGE_SETTINGS,
} from '../types'
import { ImageGenerationService } from '../services/image-generation-service'

export interface UseImageGenerationOptions {
  /** Default provider configuration */
  defaultConfig?: Partial<ImageProviderConfig>
  /** Callback when generation starts */
  onGenerationStart?: () => void
  /** Callback when generation completes */
  onGenerationComplete?: (response: ImageGenerationResponse) => void
  /** Callback when generation fails */
  onGenerationError?: (error: Error) => void
}

export interface UseImageGenerationReturn {
  /** Whether generation is in progress */
  isGenerating: boolean
  /** Current generation progress (0-100) */
  progress: number
  /** Last error message */
  error: string | null
  /** Last generation response */
  lastResponse: ImageGenerationResponse | null
  /** Generated images from all generations */
  images: GeneratedImage[]
  /** Generate images from a prompt */
  generate: (
    prompt: string,
    settings?: Partial<ImageGenerationSettings>,
    config?: ImageProviderConfig,
  ) => Promise<ImageGenerationResponse | null>
  /** Clear all generated images */
  clearImages: () => void
  /** Remove a specific image */
  removeImage: (imageId: string) => void
  /** Download an image */
  downloadImage: (image: GeneratedImage, filename?: string) => void
  /** Cancel current generation (if possible) */
  cancel: () => void
}

export function useImageGeneration(
  options: UseImageGenerationOptions = {},
): UseImageGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<ImageGenerationResponse | null>(null)
  const [images, setImages] = useState<GeneratedImage[]>([])

  const abortControllerRef = useRef<AbortController | null>(null)

  const generate = useCallback(
    async (
      prompt: string,
      settings: Partial<ImageGenerationSettings> = {},
      config?: ImageProviderConfig,
    ): Promise<ImageGenerationResponse | null> => {
      if (!prompt.trim()) {
        setError('Please enter a prompt')
        return null
      }

      const providerConfig = config || {
        provider: (options.defaultConfig?.provider || 'openai') as ImageProvider,
        apiKey: options.defaultConfig?.apiKey || '',
        ...options.defaultConfig,
      }

      if (!providerConfig.apiKey) {
        setError('API key is required')
        return null
      }

      setIsGenerating(true)
      setProgress(0)
      setError(null)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      options.onGenerationStart?.()

      // Simulate progress (since most APIs don't provide real progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      try {
        const fullSettings: ImageGenerationSettings = {
          ...DEFAULT_IMAGE_SETTINGS,
          ...settings,
        }

        const response = await ImageGenerationService.generate(
          prompt,
          fullSettings,
          providerConfig as ImageProviderConfig,
        )

        clearInterval(progressInterval)
        setProgress(100)

        if (response.request.status === 'failed') {
          throw new Error(response.request.error || 'Generation failed')
        }

        setLastResponse(response)
        setImages((prev) => [...response.images, ...prev])

        options.onGenerationComplete?.(response)

        return response
      } catch (err) {
        clearInterval(progressInterval)
        const errorMessage = err instanceof Error ? err.message : 'Generation failed'
        setError(errorMessage)
        options.onGenerationError?.(err instanceof Error ? err : new Error(errorMessage))
        return null
      } finally {
        setIsGenerating(false)
        setProgress(0)
        abortControllerRef.current = null
      }
    },
    [options],
  )

  const clearImages = useCallback(() => {
    setImages([])
    setLastResponse(null)
    setError(null)
  }, [])

  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
  }, [])

  const downloadImage = useCallback(
    async (image: GeneratedImage, filename?: string) => {
      try {
        let blob: Blob

        if (image.base64) {
          // Convert base64 to blob
          const byteCharacters = atob(image.base64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          blob = new Blob([byteArray], { type: `image/${image.format}` })
        } else {
          // Fetch from URL
          const response = await fetch(image.url)
          blob = await response.blob()
        }

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename || `generated-image-${image.id}.${image.format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Failed to download image:', err)
        setError('Failed to download image')
      }
    },
    [],
  )

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    isGenerating,
    progress,
    error,
    lastResponse,
    images,
    generate,
    clearImages,
    removeImage,
    downloadImage,
    cancel,
  }
}
