import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'AI Providers': 'KI-Anbieter',
} as const
