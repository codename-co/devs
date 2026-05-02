/**
 * Kitten TTS Nano Provider (ONNX)
 *
 * Uses onnx-community/kitten-tts-nano-0.1-ONNX for ultra-lightweight TTS.
 * Only ~23MB download — the smallest usable TTS model available.
 * Based on StyleTTS2 architecture (same family as Kokoro).
 *
 * Pros: Tiny download (~23MB), instant loading, decent quality, Apache 2.0
 * Cons: English only, fewer voices than Kokoro
 */

import type {
  TTSProvider,
  TTSVoice,
  TTSConfig,
  TTSAudioResult,
  TTSProviderType,
} from '../types'
import {
  StyleTextToSpeech2Model,
  AutoTokenizer,
  env,
} from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

/**
 * Kitten TTS Nano voices
 * Uses expressive voice presets bundled as .bin files in the model repo.
 */
export const KITTEN_VOICES: TTSVoice[] = [
  {
    id: 'expr-voice-2-f',
    name: 'Expressive Female 1',
    language: 'en',
    gender: 'female',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-3-f',
    name: 'Expressive Female 2',
    language: 'en',
    gender: 'female',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-4-f',
    name: 'Expressive Female 3',
    language: 'en',
    gender: 'female',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-2-m',
    name: 'Expressive Male 1',
    language: 'en',
    gender: 'male',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-3-m',
    name: 'Expressive Male 2',
    language: 'en',
    gender: 'male',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-4-m',
    name: 'Expressive Male 3',
    language: 'en',
    gender: 'male',
    provider: 'kitten',
  },
]

export class KittenTTSProvider implements TTSProvider {
  readonly type: TTSProviderType = 'kitten'

  private model: any = null
  private tokenizer: any = null
  private voiceCache: Map<string, Float32Array> = new Map()
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

  constructor(modelId = 'onnx-community/kitten-tts-nano-0.1-ONNX') {
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
      console.log('[Kitten TTS] Loading model:', this.modelId)

      const progressCb = (progress: any) => {
        this.progressCallback?.({
          status: progress.status || 'loading',
          loaded: progress.loaded,
          total: progress.total,
          progress: progress.progress,
        })
      }

      // Load model and tokenizer in parallel
      const [model, tokenizer] = await Promise.all([
        StyleTextToSpeech2Model.from_pretrained(this.modelId, {
          dtype: 'q8',
          progress_callback: progressCb,
        } as any),
        AutoTokenizer.from_pretrained(this.modelId, {
          progress_callback: progressCb,
        }),
      ])

      this.model = model
      this.tokenizer = tokenizer

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
      console.log('[Kitten TTS] Model loaded successfully (~23MB)')
    } catch (error) {
      console.error('[Kitten TTS] Failed to load model:', error)
      throw error
    } finally {
      this._isLoading = false
    }
  }

  /**
   * Load a voice embedding from the model repo
   */
  private async loadVoice(voiceId: string): Promise<Float32Array> {
    if (this.voiceCache.has(voiceId)) {
      return this.voiceCache.get(voiceId)!
    }

    const url = `https://huggingface.co/${this.modelId}/resolve/main/voices/${voiceId}.bin`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load voice "${voiceId}": ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const voiceData = new Float32Array(buffer)
    this.voiceCache.set(voiceId, voiceData)
    return voiceData
  }

  async getVoices(): Promise<TTSVoice[]> {
    return KITTEN_VOICES
  }

  async synthesize(
    text: string,
    config?: Partial<TTSConfig>,
  ): Promise<TTSAudioResult> {
    if (!this._isReady) {
      await this.initialize()
    }

    if (!this.model || !this.tokenizer) {
      throw new Error('Kitten TTS not initialized')
    }

    const startTime = performance.now()

    const voiceId = config?.voiceId || 'expr-voice-2-f'
    const speed = config?.rate || 1.0

    // Load voice embedding
    const voiceData = await this.loadVoice(voiceId)

    // Tokenize input text
    const inputs = this.tokenizer(text)

    // Generate speech
    const result = await this.model.generate_speech(inputs.input_ids, voiceData, {
      speed,
    })

    const endTime = performance.now()
    console.log(
      `[Kitten TTS] Synthesis took ${(endTime - startTime).toFixed(0)}ms`,
    )

    // result.waveform is a Tensor — extract audio data
    const audio = result.waveform.data as Float32Array
    const sampleRate = 24000

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
    this.model = null
    this.tokenizer = null
    this.voiceCache.clear()
    this.endCallbacks.clear()
    this._isReady = false
  }
}
