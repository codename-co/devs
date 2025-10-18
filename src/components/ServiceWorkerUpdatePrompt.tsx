import { Button } from '@heroui/react'
import { useEffect, useState } from 'react'

import {
  swUpdateHandler,
  type ServiceWorkerUpdate,
} from '@/lib/sw-update-handler'
import { successToast } from '@/lib/toast'
import { useI18n } from '@/i18n'
import { PRODUCT } from '@/config/product'

/**
 * Service Worker Update Prompt Component
 * Shows a notification when a new version is available
 */
export function ServiceWorkerUpdatePrompt() {
  const { t } = useI18n()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [update, setUpdate] = useState<ServiceWorkerUpdate | null>(null)

  useEffect(() => {
    // Subscribe to update notifications
    const unsubscribe = swUpdateHandler.onUpdate((updateInfo) => {
      console.log('[SW-Update-UI] 🔔 Update available:', updateInfo)
      setUpdate(updateInfo)
      setUpdateAvailable(true)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleUpdate = () => {
    console.log('[SW-Update-UI] 🔄 User triggered update')
    swUpdateHandler.activateUpdate()
  }

  useEffect(() => {
    if (updateAvailable) {
      successToast(
        t('New features are waiting'),
        t('{product} v{version} is ready to be installed.', {
          product: PRODUCT.displayName,
          version: update?.newVersion ?? '?',
        }),
        // @ts-ignore
        {
          hideCloseButton: true,
          timeout: 0,
          endContent: (
            <>
              <Button
                size="sm"
                variant="flat"
                color="success"
                onPress={handleUpdate}
              >
                {t('Upgrade')}
              </Button>
            </>
          ),
        },
      )
    }
  }, [updateAvailable])

  return null
}
