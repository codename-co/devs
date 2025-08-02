import { createContext, type ReactNode, useContext, useMemo } from 'react'

import { type Lang, useTranslations, useUrl } from './utils'

import { userSettings } from '@/stores/userStore'

interface I18nContextValue {
  lang: Lang
  t: ReturnType<typeof useTranslations>
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
 * Hook to access the current language and translation helper
 * @returns {I18nContextValue} An object containing the current language and translation function
 * @throws {Error} If used outside of I18nProvider
 */
export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}
