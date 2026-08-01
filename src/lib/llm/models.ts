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
 * Reverse mapping from DEVS LLMProvider to models.dev provider ID(s).
 * Some providers map to multiple models.dev providers (e.g., vertex-ai includes
 * both Gemini models from 'google-vertex' and Claude models from 'google-vertex-anthropic').
 */
const DEVS_TO_MODELS_DEV_MAP: Record<LLMProvider, string | string[] | null> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google', // models.dev uses 'google' not 'google-genai'
  'vertex-ai': ['google-vertex', 'google-vertex-anthropic'], // Gemini + Claude on Vertex AI
  mistral: 'mistral',
  openrouter: 'openrouter',
  // Local providers - not in models.dev
  local: null,
  ollama: null,
  huggingface: null,
  'openai-compatible': null,
  'lm-studio': null, // LM Studio — local server, models fetched from /v1/models
  'claude-code': null, // Claude Code API - uses Claude models via local server
  chatjimmy: null, // ChatJimmy - unauthenticated, uses own model names
  'github-copilot': null, // GitHub Copilot - models fetched from GitHub Models catalog API
  custom: null,
  stability: null,
  replicate: null,
  together: null,
  fal: null,
  'devs-enterprise': null, // Enterprise proxy — models from Teams config allowlist
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

/**
 * Providers that use local/pattern-based capability inference.
 * These are providers where models are discovered dynamically at runtime.
 */
const LOCAL_INFERENCE_PROVIDERS: LLMProvider[] = [
  'local',
  'lm-studio',
  'ollama',
  'openai-compatible',
  'huggingface',
]

/**
 * Check if a provider uses local/pattern-based capability inference.
 */
export function usesLocalInference(provider: LLMProvider): boolean {
  return LOCAL_INFERENCE_PROVIDERS.includes(provider)
}

// =============================================================================
// Local Model Capability Inference Patterns
// =============================================================================

/**
 * Pattern-based capability inference for models discovered at runtime.
 * Maps model name patterns to their known capabilities.
 * Used for local, ollama, and openai-compatible providers.
 *
 * Patterns are ordered by specificity - more specific patterns should come first.
 * The base name (before :) is matched against these patterns.
 */
interface LocalModelCapabilityPattern {
  /** Regex pattern to match model base name */
  pattern: RegExp
  /** Capabilities to assign when matched */
  capabilities: ModelCapabilities
}

/**
 * Capability patterns for common model families.
 * Based on known capabilities of popular open-source models.
 * Used for local, ollama, and openai-compatible providers.
 */
