import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  Presentation: 'عرض تقديمي',
  Slideshow: 'عرض شرائح',
  'Export/Print': 'تصدير / طباعة',
} as const
