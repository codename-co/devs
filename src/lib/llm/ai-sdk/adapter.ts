/**
 * @module lib/llm/ai-sdk/adapter
 *
 * The AI SDK backing for the `LLMProviderInterface` facade (REPORT §4 Phase 3).
 * This **replaces** the hand-rolled provider layer: every standard provider is
 * now a thin {@link AiSdkBinding} driven by this one generic adapter over the
 * Vercel AI SDK (`ai` + `@ai-sdk/*`). There is no per-provider HTTP/streaming/
 * parsing code anymore.
 *
 * The heavy `ai`/provider packages are **dynamically imported** inside the
 * request methods so they never enter the boot graph (Phase 1 invariant).
 */
import type { LLMProviderInterface, LLMMessage } from '../index'
import type { LLMConfig } from '@/types'
import type {
  LLMConfigWithTools,
  LLMResponseWithTools,
  ToolCall,
  ToolDefinition,
  ToolChoice,
  FinishReason,
  GroundingMetadata,
} from '../types'
import { stripModelPrefix } from '../types'

// AI SDK types are referenced type-only so the packages stay out of the boot
// graph (loaded lazily in the methods below).
import type {
  LanguageModel,
  ModelMessage,
  ToolSet,
  ToolChoice as AiToolChoice,
} from 'ai'
import type { ProviderOptions } from '@ai-sdk/provider-utils'

/** The full config shape a request carries. */
export type FullConfig = Partial<LLMConfig> & LLMConfigWithTools

/** Config a binding needs to build an AI SDK language model. */
export interface AiSdkModelConfig {
  apiKey?: string
  baseUrl?: string
  /** Provider-stripped model id (e.g. `gpt-4o`, not `openai/gpt-4o`). */
  modelId: string
}

/**
 * A provider-specific binding. Turns DEVS config into an AI SDK `LanguageModel`
 * (lazily importing its `@ai-sdk/*` package) and supplies the thin,
 * provider-specific bits the SDK does not cover: provider options (thinking),
 * key validation, and live model listing.
 */
export interface AiSdkBinding {
  /** Default model id when config omits one. */
  readonly defaultModel: string
  /** Build an AI SDK model (dynamically imports the provider package). */
  createModel(config: AiSdkModelConfig): Promise<LanguageModel>
  /** Provider-specific options for `generateText`/`streamText` (e.g. thinking). */
  providerOptions?(
    config: FullConfig,
  ): Record<string, Record<string, unknown>> | undefined
  /**
   * Provider-executed (hosted) tools to merge into the request's tool set —
   * e.g. Anthropic's native `web_search` tool when `enableWebSearch` is set.
   * These run server-side on the provider; DEVS never executes them itself.
   */
  providerTools?(
    config: FullConfig,
  ): Promise<ToolSet | undefined> | ToolSet | undefined
  /** Validate an API key / endpoint (thin GET). Omitted ⇒ always valid. */
  validateApiKey?(apiKey: string, baseUrl?: string): Promise<boolean>
  /** List models live from the provider (thin GET). Omitted ⇒ `[]`. */
  listModels?(config?: Partial<LLMConfig>): Promise<string[]>
}

/** Map an AI SDK finish reason to the canonical (OpenAI-style) enum. */
function mapFinishReason(reason: string | undefined): FinishReason {
  switch (reason) {
    case 'tool-calls':
      return 'tool_calls'
    case 'length':
      return 'length'
    case 'content-filter':
      return 'content_filter'
    default:
      return 'stop'
  }
}

/** Map canonical tool definitions → an AI SDK ToolSet (no `execute`: the model
 *  only *returns* calls; DEVS runs them itself, preserving the agent loop). */
function toAiTools(
  defs: ToolDefinition[] | undefined,
  tool: typeof import('ai').tool,
  jsonSchema: typeof import('ai').jsonSchema,
): ToolSet | undefined {
  if (!defs || defs.length === 0) return undefined
  const set: ToolSet = {}
  for (const def of defs) {
    set[def.function.name] = tool({
      description: def.function.description,
      inputSchema: jsonSchema(def.function.parameters as object),
    })
  }
  return set
}

