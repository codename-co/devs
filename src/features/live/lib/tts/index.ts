/**
 * TTS Provider Index
 *
 * Exports all Text-to-Speech providers and factory function
 */

import type { TTSProvider, TTSProviderType } from '../types'
import { WebSpeechTTSProvider } from './web-speech'
import { KOKORO_VOICES, KokoroTTSProvider } from './kokoro'
import { KITTEN_VOICES, KittenTTSProvider } from './kitten'
import { SUPERTONIC_VOICES, SupertonicTTSProvider } from './supertonic'

export { WebSpeechTTSProvider } from './web-speech'
export { KokoroTTSProvider, KOKORO_VOICES } from './kokoro'
export { KittenTTSProvider, KITTEN_VOICES } from './kitten'
export { SupertonicTTSProvider, SUPERTONIC_VOICES } from './supertonic'

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

    case 'kitten':
      return new KittenTTSProvider(
        options?.modelId || 'onnx-community/kitten-tts-nano-0.1-ONNX',
      )

    case 'supertonic':
      return new SupertonicTTSProvider(
        options?.modelId || 'onnx-community/Supertonic-TTS-2-ONNX',
      )

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
      type: 'kitten',
      name: t('Kitten'),
      description: t('Ultra-light, instant load. English only. (↓ ~23MB)'),
      isLocal: true,
      voiceCount: KITTEN_VOICES.length,
    },
    {
      type: 'kokoro',
      name: t('Kokoro'),
      description: t('SOTA quality, 4-bit quantized. (↓ ~154MB)'),
      isLocal: true,
      voiceCount: KOKORO_VOICES.length,
    },
    {
      type: 'supertonic',
      name: t('Supertonic'),
      description: t('Multilingual: EN/KO/ES/PT/FR. 10 voices. (↓ ~250MB)'),
      isLocal: true,
      voiceCount: SUPERTONIC_VOICES.length,
    },
    {
      type: 'gemini-live',
      name: t('Gemini Live'),
      description: t('Natural voice with Gemini. Requires API key.'),
      isLocal: false,
    },
  ]
}
