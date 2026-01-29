/**
 * TypeScript types for the models.dev API integration.
 * models.dev is an open-source database of AI model specifications.
 * @see https://models.dev/api.json
 */

/**
 * Provider information from models.dev API.
 * Contains metadata about an AI provider/vendor.
 */
export interface ModelsDevProvider {
  /** Unique provider identifier (e.g., "openai", "anthropic") */
  id: string
  /** Human-readable provider name */
  name: string
  /** AI SDK package name (e.g., "@ai-sdk/openai") */
  npm: string
  /** Environment variable names required for authentication */
  env: string[]
  /** Documentation URL for the provider */
  doc: string
  /** Base API URL (for OpenAI-compatible providers) */
  api?: string
}

/**
 * Model cost structure in USD per million tokens.
 * All costs are expressed per million tokens for consistency.
 */
export interface ModelsDevCost {
  /** Cost per million input tokens (USD) */
  input: number
  /** Cost per million output tokens (USD) */
  output: number
  /** Cost per million reasoning tokens (USD) */
  reasoning?: number
  /** Cost per million cached read tokens (USD) */
  cache_read?: number
  /** Cost per million cached write tokens (USD) */
  cache_write?: number
  /** Cost per million audio input tokens (USD) */
  input_audio?: number
  /** Cost per million audio output tokens (USD) */
  output_audio?: number
}

/**
 * Model token limits.
 * Defines the maximum tokens for context, input, and output.
 */
export interface ModelsDevLimit {
  /** Maximum context window size in tokens */
  context: number
  /** Maximum input tokens (optional, may be derived from context) */
  input?: number
  /** Maximum output tokens */
  output: number
}

/**
 * Model input/output modalities.
 * Defines what types of content the model can process and generate.
 */
export interface ModelsDevModalities {
  /** Supported input modalities */
  input: ('text' | 'image' | 'audio' | 'video' | 'pdf')[]
  /** Supported output modalities */
  output: ('text' | 'image' | 'audio')[]
}

/**
 * Interleaved reasoning support configuration.
 * Specifies the field name where reasoning content is returned.
 */
export interface ModelsDevInterleaved {
  /** Field name for interleaved reasoning content */
  field: 'reasoning_content' | 'reasoning_details'
}

/**
 * Full model definition from models.dev API.
 * Contains all metadata, capabilities, costs, and limits for a model.
 */
export interface ModelsDevModel {
  /** Unique model identifier */
  id: string
  /** Human-readable model name */
  name: string
  /** Model family (e.g., "gpt-4", "claude-3") */
  family?: string
  /** Whether the model supports file attachments */
  attachment: boolean
  /** Whether the model supports reasoning/chain-of-thought */
  reasoning: boolean
  /** Whether the model supports tool/function calling */
  tool_call: boolean
  /** Whether the model supports structured JSON output */
  structured_output?: boolean
  /** Whether the model supports temperature adjustment */
  temperature?: boolean
  /** Knowledge cutoff date (YYYY-MM or YYYY-MM-DD format) */
  knowledge?: string
  /** Model release date (ISO format) */
  release_date: string
  /** Last update date (ISO format) */
  last_updated: string
  /** Whether model weights are publicly available */
  open_weights: boolean
  /** Supported input/output modalities */
  modalities: ModelsDevModalities
  /** Pricing information per million tokens */
  cost: ModelsDevCost
  /** Token limits */
  limit: ModelsDevLimit
  /** Interleaved reasoning support (true, false, or config object) */
  interleaved?: ModelsDevInterleaved | boolean
  /** Model release status */
  status?: 'alpha' | 'beta' | 'deprecated'
}

/**
 * Provider with its associated models.
 * Extends ModelsDevProvider with a models record.
 */
export interface ModelsDevProviderWithModels extends ModelsDevProvider {
  /** Record of models keyed by model ID */
  models: Record<string, ModelsDevModel>
}

/**
 * Full API response from models.dev.
 * A record of providers keyed by provider ID.
 */
export type ModelsDevAPIResponse = Record<string, ModelsDevProviderWithModels>

/**
 * Normalized model for DEVS internal use.
 * Provides a consistent, flattened structure for easier consumption.
 */
export interface NormalizedModel {
  /** Unique model identifier (provider/model format) */
  id: string
  /** Human-readable model name */
  name: string
  /** Provider identifier */
  providerId: string
  /** Human-readable provider name */
  providerName: string
  /** Model family (e.g., "gpt-4", "claude-3") */
  family?: string
  /** Pricing information normalized to per-million tokens */
  pricing: {
    /** Cost per million input tokens (USD) */
    inputPerMillion: number
    /** Cost per million output tokens (USD) */
    outputPerMillion: number
    /** Cost per million reasoning tokens (USD) */
    reasoningPerMillion?: number
    /** Cost per million cached read tokens (USD) */
    cacheReadPerMillion?: number
  }
  /** Token limits */
  limits: {
    /** Maximum context window size in tokens */
    contextWindow: number
    /** Maximum input tokens */
    maxInput?: number
    /** Maximum output tokens */
    maxOutput: number
  }
  /** Model capabilities flags */
  capabilities: {
    /** Supports image/vision input */
    vision: boolean
    /** Supports tool/function calling */
    tools: boolean
    /** Supports reasoning/chain-of-thought */
    reasoning: boolean
    /** Supports structured JSON output */
    structuredOutput: boolean
    /** Supports file attachments */
    attachments: boolean
    /** Supports audio input/output */
    audio: boolean
  }
  /** Supported modalities */
  modalities: {
    /** Supported input modalities */
    input: string[]
    /** Supported output modalities */
    output: string[]
  }
  /** Additional metadata */
  metadata: {
    /** Knowledge cutoff date */
    knowledgeCutoff?: string
    /** Model release date */
    releaseDate: string
    /** Last update date */
    lastUpdated: string
    /** Whether model weights are publicly available */
    openWeights: boolean
    /** Model release status */
    status?: 'alpha' | 'beta' | 'deprecated'
  }
}

/**
 * Type guard to check if an object is a valid ModelsDevModel.
 * Validates the presence and types of required fields.
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid ModelsDevModel
 */
export function isModelsDevModel(obj: unknown): obj is ModelsDevModel {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const model = obj as Record<string, unknown>

  // Check required string fields
  const requiredStrings = ['id', 'name', 'release_date', 'last_updated']
  for (const field of requiredStrings) {
    if (typeof model[field] !== 'string') {
      return false
    }
  }

  // Check required boolean fields
  const requiredBooleans = [
    'attachment',
    'reasoning',
    'tool_call',
    'open_weights',
  ]
  for (const field of requiredBooleans) {
    if (typeof model[field] !== 'boolean') {
      return false
    }
  }

  // Check modalities object
  if (typeof model.modalities !== 'object' || model.modalities === null) {
    return false
  }
  const modalities = model.modalities as Record<string, unknown>
  if (!Array.isArray(modalities.input) || !Array.isArray(modalities.output)) {
    return false
  }

  // Check cost object
  if (typeof model.cost !== 'object' || model.cost === null) {
    return false
  }
  const cost = model.cost as Record<string, unknown>
  if (typeof cost.input !== 'number' || typeof cost.output !== 'number') {
    return false
  }

  // Check limit object
  if (typeof model.limit !== 'object' || model.limit === null) {
    return false
  }
  const limit = model.limit as Record<string, unknown>
  if (typeof limit.context !== 'number' || typeof limit.output !== 'number') {
    return false
  }

  return true
}
