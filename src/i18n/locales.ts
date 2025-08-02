import * as localesIndex from './locales/index'

export const languages = {
  en: 'English',
  fr: 'Français',
} as const

export const defaultLang = 'en'

export type I18n = Record<(typeof localesIndex.en)[number], string>

export const locales = localesIndex as Record<
  keyof typeof languages,
  I18n | Partial<I18n>
>
