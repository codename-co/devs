import { HeroUIProvider } from '@heroui/react'
import { useHref, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ServiceWorkerManager } from '@/lib/service-worker'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { userSettings } from '@/stores/userStore'
import { useArtifactStore } from '@/stores/artifactStore'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { useIdentityStore } from '@/stores/identityStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ServiceWorkerUpdatePrompt } from '@/components/ServiceWorkerUpdatePrompt'
import { I18nProvider } from '@/i18n'

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const theme = userSettings((state) => state.theme)
  const loadArtifacts = useArtifactStore((state) => state.loadArtifacts)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  
  // Identity and workspace stores for auto-initialization
  const userIdentity = useIdentityStore((state) => state.user)
  const createIdentity = useIdentityStore((state) => state.createIdentity)
  const initializeIdentity = useIdentityStore((state) => state.initialize)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace)

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

        // Register service worker
        await ServiceWorkerManager.register()

        // Load artifacts into store
        await loadArtifacts()
        
        // Initialize identity store
        await initializeIdentity()

        console.log('Platform initialized successfully')
      } catch (error) {
        console.error('Failed to initialize platform:', error)
      }
    }

    initializePlatform()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Auto-create identity and default workspace for collaboration features
  useEffect(() => {
    const setupCollaboration = async () => {
      try {
        // Create identity if not exists
        if (!userIdentity) {
          await createIdentity()
        }
      } catch (error) {
        console.error('Failed to setup collaboration:', error)
      }
    }
    
    setupCollaboration()
  }, [userIdentity, createIdentity])
  
  // Create default workspace once identity is ready
  useEffect(() => {
    if (userIdentity && workspaces.length === 0) {
      const workspace = createWorkspace('Personal', userIdentity.id)
      setActiveWorkspace(workspace.id)
    }
  }, [userIdentity, workspaces.length, createWorkspace, setActiveWorkspace])

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
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <I18nProvider>
        <main className="text-foreground bg-background min-h-full">
          {children}
        </main>
        <ServiceWorkerUpdatePrompt />
      </I18nProvider>
    </HeroUIProvider>
  )
}
