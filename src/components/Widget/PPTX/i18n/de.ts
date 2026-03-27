import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Generation error': 'Erstellungsfehler',
  'Failed to generate PPTX': 'PPTX-Erstellung fehlgeschlagen',
} as const
