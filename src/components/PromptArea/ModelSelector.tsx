import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Input,
  Spinner,
} from '@heroui/react'

import { Icon } from '../Icon'
import { useModelPicker } from './useModelPicker'
import { PROVIDERS, getModelIds } from '@/pages/Settings/providers'
import { LLMService } from '@/lib/llm'
import { getModel as getModelFromModelsDev } from '@/lib/models-dev'
import type { NormalizedModel } from '@/lib/models-dev/types'
import { CredentialService } from '@/lib/credential-service'
import {
  inferLocalModelCapabilities,
  usesLocalInference,
} from '@/lib/llm/models'

import { useI18n, type Lang } from '@/i18n'
import type {
  LLMProvider,
  Credential,
  ModelCapabilities,
  LLMModel,
} from '@/types'
import type { IconName } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { formatDateCompact } from '@/lib/date'

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
  const navigate = useNavigate()

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
  // Hovered model for the detail panel
  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  // Bounding rect of the dropdown menu popover for positioning the detail panel
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null)
  // Timer ref for delayed hover off
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  // For vertex-ai, returns the base provider; use getModelsDevProviderIdForModel for model-specific lookup
  const getModelsDevProviderId = useCallback(
    (provider: LLMProvider): string | null => {
      const mapping: Partial<Record<LLMProvider, string>> = {
        openai: 'openai',
        anthropic: 'anthropic',
        google: 'google', // models.dev uses 'google' not 'gemini'
        'vertex-ai': 'google-vertex',
        mistral: 'mistral',
        openrouter: 'openrouter',
      }
      return mapping[provider] ?? null
    },
    [],
  )

  // Get the correct models.dev provider ID for a specific model
  // Handles Vertex AI special case where Claude models use a different provider
  const getModelsDevProviderIdForModel = useCallback(
    (provider: LLMProvider, modelId: string): string | null => {
      // For Vertex AI, Claude models use a different provider ID
      if (provider === 'vertex-ai') {
        const lowerModelId = modelId.toLowerCase()
        if (
          lowerModelId.includes('claude') ||
          lowerModelId.includes('anthropic')
        ) {
          return 'google-vertex-anthropic'
        }
        return 'google-vertex'
      }
      return getModelsDevProviderId(provider)
    },
    [getModelsDevProviderId],
  )

  // Strip provider prefix from model ID if present (e.g., "google/gemini-2.5" -> "gemini-2.5")
  const stripModelPrefix = useCallback((modelId: string): string => {
    const slashIndex = modelId.indexOf('/')
    if (slashIndex !== -1) {
      return modelId.substring(slashIndex + 1)
    }
    return modelId
  }, [])

  // Strip Vertex AI version suffix (e.g., "gemini-2.0-flash@20260101" -> "gemini-2.0-flash")
  // Note: For Claude models on Vertex AI, models.dev INCLUDES the version suffix,
  // so we should NOT strip it for those models
  const stripVersionSuffix = useCallback(
    (modelId: string, keepForAnthropicOnVertex = false): string => {
      if (keepForAnthropicOnVertex) return modelId
      return modelId.replace(/@\d{8,}$/, '')
    },
    [],
  )

  // Helper to get cached model data
  const getCachedModelData = useCallback(
    (provider: LLMProvider, modelId: string): NormalizedModel | null => {
      const key = `${provider}:${modelId}`
      return modelDataCache[key] ?? null
    },
    [modelDataCache],
  )

  // Helper to get capabilities from cached model data or infer for local providers
  const getCachedCapabilities = useCallback(
    (provider: LLMProvider, modelId: string): ModelCapabilities | null => {
      // For local/ollama/openai-compatible providers, use pattern-based capability inference
      if (usesLocalInference(provider)) {
        const caps = inferLocalModelCapabilities(modelId, provider)
        // Return null if no capabilities were inferred (empty object)
        return Object.keys(caps).length > 0 ? caps : null
      }

      // For cloud providers, use cached model data from models.dev
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

  // Categorize a model as 'latest', 'older', or 'deprecated' based on models.dev metadata
  const getModelCategory = useCallback(
    (
      provider: LLMProvider,
      modelId: string,
    ): 'latest' | 'older' | 'deprecated' => {
      const modelData = getCachedModelData(provider, modelId)
      if (!modelData) return 'latest' // No data available, assume latest

      // Explicit deprecation status from models.dev
      if (modelData.metadata.status === 'deprecated') return 'deprecated'

      // Check release date - models older than 12 months are categorized as 'older'
      if (modelData.metadata.releaseDate) {
        const releaseDate = new Date(modelData.metadata.releaseDate)
        const twelveMonthsAgo = new Date()
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
        if (releaseDate < twelveMonthsAgo) return 'older'
      }

      return 'latest'
    },
    [getCachedModelData],
  )

  // Load model data for models when viewing a provider
  useEffect(() => {
    if (!viewingProvider || viewingProvider.models.length === 0) return

    // Check if this provider uses models.dev at all
    const baseProviderId = getModelsDevProviderId(
      viewingProvider.credential.provider,
    )
    if (!baseProviderId) return // Skip for local/ollama providers

    const loadModelData = async () => {
      const newCache: Record<string, NormalizedModel | null> = {}
      let hasNew = false

      for (const modelId of viewingProvider.models) {
        const key = `${viewingProvider.credential.provider}:${modelId}`
        if (modelDataCache[key] === undefined) {
          hasNew = true
          try {
            // Get the correct models.dev provider ID for this specific model
            // (handles Vertex AI Claude vs Gemini distinction)
            const modelsDevProviderId = getModelsDevProviderIdForModel(
              viewingProvider.credential.provider,
              modelId,
            )
            if (!modelsDevProviderId) {
              newCache[key] = null
              continue
            }
            // For google-vertex-anthropic, models.dev includes the @YYYYMMDD suffix
            // so we should NOT strip it for Claude models on Vertex AI
            const isAnthropicOnVertex =
              modelsDevProviderId === 'google-vertex-anthropic'
            // Strip provider prefix from model ID if present (e.g., "google/gemini-2.5" -> "gemini-2.5")
            // Also strip Vertex AI version suffix for non-Anthropic models
            const strippedModelId = stripVersionSuffix(
              stripModelPrefix(modelId),
              isAnthropicOnVertex,
            )
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
    getModelsDevProviderIdForModel,
    stripModelPrefix,
    stripVersionSuffix,
  ])

  // Format context window size for display (e.g., 128000 -> "128K", 2000000 -> "2M")
  const formatContextWindow = useCallback((tokens: number): string => {
    if (tokens >= 1_000_000) {
      const m = tokens / 1_000_000
      return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
    }
    if (tokens >= 1_000) {
      const k = tokens / 1_000
      return `${Number.isInteger(k) ? k : k.toFixed(1)}K`
    }
    return `${tokens}`
  }, [])

  // Get a visual cost tier ($ to $$$$) based on input price per million tokens
  const getCostTier = useCallback(
    (inputPerMillion: number): { label: string; className: string } => {
      if (inputPerMillion === 0)
        return { label: t('Free'), className: 'text-success' }
      if (inputPerMillion < 0.5)
        return { label: '$', className: 'text-success' }
      if (inputPerMillion < 3) return { label: '$$', className: 'text-warning' }
      if (inputPerMillion < 10)
        return { label: '$$$', className: 'text-orange-500' }
      return { label: '$$$$', className: 'text-danger' }
    },
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

  // Generate a concise, human-readable description of what a model is good for
  const generateModelDescription = useCallback(
    (
      _provider: LLMProvider,
      _modelId: string,
      modelData: NormalizedModel | null,
      caps: ModelCapabilities | null,
    ): string => {
      const traits: string[] = []
      const uses: string[] = []

      // Determine the model's core personality from capabilities
      if (caps?.thinking) traits.push(t('reasoning-focused'))
      else if (caps?.fast) traits.push(t('fast and lightweight'))
      else if (caps?.highCost) traits.push(t('flagship'))
      else if (caps?.lowCost) traits.push(t('cost-efficient'))

      // Modality-driven use cases
      if (caps?.vision) uses.push(t('image understanding'))
      if (modelData?.capabilities?.audio) uses.push(t('audio'))
      if (modelData?.modalities?.output?.includes('image'))
        uses.push(t('image generation'))
      if (modelData?.modalities?.output?.includes('audio'))
        uses.push(t('speech synthesis'))
      if (caps?.tools) uses.push(t('tool use'))
      if (modelData?.capabilities?.structuredOutput)
        uses.push(t('structured output'))

      // Context window note
      const ctx = modelData?.limits?.contextWindow
      const ctxNote =
        ctx && ctx >= 200_000
          ? t('with a very large context window')
          : ctx && ctx >= 100_000
            ? t('with a large context window')
            : ''

      // Build sentence
      const traitStr =
        traits.length > 0
          ? traits.join(', ') + ' ' + t('model')
          : t('General-purpose model')
      const useStr =
        uses.length > 0
          ? ` ${t('suited for')} ${uses.slice(0, 3).join(', ')}`
          : ''
      const ctxStr = ctxNote ? `, ${ctxNote}` : ''

      return `${traitStr}${useStr}${ctxStr}.`
    },
    [t],
  )

  // Full list of all capabilities to always display (enabled or disabled)
  const allCapabilityDefs = useMemo(
    () => [
      {
        key: 'thinking' as const,
        icon: 'Brain' as IconName,
        enabledClass: 'text-secondary',
        label: t('Reasoning'),
      },
      {
        key: 'vision' as const,
        icon: 'MediaImage' as IconName,
        enabledClass: 'text-primary',
        label: t('Vision'),
      },
      {
        key: 'tools' as const,
        icon: 'Puzzle' as IconName,
        enabledClass: 'text-warning',
        label: t('Tools'),
      },
      {
        key: 'structuredOutput' as const,
        icon: 'Code' as IconName,
        enabledClass: 'text-success',
        label: t('JSON'),
      },
      {
        key: 'attachments' as const,
        icon: 'Attachment' as IconName,
        enabledClass: 'text-cyan-500',
        label: t('Files'),
      },
      {
        key: 'audio' as const,
        icon: 'MusicNote' as IconName,
        enabledClass: 'text-pink-500',
        label: t('Audio'),
      },
    ],
    [t],
  )

  // All possible input modalities
  const allInputModalities = useMemo(
    () => [
      { key: 'text', icon: 'Text' as IconName, label: t('Text') },
      { key: 'image', icon: 'MediaImage' as IconName, label: t('Image') },
      { key: 'audio', icon: 'MusicNote' as IconName, label: t('Audio') },
      { key: 'video', icon: 'VideoCamera' as IconName, label: t('Video') },
      { key: 'pdf', icon: 'Page' as IconName, label: t('PDF') },
    ],
    [t],
  )

  // All possible output modalities
  const allOutputModalities = useMemo(
    () => [
      { key: 'text', icon: 'Text' as IconName, label: t('Text') },
      { key: 'image', icon: 'MediaImage' as IconName, label: t('Image') },
      { key: 'audio', icon: 'MusicNote' as IconName, label: t('Audio') },
      { key: 'video', icon: 'VideoCamera' as IconName, label: t('Video') },
    ],
    [t],
  )

  // Render a comprehensive tooltip content for a model
  const renderModelTooltip = useCallback(
    (provider: LLMProvider, modelId: string) => {
      const modelData = getCachedModelData(provider, modelId)
      const caps = getCachedCapabilities(provider, modelId)

      const hasPricing = modelData?.pricing
      const hasContext = modelData?.limits?.contextWindow

      // Prefer the human-readable name from models.dev over the raw model ID
      const preferredName =
        modelData?.name || displayModelName(modelId, provider)

      // Metadata
      const knowledgeCutoff = modelData?.metadata?.knowledgeCutoff
      const releaseDate = modelData?.metadata?.releaseDate
      const openWeights = modelData?.metadata?.openWeights
      const hasMetadata = knowledgeCutoff || releaseDate
      const status = modelData?.metadata?.status

      // Need at least some data to show
      const hasModalities = modelData?.modalities
      const hasCaps = caps || modelData?.capabilities
      if (
        !hasPricing &&
        !hasCaps &&
        !hasContext &&
        !hasMetadata &&
        !hasModalities
      ) {
        return null
      }

      const costTier = hasPricing
        ? getCostTier(modelData.pricing.inputPerMillion)
        : null

      // Build a visual context bar (percentage of 1M tokens as reference max)
      const contextRatio = hasContext
        ? Math.min(modelData.limits.contextWindow / 1_000_000, 1)
        : 0

      // Resolve which capabilities are enabled
      const resolvedCaps: Record<string, boolean> = {}
      // From ModelCapabilities (our internal inference)
      if (caps) {
        resolvedCaps.thinking = !!caps.thinking
        resolvedCaps.vision = !!caps.vision
        resolvedCaps.tools = !!caps.tools
      }
      // From models.dev data (more authoritative for cloud models)
      if (modelData?.capabilities) {
        resolvedCaps.thinking =
          resolvedCaps.thinking || modelData.capabilities.reasoning
        resolvedCaps.vision =
          resolvedCaps.vision || modelData.capabilities.vision
        resolvedCaps.tools = resolvedCaps.tools || modelData.capabilities.tools
        resolvedCaps.structuredOutput = modelData.capabilities.structuredOutput
        resolvedCaps.attachments = modelData.capabilities.attachments
        resolvedCaps.audio = modelData.capabilities.audio
      }

      // Enabled input/output modalities
      const enabledInputs = new Set(modelData?.modalities?.input || [])
      const enabledOutputs = new Set(modelData?.modalities?.output || [])

      // Description
      const description = generateModelDescription(
        provider,
        modelId,
        modelData,
        caps,
      )

      return (
        <div className="w-72">
          {/* ── Header: Identity + badges ── */}
          <div className="px-3 pt-2.5 pb-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm leading-tight truncate">
                  {preferredName}
                </span>
                <span className="text-[11px] text-default-400 truncate">
                  {modelId}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {openWeights && (
                  <Chip
                    size="sm"
                    color="success"
                    variant="flat"
                    classNames={{
                      base: 'h-4 px-1',
                      content: 'text-[10px] px-0',
                    }}
                  >
                    Open
                  </Chip>
                )}
                {status === 'deprecated' && (
                  <Chip
                    size="sm"
                    color="danger"
                    variant="flat"
                    classNames={{
                      base: 'h-4 px-1',
                      content: 'text-[10px] px-0',
                    }}
                  >
                    Deprecated
                  </Chip>
                )}
                {status === 'beta' && (
                  <Chip
                    size="sm"
                    color="warning"
                    variant="flat"
                    classNames={{
                      base: 'h-4 px-1',
                      content: 'text-[10px] px-0',
                    }}
                  >
                    Beta
                  </Chip>
                )}
                {status === 'alpha' && (
                  <Chip
                    size="sm"
                    color="secondary"
                    variant="flat"
                    classNames={{
                      base: 'h-4 px-1',
                      content: 'text-[10px] px-0',
                    }}
                  >
                    Alpha
                  </Chip>
                )}
                {costTier && (
                  <span className={`text-xs font-bold ${costTier.className}`}>
                    {costTier.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Description: one-liner about the model ── */}
          <div className="px-3 pb-2">
            <p className="text-[11px] text-default-500 leading-relaxed first-letter:uppercase">
              {description}
            </p>
          </div>

          {/* ── Metadata: release & knowledge cutoff ── */}
          {hasMetadata && (
            <div className="px-3 py-1.5 flex items-center text-[11px] border-t border-default-100">
              {releaseDate && (
                <div className="flex items-center gap-1 w-24">
                  <Icon
                    name={'Calendar' as IconName}
                    size="sm"
                    className="w-3 h-3 text-default-400"
                  />
                  <span className="font-medium">
                    {formatDateCompact(releaseDate, lang)}
                  </span>
                </div>
              )}
              {knowledgeCutoff && (
                <div className="flex items-center gap-1">
                  <Icon
                    name={'Book' as IconName}
                    size="sm"
                    className="w-3 h-3 text-default-400"
                  />
                  <span className="text-default-400">{t('Cutoff')}</span>
                  <span className="font-medium">
                    {formatDateCompact(knowledgeCutoff, lang)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Modalities: Input & Output with all types shown ── */}
          {hasModalities && (
            <div className="px-3 py-2 border-t border-default-100">
              <div className="grid grid-flow-col">
                {/* Input modalities */}
                <div className="flex-1">
                  <span className="text-[10px] text-default-400 uppercase tracking-wider font-medium">
                    {t('Input')}
                  </span>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                    {allInputModalities.map(({ key, icon, label }) => {
                      const enabled = enabledInputs.has(key)
                      return (
                        <div
                          key={key}
                          className={`flex flex-col items-center gap-0.5 ${enabled ? '' : 'opacity-20'}`}
                          title={`${label}${enabled ? '' : ` (${t('not supported')})`}`}
                        >
                          <Icon
                            name={icon}
                            size="sm"
                            className={`w-3.5 h-3.5 ${enabled ? 'text-foreground' : 'text-default-300'}`}
                          />
                          <span className="text-[9px] text-default-500 leading-none">
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Divider */}
                <div className="w-px bg-default-100 self-stretch my-1" />
                {/* Output modalities */}
                <div className="flex-1">
                  <span className="text-[10px] text-default-400 uppercase tracking-wider font-medium">
                    {t('Output')}
                  </span>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {allOutputModalities.map(({ key, icon, label }) => {
                      const enabled = enabledOutputs.has(key)
                      return (
                        <div
                          key={key}
                          className={`flex flex-col items-center gap-0.5 ${enabled ? '' : 'opacity-20'}`}
                          title={`${label}${enabled ? '' : ` (${t('not supported')})`}`}
                        >
                          <Icon
                            name={icon}
                            size="sm"
                            className={`w-3.5 h-3.5 ${enabled ? 'text-foreground' : 'text-default-300'}`}
                          />
                          <span className="text-[9px] text-default-500 leading-none">
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Capabilities: 3×2 grid, all shown, enabled/disabled visually ── */}
          <div className="px-3 py-2 border-t border-default-100">
            <span className="text-[10px] text-default-400 uppercase tracking-wider font-medium">
              {t('Capabilities')}
            </span>
            <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mt-1.5">
              {allCapabilityDefs.map(({ key, icon, enabledClass, label }) => {
                const enabled = !!resolvedCaps[key]
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1 ${enabled ? '' : 'opacity-20'}`}
                    title={`${label}${enabled ? '' : ` (${t('not supported')})`}`}
                  >
                    <Icon
                      name={icon}
                      size="sm"
                      className={`w-3.5 h-3.5 ${enabled ? enabledClass : 'text-default-300'}`}
                    />
                    <span
                      className={`text-[11px] ${enabled ? 'text-foreground' : 'text-default-300'}`}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Context window ── */}
          {hasContext && (
            <div className="px-3 py-2 bg-default-50 border-t border-default-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-default-500">
                  {t('Context')}
                </span>
                <span className="text-[11px] font-medium">
                  {formatContextWindow(modelData.limits.contextWindow)} tokens
                </span>
              </div>
              <div className="h-1 w-full bg-default-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.max(contextRatio * 100, 4)}%` }}
                />
              </div>
              {modelData?.limits?.maxOutput && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-default-500">
                    {t('Max output')}
                  </span>
                  <span className="text-[11px] font-medium">
                    {formatContextWindow(modelData.limits.maxOutput)} tokens
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Pricing ── */}
          {hasPricing && (
            <div className="px-3 py-2 bg-default-50 border-t border-default-100">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-default-400">{t('Input')}</span>
                  <span className="font-medium">
                    {formatPrice(modelData.pricing.inputPerMillion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-400">{t('Output')}</span>
                  <span className="font-medium">
                    {formatPrice(modelData.pricing.outputPerMillion)}
                  </span>
                </div>
                {modelData.pricing.reasoningPerMillion != null &&
                  modelData.pricing.reasoningPerMillion > 0 && (
                    <div className="flex justify-between">
                      <span className="text-default-400">{t('Thinking')}</span>
                      <span className="font-medium">
                        {formatPrice(modelData.pricing.reasoningPerMillion)}
                      </span>
                    </div>
                  )}
                {modelData.pricing.cacheReadPerMillion != null &&
                  modelData.pricing.cacheReadPerMillion > 0 && (
                    <div className="flex justify-between">
                      <span className="text-default-400">
                        {t('Cache read')}
                      </span>
                      <span className="font-medium">
                        {formatPrice(modelData.pricing.cacheReadPerMillion)}
                      </span>
                    </div>
                  )}
              </div>
              <div className="text-[10px] text-default-300 text-right mt-0.5">
                /{t('1M tokens')}
              </div>
            </div>
          )}
        </div>
      )
    },
    [
      allCapabilityDefs,
      allInputModalities,
      allOutputModalities,
      displayModelName,
      generateModelDescription,
      getCachedCapabilities,
      getCachedModelData,
      getCostTier,
      formatContextWindow,
      formatPrice,
      t,
    ],
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
      setHoveredModel(null)
      setMenuRect(null)
    }
  }, [])

  // Get display text for the button
  const displayText = useMemo(() => {
    if (!selectedProvider) return t('Select a model')
    const model =
      selectedModel || getSelectedModelForProvider(selectedProvider.provider)
    if (model) return displayModelName(model, selectedProvider.provider)
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
              <span className="text-xs text-default-500">
                {displayModelName(currentModelForProvider, credential.provider)}
              </span>
            ) : singleModel && !hasMultipleModels ? (
              <span className="text-xs text-default-500">
                {displayModelName(singleModel, credential.provider)}
              </span>
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
        {(() => {
          // Group filtered models by category
          const latestModels: string[] = []
          const olderModels: string[] = []

          for (const model of filteredModels) {
            const category = getModelCategory(
              viewingProvider.credential.provider,
              model,
            )
            if (category === 'latest') {
              latestModels.push(model)
            } else {
              olderModels.push(model)
            }
          }

          const renderModelItem = (model: string, dimmed = false) => {
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
            const hasContext = modelData?.limits?.contextWindow
            const showTooltip = hasCapabilities || hasPricing || hasContext
            const category = getModelCategory(
              viewingProvider.credential.provider,
              model,
            )
            const isDeprecated = category === 'deprecated'

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
                  <div className="flex gap-1 items-center shrink-0">
                    {isDeprecated && (
                      <Chip
                        size="sm"
                        color="danger"
                        variant="flat"
                        classNames={{
                          base: 'h-4 px-1',
                          content: 'text-[10px] px-0',
                        }}
                      >
                        {t('Deprecated')}
                      </Chip>
                    )}
                    {showTooltip && (
                      <Icon
                        name="InfoCircle"
                        size="sm"
                        className="w-3 h-3 text-default-400"
                      />
                    )}
                  </div>
                }
                textValue={model}
                closeOnSelect
                className={`relative ${dimmed ? 'opacity-60' : ''}`}
                onPress={() => {
                  handleProviderSelect(
                    viewingProvider.credential,
                    viewingProvider.models,
                  )
                  handleModelSelect(viewingProvider.credential.provider, model)
                }}
              >
                <div
                  className="absolute inset-0 z-10"
                  onMouseEnter={(e) => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current)
                      hoverTimeoutRef.current = null
                    }
                    setHoveredModel(model)
                    const popover = e.currentTarget.closest(
                      '[data-slot="content"]',
                    ) as HTMLElement | null
                    if (popover) {
                      setMenuRect(popover.getBoundingClientRect())
                    }
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredModel(null)
                    }, 100)
                  }}
                />
                {modelData?.name ||
                  displayModelName(model, viewingProvider.credential.provider)}
              </DropdownItem>
            )
          }

          return (
            <>
              {latestModels.map((model) => renderModelItem(model))}
              {olderModels.length > 0 && (
                <>
                  <DropdownItem
                    key="older-divider"
                    isReadOnly
                    textValue="Older models"
                    isDisabled
                  >
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="flex-1 h-px bg-default-200" />
                      <span className="text-xs uppercase tracking-wider">
                        {t('Older models')}
                      </span>
                      <div className="flex-1 h-px bg-default-200" />
                    </div>
                  </DropdownItem>
                  {olderModels.map((model) => renderModelItem(model, true))}
                </>
              )}
              {filteredModels.length === 0 && (
                <DropdownItem
                  key="no-results"
                  isReadOnly
                  textValue="No results"
                >
                  <span className="text-default-400 text-sm">
                    {t('No models found')}
                  </span>
                </DropdownItem>
              )}
            </>
          )
        })()}

        <DropdownItem
          key="manage-knowledge"
          startContent={<Icon name="Settings" size="sm" />}
          textValue={t('Manage knowledge')}
          closeOnSelect
          className="text-default-400 text-xs"
          onPress={() => {
            navigate(`${location.pathname}#settings/knowledge`)
          }}
        >
          {t('Manage knowledge')}
        </DropdownItem>
      </>
    )
  }

  return (
    <>
      <Dropdown
        placement="bottom-start"
        className="bg-white dark:bg-default-50 dark:text-white"
        shouldBlockScroll={false}
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
                  textValue={t('Add AI provider')}
                  onPress={() => {
                    navigate(`${location.pathname}#settings/providers/add`)
                  }}
                  closeOnSelect
                >
                  {t('Add AI provider')}
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
      {/* Detail panel rendered via portal, fixed to the left of the dropdown */}
      {hoveredModel &&
        menuRect &&
        viewingProvider &&
        (() => {
          const tooltipContent = renderModelTooltip(
            viewingProvider.credential.provider,
            hoveredModel,
          )
          if (!tooltipContent) return null
          return createPortal(
            <div
              className="fixed z-[9999] bg-content1 shadow-lg border border-default-200 rounded-xl overflow-hidden"
              style={{
                top: menuRect.top,
                right: window.innerWidth - menuRect.left + 8,
              }}
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current)
                  hoverTimeoutRef.current = null
                }
              }}
              onMouseLeave={() => {
                setHoveredModel(null)
              }}
            >
              {tooltipContent}
            </div>,
            document.body,
          )
        })()}
    </>
  )
}
