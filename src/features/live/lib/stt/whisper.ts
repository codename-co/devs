/**
 * Whisper STT Provider (ONNX)
 *
 * Uses onnx-community/whisper models for SOTA speech recognition.
 * Automatically selects optimal model based on available memory.
 *
 * Model Options:
 * - whisper-large-v3-turbo: ~800MB, best quality, multilingual
 * - whisper-small: ~200MB, good quality, multilingual
 * - whisper-base: ~140MB, decent quality, multilingual
 * - whisper-tiny: ~75MB, faster but lower quality
 *
 * Pros: SOTA quality, multilingual, works offline
 * Cons: Large download, slower than Moonshine
 */

import type {
  STTProvider,
  STTResult,
  STTConfig,
  STTProviderType,
} from '../types'
import {
  pipeline,
  env,
  AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

// Fallback model chain - from largest/best to smallest/fastest
// Note: whisper-large-v3-turbo requires ~6GB+ for the encoder alone (2.4GB file)
// Memory requirements are much higher than model file sizes due to ONNX runtime overhead
const WHISPER_FALLBACK_MODELS = [
  {
    id: 'onnx-community/whisper-large-v3-turbo',
    minMemoryGB: 12,
    size: '~2.5GB+',
  },
  { id: 'onnx-community/whisper-small', minMemoryGB: 4, size: '~500MB' },
  { id: 'onnx-community/whisper-base', minMemoryGB: 2, size: '~300MB' },
  { id: 'onnx-community/whisper-tiny', minMemoryGB: 1, size: '~150MB' },
]

/**
 * Estimate available memory for model loading
 * Returns estimated available memory in GB
 *
 * Note: Browser memory limits are complex and vary by:
 * - Browser (Chrome ~4GB limit per tab, Firefox varies)
 * - OS (32-bit vs 64-bit)
 * - Available system RAM
 * - Other tabs/processes consuming memory
 */
function estimateAvailableMemoryGB(): number {
  // Use deviceMemory API if available (returns total RAM in GB, capped at 8)
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory) {
    // Be very conservative - browsers typically can't use more than 4GB per tab
    // and we need headroom for the ONNX runtime overhead
    const browserLimit = Math.min(deviceMemory, 4)
    // Use only ~25% as available for model loading to leave room for other allocations
    return browserLimit * 0.25
  }

  // Without deviceMemory API, be very conservative
  // Most browsers struggle with allocations > 1-2GB
  return 1
}

/**
 * Select the best Whisper model based on available memory
 *
 * The large-v3-turbo model requires significant memory (encoder alone is 2.4GB)
 * and will fail on most consumer devices. We default to smaller models
 * unless explicitly requested and memory seems sufficient.
 */
function selectOptimalModel(requestedModel: string): {
  id: string
  size: string
} {
  const availableGB = estimateAvailableMemoryGB()
  console.log(
    `[Whisper STT] Estimated available memory: ${availableGB.toFixed(1)}GB`,
  )

  // If a specific smaller model was requested, use it
  const isLargeModel =
    requestedModel === 'onnx-community/whisper-large-v3-turbo'
  if (!isLargeModel) {
    const modelInfo = WHISPER_FALLBACK_MODELS.find(
      (m) => m.id === requestedModel,
    )
    return { id: requestedModel, size: modelInfo?.size || 'unknown' }
  }

  // For the large model, be very conservative about when to attempt it
  // The encoder file alone is 2.4GB and requires much more memory to process
  if (availableGB < 12) {
    console.log(
      `[Whisper STT] Large model requires ~12GB+ memory, ` +
        `only ${availableGB.toFixed(1)}GB estimated available. Using smaller model.`,
    )
  }

  // Find the largest model that fits in available memory
  for (const model of WHISPER_FALLBACK_MODELS) {
    if (availableGB >= model.minMemoryGB) {
      if (model.id !== requestedModel) {
        console.log(
          `[Whisper STT] Selected ${model.id} (${model.size}) based on available memory`,
        )
      }
      return { id: model.id, size: model.size }
    }
  }

  // Ultimate fallback to tiny model
  const fallback = WHISPER_FALLBACK_MODELS[WHISPER_FALLBACK_MODELS.length - 1]
  console.warn(`[Whisper STT] Low memory detected, using ${fallback.id}`)
  return { id: fallback.id, size: fallback.size }
}

