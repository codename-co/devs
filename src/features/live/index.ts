/**
 * Live Feature
 *
 * Voice and real-time communication features including:
 * - Speech-to-Text (STT) with multiple providers
 * - Text-to-Speech (TTS) with multiple providers
 * - Gemini Live bidirectional communication
 * - Audio visualization
 */

// Components
export { VoiceWaveform, useAudioVisualizer } from './components'

// Hooks
export { useVoice } from './hooks'
export type { UseVoiceOptions, UseVoiceReturn } from './hooks'

// Pages
export { LivePage } from './pages'

// Lib (providers, types, utilities)
export * from './lib'
