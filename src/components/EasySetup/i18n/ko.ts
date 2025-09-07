import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'LLM Providers': 'LLM 공급자',
} as const
