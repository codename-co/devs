import { useEffect, useRef, useCallback } from 'react'
import { useAudioVisualizer } from './useAudioVisualizer'

interface WaveLayer {
  opacity: number
  lineWidth: number
  phaseOffset: number
  scale: number
  yOffset: number // Vertical offset for stacking
  color: string
  frequency: number // Wave frequency multiplier
  speed: number // Animation speed multiplier
}

interface VoiceWaveformProps {
  isActive: boolean
  width?: number
  height?: number
  color?: string
  lineWidth?: number
  className?: string
}

// Generate beautiful flowing wave layers
const generateWaveLayers = (): WaveLayer[] => {
  const layers: WaveLayer[] = []
  const layerCount = 16

  // Smooth gradient from green/yellow to cyan/blue
  const colors = [
    '#22c55e',
    '#4ade80',
    '#86efac',
    '#a3e635',
    '#d9f99d',
    '#fde047',
    '#facc15',
    '#22d3ee',
    '#38bdf8',
    '#60a5fa',
    '#818cf8',
    '#a78bfa',
  ]

  for (let i = 0; i < layerCount; i++) {
    const progress = i / (layerCount - 1)
    const colorIndex = Math.floor(progress * (colors.length - 1))
    const color = colors[colorIndex]

    layers.push({
      opacity: 0.5 + Math.sin(progress * Math.PI) * 0.35,
      lineWidth: 1.5 + Math.sin(progress * Math.PI) * 1,
      phaseOffset: i * 0.4, // Gentle phase variation
      scale: 0.6 + Math.sin(progress * Math.PI) * 0.4,
      yOffset: (progress - 0.5) * 60, // Vertical spread
      color,
      frequency: 0.8 + progress * 0.4, // Varied frequencies
      speed: 0.8 + Math.random() * 0.4, // Slightly varied speeds
    })
  }

  return layers
}

const WAVE_LAYERS = generateWaveLayers()

// Attempt to smooth an array of values using gaussian-like smoothing
const smoothArray = (arr: Uint8Array, windowSize: number = 8): number[] => {
  const result: number[] = []
  const halfWindow = Math.floor(windowSize / 2)

  for (let i = 0; i < arr.length; i++) {
    let sum = 0
    let weight = 0

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = Math.max(0, Math.min(arr.length - 1, i + j))
      const w = 1 - Math.abs(j) / (halfWindow + 1) // Triangle weight
      sum += arr[idx] * w
      weight += w
    }

    result.push(sum / weight)
  }

  return result
}

/**
 * Live audio waveform visualization component.
 * Displays beautiful flowing waves representing voice.
 */
