import { HeroUIProvider, ToastProvider } from '@heroui/react'
import { useHref, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ServiceWorkerManager } from '@/lib/service-worker'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize platform services
    const initializePlatform = async () => {
      try {
        // Initialize database
        await db.init()

        // Initialize secure storage
        await SecureStorage.init()

        // Register service worker
        await ServiceWorkerManager.register()

        console.log('Platform initialized successfully')
      } catch (error) {
        console.error('Failed to initialize platform:', error)
      }
    }

    initializePlatform()
  }, [])

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <ToastProvider />
      {children}
    </HeroUIProvider>
  )
}
