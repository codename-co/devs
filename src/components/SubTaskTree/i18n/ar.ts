import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  Completed: 'مكتمل',
  Pending: 'معلق',
} as const
