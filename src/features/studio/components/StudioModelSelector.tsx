/**
 * StudioModelSelector Component
 *
 * A model selector specialized for the Studio feature, reusing the same UX pattern
 * as the main ModelSelector but filtered for image/video generation capable models.
 *
 * Sources models from IMAGE_MODELS_BY_PROVIDER / VIDEO_MODELS_BY_PROVIDER and
 * enriches with models.dev data where available for pricing and capability info.
 *
 * If no suitable providers are configured, it facilitates adding one via the
 * AddLLMProviderModal.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Tooltip,
  Spinner,
} from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { LLMService } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { inferLocalModelCapabilities } from '@/lib/llm/models'
import { getModel as getModelFromModelsDev } from '@/lib/models-dev'
import type { NormalizedModel } from '@/lib/models-dev/types'
import { type Lang, useI18n, useUrl } from '@/i18n'
import type { Credential } from '@/types'
import type { IconName } from '@/lib/types'

import {
  type ImageProvider,
  type ImageModel,
  type VideoProvider,
  type VideoModel,
  type MediaType,
  IMAGE_MODELS_BY_PROVIDER,
  VIDEO_MODELS_BY_PROVIDER,
} from '../types'
import localI18n from '../i18n'

// Provider icon mapping (subset relevant to Studio)
const PROVIDER_ICONS: Record<string, IconName> = {
  openai: 'OpenAI',
  google: 'Gemini',
  'vertex-ai': 'Gemini',
  stability: 'SparksSolid',
  together: 'Puzzle',
  fal: 'LightBulbOn',
  replicate: 'RefreshDouble',
  huggingface: 'HuggingFace',
  'openai-compatible': 'Internet',
  custom: 'Internet',
  ollama: 'Ollama',
}

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Google',
  'vertex-ai': 'Vertex AI',
  stability: 'Stability AI',
  together: 'Together AI',
  fal: 'Fal.ai',
  replicate: 'Replicate',
  huggingface: 'Hugging Face',
  'openai-compatible': 'OpenAI Compatible',
  custom: 'Custom',
  ollama: 'Ollama',
}

// Providers that fetch models dynamically from the server
const DYNAMIC_MODEL_PROVIDERS = new Set([
  'openai-compatible',
  'custom',
  'ollama',
])

// Models.dev provider ID mapping for enrichment
const MODELS_DEV_PROVIDER_MAP: Partial<Record<ImageProvider, string>> = {
  openai: 'openai',
  google: 'gemini',
  'vertex-ai': 'gemini',
}

// Models.dev model ID mapping (Studio model ID → models.dev model ID)
const MODELS_DEV_MODEL_MAP: Record<string, string> = {
  'gemini-2.5-flash-image': 'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview': 'gemini-3-pro-image-preview',
  'imagen-4.0-generate-001': 'imagen-4.0-generate-001',
  'imagen-4.0-ultra-generate-001': 'imagen-4.0-ultra-generate-001',
  'imagen-4.0-fast-generate-001': 'imagen-4.0-fast-generate-001',
  'gpt-image-1': 'gpt-5-image', // gpt-image-1 maps to gpt-5-image in models.dev
}

interface StudioModelSelectorProps {
  lang: Lang
  /** Current media type mode */
  mediaType: MediaType
  /** Currently selected image provider */
  provider?: ImageProvider | null
  /** Currently selected image model */
  model?: ImageModel | null
  /** Available image providers (from credentials) */
  availableProviders: ImageProvider[]
  /** Callback when image model changes */
  onModelChange?: (provider: ImageProvider, model: ImageModel) => void
  /** Currently selected video provider */
  videoProvider?: VideoProvider | null
  /** Currently selected video model */
  videoModel?: VideoModel | null
  /** Available video providers */
  availableVideoProviders: VideoProvider[]
  /** Callback when video model changes */
  onVideoModelChange?: (provider: VideoProvider, model: VideoModel) => void
}

interface ProviderEntry {
  provider: string
  credential: Credential
  name: string
  icon: IconName
  models: { id: string; name: string; description?: string }[]
  /** Whether this provider fetches models dynamically from the server */
  isDynamic?: boolean
}

