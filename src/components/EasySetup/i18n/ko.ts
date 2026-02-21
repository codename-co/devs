import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'AI Providers': 'AI 공급자',
} as const
