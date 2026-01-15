import { defaultLang, type LanguageCode, languages } from '@/i18n/locales'

const AVAILABLE_LANGUAGES = Object.keys(languages) as LanguageCode[]

/**
 * Detects the best matching language from the user's browser preferences.
 * Uses navigator.languages to get the user's preferred languages in order.
 *
 * @returns The best matching LanguageCode, or defaultLang if no match found
 */
export function detectPreferredLanguage(): LanguageCode {
  // Get user's preferred languages from browser
  const browserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages : []

  for (const browserLang of browserLanguages) {
    // Try exact match first (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0].toLowerCase() as LanguageCode

    if (AVAILABLE_LANGUAGES.includes(langCode)) {
      return langCode
    }
  }

  // Fallback to default language
  return defaultLang
}

/**
 * Check if the current path has a language prefix
 *
 * @param pathname - The current URL pathname
 * @returns true if the path starts with a language code
 */
export function hasLanguagePrefix(pathname: string): boolean {
  // Remove leading slash and get first segment
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return false

  const firstSegment = segments[0].toLowerCase() as LanguageCode
  return AVAILABLE_LANGUAGES.includes(firstSegment)
}

/**
 * Builds a URL with the appropriate language prefix
 *
 * @param pathname - The current URL pathname (without language prefix)
 * @param lang - The target language code
 * @returns The pathname with the correct language prefix
 */
export function buildLanguageUrl(pathname: string, lang: LanguageCode): string {
  // Remove any existing language prefix
  const cleanPath = pathname.replace(
    new RegExp(`^/(${AVAILABLE_LANGUAGES.join('|')})`),
    '',
  )

  // For default language (en), no prefix needed
  if (lang === defaultLang) {
    return cleanPath || '/'
  }

  // Add language prefix for non-default languages
  return `/${lang}${cleanPath === '/' ? '' : cleanPath}`
}
