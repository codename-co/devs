/**
 * Voice Services Types
 *
 * Type definitions for Speech-to-Text (STT) and Text-to-Speech (TTS) providers.
 * Supports multiple backends: Browser native, ONNX (transformers.js), Gemini Live, LM Studio
 */

// ============================================================================
// STT (Speech-to-Text) Types
// ============================================================================

export type STTProviderType =
  | 'web-speech' // Browser native Web Speech API
  | 'moonshine' // onnx-community/moonshine-base-ONNX (fast, ~166MB)
  | 'whisper' // onnx-community/whisper-large-v3-turbo (SOTA, ~800MB)
  | 'gemini-live' // Gemini Live API (cloud, bidirectional)
  | 'lm-studio' // Local LM Studio server

export interface STTConfig {
  provider: STTProviderType
  language?: string // BCP-47 language code (e.g., 'en-US', 'fr-FR')
  continuous?: boolean // Keep listening after final result
  interimResults?: boolean // Emit partial transcripts
  modelId?: string // Custom model ID for ONNX/LM Studio
}

export interface STTResult {
  text: string
  isFinal: boolean
  confidence?: number
  language?: string
  timestamp?: number
}

export interface STTProvider {
  readonly type: STTProviderType
  readonly isSupported: boolean
  readonly isLoading: boolean
  readonly isReady: boolean

  /**
   * Initialize the provider (load model, etc.)
   */
  initialize(): Promise<void>

  /**
   * Start listening for speech
   */
  start(config?: Partial<STTConfig>): Promise<void>

  /**
   * Stop listening
   */
  stop(): Promise<void>

  /**
   * Transcribe audio data directly (for file input)
   */
  transcribe(audioData: Float32Array | ArrayBuffer): Promise<STTResult>

  /**
   * Subscribe to transcription events
   */
  onResult(callback: (result: STTResult) => void): () => void

  /**
   * Subscribe to error events
   */
  onError(callback: (error: Error) => void): () => void

  /**
   * Clean up resources
   */
  dispose(): Promise<void>
}

// ============================================================================
// TTS (Text-to-Speech) Types
// ============================================================================

export type TTSProviderType =
  | 'web-speech' // Browser native SpeechSynthesis
  | 'kokoro' // onnx-community/Kokoro-82M-v1.0-ONNX (SOTA, 82MB)
  | 'supertonic' // onnx-community/Supertonic-TTS-ONNX (~100MB)
  | 'gemini-live' // Gemini Live API (cloud, bidirectional)

export interface TTSVoice {
  id: string
  name: string
  language: string
  gender?: 'male' | 'female' | 'neutral'
  provider: TTSProviderType
}

export interface TTSConfig {
  provider: TTSProviderType
  voiceId?: string
  language?: string
  rate?: number // Speech rate (0.1 - 10, default 1)
  pitch?: number // Pitch (0 - 2, default 1)
  volume?: number // Volume (0 - 1, default 1)
  modelId?: string // Custom model ID for ONNX
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' // Quantization for ONNX
}

export interface TTSAudioResult {
  audio: Float32Array
  sampleRate: number
  duration: number
}

export interface TTSProvider {
  readonly type: TTSProviderType
  readonly isSupported: boolean
  readonly isLoading: boolean
  readonly isReady: boolean

  /**
   * Initialize the provider (load model, etc.)
   */
  initialize(): Promise<void>

  /**
   * Get available voices
   */
  getVoices(): Promise<TTSVoice[]>

  /**
   * Synthesize speech from text
   */
  synthesize(text: string, config?: Partial<TTSConfig>): Promise<TTSAudioResult>

  /**
   * Speak text directly (synthesize + play)
   */
  speak(text: string, config?: Partial<TTSConfig>): Promise<void>

  /**
   * Stop current speech
   */
  stop(): void

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean

  /**
   * Subscribe to speech end events
   */
  onEnd(callback: () => void): () => void

  /**
   * Get the AnalyserNode for audio visualization (if available)
   * Returns null if provider doesn't support audio analysis (e.g., Web Speech API)
   */
  getAnalyser?(): AnalyserNode | null

  /**
   * Clean up resources
   */
  dispose(): Promise<void>
}

// ============================================================================
// Gemini Live Types (Bidirectional Audio)
// ============================================================================

