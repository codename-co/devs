/**
 * LLM Model Registry
 *
 * Central registry of LLM models with their capability flags.
 * Used to select appropriate models for different tasks:
 * - "fastest available low-cost model" for simple tasks
 * - "thinking vision-ready model" for complex analysis
 *
 * Model data is loaded from:
 * - /models/model-registry.json for local/ollama models
 * - models.dev API for cloud providers (openai, anthropic, google, etc.)
 *
 * @module lib/llm/models
 */

import type { LLMModel, LLMProvider, ModelCapabilities } from '@/types'
import { getModelsByProvider as getModelsDevByProvider } from '@/lib/models-dev'
import type { NormalizedModel } from '@/lib/models-dev/types'

// =============================================================================
// Types
// =============================================================================

/**
 * Enhanced LLM model with additional pricing and limits information
 * from models.dev data source.
 */
export interface EnhancedLLMModel extends LLMModel {
  /** Pricing information per million tokens (USD) */
  pricing?: {
    /** Cost per million input tokens */
    inputPerMillion: number
    /** Cost per million output tokens */
    outputPerMillion: number
    /** Cost per million reasoning tokens (for thinking models) */
    reasoningPerMillion?: number
  }
  /** Token limits */
  limits?: {
    /** Maximum context window size in tokens */
    contextWindow: number
    /** Maximum output tokens */
    maxOutput: number
  }
  /** Data source for this model */
  source: 'registry' | 'models-dev'
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Mapping from models.dev provider IDs to DEVS LLMProvider types.
 * Useful for converting models.dev data to DEVS format.
 */
export const MODELS_DEV_PROVIDER_MAP: Record<string, LLMProvider> = {
  openai: 'openai',
  anthropic: 'anthropic',
  'google-genai': 'google',
  'vertex-ai': 'vertex-ai',
  mistral: 'mistral',
  openrouter: 'openrouter',
}

/**
 * Reverse mapping from DEVS LLMProvider to models.dev provider ID
 */
const DEVS_TO_MODELS_DEV_MAP: Record<LLMProvider, string | null> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google', // models.dev uses 'google' not 'google-genai'
  'vertex-ai': 'google-vertex', // models.dev uses 'google-vertex'
  mistral: 'mistral',
  openrouter: 'openrouter',
  // Local providers - not in models.dev
  local: null,
  ollama: null,
  huggingface: null,
  'openai-compatible': null,
  custom: null,
  stability: null,
  replicate: null,
  together: null,
  fal: null,
}

/**
 * Providers that should use models.dev as the data source
 */
const CLOUD_PROVIDERS: LLMProvider[] = [
  'openai',
  'anthropic',
  'google',
  'vertex-ai',
  'mistral',
  'openrouter',
]

// =============================================================================
// Model Registry (from JSON)
// =============================================================================

/**
 * Model registry type
 */
type ModelRegistry = Record<LLMProvider, LLMModel[]>

/**
 * Cached model registry (loaded from JSON)
 */
let MODEL_REGISTRY: ModelRegistry | null = null

/**
 * Loading promise to prevent multiple fetches
 */
let loadingPromise: Promise<ModelRegistry> | null = null

/**
 * Default empty registry for providers
 */
const EMPTY_REGISTRY: ModelRegistry = {
  local: [],
  ollama: [],
  openai: [],
  anthropic: [],
  google: [],
  'vertex-ai': [],
  mistral: [],
  openrouter: [],
  huggingface: [],
  'openai-compatible': [],
  custom: [],
  stability: [],
  replicate: [],
  together: [],
  fal: [],
}

/**
 * Load the model registry from JSON file
 */
