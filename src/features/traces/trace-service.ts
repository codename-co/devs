import {
  traces as tracesMap,
  spans as spansMap,
  tracingConfig as tracingConfigMap,
} from '@/lib/yjs/maps'
import { LLMConfig, LLMProvider } from '@/types'
import {
  estimateUsdCost,
  normalizeTokenUsage,
  pricingFromUsdPerMillion,
  type Pricing,
} from 'tokentally'
import {
  Trace,
  Span,
  TraceStatus,
  SpanType,
  TokenUsage,
  CostEstimate,
  ModelInfo,
  SpanIO,
  TracingConfig,
  TraceMetrics,
  DailyMetrics,
  TraceFilter,
} from './types'

// ============================================================================
// LLM Pricing using tokentally
// ============================================================================

/**
 * Pricing data from LiteLLM catalog.
 * This is loaded once and cached in memory.
 * Falls back to default pricing if catalog is unavailable.
 */
let pricingCatalog: Map<string, Pricing> | null = null
let catalogLoadAttempted = false

// Models.dev pricing cache
let modelsDevPricing: Map<string, Pricing> | null = null
let modelsDevLoadAttempted = false

// Fallback pricing rates per 1M tokens (USD) when catalog is unavailable
// These are conservative estimates as of January 2026
const FALLBACK_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  o1: { input: 15, output: 60 },
  'o1-mini': { input: 1.1, output: 4.4 },
  'o3-mini': { input: 1.1, output: 4.4 },
  // Anthropic
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-3.5-haiku': { input: 0.8, output: 4 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-opus-4': { input: 15, output: 75 },
  // Google
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  // Mistral
  'mistral-large': { input: 2, output: 6 },
  'mistral-small': { input: 0.2, output: 0.6 },
  // Default
  default: { input: 1, output: 3 },
}

/**
 * Cloud providers that have pricing data in models.dev
 */
const CLOUD_PROVIDERS: LLMProvider[] = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'openrouter',
]

/**
 * Parse provider and model ID from a model string.
 * Handles formats like "openai/gpt-4o" or just "gpt-4o".
 *
 * @param model - Model string, optionally with provider prefix
 * @returns Object with parsed provider and modelId
 */
function parseProviderFromModel(model: string): {
  provider: LLMProvider | null
  modelId: string
} {
  // Check for provider prefix (e.g., "openai/gpt-4o")
  const prefixMatch = model.match(
    /^(openai|anthropic|google|mistral|deepseek|xai|openrouter)\/(.+)$/i,
  )
  if (prefixMatch) {
    return {
      provider: prefixMatch[1].toLowerCase() as LLMProvider,
      modelId: prefixMatch[2],
    }
  }

  // Try to infer provider from model name patterns
  const lowerModel = model.toLowerCase()

  if (
    lowerModel.includes('gpt') ||
    lowerModel.startsWith('o1') ||
    lowerModel.startsWith('o3')
  ) {
    return { provider: 'openai', modelId: model }
  }
  if (lowerModel.includes('claude')) {
    return { provider: 'anthropic', modelId: model }
  }
  if (lowerModel.includes('gemini')) {
    return { provider: 'google', modelId: model }
  }
  if (
    lowerModel.includes('mistral') ||
    lowerModel.includes('codestral') ||
    lowerModel.includes('pixtral')
  ) {
    return { provider: 'mistral', modelId: model }
  }

  // No provider detected
  return { provider: null, modelId: model }
}

/**
 * Load models.dev pricing data for common cloud providers.
 * This fetches pricing from models.dev and caches it.
 */
