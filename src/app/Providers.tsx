import { HeroUIProvider } from '@heroui/react'
import { useHref, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import * as SyncModule from '@/features/sync'
import { ServiceWorkerManager } from '@/lib/service-worker'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { successToast } from '@/lib/toast'
import { userSettings } from '@/stores/userStore'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { useSyncStore } from '@/features/sync'
import { ServiceWorkerUpdatePrompt } from '@/components/ServiceWorkerUpdatePrompt'
import { I18nProvider, useI18n } from '@/i18n'
import localI18n from './i18n'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const theme = userSettings((state) => state.theme)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const initializeSync = useSyncStore((state) => state.initialize)
  const enableSync = useSyncStore((state) => state.enableSync)
  const { t } = useI18n(localI18n)

  // Handle ?join= parameter for P2P sync
  useEffect(() => {
    const joinRoomId = searchParams.get('join')
    if (joinRoomId) {
      // Remove the join parameter from URL
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('join')
      setSearchParams(newSearchParams, { replace: true })

      // Initialize and connect to the sync room
      const joinSyncRoom = async () => {
        try {
          console.log('[Providers] Joining sync room:', joinRoomId)
          await initializeSync()
          await enableSync(joinRoomId, undefined, 'join')
          console.log('[Providers] Successfully joined sync room')
          successToast(t('Successfully joined sync room'))
        } catch (error) {
          console.error('[Providers] Failed to join sync room:', error)
        }
      }
      joinSyncRoom()
    }
  }, [searchParams, setSearchParams, initializeSync, enableSync, t])

  useEffect(() => {
    // Initialize platform services
    const initializePlatform = async () => {
      try {
        // Initialize database
        await db.init()

        // Initialize secure storage
        await SecureStorage.init()

        // Load credentials (will create default local provider if none exist)
        await loadCredentials()

        // Initialize sync (Yjs + P2P if enabled)
        // This initializes persistence and makes data available to reactive hooks
        await initializeSync()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      if (theme === 'system') {
        // Use system preference
        const isDarkMode = mediaQuery.matches
        root.classList.toggle('dark', isDarkMode)
        root.classList.toggle('light', !isDarkMode)
      } else {
        // Use explicit theme
        root.classList.toggle('dark', theme === 'dark')
        root.classList.toggle('light', theme === 'light')
      }
    }

    // Apply initial theme
    applyTheme()

    // Listen for system theme changes when in auto mode
    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme)
      return () => mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [theme])

  return (
    <>
      <main className="text-foreground bg-background min-h-full">
        {children}
      </main>
      <ServiceWorkerUpdatePrompt />
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
