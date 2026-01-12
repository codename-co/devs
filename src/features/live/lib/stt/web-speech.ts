/**
 * Web Speech API STT Provider
 *
 * Uses the browser's native Web Speech API for speech recognition.
 * Works in Chrome (uses Google's cloud service) and other browsers with native support.
 *
 * Pros: Zero download, instant start, good quality
 * Cons: Requires internet (Chrome), limited customization, privacy concerns
 */

import type { STTProvider, STTResult, STTConfig, STTProviderType } from '../types'

export class WebSpeechSTTProvider implements STTProvider {
  readonly type: STTProviderType = 'web-speech'

  private recognition: SpeechRecognition | null = null
  private resultCallbacks: Set<(result: STTResult) => void> = new Set()
  private errorCallbacks: Set<(error: Error) => void> = new Set()
  private _isSupported = false
  private _isLoading = false
  private _isReady = false
  private finalTranscript = ''

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      this._isSupported = !!SpeechRecognition
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
      throw new Error('Web Speech API is not supported in this browser')
    }

    this._isLoading = true

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition

      this.recognition = new SpeechRecognition()
      this._isReady = true
    } finally {
      this._isLoading = false
    }
  }

  async start(config?: Partial<STTConfig>): Promise<void> {
    if (!this.recognition) {
      await this.initialize()
    }

    if (!this.recognition) {
      throw new Error('Failed to initialize Web Speech API')
    }

    // Configure recognition
    this.recognition.continuous = config?.continuous ?? true
    this.recognition.interimResults = config?.interimResults ?? true
    this.recognition.lang = config?.language || navigator.language || 'en-US'

    // Reset transcript
    this.finalTranscript = ''

    // Set up event handlers
    this.recognition.onstart = () => {
      this.finalTranscript = ''
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence

        if (result.isFinal) {
          finalTranscript += transcript
          this.emitResult({
            text: transcript,
            isFinal: true,
            confidence,
            timestamp: Date.now(),
          })
        } else {
          interimTranscript += transcript
        }
      }

      // Emit interim results
      if (interimTranscript) {
        this.emitResult({
          text: this.finalTranscript + interimTranscript,
          isFinal: false,
          timestamp: Date.now(),
        })
      }

      this.finalTranscript = finalTranscript
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const error = new Error(`Speech recognition error: ${event.error}`)
      this.errorCallbacks.forEach((cb) => cb(error))
    }

    this.recognition.start()
  }

  async stop(): Promise<void> {
    this.recognition?.stop()
  }

  async transcribe(_audioData: Float32Array | ArrayBuffer): Promise<STTResult> {
    // Web Speech API doesn't support transcribing audio files directly
    // It only works with live microphone input
    throw new Error(
      'Web Speech API does not support transcribing audio files. Use Moonshine or Whisper provider instead.',
    )
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
    this.recognition?.stop()
    this.recognition = null
    this.resultCallbacks.clear()
    this.errorCallbacks.clear()
    this._isReady = false
  }
}
