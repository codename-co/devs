/**
 * Kokoro TTS Provider (ONNX)
 *
 * Uses onnx-community/Kokoro-82M-v1.0-ONNX for SOTA text-to-speech.
 * 82M parameters, 54 voices, excellent quality.
 *
 * Pros: SOTA quality, many voices, works offline, small model
 * Cons: Requires kokoro-js library
 */

import type {
  TTSProvider,
  TTSVoice,
  TTSConfig,
  TTSAudioResult,
  TTSProviderType,
} from '../types'

/**
 * Kokoro TTS voices supported by kokoro-js (28 voices)
 * Voice ID format: {language}{gender}_{name}
 * - Language: a=American, b=British
 * - Gender: f=female, m=male
 * Note: The full Kokoro model supports 54 voices, but kokoro-js currently supports English voices only
 * @see https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
 */
export const KOKORO_VOICES: TTSVoice[] = [
  // ==================== American English (11F 10M) ====================
  {
    id: 'af_heart',
    name: 'Heart ❤️',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_alloy',
    name: 'Alloy',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_aoede',
    name: 'Aoede',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_bella',
    name: 'Bella 🔥',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_jessica',
    name: 'Jessica',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_kore',
    name: 'Kore',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_nicole',
    name: 'Nicole 🎧',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_nova',
    name: 'Nova',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_river',
    name: 'River',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'af_sky',
    name: 'Sky',
    language: 'en-US',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'am_adam',
    name: 'Adam',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_echo',
    name: 'Echo',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_eric',
    name: 'Eric',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_liam',
    name: 'Liam',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_onyx',
    name: 'Onyx',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_puck',
    name: 'Puck',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'am_santa',
    name: 'Santa 🎅',
    language: 'en-US',
    gender: 'male',
    provider: 'kokoro',
  },
  // ==================== British English (4F 4M) ====================
  {
    id: 'bf_alice',
    name: 'Alice',
    language: 'en-GB',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'bf_emma',
    name: 'Emma',
    language: 'en-GB',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'bf_isabella',
    name: 'Isabella',
    language: 'en-GB',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'bf_lily',
    name: 'Lily',
    language: 'en-GB',
    gender: 'female',
    provider: 'kokoro',
  },
  {
    id: 'bm_daniel',
    name: 'Daniel',
    language: 'en-GB',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'bm_fable',
    name: 'Fable',
    language: 'en-GB',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'bm_george',
    name: 'George',
    language: 'en-GB',
    gender: 'male',
    provider: 'kokoro',
  },
  {
    id: 'bm_lewis',
    name: 'Lewis',
    language: 'en-GB',
    gender: 'male',
    provider: 'kokoro',
  },
]

export class KokoroTTSProvider implements TTSProvider {
  readonly type: TTSProviderType = 'kokoro'

  private tts: any = null // KokoroTTS instance
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
  private dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'

  private progressCallback?: (progress: {
    status: string
    loaded?: number
    total?: number
    progress?: number
  }) => void

  constructor(
    modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX',
    dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' = 'q4f16',
  ) {
    this.modelId = modelId
    this.dtype = dtype
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
      console.log('[Kokoro TTS] Loading model:', this.modelId)

      // Dynamically import kokoro-js
      // Note: kokoro-js must be installed: npm i kokoro-js
      const { KokoroTTS } = await import('kokoro-js')

      // Check for WebGPU support - offloads computation to GPU for much better performance
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
      const device = hasWebGPU ? 'webgpu' : 'wasm'
      // For WebGPU, fp32 is recommended; for WASM, use quantized
      const dtype = hasWebGPU ? 'fp32' : this.dtype

      console.log(`[Kokoro TTS] Using device: ${device}, dtype: ${dtype}`)

      this.tts = await KokoroTTS.from_pretrained(this.modelId, {
        dtype,
        device,
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

      // Create analyser node for waveform visualization
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      this.analyserNode.smoothingTimeConstant = 0.8

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1

      // Connect: source -> analyser -> gain -> destination
      this.analyserNode.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)

      this._isReady = true
      console.log('[Kokoro TTS] Model loaded successfully')
    } catch (error) {
      console.error('[Kokoro TTS] Failed to load model:', error)
      // If kokoro-js is not installed, mark as unsupported
      if ((error as Error).message?.includes('Cannot find module')) {
        this._isSupported = false
        throw new Error('kokoro-js is not installed. Run: npm i kokoro-js')
      }
      throw error
    } finally {
      this._isLoading = false
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    return KOKORO_VOICES
  }

  async synthesize(
    text: string,
    config?: Partial<TTSConfig>,
  ): Promise<TTSAudioResult> {
    if (!this._isReady) {
      await this.initialize()
    }

    if (!this.tts) {
      throw new Error('Kokoro TTS not initialized')
    }

    const startTime = performance.now()

    const voiceId = config?.voiceId || 'af_bella'
    const speed = config?.rate || 1.0

    // Yield to event loop before synthesis to prevent UI blocking
    await new Promise((resolve) => setTimeout(resolve, 0))

    const result = await this.tts.generate(text, {
      voice: voiceId,
      speed,
    })

    const endTime = performance.now()
    console.log(
      `[Kokoro TTS] Synthesis took ${(endTime - startTime).toFixed(0)}ms`,
    )

    // result.audio is Float32Array, result.sampling_rate is number
    return {
      audio: result.audio,
      sampleRate: result.sampling_rate || 24000,
      duration: result.audio.length / (result.sampling_rate || 24000),
    }
  }

  /**
   * Split text into sentences for chunked synthesis
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while keeping the punctuation
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0)
  }

  /**
   * Synthesize and play text in chunks to prevent UI blocking
   */
  async speakChunked(text: string, config?: Partial<TTSConfig>): Promise<void> {
    const sentences = this.splitIntoSentences(text)

    // Process sentences and play sequentially
    for (const sentence of sentences) {
      if (!this._isSpeaking && sentences.indexOf(sentence) > 0) {
        // User stopped playback
        break
      }

      const result = await this.synthesize(sentence, config)

      // Yield to event loop between sentences
      await new Promise((resolve) => setTimeout(resolve, 0))

      await this.playAudio(result.audio, result.sampleRate, config?.volume)
    }
  }

  async speak(text: string, config?: Partial<TTSConfig>): Promise<void> {
    // For long texts, use chunked synthesis to prevent UI blocking
    if (text.length > 200) {
      return this.speakChunked(text, config)
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
      // Recreate audio nodes if context was recreated
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      this.analyserNode.smoothingTimeConstant = 0.8
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1
      this.analyserNode.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)
    }

    // Resume audio context if suspended (browser autoplay policy)
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
        // Use getChannelData instead of copyToChannel for better compatibility
        const channelData = audioBuffer.getChannelData(0)
        channelData.set(audio)

        const source = this.audioContext!.createBufferSource()
        source.buffer = audioBuffer

        // Apply volume through the gain node
        if (volume !== undefined && this.gainNode) {
          this.gainNode.gain.value = volume
        }

        // Connect source through analyser for visualization
        // source -> analyserNode -> gainNode -> destination
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

  /**
   * Get the AnalyserNode for audio visualization during TTS playback
   */
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
