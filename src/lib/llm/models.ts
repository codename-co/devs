/**
 * LLM Model Registry
 *
 * Central registry of LLM models with their capability flags.
 * Used to select appropriate models for different tasks:
 * - "fastest available low-cost model" for simple tasks
 * - "thinking vision-ready model" for complex analysis
 *
 * Model data is loaded from /schemas/model-registry.json
 *
 * @module lib/llm/models
 */

import type { LLMModel, LLMProvider, ModelCapabilities } from '@/types'

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
 * Get models for a specific provider (async version)
 */
export async function getModelsForProviderAsync(
  provider: LLMProvider,
): Promise<LLMModel[]> {
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
 * Get a specific model by provider and ID
 */
export function getModel(
  provider: LLMProvider,
  modelId: string,
): LLMModel | undefined {
  return getModelsForProvider(provider).find((m) => m.id === modelId)
}

/**
 * Get model capabilities by provider and ID
 */
export function getModelCapabilities(
  provider: LLMProvider,
  modelId: string,
): ModelCapabilities | undefined {
  return getModel(provider, modelId)?.capabilities
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
