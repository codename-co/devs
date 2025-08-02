import { marked } from 'marked'

import { defaultLang, languages, locales } from './locales'

export type Lang = keyof typeof languages

export const langs = Object.keys(languages).map(
  lang => (lang === defaultLang ? '' : lang) as Lang
)

export const getLangFromUrl = (url: URL) => {
  const [, lang] = url.pathname.split('/')

  try {
    if (lang in locales) return lang as keyof typeof locales
  } catch {}

  return defaultLang
}

export const useTranslations = (lang: Lang = defaultLang) => {
  return function t(
    key: keyof (typeof locales)[typeof defaultLang],
    vars?: Record<string, any>
  ) {
    let tmpl = locales[lang]?.[key] ?? locales[defaultLang][key] ?? key

    for (const v in vars) {
      tmpl = tmpl.replaceAll(`{${v}}`, vars[v])
    }
    const html = marked.parseInline(tmpl) as string

    return html
  }
}

export const useUrl = (lang: Lang = defaultLang) => {
  // return template string
  return function url(path: string) {
    return `/${lang === defaultLang ? '/' : lang}${path}`.replace(/^\/+/g, '/')
  }
}

export const countryCode = (lang: Lang): Lang | string => {
  switch (lang) {
    case 'en':
      return 'gb'
    default:
      return lang
  }
}

export const textDirection = (lang: Lang) => {
  switch (lang) {
    // case 'ar':
    //   // case "fa":
    //   // case "he":
    //   return 'rtl'
    default:
      return 'ltr'
  }
}
