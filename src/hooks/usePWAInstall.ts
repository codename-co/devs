import { useEffect, useState } from 'react'
import { userSettings } from '@/stores/userStore'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isRunningAsPWA, setIsRunningAsPWA] = useState(false)
  const pwaInstallPromptDismissed = userSettings(
    (state) => state.pwaInstallPromptDismissed,
  )
  const setPwaInstallPromptDismissed = userSettings(
    (state) => state.setPwaInstallPromptDismissed,
  )

  useEffect(() => {
    // Check if app is running as installed PWA
    const checkIfRunningAsPWA = () => {
      // Check multiple indicators that app is running as PWA
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')

      setIsRunningAsPWA(isStandalone)

      // If running as PWA, mark as installed
      if (isStandalone) {
        setIsInstalled(true)
      }
    }

    checkIfRunningAsPWA()

    const beforeInstallPromptHandler = (e: Event) => {
      // Prevent the default browser install UI
      e.preventDefault()

      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent)

      // Only set installable if:
      // - User hasn't dismissed the prompt
      // - App is not already running as PWA
      if (!pwaInstallPromptDismissed && !isRunningAsPWA) {
        setIsInstallable(true)
      }
    }

    const appInstalledHandler = () => {
      // App has been installed
      setIsInstalled(true)
      setIsInstallable(false)
      setInstallPrompt(null)

      // Reset the dismissal preference when app is installed
      setPwaInstallPromptDismissed(false)
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler)

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', appInstalledHandler)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        beforeInstallPromptHandler,
      )
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [pwaInstallPromptDismissed, setPwaInstallPromptDismissed])

  const triggerInstall = async () => {
    if (!installPrompt) {
      console.warn('PWA Install: No install prompt available')
      return
    }

    // Show the install prompt
    await installPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await installPrompt.userChoice

    console.log(`PWA Install: User response - ${outcome}`)

    // Reset state after prompting
    setInstallPrompt(null)
    setIsInstallable(false)

    return outcome
  }

  const dismissInstallPrompt = () => {
    // Hide the prompt
    setIsInstallable(false)

    // Persist the dismissal preference
    setPwaInstallPromptDismissed(true)
  }

  return {
    isInstallable,
    isInstalled,
    isRunningAsPWA,
    triggerInstall,
    dismissInstallPrompt,
  }
}
