/**
 * ProvidersSection — Settings section for managing LLM provider credentials.
 *
 * Displays:
 *  - Configured providers list with default badge
 *  - Inline add-provider flow (grid selection → form)
 *  - Local model cache info and clear action
 */

import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Textarea,
} from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { LLMProvider, Credential } from '@/types'
import { SecureStorage } from '@/lib/crypto'
import { errorToast, successToast } from '@/lib/toast'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import {
  getCacheInfo,
  clearModelCache,
  type CacheInfo,
} from '@/lib/llm/cache-manager'
import { formatBytes } from '@/lib/format'
import type { IconName } from '@/lib/types'
import localI18n from '../i18n'
import { PROVIDERS } from '../providers'

export function ProvidersSection() {
  const { lang, t } = useI18n(localI18n)
  const { getHighlightClasses } = useHashHighlight()

  const credentials = useLLMModelStore((state) => state.credentials)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const addCredential = useLLMModelStore((state) => state.addCredential)
  const deleteCredential = useLLMModelStore((state) => state.deleteCredential)
  const setAsDefault = useLLMModelStore((state) => state.setAsDefault)

  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Add provider inline state
  const [isAddingProvider, setIsAddingProvider] = useState(false)
  const [newProviderSelected, setNewProviderSelected] = useState<LLMProvider>()
  const [newProviderApiKey, setNewProviderApiKey] = useState('')
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('')
  const [isValidatingProvider, setIsValidatingProvider] = useState(false)

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

  const handleSetAsDefault = async (credentialId: string) => {
    await setAsDefault(credentialId)
    successToast(t('Provider set as default'))
  }

  const handleDeleteCredential = async (id: string) => {
    await deleteCredential(id)
  }

  const handleStartAddProvider = () => {
    setIsAddingProvider(true)
    setNewProviderSelected(undefined)
    setNewProviderApiKey('')
    setNewProviderBaseUrl('')
  }

  const handleCancelAddProvider = () => {
    setIsAddingProvider(false)
    setNewProviderSelected(undefined)
    setNewProviderApiKey('')
    setNewProviderBaseUrl('')
  }

  const handleAddNewCredential = async () => {
    if (!newProviderSelected) return

    const config = PROVIDERS(lang, t).find(
      (p) => p.provider === newProviderSelected,
    )

    const existingCred = credentials.find(
      (c) => c.provider === newProviderSelected,
    )
    if (existingCred) {
      errorToast(t('This provider is already configured'))
      return
    }

    if (
      (!newProviderApiKey && !config?.noApiKey && !config?.optionalApiKey) ||
      (config?.requiresBaseUrl && !newProviderBaseUrl)
    ) {
      errorToast(t('Please fill in all required fields'))
      return
    }

    setIsValidatingProvider(true)
    try {
      const keyToEncrypt =
        newProviderApiKey ||
        (config?.noApiKey || config?.optionalApiKey
          ? `${newProviderSelected}-no-key`
          : '')

      const success = await addCredential(
        newProviderSelected,
        keyToEncrypt,
        undefined,
        newProviderBaseUrl,
      )

      if (success) {
        handleCancelAddProvider()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsValidatingProvider(false)
    }
  }

  const findProvider = (provider: LLMProvider) =>
    PROVIDERS(lang, t).find((p) => p.provider === provider)

  const CredentialCard = ({
    credential,
    index,
  }: {
    credential: Credential
    index: number
  }) => {
    const provider = findProvider(credential.provider)
    const isDefault = index === 0

    return (
      <Card
        className={`flex flex-row justify-between p-4 transition-all duration-200 hover:shadow-md ${
          isDefault ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}
      >
        <div className="flex items-center gap-8 px-4">
          <Icon name={provider?.icon as any} className="h-5 w-5" />
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
          {!isDefault && (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              onPress={() => handleSetAsDefault(credential.id)}
            >
              {t('Set as Default')}
            </Button>
          )}
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

  const newProviderConfig = PROVIDERS(lang, t).find(
    (p) => p.provider === newProviderSelected,
  )

  return (
    <div data-testid="llm-providers" className="space-y-4">
      {isAddingProvider ? (
        // Inline add-provider flow
        <div className="space-y-4">
          {!newProviderSelected ? (
            // Step 1: Provider selection grid
            <>
              <div className="flex items-center justify-between">
                <p className="font-medium">{t('Add LLM Provider')}</p>
                <Button
                  size="sm"
                  variant="light"
                  onPress={handleCancelAddProvider}
                >
                  {t('Cancel')}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PROVIDERS(lang, t).map((provider) => (
                  <Card
                    key={provider.provider}
                    className="h-20 hover:bg-primary-50"
                    isPressable
                    onPress={() =>
                      setNewProviderSelected(
                        provider.provider as LLMProvider,
                      )
                    }
                  >
                    <CardBody className="flex flex-col items-center justify-center gap-1.5 p-2">
                      <Icon
                        name={provider.icon as IconName}
                        className="h-5 w-5"
                      />
                      <span className="text-xs text-center leading-tight">
                        {provider.name}
                      </span>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            // Step 2: Provider configuration form
            <>
              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => setNewProviderSelected(undefined)}
                >
                  <Icon name="NavArrowLeft" className="h-4 w-4" />
                </Button>
                <Icon
                  name={newProviderConfig?.icon as IconName}
                  className="h-5 w-5"
                />
                <span className="font-medium">
                  {newProviderConfig?.name}
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="light"
                  onPress={handleCancelAddProvider}
                >
                  {t('Cancel')}
                </Button>
              </div>

              <div className="space-y-4">
                {newProviderConfig?.provider === 'ollama' && (
                  <Input
                    label={t('Server URL')}
                    placeholder={newProviderConfig?.apiKeyPlaceholder}
                    value={newProviderApiKey}
                    onChange={(e) => setNewProviderApiKey(e.target.value)}
                    description={t('URL of your Ollama server')}
                  />
                )}

                {newProviderConfig?.requiresBaseUrl && (
                  <Input
                    label={t('Base URL')}
                    placeholder="https://api.example.com/v1"
                    value={newProviderBaseUrl}
                    onChange={(e) =>
                      setNewProviderBaseUrl(e.target.value)
                    }
                    isRequired
                  />
                )}

                {!newProviderConfig?.noApiKey &&
                  newProviderConfig?.provider !== 'ollama' &&
                  (newProviderConfig?.multilineApiKey ? (
                    <Textarea
                      label={t('API Key')}
                      placeholder={
                        newProviderConfig?.apiKeyPlaceholder || 'sk-...'
                      }
                      value={newProviderApiKey}
                      onValueChange={setNewProviderApiKey}
                      minRows={3}
                      maxRows={8}
                      isRequired={!newProviderConfig?.optionalApiKey}
                      description={
                        newProviderConfig?.apiKeyPage ? (
                          <>
                            {t('Get your API key from')}{' '}
                            <a
                              href={newProviderConfig.apiKeyPage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm hover:underline"
                            >
                              {newProviderConfig.apiKeyPage}
                            </a>
                          </>
                        ) : undefined
                      }
                    />
                  ) : (
                    <Input
                      label={t('API Key')}
                      placeholder={
                        newProviderConfig?.apiKeyPlaceholder || 'sk-...'
                      }
                      type="password"
                      value={newProviderApiKey}
                      onChange={(e) =>
                        setNewProviderApiKey(e.target.value)
                      }
                      isRequired={!newProviderConfig?.optionalApiKey}
                      description={
                        newProviderConfig?.apiKeyPage ? (
                          <>
                            {t('Get your API key from')}{' '}
                            <a
                              href={newProviderConfig.apiKeyPage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm hover:underline"
                            >
                              {newProviderConfig.apiKeyPage}
                            </a>
                          </>
                        ) : undefined
                      }
                    />
                  ))}

                {newProviderConfig?.moreDetails?.()}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="flat"
                    size="sm"
                    onPress={handleCancelAddProvider}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    color="primary"
                    size="sm"
                    onPress={handleAddNewCredential}
                    isLoading={isValidatingProvider}
                    isDisabled={
                      (!newProviderApiKey &&
                        !newProviderConfig?.noApiKey &&
                        !newProviderConfig?.optionalApiKey) ||
                      (newProviderConfig?.requiresBaseUrl &&
                        !newProviderBaseUrl)
                    }
                  >
                    {t('Validate & Add')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // Normal providers list view
        <>
          <div
            id="add-provider"
            className={getHighlightClasses(
              'add-provider',
              'flex justify-end p-2 -m-2',
            )}
          >
            <Button
              color="primary"
              size="sm"
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
                <CredentialCard
                  key={cred.id}
                  credential={cred}
                  index={index}
                />
              ))
            )}
          </div>

          {cacheInfo && cacheInfo.size > 0 && (
            <div className="mt-6 pt-6 border-t border-default-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">
                    {t('Local models cache')}
                  </p>
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
        </>
      )}
    </div>
  )
}
