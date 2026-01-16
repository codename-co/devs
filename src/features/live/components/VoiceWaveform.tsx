import { useEffect, useRef, useCallback } from 'react'
import { useAudioVisualizer } from './useAudioVisualizer'

interface WaveLayer {
  opacity: number
  lineWidth: number
  phaseOffset: number
  scale: number
  yOffset: number
  color: string
  frequency: number
  speed: number
  horizontalDrift: number
  driftSpeed: number
  // Pre-computed color variants for gradients
  colorTransparent: string
  colorSemi: string
  colorVisible: string
  // Audio-reactive movement
  audioReactiveX: boolean
  audioReactiveSpeed: number // How much audio affects X movement (0-1)
}

interface VoiceWaveformProps {
  isActive: boolean
  width?: number
  height?: number
  color?: string
  lineWidth?: number
  className?: string
  /** Optional TTS AnalyserNode for visualizing TTS playback audio */
  ttsAnalyserRef?: React.RefObject<AnalyserNode | null>
}

// Pre-compute wave layers once at module level
const generateWaveLayers = (): WaveLayer[] => {
  const layers: WaveLayer[] = []
  const layerCount = 6 // Reduced from 8 for performance

  const colors = [
    // '#22c55e',
    // '#4ade80',
    // '#86efac',
    // '#a3e635',
    '#d9f99d',
    '#facc15',
    '#22d3ee',
    '#38bdf8',
    '#60a5fa',
    '#818cf8',
    // '#a78bfa',
  ]

  for (let i = 0; i < layerCount; i++) {
    const progress = i / (layerCount - 1)
    const color = colors[i]

    // ALL layers are audio-reactive, with varying intensity
    // Edge layers move fastest (5x multiplier), middle layers slower but still reactive
    const distFromCenter = Math.abs(progress - 0.5) * 2 // 0 at center, 1 at edges
    const isEdgeLayer = distFromCenter > 0.7 // Top ~30% distance from center
    const baseReactivity = 0.5 + distFromCenter * 1.5 // 0.5 to 2.0
    const audioReactiveSpeed = isEdgeLayer ? baseReactivity * 5 : baseReactivity // Edge layers get 5x boost

    layers.push({
      opacity: 0.5 + Math.sin(progress * Math.PI) * 0.35,
      lineWidth: 1.5 + Math.sin(progress * Math.PI) * 1,
      phaseOffset: i * 0.4,
      scale: 0.1 + Math.sin(progress * Math.PI) * 0.2,
      yOffset: (progress - 0.5) * 20,
      color,
      frequency: 0.8 + progress * 0.4,
      speed: 0.8 + i * 0.05,
      horizontalDrift: ((i % 2) - 0.5) * 50, // Increased base drift
      driftSpeed: 0.3 + i * 0.08,
      // Pre-compute color variants
      colorTransparent: color + '00',
      colorSemi: color + '40',
      colorVisible: color + '60',
      // All layers are audio-reactive now
      audioReactiveX: true,
      audioReactiveSpeed,
    })
  }

  return layers
}

const WAVE_LAYERS = generateWaveLayers()
const NUM_POINTS = 60 // Reduced from 100
// Pre-allocate reusable buffer for smoothing
const smoothBuffer = new Float32Array(128)

// Optimized smoothing - writes to pre-allocated buffer
const smoothArrayInPlace = (arr: Uint8Array, windowSize: number = 6): void => {
  const halfWindow = windowSize >> 1 // Bit shift for integer division
  const len = arr.length
  const invHalfWindowPlusOne = 1 / (halfWindow + 1)

  for (let i = 0; i < len; i++) {
    let sum = 0
    let weight = 0
    const start = Math.max(0, i - halfWindow)
    const end = Math.min(len - 1, i + halfWindow)

    for (let j = start; j <= end; j++) {
      const w = 1 - Math.abs(j - i) * invHalfWindowPlusOne
      sum += arr[j] * w
      weight += w
    }

    smoothBuffer[i] = sum / weight
  }
}

/**
 * Live audio waveform visualization component.
 * Displays beautiful flowing waves representing voice.
 *
 * Performance optimizations:
 * - Pre-allocated typed arrays to avoid GC pressure
 * - Cached gradients per canvas size
 * - Reduced layer/wavelet count
 * - Removed expensive shadow blur operations
 * - Batched canvas state changes
 * - Uses requestAnimationFrame timestamp for timing
 */
