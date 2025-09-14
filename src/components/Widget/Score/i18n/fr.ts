import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Music sheet': 'Partition',
} as const