export async function loadModelRegistry(): Promise<ModelRegistry> {
  if (MODEL_REGISTRY) {
    return MODEL_REGISTRY
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    try {
      // Add cache-busting to ensure fresh data (bypasses service worker stale cache)
      const response = await fetch('/models/model-registry.json', {
        cache: 'no-cache',
      })
      if (!response.ok) {
        console.error('Failed to load model registry:', response.statusText)
        return EMPTY_REGISTRY
      }
      const data = await response.json()
      // Remove $schema property from the data
      const { $schema: _, ...registry } = data
      MODEL_REGISTRY = registry as ModelRegistry
      return MODEL_REGISTRY
    } catch (error) {
      console.error('Failed to load model registry:', error)
      return EMPTY_REGISTRY
    }
  })()

  return loadingPromise
}

/**
 * Get the model registry synchronously (returns empty if not loaded)
 * Use loadModelRegistry() for async access with guaranteed data
 */
export function getModelRegistry(): ModelRegistry {
  return MODEL_REGISTRY || EMPTY_REGISTRY
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: LLMProvider): LLMModel[] {
  return getModelRegistry()[provider] || []
}

/**
 * Check if a provider is a cloud provider (uses models.dev)
 */
export function isCloudProvider(provider: LLMProvider): boolean {
  return CLOUD_PROVIDERS.includes(provider)
}

/**
 * Get models for a specific provider (async version).
 * For cloud providers (openai, anthropic, google, etc.), fetches from models.dev.
 * For local providers (local, ollama), uses model-registry.json.
 */
export async function getModelsForProviderAsync(
  provider: LLMProvider,
): Promise<LLMModel[]> {
  // For non-cloud providers, use model-registry.json
  if (!isCloudProvider(provider)) {
    const registry = await loadModelRegistry()
    return registry[provider] || []
  }

  // For cloud providers, try models.dev first
  const modelsDevProviderId = DEVS_TO_MODELS_DEV_MAP[provider]
  if (modelsDevProviderId) {
    try {
      const normalizedModels = await getModelsDevByProvider(modelsDevProviderId)
      if (normalizedModels.length > 0) {
        return normalizedModels.map((model) => ({
          id: model.id,
          name: model.name,
          capabilities: {
            vision: model.capabilities.vision,
            tools: model.capabilities.tools,
            thinking: model.capabilities.reasoning,
            lowCost: model.pricing.inputPerMillion < 1.0,
            highCost: model.pricing.inputPerMillion > 10.0,
            fast: false, // Cannot determine from models.dev data
          },
        }))
      }
    } catch (error) {
      console.warn(
        `[models] Failed to fetch models from models.dev for ${provider}:`,
        error,
      )
    }
  }

  // Fall back to model-registry.json
  const registry = await loadModelRegistry()
  return registry[provider] || []
}

/**
 * Get model IDs for a provider (for backwards compatibility)
 */
export function getModelIdsForProvider(provider: LLMProvider): string[] {
  return getModelsForProvider(provider).map((m) => m.id)
}

/**
 * Get a specific model by provider and ID (sync - local/ollama only)
 */
export function getModel(
  provider: LLMProvider,
  modelId: string,
): LLMModel | undefined {
  return getModelsForProvider(provider).find((m) => m.id === modelId)
}

/**
 * Get a specific model by provider and ID (async - supports all providers)
 */
export async function getModelAsync(
  provider: LLMProvider,
  modelId: string,
): Promise<LLMModel | undefined> {
  const models = await getModelsForProviderAsync(provider)
  return models.find((m) => m.id === modelId)
}

/**
 * Get model capabilities by provider and ID (sync - local/ollama only)
 */
export function getModelCapabilities(
  provider: LLMProvider,
  modelId: string,
): ModelCapabilities | undefined {
  return getModel(provider, modelId)?.capabilities
}

/**
 * Get model capabilities by provider and ID (async - supports all providers)
 */
export async function getModelCapabilitiesAsync(
  provider: LLMProvider,
  modelId: string,
): Promise<ModelCapabilities | undefined> {
  const model = await getModelAsync(provider, modelId)
  return model?.capabilities
}

/**
 * Find models matching specific capability requirements
 */
