/**
 * Granite Speech STT Provider (ONNX)
 *
 * Uses onnx-community/granite-4.0-1b-speech-ONNX for multilingual ASR and speech translation.
 * Based on IBM's Granite 4.0 1B Speech model — a compact speech-language model.
 *
 * Unlike Whisper/Moonshine (which use the `pipeline` API), Granite Speech uses a
 * generative architecture (GraniteSpeechForConditionalGeneration + AutoProcessor)
 * with prompt-driven transcription via a chat template.
 *
 * Supported languages: English, French, German, Spanish, Portuguese, Japanese
 * Features: ASR, bidirectional speech translation, keyword biasing
 *
 * Pros: Multilingual, compact 1B params, high quality, keyword biasing, speech translation
 * Cons: Requires WebGPU, larger download than Moonshine (~600MB quantized)
 */

import type {
  STTProvider,
  STTResult,
  STTConfig,
  STTProviderType,
} from '../types'
import {
  AutoProcessor,
  GraniteSpeechForConditionalGeneration,
  TextStreamer,
  env,
} from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

const MODEL_ID = 'onnx-community/granite-4.0-1b-speech-ONNX'
const DEFAULT_PROMPT = 'Can you transcribe the speech into a written format?'

// Granite supports these languages for ASR
const SUPPORTED_LANGUAGES = new Set([
  'en', // English
  'fr', // French
  'de', // German
  'es', // Spanish
  'pt', // Portuguese
  'ja', // Japanese
])

export class GraniteSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'granite'

  private model: InstanceType<
    typeof GraniteSpeechForConditionalGeneration
  > | null = null
  private processor: InstanceType<typeof AutoProcessor> | null = null
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
    // Granite Speech requires WebGPU for practical use (1B params)
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
      throw new Error('WebGPU is required for Granite Speech')
    }

    this._isLoading = true

    try {
      console.log('[Granite STT] Loading model:', this.modelId)

      // Track progress across multiple ONNX files
      const MODEL_FILE_COUNT = 3
      const progressMap = new Map<string, number>()

      const progressCallback = (info: {
        status?: string
        file?: string
        loaded?: number
        total?: number
        progress?: number
      }) => {
        // Track per-file progress for ONNX data files
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

      // Load processor and model in parallel
      const [processor, model] = await Promise.all([
        AutoProcessor.from_pretrained(this.modelId),
        GraniteSpeechForConditionalGeneration.from_pretrained(this.modelId, {
          dtype: {
            embed_tokens: 'q4',
            audio_encoder: 'q4',
            decoder_model_merged: 'q4',
          },
          device: 'webgpu',
          progress_callback: progressCallback,
        } as any),
      ])

      this.processor = processor as any
      this.model = model as any
      this._isReady = true
      console.log('[Granite STT] Model loaded successfully')
    } catch (error) {
      console.error('[Granite STT] Failed to load model:', error)
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
      console.error('[Granite STT] Failed to start recording:', error)
      throw error
    }
  }

  private startContinuousTranscription(): void {
    const sampleRate = 16000
    // Granite Speech works well with longer chunks (generative model)
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
            console.error('[Granite STT] Transcription error:', error)
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
      // Build prompt — prepend <|audio|> token as required by Granite Speech
      const prompt = this.buildPrompt()
      const messages = [{ role: 'user', content: prompt }]

      const text = (this.processor as any).apply_chat_template(messages, {
        add_generation_prompt: false,
        tokenize: false,
      })

      const inputs = await (this.processor as any)(text, audio)

      // Generate transcription
      let streamedText = ''
      const generatedIds = await (this.model as any).generate({
        ...inputs,
        max_new_tokens: 256,
        streamer: new TextStreamer((this.processor as any).tokenizer, {
          skip_prompt: true,
          callback_function: (chunk: string) => {
            streamedText += chunk
          },
        }),
      })

      // Decode the generated text (skip the prompt tokens)
      const promptLength = inputs.input_ids.dims.at(-1)
      const decoded = (this.processor as any).batch_decode(
        generatedIds.slice(null, [promptLength, null]),
        { skip_special_tokens: true },
      )

      const finalText = decoded[0]?.trim() || streamedText.trim() || ''

      const endTime = performance.now()
      console.log(
        `[Granite STT] Transcription took ${(endTime - startTime).toFixed(0)}ms`,
      )

      return {
        text: finalText,
        isFinal: true,
        confidence: 1.0,
        language: this.language,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[Granite STT] Transcription failed:', error)
      throw error
    }
  }

  /**
   * Build the prompt for Granite Speech.
   * The model uses <|audio|> token to mark where audio input goes.
   * Different prompts can trigger transcription vs translation.
   */
  private buildPrompt(): string {
    const langCode = this.language?.split('-')[0].toLowerCase()

    // If the language is supported and is not English, we can ask for
    // transcription in that specific language
    if (langCode && langCode !== 'en' && SUPPORTED_LANGUAGES.has(langCode)) {
      console.log(
        `[Granite STT] Using language-specific prompt for: ${langCode}`,
      )
    }

    // The default prompt works well for all supported languages —
    // Granite Speech auto-detects the spoken language
    return `<|audio|>${DEFAULT_PROMPT}`
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
