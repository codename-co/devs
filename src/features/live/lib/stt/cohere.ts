/**
 * Cohere Transcribe STT Provider (ONNX)
 *
 * Uses Cohere's dedicated ASR model for high-accuracy multilingual speech recognition.
 * Based on a Conformer encoder + Transformer decoder architecture, 2B parameters.
 *
 * Model: onnx-community/cohere-transcribe-03-2026-ONNX
 * - 2B parameters, 14 languages
 * - Best-in-class accuracy across supported languages
 * - Up to 3x faster than comparable ASR models
 * - 4-bit quantized (q4) for browser-friendly inference (~2.1GB download)
 *
 * Supported Languages (14):
 *   en, de, fr, it, es, pt, el, nl, pl, ar, vi, zh, ja, ko
 *
 * Note: Requires explicit language parameter (no auto-detection).
 * Tends to hallucinate on silence — VAD preprocessing recommended.
 *
 * Pros: SOTA multilingual accuracy, fast inference, local/private, works offline
 * Cons: Large model (~2.1GB q4), no auto language detection, no timestamps
 *
 * @see https://huggingface.co/onnx-community/cohere-transcribe-03-2026-ONNX
 * @see https://huggingface.co/CohereForAI/cohere-transcribe-03-2026
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

/** Languages supported by Cohere Transcribe */
const COHERE_SUPPORTED_LANGUAGES = new Set([
  'en', 'de', 'fr', 'it', 'es', 'pt', 'el', 'nl', 'pl', 'ar', 'vi', 'zh', 'ja', 'ko',
])

export class CohereSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'cohere'

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
  private language?: string // Language hint for transcription

  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(modelId = 'onnx-community/cohere-transcribe-03-2026-ONNX') {
    this.modelId = modelId
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
      console.log(`[Cohere STT] Loading model: ${this.modelId}`)

      // Cohere Transcribe benefits heavily from WebGPU
      const hasWebGPU = 'gpu' in navigator
      const device = hasWebGPU ? 'webgpu' : 'wasm'

      if (!hasWebGPU) {
        console.warn(
          '[Cohere STT] WebGPU not available. Using WASM fallback. ' +
            'Performance will be significantly slower for a 2B model.',
        )
      }

      console.log(`[Cohere STT] Using device: ${device}`)

      // Use q4 quantization for manageable browser download (~2.1GB)
      this.transcriber = (await pipeline(
        'automatic-speech-recognition',
        this.modelId,
        {
          dtype: 'q4',
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
      console.log('[Cohere STT] Model loaded successfully')
    } catch (error) {
      console.error('[Cohere STT] Failed to load model:', error)

      const isMemoryError =
        error instanceof RangeError ||
        (error instanceof Error &&
          (error.message.includes('allocation failed') ||
            error.message.includes('out of memory') ||
            error.message.includes('ArrayBuffer')))

      if (isMemoryError) {
        throw new Error(
          'Cohere Transcribe (2B) requires significant memory. Try Whisper for lower memory usage.',
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

    // Store language for transcription — Cohere requires explicit language
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
      console.error('[Cohere STT] Failed to start recording:', error)
      throw error
    }
  }

  private async startContinuousTranscription(
    _config?: Partial<STTConfig>,
  ): Promise<void> {
    const sampleRate = 16000
    // Use 5s chunks for real-time transcription
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
            console.error('[Cohere STT] Transcription error:', error)
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
        max_new_tokens: 1024,
      }

      // Cohere requires explicit language — no auto-detection
      if (this.language) {
        const langCode = this.language.split('-')[0].toLowerCase()
        if (COHERE_SUPPORTED_LANGUAGES.has(langCode)) {
          transcribeOptions.language = langCode
          console.log(`[Cohere STT] Using language: ${langCode}`)
        } else {
          console.warn(
            `[Cohere STT] Language '${langCode}' not supported, falling back to English`,
          )
          transcribeOptions.language = 'en'
        }
      } else {
        // Default to English when no language specified
        transcribeOptions.language = 'en'
      }

      const result = await this.transcriber(audio, transcribeOptions)

      const endTime = performance.now()
      console.log(
        `[Cohere STT] Transcription took ${(endTime - startTime).toFixed(0)}ms`,
      )

      return {
        text: (result as any).text || '',
        isFinal: true,
        confidence: 1.0,
        language: transcribeOptions.language as string,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[Cohere STT] Transcription failed:', error)
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
