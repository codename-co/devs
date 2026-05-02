/**
 * Supertonic TTS 2 Provider (ONNX)
 *
 * Uses onnx-community/Supertonic-TTS-2-ONNX for multilingual TTS.
 * ~250MB download. Supports English, Korean, Spanish, Portuguese, French.
 * Diffusion-based latent denoiser — quality scales with inference steps.
 *
 * Pros: Multilingual (5 langs), 10 voices, good quality, transformers.js pipeline
 * Cons: ~250MB download, OpenRAIL license, slightly slower than Kokoro
 *
 * @see https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX
 */

import type {
  TTSProvider,
  TTSVoice,
  TTSConfig,
  TTSAudioResult,
  TTSProviderType,
} from '../types'
import { pipeline, env } from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

/**
 * Language code mapping for Supertonic&apos;s XML-tag format.
 * Input BCP-47 codes are mapped to Supertonic language tags.
 */
const SUPERTONIC_LANGUAGES = ['en', 'ko', 'es', 'pt', 'fr'] as const
type SupertonicLanguage = (typeof SUPERTONIC_LANGUAGES)[number]

/**
 * Supertonic TTS 2 voices — 5 female + 5 male
 */
export const SUPERTONIC_VOICES: TTSVoice[] = [
  // Female voices
  {
    id: 'F1',
    name: 'Female 1',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F2',
    name: 'Female 2',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F3',
    name: 'Female 3',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F4',
    name: 'Female 4',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F5',
    name: 'Female 5',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  // Male voices
  {
    id: 'M1',
    name: 'Male 1',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M2',
    name: 'Male 2',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M3',
    name: 'Male 3',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M4',
    name: 'Male 4',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M5',
    name: 'Male 5',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
]

export class SupertonicTTSProvider implements TTSProvider {
  readonly type: TTSProviderType = 'supertonic'

  private tts: any = null // TTS pipeline instance
  private endCallbacks: Set<() => void> = new Set()
  private _isSupported = true
  private _isLoading = false
  private _isReady = false
  private _isSpeaking = false
  private audioContext: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private modelId: string

  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(modelId = 'onnx-community/Supertonic-TTS-2-ONNX') {
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
      console.log('[Supertonic TTS] Loading model:', this.modelId)

      this.tts = await pipeline('text-to-speech', this.modelId, {
        progress_callback: (progress: any) => {
          this.progressCallback?.({
            status: progress.status || 'loading',
            loaded: progress.loaded,
            total: progress.total,
            progress: progress.progress,
          })
        },
      })

      // Initialize audio context with analyser for visualization
      this.audioContext = new AudioContext()

      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      this.analyserNode.smoothingTimeConstant = 0.8

      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1

      this.analyserNode.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)

      this._isReady = true
      console.log('[Supertonic TTS] Model loaded successfully (~250MB)')
    } catch (error) {
      console.error('[Supertonic TTS] Failed to load model:', error)
      throw error
    } finally {
      this._isLoading = false
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    return SUPERTONIC_VOICES
  }

  /**
   * Detect language from BCP-47 code and map to Supertonic lang tag.
   * Falls back to 'en' if the language is not supported.
   */
  private getLanguageTag(language?: string): SupertonicLanguage {
    if (!language) return 'en'
    const code = language.split('-')[0].toLowerCase()
    if (SUPERTONIC_LANGUAGES.includes(code as SupertonicLanguage)) {
      return code as SupertonicLanguage
    }
    return 'en'
  }

  async synthesize(
    text: string,
    config?: Partial<TTSConfig>,
  ): Promise<TTSAudioResult> {
    if (!this._isReady) {
      await this.initialize()
    }

    if (!this.tts) {
      throw new Error('Supertonic TTS not initialized')
    }

    const startTime = performance.now()

    const voiceId = config?.voiceId || 'F1'
    const speed = config?.rate || 1.05
    const lang = this.getLanguageTag(config?.language)

    // Supertonic uses XML-style language tags: <en>text</en>
    const taggedText = `<${lang}>${text}</${lang}>`

    // Voice embeddings are loaded by URL
    const speakerEmbeddings = `https://huggingface.co/${this.modelId}/resolve/main/voices/${voiceId}.bin`

    // Yield to event loop before synthesis
    await new Promise((resolve) => setTimeout(resolve, 0))

    const result = await this.tts(taggedText, {
      speaker_embeddings: speakerEmbeddings,
      num_inference_steps: 5,
      speed,
    })

    const endTime = performance.now()
    console.log(
      `[Supertonic TTS] Synthesis took ${(endTime - startTime).toFixed(0)}ms`,
    )

    // The pipeline returns { audio: Float32Array, sampling_rate: number }
    const audio = result.audio as Float32Array
    const sampleRate = result.sampling_rate || 44100

    return {
      audio,
      sampleRate,
      duration: audio.length / sampleRate,
    }
  }

  /**
   * Split text into sentences for chunked synthesis
   */
  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0)
  }

  async speak(text: string, config?: Partial<TTSConfig>): Promise<void> {
    // For long texts, use chunked synthesis
    if (text.length > 200) {
      const sentences = this.splitIntoSentences(text)
      for (const sentence of sentences) {
        if (!this._isSpeaking && sentences.indexOf(sentence) > 0) break
        const result = await this.synthesize(sentence, config)
        await new Promise((resolve) => setTimeout(resolve, 0))
        await this.playAudio(result.audio, result.sampleRate, config?.volume)
      }
      return
    }

    const result = await this.synthesize(text, config)
    return this.playAudio(result.audio, result.sampleRate, config?.volume)
  }

  private async playAudio(
    audio: Float32Array,
    sampleRate: number,
    volume?: number,
  ): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      this.analyserNode.smoothingTimeConstant = 0.8
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1
      this.analyserNode.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    return new Promise((resolve, reject) => {
      try {
        const audioBuffer = this.audioContext!.createBuffer(
          1,
          audio.length,
          sampleRate,
        )
        audioBuffer.getChannelData(0).set(audio)

        const source = this.audioContext!.createBufferSource()
        source.buffer = audioBuffer

        if (volume !== undefined && this.gainNode) {
          this.gainNode.gain.value = volume
        }

        if (this.analyserNode) {
          source.connect(this.analyserNode)
        } else {
          source.connect(this.audioContext!.destination)
        }

        this.currentSource = source
        this._isSpeaking = true

        source.onended = () => {
          this._isSpeaking = false
          this.currentSource = null
          this.endCallbacks.forEach((cb) => cb())
          resolve()
        }

        source.start()
      } catch (error) {
        this._isSpeaking = false
        reject(error)
      }
    })
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource = null
    }
    this._isSpeaking = false
  }

  isSpeaking(): boolean {
    return this._isSpeaking
  }

  onEnd(callback: () => void): () => void {
    this.endCallbacks.add(callback)
    return () => this.endCallbacks.delete(callback)
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  async dispose(): Promise<void> {
    this.stop()

    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }

    this.analyserNode = null
    this.gainNode = null
    this.tts = null
    this.endCallbacks.clear()
    this._isReady = false
  }
}
