import * as localesIndex from './locales/index'

export const languages = {
  en: 'English',
  fr: 'Français',
  ko: '한국어',
} as const
export const en = localesIndex.en

export const defaultLang = 'en'

export type I18n = Record<(typeof localesIndex.en)[number], string>

export const locales = localesIndex as Record<
  keyof typeof languages,
  I18n | Partial<I18n>
>

export const meta = Object.fromEntries(
  Object.keys(languages).map((lang) => [
    lang,
    (localesIndex as any)[`${lang}_meta`],
  ]),
) as Record<keyof typeof languages, any>
