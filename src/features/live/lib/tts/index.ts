/**
 * TTS Provider Index
 *
 * Exports all Text-to-Speech providers and factory function
 */

import type { TTSProvider, TTSProviderType } from '../types'
import { WebSpeechTTSProvider } from './web-speech'
import { KOKORO_VOICES, KokoroTTSProvider } from './kokoro'

export { WebSpeechTTSProvider } from './web-speech'
export { KokoroTTSProvider, KOKORO_VOICES } from './kokoro'

/**
 * Create a TTS provider instance
 */
export function createTTSProvider(
  type: TTSProviderType,
  options?: {
    modelId?: string
    dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'
  },
): TTSProvider {
  switch (type) {
    case 'web-speech':
      return new WebSpeechTTSProvider()

    case 'kokoro':
      return new KokoroTTSProvider(
        options?.modelId || 'onnx-community/Kokoro-82M-v1.0-ONNX',
        options?.dtype || 'q4f16',
      )

    case 'supertonic':
      // TODO: Implement Supertonic TTS provider
      throw new Error('Supertonic TTS provider not yet implemented')

    case 'gemini-live':
      // Gemini Live is handled separately as a bidirectional provider
      throw new Error('Use GeminiLiveProvider directly for gemini-live TTS')

    default:
      throw new Error(`Unknown TTS provider type: ${type}`)
  }
}

/**
 * Get list of available TTS providers
 * @param t - Optional translation function for i18n
 */
export function getAvailableTTSProviders(
  t: (key: string) => string = (key) => key,
): {
  type: TTSProviderType
  name: string
  description: string
  isLocal: boolean
  voiceCount?: number
}[] {
  return [
    {
      type: 'web-speech',
      name: t('Browser'),
      description: t('Instant but robotic.'),
      isLocal: true,
    },
    {
      type: 'kokoro',
      name: t('Kokoro'),
      description: t('SOTA quality, 4-bit quantized. (↓ ~154MB)'),
      isLocal: true,
      voiceCount: KOKORO_VOICES.length,
    },
    {
      type: 'gemini-live',
      name: t('Gemini Live'),
      description: t('Natural voice with Gemini. Requires API key.'),
      isLocal: false,
    },
  ]
}
