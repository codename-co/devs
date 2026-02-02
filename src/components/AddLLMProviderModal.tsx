import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Card,
  CardBody,
} from '@heroui/react'
import { create } from 'zustand'

import { Icon } from './Icon'
import { PROVIDERS } from '@/pages/Settings/providers'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { useI18n, type Lang } from '@/i18n'
import localI18n from '@/pages/Settings/i18n'
import { errorToast } from '@/lib/toast'
import type { LLMProvider } from '@/types'
import type { IconName } from '@/lib/types'

// Simple store to control modal visibility
interface AddLLMProviderModalStore {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useAddLLMProviderModal = create<AddLLMProviderModalStore>(
  (set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  }),
)

interface AddLLMProviderModalProps {
  lang: Lang
}

export function AddLLMProviderModal({ lang }: AddLLMProviderModalProps) {
  const { t } = useI18n(localI18n)
  const { isOpen, close } = useAddLLMProviderModal()

  const credentials = useLLMModelStore((state) => state.credentials)
  const addCredential = useLLMModelStore((state) => state.addCredential)

  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>()
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  const providerConfig = PROVIDERS(lang, t).find(
    (p) => p.provider === selectedProvider,
  )

  const resetForm = useCallback(() => {
    setSelectedProvider(undefined)
    setApiKey('')
    setBaseUrl('')
    setIsValidating(false)
  }, [])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen, resetForm])

  const handleAddCredential = async () => {
    if (!selectedProvider) {
      return
    }

    const config = PROVIDERS(lang, t).find(
      (p) => p.provider === selectedProvider,
    )

    // Check if provider is already configured
    const existingCred = credentials.find(
      (c) => c.provider === selectedProvider,
    )
    if (existingCred) {
      errorToast(t('This provider is already configured'))
      return
    }

    if (
      (!apiKey && !config?.noApiKey && !config?.optionalApiKey) ||
      (config?.requiresBaseUrl && !baseUrl)
    ) {
      errorToast(t('Please fill in all required fields'))
      return
    }

    setIsValidating(true)
    try {
      const keyToEncrypt =
        apiKey ||
        (config?.noApiKey || config?.optionalApiKey
          ? `${selectedProvider}-no-key`
          : '')

      const success = await addCredential(
        selectedProvider,
        keyToEncrypt,
        undefined,
        baseUrl,
      )

      if (success) {
        close()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      close()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>{t('Add LLM Provider')}</ModalHeader>
            <ModalBody>
              {!selectedProvider ? (
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS(lang, t).map((provider) => (
                    <Card
                      key={provider.provider}
                      className="h-20 hover:bg-primary-50"
                      isPressable
                      onPress={() =>
                        setSelectedProvider(provider.provider as LLMProvider)
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
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => setSelectedProvider(undefined)}
                    >
                      <Icon name="NavArrowLeft" className="h-4 w-4" />
                    </Button>
                    <Icon
                      name={providerConfig?.icon as IconName}
                      className="h-5 w-5"
                    />
                    <span className="font-medium">{providerConfig?.name}</span>
                  </div>

                  {providerConfig?.provider === 'ollama' && (
                    <Input
                      label={t('Server URL')}
                      placeholder={providerConfig?.apiKeyPlaceholder}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      description={t('URL of your Ollama server')}
                    />
                  )}

                  {providerConfig?.requiresBaseUrl && (
                    <Input
                      label={t('Base URL')}
                      placeholder="https://api.example.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      isRequired
                    />
                  )}

                  {!providerConfig?.noApiKey &&
                    providerConfig?.provider !== 'ollama' &&
                    (providerConfig?.multilineApiKey ? (
                      <Textarea
                        label={t('API Key')}
                        placeholder={
                          providerConfig?.apiKeyPlaceholder || 'sk-...'
                        }
                        value={apiKey}
                        onValueChange={setApiKey}
                        minRows={3}
                        maxRows={8}
                        isRequired={!providerConfig?.optionalApiKey}
                        description={
                          providerConfig?.apiKeyPage ? (
                            <>
                              {t('Get your API key from')}{' '}
                              <a
                                href={providerConfig.apiKeyPage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-sm hover:underline"
                              >
                                {providerConfig.apiKeyPage}
                              </a>
                            </>
                          ) : undefined
                        }
                      />
                    ) : (
                      <Input
                        label={t('API Key')}
                        placeholder={
                          providerConfig?.apiKeyPlaceholder || 'sk-...'
                        }
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        isRequired={!providerConfig?.optionalApiKey}
                        description={
                          providerConfig?.apiKeyPage ? (
                            <>
                              {t('Get your API key from')}{' '}
                              <a
                                href={providerConfig.apiKeyPage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-sm hover:underline"
                              >
                                {providerConfig.apiKeyPage}
                              </a>
                            </>
                          ) : undefined
                        }
                      />
                    ))}

                  {providerConfig?.moreDetails?.()}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                {t('Cancel')}
              </Button>
              <Button
                color="primary"
                onPress={handleAddCredential}
                isLoading={isValidating}
                isDisabled={
                  (!apiKey &&
                    !providerConfig?.noApiKey &&
                    !providerConfig?.optionalApiKey) ||
                  (providerConfig?.requiresBaseUrl && !baseUrl)
                }
              >
                {t('Validate & Add')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
