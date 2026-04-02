/**
 * Parakeet STT Provider (ONNX)
 *
 * Uses NVIDIA's Parakeet model for ultra-fast, high-accuracy speech recognition.
 * Based on FastConformer architecture with CTC decoder.
 *
 * Model: onnx-community/parakeet-ctc-0.6b-ONNX (~2.5GB)
 * - 0.6B parameters
 * - #1 on OpenASR Benchmark for English
 * - Automatic punctuation and capitalization
 * - Word-level timestamps
 * - Handles audio up to 24 minutes in a single pass
 * - Supports English and French
 *
 * Performance (WER%):
 * - LibriSpeech clean: 1.87%
 * - LibriSpeech other: 3.76%
 * - Average across benchmarks: ~6%
 *
 * Pros: SOTA accuracy, automatic punctuation, local/private, works offline
 * Cons: Large download (~2.5GB), requires significant memory
 *
 * @see https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2
 * @see https://huggingface.co/onnx-community/parakeet-ctc-0.6b-ONNX
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

/**
 * Estimate available memory for model loading
 * Returns estimated available memory in GB
 *
 * Parakeet 0.6B requires ~4GB+ for comfortable inference.
 * The encoder alone is ~2.5GB, plus ONNX runtime overhead.
 */
function estimateAvailableMemoryGB(): number {
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory) {
    // Be conservative - browsers typically can't use more than 4GB per tab
    const browserLimit = Math.min(deviceMemory, 4)
    return browserLimit * 0.25
  }
  // Without deviceMemory API, be conservative
  return 1
}

export class ParakeetSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'parakeet'

  private transcriber: AutomaticSpeechRecognitionPipeline | null = null
  private resultCallbacks: Set<(result: STTResult) => void> = new Set()
  private errorCallbacks: Set<(error: Error) => void> = new Set()
  private _isSupported = true
  private _isLoading = false
  private _isReady = false
  private modelId: string
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private isRecording = false

  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(modelId = 'onnx-community/parakeet-ctc-0.6b-ONNX') {
    this.modelId = modelId

    // Check if device has enough memory for Parakeet
    const availableGB = estimateAvailableMemoryGB()
    if (availableGB < 2) {
      console.warn(
        `[Parakeet STT] Low memory detected (${availableGB.toFixed(1)}GB available). ` +
          'Parakeet requires ~4GB+. Model loading may fail.',
      )
    }
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
      console.log(`[Parakeet STT] Loading model: ${this.modelId}`)

      // Check for WebGPU support - strongly recommended for Parakeet
      const hasWebGPU = 'gpu' in navigator
      const device = hasWebGPU ? 'webgpu' : 'wasm'

      if (!hasWebGPU) {
        console.warn(
          '[Parakeet STT] WebGPU not available. Using WASM fallback. ' +
            'Performance will be significantly slower.',
        )
      }

      console.log(`[Parakeet STT] Using device: ${device}`)

      this.transcriber = (await pipeline(
        'automatic-speech-recognition',
        this.modelId,
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

      this._isReady = true
      console.log('[Parakeet STT] Model loaded successfully')
    } catch (error) {
      console.error('[Parakeet STT] Failed to load model:', error)

      const isMemoryError =
        error instanceof RangeError ||
        (error instanceof Error &&
          (error.message.includes('allocation failed') ||
            error.message.includes('out of memory') ||
            error.message.includes('ArrayBuffer')))

      if (isMemoryError) {
        throw new Error(
          'Parakeet requires ~4GB+ memory. Try Whisper or Moonshine for lower memory usage.',
        )
      }

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
      console.error('[Parakeet STT] Failed to start recording:', error)
      throw error
    }
  }

  private async startContinuousTranscription(
    _config?: Partial<STTConfig>,
  ): Promise<void> {
    const sampleRate = 16000
    // Parakeet handles longer audio well (up to 24 min), use 5s chunks for real-time
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
            console.error('[Parakeet STT] Transcription error:', error)
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
      // Parakeet CTC produces punctuated, capitalized text natively
      const result = await this.transcriber(audio, {
        return_timestamps: false,
      } as any)

      const endTime = performance.now()
      console.log(
        `[Parakeet STT] Transcription took ${(endTime - startTime).toFixed(0)}ms`,
      )

      return {
        text: (result as any).text || '',
        isFinal: true,
        confidence: 1.0,
        language: 'en',
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[Parakeet STT] Transcription failed:', error)
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
