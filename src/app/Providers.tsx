import { HeroUIProvider } from '@heroui/react'
import { useHref, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import * as SyncModule from '@/features/sync'
import { useAutoBackup, tryReconnectLocalBackup } from '@/features/local-backup'
import { ServiceWorkerManager } from '@/lib/service-worker'
import { whenReady, migrateFromIndexedDB } from '@/lib/yjs'
import { SecureStorage } from '@/lib/crypto'
import { loadModelRegistry } from '@/lib/llm/models'
import {
  getColorTheme,
  isThemeDark,
  colorToHsl,
  contrastForegroundHsl,
  generatePrimaryScale,
} from '@/lib/themes'
import { userSettings } from '@/stores/userStore'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { useSyncStore } from '@/features/sync'
import { SyncPasswordModal } from '@/features/sync/components/SyncPasswordModal'
import { ServiceWorkerUpdatePrompt } from '@/components/ServiceWorkerUpdatePrompt'
import { AddLLMProviderModal } from '@/components/AddLLMProviderModal'
import { I18nProvider, languageDirection } from '@/i18n'

// Expose sync debug tools in browser console
;(window as unknown as Record<string, unknown>).devsSync = {
  getDebugInfo: SyncModule.getSyncDebugInfo,
  getWebrtcDebugInfo: SyncModule.getWebrtcDebugInfo,
  requestSync: SyncModule.requestSync,
  getYDoc: SyncModule.getYDoc,
  getAgentsMap: SyncModule.getAgentsMap,
  getConversationsMap: SyncModule.getConversationsMap,
}
console.log('[Dev] Sync debug tools available at window.devsSync')

/** Inner component that uses i18n hooks - must be rendered inside I18nProvider */
function ProvidersInner({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const theme = userSettings((state) => state.theme)
  const colorTheme = userSettings((state) => state.colorTheme)
  const lang = userSettings((state) => state.language)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const initializeSync = useSyncStore((state) => state.initialize)
  const setPendingJoinRoomId = useSyncStore(
    (state) => state.setPendingJoinRoomId,
  )

  // Handle ?join= parameter for P2P sync
  // Instead of auto-joining, set the pending room ID so the
  // SyncPasswordModal appears and the user enters the password first.
  const joinHandledRef = useRef(false)
  useEffect(() => {
    if (joinHandledRef.current) return
    const joinRoomId = searchParams.get('join')
    if (joinRoomId) {
      joinHandledRef.current = true

      console.log(
        '[Providers] Sync join requested — showing password modal for room:',
        joinRoomId,
      )
      // Set the pending room ID so the password modal opens
      setPendingJoinRoomId(joinRoomId)

      // Clean the URL using History API directly to avoid triggering
      // a React Router re-render that would dismiss the password modal
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      window.history.replaceState(
        null,
        '',
        url.pathname + url.search + url.hash,
      )
    }
  }, [searchParams, setPendingJoinRoomId])

  useEffect(() => {
    // Initialize platform services
    const initializePlatform = async () => {
      try {
        // Wait for Yjs IndexedDB persistence to sync
        await whenReady

        // Run one-time migration from legacy IndexedDB to Yjs
        await migrateFromIndexedDB()

        // Initialize secure storage
        await SecureStorage.init()

        // Preload model registry (needed before loading credentials)
        await loadModelRegistry()

        // Load credentials (will create default local provider if none exist)
        await loadCredentials()

        // Initialize sync (Yjs + P2P if enabled)
        // This initializes persistence and makes data available to reactive hooks
        await initializeSync()

        // Try to reconnect local backup if previously enabled
        const localBackupReconnected = await tryReconnectLocalBackup()
        if (localBackupReconnected) {
          console.log('Local backup reconnected successfully')
        }

        // Register service worker
        await ServiceWorkerManager.register()

        // Note: Artifacts and other data load automatically via reactive hooks
        // No manual loading required - data syncs from Yjs to components instantly

        console.log('Platform initialized successfully')
      } catch (error) {
        console.error('Failed to initialize platform:', error)
      }
    }

    initializePlatform()
  }, [])

  // Apply theme (light/dark) and color-theme CSS variables to document
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const ct = getColorTheme(colorTheme)
    const forceDark = isThemeDark(ct)

    // Set CSS custom properties for the active color theme
    root.style.setProperty('--devs-primary', ct.primaryColor)
    root.style.setProperty('--devs-bg', ct.backgroundColor)
    root.style.setProperty('--devs-heading-font', ct.headingFont)
    root.style.setProperty('--devs-body-font', ct.bodyFont)
    root.style.setProperty('font-family', ct.bodyFont)

    // Override HeroUI primary color CSS variables so all Tailwind
    // `*-primary` utilities (bg-primary, text-primary, etc.) reflect
    // the active color theme's primary color.
    const primaryHsl = colorToHsl(ct.primaryColor)
    const fgHsl = contrastForegroundHsl(ct.primaryColor)
    root.style.setProperty('--heroui-primary', primaryHsl)
    root.style.setProperty('--heroui-primary-foreground', fgHsl)
    root.style.setProperty('--heroui-focus', primaryHsl)

    // Generate and apply the full 50–900 shade scale so that
    // classes like bg-primary-600, text-primary-200, etc. all
    // derive from the active theme's primary color.
    const scale = generatePrimaryScale(ct.primaryColor)
    for (const [shade, hsl] of Object.entries(scale)) {
      root.style.setProperty(`--heroui-primary-${shade}`, hsl)
    }

    // Add a data attribute for potential CSS selectors
    root.dataset.colorTheme = ct.id

    const applyTheme = () => {
      if (forceDark) {
        // Color theme has a dark background → always dark mode
        root.classList.add('dark')
        root.classList.remove('light')
      } else if (theme === 'system') {
        const isDarkMode = mediaQuery.matches
        root.classList.toggle('dark', isDarkMode)
        root.classList.toggle('light', !isDarkMode)
      } else {
        root.classList.toggle('dark', theme === 'dark')
        root.classList.toggle('light', theme === 'light')
      }
    }

    applyTheme()

    if (!forceDark && theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme)
      return () => mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [theme, colorTheme])

  // Apply language direction (ltr/rtl) and lang attribute to <html>
  // so that portals, modals, and all DOM elements inherit direction.
  useEffect(() => {
    const root = document.documentElement
    root.dir = languageDirection[lang] || 'ltr'
    root.lang = lang || 'en'
  }, [lang])

  // Auto-backup: automatically sync to local folder when data changes
  useAutoBackup()

  return (
    <>
      <main className="text-foreground bg-background min-h-full">
        {children}
      </main>
      <ServiceWorkerUpdatePrompt />
      <AddLLMProviderModal lang={lang} />
      <SyncPasswordModal />
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <I18nProvider>
        <ProvidersInner>{children}</ProvidersInner>
      </I18nProvider>
    </HeroUIProvider>
  )
}
