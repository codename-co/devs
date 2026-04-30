/**
 * STT Provider Index
 *
 * Exports all Speech-to-Text providers and factory function
 */

import type { STTProvider, STTProviderType } from '../types'
import { WebSpeechSTTProvider } from './web-speech'
import { MoonshineSTTProvider } from './moonshine'
import { WhisperSTTProvider } from './whisper'
import { ParakeetSTTProvider } from './parakeet'
import { CohereSTTProvider } from './cohere'
import { GraniteSTTProvider } from './granite'
import { VibeVoiceSTTProvider } from './vibevoice'

export { WebSpeechSTTProvider } from './web-speech'
export { MoonshineSTTProvider } from './moonshine'
export { WhisperSTTProvider } from './whisper'
export { ParakeetSTTProvider } from './parakeet'
export { CohereSTTProvider } from './cohere'
export { GraniteSTTProvider } from './granite'
export { VibeVoiceSTTProvider } from './vibevoice'

/**
 * Create an STT provider instance
 */
export function createSTTProvider(
  type: STTProviderType,
  options?: { modelId?: string },
): STTProvider {
  switch (type) {
    case 'web-speech':
      return new WebSpeechSTTProvider()

    case 'moonshine':
      return new MoonshineSTTProvider(
        options?.modelId || 'onnx-community/moonshine-base-ONNX',
      )

    case 'whisper':
      return new WhisperSTTProvider(
        options?.modelId || 'onnx-community/whisper-small',
      )

    case 'parakeet':
      return new ParakeetSTTProvider(
        options?.modelId || 'onnx-community/parakeet-ctc-0.6b-ONNX',
      )

    case 'cohere':
      return new CohereSTTProvider(
        options?.modelId || 'onnx-community/cohere-transcribe-03-2026-ONNX',
      )

    case 'granite':
      return new GraniteSTTProvider(
        options?.modelId || 'onnx-community/granite-4.0-1b-speech-ONNX',
      )

    case 'vibevoice':
      return new VibeVoiceSTTProvider(
        options?.modelId || 'onnx-community/VibeVoice-Realtime-0.5B-ONNX',
      )

    case 'gemini-live':
      // Gemini Live is handled separately as a bidirectional provider
      throw new Error('Use GeminiLiveProvider directly for gemini-live STT')

    case 'lm-studio':
      // TODO: Implement LM Studio STT provider
      throw new Error('LM Studio STT provider not yet implemented')

    default:
      throw new Error(`Unknown STT provider type: ${type}`)
  }
}

/**
 * Check if the browser supports the Web Speech API
 */
export function isWebSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return !!SpeechRecognition
}

/**
 * Get list of available STT providers
 * @param language - Optional BCP-47 language code to filter providers by language support
 * @param t - Optional translation function for i18n
 */
export function getAvailableSTTProviders(
  language?: string,
  t: (key: string) => string = (key) => key,
): {
  type: STTProviderType
  name: string
  description: string
  isLocal: boolean
  isDisabled?: boolean
  disabledReason?: string
}[] {
  // Extract base language code (e.g., 'en-US' -> 'en')
  const langCode = language?.split('-')[0].toLowerCase()
  const isEnglish = !langCode || langCode === 'en'

  // Check browser capabilities
  const webSpeechSupported = isWebSpeechSupported()
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator

  return [
    {
      type: 'web-speech',
      name: t('Browser'),
      description: t('Fast but requires internet.'),
      isLocal: false,
      isDisabled: !webSpeechSupported,
      disabledReason: !webSpeechSupported
        ? t('Web Speech API is not supported in this browser')
        : undefined,
    },
    {
      type: 'moonshine',
      name: t('Moonshine'),
      description: t(
        'Fast local transcription (~200ms). English only. ~166MB download.',
      ),
      isLocal: true,
      isDisabled: !isEnglish,
      disabledReason: !isEnglish
        ? t('Moonshine only supports English')
        : undefined,
    },
    {
      type: 'whisper',
      name: t('Whisper'),
      description: t('High quality, multilingual. ~500MB download.'),
      isLocal: true,
    },
    {
      type: 'parakeet',
      name: t('Parakeet'),
      description: t(
        'NVIDIA SOTA. Auto-punctuation. English & French. ~2.5GB download.',
      ),
      isLocal: true,
    },
    {
      type: 'cohere',
      name: t('Cohere Transcribe'),
      description: t(
        'SOTA multilingual (14 langs). 2B params, 4-bit. ~2.1GB download.',
      ),
      isLocal: true,
    },
    {
      type: 'granite',
      name: t('Granite Speech'),
      description: t(
        'Multilingual, keyword biasing. Requires WebGPU. ~600MB download.',
      ),
      isLocal: true,
      isDisabled: !hasWebGPU,
      disabledReason: !hasWebGPU
        ? t('Granite Speech requires WebGPU')
        : undefined,
    },
    {
      type: 'vibevoice',
      name: t('VibeVoice'),
      description: t(
        'Microsoft open-source real-time speech. Requires WebGPU. ~500MB download.',
      ),
      isLocal: true,
      isDisabled: !hasWebGPU,
      disabledReason: !hasWebGPU
        ? t('VibeVoice requires WebGPU')
        : undefined,
    },
    {
      type: 'gemini-live',
      name: t('Gemini Live'),
      description: t('Bidirectional audio with Gemini. Requires API key.'),
      isLocal: false,
    },
  ]
}
