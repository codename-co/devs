import { HeroUIProvider, ToastProvider } from '@heroui/react'
import { useHref, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize offline support
    const initOfflineSupport = async () => {
      // TODO: Implement offline support initialization logic
    }

    initOfflineSupport()
  }, [])

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <ToastProvider />
      {children}
    </HeroUIProvider>
  )
}