export function VoiceWaveform({
  isActive,
  width = 1920,
  height = 200,
  lineWidth = 2,
  className = '',
  ttsAnalyserRef,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const smoothedDataRef = useRef<Float32Array>(new Float32Array(128))

  // Accumulated phase offset per layer for audio-reactive X movement
  const accumulatedPhaseRef = useRef<Float32Array>(
    new Float32Array(WAVE_LAYERS.length),
  )
  const lastTimestampRef = useRef<number>(0)

  // Cache gradients - recreated only when canvas size changes
  const gradientsRef = useRef<Map<string, CanvasGradient>>(new Map())
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 })

  const { analyserRef, dataArray, isInitialized } = useAudioVisualizer({
    isActive,
    fftSize: 256,
    smoothingTimeConstant: 0.92,
    ttsAnalyserRef,
  })

  // Buffer for TTS audio data
  const ttsDataArrayRef = useRef<Uint8Array | null>(null)

  // Create or get cached gradient
  const getGradient = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      layer: WaveLayer,
      centerY: number,
      canvasHeight: number,
    ): CanvasGradient => {
      const key = `${layer.color}-${Math.round(centerY)}`

      // Check if canvas size changed - invalidate cache
      const canvas = ctx.canvas
      if (
        canvas.width !== lastCanvasSizeRef.current.width ||
        canvas.height !== lastCanvasSizeRef.current.height
      ) {
        gradientsRef.current.clear()
        lastCanvasSizeRef.current = {
          width: canvas.width,
          height: canvas.height,
        }
      }

      let gradient = gradientsRef.current.get(key)
      if (!gradient) {
        gradient = ctx.createLinearGradient(
          0,
          centerY - canvasHeight * 0.3,
          0,
          centerY + canvasHeight * 0.3,
        )
        gradient.addColorStop(0, layer.colorTransparent)
        gradient.addColorStop(0.3, layer.colorSemi)
        gradient.addColorStop(0.5, layer.colorVisible)
        gradient.addColorStop(0.7, layer.colorSemi)
        gradient.addColorStop(1, layer.colorTransparent)
        gradientsRef.current.set(key, gradient)
      }
      return gradient
    },
    [],
  )

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      const analyser = analyserRef.current

      if (!canvas || !analyser || !dataArray) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return

      // Use timestamp for consistent timing
      const time = timestamp

      // Get raw audio data from microphone
      analyser.getByteTimeDomainData(dataArray as Uint8Array<ArrayBuffer>)

      // Also get TTS audio data if available and merge with mic data
      const ttsAnalyser = ttsAnalyserRef?.current
      if (ttsAnalyser) {
        // Initialize TTS data buffer if needed
        if (
          !ttsDataArrayRef.current ||
          ttsDataArrayRef.current.length !== ttsAnalyser.frequencyBinCount
        ) {
          ttsDataArrayRef.current = new Uint8Array(
            ttsAnalyser.frequencyBinCount,
          )
        }
        ttsAnalyser.getByteTimeDomainData(ttsDataArrayRef.current)

        // Merge TTS data with mic data (take max deviation from center for each sample)
        const ttsData = ttsDataArrayRef.current
        const minLen = Math.min(dataArray.length, ttsData.length)
        for (let i = 0; i < minLen; i++) {
          const micDeviation = Math.abs(dataArray[i] - 128)
          const ttsDeviation = Math.abs(ttsData[i] - 128)
          // Use the source with greater deviation from center
          if (ttsDeviation > micDeviation) {
            dataArray[i] = ttsData[i]
          }
        }
      }

      // Smooth audio data in place
      smoothArrayInPlace(dataArray, 6)

      // Lerp smoothed data for even smoother animation
      const lerpFactor = 0.2
      const smoothedData = smoothedDataRef.current
      for (let i = 0; i < smoothBuffer.length; i++) {
        smoothedData[i] += (smoothBuffer[i] - smoothedData[i]) * lerpFactor
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set common canvas state once
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const heightFactor = canvasHeight * 0.4
      const dataLen = smoothedData.length - 1

      // Calculate average audio energy (0-1 range)
      let audioEnergy = 0
      for (let i = 0; i < smoothedData.length; i++) {
        audioEnergy += Math.abs(smoothedData[i] - 128)
      }
      audioEnergy = audioEnergy / smoothedData.length / 128 // Normalize to 0-1

      // Calculate delta time for smooth accumulation
      const deltaTime =
        lastTimestampRef.current > 0 ? timestamp - lastTimestampRef.current : 16
      lastTimestampRef.current = timestamp
      const accumulatedPhase = accumulatedPhaseRef.current

      // Draw all layers
      for (let layerIdx = 0; layerIdx < WAVE_LAYERS.length; layerIdx++) {
        const layer = WAVE_LAYERS[layerIdx]
        const centerY = canvasHeight / 2 + layer.yOffset

        // Accumulate phase based on audio energy - MUCH more aggressive
        // Base drift speed + audio-boosted speed (10x stronger than before)
        const baseSpeed = 0.001
        const audioBoost =
          audioEnergy * audioEnergy * layer.audioReactiveSpeed * 0.15 // Squared for more punch
        // Direction alternates by layer index
        const direction = layerIdx % 2 === 0 ? 1 : -1
        accumulatedPhase[layerIdx] +=
          (baseSpeed + audioBoost) * deltaTime * direction

        // Combine time-based oscillation with accumulated audio-reactive drift
        // Much larger displacement values
        const baseOscillation =
          Math.sin(time * 0.0006 * layer.driftSpeed + layer.phaseOffset) *
          layer.horizontalDrift
        const audioDisplacement = 150 * layer.audioReactiveSpeed // Base displacement
        const audioOffset =
          Math.sin(accumulatedPhase[layerIdx]) *
          audioDisplacement *
          (0.5 + audioEnergy * 3)
        const horizontalOffset = baseOscillation + audioOffset

        // Pre-calculate wave parameters
        const timeSpeed1 = time * 0.0008 * layer.speed + layer.phaseOffset
        const timeSpeed2 = time * 0.0012 * layer.speed + layer.phaseOffset * 2
        const timeSpeed3 = time * 0.0005 * layer.speed
        const freqPi2 = Math.PI * 2 * layer.frequency
        const freqPi4 = Math.PI * 4 * layer.frequency
        const freqPi15 = Math.PI * 1.5

        // Build path once, reuse for fill and stroke
        ctx.beginPath()

        let firstX = 0
        const invNumPoints = 1 / NUM_POINTS

        for (let i = 0; i <= NUM_POINTS; i++) {
          const progress = i * invNumPoints
          const x = progress * canvasWidth + horizontalOffset

          const dataIndex = (progress * dataLen) | 0 // Faster than Math.floor
          const audioValue = smoothedData[dataIndex] || 128
          const audioDeviation = Math.abs(audioValue - 128) * 0.0078125 // /128
          const amplitudeMultiplier = 0.05 + audioDeviation * 10.95

          const progressPi = progress * Math.PI
          const baseWave = Math.sin(progress * freqPi2 + timeSpeed1) * 0.3
          const secondaryWave = Math.sin(progress * freqPi4 + timeSpeed2) * 0.15
          const tertiaryWave = Math.sin(progress * freqPi15 + timeSpeed3) * 0.1

          const combinedWave =
            (baseWave + secondaryWave + tertiaryWave) * layer.scale
          const envelope = Math.sqrt(Math.sin(progressPi))

          const y =
            centerY +
            combinedWave * heightFactor * envelope * amplitudeMultiplier

          if (i === 0) {
            firstX = x
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        // Draw filled area with gradient
        const gradient = getGradient(ctx, layer, centerY, canvasHeight)
        ctx.globalAlpha = layer.opacity * 0.4
        ctx.fillStyle = gradient

        // Close path for fill
        ctx.lineTo(firstX + canvasWidth, centerY)
        ctx.lineTo(firstX, centerY)
        ctx.closePath()
        ctx.fill()

        // Draw stroke - rebuild path for clean line
        ctx.beginPath()
        ctx.globalAlpha = layer.opacity

        for (let i = 0; i <= NUM_POINTS; i++) {
          const progress = i * invNumPoints
          const x = progress * canvasWidth + horizontalOffset

          const dataIndex = (progress * dataLen) | 0
          const audioValue = smoothedData[dataIndex] || 128
          const audioDeviation = Math.abs(audioValue - 128) * 0.0078125
          const amplitudeMultiplier = 0.05 + audioDeviation * 10.95

          const progressPi = progress * Math.PI
          const baseWave = Math.sin(progress * freqPi2 + timeSpeed1) * 0.3
          const secondaryWave = Math.sin(progress * freqPi4 + timeSpeed2) * 0.15
          const tertiaryWave = Math.sin(progress * freqPi15 + timeSpeed3) * 0.1

          const combinedWave =
            (baseWave + secondaryWave + tertiaryWave) * layer.scale
          const envelope = Math.sqrt(Math.sin(progressPi))

          const y =
            centerY +
            combinedWave * heightFactor * envelope * amplitudeMultiplier

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.lineWidth = layer.lineWidth * (lineWidth / 2)
        ctx.strokeStyle = layer.color
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      animationFrameRef.current = requestAnimationFrame(draw)
    },
    [analyserRef, dataArray, getGradient, lineWidth, ttsAnalyserRef],
  )

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

  // Idle animation when not active
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isActive) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let idleAnimationFrame: number | null = null

    // Reset smoothed data to center for idle state
    smoothedDataRef.current.fill(128)

    const drawIdle = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const heightFactor = canvasHeight * 0.4
      const invNumPoints = 1 / NUM_POINTS

      for (let layerIdx = 0; layerIdx < WAVE_LAYERS.length; layerIdx++) {
        const layer = WAVE_LAYERS[layerIdx]
        const centerY = canvasHeight / 2 + layer.yOffset

        const horizontalOffset =
          Math.sin(timestamp * 0.0006 * layer.driftSpeed + layer.phaseOffset) *
          layer.horizontalDrift

        const timeSpeed1 = timestamp * 0.0008 * layer.speed + layer.phaseOffset
        const timeSpeed2 =
          timestamp * 0.0012 * layer.speed + layer.phaseOffset * 2
        const timeSpeed3 = timestamp * 0.0005 * layer.speed
        const freqPi2 = Math.PI * 2 * layer.frequency
        const freqPi4 = Math.PI * 4 * layer.frequency
        const freqPi15 = Math.PI * 1.5

        // Idle uses minimal amplitude (5%)
        const amplitudeMultiplier = 0.05

        ctx.beginPath()
        let firstX = 0

        for (let i = 0; i <= NUM_POINTS; i++) {
          const progress = i * invNumPoints
          const x = progress * canvasWidth + horizontalOffset

          const progressPi = progress * Math.PI
          const baseWave = Math.sin(progress * freqPi2 + timeSpeed1) * 0.3
          const secondaryWave = Math.sin(progress * freqPi4 + timeSpeed2) * 0.15
          const tertiaryWave = Math.sin(progress * freqPi15 + timeSpeed3) * 0.1

          const combinedWave =
            (baseWave + secondaryWave + tertiaryWave) * layer.scale
          const envelope = Math.sqrt(Math.sin(progressPi))

          const y =
            centerY +
            combinedWave * heightFactor * envelope * amplitudeMultiplier

          if (i === 0) {
            firstX = x
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        const gradient = getGradient(ctx, layer, centerY, canvasHeight)
        ctx.globalAlpha = layer.opacity * 0.4
        ctx.fillStyle = gradient
        ctx.lineTo(firstX + canvasWidth, centerY)
        ctx.lineTo(firstX, centerY)
        ctx.closePath()
        ctx.fill()

        // Stroke
        ctx.beginPath()
        ctx.globalAlpha = layer.opacity

        for (let i = 0; i <= NUM_POINTS; i++) {
          const progress = i * invNumPoints
          const x = progress * canvasWidth + horizontalOffset

          const progressPi = progress * Math.PI
          const baseWave = Math.sin(progress * freqPi2 + timeSpeed1) * 0.3
          const secondaryWave = Math.sin(progress * freqPi4 + timeSpeed2) * 0.15
          const tertiaryWave = Math.sin(progress * freqPi15 + timeSpeed3) * 0.1

          const combinedWave =
            (baseWave + secondaryWave + tertiaryWave) * layer.scale
          const envelope = Math.sqrt(Math.sin(progressPi))

          const y =
            centerY +
            combinedWave * heightFactor * envelope * amplitudeMultiplier

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.lineWidth =
          ((layer.lineWidth * (lineWidth / 2) * 1) /
            (window.innerWidth * 0.4)) *
          1200
        ctx.strokeStyle = layer.color
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      idleAnimationFrame = requestAnimationFrame(drawIdle)
    }

    idleAnimationFrame = requestAnimationFrame(drawIdle)

    return () => {
      if (idleAnimationFrame) {
        cancelAnimationFrame(idleAnimationFrame)
      }
    }
  }, [isActive, getGradient, lineWidth])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  )
}
