import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Tooltip,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import { Icon } from '../Icon'
import { useModelPicker } from './useModelPicker'
import { PROVIDERS, getModelIds } from '@/pages/Settings/providers'

import { type Lang, useI18n } from '@/i18n'
import type { LLMProvider, Credential } from '@/types'

interface ModelSelectorProps {
  lang: Lang
}

interface ProviderWithModels {
  credential: Credential
  models: string[]
  providerName: string
}

export function ModelSelector({ lang }: ModelSelectorProps) {
  const navigate = useNavigate()
  const { t, url } = useI18n(lang as any)

  const {
    credentials,
    selectedProvider,
    selectedModel,
    setSelectedProviderId,
    setSelectedModel,
    getProviderIcon,
    displayModelName,
    getSelectedModelForProvider,
  } = useModelPicker({ lang })

  // Cache resolved models for each provider
  const [resolvedModels, setResolvedModels] = useState<
    Record<string, string[]>
  >({})
  // View mode: 'providers' shows provider list, 'models' shows model list for a specific provider
  const [viewMode, setViewMode] = useState<'providers' | 'models'>('providers')
  // The provider whose models we're viewing
  const [viewingProvider, setViewingProvider] =
    useState<ProviderWithModels | null>(null)
  // Track if models have been resolved to avoid repeated fetches
  const [modelsResolved, setModelsResolved] = useState(false)

  // Get provider configurations with their models
  const providerConfigs = useMemo(() => PROVIDERS(lang, t), [lang, t])

  // Resolve async models from providers (only once)
  useEffect(() => {
    if (modelsResolved) return

    const resolveModels = async () => {
      const resolved: Record<string, string[]> = {}
      for (const config of providerConfigs) {
        if (config.models instanceof Promise) {
          const models = await config.models
          resolved[config.provider] = getModelIds(models)
        } else {
          resolved[config.provider] = getModelIds(config.models)
        }
      }
      setResolvedModels(resolved)
      setModelsResolved(true)
    }
    resolveModels()
  }, [providerConfigs, modelsResolved])

  // Build provider data with their available models
  const providersWithModels = useMemo((): ProviderWithModels[] => {
    return credentials.map((cred) => {
      const config = providerConfigs.find((p) => p.provider === cred.provider)
      const configModels = config?.models
      const fallbackModels = Array.isArray(configModels)
        ? getModelIds(configModels)
        : []
      return {
        credential: cred,
        models: resolvedModels[cred.provider] || fallbackModels,
        providerName: config?.name || cred.provider,
      } as ProviderWithModels
    })
  }, [credentials, providerConfigs, resolvedModels])

  const handleProviderSelect = useCallback(
    (credential: Credential, models: string[]) => {
      setSelectedProviderId(credential.id)

      // If provider has only one model, auto-select it
      if (models.length === 1) {
        setSelectedModel(credential.provider, models[0])
      } else if (models.length > 1) {
        // If no model selected for this provider, select the first one
        const currentModel = getSelectedModelForProvider(credential.provider)
        if (!currentModel) {
          setSelectedModel(credential.provider, models[0])
        }
      }
    },
    [setSelectedProviderId, setSelectedModel, getSelectedModelForProvider],
  )

  const handleModelSelect = useCallback(
    (provider: LLMProvider, model: string) => {
      setSelectedModel(provider, model)
      // View mode will be reset by onOpenChange when dropdown closes
    },
    [setSelectedModel],
  )

  // Reset view mode when dropdown closes
  const handleDropdownOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setViewMode('providers')
      setViewingProvider(null)
    }
  }, [])

  // Get display text for the button
  const displayText = useMemo(() => {
    if (!selectedProvider) return t('Select a model')
    const model =
      selectedModel || getSelectedModelForProvider(selectedProvider.provider)
    if (model) return displayModelName(model)
    const config = providerConfigs.find(
      (p) => p.provider === selectedProvider.provider,
    )
    return config?.name || selectedProvider.provider
  }, [
    selectedProvider,
    selectedModel,
    getSelectedModelForProvider,
    displayModelName,
    providerConfigs,
    t,
  ])

  if (credentials.length === 0) {
    return null
  }

  // Build dropdown items for provider list view
  const renderProviderItems = () => {
    return providersWithModels.map(({ credential, models, providerName }) => {
      const isSelected = selectedProvider?.id === credential.id
      const currentModelForProvider = getSelectedModelForProvider(
        credential.provider,
      )
      const hasMultipleModels = Array.isArray(models) && models.length > 1
      const singleModel = models[0]

      return (
        <DropdownItem
          key={credential.id}
          startContent={
            <Icon name={getProviderIcon(credential.provider)} size="sm" />
          }
          endContent={
            hasMultipleModels ? (
              <Icon
                name="NavArrowRight"
                size="sm"
                className="text-default-400"
              />
            ) : undefined
          }
          textValue={providerName}
          closeOnSelect={!hasMultipleModels}
          onPress={() => {
            if (hasMultipleModels) {
              // Switch to model view for this provider
              setViewingProvider({ credential, models, providerName })
              setViewMode('models')
            } else {
              // Direct selection for single-model providers
              handleProviderSelect(credential, models)
            }
          }}
        >
          <div className="flex flex-col">
            <span>{providerName}</span>
            {isSelected && currentModelForProvider ? (
              <span className="text-xs text-default-500">
                {displayModelName(currentModelForProvider)}
              </span>
            ) : singleModel && !hasMultipleModels ? (
              <span className="text-xs text-default-500">
                {displayModelName(singleModel)}
              </span>
            ) : hasMultipleModels ? (
              <span className="text-xs text-default-500">
                {t('{n} models', { n: models.length })}
              </span>
            ) : null}
          </div>
        </DropdownItem>
      )
    })
  }

  // Build dropdown items for model list view
  const renderModelItems = () => {
    if (!viewingProvider) return null

    const currentModelForProvider = getSelectedModelForProvider(
      viewingProvider.credential.provider,
    )

    return viewingProvider.models.map((model) => {
      const isSelected = currentModelForProvider === model

      return (
        <DropdownItem
          key={model}
          startContent={
            isSelected ? (
              <Icon name="Check" size="sm" />
            ) : (
              <span className="w-4" />
            )
          }
          textValue={model}
          closeOnSelect
          onPress={() => {
            handleProviderSelect(
              viewingProvider.credential,
              viewingProvider.models,
            )
            handleModelSelect(viewingProvider.credential.provider, model)
          }}
        >
          {displayModelName(model)}
        </DropdownItem>
      )
    })
  }

  return (
    <Tooltip
      content={t('Select a model')}
      classNames={{
        base: 'pointer-events-none',
      }}
    >
      <Dropdown
        placement="bottom-start"
        className="bg-white dark:bg-default-50 dark:text-white"
        onOpenChange={handleDropdownOpenChange}
      >
        <DropdownTrigger>
          <Button
            radius="full"
            variant="light"
            size="sm"
            startContent={
              <Icon
                name={getProviderIcon(selectedProvider?.provider || 'custom')}
                size="sm"
                className="hidden md:flex text-default-500 dark:text-default-600"
              />
            }
          >
            <span className="text-xs truncate max-w-22 md:max-w-48">
              {displayText}
            </span>
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="LLM Provider and Model selection"
          selectionMode="none"
          closeOnSelect={false}
          className="max-h-80 overflow-y-auto max-w-64"
        >
          {viewMode === 'providers' ? (
            <>
              <DropdownSection showDivider>
                {renderProviderItems()}
              </DropdownSection>
              <DropdownSection>
                <DropdownItem
                  key="settings"
                  startContent={<Icon name="Plus" size="sm" />}
                  textValue={t('Add a model')}
                  onPress={() => navigate(url('/settings#llm-models'))}
                  closeOnSelect
                >
                  {t('Add a model')}
                </DropdownItem>
              </DropdownSection>
            </>
          ) : (
            <>
              <DropdownSection showDivider>
                <DropdownItem
                  key="back"
                  startContent={<Icon name="ArrowLeft" size="sm" />}
                  textValue={t('Back')}
                  closeOnSelect={false}
                  onPress={() => {
                    setViewMode('providers')
                    setViewingProvider(null)
                  }}
                >
                  <span className="font-medium">
                    {viewingProvider?.providerName}
                  </span>
                </DropdownItem>
              </DropdownSection>
              <DropdownSection>{renderModelItems()}</DropdownSection>
            </>
          )}
        </DropdownMenu>
      </Dropdown>
    </Tooltip>
  )
}
