import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Let your agents take it from here': 'دع وكلاءك يتولون الأمر من هنا',
  'Delegate complex tasks to your own AI teams':
    'فوّض المهام المعقدة إلى فرق الذكاء الاصطناعي الخاصة بك',
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