export class WhisperSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'whisper'

  private transcriber: AutomaticSpeechRecognitionPipeline | null = null
  private resultCallbacks: Set<(result: STTResult) => void> = new Set()
  private errorCallbacks: Set<(error: Error) => void> = new Set()
  private _isSupported = true
  private _isLoading = false
  private _isReady = false
  private requestedModelId: string
  private actualModelId: string
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private isRecording = false
  private language?: string // Language hint for transcription (Whisper supports 99+ languages)

  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(modelId = 'onnx-community/whisper-small') {
    // Note: whisper-large-v3-turbo (2.4GB+ encoder) doesn't work in most browsers
    // due to ArrayBuffer allocation limits. Default to whisper-small for reliability.
    this.requestedModelId = modelId
    this.actualModelId = modelId // Will be updated during initialization
  }

  get isSupported(): boolean {
    return this._isSupported
  }

  get isLoading(): boolean {
    return this._isLoading
  }

  get isReady(): boolean {
    return this._isReady
  }

  /**
   * Get the model ID that was actually loaded.
   * May differ from requested model if memory-based fallback occurred.
   */
  get modelId(): string {
    return this.actualModelId
  }

  setProgressCallback(
    callback: (progress: {
      status: string
      loaded?: number
      total?: number
      progress?: number
    }) => void,
  ): void {
    this.progressCallback = callback
  }

  async initialize(): Promise<void> {
    if (this._isReady) return

    this._isLoading = true

    try {
      // Select optimal model based on available memory
      const { id: selectedModelId, size } = selectOptimalModel(
        this.requestedModelId,
      )
      this.actualModelId = selectedModelId

      console.log(
        `[Whisper STT] Loading model: ${this.actualModelId} (${size})`,
      )

      // Check for WebGPU support
      const hasWebGPU = 'gpu' in navigator
      const device = hasWebGPU ? 'webgpu' : 'wasm'

      console.log(`[Whisper STT] Using device: ${device}`)

      // Attempt to load the model with retry logic for memory errors
      let lastError: Error | null = null
      let modelIndex = WHISPER_FALLBACK_MODELS.findIndex(
        (m) => m.id === this.actualModelId,
      )

      while (modelIndex < WHISPER_FALLBACK_MODELS.length) {
        const currentModel = WHISPER_FALLBACK_MODELS[modelIndex]

        try {
           
          this.transcriber = (await pipeline(
            'automatic-speech-recognition',
            currentModel.id,
            {
              device,
              progress_callback: (progress: {
                status?: string
                loaded?: number
                total?: number
                progress?: number
              }) => {
                this.progressCallback?.({
                  status: progress.status || 'loading',
                  loaded: progress.loaded,
                  total: progress.total,
                  progress: progress.progress,
                })
              },
            } as any,
          )) as any

          this.actualModelId = currentModel.id
          this._isReady = true
          console.log(
            `[Whisper STT] Model loaded successfully: ${currentModel.id}`,
          )
          return
        } catch (error) {
          lastError = error as Error
          const isMemoryError =
            error instanceof RangeError ||
            (error instanceof Error &&
              (error.message.includes('allocation failed') ||
                error.message.includes('out of memory') ||
                error.message.includes('ArrayBuffer')))

          if (
            isMemoryError &&
            modelIndex < WHISPER_FALLBACK_MODELS.length - 1
          ) {
            modelIndex++
            const nextModel = WHISPER_FALLBACK_MODELS[modelIndex]
            console.warn(
              `[Whisper STT] Memory allocation failed for ${currentModel.id}, ` +
                `falling back to smaller model: ${nextModel.id} (${nextModel.size})`,
            )
            continue
          }

          // Not a memory error or no more fallbacks available
          throw error
        }
      }

      // If we get here, all fallbacks failed
      throw lastError || new Error('Failed to load any Whisper model')
    } catch (error) {
      console.error('[Whisper STT] Failed to load model:', error)
      throw error
    } finally {
      this._isLoading = false
    }
  }

  async start(config?: Partial<STTConfig>): Promise<void> {
    if (!this._isReady) {
      await this.initialize()
    }

    if (this.isRecording) {
      return
    }

    // Store language for transcription context
    // Whisper supports 99+ languages and benefits from language hints
    this.language = config?.language

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      this.audioContext = new AudioContext({ sampleRate: 16000 })
      this.isRecording = true
      this.startContinuousTranscription(config)
    } catch (error) {
      console.error('[Whisper STT] Failed to start recording:', error)
      throw error
    }
  }

  private async startContinuousTranscription(
    _config?: Partial<STTConfig>,
  ): Promise<void> {
    const sampleRate = 16000
    // Whisper works better with longer chunks
    const chunkDuration = 5 // seconds per chunk
    const samplesPerChunk = sampleRate * chunkDuration

    const bufferSize = 4096
    const scriptProcessor = this.audioContext!.createScriptProcessor(
      bufferSize,
      1,
      1,
    )

    const source = this.audioContext!.createMediaStreamSource(this.stream!)
    source.connect(scriptProcessor)
    scriptProcessor.connect(this.audioContext!.destination)

    let audioBuffer: Float32Array[] = []
    let sampleCount = 0

    scriptProcessor.onaudioprocess = async (event) => {
      if (!this.isRecording) return

      const inputData = event.inputBuffer.getChannelData(0)
      const samples = new Float32Array(inputData)
      audioBuffer.push(samples)
      sampleCount += samples.length

      if (sampleCount >= samplesPerChunk) {
        const combinedBuffer = this.combineBuffers(audioBuffer)
        audioBuffer = []
        sampleCount = 0

        this.transcribe(combinedBuffer)
          .then((result) => {
            if (result.text.trim()) {
              this.emitResult(result)
            }
          })
          .catch((error) => {
            console.error('[Whisper STT] Transcription error:', error)
          })
      }
    }
  }

  private combineBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0)
    const combined = new Float32Array(totalLength)
    let offset = 0
    for (const buffer of buffers) {
      combined.set(buffer, offset)
      offset += buffer.length
    }
    return combined
  }

  async stop(): Promise<void> {
    this.isRecording = false

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
  }

  async transcribe(audioData: Float32Array | ArrayBuffer): Promise<STTResult> {
    if (!this.transcriber) {
      throw new Error('Transcriber not initialized. Call initialize() first.')
    }

    let audio: Float32Array
    if (audioData instanceof ArrayBuffer) {
      audio = new Float32Array(audioData)
    } else {
      audio = audioData
    }

    const startTime = performance.now()

    try {
      // Build transcription options with language hint
      const transcribeOptions: Record<string, unknown> = {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      }

      // Add language hint if available (extracted from BCP-47 code like 'fr-FR' -> 'fr')
      if (this.language) {
        const langCode = this.language.split('-')[0].toLowerCase()
        transcribeOptions.language = langCode
        console.log(`[Whisper STT] Using language hint: ${langCode}`)
      }

      const result = await this.transcriber(audio, transcribeOptions)

      const endTime = performance.now()
      console.log(
        `[Whisper STT] Transcription took ${(endTime - startTime).toFixed(0)}ms`,
      )

      return {
        text: (result as any).text || '',
        isFinal: true,
        confidence: 1.0,
        language: (result as any).language,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[Whisper STT] Transcription failed:', error)
      throw error
    }
  }

  onResult(callback: (result: STTResult) => void): () => void {
    this.resultCallbacks.add(callback)
    return () => this.resultCallbacks.delete(callback)
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.add(callback)
    return () => this.errorCallbacks.delete(callback)
  }

  private emitResult(result: STTResult): void {
    this.resultCallbacks.forEach((cb) => cb(result))
  }

  async dispose(): Promise<void> {
    await this.stop()
    this.transcriber = null
    this.resultCallbacks.clear()
    this.errorCallbacks.clear()
    this._isReady = false
  }
}
