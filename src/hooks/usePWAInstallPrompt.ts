import { useEffect, useMemo, useRef, createElement } from 'react'
import { usePWAInstall } from './usePWAInstall'
import { infoToast } from '@/lib/toast'
import { Button, ToastProps } from '@heroui/react'
import { Icon } from '@/components'

interface UsePWAInstallPromptOptions {
  enabled?: boolean
  title: string
  description: string
  buttonLabel?: string
  timeout?: number
  placement?: ToastProps['placement']
}

/**
 * Hook that automatically shows a PWA install prompt toast notification
 * when the app becomes installable and is not already running as a PWA.
 *
 * @param options Configuration options for the install prompt
 * @returns PWA install state and control functions from usePWAInstall
 *
 * @example
 * ```tsx
 * const pwaInstall = usePWAInstallPrompt({
 *   enabled: true,
 *   title: t('Install {productName}', { productName: PRODUCT.displayName }),
 *   description: t('Install this app on your device for a better experience.'),
 *   timeout: 10_000,
 *   placement: 'bottom-center',
 * })
 * ```
 */
export const usePWAInstallPrompt = (options: UsePWAInstallPromptOptions) => {
  const {
    enabled = true,
    title,
    description,
    buttonLabel,
    timeout = 10_000,
    placement = 'bottom-center',
  } = options

  const {
    isInstallable,
    isRunningAsPWA,
    triggerInstall,
    dismissInstallPrompt,
    isInstalled,
  } = usePWAInstall()

  // Track if we've already shown the prompt to prevent duplicates
  const hasShownPromptRef = useRef(false)

  // Show install prompt when app becomes installable
  // But only if not running as PWA and enabled
  const showInstallPrompt = useMemo(
    () => enabled && isInstallable && !isRunningAsPWA,
    [enabled, isInstallable, isRunningAsPWA],
  )

  useEffect(() => {
    // Don't show if we've already shown it
    if (!showInstallPrompt || hasShownPromptRef.current) return

    // Mark as shown
    hasShownPromptRef.current = true

    const handleInstallClick = async () => {
      console.log('PWA Install: User clicked install button')
      const outcome = await triggerInstall()
      if (outcome === 'accepted' || outcome === 'dismissed') {
        dismissInstallPrompt()
      } else {
        console.warn(
          'PWA Install: Install prompt was not shown to the user',
          outcome,
        )
      }
    }

    console.log('CLOZN  ')

    infoToast(title, description, {
      'aria-label': 'PWA Install Prompt',
      timeout,
      onClose: () => {
        dismissInstallPrompt()
      },
      placement,
      endContent: createElement(Button, {
        color: 'default',
        size: 'sm',
        startContent: createElement(Icon, {
          name: 'CloudDownload',
          size: 'md',
        }),
        onPress: handleInstallClick,
        children: buttonLabel,
      }),
    })
  }, [
    showInstallPrompt,
    title,
    description,
    buttonLabel,
    timeout,
    placement,
    triggerInstall,
    dismissInstallPrompt,
  ])

  // Reset the flag when installability state changes
  useEffect(() => {
    if (!showInstallPrompt) {
      hasShownPromptRef.current = false
    }
  }, [showInstallPrompt])

  return {
    isInstallable,
    isRunningAsPWA,
    isInstalled,
    triggerInstall,
    dismissInstallPrompt,
    showInstallPrompt,
  }
}
