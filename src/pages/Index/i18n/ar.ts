import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your own AI agents ready to collaborate':
    'وكلاء الذكاء الاصطناعي الخاصون بك جاهزون للتعاون',
  'Failed to get response from LLM. Please try again later.':
    'فشل الحصول على رد من LLM. يرجى المحاولة مرة أخرى لاحقاً.',

  // Agent themes
  Writing: 'الكتابة',
  Learn: 'التعلم',
  Life: 'الحياة',
  Art: 'الفن',
  Coding: 'البرمجة',

  // PWA Install
  'Install {productName}': 'تثبيت {productName}',
  'Install this app on your device for a better experience and offline access.':
    'ثبت هذا التطبيق على جهازك للحصول على تجربة أفضل والوصول دون اتصال.',
} as const
