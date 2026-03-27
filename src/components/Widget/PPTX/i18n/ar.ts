import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Generation error': 'خطأ في الإنشاء',
  'Failed to generate PPTX': 'فشل في إنشاء PPTX',
} as const
