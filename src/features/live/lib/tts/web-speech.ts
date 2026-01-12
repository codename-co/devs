/**
 * Web Speech API TTS Provider
 *
 * Uses the browser's native SpeechSynthesis API for text-to-speech.
 *
 * Pros: Zero download, instant, works offline, many voices
 * Cons: Robotic quality, limited control, inconsistent across browsers
 */

import type { TTSProvider, TTSVoice, TTSConfig, TTSAudioResult, TTSProviderType } from '../types'

export class WebSpeechTTSProvider implements TTSProvider {
  readonly type: TTSProviderType = 'web-speech'

  private synthesis: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private endCallbacks: Set<() => void> = new Set()
  private _isSupported = false
  private _isLoading = false
  private _isReady = false
  private voices: SpeechSynthesisVoice[] = []

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this._isSupported = true
      this.synthesis = window.speechSynthesis
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

  async initialize(): Promise<void> {
    if (!this._isSupported) {
      throw new Error('SpeechSynthesis is not supported in this browser')
    }

    this._isLoading = true

    try {
      // Wait for voices to load
      await this.loadVoices()
      this._isReady = true
    } finally {
      this._isLoading = false
    }
  }

  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const loadVoicesFn = () => {
        this.voices = this.synthesis?.getVoices() || []
        if (this.voices.length > 0) {
          resolve()
        }
      }

      // Try loading voices immediately
      loadVoicesFn()

      // Also listen for voiceschanged event (Chrome loads voices async)
      if (this.voices.length === 0) {
        this.synthesis?.addEventListener('voiceschanged', loadVoicesFn, { once: true })
        // Timeout fallback
        setTimeout(resolve, 1000)
      }
    })
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this._isReady) {
      await this.initialize()
    }

    return this.voices.map((voice) => ({
      id: voice.voiceURI,
      name: voice.name,
      language: voice.lang,
      gender: this.guessGender(voice.name),
      provider: 'web-speech' as const,
    }))
  }

  private guessGender(name: string): 'male' | 'female' | 'neutral' {
    const lowerName = name.toLowerCase()
    if (
      lowerName.includes('female') ||
      lowerName.includes('woman') ||
      /\b(samantha|victoria|karen|fiona|moira|tessa|veena|zira|susan|linda|anna)\b/i.test(name)
    ) {
      return 'female'
    }
    if (
      lowerName.includes('male') ||
      lowerName.includes('man') ||
      /\b(daniel|david|alex|fred|ralph|albert|bruce|james|mark|tom)\b/i.test(name)
    ) {
      return 'male'
    }
    return 'neutral'
  }

  async synthesize(_text: string, _config?: Partial<TTSConfig>): Promise<TTSAudioResult> {
    // Web Speech API doesn't provide raw audio data
    // It only plays directly through the speakers
    throw new Error(
      'Web Speech API does not support synthesizing to audio data. Use speak() instead, or use Kokoro provider.',
    )
  }

  async speak(text: string, config?: Partial<TTSConfig>): Promise<void> {
    if (!this._isReady) {
      await this.initialize()
    }

    // Cancel any ongoing speech
    this.stop()

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)

      // Apply configuration
      if (config?.voiceId) {
        const voice = this.voices.find((v) => v.voiceURI === config.voiceId)
        if (voice) {
          utterance.voice = voice
        }
      }

      if (config?.language) {
        utterance.lang = config.language
      }

      utterance.rate = config?.rate ?? 1
      utterance.pitch = config?.pitch ?? 1
      utterance.volume = config?.volume ?? 1

      utterance.onend = () => {
        this.currentUtterance = null
        this.endCallbacks.forEach((cb) => cb())
        resolve()
      }

      utterance.onerror = (event) => {
        this.currentUtterance = null
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      this.currentUtterance = utterance
      this.synthesis?.speak(utterance)
    })
  }

  stop(): void {
    this.synthesis?.cancel()
    this.currentUtterance = null
  }

  isSpeaking(): boolean {
    return this.currentUtterance !== null || (this.synthesis?.speaking ?? false)
  }

  onEnd(callback: () => void): () => void {
    this.endCallbacks.add(callback)
    return () => this.endCallbacks.delete(callback)
  }

  async dispose(): Promise<void> {
    this.stop()
    this.endCallbacks.clear()
    this._isReady = false
  }
}
