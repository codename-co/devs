import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { renderAbc, synth, type SynthOptions } from 'abcjs'
import { Alert, Button, Progress } from '@heroui/react'

import './Score.css'
import { Icon } from '@/components/Icon'

interface AbcRenderResult {
  html: string
  visualObj: any
  error?: string
  loading: boolean
}

const DEFAULT_ABC_OPTIONS = {
  responsive: 'resize' as const,
  visualTranspose: 0,
  oneSvgPerLine: false,
}

const useAbc = (code: string) => {
  const [result, setResult] = useState<AbcRenderResult>({
    html: '',
    visualObj: null,
    loading: false,
  })

  const scoreId = useMemo(
    () => `abc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    [code],
  )

  useEffect(() => {
    const renderABC = async () => {
      try {
        setResult((prev) => ({ ...prev, loading: true, error: undefined }))

        if (typeof window === 'undefined') {
          throw new Error('ABC.js requires a browser environment')
        }

        // Create container for rendering
        const abcContainer = document.createElement('div')
        abcContainer.className = 'widget abc-notation-isolated'

        try {
          const visualObj = renderAbc(
            abcContainer,
            code,
            DEFAULT_ABC_OPTIONS,
          )[0]

          let html = abcContainer.outerHTML

          setResult({
            html,
            visualObj,
            loading: false,
          })
        } catch (renderError) {
          // If rendering fails, show the partial content in a preview
          console.log('ABC rendering failed, showing preview:', renderError)
          const previewHtml = /* html */ `
            <div class="abc-preview-container p-4 bg-warning-50 border border-warning-200 rounded-md">
              <p class="text-sm text-warning-700 mb-2">ABC notation preview (streaming...)</p>
              <pre class="text-xs font-mono bg-default-100 p-2 rounded overflow-x-auto">${code}</pre>
            </div>
          `
          setResult({ html: previewHtml, visualObj: null, loading: false })
        }
      } catch (err) {
        console.error('Error rendering ABC notation:', err)
        setResult({
          html: '',
          visualObj: null,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to render ABC notation',
          loading: false,
        })
      }
    }

    renderABC()
  }, [code, scoreId])

  return { scoreId, ...result }
}

/**
 * ABC music notation renderer
 */
export const Score = ({ code }: { code: string }) => {
  const { html, visualObj, error, loading } = useAbc(code)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [synthReady, setSynthReady] = useState(false)

  // Audio references
  const synthRef = useRef<any>(null)
  const synthControllerRef = useRef<any>(null)
  const animationFrameRef = useRef<number>(undefined)

  // Initialize audio synth after rendering
  useEffect(() => {
    if (!visualObj) return

    const initAudio = async () => {
      try {
        const _synth = new synth.CreateSynth()
        const myContext = new AudioContext()
        const audioParams: SynthOptions = {
          program: 1, // Piano
        }

        await _synth.init({
          audioContext: myContext,
          visualObj: visualObj,
          options: audioParams,
        })

        synthRef.current = _synth
        synthControllerRef.current = null
        setSynthReady(true)

        // Debug: log available methods
        console.log('Synth object:', _synth)
        console.log('Synth methods:', Object.getOwnPropertyNames(_synth))
      } catch (reason) {
        console.log('Audio init failed:', reason)
      }
    }

    initAudio()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (synthRef.current && synthRef.current.stop) {
        synthRef.current.stop()
      }
      synthRef.current = null
      synthControllerRef.current = null
      setSynthReady(false)
    }
  }, [visualObj])

  // Progress tracking during playback
  const updateProgress = useCallback(() => {
    if (synthRef.current && isPlaying) {
      let currentSeconds = currentTime + 0.1 // Simple time increment
      let progressPercent = progress

      // Check if we have access to actual synth timing
      try {
        // Try different ways to get current time from abcjs synth
        if (synthRef.current.getCurrentTime) {
          const synthTime = synthRef.current.getCurrentTime()
          console.log('Synth current time:', synthTime)
          if (typeof synthTime === 'number' && synthTime >= 0) {
            currentSeconds = synthTime
          }
        }

        // Simple progress calculation based on elapsed time
        // Most ABC songs are 1-3 minutes, so we'll use a reasonable estimate
        progressPercent = Math.min((currentSeconds / 60) * 100, 99)
      } catch (e) {
        console.log('Error getting synth time:', e)
      }

      setCurrentTime(currentSeconds)
      setProgress(progressPercent)

      // Continue animation frame
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [isPlaying, currentTime, progress])

  // Play/pause handler
  const handlePlayPause = useCallback(async () => {
    if (!synthRef.current || !visualObj) return

    try {
      if (isPlaying) {
        // Pause using synth
        if (synthRef.current.pause) {
          synthRef.current.pause()
        }
        setIsPlaying(false)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      } else {
        // Play using synth
        if (synthRef.current.prime) {
          await synthRef.current.prime()
        }
        if (synthRef.current.start) {
          synthRef.current.start()
        }
        setIsPlaying(true)
        setProgress(0) // Reset progress when starting
        setCurrentTime(0) // Reset current time
        updateProgress()
      }
    } catch (error) {
      console.log('Playback failed:', error)
    }
  }, [isPlaying, visualObj, updateProgress])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <p className="text-sm text-default-600">Loading score…</p>
  }

  if (error) {
    return (
      <Alert color="danger" title="ABC rendering error">
        {error}
      </Alert>
    )
  }

  return (
    <div ref={wrapperRef} className="abc-notation-container space-y-4">
      <div dangerouslySetInnerHTML={{ __html: html }} />

      {visualObj && (
        <div className="abc-player-controls space-y-3 p-4 bg-default-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={isPlaying ? 'solid' : 'flat'}
              onPress={handlePlayPause}
              isDisabled={!synthReady}
              isIconOnly
            >
              <Icon name={isPlaying ? 'Pause' : 'Play'} />
            </Button>

            <div className="flex-1 flex items-center gap-2 text-sm text-default-600">
              <span className="min-w-[40px]">{formatTime(currentTime)}</span>
              <Progress
                value={progress}
                className="flex-1"
                size="sm"
                minValue={0}
                maxValue={100}
              />
              <span className="min-w-[40px]">--:--</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