const LOCAL_MODEL_CAPABILITY_PATTERNS: LocalModelCapabilityPattern[] = [
  // Vision-language models
  { pattern: /^llava/i, capabilities: { vision: true } },
  { pattern: /^bakllava/i, capabilities: { vision: true } },
  { pattern: /^moondream/i, capabilities: { vision: true } },
  { pattern: /^llama3\.2-vision/i, capabilities: { vision: true } },
  { pattern: /^llama-3\.2-vision/i, capabilities: { vision: true } },
  { pattern: /^minicpm-v/i, capabilities: { vision: true } },
  { pattern: /^yi-vl/i, capabilities: { vision: true } },

  // Gemma 4 — multimodal (vision + audio), thinking-capable
  { pattern: /^gemma4/i, capabilities: { vision: true, thinking: true } },
  { pattern: /^gemma-4/i, capabilities: { vision: true, thinking: true } },

  // Gemma 3 has vision
  { pattern: /^gemma3/i, capabilities: { vision: true, fast: true } },
  { pattern: /^gemma-3/i, capabilities: { vision: true, fast: true } },

  // Qwen VL models
  {
    pattern: /^qwen.*vl/i,
    capabilities: { vision: true, tools: true, thinking: true },
  },
  {
    pattern: /^qwen3-vl/i,
    capabilities: { vision: true, tools: true, thinking: true },
  },

  // Reasoning/thinking models
  { pattern: /^deepseek-r1/i, capabilities: { thinking: true, tools: true } },
  { pattern: /^qwq/i, capabilities: { thinking: true } },
  { pattern: /^marco-o1/i, capabilities: { thinking: true } },
  { pattern: /^skywork-o1/i, capabilities: { thinking: true } },

  // Qwen 3 has thinking mode
  { pattern: /^qwen3/i, capabilities: { thinking: true, tools: true } },
  { pattern: /^qwen-3/i, capabilities: { thinking: true, tools: true } },

  // Tool-capable models
  { pattern: /^llama3\.1/i, capabilities: { tools: true } },
  { pattern: /^llama-3\.1/i, capabilities: { tools: true } },
  { pattern: /^llama3\.2/i, capabilities: { tools: true, fast: true } },
  { pattern: /^llama-3\.2/i, capabilities: { tools: true, fast: true } },
  { pattern: /^llama3\.3/i, capabilities: { tools: true } },
  { pattern: /^llama-3\.3/i, capabilities: { tools: true } },
  { pattern: /^llama4/i, capabilities: { tools: true, vision: true } },
  { pattern: /^llama-4/i, capabilities: { tools: true, vision: true } },
  { pattern: /^mistral-small/i, capabilities: { tools: true, vision: true } },
  { pattern: /^mistral/i, capabilities: { tools: true } },
  { pattern: /^mixtral/i, capabilities: { tools: true } },
  {
    pattern: /^ministral/i,
    capabilities: { tools: true, vision: true, fast: true },
  },
  { pattern: /^devstral/i, capabilities: { tools: true } },
  { pattern: /^command-r/i, capabilities: { tools: true } },
  { pattern: /^granite/i, capabilities: { tools: true, fast: true } },
  { pattern: /^hermes/i, capabilities: { tools: true } },
  { pattern: /^nemotron/i, capabilities: { tools: true, thinking: true } },
  { pattern: /^gpt-oss/i, capabilities: { tools: true, thinking: true } },

  // Coder models
  { pattern: /^qwen.*coder/i, capabilities: { tools: true } },
  { pattern: /^deepseek-coder/i, capabilities: { tools: true } },
  { pattern: /^codellama/i, capabilities: {} },
  { pattern: /^starcoder/i, capabilities: {} },

  // Bonsai models — purpose-built for edge/browser, fast inference
  { pattern: /^bonsai/i, capabilities: { fast: true, lowCost: true } },
  { pattern: /^ternary-bonsai/i, capabilities: { fast: true, lowCost: true } },

  // Liquid Foundation Models — SSM architecture, efficient inference
  { pattern: /^lfm/i, capabilities: { fast: true, lowCost: true } },

  // Small/fast models
  { pattern: /^phi4-mini/i, capabilities: { fast: true, tools: true } },
  { pattern: /^phi-4-mini/i, capabilities: { fast: true, tools: true } },
  { pattern: /^phi4/i, capabilities: {} },
  { pattern: /^phi-4/i, capabilities: {} },
  { pattern: /^phi3/i, capabilities: { fast: true } },
  { pattern: /^phi-3/i, capabilities: { fast: true } },
  { pattern: /^phi\.?3\.?5/i, capabilities: { fast: true } },
  { pattern: /^smollm/i, capabilities: { fast: true, lowCost: true } },
  { pattern: /^tinyllama/i, capabilities: { fast: true, lowCost: true } },
  { pattern: /^qwen2\.5.*1\.5b/i, capabilities: { fast: true } },

  // Image generation models
  { pattern: /^z-image/i, capabilities: { imageGeneration: true } },
  { pattern: /^flux/i, capabilities: { imageGeneration: true } },
  { pattern: /^sdxl/i, capabilities: { imageGeneration: true } },
  { pattern: /^sd[\d.-]/i, capabilities: { imageGeneration: true } },
  { pattern: /^stable-diffusion/i, capabilities: { imageGeneration: true } },
  { pattern: /^dall-e/i, capabilities: { imageGeneration: true } },
  { pattern: /^playground/i, capabilities: { imageGeneration: true } },
  { pattern: /^kandinsky/i, capabilities: { imageGeneration: true } },
  { pattern: /^ideogram/i, capabilities: { imageGeneration: true } },
  { pattern: /^cogview/i, capabilities: { imageGeneration: true } },
  { pattern: /^imagen/i, capabilities: { imageGeneration: true } },
  { pattern: /^dreamshaper/i, capabilities: { imageGeneration: true } },
  { pattern: /^juggernaut/i, capabilities: { imageGeneration: true } },
  { pattern: /^realvis/i, capabilities: { imageGeneration: true } },
  { pattern: /^proteus/i, capabilities: { imageGeneration: true } },
  { pattern: /^pixart/i, capabilities: { imageGeneration: true } },
  { pattern: /^kolors/i, capabilities: { imageGeneration: true } },
  { pattern: /^hunyuan-image/i, capabilities: { imageGeneration: true } },
  { pattern: /^aura-flow/i, capabilities: { imageGeneration: true } },
  { pattern: /^omnigen/i, capabilities: { imageGeneration: true } },

  // Video generation models
  { pattern: /^cogvideo/i, capabilities: { videoGeneration: true } },
  { pattern: /^wan/i, capabilities: { videoGeneration: true } },
  { pattern: /^hunyuan.*video/i, capabilities: { videoGeneration: true } },
  { pattern: /^stable-video/i, capabilities: { videoGeneration: true } },
  { pattern: /^mochi/i, capabilities: { videoGeneration: true } },
  { pattern: /^luma/i, capabilities: { videoGeneration: true } },
  { pattern: /^ltx-video/i, capabilities: { videoGeneration: true } },
  { pattern: /^animatediff/i, capabilities: { videoGeneration: true } },

  // Browser/ONNX-specific patterns (smaller models optimized for browser)
  // These match anywhere in the name, not just at the start
  { pattern: /onnx.*web/i, capabilities: { fast: true, lowCost: true } },
  { pattern: /mlc$/i, capabilities: { fast: true, lowCost: true } },
  { pattern: /onnx$/i, capabilities: { lowCost: true } },
]

