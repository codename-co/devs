/**
 * ProviderForm — Configuration form for adding a new LLM provider credential.
 *
 * Route: #settings/providers/add/{provider}
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, Textarea } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { LLMProvider } from '@/types'
import { errorToast } from '@/lib/toast'
import { useLLMModelStore } from '@/stores/llmModelStore'
import type { IconName } from '@/lib/types'
import localI18n from '../i18n'
import { PROVIDERS } from '../providers'

interface ProviderFormProps {
  provider: string
}

export function ProviderForm({ provider }: ProviderFormProps) {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()

  const credentials = useLLMModelStore((state) => state.credentials)
  const addCredential = useLLMModelStore((state) => state.addCredential)

  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  const providerConfig = PROVIDERS(lang, t).find((p) => p.provider === provider)

  const handleSubmit = async () => {
    if (!providerConfig) return

    const existingCred = credentials.find((c) => c.provider === provider)
    if (existingCred) {
      errorToast(t('This provider is already configured'))
      return
    }

    if (
      (!apiKey && !providerConfig.noApiKey && !providerConfig.optionalApiKey) ||
      (providerConfig.requiresBaseUrl && !baseUrl)
    ) {
      errorToast(t('Please fill in all required fields'))
      return
    }

    setIsValidating(true)
    try {
      const keyToEncrypt =
        apiKey ||
        (providerConfig.noApiKey || providerConfig.optionalApiKey
          ? `${provider}-no-key`
          : '')

      const success = await addCredential(
        provider as LLMProvider,
        keyToEncrypt,
        undefined,
        baseUrl,
      )

      if (success) {
        navigate(`${location.pathname}#settings/providers`, { replace: true })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  if (!providerConfig) {
    return null
  }

  return (
    <div data-testid="llm-providers" className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon name={providerConfig.icon as IconName} className="h-5 w-5" />
        <span className="font-medium">{providerConfig.name}</span>
      </div>

      <div className="space-y-4">
        {providerConfig.provider === 'ollama' && (
          <Input
            label={t('Server URL')}
            placeholder={providerConfig.apiKeyPlaceholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            description={t('URL of your Ollama server')}
          />
        )}

        {providerConfig.requiresBaseUrl && (
          <Input
            label={t('Base URL')}
            placeholder="https://api.example.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            isRequired
          />
        )}

        {!providerConfig.noApiKey &&
          providerConfig.provider !== 'ollama' &&
          (providerConfig.multilineApiKey ? (
            <Textarea
              label={t('API Key')}
              placeholder={providerConfig.apiKeyPlaceholder || 'sk-...'}
              value={apiKey}
              onValueChange={setApiKey}
              minRows={3}
              maxRows={8}
              isRequired={!providerConfig.optionalApiKey}
              description={
                providerConfig.apiKeyPage ? (
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
              placeholder={providerConfig.apiKeyPlaceholder || 'sk-...'}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              isRequired={!providerConfig.optionalApiKey}
              description={
                providerConfig.apiKeyPage ? (
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

        {providerConfig.moreDetails?.()}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            color="primary"
            size="sm"
            onPress={handleSubmit}
            isLoading={isValidating}
            isDisabled={
              (!apiKey &&
                !providerConfig.noApiKey &&
                !providerConfig.optionalApiKey) ||
              (providerConfig.requiresBaseUrl && !baseUrl)
            }
          >
            {t('Validate & Add')}
          </Button>
        </div>
      </div>
    </div>
  )
}