export function VoiceWaveform({
  isActive,
  width = 1920,
  height = 200,
  lineWidth = 2,
  className = '',
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  const smoothedDataRef = useRef<number[]>([])
  const targetDataRef = useRef<number[]>([])

  const { analyserRef, dataArray, isInitialized } = useAudioVisualizer({
    isActive,
    fftSize: 256, // Lower for smoother data
    smoothingTimeConstant: 0.92, // High smoothing
  })

  const drawWaveLayer = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      smoothedData: number[],
      layer: WaveLayer,
      canvasWidth: number,
      canvasHeight: number,
      time: number,
    ) => {
      const centerY = canvasHeight / 2 + layer.yOffset

      // Draw intermediate wavelets (back to front)
      const waveletCount = 5
      for (let w = waveletCount - 1; w >= 0; w--) {
        const waveletOffset = (w - Math.floor(waveletCount / 2)) * 4
        const opacityFactor =
          w === Math.floor(waveletCount / 2)
            ? 1
            : 0.15 +
              (1 -
                Math.abs(w - Math.floor(waveletCount / 2)) /
                  Math.floor(waveletCount / 2)) *
                0.35
        const phaseVariation = w * 0.15

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Soft glow
        ctx.shadowColor = layer.color
        ctx.shadowBlur = w === Math.floor(waveletCount / 2) ? 25 : 8
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        const points: { x: number; y: number }[] = []

        // Generate smooth wave points
        const numPoints = 100
        for (let i = 0; i <= numPoints; i++) {
          const progress = i / numPoints
          const x = progress * canvasWidth

          const dataIndex = Math.floor(progress * (smoothedData.length - 1))
          const audioValue = smoothedData[dataIndex] || 128

          // Calculate amplitude based on audio level (deviation from center)
          // When silent (128), amplitude is 10%. Louder sounds increase amplitude.
          const audioDeviation = Math.abs(audioValue - 128) / 128
          const amplitudeMultiplier = 0.05 + audioDeviation * 10.95 // 10% base + up to 90% from audio

          const baseWave =
            Math.sin(
              progress * Math.PI * 2 * layer.frequency +
                time * 0.0008 * layer.speed +
                layer.phaseOffset +
                phaseVariation,
            ) * 0.3
          const secondaryWave =
            Math.sin(
              progress * Math.PI * 4 * layer.frequency +
                time * 0.0012 * layer.speed +
                layer.phaseOffset * 2 +
                phaseVariation,
            ) * 0.15
          const tertiaryWave =
            Math.sin(
              progress * Math.PI * 1.5 +
                time * 0.0005 * layer.speed +
                phaseVariation,
            ) * 0.1

          const combinedWave =
            (baseWave + secondaryWave + tertiaryWave) * layer.scale
          const envelope = Math.sin(progress * Math.PI) ** 0.5

          // Apply amplitude multiplier based on audio level
          const y =
            centerY +
            waveletOffset +
            combinedWave * (canvasHeight * 0.4) * envelope * amplitudeMultiplier

          points.push({ x, y })
        }

        // Create gradient fill from wave color to transparent
        const gradient = ctx.createLinearGradient(
          0,
          centerY - canvasHeight * 0.3,
          0,
          centerY + canvasHeight * 0.3,
        )
        gradient.addColorStop(0, layer.color + '00') // Transparent at top
        gradient.addColorStop(0.3, layer.color + '40') // Semi-transparent
        gradient.addColorStop(0.5, layer.color + '60') // More visible at center
        gradient.addColorStop(0.7, layer.color + '40') // Semi-transparent
        gradient.addColorStop(1, layer.color + '00') // Transparent at bottom

        // Draw filled area first
        ctx.beginPath()
        ctx.globalAlpha = layer.opacity * opacityFactor * 0.4

        if (points.length > 0) {
          ctx.moveTo(points[0].x, centerY + waveletOffset)

          // Draw to first point
          ctx.lineTo(points[0].x, points[0].y)

          // Draw curve through all points
          for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2
            const yc = (points[i].y + points[i + 1].y) / 2
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
          }

          if (points.length > 2) {
            const last = points[points.length - 1]
            const secondLast = points[points.length - 2]
            ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
          }

          // Close path back to center line
          ctx.lineTo(points[points.length - 1].x, centerY + waveletOffset)
          ctx.closePath()
        }

        ctx.fillStyle = gradient
        ctx.fill()

        // Draw stroke on top
        ctx.beginPath()
        ctx.globalAlpha = layer.opacity * opacityFactor
        ctx.lineWidth =
          layer.lineWidth *
          (lineWidth / 2) *
          (w === Math.floor(waveletCount / 2) ? 1 : 0.7)
        ctx.strokeStyle = layer.color

        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y)

          for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2
            const yc = (points[i].y + points[i + 1].y) / 2
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
          }

          if (points.length > 2) {
            const last = points[points.length - 1]
            const secondLast = points[points.length - 2]
            ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
          }
        }

        ctx.stroke()
      }
    },
    [lineWidth],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current

    if (!canvas || !analyser || !dataArray) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    timeRef.current += 16

    // Get raw audio data
    analyser.getByteTimeDomainData(dataArray)

    // Smooth the audio data
    const smoothed = smoothArray(dataArray, 12)

    // Initialize target data if needed
    if (targetDataRef.current.length !== smoothed.length) {
      targetDataRef.current = [...smoothed]
      smoothedDataRef.current = [...smoothed]
    }

    // Update target
    targetDataRef.current = smoothed

    // Lerp towards target for even smoother animation
    const lerpFactor = 0.15
    for (let i = 0; i < smoothedDataRef.current.length; i++) {
      smoothedDataRef.current[i] +=
        (targetDataRef.current[i] - smoothedDataRef.current[i]) * lerpFactor
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all layers
    for (const layer of WAVE_LAYERS) {
      drawWaveLayer(
        ctx,
        smoothedDataRef.current,
        layer,
        canvas.width,
        canvas.height,
        timeRef.current,
      )
    }

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [analyserRef, dataArray, drawWaveLayer])

  useEffect(() => {
    if (isActive && isInitialized) {
      animationFrameRef.current = requestAnimationFrame(draw)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isActive, isInitialized, draw])

  // Beautiful idle animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isActive) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let idleAnimationFrame: number | null = null
    let idleTime = 0

    // Create fake "silent" audio data (all at center value)
    const silentData = new Array(128).fill(128)

    const drawIdle = () => {
      idleTime += 16
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const layer of WAVE_LAYERS) {
        drawWaveLayer(
          ctx,
          silentData,
          layer,
          canvas.width,
          canvas.height,
          idleTime,
        )
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      idleAnimationFrame = requestAnimationFrame(drawIdle)
    }

    drawIdle()

    return () => {
      if (idleAnimationFrame) {
        cancelAnimationFrame(idleAnimationFrame)
      }
    }
  }, [isActive, drawWaveLayer])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  )
}