/**
 * Infers capabilities for a dynamically discovered local model.
 * First checks the registry for an exact match, then falls back to pattern matching.
 * Works for local, ollama, and openai-compatible providers.
 *
 * For browser models (ONNX, MLC, WebGPU), merges capabilities from multiple patterns:
 * - Model family patterns (e.g., granite, qwen, llama)
 * - Browser runtime patterns (e.g., onnx-web, mlc)
 *
 * @param modelId - The model ID (e.g., "llama3.2:3b", "llava:7b", "onnx-community/Qwen3-0.6B-ONNX")
 * @param provider - The provider type (defaults to 'ollama' for backwards compatibility)
 * @returns Inferred capabilities for the model
 */
export function inferLocalModelCapabilities(
  modelId: string,
  provider: LLMProvider = 'ollama',
): ModelCapabilities {
  // Strip repository path prefix (e.g., "onnx-community/")
  const modelName = modelId.includes('/') ? modelId.split('/').pop()! : modelId
  // Extract base name (before the size tag)
  const baseName = modelName.split(':')[0].toLowerCase()

  // First, check registry for exact match
  const registry = getModelRegistry()
  const providerModels = registry[provider]
  const registryModel = providerModels?.find(
    (m) =>
      m.id.toLowerCase() === modelId.toLowerCase() ||
      m.id.split(':')[0].toLowerCase() === baseName,
  )
  if (registryModel?.capabilities) {
    return registryModel.capabilities
  }

  // For browser/local models, merge capabilities from ALL matching patterns
  // This allows "granite-4.0-350m-ONNX-web" to get both granite capabilities AND onnx-web capabilities
  const mergedCapabilities: ModelCapabilities = {}

  for (const { pattern, capabilities } of LOCAL_MODEL_CAPABILITY_PATTERNS) {
    if (pattern.test(baseName)) {
      Object.assign(mergedCapabilities, capabilities)
    }
  }

  // Return merged capabilities (may be empty if no patterns matched)
  return mergedCapabilities
}

/**
 * Converts a NormalizedModel's capabilities to DEVS ModelCapabilities.
 *
 * @param model - The normalized model from models.dev
 * @returns DEVS-compatible ModelCapabilities
 */
function normalizedModelToCapabilities(
  model: NormalizedModel,
): ModelCapabilities {
  return {
    vision: model.capabilities.vision,
    tools: model.capabilities.tools,
    thinking: model.capabilities.reasoning,
    // lowCost: less than $1/M input tokens
    lowCost: model.pricing.inputPerMillion < 1.0,
    // highCost: more than $10/M input tokens
    highCost: model.pricing.inputPerMillion > 10.0,
    // Cannot determine speed from models.dev data
    fast: false,
  }
}