export function findModelsWithCapabilities(
  provider: LLMProvider,
  requirements: Partial<ModelCapabilities>,
): LLMModel[] {
  const models = getModelsForProvider(provider)

  return models.filter((model) => {
    const caps = model.capabilities || {}

    for (const [key, value] of Object.entries(requirements)) {
      if (value === true && !caps[key as keyof ModelCapabilities]) {
        return false
      }
      if (value === false && caps[key as keyof ModelCapabilities]) {
        return false
      }
    }

    return true
  })
}

/**
 * Find the best model for a specific use case across all configured providers
 */
export function findBestModel(
  configuredProviders: LLMProvider[],
  requirements: Partial<ModelCapabilities>,
  prefer?: 'fast' | 'cheap' | 'capable',
): { provider: LLMProvider; model: LLMModel } | undefined {
  const candidates: { provider: LLMProvider; model: LLMModel }[] = []

  for (const provider of configuredProviders) {
    const matching = findModelsWithCapabilities(provider, requirements)
    for (const model of matching) {
      candidates.push({ provider, model })
    }
  }

  if (candidates.length === 0) {
    return undefined
  }

  // Sort by preference
  if (prefer === 'fast') {
    candidates.sort((a, b) => {
      const aFast = a.model.capabilities?.fast ? 1 : 0
      const bFast = b.model.capabilities?.fast ? 1 : 0
      return bFast - aFast
    })
  } else if (prefer === 'cheap') {
    candidates.sort((a, b) => {
      const aCheap = a.model.capabilities?.lowCost ? 1 : 0
      const bCheap = b.model.capabilities?.lowCost ? 1 : 0
      return bCheap - aCheap
    })
  } else if (prefer === 'capable') {
    candidates.sort((a, b) => {
      const aScore =
        (a.model.capabilities?.thinking ? 2 : 0) +
        (a.model.capabilities?.vision ? 1 : 0) +
        (a.model.capabilities?.tools ? 1 : 0)
      const bScore =
        (b.model.capabilities?.thinking ? 2 : 0) +
        (b.model.capabilities?.vision ? 1 : 0) +
        (b.model.capabilities?.tools ? 1 : 0)
      return bScore - aScore
    })
  }

  return candidates[0]
}

/**
 * Check if a model has specific capabilities
 */
export function modelHasCapabilities(
  provider: LLMProvider,
  modelId: string,
  requirements: Partial<ModelCapabilities>,
): boolean {
  const caps = getModelCapabilities(provider, modelId) || {}

  for (const [key, value] of Object.entries(requirements)) {
    if (value === true && !caps[key as keyof ModelCapabilities]) {
      return false
    }
    if (value === false && caps[key as keyof ModelCapabilities]) {
      return false
    }
  }

  return true
}

// =============================================================================
// models.dev Integration
// =============================================================================

/**
 * Converts a NormalizedModel from models.dev to an EnhancedLLMModel.
 * Maps capabilities and pricing information to DEVS internal format.
 *
 * @param model - The normalized model from models.dev
 * @returns Enhanced LLM model with pricing and limits
 */
function normalizedToLLMModel(model: NormalizedModel): EnhancedLLMModel {
  const { pricing, capabilities } = model

  // Map capabilities from models.dev to DEVS ModelCapabilities
  const mappedCapabilities: ModelCapabilities = {
    vision: capabilities.vision,
    tools: capabilities.tools,
    thinking: capabilities.reasoning,
    // lowCost: less than $1/M input tokens
    lowCost: pricing.inputPerMillion < 1.0,
    // highCost: more than $10/M input tokens
    highCost: pricing.inputPerMillion > 10.0,
    // fast: cannot be determined from models.dev data
    fast: false,
  }

  return {
    id: model.id.split('/')[1] || model.id, // Extract model ID without provider prefix
    name: model.name,
    capabilities: mappedCapabilities,
    pricing: {
      inputPerMillion: pricing.inputPerMillion,
      outputPerMillion: pricing.outputPerMillion,
      reasoningPerMillion: pricing.reasoningPerMillion,
    },
    limits: {
      contextWindow: model.limits.contextWindow,
      maxOutput: model.limits.maxOutput,
    },
    source: 'models-dev',
  }
}

