import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  Render: 'العرض',
  Code: 'الكود',
  'Loading…': 'جارٍ التحميل…',
} as const
