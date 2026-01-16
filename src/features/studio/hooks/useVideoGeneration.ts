/**
 * useVideoGeneration Hook
 *
 * React hook for managing video generation state and actions.
 * Handles the asynchronous polling pattern required by the Veo API.
 */

import { useState, useCallback, useRef } from 'react'
import {
  VideoGenerationSettings,
  VideoGenerationResponse,
  GeneratedVideo,
  VideoProviderConfig,
  VideoProvider,
  DEFAULT_VIDEO_SETTINGS,
} from '../types'
import { VideoGenerationService } from '../services/video-generation-service'

export interface UseVideoGenerationOptions {
  /** Default provider configuration */
  defaultConfig?: Partial<VideoProviderConfig>
  /** Callback when generation starts */
  onGenerationStart?: () => void
  /** Callback when generation completes */
  onGenerationComplete?: (response: VideoGenerationResponse) => void
  /** Callback when generation fails */
  onGenerationError?: (error: Error) => void
  /** Callback for progress updates */
  onProgressUpdate?: (progress: number, message: string) => void
}

export interface UseVideoGenerationReturn {
  /** Whether generation is in progress */
  isGenerating: boolean
  /** Current generation progress (0-100) */
  progress: number
  /** Current progress message */
  progressMessage: string
  /** Last error message */
  error: string | null
  /** Last generation response */
  lastResponse: VideoGenerationResponse | null
  /** Generated videos from all generations */
  videos: GeneratedVideo[]
  /** Generate video from a prompt */
  generate: (
    prompt: string,
    settings?: Partial<VideoGenerationSettings>,
    config?: VideoProviderConfig,
  ) => Promise<VideoGenerationResponse | null>
  /** Clear all generated videos */
  clearVideos: () => void
  /** Remove a specific video */
  removeVideo: (videoId: string) => void
  /** Download a video */
  downloadVideo: (video: GeneratedVideo, filename?: string) => void
  /** Cancel current generation (if possible) */
  cancel: () => void
}

export function useVideoGeneration(
  options: UseVideoGenerationOptions = {},
): UseVideoGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastResponse, setLastResponse] =
    useState<VideoGenerationResponse | null>(null)
  const [videos, setVideos] = useState<GeneratedVideo[]>([])

  const cancelRef = useRef(false)

  const generate = useCallback(
    async (
      prompt: string,
      settings: Partial<VideoGenerationSettings> = {},
      config?: VideoProviderConfig,
    ): Promise<VideoGenerationResponse | null> => {
      if (!prompt.trim()) {
        setError('Please enter a prompt')
        return null
      }

      const providerConfig = config || {
        provider: (options.defaultConfig?.provider ||
          'google') as VideoProvider,
        apiKey: options.defaultConfig?.apiKey || '',
        ...options.defaultConfig,
      }

      if (!providerConfig.apiKey) {
        setError('API key is required')
        return null
      }

      setIsGenerating(true)
      setProgress(0)
      setProgressMessage('Starting video generation...')
      setError(null)
      cancelRef.current = false

      options.onGenerationStart?.()

      try {
        const fullSettings: VideoGenerationSettings = {
          ...DEFAULT_VIDEO_SETTINGS,
          ...settings,
        }

        const response = await VideoGenerationService.generate(
          prompt,
          fullSettings,
          providerConfig as VideoProviderConfig,
          {
            onProgress: (prog, message) => {
              if (cancelRef.current) return
              setProgress(prog)
              setProgressMessage(message)
              options.onProgressUpdate?.(prog, message)
            },
            pollIntervalMs: 10000, // Poll every 10 seconds
            maxPollAttempts: 60, // Up to 10 minutes
          },
        )

        if (cancelRef.current) {
          return null
        }

        if (response.request.status === 'failed') {
          throw new Error(response.request.error || 'Video generation failed')
        }

        // Add generated videos to state
        setVideos((prev) => [...response.videos, ...prev])
        setLastResponse(response)
        options.onGenerationComplete?.(response)

        return response
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Video generation failed'
        setError(errorMessage)
        options.onGenerationError?.(
          err instanceof Error ? err : new Error(errorMessage),
        )
        return null
      } finally {
        setIsGenerating(false)
        setProgress(0)
        setProgressMessage('')
      }
    },
    [options],
  )

  const clearVideos = useCallback(() => {
    // Revoke object URLs to free memory
    videos.forEach((video) => {
      if (video.url && video.url.startsWith('blob:')) {
        URL.revokeObjectURL(video.url)
      }
    })
    setVideos([])
    setLastResponse(null)
    setError(null)
  }, [videos])

  const removeVideo = useCallback((videoId: string) => {
    setVideos((prev) => {
      const video = prev.find((v) => v.id === videoId)
      if (video?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(video.url)
      }
      return prev.filter((v) => v.id !== videoId)
    })
  }, [])

  const downloadVideo = useCallback(
    async (video: GeneratedVideo, filename?: string) => {
      try {
        let blob: Blob

        if (video.blob) {
          blob = video.blob
        } else if (video.base64) {
          // Convert base64 to blob
          const byteCharacters = atob(video.base64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          blob = new Blob([byteArray], { type: `video/${video.format}` })
        } else if (video.url && !video.url.startsWith('blob:')) {
          // Only fetch non-blob URLs (blob URLs may be invalid after page reload)
          const response = await fetch(video.url)
          blob = await response.blob()
        } else {
          throw new Error('No video data available')
        }

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download =
          filename || `generated-video-${video.id}.${video.format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Failed to download video:', err)
        setError('Failed to download video')
      }
    },
    [],
  )

  const cancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  return {
    isGenerating,
    progress,
    progressMessage,
    error,
    lastResponse,
    videos,
    generate,
    clearVideos,
    removeVideo,
    downloadVideo,
    cancel,
  }
}
