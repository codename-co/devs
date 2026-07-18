/**
 * Supertonic TTS voice metadata.
 *
 * Kept transformers-free and separate from `supertonic.ts` so provider listings
 * (`getAvailableTTSProviders`) can read voice metadata without pulling the
 * `@huggingface/transformers` runtime into the boot graph (REPORT §4 Phase 1).
 */
import type { TTSVoice } from '../types'

export const SUPERTONIC_VOICES: TTSVoice[] = [
  // Female voices
  {
    id: 'F1',
    name: 'Female 1',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F2',
    name: 'Female 2',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F3',
    name: 'Female 3',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F4',
    name: 'Female 4',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  {
    id: 'F5',
    name: 'Female 5',
    language: 'multilingual',
    gender: 'female',
    provider: 'supertonic',
  },
  // Male voices
  {
    id: 'M1',
    name: 'Male 1',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M2',
    name: 'Male 2',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M3',
    name: 'Male 3',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M4',
    name: 'Male 4',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
  {
    id: 'M5',
    name: 'Male 5',
    language: 'multilingual',
    gender: 'male',
    provider: 'supertonic',
  },
]
