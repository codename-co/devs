import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Music sheet': '악보',
} as const
