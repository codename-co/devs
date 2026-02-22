/**
 * ProvidersList — Displays configured LLM provider credentials and cache info.
 *
 * Route: #settings/providers
 */

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, Chip } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { Credential } from '@/types'
import { SecureStorage } from '@/lib/crypto'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import {
  getCacheInfo,
  clearModelCache,
  type CacheInfo,
} from '@/lib/llm/cache-manager'
import { formatBytes } from '@/lib/format'
import { errorToast, successToast } from '@/lib/toast'
import localI18n from '../i18n'
import { PROVIDERS } from '../providers'

export function ProvidersList() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { getHighlightClasses } = useHashHighlight()

  const credentials = useLLMModelStore((state) => state.credentials)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const deleteCredential = useLLMModelStore((state) => state.deleteCredential)

  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)

  useEffect(() => {
    loadCredentials()
    loadCacheInfo()
  }, [])

  const loadCacheInfo = async () => {
    const info = await getCacheInfo()
    setCacheInfo(info)
  }

  const handleClearCache = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all cached model files? They will need to be downloaded again on next use.',
      )
    ) {
      return
    }

    setIsClearingCache(true)
    try {
      const success = await clearModelCache()
      if (success) {
        successToast('Model cache cleared successfully')
        await loadCacheInfo()
      } else {
        errorToast('Failed to clear model cache')
      }
    } catch (error) {
      errorToast('Failed to clear model cache')
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    await deleteCredential(id)
  }

  const handleStartAddProvider = () => {
    navigate(`${location.pathname}#settings/providers/add`, { replace: true })
  }

  const findProvider = (provider: string) =>
    PROVIDERS(lang, t).find((p) => p.provider === provider)

  const CredentialCard = ({
    credential,
  }: {
    credential: Credential
    index: number
  }) => {
    const provider = findProvider(credential.provider)
    const isDefault = false // index === 0

    return (
      <Card
        className={`flex flex-row justify-between p-4 ${
          /* isDefault ? 'ring-2 ring-primary ring-opacity-50' : */ ''
        }`}
      >
        <div className="flex items-center gap-4 px-2">
          <Icon name={provider?.icon as any} size="md" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{provider?.name}</p>
              {isDefault && (
                <Chip size="sm" color="primary" variant="flat">
                  {t('Default Provider')}
                </Chip>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* {!isDefault && (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              onPress={() => handleSetAsDefault(credential.id)}
            >
              {t('Set as Default')}
            </Button>
          )} */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={() => handleDeleteCredential(credential.id)}
          >
            <Icon name="Trash" className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div data-testid="llm-providers" className="space-y-4">
      <div
        id="add-provider"
        className={getHighlightClasses('add-provider', 'flex justify-end')}
      >
        <Button
          color="primary"
          size="sm"
          variant="flat"
          startContent={<Icon name="Plus" className="h-4 w-4" />}
          onPress={handleStartAddProvider}
          isDisabled={SecureStorage.isLocked()}
        >
          {t('Add Provider')}
        </Button>
      </div>
      <div className="space-y-3">
        {credentials.length === 0 ? (
          <p className="text-center text-default-500 py-8">
            {t('No providers configured. Add one to get started.')}
          </p>
        ) : (
          credentials.map((cred, index) => (
            <CredentialCard key={cred.id} credential={cred} index={index} />
          ))
        )}
      </div>

      {cacheInfo && cacheInfo.size > 0 && (
        <div className="mt-6 pt-6 border-t border-default-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">{t('Local models cache')}</p>
              <p className="text-xs text-default-500">
                {t('{files} files cached ({size})', {
                  files: cacheInfo.itemCount,
                  size: formatBytes(cacheInfo.size, lang),
                })}
              </p>
            </div>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={handleClearCache}
              isLoading={isClearingCache}
              startContent={<Icon name="Trash" className="h-4 w-4" />}
            >
              {t('Clear cache')}
            </Button>
          </div>
          <p className="text-xs text-default-500">
            {t(
              'Downloaded models are cached for 1 year to avoid re-downloading.',
            )}
          </p>
        </div>
      )}
    </div>
  )
}