export interface GeminiLiveConfig {
  apiKey: string
  model?: string // Default: 'gemini-2.5-flash-native-audio-preview'
  systemInstruction?: string
  responseModalities?: ('TEXT' | 'AUDIO')[]
  voiceActivityDetection?: boolean
}

export interface GeminiLiveMessage {
  type: 'audio' | 'text' | 'interruption'
  data?: ArrayBuffer | string
  mimeType?: string
}

export interface GeminiLiveProvider {
  readonly isConnected: boolean

  /**
   * Connect to Gemini Live API
   */
  connect(config: GeminiLiveConfig): Promise<void>

  /**
   * Disconnect from API
   */
  disconnect(): Promise<void>

  /**
   * Send audio data
   */
  sendAudio(audioData: ArrayBuffer): void

  /**
   * Send text message
   */
  sendText(text: string): void

  /**
   * Subscribe to responses
   */
  onResponse(
    callback: (response: { text?: string; audio?: ArrayBuffer }) => void,
  ): () => void

  /**
   * Subscribe to connection state changes
   */
  onStateChange(callback: (connected: boolean) => void): () => void
}

// ============================================================================
// Voice Service Types (Unified Interface)
// ============================================================================

export interface VoiceServiceConfig {
  stt: STTConfig
  tts: TTSConfig
  geminiLive?: GeminiLiveConfig
}

export interface VoiceService {
  readonly stt: STTProvider
  readonly tts: TTSProvider
  readonly geminiLive?: GeminiLiveProvider

  /**
   * Initialize all configured providers
   */
  initialize(): Promise<void>

  /**
   * Switch STT provider
   */
  setSTTProvider(type: STTProviderType): Promise<void>

  /**
   * Switch TTS provider
   */
  setTTSProvider(type: TTSProviderType): Promise<void>

  /**
   * Get loading progress for model downloads
   */
  getLoadingProgress(): {
    stt?: { loaded: number; total: number }
    tts?: { loaded: number; total: number }
  }

  /**
   * Clean up all resources
   */
  dispose(): Promise<void>
}

// ============================================================================
// Audio Utilities Types
// ============================================================================

export interface AudioRecorder {
  start(): Promise<void>
  stop(): Promise<ArrayBuffer>
  pause(): void
  resume(): void
  getAudioData(): Float32Array
  onData(callback: (data: Float32Array) => void): () => void
}

export interface AudioPlayer {
  play(audio: Float32Array | ArrayBuffer, sampleRate: number): Promise<void>
  stop(): void
  pause(): void
  resume(): void
  setVolume(volume: number): void
  isPlaying(): boolean
}

// ============================================================================
// Model Information
// ============================================================================

export const STT_MODELS = {
  moonshine: {
    modelId: 'onnx-community/moonshine-base-ONNX',
    size: '~166MB',
    latency: '~200ms',
    quality: 'High',
    description: 'Optimized for real-time speech recognition',
  },
  whisper: {
    modelId: 'onnx-community/whisper-small',
    size: '~500MB',
    latency: '~400ms',
    quality: 'High',
    description: 'Good quality, multilingual support. Default model.',
  },
  'whisper-tiny': {
    modelId: 'onnx-community/whisper-tiny',
    size: '~150MB',
    latency: '~150ms',
    quality: 'Basic',
    description: 'Fastest Whisper, lowest memory, multilingual',
  },
  'whisper-base': {
    modelId: 'onnx-community/whisper-base',
    size: '~300MB',
    latency: '~300ms',
    quality: 'Medium',
    description: 'Balanced speed and quality, multilingual',
  },
  'whisper-large': {
    modelId: 'onnx-community/whisper-large-v3-turbo',
    size: '~2.5GB+',
    latency: '~800ms',
    quality: 'SOTA',
    description: '⚠️ Requires 12GB+ RAM. May fail in browsers.',
  },
} as const

export const TTS_MODELS = {
  kokoro: {
    modelId: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    size: '~154MB (q4f16)',
    latency: '~150ms',
    quality: 'SOTA',
    voices: 54,
    description: 'Best quality TTS, 4-bit quantized for faster inference',
  },
  supertonic: {
    modelId: 'onnx-community/Supertonic-TTS-ONNX',
    size: '~100MB',
    latency: '~300ms',
    quality: 'High',
    voices: 10,
    description: 'Good quality with style control',
  },
} as const
