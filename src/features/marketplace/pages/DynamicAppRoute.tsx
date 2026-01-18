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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Spinner } from '@heroui/react'

import DefaultLayout from '@/layouts/Default'
import { Container, Section } from '@/components'
import { useI18n, languages } from '@/i18n'
import { useMarketplaceStore } from '../store'
import { NotFoundPage } from '@/pages/NotFound'
import { getExtensionColorClass, generateAppPageHtml } from '../utils'
import { userSettings } from '@/stores/userStore'
import { LLMService } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
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
  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  // Handle messages from the sandboxed iframe (for async operations like LLM)
  const handleIframeMessage = useCallback(
    async (event: MessageEvent) => {
      // Verify the message is from our iframe
      if (iframeRef.current?.contentWindow !== event.source) return

      const { type, requestId, payload } = event.data || {}
      if (!type) return

      // Handle keyboard events - forward to parent document
      if (type === 'DEVS_KEYBOARD_EVENT') {
        const {
          key,
          code,
          keyCode,
          which,
          altKey,
          ctrlKey,
          metaKey,
          shiftKey,
          repeat,
        } = payload || {}
        const syntheticEvent = new KeyboardEvent('keydown', {
          key,
          code,
          keyCode,
          which,
          altKey,
          ctrlKey,
          metaKey,
          shiftKey,
          repeat,
          bubbles: true,
          cancelable: true,
        })
        document.dispatchEvent(syntheticEvent)
        return
      }

      // Handle toast (fire-and-forget, no response needed)
      if (type === 'DEVS_UI_TOAST') {
        const { addToast } = await import('@heroui/react')
        const { message, options = {} } = payload || {}
        addToast({ title: message, color: options.type || 'default' })
        return
      }

      // For other message types, requestId is required
      if (!requestId) return

      let response: { success: boolean; data?: unknown; error?: string }

      try {
        switch (type) {
          case 'DEVS_LLM_CHAT': {
            // Get user's active LLM config using CredentialService
            const config = await CredentialService.getActiveConfig()

            if (!config) {
              response = {
                success: false,
                error:
                  'No LLM provider configured. Please add credentials in Settings.',
              }
              break
            }

            const { messages, options = {} } = payload || {}
            const result = await LLMService.chat(messages, {
              ...config,
              temperature: options.temperature ?? config.temperature,
              maxTokens: options.maxTokens ?? config.maxTokens,
            })

            response = {
              success: true,
              data: {
                content: result.content,
                usage: result.usage,
              },
            }
            break
          }

          case 'DEVS_AGENTS_LIST': {
            const { loadBuiltInAgents } = await import('@/stores/agentStore')
            const { db } = await import('@/lib/db')
            const builtIn = await loadBuiltInAgents()
            const custom = await db.getAll('agents')
            const customIds = new Set(custom.map((a) => a.id))
            const agents = [
              ...builtIn.filter((a) => !customIds.has(a.id) && !a.deletedAt),
              ...custom.filter((a) => !a.deletedAt),
            ].map((a) => ({
              id: a.id,
              slug: a.slug,
              name: a.name,
              role: a.role,
              icon: a.icon,
              instructions: a.instructions,
            }))
            response = { success: true, data: agents }
            break
          }

          case 'DEVS_AGENTS_GET': {
            const { idOrSlug } = payload || {}
            const { getAgentById, getAgentBySlug, loadBuiltInAgents } =
              await import('@/stores/agentStore')
            // Try custom agents first
            let agent =
              (await getAgentById(idOrSlug)) || (await getAgentBySlug(idOrSlug))
            // If not found, check built-in
            if (!agent) {
              const builtIn = await loadBuiltInAgents()
              agent =
                builtIn.find((a) => a.id === idOrSlug || a.slug === idOrSlug) ||
                null
            }
            if (agent && !agent.deletedAt) {
              response = {
                success: true,
                data: {
                  id: agent.id,
                  slug: agent.slug,
                  name: agent.name,
                  role: agent.role,
                  icon: agent.icon,
                  instructions: agent.instructions,
                },
              }
            } else {
              response = { success: true, data: null }
            }
            break
          }

          case 'DEVS_IMAGE_GENERATE': {
            const { ImageGenerationService } = await import(
              '@/features/studio/services/image-generation-service'
            )
            const { prompt, options = {} } = payload || {}
            const config = await CredentialService.getActiveConfig()
            if (!config || !config.apiKey) {
              response = {
                success: false,
                error:
                  'No image provider configured. Please set up a provider in Settings.',
              }
              break
            }
            const result = await ImageGenerationService.generate(
              prompt,
              options,
              {
                provider: options.provider || 'openai',
                apiKey: config.apiKey,
              },
            )
            response = {
              success: true,
              data: {
                url: result.images?.[0]?.url,
                base64: result.images?.[0]?.base64,
              },
            }
            break
          }

          case 'DEVS_STORAGE_SET': {
            const { key, value } = payload || {}
            const storageKey = `devs_ext_${ext?.id}_${key}`
            localStorage.setItem(storageKey, JSON.stringify(value))
            response = { success: true, data: undefined }
            break
          }

          case 'DEVS_STORAGE_GET': {
            const { key } = payload || {}
            const storageKey = `devs_ext_${ext?.id}_${key}`
            const raw = localStorage.getItem(storageKey)
            response = { success: true, data: raw ? JSON.parse(raw) : null }
            break
          }

          case 'DEVS_STORAGE_REMOVE': {
            const { key } = payload || {}
            const storageKey = `devs_ext_${ext?.id}_${key}`
            localStorage.removeItem(storageKey)
            response = { success: true, data: undefined }
            break
          }

          case 'DEVS_STORAGE_KEYS': {
            const prefix = `devs_ext_${ext?.id}_`
            const keys: string[] = []
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (k?.startsWith(prefix)) {
                keys.push(k.slice(prefix.length))
              }
            }
            response = { success: true, data: keys }
            break
          }

          case 'DEVS_UI_CONFIRM': {
            // Simple implementation using browser confirm for now
            const { title, message } = payload || {}
            const confirmed = window.confirm(`${title}\n\n${message}`)
            response = { success: true, data: confirmed }
            break
          }

          default:
            response = {
              success: false,
              error: `Unknown message type: ${type}`,
            }
        }
      } catch (err) {
        response = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }

      // Send response back to the iframe
      iframeRef.current?.contentWindow?.postMessage(
        { type: `${type}_RESPONSE`, requestId, ...response },
        '*',
      )
    },
    [ext?.id],
  )

  // Set up message listener for iframe communication
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [handleIframeMessage])

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

  // Subscribe to theme changes reactively
  const theme = userSettings((state) => state.theme)
  const isDarkTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme === 'dark'
  }, [theme])

  // Build context object to inject into the iframe
  const devsContext = useMemo(
    () => ({
      extensionId: ext?.id,
      extensionName: ext?.name,
      theme: isDarkTheme ? ('dark' as const) : ('light' as const),
      language: lang,
      // Include i18n messages for the current locale (with English fallback)
      i18n: {
        ...ext?.i18n?.['en']?.messages,
        ...ext?.i18n?.[lang as LanguageCode]?.messages,
      },
    }),
    [ext?.id, ext?.name, ext?.i18n, isDarkTheme, lang],
  )

  // Generate the HTML for the iframe (must be before conditional returns)
  const iframeSrcDoc = useMemo(
    () => generateAppPageHtml(pageCode, isDarkTheme, devsContext),
    [pageCode, isDarkTheme, devsContext],
  )

  // Key to force iframe refresh when theme changes
  const iframeKey = useMemo(
    () => `${ext?.id}-${isDarkTheme ? 'dark' : 'light'}`,
    [ext?.id, isDarkTheme],
  )

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
      <iframe
        key={iframeKey}
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        className="w-full flex-1 min-h-[300px] border-0"
        sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
        title={localizedName || ext.name}
        // @ts-ignore
        allowtransparency="true"
        allowFullScreen={false}
      />
    </DefaultLayout>
  )
}

export default DynamicAppRoute
