/**
 * Voice Service Index
 *
 * Main entry point for voice services (STT, TTS, Gemini Live)
 */

// Types
export * from './types'

// STT Providers
export {
  WebSpeechSTTProvider,
  MoonshineSTTProvider,
  WhisperSTTProvider,
  createSTTProvider,
  getAvailableSTTProviders,
} from './stt'

// TTS Providers
export {
  WebSpeechTTSProvider,
  KokoroTTSProvider,
  KOKORO_VOICES,
  createTTSProvider,
  getAvailableTTSProviders,
} from './tts'

// Gemini Live (Bidirectional)
export { GeminiLiveProvider } from './gemini-live'

// Audio Utilities
export { AudioRecorderUtil, AudioPlayerUtil } from './audio-utils'