async function loadModelsDevPricing(): Promise<void> {
  if (modelsDevLoadAttempted) return
  modelsDevLoadAttempted = true

  try {
    modelsDevPricing = new Map()
    let totalModels = 0

    // Load pricing for all cloud providers in parallel
    const loadPromises = CLOUD_PROVIDERS.map(async (provider) => {
      try {
        // Import dynamically to get models for each provider
        const { getEnhancedModelsForProvider } = await import(
          '@/lib/llm/models'
        )
        const models = await getEnhancedModelsForProvider(provider)

        for (const model of models) {
          if (model.pricing) {
            // Create cache key with provider prefix
            const cacheKey = `${provider}/${model.id}`
            modelsDevPricing!.set(
              cacheKey,
              pricingFromUsdPerMillion({
                inputUsdPerMillion: model.pricing.inputPerMillion,
                outputUsdPerMillion: model.pricing.outputPerMillion,
              }),
            )

            // Also cache by model ID alone for unprefixed lookups
            if (!modelsDevPricing!.has(model.id)) {
              modelsDevPricing!.set(
                model.id,
                pricingFromUsdPerMillion({
                  inputUsdPerMillion: model.pricing.inputPerMillion,
                  outputUsdPerMillion: model.pricing.outputPerMillion,
                }),
              )
            }

            totalModels++
          }
        }
      } catch (error) {
        console.warn(
          `[TraceService] Failed to load models.dev pricing for ${provider}:`,
          error,
        )
      }
    })

    await Promise.all(loadPromises)

    console.log(
      `[TraceService] Loaded models.dev pricing for ${totalModels} models`,
    )
  } catch (error) {
    console.warn('[TraceService] Failed to load models.dev pricing:', error)
  }
}

/**
 * Load LiteLLM pricing catalog.
 * This fetches the latest pricing data from LiteLLM's GitHub repo.
 */
async function loadPricingCatalog(): Promise<void> {
  if (catalogLoadAttempted) return
  catalogLoadAttempted = true

  try {
    // LiteLLM publishes model pricing data that tokentally can consume
    const response = await fetch(
      'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
    )
    if (!response.ok) {
      console.warn(
        '[TraceService] Failed to load LiteLLM catalog:',
        response.status,
      )
      return
    }

    const catalog = await response.json()
    pricingCatalog = new Map()

    // Convert LiteLLM format to tokentally Pricing format
    for (const [modelId, data] of Object.entries(catalog)) {
      if (typeof data !== 'object' || data === null) continue
      const modelData = data as Record<string, unknown>

      const inputCost = modelData.input_cost_per_token
      const outputCost = modelData.output_cost_per_token

      if (typeof inputCost === 'number' && typeof outputCost === 'number') {
        // LiteLLM uses cost per token, tokentally uses USD per million
        pricingCatalog.set(
          modelId,
          pricingFromUsdPerMillion({
            inputUsdPerMillion: inputCost * 1_000_000,
            outputUsdPerMillion: outputCost * 1_000_000,
          }),
        )
      }
    }

    console.log(
      `[TraceService] Loaded LiteLLM pricing for ${pricingCatalog.size} models`,
    )
  } catch (error) {
    console.warn('[TraceService] Failed to load pricing catalog:', error)
  }

  // Also load models.dev pricing (non-blocking)
  loadModelsDevPricing().catch((err) => {
    console.warn('[TraceService] Failed to load models.dev pricing:', err)
  })
}

/**
 * Get pricing for a model, with fallback to default pricing.
 * Priority: models.dev (cached) > LiteLLM catalog > fallback hardcoded rates
 */
function getPricingForModel(model: string): Pricing {
  const { provider, modelId } = parseProviderFromModel(model)

  // 1. Try models.dev cache first (primary source)
  if (modelsDevPricing) {
    // Try with provider prefix
    if (provider && modelsDevPricing.has(`${provider}/${modelId}`)) {
      return modelsDevPricing.get(`${provider}/${modelId}`)!
    }

    // Try exact model match (unprefixed)
    if (modelsDevPricing.has(modelId)) {
      return modelsDevPricing.get(modelId)!
    }

    // Try original model string
    if (modelsDevPricing.has(model)) {
      return modelsDevPricing.get(model)!
    }

    // Try partial match on model ID
    for (const key of modelsDevPricing.keys()) {
      const keyModelId = key.includes('/') ? key.split('/')[1] : key
      if (
        keyModelId === modelId ||
        keyModelId.includes(modelId) ||
        modelId.includes(keyModelId)
      ) {
        return modelsDevPricing.get(key)!
      }
    }
  }

  // 2. Fall back to LiteLLM catalog
  // Try exact match from LiteLLM catalog
  if (pricingCatalog?.has(model)) {
    return pricingCatalog.get(model)!
  }

  // Try normalized model name (without provider prefix)
  if (pricingCatalog?.has(modelId)) {
    return pricingCatalog.get(modelId)!
  }

  // Find best matching key from LiteLLM catalog using partial match
  if (pricingCatalog) {
    let bestMatch: string | null = null
    let bestMatchLength = 0
    const lowerModel = model.toLowerCase()

    for (const key of pricingCatalog.keys()) {
      const lowerKey = key.toLowerCase()
      if (lowerModel.includes(lowerKey) && lowerKey.length > bestMatchLength) {
        bestMatch = key
        bestMatchLength = lowerKey.length
      }
    }

    if (bestMatch) {
      return pricingCatalog.get(bestMatch)!
    }
  }

  // 3. Fall back to hardcoded pricing
  const fallbackKey = findFallbackPricingKey(model)
  const fallbackRate = FALLBACK_PRICING[fallbackKey]

  return pricingFromUsdPerMillion({
    inputUsdPerMillion: fallbackRate.input,
    outputUsdPerMillion: fallbackRate.output,
  })
}

