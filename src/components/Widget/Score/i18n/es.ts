import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Music sheet': 'Partitura',
} as const
