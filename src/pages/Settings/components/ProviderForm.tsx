/**
 * ProviderForm — Guided setup for adding a new LLM provider credential.
 *
 * Route: #settings/providers/add/{provider}
 *
 * Split-screen layout:
 *  - Left panel (dark):  guidance steps, provider info, external link
 *  - Right panel (white): credential inputs, validation, CTA
 *
 * Falls back to a single-column form when the provider has no guidance to show
 * (e.g. local, ollama, custom).
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, Textarea } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { LLMProvider } from '@/types'
import { errorToast } from '@/lib/toast'
import { useLLMModelStore } from '@/stores/llmModelStore'
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

  const needsApiKey = !providerConfig?.noApiKey
  const hasGuidance = !!providerConfig?.apiKeyPage

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

  /* ── Guidance panel (left / top on mobile) ── */
  const guidancePanel = hasGuidance ? (
    <div className="flex flex-col justify-between h-full rounded-xl bg-default-100 dark:bg-default-50 p-6 space-y-4">
      <h3 className="font-semibold leading-tight">{t('How to connect')}</h3>
      {/* Steps */}
      <ol className="space-y-2 list-decimal list-inside text-sm text-default-700">
        <li>{t("Sign in or create an account on the provider's website.")}</li>
        <li>{t('Create a new API key in your account dashboard.')}</li>
        <li>{t('Copy the key and come back here to paste it below.')}</li>
      </ol>
      {/* Provider-specific details (e.g. Vertex AI auth options) */}
      {providerConfig.moreDetails?.()}
      {/* CTA to open provider website — anchored to the bottom */}
      <Button
        as="a"
        href={providerConfig.apiKeyPage}
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        variant="flat"
        className="w-full"
        startContent={<Icon name="OpenInBrowser" className="w-4 h-4" />}
      >
        {t('Open {provider}', { provider: providerConfig.name })}
      </Button>
    </div>
  ) : (
    providerConfig.moreDetails && (
      <div className="h-full rounded-xl bg-default-100 dark:bg-default-50 p-6 space-y-4">
        {providerConfig.moreDetails()}
      </div>
    )
  )

  /* ── Form panel (right / bottom on mobile) ── */
  const formPanel = (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-5">
        {/* Header */}
        <h3 className="font-semibold text-base">
          {t('Enter your credentials')}
        </h3>

        {/* Ollama: server URL */}
        {providerConfig.provider === 'ollama' && (
          <Input
            label={t('Server URL')}
            placeholder={providerConfig.apiKeyPlaceholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            description={t('URL of your Ollama server')}
          />
        )}

        {/* Base URL for compatible / custom providers */}
        {providerConfig.requiresBaseUrl && (
          <Input
            label={t('Base URL')}
            placeholder="https://api.example.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            isRequired
          />
        )}

        {/* API Key input */}
        {needsApiKey &&
          (providerConfig.multilineApiKey ? (
            <Textarea
              label={t('API Key')}
              placeholder={providerConfig.apiKeyPlaceholder || 'sk-...'}
              value={apiKey}
              onValueChange={setApiKey}
              minRows={3}
              maxRows={8}
              isRequired={!providerConfig.optionalApiKey}
            />
          ) : (
            <Input
              label={t('API Key')}
              placeholder={providerConfig.apiKeyPlaceholder || 'sk-...'}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              isRequired={!providerConfig.optionalApiKey}
            />
          ))}

        {/* Privacy reassurance */}
        {needsApiKey && (
          <p className="flex items-center gap-1.5 text-xs text-default-400">
            <Icon name="Lock" className="w-3 h-3" />
            {t(
              'Your key is stored locally and encrypted. It never leaves your device.',
            )}
          </p>
        )}
      </div>

      {/* Submit — anchored to the bottom */}
      <div className="flex justify-end pt-2">
        <Button
          color="primary"
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
  )

  return (
    <div
      data-testid="llm-providers"
      className="flex flex-col gap-4 h-full justify-between"
    >
      <div>{guidancePanel}</div>
      <div>{formPanel}</div>
    </div>
  )
}