/**
 * Find the best matching fallback pricing key for a model.
 */
function findFallbackPricingKey(model: string): string {
  const normalizedModel = model.toLowerCase()
  let bestMatch = 'default'
  let bestMatchLength = 0

  for (const key of Object.keys(FALLBACK_PRICING)) {
    if (key === 'default') continue
    const normalizedKey = key.toLowerCase()
    if (
      normalizedModel.includes(normalizedKey) &&
      normalizedKey.length > bestMatchLength
    ) {
      bestMatch = key
      bestMatchLength = normalizedKey.length
    }
  }

  return bestMatch
}

/**
 * Estimate token count from text.
 * Uses a simple heuristic: ~4 characters per token for English text.
 * This is a rough approximation - actual tokenization varies by model.
 *
 * For accurate counts, prefer using the token counts returned by provider APIs.
 * This function is only used as a fallback for streaming responses where
 * providers don't return usage data.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0
  // Average ~4 characters per token for English text
  // This is a common heuristic that works reasonably well across models
  return Math.ceil(text.length / 4)
}

/**
 * Estimate token usage for a conversation (input) and response (output).
 * Only use when provider doesn't return actual token counts.
 */
export function estimateTokenUsage(
  messages: Array<{ role: string; content: string }>,
  response: string,
): TokenUsage {
  const inputText = messages.map((m) => m.content).join(' ')
  const promptTokens = estimateTokenCount(inputText)
  const completionTokens = estimateTokenCount(response)

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  }
}

/**
 * Generate a unique ID for traces and spans
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate cost based on token usage and model using tokentally
 */
function calculateCost(usage: TokenUsage, model: string): CostEstimate {
  const pricing = getPricingForModel(model)
  const normalizedUsage = normalizeTokenUsage({
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
  })

  if (!normalizedUsage) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
    }
  }

  const cost = estimateUsdCost({ usage: normalizedUsage, pricing })

  if (!cost) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
    }
  }

  return {
    inputCost: cost.inputUsd,
    outputCost: cost.outputUsd,
    totalCost: cost.totalUsd,
    currency: 'USD',
  }
}

/**
 * Active traces and spans being tracked
 */
const activeTraces = new Map<string, Trace>()
const activeSpans = new Map<string, Span>()

/**
 * Tracing Service - Intercepts and tracks all LLM calls
 */
export class TraceService {
  private static config: TracingConfig | null = null
  private static initialized = false

