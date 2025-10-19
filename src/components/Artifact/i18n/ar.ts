import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Expand artifacts panel': 'توسيع لوحة القطع الأثرية',
  'Minimize artifacts panel': 'تصغير لوحة القطع الأثرية',
  'Previous artifact': 'القطعة الأثرية السابقة',
  'Next artifact': 'القطعة الأثرية التالية',
  Dependencies: 'التبعيات',
  'Validates Requirements': 'يتحقق من المتطلبات',
  'No artifact selected': 'لم يتم اختيار قطعة أثرية',
} as const
