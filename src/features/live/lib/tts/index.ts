/**
 * TTS Provider Index
 *
 * Exports all Text-to-Speech providers and factory function
 */

import type { TTSProvider, TTSProviderType } from '../types'
import { WebSpeechTTSProvider } from './web-speech'
import { KOKORO_VOICES } from './kokoro'
import { KITTEN_VOICES } from './kitten-voices'
import { SUPERTONIC_VOICES } from './supertonic-voices'

export { WebSpeechTTSProvider } from './web-speech'
export { KOKORO_VOICES } from './kokoro'
export { KITTEN_VOICES } from './kitten-voices'
export { SUPERTONIC_VOICES } from './supertonic-voices'

/**
 * Create a TTS provider instance.
 *
 * Heavy transformers.js-backed providers are dynamically imported so the
 * `@huggingface/transformers` runtime never lands in the boot graph
 * (REPORT §4 Phase 1) — it loads only when the user selects that provider.
 */
export async function createTTSProvider(
  type: TTSProviderType,
  options?: {
    modelId?: string
    dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'
  },
): Promise<TTSProvider> {
  switch (type) {
    case 'web-speech':
      return new WebSpeechTTSProvider()

    case 'kokoro': {
      const { KokoroTTSProvider } = await import('./kokoro')
      return new KokoroTTSProvider(
        options?.modelId || 'onnx-community/Kokoro-82M-v1.0-ONNX',
        options?.dtype || 'q4f16',
      )
    }

    case 'kitten': {
      const { KittenTTSProvider } = await import('./kitten')
      return new KittenTTSProvider(
        options?.modelId || 'onnx-community/kitten-tts-nano-0.1-ONNX',
      )
    }

    case 'supertonic': {
      const { SupertonicTTSProvider } = await import('./supertonic')
      return new SupertonicTTSProvider(
        options?.modelId || 'onnx-community/Supertonic-TTS-2-ONNX',
      )
    }

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