  /**
   * Initialize the tracing service
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const configs = Array.from(tracingConfigMap.values())
      this.config = configs[0] || this.getDefaultConfig()
      this.initialized = true

      // Load pricing catalogs in background (non-blocking)
      // models.dev is loaded via loadPricingCatalog -> loadModelsDevPricing
      loadPricingCatalog().catch((err) => {
        console.warn('[TraceService] Failed to load pricing catalog:', err)
      })

      // Also explicitly load models.dev pricing (primary source)
      loadModelsDevPricing().catch((err) => {
        console.warn('[TraceService] Failed to load models.dev pricing:', err)
      })

      console.log('[TraceService] Initialized', {
        enabled: this.config.enabled,
      })
    } catch (error) {
      console.error('[TraceService] Failed to initialize:', error)
      this.config = this.getDefaultConfig()
      this.initialized = true
    }
  }

  /**
   * Get default configuration
   */
  private static getDefaultConfig(): TracingConfig {
    return {
      id: 'default',
      enabled: true,
      captureInput: true,
      captureOutput: true,
      captureMetadata: true,
      samplingRate: 1, // 100% by default
      retentionDays: 30,
      maxTraces: 10000,
      excludePatterns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Check if tracing is enabled
   */
  static isEnabled(): boolean {
    return this.config?.enabled ?? true
  }

  /**
   * Update tracing configuration
   */
  static async updateConfig(
    config: Partial<TracingConfig>,
  ): Promise<TracingConfig> {
    const updated = {
      ...this.getDefaultConfig(),
      ...this.config,
      ...config,
      updatedAt: new Date(),
    }
    tracingConfigMap.set(updated.id, updated)
    this.config = updated
    return updated
  }

  /**
   * Get current configuration
   */
  static getConfig(): TracingConfig {
    return this.config || this.getDefaultConfig()
  }

  // ============================================================================
  // Trace Management
  // ============================================================================

  /**
   * Start a new trace
   */
  static startTrace(options: {
    name: string
    agentId?: string
    conversationId?: string
    taskId?: string
    sessionId?: string
    primaryModel?: ModelInfo
    metadata?: Record<string, unknown>
    tags?: string[]
    input?: string
  }): Trace {
    const trace: Trace = {
      id: generateId(),
      name: options.name,
      status: 'running',
      startTime: new Date(),
      spanCount: 0,
      agentId: options.agentId,
      conversationId: options.conversationId,
      taskId: options.taskId,
      sessionId: options.sessionId,
      primaryModel: options.primaryModel,
      metadata: options.metadata,
      tags: options.tags,
      input: options.input,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    activeTraces.set(trace.id, trace)
    return trace
  }

  /**
   * End a trace
   */
  static async endTrace(
    traceId: string,
    options?: {
      status?: TraceStatus
      statusMessage?: string
      output?: string
    },
  ): Promise<Trace | null> {
    const trace = activeTraces.get(traceId)
    if (!trace) return null

    const endTime = new Date()
    trace.endTime = endTime
    trace.duration = endTime.getTime() - trace.startTime.getTime()
    trace.status = options?.status || 'completed'
    trace.statusMessage = options?.statusMessage
    trace.output = options?.output
    trace.updatedAt = new Date()

    // Aggregate span data
    const spans = await this.getSpansForTrace(traceId)
    trace.spanCount = spans.length

    // Calculate totals from all spans that have usage data (tokens)
    // This includes LLM spans, tool spans, and any other span type with token usage
    const spansWithUsage = spans.filter((s) => s.usage)
    if (spansWithUsage.length > 0) {
      trace.totalPromptTokens = spansWithUsage.reduce(
        (sum, s) => sum + (s.usage?.promptTokens || 0),
        0,
      )
      trace.totalCompletionTokens = spansWithUsage.reduce(
        (sum, s) => sum + (s.usage?.completionTokens || 0),
        0,
      )
      trace.totalTokens = trace.totalPromptTokens + trace.totalCompletionTokens

      const totalInputCost = spansWithUsage.reduce(
        (sum, s) => sum + (s.cost?.inputCost || 0),
        0,
      )
      const totalOutputCost = spansWithUsage.reduce(
        (sum, s) => sum + (s.cost?.outputCost || 0),
        0,
      )
      trace.totalCost = {
        inputCost: totalInputCost,
        outputCost: totalOutputCost,
        totalCost: totalInputCost + totalOutputCost,
        currency: 'USD',
      }
    }

    // Set primary model from first LLM span (if any)
    const llmSpans = spans.filter((s) => s.type === 'llm' && s.model)
    if (llmSpans[0]?.model) {
      trace.primaryModel = llmSpans[0].model
    }

    // Handle image generation spans (no tokens, but has model info and potential cost)
    const imageSpans = spans.filter((s) => s.type === 'image')
    if (imageSpans.length > 0 && !trace.primaryModel) {
      // Set primary model from first image span if not already set
      if (imageSpans[0]?.model) {
        trace.primaryModel = imageSpans[0].model
      }

      // Aggregate image generation costs if any
      const imageCosts = imageSpans.filter((s) => s.cost)
      if (imageCosts.length > 0) {
        const totalInputCost = imageCosts.reduce(
          (sum, s) => sum + (s.cost?.inputCost || 0),
          0,
        )
        const totalOutputCost = imageCosts.reduce(
          (sum, s) => sum + (s.cost?.outputCost || 0),
          0,
        )
        trace.totalCost = {
          inputCost: (trace.totalCost?.inputCost || 0) + totalInputCost,
          outputCost: (trace.totalCost?.outputCost || 0) + totalOutputCost,
          totalCost:
            (trace.totalCost?.totalCost || 0) +
            totalInputCost +
            totalOutputCost,
          currency: 'USD',
        }
      }
    }

    // Handle video generation spans (no tokens, but has model info and potential cost)
    const videoSpans = spans.filter((s) => s.type === 'video')
    if (videoSpans.length > 0 && !trace.primaryModel) {
      // Set primary model from first video span if not already set
      if (videoSpans[0]?.model) {
        trace.primaryModel = videoSpans[0].model
      }

      // Aggregate video generation costs if any
      const videoCosts = videoSpans.filter((s) => s.cost)
      if (videoCosts.length > 0) {
        const totalInputCost = videoCosts.reduce(
          (sum, s) => sum + (s.cost?.inputCost || 0),
          0,
        )
        const totalOutputCost = videoCosts.reduce(
          (sum, s) => sum + (s.cost?.outputCost || 0),
          0,
        )
        trace.totalCost = {
          inputCost: (trace.totalCost?.inputCost || 0) + totalInputCost,
          outputCost: (trace.totalCost?.outputCost || 0) + totalOutputCost,
          totalCost:
            (trace.totalCost?.totalCost || 0) +
            totalInputCost +
            totalOutputCost,
          currency: 'USD',
        }
      }
    }

    // Save to Yjs map if enabled
    if (this.isEnabled()) {
      try {
        tracesMap.set(trace.id, trace)
      } catch (error) {
        console.error('[TraceService] Failed to save trace:', error)
      }
    }

    activeTraces.delete(traceId)
    return trace
  }

  /**
   * Get active trace
   */
  static getActiveTrace(traceId: string): Trace | undefined {
    return activeTraces.get(traceId)
  }

  // ============================================================================
  // Span Management
  // ============================================================================

  /**
   * Start a new span within a trace
   */
  static startSpan(options: {
    traceId: string
    name: string
    type: SpanType
    parentSpanId?: string
    model?: ModelInfo
    io?: SpanIO
    agentId?: string
    conversationId?: string
    taskId?: string
    metadata?: Record<string, unknown>
    tags?: string[]
  }): Span {
    const span: Span = {
      id: generateId(),
      traceId: options.traceId,
      parentSpanId: options.parentSpanId,
      name: options.name,
      type: options.type,
      status: 'running',
      startTime: new Date(),
      model: options.model,
      io: this.config?.captureInput ? options.io : undefined,
      agentId: options.agentId,
      conversationId: options.conversationId,
      taskId: options.taskId,
      metadata: this.config?.captureMetadata ? options.metadata : undefined,
      tags: options.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    activeSpans.set(span.id, span)
    return span
  }

  /**
   * End a span
   */
  static async endSpan(
    spanId: string,
    options?: {
      status?: TraceStatus
      statusMessage?: string
      usage?: TokenUsage
      cost?: CostEstimate
      output?: SpanIO['output']
    },
  ): Promise<Span | null> {
    const span = activeSpans.get(spanId)
    if (!span) return null

    const endTime = new Date()
    span.endTime = endTime
    span.duration = endTime.getTime() - span.startTime.getTime()
    span.status = options?.status || 'completed'
    span.statusMessage = options?.statusMessage
    span.updatedAt = new Date()

    // Add usage and calculate cost for LLM spans
    if (options?.usage) {
      span.usage = options.usage
      if (span.model?.model) {
        span.cost = calculateCost(options.usage, span.model.model)
      }
    }

    // Allow direct cost assignment (for image generation, etc.)
    if (options?.cost && !span.cost) {
      span.cost = options.cost
    }

    // Add output if capturing
    if (this.config?.captureOutput && options?.output) {
      span.io = {
        ...span.io,
        output: options.output,
      }
    }

    // Save to Yjs map if enabled
    if (this.isEnabled()) {
      try {
        spansMap.set(span.id, span)
      } catch (error) {
        console.error('[TraceService] Failed to save span:', error)
      }
    }

    activeSpans.delete(spanId)
    return span
  }

  /**
   * Get active span
   */
  static getActiveSpan(spanId: string): Span | undefined {
    return activeSpans.get(spanId)
  }

  // ============================================================================
  // LLM Call Tracking Helpers
  // ============================================================================

  /**
   * Track an LLM call (convenience method)
   * Creates both trace and span for a single LLM request
   */
  static async trackLLMCall<T>(
    config: LLMConfig,
    messages: Array<{ role: string; content: string }>,
    context: {
      agentId?: string
      conversationId?: string
      taskId?: string
      sessionId?: string
    },
    execute: () => Promise<{ result: T; usage?: TokenUsage }>,
  ): Promise<{ result: T; traceId: string; spanId: string }> {
    if (!this.isEnabled()) {
      const { result } = await execute()
      return { result, traceId: '', spanId: '' }
    }

    // Start trace
    const trace = this.startTrace({
      name: `${config.provider}/${config.model}`,
      ...context,
      input: messages[messages.length - 1]?.content,
    })

    // Start span
    const span = this.startSpan({
      traceId: trace.id,
      name: `LLM Call: ${config.model}`,
      type: 'llm',
      model: {
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
      io: {
        input: { messages },
      },
      ...context,
    })

    try {
      const { result, usage } = await execute()

      // End span with success
      await this.endSpan(span.id, {
        status: 'completed',
        usage,
        output: {
          content:
            typeof result === 'string'
              ? result
              : (result as { content?: string })?.content,
        },
      })

      // End trace with success
      await this.endTrace(trace.id, {
        status: 'completed',
        output:
          typeof result === 'string'
            ? result
            : (result as { content?: string })?.content,
      })

      return { result, traceId: trace.id, spanId: span.id }
    } catch (error) {
      // End span with error
      await this.endSpan(span.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })

      // End trace with error
      await this.endTrace(trace.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }

  /**
   * Track a streaming LLM call
   */
  static trackStreamingLLMCall(
    config: LLMConfig,
    messages: Array<{ role: string; content: string }>,
    context: {
      agentId?: string
      conversationId?: string
      taskId?: string
      sessionId?: string
    },
  ): {
    traceId: string
    spanId: string
    onChunk: (chunk: string) => void
    onComplete: (fullResponse: string, usage?: TokenUsage) => Promise<void>
    onError: (error: Error) => Promise<void>
  } {
    if (!this.isEnabled()) {
      return {
        traceId: '',
        spanId: '',
        onChunk: () => {},
        onComplete: async () => {},
        onError: async () => {},
      }
    }

    // Start trace
    const trace = this.startTrace({
      name: `${config.provider}/${config.model} (stream)`,
      ...context,
      input: messages[messages.length - 1]?.content,
    })

    // Start span
    const span = this.startSpan({
      traceId: trace.id,
      name: `LLM Stream: ${config.model}`,
      type: 'llm',
      model: {
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
      io: {
        input: { messages },
      },
      ...context,
    })

    let chunks: string[] = []

    return {
      traceId: trace.id,
      spanId: span.id,
      onChunk: (chunk: string) => {
        chunks.push(chunk)
      },
      onComplete: async (fullResponse: string, usage?: TokenUsage) => {
        // Estimate tokens if not provided
        const finalUsage = usage || estimateTokenUsage(messages, fullResponse)
        await this.endSpan(span.id, {
          status: 'completed',
          usage: finalUsage,
          output: { content: fullResponse },
        })
        await this.endTrace(trace.id, {
          status: 'completed',
          output: fullResponse,
        })
      },
      onError: async (error: Error) => {
        await this.endSpan(span.id, {
          status: 'error',
          statusMessage: error.message,
        })
        await this.endTrace(trace.id, {
          status: 'error',
          statusMessage: error.message,
        })
      },
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get all traces with optional filtering
   */
  static async getTraces(filter?: TraceFilter): Promise<Trace[]> {
    let traces = Array.from(tracesMap.values())

    // Apply filters
    if (filter) {
      traces = traces.filter((trace) => {
        if (filter.status && trace.status !== filter.status) return false
        if (filter.agentId && trace.agentId !== filter.agentId) return false
        if (
          filter.conversationId &&
          trace.conversationId !== filter.conversationId
        )
          return false
        if (filter.taskId && trace.taskId !== filter.taskId) return false
        if (filter.sessionId && trace.sessionId !== filter.sessionId)
          return false
        if (filter.provider && trace.primaryModel?.provider !== filter.provider)
          return false
        if (filter.model && trace.primaryModel?.model !== filter.model)
          return false
        if (filter.startDate && new Date(trace.startTime) < filter.startDate)
          return false
        if (filter.endDate && new Date(trace.startTime) > filter.endDate)
          return false
        if (filter.hasError !== undefined) {
          const hasError = trace.status === 'error'
          if (filter.hasError !== hasError) return false
        }
        if (
          filter.searchQuery &&
          !trace.name.toLowerCase().includes(filter.searchQuery.toLowerCase())
        )
          return false
        return true
      })
    }

    // Sort by start time descending (most recent first)
    traces.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    )

    return traces
  }

  /**
   * Get a single trace by ID
   */
  static async getTrace(traceId: string): Promise<Trace | undefined> {
    return tracesMap.get(traceId)
  }

  /**
   * Get spans for a trace
   */
  static async getSpansForTrace(traceId: string): Promise<Span[]> {
    const spans = Array.from(spansMap.values()).filter(
      (span) => span.traceId === traceId,
    )
    // Sort by start time
    spans.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
    return spans
  }

  /**
   * Get a single span by ID
   */
  static async getSpan(spanId: string): Promise<Span | undefined> {
    return spansMap.get(spanId)
  }

  /**
   * Delete a trace and its spans
   */
  static async deleteTrace(traceId: string): Promise<void> {
    // Delete spans first
    const spans = await this.getSpansForTrace(traceId)
    for (const span of spans) {
      spansMap.delete(span.id)
    }
    // Delete trace
    tracesMap.delete(traceId)
  }

  /**
   * Clear all traces and spans
   */
  static async clearAllTraces(): Promise<void> {
    // Clear all traces
    for (const id of tracesMap.keys()) {
      tracesMap.delete(id)
    }
    // Clear all spans
    for (const id of spansMap.keys()) {
      spansMap.delete(id)
    }
  }

  // ============================================================================
  // Metrics & Analytics
  // ============================================================================

  /**
   * Get aggregated metrics for a time period
   */
  static async getMetrics(
    period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'day',
  ): Promise<TraceMetrics> {
    const traces = Array.from(tracesMap.values())

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(0)
    }

    // Filter traces by period
    const periodTraces = traces.filter(
      (t) => new Date(t.startTime) >= startDate,
    )

    // Calculate metrics
    const successfulTraces = periodTraces.filter(
      (t) => t.status === 'completed',
    ).length
    const errorTraces = periodTraces.filter((t) => t.status === 'error').length
    const totalTraces = periodTraces.length

    // Token stats
    const totalTokens = periodTraces.reduce(
      (sum, t) => sum + (t.totalTokens || 0),
      0,
    )
    const totalPromptTokens = periodTraces.reduce(
      (sum, t) => sum + (t.totalPromptTokens || 0),
      0,
    )
    const totalCompletionTokens = periodTraces.reduce(
      (sum, t) => sum + (t.totalCompletionTokens || 0),
      0,
    )

    // Cost stats
    const totalCost = periodTraces.reduce(
      (sum, t) => sum + (t.totalCost?.totalCost || 0),
      0,
    )

    // Duration stats
    const durations = periodTraces
      .filter((t) => t.duration)
      .map((t) => t.duration!)
      .sort((a, b) => a - b)
    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0
    const p50Duration = durations[Math.floor(durations.length * 0.5)] || 0
    const p95Duration = durations[Math.floor(durations.length * 0.95)] || 0
    const p99Duration = durations[Math.floor(durations.length * 0.99)] || 0

    // Model distribution
    const modelUsage: Record<string, number> = {}
    const providerUsage: Record<string, number> = {}
    const agentUsage: Record<string, number> = {}

    for (const trace of periodTraces) {
      if (trace.primaryModel?.model) {
        modelUsage[trace.primaryModel.model] =
          (modelUsage[trace.primaryModel.model] || 0) + 1
      }
      if (trace.primaryModel?.provider) {
        providerUsage[trace.primaryModel.provider] =
          (providerUsage[trace.primaryModel.provider] || 0) + 1
      }
      if (trace.agentId) {
        agentUsage[trace.agentId] = (agentUsage[trace.agentId] || 0) + 1
      }
    }

    return {
      period,
      startDate,
      endDate: now,
      totalTraces,
      successfulTraces,
      errorTraces,
      errorRate: totalTraces > 0 ? (errorTraces / totalTraces) * 100 : 0,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      averageTokensPerTrace: totalTraces > 0 ? totalTokens / totalTraces : 0,
      totalCost,
      averageCostPerTrace: totalTraces > 0 ? totalCost / totalTraces : 0,
      averageDuration,
      p50Duration,
      p95Duration,
      p99Duration,
      modelUsage,
      providerUsage,
      agentUsage,
    }
  }

  /**
   * Get daily metrics for time-series charts
   */
  static async getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
    const traces = Array.from(tracesMap.values())

    // Group by day
    const dailyMap = new Map<string, DailyMetrics>()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Helper to get local date string (YYYY-MM-DD) avoiding timezone issues
    const getLocalDateStr = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Initialize all days
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = getLocalDateStr(date)
      dailyMap.set(dateStr, {
        date: dateStr,
        traces: 0,
        tokens: 0,
        cost: 0,
        errors: 0,
        avgDuration: 0,
      })
    }

    // Aggregate traces using local date to match initialized days
    const durationsByDay = new Map<string, number[]>()
    for (const trace of traces) {
      const traceDate = new Date(trace.startTime)
      const dateStr = getLocalDateStr(traceDate)
      const daily = dailyMap.get(dateStr)
      if (daily) {
        daily.traces++
        daily.tokens += trace.totalTokens || 0
        daily.cost += trace.totalCost?.totalCost || 0
        if (trace.status === 'error') daily.errors++
        if (trace.duration) {
          const durations = durationsByDay.get(dateStr) || []
          durations.push(trace.duration)
          durationsByDay.set(dateStr, durations)
        }
      }
    }

    // Calculate average durations
    for (const [dateStr, durations] of durationsByDay) {
      const daily = dailyMap.get(dateStr)
      if (daily && durations.length > 0) {
        daily.avgDuration =
          durations.reduce((sum, d) => sum + d, 0) / durations.length
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    )
  }

  // ============================================================================
  // Cleanup & Maintenance
  // ============================================================================

  /**
   * Clean up old traces based on retention policy
   */
  static async cleanupOldTraces(): Promise<number> {
    if (!this.config?.retentionDays) return 0

    const traces = Array.from(tracesMap.values())

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

    let deleted = 0
    for (const trace of traces) {
      if (new Date(trace.createdAt) < cutoffDate) {
        await this.deleteTrace(trace.id)
        deleted++
      }
    }

    return deleted
  }

  /**
   * Enforce max traces limit
   */
  static async enforceMaxTraces(): Promise<number> {
    if (!this.config?.maxTraces) return 0

    const traces = Array.from(tracesMap.values())

    if (traces.length <= this.config.maxTraces) return 0

    // Sort by creation date (oldest first)
    traces.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    // Delete oldest traces
    const toDelete = traces.slice(0, traces.length - this.config.maxTraces)
    for (const trace of toDelete) {
      await this.deleteTrace(trace.id)
    }

    return toDelete.length
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  TraceService.initialize()
}
