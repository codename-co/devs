import { createContext, type ReactNode, useContext, useMemo } from 'react'

import { type Lang, useTranslations, useUrl } from './utils'
import { en } from './locales'

import { userSettings } from '@/stores/userStore'

interface I18nContextValue {
  lang: Lang
  t: ReturnType<typeof useTranslations>
  url: ReturnType<typeof useUrl>
}

interface EnhancedI18nContextValue<MoreLocales> {
  lang: Lang
  t: MoreLocales extends { en: readonly string[] }
    ? (
        key: MoreLocales['en'][number] | (typeof en)[number],
        vars?: Record<string, any>,
        options?: { allowJSX?: boolean },
      ) => string
    : ReturnType<typeof useTranslations<MoreLocales>>
  url: ReturnType<typeof useUrl>
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  lang?: Lang // Now optional - falls back to user settings
  children: ReactNode
}

/**
 * I18nProvider provides the current language and translation helper to all sub-components
 *
 * @param lang - Optional language override. If not provided, uses user's language preference from userStore
 * @param children - Child components that will have access to i18n context
 */
export const I18nProvider = ({ lang, children }: I18nProviderProps) => {
  const userLanguage = userSettings((state) => state.language)

  const value = useMemo(() => {
    // Use provided lang prop or fall back to user's language preference
    const currentLang = lang ?? userLanguage
    const t = useTranslations(currentLang)
    const url = useUrl(currentLang)

    return { lang: currentLang, t, url }
  }, [lang, userLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Hook to access the current language and translation helper (basic version)
 */
export function useI18n(): I18nContextValue

/**
 * Hook to access the current language and translation helper with local i18n support
 * @param localI18n - Local translations where 'en' can be an array and other languages are Records
 */
export function useI18n<
  T extends {
    en?: readonly string[]
    [key: string]: Record<string, string> | readonly string[] | undefined
  },
>(localI18n: T): EnhancedI18nContextValue<T>

/**
 * Implementation of the useI18n hook
 */
export function useI18n<
  T extends {
    en?: readonly string[]
    [key: string]: Record<string, string> | readonly string[] | undefined
  },
>(localI18n?: T): I18nContextValue | EnhancedI18nContextValue<T> {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  if (!localI18n) {
    return context
  }

  const enhancedT = (
    key: T extends { en: readonly string[] }
      ? T['en'][number] | (typeof en)[number]
      : string,
    vars?: Record<string, any>,
    options?: { allowJSX?: boolean },
  ): string => {
    // Get current language-specific local translations
    const currentLangLocals = localI18n[context.lang]

    // Handle English array format
    if (context.lang === 'en' && Array.isArray(currentLangLocals)) {
      const englishArray = currentLangLocals as readonly string[]
      if (englishArray.includes(key)) {
        let result = key // For English arrays, the key is the value
        // Apply variable interpolation if vars provided
        if (vars) {
          for (const v in vars) {
            result = result.replaceAll(`{${v}}`, vars[v]) as typeof result
          }
        }
        return result
      }
    }

    // Handle Record format for other languages
    if (
      currentLangLocals &&
      typeof currentLangLocals === 'object' &&
      !Array.isArray(currentLangLocals)
    ) {
      const recordLocals = currentLangLocals as Record<string, string>
      if (recordLocals[key]) {
        let result = recordLocals[key]
        // Apply variable interpolation if vars provided
        if (vars) {
          for (const v in vars) {
            result = result.replaceAll(`{${v}}`, vars[v]) as typeof result
          }
        }
        return result
      }
    }

    // Fall back to English local translations if available and current lang is not English
    if (context.lang !== 'en' && localI18n.en && Array.isArray(localI18n.en)) {
      const englishArray = localI18n.en as readonly string[]
      if (englishArray.includes(key)) {
        let result = key // For English arrays, the key is the value
        // Apply variable interpolation if vars provided
        if (vars) {
          for (const v in vars) {
            result = result.replaceAll(`{${v}}`, vars[v]) as typeof result
          }
        }
        return result
      }
    }

    // Finally fall back to global translations
    try {
      return (context.t as any)(key, vars, options)
    } catch {
      return key
    }
  }

  return {
    ...context,
    t: enhancedT as EnhancedI18nContextValue<T>['t'],
  }
}
