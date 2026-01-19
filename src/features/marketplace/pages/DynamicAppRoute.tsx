/**
 * Dynamic App Route
 *
 * Handles catch-all routes by checking if the path matches a page key from any
 * installed marketplace app. Valid routes are determined by the `pages` keys
 * defined in each app's extension definition. If no matching page is found,
 * renders the NotFound page.
 *
 * For an app with pages: { "translate": "...", "settings": "...", "history": "..." }
 * The following routes become valid:
 * - /translate (renders "translate" page)
 * - /settings (renders "settings" page)
 * - /history (renders "history" page)
 * - /:lang/translate (localized page)
 * - /:lang/settings (localized page)
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Spinner } from '@heroui/react'

import DefaultLayout from '@/layouts/Default'
import { Container, Section } from '@/components'
import { useI18n, languages } from '@/i18n'
import { useMarketplaceStore } from '../store'
import { NotFoundPage } from '@/pages/NotFound'
import { getExtensionColorClass } from '../utils'
import { ExtensionPreview } from '../components'
import type { HeaderProps } from '@/lib/types'
import type { LanguageCode } from '@/i18n'
import type { MarketplaceExtension } from '../types'

// Supported language codes for URL detection
const SUPPORTED_LANG_CODES = Object.keys(languages)

/**
 * Parse the URL path to extract the page key
 * Returns the page key that should match a key in any app's pages object
 */
function parseAppPath(pathname: string): {
  pageKey: string | null
  lang: string | null
} {
  const pathParts = pathname.split('/').filter(Boolean)

  if (pathParts.length === 0) {
    return { pageKey: null, lang: null }
  }

  // Check if first part is a language code
  const isLangCode =
    pathParts[0]?.length === 2 && SUPPORTED_LANG_CODES.includes(pathParts[0])

  if (isLangCode) {
    // /:lang/:pageKey
    return {
      lang: pathParts[0],
      pageKey: pathParts[1] || null,
    }
  }

  // /:pageKey
  return {
    lang: null,
    pageKey: pathParts[0] || null,
  }
}

export function DynamicAppRoute() {
  const location = useLocation()
  const { lang } = useI18n()
  const [isLoadingApp, setIsLoadingApp] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [loadedExtension, setLoadedExtension] =
    useState<MarketplaceExtension | null>(null)

  const installed = useMarketplaceStore((state) => state.installed)
  const installedApps = useMemo(
    () =>
      Array.from(installed.values()).filter(
        (inst) => inst.enabled && inst.extension.type === 'app',
      ),
    [installed],
  )
  const isLoadingInstalled = useMarketplaceStore(
    (state) => state.isLoadingInstalled,
  )
  const loadExtensions = useMarketplaceStore((state) => state.loadExtensions)
  const loadInstalledExtensions = useMarketplaceStore(
    (state) => state.loadInstalledExtensions,
  )
  const loadExtensionById = useMarketplaceStore(
    (state) => state.loadExtensionById,
  )

  // Parse the URL path to extract the page key
  const { pageKey } = useMemo(
    () => parseAppPath(location.pathname),
    [location.pathname],
  )

  // Find the installed app that has this page key in its pages object
  const installedApp = useMemo(() => {
    if (!pageKey) return undefined
    return installedApps.find((app) => {
      const pages = app.extension.pages
      return pages && Object.keys(pages).includes(pageKey)
    })
  }, [pageKey, installedApps])

  // Use loaded extension if available, otherwise fall back to installed extension
  const ext = loadedExtension || installedApp?.extension

  // Load extensions on mount
  useEffect(() => {
    Promise.all([loadExtensions(), loadInstalledExtensions()]).finally(() =>
      setHasInitialized(true),
    )
  }, [loadExtensions, loadInstalledExtensions])

  // Get localized metadata
  const localizedName = ext?.i18n?.[lang as LanguageCode]?.name || ext?.name
  const localizedDescription =
    ext?.i18n?.[lang as LanguageCode]?.description || ext?.description

  // Get the page code
  const pageCode = ext?.pages?.[pageKey || ''] || ''

  // Load full extension details when app is found
  // Reset loaded extension when the installed app changes (e.g., navigating between apps)
  useEffect(() => {
    if (!installedApp) {
      setLoadedExtension(null)
      return
    }

    // If we already loaded this extension, don't reload
    if (loadedExtension?.id === installedApp.extension.id) {
      return
    }

    // Reset and load the new extension
    setLoadedExtension(null)
    setIsLoadingApp(true)
    loadExtensionById(installedApp.extension.id)
      .then((ext) => {
        if (ext) {
          setLoadedExtension(ext)
        } else {
          // Registry not available, fall back to the extension stored in database
          setLoadedExtension(installedApp.extension)
        }
      })
      .finally(() => {
        setIsLoadingApp(false)
      })
  }, [installedApp?.extension.id, installedApp?.extension, loadExtensionById])

  // Show loading state while installed apps are being loaded
  if (!hasInitialized || isLoadingInstalled || isLoadingApp) {
    return (
      <DefaultLayout>
        <Section>
          <Container>
            <div className="flex items-center justify-center py-2">
              <Spinner size="lg" />
            </div>
          </Container>
        </Section>
      </DefaultLayout>
    )
  }

  // If no matching app found, show NotFound
  if (!installedApp || !pageKey || !ext) {
    return <NotFoundPage />
  }

  const header: HeaderProps = {
    icon: {
      name: ext.icon || 'Puzzle',
      color: getExtensionColorClass(ext.color),
    },
    title: localizedName || ext.name,
    subtitle: localizedDescription || ext.description,
  }

  return (
    <DefaultLayout header={header}>
      <ExtensionPreview
        extensionId={ext.id}
        extensionName={localizedName || ext.name}
        pageCode={pageCode}
        i18n={ext.i18n}
        className="min-h-[300px]"
      />
    </DefaultLayout>
  )
}

export default DynamicAppRoute