export function StudioModelSelector({
  lang: _lang,
  mediaType,
  provider,
  model,
  availableProviders,
  onModelChange,
  videoProvider,
  videoModel,
  availableVideoProviders,
  onVideoModelChange,
}: StudioModelSelectorProps) {
  const { t } = useI18n(localI18n)
  const navigate = useNavigate()
  const url = useUrl()
  const credentials = useLLMModelStore((state) => state.credentials)

  // View mode: 'providers' shows provider list, 'models' shows model list for a provider
  const [viewMode, setViewMode] = useState<'providers' | 'models'>('providers')
  const [viewingProvider, setViewingProvider] = useState<ProviderEntry | null>(
    null,
  )
  // Cache for models.dev data (key: "provider:modelId")
  const [modelDataCache, setModelDataCache] = useState<
    Record<string, NormalizedModel | null>
  >({})
  // Track loading state for server model fetching
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  // Cache for dynamically fetched models (key: provider name)
  const [fetchedModels, setFetchedModels] = useState<
    Record<string, { id: string; name: string; description?: string }[]>
  >({})

  // Determine which providers and models to show based on media type
  const providerEntries = useMemo((): ProviderEntry[] => {
    const providers =
      mediaType === 'video' ? availableVideoProviders : availableProviders
    const modelMap =
      mediaType === 'video'
        ? VIDEO_MODELS_BY_PROVIDER
        : IMAGE_MODELS_BY_PROVIDER

    return providers
      .map((prov) => {
        const credential = credentials.find((c) => c.provider === prov)
        if (!credential) return null

        // Use hardcoded models if available, otherwise use dynamically fetched ones
        const hardcodedModels = modelMap[prov as keyof typeof modelMap] || []
        const dynamicModels = fetchedModels[prov] || []
        const models =
          hardcodedModels.length > 0
            ? (hardcodedModels as {
                id: string
                name: string
                description?: string
              }[])
            : dynamicModels

        return {
          provider: prov,
          credential,
          name: PROVIDER_NAMES[prov] || prov,
          icon: PROVIDER_ICONS[prov] || ('Server' as IconName),
          models,
          isDynamic: DYNAMIC_MODEL_PROVIDERS.has(prov),
        }
      })
      .filter(Boolean) as ProviderEntry[]
  }, [
    mediaType,
    availableProviders,
    availableVideoProviders,
    credentials,
    fetchedModels,
  ])

  // Load models.dev data for enrichment when viewing a provider
  useEffect(() => {
    if (!viewingProvider) return

    const modelsDevProviderId =
      MODELS_DEV_PROVIDER_MAP[viewingProvider.provider as ImageProvider]
    if (!modelsDevProviderId) return

    const loadModelData = async () => {
      const newCache: Record<string, NormalizedModel | null> = {}
      let hasNew = false

      for (const model of viewingProvider.models) {
        const key = `${viewingProvider.provider}:${model.id}`
        if (modelDataCache[key] === undefined) {
          hasNew = true
          try {
            const modelsDevModelId = MODELS_DEV_MODEL_MAP[model.id] || model.id
            const modelData = await getModelFromModelsDev(
              modelsDevProviderId,
              modelsDevModelId,
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
  }, [viewingProvider, modelDataCache])

  // Format price for display
  const formatPrice = useCallback(
    (price: number): string => {
      if (price === 0) return t('Generate')
      if (price < 0.01) return `$${price.toFixed(4)}`
      if (price < 1) return `$${price.toFixed(3)}`
      return `$${price.toFixed(2)}`
    },
    [t],
  )

  // Render tooltip for a model with pricing info
  const renderModelTooltip = useCallback(
    (providerKey: string, modelId: string) => {
      const key = `${providerKey}:${modelId}`
      const modelData = modelDataCache[key]

      if (!modelData?.pricing) return null

      return (
        <div className="p-1 max-w-xs">
          <div className="text-xs text-default-500 mb-1">
            {t('Image Settings')}
          </div>
          <div className="flex gap-3 text-xs">
            <div>
              <span className="text-default-400">Input:</span>{' '}
              <span className="font-medium">
                {formatPrice(modelData.pricing.inputPerMillion)}
              </span>
            </div>
            <div>
              <span className="text-default-400">Output:</span>{' '}
              <span className="font-medium">
                {formatPrice(modelData.pricing.outputPerMillion)}
              </span>
            </div>
          </div>
        </div>
      )
    },
    [modelDataCache, formatPrice, t],
  )

  // Current selection info
  const currentProvider = mediaType === 'video' ? videoProvider : provider
  const currentModel = mediaType === 'video' ? videoModel : model

  // Get display text for the button
  const displayText = useMemo(() => {
    if (!currentProvider || !currentModel) return t('Select model')

    // Check hardcoded models first
    const modelMap =
      mediaType === 'video'
        ? VIDEO_MODELS_BY_PROVIDER
        : IMAGE_MODELS_BY_PROVIDER
    const models = modelMap[currentProvider as keyof typeof modelMap] || []
    const found = models.find(
      (m: { id: string; name: string }) => m.id === currentModel,
    )
    if (found) return found.name

    // Check dynamically fetched models
    const dynamic = fetchedModels[currentProvider] || []
    const dynamicFound = dynamic.find((m) => m.id === currentModel)
    if (dynamicFound) return dynamicFound.name

    // Fallback to raw model ID
    return currentModel
  }, [currentProvider, currentModel, mediaType, fetchedModels, t])

  // Fetch models from server for dynamic providers (openai-compatible, ollama, custom)
  const fetchModelsForProvider = useCallback(
    async (entry: ProviderEntry) => {
      setIsFetchingModels(true)
      // Show models view immediately with loading state
      setViewingProvider({ ...entry, models: [] })
      setViewMode('models')

      try {
        const decryptedConfig = await CredentialService.getDecryptedConfig(
          entry.credential.id,
        )
        if (!decryptedConfig) {
          setIsFetchingModels(false)
          return
        }

        const serverModels = await LLMService.getAvailableModels(
          entry.credential.provider,
          {
            baseUrl: decryptedConfig.baseUrl,
            apiKey: decryptedConfig.apiKey,
          },
        )

        // Filter to only image/video generation capable models
        const capabilityKey =
          mediaType === 'video' ? 'videoGeneration' : 'imageGeneration'
        const filteredModels = serverModels.filter((id) => {
          const caps = inferLocalModelCapabilities(
            id,
            entry.credential.provider,
          )
          return caps[capabilityKey] === true
        })

        const modelEntries = filteredModels.map((id) => ({
          id,
          name: id,
        }))

        // Cache fetched models
        setFetchedModels((prev) => ({
          ...prev,
          [entry.provider]: modelEntries,
        }))

        // Update viewing provider with fetched models
        setViewingProvider({ ...entry, models: modelEntries })
      } catch (error) {
        console.error('Failed to fetch models for provider:', error)
        setViewingProvider({ ...entry, models: [] })
      } finally {
        setIsFetchingModels(false)
      }
    },
    [mediaType],
  )

  // Reset view mode when dropdown closes
  const handleDropdownOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setViewMode('providers')
      setViewingProvider(null)
    }
  }, [])

  // Handle model selection
  const handleSelectModel = useCallback(
    (providerKey: string, modelId: string) => {
      if (mediaType === 'video') {
        onVideoModelChange?.(
          providerKey as VideoProvider,
          modelId as VideoModel,
        )
      } else {
        onModelChange?.(providerKey as ImageProvider, modelId as ImageModel)
      }
    },
    [mediaType, onModelChange, onVideoModelChange],
  )

  // No providers available - show CTA
  const hasNoProviders = providerEntries.length === 0

  if (hasNoProviders) {
    return (
      <Tooltip
        content={
          mediaType === 'video'
            ? t('Configure your video provider in Settings to get started')
            : t('Configure your image provider in Settings to get started')
        }
        placement="bottom"
      >
        <Button
          size="sm"
          variant="flat"
          color="warning"
          className="min-w-0 px-2 h-8"
          onPress={() =>
            navigate(
              url(
                `${location.pathname}${location.search}#settings/providers/add`,
              ),
            )
          }
          startContent={<Icon name="Plus" size="sm" />}
        >
          <span className="text-xs">{t('Select model')}</span>
        </Button>
      </Tooltip>
    )
  }

  // Single provider with single model (only for non-dynamic providers) - just show the model name
  if (
    providerEntries.length === 1 &&
    providerEntries[0].models.length === 1 &&
    !providerEntries[0].isDynamic
  ) {
    const entry = providerEntries[0]
    const singleModel = entry.models[0]

    // Auto-select if nothing selected
    if (!currentModel) {
      handleSelectModel(entry.provider, singleModel.id)
    }

    return (
      <Tooltip
        content={singleModel.description || singleModel.name}
        placement="bottom"
      >
        <Button
          size="sm"
          variant="light"
          className="min-w-0 px-2 h-8"
          startContent={
            <Icon name={entry.icon} size="sm" className="text-default-500" />
          }
        >
          <span className="text-xs truncate max-w-24">{singleModel.name}</span>
        </Button>
      </Tooltip>
    )
  }

  // Render provider list items
  const renderProviderItems = () => {
    return providerEntries.map((entry) => {
      const isSelected = currentProvider === entry.provider
      const currentModelForProvider =
        isSelected && currentModel
          ? entry.models.find((m) => m.id === currentModel)
          : null

      // Show arrow for multi-model providers or dynamic providers that fetch from server
      const showArrow = entry.models.length > 1 || entry.isDynamic

      return (
        <DropdownItem
          key={entry.provider}
          startContent={<Icon name={entry.icon} size="sm" />}
          endContent={
            showArrow ? (
              <Icon
                name="NavArrowRight"
                size="sm"
                className="text-default-400"
              />
            ) : undefined
          }
          textValue={entry.name}
          closeOnSelect={!showArrow}
          onPress={() => {
            if (entry.isDynamic) {
              // Fetch models from server for dynamic providers
              fetchModelsForProvider(entry)
            } else if (entry.models.length > 1) {
              setViewingProvider(entry)
              setViewMode('models')
            } else if (entry.models.length === 1) {
              handleSelectModel(entry.provider, entry.models[0].id)
            }
          }}
        >
          <div className="flex flex-col gap-0.5">
            <span>{entry.name}</span>
            {isSelected && currentModelForProvider ? (
              <span className="text-xs text-default-500">
                {currentModelForProvider.name}
              </span>
            ) : isSelected && currentModel && entry.isDynamic ? (
              <span className="text-xs text-default-500">{currentModel}</span>
            ) : entry.isDynamic ? (
              <span className="text-xs text-default-500">
                {entry.credential.baseUrl
                  ? new URL(entry.credential.baseUrl).hostname
                  : t('Select model')}
              </span>
            ) : entry.models.length > 1 ? (
              <span className="text-xs text-default-500">
                {entry.models.length} models
              </span>
            ) : entry.models.length === 1 ? (
              <span className="text-xs text-default-500">
                {entry.models[0].name}
              </span>
            ) : null}
          </div>
        </DropdownItem>
      )
    })
  }

  // Render model list items for a specific provider
  const renderModelItems = () => {
    if (!viewingProvider) return null

    // Show loading state when fetching models from server
    if (isFetchingModels) {
      return (
        <DropdownItem key="loading" textValue="Loading" isReadOnly>
          <div className="flex items-center gap-2 py-2 justify-center">
            <Spinner size="sm" />
            <span className="text-xs text-default-500">
              {t('Loading models...')}
            </span>
          </div>
        </DropdownItem>
      )
    }

    // No models found
    if (viewingProvider.models.length === 0) {
      return (
        <DropdownItem key="empty" textValue="No models" isReadOnly>
          <span className="text-xs text-default-500">
            {viewingProvider.isDynamic
              ? t('No image/video generation models detected')
              : t('No models found')}
          </span>
        </DropdownItem>
      )
    }

    return viewingProvider.models.map((m) => {
      const isSelected =
        currentProvider === viewingProvider.provider && currentModel === m.id
      const tooltipContent = renderModelTooltip(viewingProvider.provider, m.id)

      return (
        <DropdownItem
          key={m.id}
          startContent={
            isSelected ? (
              <Icon name="Check" size="sm" />
            ) : (
              <span className="w-4" />
            )
          }
          endContent={
            tooltipContent ? (
              <Tooltip
                content={tooltipContent}
                placement="top"
                delay={200}
                closeDelay={0}
                classNames={{
                  content: 'bg-content1 shadow-lg border border-default-200',
                }}
              >
                <div className="cursor-help">
                  <Icon
                    name="InfoCircle"
                    size="sm"
                    className="w-3 h-3 text-default-400"
                  />
                </div>
              </Tooltip>
            ) : undefined
          }
          textValue={m.name}
          description={m.description}
          closeOnSelect
          onPress={() => {
            handleSelectModel(viewingProvider.provider, m.id)
          }}
        >
          {m.name}
        </DropdownItem>
      )
    })
  }

  return (
    <Dropdown
      placement="bottom-start"
      className="bg-white dark:bg-default-50 dark:text-white"
      onOpenChange={handleDropdownOpenChange}
    >
      <DropdownTrigger>
        <Button
          size="sm"
          variant="light"
          className="min-w-0 px-2 h-8"
          startContent={
            currentProvider ? (
              <Icon
                name={PROVIDER_ICONS[currentProvider] || 'Server'}
                size="sm"
                className="text-default-500"
              />
            ) : undefined
          }
          endContent={<Icon name="NavArrowDown" size="sm" />}
        >
          <span className="text-xs truncate max-w-24">{displayText}</span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={
          mediaType === 'video'
            ? t('Select video model')
            : t('Select image model')
        }
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
                key="add-provider"
                startContent={<Icon name="Plus" size="sm" />}
                textValue={t('Select model')}
                onPress={() =>
                  navigate(
                    url(
                      `${location.pathname}${location.search}#settings/providers/add`,
                    ),
                  )
                }
                closeOnSelect
              >
                {t('Add provider')}
              </DropdownItem>
            </DropdownSection>
          </>
        ) : (
          <>
            <DropdownSection showDivider>
              <DropdownItem
                key="back"
                startContent={<Icon name="ArrowLeft" size="sm" />}
                textValue={viewingProvider?.name || ''}
                closeOnSelect={false}
                onPress={() => {
                  setViewMode('providers')
                  setViewingProvider(null)
                }}
              >
                <span className="font-medium">{viewingProvider?.name}</span>
              </DropdownItem>
            </DropdownSection>
            <DropdownSection>{renderModelItems()}</DropdownSection>
          </>
        )}
      </DropdownMenu>
    </Dropdown>
  )
}
