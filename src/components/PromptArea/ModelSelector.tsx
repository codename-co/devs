import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Tooltip,
  Input,
} from '@heroui/react'

import { Icon } from '../Icon'
import { useAddLLMProviderModal } from '../AddLLMProviderModal'
import { useModelPicker } from './useModelPicker'
import { PROVIDERS, getModelIds } from '@/pages/Settings/providers'
import { loadModelRegistry, getModelCapabilities } from '@/lib/llm/models'

import { type Lang, useI18n } from '@/i18n'
import type { LLMProvider, Credential, ModelCapabilities } from '@/types'
import type { IconName } from '@/lib/types'

interface ModelSelectorProps {
  lang: Lang
}

interface ProviderWithModels {
  credential: Credential
  models: string[]
  providerName: string
}

export function ModelSelector({ lang }: ModelSelectorProps) {
  const { t } = useI18n(lang as any)
  const openAddProviderModal = useAddLLMProviderModal((state) => state.open)

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
  // Search query for filtering models
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  // Track if model registry has been loaded
  const [registryLoaded, setRegistryLoaded] = useState(false)

  // Load model registry on mount
  useEffect(() => {
    loadModelRegistry().then(() => setRegistryLoaded(true))
  }, [])

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
    const providers = credentials.map((cred) => {
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
    // Sort to put 'local' provider first
    return providers.sort((a, b) => {
      if (a.credential.provider === 'local') return -1
      if (b.credential.provider === 'local') return 1
      return 0
    })
  }, [credentials, providerConfigs, resolvedModels])

  // Render capability icons for a model (compact view for endContent)
  const renderCapabilityIcons = useCallback(
    (provider: LLMProvider, modelId: string) => {
      if (!registryLoaded) return null
      const caps = getModelCapabilities(provider, modelId)
      if (!caps) return null

      const iconConfig: {
        key: keyof ModelCapabilities
        icon: IconName
        className: string
        tooltip: string
      }[] = [
        {
          key: 'fast',
          icon: 'Timer',
          className: 'text-warning',
          tooltip: t('Fast'),
        },
        {
          key: 'lowCost',
          icon: 'PiggyBank',
          className: 'text-success',
          tooltip: t('Low cost'),
        },
        {
          key: 'highCost',
          icon: 'PiggyBank',
          className: 'text-danger',
          tooltip: t('High cost'),
        },
        {
          key: 'thinking',
          icon: 'Brain',
          className: 'text-secondary',
          tooltip: t('Thinking'),
        },
        {
          key: 'vision',
          icon: 'MediaImage',
          className: 'text-primary',
          tooltip: t('Vision'),
        },
        {
          key: 'tools',
          icon: 'Puzzle',
          className: 'text-default-400',
          tooltip: t('Tools'),
        },
      ]

      const icons = iconConfig
        .filter(({ key }) => caps[key])
        .map(({ key, icon, className, tooltip }) => (
          <Tooltip key={key} content={tooltip} size="sm">
            <span className="cursor-help">
              <Icon name={icon} size="sm" className={`w-3 h-3 ${className}`} />
            </span>
          </Tooltip>
        ))

      return icons.length > 0 ? (
        <div className="flex gap-1 items-center shrink-0">{icons}</div>
      ) : null
    },
    [registryLoaded, t],
  )

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
      setModelSearchQuery('')
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
          <div className="flex flex-col gap-0.5">
            <span>{providerName}</span>
            {isSelected && currentModelForProvider ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-default-500">
                  {displayModelName(currentModelForProvider)}
                </span>
                {renderCapabilityIcons(
                  credential.provider,
                  currentModelForProvider,
                )}
              </div>
            ) : singleModel && !hasMultipleModels ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-default-500">
                  {displayModelName(singleModel)}
                </span>
                {renderCapabilityIcons(credential.provider, singleModel)}
              </div>
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

    // Filter models based on search query
    const filteredModels = modelSearchQuery
      ? viewingProvider.models.filter((model) =>
          model.toLowerCase().includes(modelSearchQuery.toLowerCase()),
        )
      : viewingProvider.models

    const showSearch = viewingProvider.models.length > 10

    return (
      <>
        {showSearch && (
          <DropdownItem
            key="search"
            isReadOnly
            textValue="Search"
            className="cursor-default"
          >
            <Input
              size="sm"
              placeholder={t('Search models...')}
              value={modelSearchQuery}
              onValueChange={setModelSearchQuery}
              startContent={
                <Icon name="Search" size="sm" className="text-default-400" />
              }
              classNames={{
                inputWrapper: 'h-8',
              }}
              autoFocus
            />
          </DropdownItem>
        )}
        {filteredModels.map((model) => {
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
              endContent={renderCapabilityIcons(
                viewingProvider.credential.provider,
                model,
              )}
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
        })}
        {filteredModels.length === 0 && (
          <DropdownItem key="no-results" isReadOnly textValue="No results">
            <span className="text-default-400 text-sm">
              {t('No models found')}
            </span>
          </DropdownItem>
        )}
      </>
    )
  }

  return (
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
        className="max-h-80 overflow-y-auto w-64"
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
                textValue={t('Add LLM provider')}
                onPress={openAddProviderModal}
                closeOnSelect
              >
                {t('Add LLM provider')}
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
  )
}
