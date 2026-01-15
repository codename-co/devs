import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  buildLanguageUrl,
  detectPreferredLanguage,
  hasLanguagePrefix,
} from '@/lib/detect-language'
import { userSettings } from '@/stores/userStore'
import { defaultLang, type LanguageCode } from '@/i18n/locales'

const LANGUAGE_DETECTED_KEY = 'devs_language_detected'

/**
 * LanguageRedirect handles automatic language detection and redirection.
 *
 * On first visit to a non-language-prefixed URL:
 * 1. Detects the user's preferred language from navigator.languages
 * 2. If the preferred language differs from the default (en), redirects to the localized URL
 * 3. Saves the user's language preference to userStore
 * 4. Sets a flag to prevent future redirects
 *
 * This ensures users are automatically served content in their preferred language
 * while respecting explicit language choices in the URL.
 */
export function LanguageRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  const [hasChecked, setHasChecked] = useState(false)

  // Get the setLanguage function from userStore
  const setLanguage = userSettings((state) => state.setLanguage)
  const currentStoredLanguage = userSettings((state) => state.language)

  useEffect(() => {
    // Only run once
    if (hasChecked) return

    // Check if we've already detected language in this session
    const alreadyDetected = sessionStorage.getItem(LANGUAGE_DETECTED_KEY)
    if (alreadyDetected) {
      setHasChecked(true)
      return
    }

    // Don't redirect if the URL already has a language prefix
    if (hasLanguagePrefix(location.pathname)) {
      // Mark as detected to avoid future checks
      sessionStorage.setItem(LANGUAGE_DETECTED_KEY, 'true')
      setHasChecked(true)
      return
    }

    // Detect the user's preferred language
    const detectedLang = detectPreferredLanguage()

    // Mark as detected regardless of outcome
    sessionStorage.setItem(LANGUAGE_DETECTED_KEY, 'true')
    setHasChecked(true)

    // If the detected language is not the default, redirect
    if (detectedLang !== defaultLang) {
      // Update the user's stored language preference
      setLanguage(detectedLang as LanguageCode)

      // Build the new URL with language prefix
      const newPath = buildLanguageUrl(
        location.pathname + location.search + location.hash,
        detectedLang,
      )

      // Navigate to the localized URL
      navigate(newPath, { replace: true })
    } else if (currentStoredLanguage !== defaultLang) {
      // If detected language is default but stored is different,
      // update stored to match detected (browser preference changed)
      setLanguage(defaultLang)
    }
  }, [
    hasChecked,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    setLanguage,
    currentStoredLanguage,
  ])

  // This component doesn't render anything
  return null
}
