/**
 * Gemini Live Provider
 *
 * Bidirectional real-time audio streaming with Google's Gemini Live API.
 * Handles both STT and TTS in a single WebSocket connection.
 *
 * Key features:
 * - ~150ms latency for both input and output
 * - Voice Activity Detection (VAD) for natural interruptions
 * - Native audio modality (no text intermediate)
 * - WebSocket-based streaming
 *
 * Audio format:
 * - Input: 16-bit PCM, 16kHz, mono
 * - Output: 16-bit PCM, 24kHz, mono
 */

import type { GeminiLiveConfig, GeminiLiveProvider as IGeminiLiveProvider } from './types'

// Gemini Live API WebSocket endpoint
const GEMINI_LIVE_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

export class GeminiLiveProvider implements IGeminiLiveProvider {
  private ws: WebSocket | null = null
  private config: GeminiLiveConfig | null = null
  private _isConnected = false
  private responseCallbacks: Set<(response: { text?: string; audio?: ArrayBuffer }) => void> =
    new Set()
  private stateCallbacks: Set<(connected: boolean) => void> = new Set()
  private audioBuffer: ArrayBuffer[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  get isConnected(): boolean {
    return this._isConnected
  }

  async connect(config: GeminiLiveConfig): Promise<void> {
    if (this._isConnected) {
      await this.disconnect()
    }

    this.config = config

    const model = config.model || 'gemini-2.5-flash-native-audio-preview'
    const wsUrl = `${GEMINI_LIVE_WS_URL}?key=${config.apiKey}`

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)
        this.ws.binaryType = 'arraybuffer'

        this.ws.onopen = () => {
          console.log('[Gemini Live] WebSocket connected')
          this._isConnected = true
          this.reconnectAttempts = 0

          // Send initial setup message
          this.sendSetup(model, config)

          this.notifyStateChange(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          console.error('[Gemini Live] WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = (event) => {
          console.log('[Gemini Live] WebSocket closed:', event.code, event.reason)
          this._isConnected = false
          this.notifyStateChange(false)

          // Attempt reconnect if unexpected close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(
              `[Gemini Live] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            )
            setTimeout(() => {
              if (this.config) {
                this.connect(this.config).catch(console.error)
              }
            }, 1000 * this.reconnectAttempts)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private sendSetup(model: string, config: GeminiLiveConfig): void {
    const setupMessage = {
      setup: {
        model: `models/${model}`,
        generation_config: {
          response_modalities: config.responseModalities || ['AUDIO'],
        },
        system_instruction: config.systemInstruction
          ? {
              parts: [{ text: config.systemInstruction }],
            }
          : undefined,
      },
    }

    this.ws?.send(JSON.stringify(setupMessage))
  }

  private handleMessage(event: MessageEvent): void {
    try {
      if (event.data instanceof ArrayBuffer) {
        // Binary audio data
        this.audioBuffer.push(event.data)
        this.notifyResponse({ audio: event.data })
      } else {
        // JSON message
        const message = JSON.parse(event.data)

        if (message.serverContent) {
          const content = message.serverContent

          if (content.modelTurn) {
            for (const part of content.modelTurn.parts || []) {
              if (part.text) {
                this.notifyResponse({ text: part.text })
              }
              if (part.inlineData?.data) {
                // Base64 encoded audio
                const audioData = this.base64ToArrayBuffer(part.inlineData.data)
                this.notifyResponse({ audio: audioData })
              }
            }
          }

          if (content.turnComplete) {
            console.log('[Gemini Live] Turn complete')
          }

          if (content.interrupted) {
            console.log('[Gemini Live] Interrupted by user')
            this.audioBuffer = []
          }
        }

        if (message.setupComplete) {
          console.log('[Gemini Live] Setup complete')
        }
      }
    } catch (error) {
      console.error('[Gemini Live] Error handling message:', error)
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this._isConnected = false
    this.audioBuffer = []
    this.notifyStateChange(false)
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Gemini Live] Cannot send audio: WebSocket not connected')
      return
    }

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm',
            data: this.arrayBufferToBase64(audioData),
          },
        ],
      },
    }

    this.ws.send(JSON.stringify(message))
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Gemini Live] Cannot send text: WebSocket not connected')
      return
    }

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Send an interruption signal (user started speaking)
   */
  sendInterruption(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Clear local audio buffer
    this.audioBuffer = []

    // The API handles interruptions automatically via VAD,
    // but we can also send an explicit signal
    console.log('[Gemini Live] User interruption')
  }

  onResponse(
    callback: (response: { text?: string; audio?: ArrayBuffer }) => void,
  ): () => void {
    this.responseCallbacks.add(callback)
    return () => this.responseCallbacks.delete(callback)
  }

  onStateChange(callback: (connected: boolean) => void): () => void {
    this.stateCallbacks.add(callback)
    return () => this.stateCallbacks.delete(callback)
  }

  private notifyResponse(response: { text?: string; audio?: ArrayBuffer }): void {
    this.responseCallbacks.forEach((cb) => cb(response))
  }

  private notifyStateChange(connected: boolean): void {
    this.stateCallbacks.forEach((cb) => cb(connected))
  }

  /**
   * Get accumulated audio buffer
   */
  getAudioBuffer(): ArrayBuffer[] {
    return [...this.audioBuffer]
  }

  /**
   * Clear audio buffer
   */
  clearAudioBuffer(): void {
    this.audioBuffer = []
  }
}
