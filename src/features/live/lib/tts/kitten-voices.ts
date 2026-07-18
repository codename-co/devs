/**
 * Kitten TTS voice metadata.
 *
 * Kept transformers-free and separate from `kitten.ts` so provider listings
 * (`getAvailableTTSProviders`) can read voice metadata without pulling the
 * `@huggingface/transformers` runtime into the boot graph (REPORT §4 Phase 1).
 */
import type { TTSVoice } from '../types'

export const KITTEN_VOICES: TTSVoice[] = [
  {
    id: 'expr-voice-2-f',
    name: 'Expressive Female 1',
    language: 'en',
    gender: 'female',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-3-f',
    name: 'Expressive Female 2',
    language: 'en',
    gender: 'female',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-4-f',
    name: 'Expressive Female 3',
    language: 'en',
    gender: 'female',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-2-m',
    name: 'Expressive Male 1',
    language: 'en',
    gender: 'male',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-3-m',
    name: 'Expressive Male 2',
    language: 'en',
    gender: 'male',
    provider: 'kitten',
  },
  {
    id: 'expr-voice-4-m',
    name: 'Expressive Male 3',
    language: 'en',
    gender: 'male',
    provider: 'kitten',
  },
]