/**
 * Converts an LLMModel from the registry to an EnhancedLLMModel.
 *
 * @param model - The LLM model from model-registry.json
 * @returns Enhanced LLM model with source marked as 'registry'
 */
function registryToEnhancedModel(model: LLMModel): EnhancedLLMModel {
  return {
    ...model,
    source: 'registry',
  }
}

/**
 * Gets the models.dev provider ID for a DEVS provider.
 *
 * @param provider - The DEVS LLM provider
 * @returns The models.dev provider ID, or null if not applicable
 */
function getModelsDevProviderId(provider: LLMProvider): string | null {
  return DEVS_TO_MODELS_DEV_MAP[provider] ?? null
}

/**
 * Gets enhanced models for a specific provider.
 * For cloud providers (openai, anthropic, google, etc.), fetches from models.dev.
 * For local providers (local, ollama), uses model-registry.json.
 * Falls back to model-registry.json if models.dev fails.
 *
 * @param provider - The LLM provider to get models for
 * @returns Array of enhanced LLM models
 */
export async function getEnhancedModelsForProvider(
  provider: LLMProvider,
): Promise<EnhancedLLMModel[]> {
  // For non-cloud providers, always use registry
  if (!isCloudProvider(provider)) {
    const registryModels = await getModelsForProviderAsync(provider)
    return registryModels.map(registryToEnhancedModel)
  }

  // For cloud providers, try models.dev first
  const modelsDevProviderId = getModelsDevProviderId(provider)
  if (modelsDevProviderId) {
    try {
      const normalizedModels = await getModelsDevByProvider(modelsDevProviderId)
      if (normalizedModels.length > 0) {
        return normalizedModels.map(normalizedToLLMModel)
      }
    } catch (error) {
      console.warn(
        `[models] Failed to fetch models from models.dev for ${provider}, falling back to registry:`,
        error,
      )
    }
  }

  // Fall back to model-registry.json
  const registryModels = await getModelsForProviderAsync(provider)
  return registryModels.map(registryToEnhancedModel)
}

/**
 * Gets pricing information for a specific model.
 * Fetches from models.dev for cloud providers, returns undefined for local models.
 *
 * @param provider - The LLM provider
 * @param modelId - The model identifier
 * @returns Pricing information per million tokens, or undefined if not available
 */
export async function getModelPricing(
  provider: LLMProvider,
  modelId: string,
): Promise<
  | {
      inputPerMillion: number
      outputPerMillion: number
      reasoningPerMillion?: number
    }
  | undefined
> {
  // Only cloud providers have pricing from models.dev
  if (!isCloudProvider(provider)) {
    return undefined
  }

  const modelsDevProviderId = getModelsDevProviderId(provider)
  if (!modelsDevProviderId) {
    return undefined
  }

  try {
    const models = await getModelsDevByProvider(modelsDevProviderId)
    // Find the model by ID (models.dev uses full ID format: provider/model)
    const model = models.find(
      (m) =>
        m.id === `${modelsDevProviderId}/${modelId}` ||
        m.id.endsWith(`/${modelId}`),
    )

    if (model) {
      return {
        inputPerMillion: model.pricing.inputPerMillion,
        outputPerMillion: model.pricing.outputPerMillion,
        reasoningPerMillion: model.pricing.reasoningPerMillion,
      }
    }
  } catch (error) {
    console.warn(
      `[models] Failed to get pricing for ${provider}/${modelId}:`,
      error,
    )
  }

  return undefined
}

/**
 * Gets an enhanced model by provider and ID.
 * Fetches from models.dev for cloud providers, falls back to registry.
 *
 * @param provider - The LLM provider
 * @param modelId - The model identifier
 * @returns The enhanced model, or undefined if not found
 */
export async function getEnhancedModel(
  provider: LLMProvider,
  modelId: string,
): Promise<EnhancedLLMModel | undefined> {
  const models = await getEnhancedModelsForProvider(provider)
  return models.find((m) => m.id === modelId)
}
