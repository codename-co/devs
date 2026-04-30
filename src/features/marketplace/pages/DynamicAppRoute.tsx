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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Spinner } from '@heroui/react'

import { WorkspaceShell } from '@/pages/Workspace/WorkspaceShell'
import { Container, Section } from '@/components'
import { useI18n, languages } from '@/i18n'
import localI18n from './i18n'
import { useMarketplaceStore } from '../store'
import { ExtensionPreview } from '../components'
import type { LanguageCode } from '@/i18n'

// Supported language codes for URL detection
const SUPPORTED_LANG_CODES = Object.keys(languages)

/**
 * Parse the URL path to extract the page key
 * Returns the page key that should match a key in any app's pages object
 *
 * The page key is the first path segment after the optional language prefix.
 * Examples:
 * - /translate → pageKey: "translate"
 * - /translate/settings → pageKey: "translate" (subpath handled by app)
 * - /fr/translate → lang: "fr", pageKey: "translate"
 * - /fr/translate/settings → lang: "fr", pageKey: "translate"
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
    // /:lang/:pageKey/subpath...
    return {
      lang: pathParts[0],
      pageKey: pathParts[1] || null,
    }
  }

  // /:pageKey/subpath...
  return {
    lang: null,
    pageKey: pathParts[0] || null,
  }
}

export function DynamicAppRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const { lang } = useI18n(localI18n)
  const [hasInitialized, setHasInitialized] = useState(false)
  const loadCalledRef = useRef(false)

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

  // Debug logging
  console.debug('[DynamicAppRoute]', {
    pathname: location.pathname,
    pageKey,
    installedAppsCount: installedApps.length,
    installedAppIds: installedApps.map((a) => a.extension.id),
    foundApp: installedApp?.extension.id,
    pageKeys: installedApps.flatMap((a) =>
      Object.keys(a.extension.pages || {}),
    ),
  })

  // Use the installed extension directly - it already contains all the persisted data
  // No need to fetch from the network; the installed extension is the source of truth
  const ext = installedApp?.extension

  // Load extensions on mount – use a ref guard so this runs exactly once
  // regardless of whether the Zustand action references are considered stable.
  useEffect(() => {
    if (loadCalledRef.current) return
    loadCalledRef.current = true
    Promise.all([loadExtensions(), loadInstalledExtensions()]).finally(() =>
      setHasInitialized(true),
    )
  }, [loadExtensions, loadInstalledExtensions])

  // When initialisation is done and no matching app exists, go home.
  // Rendering <NotFoundPage /> would navigate to the parent URL, which may
  // also be unknown and would remount DynamicAppRoute, causing a cascade of
  // network requests and console logs.
  useEffect(() => {
    if (hasInitialized && !isLoadingInstalled && (!installedApp || !pageKey)) {
      navigate('/', { replace: true })
    }
  }, [hasInitialized, isLoadingInstalled, installedApp, pageKey, navigate])

  // Get localized metadata
  const localizedName = ext?.i18n?.[lang as LanguageCode]?.name || ext?.name

  // Get the page code from the installed extension (persisted snapshot)
  const pageCode = ext?.pages?.[pageKey || ''] || ''

  // Show loading state while installed apps are being loaded
  if (!hasInitialized || isLoadingInstalled) {
    return (
      <WorkspaceShell>
        <Section>
          <Container>
            <div className="flex items-center justify-center py-2">
              <Spinner size="lg" />
            </div>
          </Container>
        </Section>
      </WorkspaceShell>
    )
  }

  // If no matching app found, render nothing while the navigate effect fires.
  if (!installedApp || !pageKey || !ext) {
    return null
  }

  return (
    <WorkspaceShell
      title={localizedName || ext.name}
      className="flex flex-col"
    >
      <ExtensionPreview
        extensionId={ext.id}
        extensionName={localizedName || ext.name}
        pageCode={pageCode}
        i18n={ext.i18n}
        className="min-h-0 flex-1"
      />
    </WorkspaceShell>
  )
}

export default DynamicAppRoute
