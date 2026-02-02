import { useCallback, useState } from 'react'

interface UseScreenCaptureOptions {
  onCapture?: (file: File) => void
  onError?: (error: Error) => void
}

interface UseScreenCaptureReturn {
  isCapturing: boolean
  isSupported: boolean
  captureScreen: () => Promise<File | null>
}

/**
 * Hook for capturing a screenshot from screen sharing.
 * Requests screen share permission, captures a single frame, then stops the stream.
 */
export function useScreenCapture({
  onCapture,
  onError,
}: UseScreenCaptureOptions = {}): UseScreenCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)

  // Check if screen capture is supported
  const isSupported =
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getDisplayMedia' in navigator.mediaDevices

  const captureScreen = useCallback(async (): Promise<File | null> => {
    if (!isSupported) {
      const error = new Error('Screen capture is not supported in this browser')
      onError?.(error)
      return null
    }

    setIsCapturing(true)

    try {
      // Request screen sharing
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      })

      // Get the video track
      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error('No video track available')
      }

      // Create a video element to capture the frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => resolve())
            .catch(reject)
        }
        video.onerror = () => reject(new Error('Failed to load video'))
      })

      // Give the video a moment to render the first frame
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create canvas and capture the frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }
      ctx.drawImage(video, 0, 0)

      // Stop the stream immediately after capturing
      stream.getTracks().forEach((track) => track.stop())

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0)
      })

      if (!blob) {
        throw new Error('Failed to create image blob')
      }

      // Create a File object with a timestamp-based name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const file = new File([blob], `screenshot-${timestamp}.png`, {
        type: 'image/png',
        lastModified: Date.now(),
      })

      onCapture?.(file)
      return file
    } catch (error) {
      // Handle user cancellation gracefully
      if (error instanceof Error && error.name === 'NotAllowedError') {
        // User cancelled the screen share - this is not an error
        return null
      }
      const captureError =
        error instanceof Error ? error : new Error('Screen capture failed')
      onError?.(captureError)
      return null
    } finally {
      setIsCapturing(false)
    }
  }, [isSupported, onCapture, onError])

  return {
    isCapturing,
    isSupported,
    captureScreen,
  }
}
