import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  Render: 'Rendern',
  Code: 'Code',
  'Loading…': 'Lädt…',
} as const
