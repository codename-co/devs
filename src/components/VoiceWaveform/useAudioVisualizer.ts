import { useEffect, useRef, useCallback, useState } from 'react'

interface UseAudioVisualizerOptions {
  isActive: boolean
  fftSize?: number
  smoothingTimeConstant?: number
}

interface UseAudioVisualizerReturn {
  analyserRef: React.RefObject<AnalyserNode | null>
  dataArray: Uint8Array | null
  isInitialized: boolean
  error: string | null
}

/**
 * Hook to capture microphone audio and provide an AnalyserNode for visualization.
 * Manages AudioContext lifecycle and microphone stream.
 */
export function useAudioVisualizer({
  isActive,
  fftSize = 256,
  smoothingTimeConstant = 0.8,
}: UseAudioVisualizerOptions): UseAudioVisualizerReturn {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleanup = useCallback(() => {
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setDataArray(null)
    setIsInitialized(false)
  }, [])

  const initialize = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Create analyser node
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = smoothingTimeConstant
      analyserRef.current = analyser

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      // Create data array for frequency/time data
      const bufferLength = analyser.frequencyBinCount
      setDataArray(new Uint8Array(new ArrayBuffer(bufferLength)))

      setIsInitialized(true)
    } catch (err) {
      console.error('Failed to initialize audio visualizer:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to access microphone',
      )
      cleanup()
    }
  }, [fftSize, smoothingTimeConstant, cleanup])

  useEffect(() => {
    if (isActive) {
      initialize()
    } else {
      cleanup()
    }

    return cleanup
  }, [isActive, initialize, cleanup])

  return {
    analyserRef,
    dataArray,
    isInitialized,
    error,
  }
}