/** Map the canonical tool_choice → the AI SDK toolChoice. */
function toAiToolChoice(
  choice: ToolChoice | undefined,
): AiToolChoice<ToolSet> | undefined {
  if (!choice) return undefined
  if (typeof choice === 'string') return choice
  if (choice.type === 'function') {
    return { type: 'tool', toolName: choice.function.name }
  }
  return undefined
}

/** Map an AI SDK tool-call → the canonical OpenAI-style ToolCall. Filters
 *  out provider-executed calls (e.g. Anthropic's native web_search): those
 *  run server-side and must not be surfaced to DEVS' own tool-execution
 *  loop. */
function toCanonicalToolCalls(
  calls:
    | Array<{
        toolCallId: string
        toolName: string
        input: unknown
        providerExecuted?: boolean
      }>
    | undefined,
): ToolCall[] | undefined {
  const clientCalls = calls?.filter((tc) => !tc.providerExecuted)
  if (!clientCalls || clientCalls.length === 0) return undefined
  return clientCalls.map((tc) => ({
    id: tc.toolCallId,
    type: 'function',
    function: {
      name: tc.toolName,
      arguments:
        typeof tc.input === 'string'
          ? tc.input
          : JSON.stringify(tc.input ?? {}),
    },
  }))
}

/** Map AI SDK `sources` (unified across providers' web search / grounding) →
 *  the canonical {@link GroundingMetadata}. */
function toGroundingMetadata(
  sources:
    | Array<{ sourceType: string; url?: string; title?: string }>
    | undefined,
): GroundingMetadata | undefined {
  const webResults = (sources ?? [])
    .filter((s) => s.sourceType === 'url' && s.url)
    .map((s) => ({ title: s.title || s.url!, url: s.url! }))
  if (webResults.length === 0) return undefined
  return { isGrounded: true, webResults }
}

/**
 * Non-empty placeholder for assistant/user text. Some providers (notably
 * Anthropic) reject empty text content blocks with a 400. An empty assistant
 * turn happens when the model replies with only a tool call and no preamble.
 */
const EMPTY_TEXT_PLACEHOLDER = '(no text)'

/** Map DEVS messages → AI SDK ModelMessages (with multimodal parts). */
function toModelMessages(messages: LLMMessage[]): ModelMessage[] {
  return messages.map((m): ModelMessage => {
    const attachments = m.attachments ?? []
    if (m.role === 'system' || attachments.length === 0) {
      const content =
        m.role !== 'system' && !m.content?.trim()
          ? EMPTY_TEXT_PLACEHOLDER
          : m.content
      return { role: m.role, content } as ModelMessage
    }
    const parts: Array<Record<string, unknown>> = []
    if (m.content) parts.push({ type: 'text', text: m.content })
    for (const att of attachments) {
      if (att.type === 'image') {
        parts.push({ type: 'image', image: att.data, mediaType: att.mimeType })
      } else if (att.type === 'text') {
        parts.push({ type: 'text', text: att.data })
      } else {
        parts.push({ type: 'file', data: att.data, mediaType: att.mimeType })
      }
    }
    return { role: m.role, content: parts } as ModelMessage
  })
}

/**
 * `LLMProviderInterface` implementation backed by the AI SDK, driven by a
 * per-provider {@link AiSdkBinding}.
 */
export class AiSdkProvider implements LLMProviderInterface {
  private bindingPromise: Promise<AiSdkBinding> | null = null

  constructor(private readonly loadBinding: () => Promise<AiSdkBinding>) {}

  private binding(): Promise<AiSdkBinding> {
    if (!this.bindingPromise) this.bindingPromise = this.loadBinding()
    return this.bindingPromise
  }

  private async build(config?: FullConfig) {
    const [ai, binding] = await Promise.all([import('ai'), this.binding()])
    const model = await binding.createModel({
      // Trim credentials: a stray space/newline pasted with the key is the
      // most common cause of a provider 401 on an otherwise-valid key.
      apiKey: config?.apiKey?.trim(),
      baseUrl: config?.baseUrl?.trim(),
      modelId: stripModelPrefix(config?.model, binding.defaultModel),
    })
    return { ai, binding, model }
  }

