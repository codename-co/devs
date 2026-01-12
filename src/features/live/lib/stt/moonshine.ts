/**
 * Moonshine STT Provider (ONNX)
 *
 * Uses onnx-community/moonshine-base-ONNX for fast, local speech recognition.
 * Optimized for real-time transcription with ~200ms latency.
 *
 * Pros: Local/private, fast, good quality, works offline
 * Cons: ~166MB download, requires WebGPU for best performance
 */

import type { STTProvider, STTResult, STTConfig, STTProviderType } from '../types'
import { pipeline, env, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

export class MoonshineSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'moonshine'

  private transcriber: AutomaticSpeechRecognitionPipeline | null = null
  private resultCallbacks: Set<(result: STTResult) => void> = new Set()
  private errorCallbacks: Set<(error: Error) => void> = new Set()
  private _isSupported = true
  private _isLoading = false
  private _isReady = false
  private modelId: string
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private isRecording = false
  private language?: string // Language hint for transcription (Moonshine is English-only but stored for API consistency)

  // Progress callback for model loading
  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(modelId = 'onnx-community/moonshine-base-ONNX') {
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
      console.log('[Moonshine STT] Loading model:', this.modelId)

      // Check for WebGPU support
      const hasWebGPU = 'gpu' in navigator
      const device = hasWebGPU ? 'webgpu' : 'wasm'

      console.log(`[Moonshine STT] Using device: ${device}`)

       
      this.transcriber = (await pipeline('automatic-speech-recognition', this.modelId, {
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
      } as any)) as any

      this._isReady = true
      console.log('[Moonshine STT] Model loaded successfully')
    } catch (error) {
      console.error('[Moonshine STT] Failed to load model:', error)
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
    // Note: Moonshine is primarily English-only, but we store this for API consistency
    this.language = config?.language

    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 })
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      source.connect(this.analyser)

      // Set up recording with periodic transcription
      this.isRecording = true
      this.startContinuousTranscription(config)
    } catch (error) {
      console.error('[Moonshine STT] Failed to start recording:', error)
      throw error
    }
  }

  private async startContinuousTranscription(_config?: Partial<STTConfig>): Promise<void> {
    const sampleRate = 16000
    const chunkDuration = 2 // seconds per chunk
    const samplesPerChunk = sampleRate * chunkDuration

    // Use ScriptProcessor for real-time audio capture
    // (AudioWorklet would be better but requires more setup)
    const bufferSize = 4096
    const scriptProcessor = this.audioContext!.createScriptProcessor(bufferSize, 1, 1)

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

      // When we have enough samples, transcribe
      if (sampleCount >= samplesPerChunk) {
        const combinedBuffer = this.combineBuffers(audioBuffer)
        audioBuffer = []
        sampleCount = 0

        // Transcribe in background
        this.transcribe(combinedBuffer)
          .then((result) => {
            if (result.text.trim()) {
              this.emitResult(result)
            }
          })
          .catch((error) => {
            console.error('[Moonshine STT] Transcription error:', error)
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

    this.analyser = null
  }

  async transcribe(audioData: Float32Array | ArrayBuffer): Promise<STTResult> {
    if (!this.transcriber) {
      throw new Error('Transcriber not initialized. Call initialize() first.')
    }

    // Convert ArrayBuffer to Float32Array if needed
    let audio: Float32Array
    if (audioData instanceof ArrayBuffer) {
      audio = new Float32Array(audioData)
    } else {
      audio = audioData
    }

    const startTime = performance.now()

    try {
      // Build transcription options
      // Note: Moonshine is English-only, but we include language hint for potential future multilingual support
      const transcribeOptions: Record<string, unknown> = {
        return_timestamps: false,
      }

      // Add language hint if available (extracted from BCP-47 code like 'en-US' -> 'en')
      if (this.language) {
        const langCode = this.language.split('-')[0].toLowerCase()
        transcribeOptions.language = langCode
        console.log(`[Moonshine STT] Using language hint: ${langCode}`)
      }

      const result = await this.transcriber(audio, transcribeOptions)

      const endTime = performance.now()
      console.log(`[Moonshine STT] Transcription took ${(endTime - startTime).toFixed(0)}ms`)

      return {
        text: (result as any).text || '',
        isFinal: true,
        confidence: 1.0,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[Moonshine STT] Transcription failed:', error)
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
