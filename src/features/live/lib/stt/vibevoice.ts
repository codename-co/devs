/**
 * VibeVoice Realtime STT Provider (ONNX)
 *
 * Uses microsoft/VibeVoice-Realtime-0.5B for real-time speech-to-speech interaction.
 * This is an open-source, locally-running alternative to Gemini Live for bidirectional
 * voice conversations — no API key required.
 *
 * VibeVoice is a speech-to-speech model (0.5B params) that can:
 * - Transcribe speech to text (STT)
 * - Generate spoken responses directly from audio input
 *
 * In this integration, we use it primarily for STT (transcription),
 * with speech-to-speech mode available as a future enhancement.
 *
 * Audio format:
 * - Input: 16kHz, mono, Float32Array
 *
 * Pros: Open-source, runs locally, small model (0.5B), real-time capable
 * Cons: Requires WebGPU, ~500MB download, English-focused
 *
 * @see https://huggingface.co/microsoft/VibeVoice-Realtime-0.5B
 */

import type {
  STTProvider,
  STTResult,
  STTConfig,
  STTProviderType,
} from '../types'
import {
  AutoProcessor,
  AutoModelForSpeechSeq2Seq,
  TextStreamer,
  env,
} from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

// ONNX-converted model from onnx-community (when available)
// Falls back to the original HF model ID for future ONNX conversion
const MODEL_ID = 'onnx-community/VibeVoice-Realtime-0.5B-ONNX'
const FALLBACK_MODEL_ID = 'microsoft/VibeVoice-Realtime-0.5B'

export class VibeVoiceSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'vibevoice'

  private model: any = null
  private processor: any = null
  private resultCallbacks: Set<(result: STTResult) => void> = new Set()
  private errorCallbacks: Set<(error: Error) => void> = new Set()
  private _isSupported: boolean
  private _isLoading = false
  private _isReady = false
  private modelId: string
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private isRecording = false
  private language?: string

  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(modelId = MODEL_ID) {
    this.modelId = modelId
    // VibeVoice requires WebGPU for practical inference (0.5B params)
    this._isSupported = typeof navigator !== 'undefined' && 'gpu' in navigator
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

    if (!this._isSupported) {
      throw new Error('WebGPU is required for VibeVoice Realtime')
    }

    this._isLoading = true

    try {
      console.log('[VibeVoice STT] Loading model:', this.modelId)

      // Track download progress across multiple ONNX files
      const MODEL_FILE_COUNT = 3
      const progressMap = new Map<string, number>()

      const progressCallback = (info: {
        status?: string
        file?: string
        loaded?: number
        total?: number
        progress?: number
      }) => {
        if (
          info?.status === 'progress' &&
          typeof info.file === 'string' &&
          info.file.endsWith('.onnx_data') &&
          typeof info.loaded === 'number' &&
          typeof info.total === 'number' &&
          info.total > 0
        ) {
          progressMap.set(info.file, info.loaded / info.total)
          const totalProgress =
            Array.from(progressMap.values()).reduce((sum, v) => sum + v, 0) /
            MODEL_FILE_COUNT
          this.progressCallback?.({
            status: 'loading',
            progress: totalProgress,
          })
        } else if (info?.status) {
          this.progressCallback?.({
            status: info.status,
            loaded: info.loaded,
            total: info.total,
            progress: info.progress,
          })
        }
      }

      // Try loading the ONNX model, fall back to original if not available
      let loadModelId = this.modelId

      try {
        // Load processor and model in parallel
        const [processor, model] = await Promise.all([
          AutoProcessor.from_pretrained(loadModelId),
          AutoModelForSpeechSeq2Seq.from_pretrained(loadModelId, {
            dtype: {
              encoder_model: 'q4',
              decoder_model_merged: 'q4',
            },
            device: 'webgpu',
            progress_callback: progressCallback,
          } as any),
        ])

        this.processor = processor
        this.model = model
      } catch (primaryError) {
        // If ONNX version not found, try fallback
        if (loadModelId !== FALLBACK_MODEL_ID) {
          console.warn(
            `[VibeVoice STT] ONNX model not found at ${loadModelId}, trying fallback: ${FALLBACK_MODEL_ID}`,
          )
          loadModelId = FALLBACK_MODEL_ID

          const [processor, model] = await Promise.all([
            AutoProcessor.from_pretrained(loadModelId),
            AutoModelForSpeechSeq2Seq.from_pretrained(loadModelId, {
              dtype: 'q4',
              device: 'webgpu',
              progress_callback: progressCallback,
            } as any),
          ])

          this.processor = processor
          this.model = model
        } else {
          throw primaryError
        }
      }

      this._isReady = true
      console.log(
        `[VibeVoice STT] Model loaded successfully: ${loadModelId}`,
      )
    } catch (error) {
      console.error('[VibeVoice STT] Failed to load model:', error)
      throw error
    } finally {
      this._isLoading = false
    }
  }

  async start(config?: Partial<STTConfig>): Promise<void> {
    if (!this._isReady) {
      await this.initialize()
    }

    if (this.isRecording) return

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
      this.startContinuousTranscription()
    } catch (error) {
      console.error('[VibeVoice STT] Failed to start recording:', error)
      throw error
    }
  }

  private startContinuousTranscription(): void {
    const sampleRate = 16000
    // VibeVoice is optimized for real-time — use shorter chunks
    const chunkDuration = 3 // seconds per chunk
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

    scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
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
            console.error('[VibeVoice STT] Transcription error:', error)
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
    if (!this.model || !this.processor) {
      throw new Error('Model not initialized. Call initialize() first.')
    }

    let audio: Float32Array
    if (audioData instanceof ArrayBuffer) {
      audio = new Float32Array(audioData)
    } else {
      audio = audioData
    }

    const startTime = performance.now()

    try {
      // Process audio through the model
      // VibeVoice uses a speech-to-speech architecture but can output text transcription
      const inputs = await this.processor(audio, {
        sampling_rate: 16000,
        return_tensors: 'pt',
      })

      // Generate transcription
      let streamedText = ''
      const generatedIds = await this.model.generate({
        ...inputs,
        max_new_tokens: 256,
        streamer: new TextStreamer(this.processor.tokenizer, {
          skip_prompt: true,
          callback_function: (chunk: string) => {
            streamedText += chunk
          },
        }),
      })

      // Decode output
      const promptLength = inputs.input_ids?.dims?.at(-1) || 0
      let finalText = ''

      if (promptLength > 0) {
        const decoded = this.processor.batch_decode(
          generatedIds.slice(null, [promptLength, null]),
          { skip_special_tokens: true },
        )
        finalText = decoded[0]?.trim() || ''
      }

      if (!finalText) {
        finalText = streamedText.trim()
      }

      const endTime = performance.now()
      console.log(
        `[VibeVoice STT] Transcription took ${(endTime - startTime).toFixed(0)}ms`,
      )

      return {
        text: finalText,
        isFinal: true,
        confidence: 1.0,
        language: this.language,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[VibeVoice STT] Transcription failed:', error)
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
    this.model = null
    this.processor = null
    this.resultCallbacks.clear()
    this.errorCallbacks.clear()
    this._isReady = false
  }
}
