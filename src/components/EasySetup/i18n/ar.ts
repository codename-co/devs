import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'AI Providers': 'مزودات AI',
} as const