  /** Merge DEVS' client tool definitions with the binding's provider-executed
   *  (hosted) tools, e.g. Anthropic's native `web_search`. */
  private async tools(
    ai: typeof import('ai'),
    binding: AiSdkBinding,
    config?: FullConfig,
  ): Promise<ToolSet | undefined> {
    const definedTools = toAiTools(config?.tools, ai.tool, ai.jsonSchema)
    const providerTools = await binding.providerTools?.(config ?? {})
    if (!definedTools && !providerTools) return undefined
    return { ...definedTools, ...providerTools }
  }

  async chat(
    messages: LLMMessage[],
    config?: FullConfig,
  ): Promise<LLMResponseWithTools> {
    const { ai, binding, model } = await this.build(config)
    const tools = await this.tools(ai, binding, config)
    const providerOptions = binding.providerOptions?.(config ?? {})

    const result = await ai.generateText({
      model,
      messages: toModelMessages(messages),
      allowSystemInMessages: true,
      temperature: config?.temperature ?? 0.7,
      ...(config?.maxTokens ? { maxOutputTokens: config.maxTokens } : {}),
      ...(tools
        ? { tools, toolChoice: toAiToolChoice(config?.tool_choice) }
        : {}),
      ...(providerOptions
        ? { providerOptions: providerOptions as ProviderOptions }
        : {}),
      abortSignal: config?.signal,
    })

    const toolCalls = toCanonicalToolCalls(result.toolCalls)
    const groundingMetadata = toGroundingMetadata(result.sources)
    // A provider-executed web search doesn't need a client round-trip: if
    // every tool call was filtered out as provider-executed, the turn is done.
    const finishReason = mapFinishReason(result.finishReason)
    return {
      content: result.text ?? '',
      ...(result.reasoningText ? { thinking: result.reasoningText } : {}),
      tool_calls: toolCalls,
      ...(groundingMetadata ? { groundingMetadata } : {}),
      finish_reason:
        finishReason === 'tool_calls' && !toolCalls ? 'stop' : finishReason,
      usage: result.usage
        ? {
            promptTokens: result.usage.inputTokens ?? 0,
            completionTokens: result.usage.outputTokens ?? 0,
            totalTokens: result.usage.totalTokens ?? 0,
          }
        : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: FullConfig,
  ): AsyncIterableIterator<string> {
    const { ai, binding, model } = await this.build(config)
    const tools = await this.tools(ai, binding, config)
    const providerOptions = binding.providerOptions?.(config ?? {})

    const result = ai.streamText({
      model,
      messages: toModelMessages(messages),
      allowSystemInMessages: true,
      temperature: config?.temperature ?? 0.7,
      ...(config?.maxTokens ? { maxOutputTokens: config.maxTokens } : {}),
      ...(tools
        ? { tools, toolChoice: toAiToolChoice(config?.tool_choice) }
        : {}),
      ...(providerOptions
        ? { providerOptions: providerOptions as ProviderOptions }
        : {}),
      abortSignal: config?.signal,
    })

    for await (const delta of result.textStream) {
      if (delta) yield delta
    }

    // Grounding metadata (web search sources) is flushed before tool calls —
    // mirrors the legacy Google provider's stream ordering, which
    // `parseToolCallsFromStream` relies on.
    const groundingMetadata = toGroundingMetadata(await result.sources)
    if (groundingMetadata) {
      yield `\n__GROUNDING_METADATA__${JSON.stringify(groundingMetadata)}`
    }

    // Preserve the legacy streaming protocol: tool calls are flushed at the end
    // as a `__TOOL_CALLS__`-prefixed JSON marker (parsed by the agent loop).
    const toolCalls = toCanonicalToolCalls(await result.toolCalls)
    if (toolCalls && toolCalls.length > 0) {
      yield `\n__TOOL_CALLS__${JSON.stringify(toolCalls)}`
    }
  }

  async validateApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    const binding = await this.binding()
    return binding.validateApiKey
      ? binding.validateApiKey(apiKey?.trim(), baseUrl?.trim())
      : true
  }

  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    const binding = await this.binding()
    return binding.listModels ? binding.listModels(config) : []
  }
}