/**
 * Formats a local model ID string into a pretty display name.
 * Pure formatting function with no external lookups.
 * Works for local, ollama, openai-compatible, and vertex-ai providers.
 *
 * @param modelId - The raw model ID (e.g., "llama3.2:3b", "onnx-community/Qwen3-0.6B-ONNX", "claude-3-7-sonnet")
 * @returns Pretty display name (e.g., "Llama3.2 3B", "Qwen3 0.6B ONNX", "Claude 3.7 Sonnet")
 */
export function formatLocalModelName(modelId: string): string {
  // Strip repository path prefix (e.g., "onnx-community/" or "huggingface/")
  const baseName = modelId.includes('/') ? modelId.split('/').pop()! : modelId

  // Convert version patterns like "3-7" or "3-5-20" to "3.7" or "3.5.20"
  // Only match when surrounded by word boundaries or hyphens to avoid breaking "0.6B"
  // Pattern: digit(s) followed by one or more (-digit(s)) groups, not followed by letters
  const withVersions = baseName.replace(
    /(?<=^|-)(\d+)(-\d+)+(?=-|$)/g,
    (match) => match.replace(/-/g, '.'),
  )

  return withVersions
    .split(/[:\-_]/)
    .map((part) => {
      // Keep size indicators uppercase
      if (/^\d+[bmk]$/i.test(part)) {
        return part.toUpperCase()
      }
      // Keep common suffixes uppercase
      if (/^(onnx|mlc|web|gguf)$/i.test(part)) {
        return part.toUpperCase()
      }
      // Capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

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
  'lm-studio': [],
  'claude-code': [],
  chatjimmy: [],
  'github-copilot': [],
  custom: [],
  stability: [],
  replicate: [],
  together: [],
  fal: [],
  'devs-enterprise': [],
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

  // For cloud providers, try models.dev first (keeps the full `provider/model` id).
  const models = await fetchModelsDevModels(provider)
  if (models.length > 0) {
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      capabilities: normalizedModelToCapabilities(model),
    }))
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
 * Get model capabilities by provider and ID (sync - local/ollama only)
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
  const { pricing } = model
  return {
    id: model.id.split('/')[1] || model.id, // Extract model ID without provider prefix
    name: model.name,
    capabilities: normalizedModelToCapabilities(model),
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
 * Gets the models.dev provider ID(s) for a DEVS provider.
 *
 * @param provider - The DEVS AI provider
 * @returns The models.dev provider ID(s), or null if not applicable
 */
function getModelsDevProviderIds(provider: LLMProvider): string[] | null {
  const mapping = DEVS_TO_MODELS_DEV_MAP[provider]
  if (!mapping) return null
  return Array.isArray(mapping) ? mapping : [mapping]
}

/**
 * Fetch models.dev models for a DEVS provider across all its mapped provider
 * IDs, flattened and de-duplicated by model id. Returns `[]` when the provider
 * maps to nothing or the fetch fails. Single source of the fetch/flatten/dedupe
 * logic shared by {@link getModelsForProviderAsync} and
 * {@link getEnhancedModelsForProvider}.
 */
async function fetchModelsDevModels(
  provider: LLMProvider,
): Promise<NormalizedModel[]> {
  const ids = getModelsDevProviderIds(provider)
  if (!ids) return []
  try {
    const arrays = await Promise.all(ids.map((id) => getModelsDevByProvider(id)))
    const seen = new Set<string>()
    return arrays.flat().filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  } catch (error) {
    console.warn(`[models] models.dev fetch failed for ${provider}:`, error)
    return []
  }
}

/**
 * Gets enhanced models for a specific provider.
 * For cloud providers (openai, anthropic, google, etc.), fetches from models.dev.
 * For local providers (local, ollama), uses model-registry.json.
 * Falls back to model-registry.json if models.dev fails.
 *
 * @param provider - The AI provider to get models for
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

  // For cloud providers, try models.dev first (stripped id + pricing/limits).
  const models = await fetchModelsDevModels(provider)
  if (models.length > 0) {
    return models.map(normalizedToLLMModel)
  }

  // Fall back to model-registry.json
  const registryModels = await getModelsForProviderAsync(provider)
  return registryModels.map(registryToEnhancedModel)
}
