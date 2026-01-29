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
  Spinner,
} from '@heroui/react'

import { Icon } from '../Icon'
import { useAddLLMProviderModal } from '../AddLLMProviderModal'
import { useModelPicker } from './useModelPicker'
import { PROVIDERS, getModelIds } from '@/pages/Settings/providers'
import { LLMService } from '@/lib/llm'
import { getModel as getModelFromModelsDev } from '@/lib/models-dev'
import type { NormalizedModel } from '@/lib/models-dev/types'
import { CredentialService } from '@/lib/credential-service'

import { type Lang, useI18n } from '@/i18n'
import type {
  LLMProvider,
  Credential,
  ModelCapabilities,
  LLMModel,
} from '@/types'
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

  // Cache resolved models for each provider (with full model objects including capabilities)
  const [resolvedModels, setResolvedModels] = useState<
    Record<string, LLMModel[]>
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
  // Track loading state for server model fetching
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  // Cache for model data including capabilities and pricing (key: "provider:modelId")
  const [modelDataCache, setModelDataCache] = useState<
    Record<string, NormalizedModel | null>
  >({})

  // Get provider configurations with their models
  const providerConfigs = useMemo(() => PROVIDERS(lang, t), [lang, t])

  // Resolve async models from providers (only once)
  // Keeps full model objects with capabilities for rendering
  useEffect(() => {
    if (modelsResolved) return

    const resolveModels = async () => {
      const resolved: Record<string, LLMModel[]> = {}
      for (const config of providerConfigs) {
        if (config.models instanceof Promise) {
          const models = await config.models
          // Convert to LLMModel[] if needed
          resolved[config.provider] =
            typeof models[0] === 'string'
              ? (models as string[]).map((id) => ({ id }))
              : (models as LLMModel[])
        } else {
          resolved[config.provider] =
            typeof config.models[0] === 'string'
              ? (config.models as string[]).map((id) => ({ id }))
              : (config.models as LLMModel[])
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
      // Extract model IDs from the resolved models (which are LLMModel[])
      const cachedModels = resolvedModels[cred.provider]
      const modelIds = cachedModels
        ? cachedModels.map((m) => m.id)
        : fallbackModels
      return {
        credential: cred,
        models: modelIds,
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

  // Map DEVS provider to models.dev provider ID
  const getModelsDevProviderId = useCallback(
    (provider: LLMProvider): string | null => {
      const mapping: Partial<Record<LLMProvider, string>> = {
        openai: 'openai',
        anthropic: 'anthropic',
        google: 'google',
        'vertex-ai': 'google-vertex',
        mistral: 'mistral',
        openrouter: 'openrouter',
      }
      return mapping[provider] ?? null
    },
    [],
  )

  // Strip provider prefix from model ID if present (e.g., "google/gemini-2.5" -> "gemini-2.5")
  const stripModelPrefix = useCallback((modelId: string): string => {
    const slashIndex = modelId.indexOf('/')
    if (slashIndex !== -1) {
      return modelId.substring(slashIndex + 1)
    }
    return modelId
  }, [])

  // Helper to get cached model data
  const getCachedModelData = useCallback(
    (provider: LLMProvider, modelId: string): NormalizedModel | null => {
      const key = `${provider}:${modelId}`
      return modelDataCache[key] ?? null
    },
    [modelDataCache],
  )

  // Helper to get capabilities from cached model data
  const getCachedCapabilities = useCallback(
    (provider: LLMProvider, modelId: string): ModelCapabilities | null => {
      const modelData = getCachedModelData(provider, modelId)
      if (!modelData) return null
      return {
        vision: modelData.capabilities.vision,
        tools: modelData.capabilities.tools,
        thinking: modelData.capabilities.reasoning,
        lowCost: modelData.pricing.inputPerMillion < 1.0,
        highCost: modelData.pricing.inputPerMillion > 10.0,
        fast: false,
      }
    },
    [getCachedModelData],
  )

  // Load model data for models when viewing a provider
  useEffect(() => {
    if (!viewingProvider || viewingProvider.models.length === 0) return

    const modelsDevProviderId = getModelsDevProviderId(
      viewingProvider.credential.provider,
    )
    if (!modelsDevProviderId) return // Skip for local/ollama providers

    const loadModelData = async () => {
      const newCache: Record<string, NormalizedModel | null> = {}
      let hasNew = false

      for (const modelId of viewingProvider.models) {
        const key = `${viewingProvider.credential.provider}:${modelId}`
        if (modelDataCache[key] === undefined) {
          hasNew = true
          try {
            // Strip provider prefix from model ID if present (e.g., "google/gemini-2.5" -> "gemini-2.5")
            const strippedModelId = stripModelPrefix(modelId)
            const modelData = await getModelFromModelsDev(
              modelsDevProviderId,
              strippedModelId,
            )
            newCache[key] = modelData
          } catch {
            newCache[key] = null
          }
        }
      }

      if (hasNew) {
        setModelDataCache((prev) => ({ ...prev, ...newCache }))
      }
    }

    loadModelData()
  }, [
    viewingProvider,
    modelDataCache,
    getModelsDevProviderId,
    stripModelPrefix,
  ])

  // Capability configuration for icons and tooltips
  const capabilityConfig = useMemo(
    () => [
      {
        key: 'fast' as keyof ModelCapabilities,
        icon: 'Timer' as IconName,
        className: 'text-warning',
        label: t('Fast'),
        description: t('Optimized for speed'),
      },
      {
        key: 'lowCost' as keyof ModelCapabilities,
        icon: 'PiggyBank' as IconName,
        className: 'text-success',
        label: t('Low cost'),
        description: t('Budget-friendly pricing'),
      },
      {
        key: 'highCost' as keyof ModelCapabilities,
        icon: 'PiggyBank' as IconName,
        className: 'text-danger',
        label: t('High cost'),
        description: t('Premium pricing tier'),
      },
      {
        key: 'thinking' as keyof ModelCapabilities,
        icon: 'Brain' as IconName,
        className: 'text-secondary',
        label: t('Thinking'),
        description: t('Extended reasoning capabilities'),
      },
      {
        key: 'vision' as keyof ModelCapabilities,
        icon: 'MediaImage' as IconName,
        className: 'text-primary',
        label: t('Vision'),
        description: t('Can analyze images'),
      },
      {
        key: 'tools' as keyof ModelCapabilities,
        icon: 'Puzzle' as IconName,
        className: 'text-default-400',
        label: t('Tools'),
        description: t('Function calling support'),
      },
    ],
    [t],
  )

  // Format price for display
  const formatPrice = useCallback(
    (price: number): string => {
      if (price === 0) return t('Free')
      if (price < 0.01) return `$${price.toFixed(4)}`
      if (price < 1) return `$${price.toFixed(3)}`
      return `$${price.toFixed(2)}`
    },
    [t],
  )

  // Render a comprehensive tooltip content for a model
  const renderModelTooltip = useCallback(
    (provider: LLMProvider, modelId: string) => {
      const modelData = getCachedModelData(provider, modelId)
      const caps = getCachedCapabilities(provider, modelId)
      const activeCapabilities = caps
        ? capabilityConfig.filter(({ key }) => caps[key])
        : []

      const hasPricing = modelData?.pricing
      const hasCapabilities = activeCapabilities.length > 0

      if (!hasPricing && !hasCapabilities) {
        return (
          <div className="p-1">
            <div className="font-medium text-sm">
              {displayModelName(modelId)}
            </div>
          </div>
        )
      }

      return (
        <div className="p-1 max-w-xs">
          <div className="font-medium text-sm mb-2">
            {displayModelName(modelId)}
          </div>

          {/* Pricing section */}
          {hasPricing && (
            <div className="mb-2 pb-2 border-b border-default-200">
              <div className="text-xs text-default-500 mb-1">
                {t('Pricing per 1M tokens')}
              </div>
              <div className="flex gap-3 text-xs">
                <div>
                  <span className="text-default-400">{t('Input')}:</span>{' '}
                  <span className="font-medium">
                    {formatPrice(modelData.pricing.inputPerMillion)}
                  </span>
                </div>
                <div>
                  <span className="text-default-400">{t('Output')}:</span>{' '}
                  <span className="font-medium">
                    {formatPrice(modelData.pricing.outputPerMillion)}
                  </span>
                </div>
              </div>
              {modelData.pricing.reasoningPerMillion && (
                <div className="text-xs mt-1">
                  <span className="text-default-400">{t('Thinking')}:</span>{' '}
                  <span className="font-medium">
                    {formatPrice(modelData.pricing.reasoningPerMillion)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Capabilities section */}
          {hasCapabilities && (
            <div className="flex flex-col gap-1.5">
              {activeCapabilities.map(
                ({ key, icon, className, label, description }) => (
                  <div key={key} className="flex items-start gap-2">
                    <Icon
                      name={icon}
                      size="sm"
                      className={`w-3.5 h-3.5 mt-0.5 ${className}`}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{label}</span>
                      <span className="text-xs text-default-400">
                        {description}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )
    },
    [
      capabilityConfig,
      displayModelName,
      getCachedCapabilities,
      getCachedModelData,
      formatPrice,
      t,
    ],
  )

  // Render capability icons for a model (compact view for endContent)
  const renderCapabilityIcons = useCallback(
    (provider: LLMProvider, modelId: string, noWrapper = false) => {
      const caps = getCachedCapabilities(provider, modelId)
      if (!caps) return null

      const icons = capabilityConfig
        .filter(({ key }) => caps[key])
        .map(({ key, icon, className }) => (
          <Icon
            key={key}
            name={icon}
            size="sm"
            className={`w-3 h-3 ${className}`}
          />
        ))

      if (icons.length === 0) return null

      return noWrapper ? (
        <>{icons}</>
      ) : (
        <div className="flex gap-1 items-center shrink-0">{icons}</div>
      )
    },
    [capabilityConfig, getCachedCapabilities],
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
      // Check if this provider fetches models from server
      const config = providerConfigs.find(
        (p) => p.provider === credential.provider,
      )
      const fetchesFromServer = config?.fetchModelsFromServer === true
      const hasMultipleModels = Array.isArray(models) && models.length > 1
      // Show arrow for providers that fetch from server (even if no models yet) or have multiple models
      const showArrow = hasMultipleModels || fetchesFromServer
      const singleModel = models[0]

      return (
        <DropdownItem
          key={credential.id}
          startContent={
            <Icon name={getProviderIcon(credential.provider)} size="sm" />
          }
          endContent={
            showArrow ? (
              <Icon
                name="NavArrowRight"
                size="sm"
                className="text-default-400"
              />
            ) : undefined
          }
          textValue={providerName}
          closeOnSelect={!showArrow}
          onPress={async () => {
            // Check if this provider needs to fetch models from server
            const providerConfig = providerConfigs.find(
              (p) => p.provider === credential.provider,
            )
            const shouldFetchFromServer =
              providerConfig?.fetchModelsFromServer === true

            if (shouldFetchFromServer) {
              // Fetch models from server for this provider
              setIsFetchingModels(true)
              // Switch to models view immediately to show loading state
              setViewingProvider({ credential, models: [], providerName })
              setViewMode('models')
              try {
                // Get decrypted config for the credential
                const decryptedConfig =
                  await CredentialService.getDecryptedConfig(credential.id)
                const serverModels = await LLMService.getAvailableModels(
                  credential.provider,
                  {
                    baseUrl: decryptedConfig?.baseUrl,
                    apiKey: decryptedConfig?.apiKey,
                  },
                )
                if (serverModels.length > 0) {
                  // Update resolved models cache
                  setResolvedModels((prev) => ({
                    ...prev,
                    [credential.provider]: serverModels.map((id) => ({ id })),
                  }))
                  // Update viewing provider with fetched models
                  setViewingProvider({
                    credential,
                    models: serverModels,
                    providerName,
                  })
                } else {
                  // No models found, show empty state
                  setViewingProvider({ credential, models: [], providerName })
                }
              } catch (error) {
                console.error('Failed to fetch models from server:', error)
                // Keep the empty state already set
              } finally {
                setIsFetchingModels(false)
              }
            } else if (hasMultipleModels) {
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
            ) : fetchesFromServer ? (
              <span className="text-xs text-default-500">
                {t('Click to load models')}
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

    // Show loading state while fetching
    if (isFetchingModels) {
      return (
        <DropdownItem
          key="loading"
          isReadOnly
          textValue="Loading"
          className="cursor-default"
        >
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" />
            <span className="text-default-500">{t('Loading models...')}</span>
          </div>
        </DropdownItem>
      )
    }

    // Show empty state if no models available
    if (viewingProvider.models.length === 0) {
      return (
        <DropdownItem
          key="empty"
          isReadOnly
          textValue="No models"
          className="cursor-default"
        >
          <div className="flex flex-col gap-1 py-2">
            <span className="text-default-500">{t('No models available')}</span>
            <span className="text-xs text-default-400">
              {t('Check your server URL and connection')}
            </span>
          </div>
        </DropdownItem>
      )
    }

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
          const modelData = getCachedModelData(
            viewingProvider.credential.provider,
            model,
          )
          const caps = getCachedCapabilities(
            viewingProvider.credential.provider,
            model,
          )
          const hasCapabilities = caps && Object.values(caps).some(Boolean)
          const hasPricing = modelData?.pricing
          const showTooltip = hasCapabilities || hasPricing

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
              endContent={
                showTooltip ? (
                  <Tooltip
                    content={renderModelTooltip(
                      viewingProvider.credential.provider,
                      model,
                    )}
                    placement="top"
                    delay={200}
                    closeDelay={0}
                    classNames={{
                      content:
                        'bg-content1 shadow-lg border border-default-200',
                    }}
                  >
                    <div className="flex gap-1 items-center shrink-0 cursor-help">
                      {hasCapabilities ? (
                        renderCapabilityIcons(
                          viewingProvider.credential.provider,
                          model,
                          true,
                        )
                      ) : (
                        <Icon
                          name="InfoCircle"
                          size="sm"
                          className="w-3 h-3 text-default-400"
                        />
                      )}
                    </div>
                  </Tooltip>
                ) : (
                  renderCapabilityIcons(
                    viewingProvider.credential.provider,
                    model,
                  )
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
