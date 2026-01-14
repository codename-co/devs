import { LLMProvider, LLMConfig } from '@/types'
import {
  TraceService,
  estimateTokenUsage,
} from '@/features/traces/trace-service'
import {
  ToolDefinition,
  ToolChoice,
  ToolCall,
  LLMConfigWithTools,
  LLMResponseWithTools,
  FinishReason,
  TokenUsage,
} from './types'

// Re-export tool types for convenience
export type {
  ToolDefinition,
  ToolChoice,
  ToolCall,
  LLMConfigWithTools,
  LLMResponseWithTools,
  FinishReason,
  TokenUsage,
}
export { hasToolCalls, isToolResultMessage, parseToolArguments } from './types'

// Re-export model utilities
export {
  loadModelRegistry,
  getModelRegistry,
  getModelsForProvider,
  getModelsForProviderAsync,
  getModelIdsForProvider,
  getModel,
  getModelCapabilities,
  findModelsWithCapabilities,
  findBestModel,
  modelHasCapabilities,
} from './models'

export interface LLMMessageAttachment {
  type: 'image' | 'document' | 'text'
  name: string
  data: string // base64 encoded for images/docs, plain text for text files
  mimeType: string
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  attachments?: LLMMessageAttachment[]
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// LLM Progress tracking for ProgressIndicator
export interface LLMProgressStats {
  activeRequests: number
  totalRequests: number
  averageResponseTime: number
  completedRequests: number
}

class LLMProgressTracker {
  private activeRequests = new Map<string, { startTime: number }>()
  private stats = {
    totalRequests: 0,
    completedRequests: 0,
    responseTimes: [] as number[],
    averageResponseTime: 0,
  }

  startRequest(requestId: string): void {
    this.activeRequests.set(requestId, { startTime: Date.now() })
    this.stats.totalRequests++
    this.broadcastProgress()
  }

  endRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId)
    if (request) {
      const responseTime = Date.now() - request.startTime
      this.stats.responseTimes.push(responseTime)
      // Keep only last 100 response times for average calculation
      if (this.stats.responseTimes.length > 100) {
        this.stats.responseTimes.shift()
      }
      this.stats.averageResponseTime = Math.round(
        this.stats.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.stats.responseTimes.length,
      )
      this.activeRequests.delete(requestId)
      this.stats.completedRequests++
    }
    this.broadcastProgress()
  }

  getStats(): LLMProgressStats {
    return {
      activeRequests: this.activeRequests.size,
      totalRequests: this.stats.totalRequests,
      completedRequests: this.stats.completedRequests,
      averageResponseTime: this.stats.averageResponseTime,
    }
  }

  private broadcastProgress(): void {
    const stats = this.getStats()

    // Broadcast to service worker if available
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'LLM_PROGRESS_UPDATE_FROM_CLIENT',
        stats,
      })
    }

    // Also broadcast as a custom event for direct component subscription
    window.dispatchEvent(
      new CustomEvent('llm-progress-update', { detail: { stats } }),
    )
  }
}

/**
 * Interface for LLM provider implementations.
 * Defines methods for chat and streaming chat functionality.
 *
 * Example usage:
 *
 * ```typescript
 * const provider = new MyLLMProvider();
 * const response = await provider.chat([{ role: 'user', content: 'Hello' }], { apiKey });
 * console.log(response.content);
 * ```
 */
export interface LLMProviderInterface {
  chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponse | LLMResponseWithTools>
  streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string>
  validateApiKey(apiKey: string): Promise<boolean>
  getAvailableModels?(config?: Partial<LLMConfig>): Promise<string[]>
}

// Global progress tracker instance
const progressTracker = new LLMProgressTracker()

// Generate unique request IDs
let requestCounter = 0
function generateRequestId(): string {
  return `llm-${Date.now()}-${++requestCounter}`
}

export class LLMService {
  private static providers: Map<LLMProvider, LLMProviderInterface> = new Map()

  static registerProvider(
    provider: LLMProvider,
    implementation: LLMProviderInterface,
  ) {
    this.providers.set(provider, implementation)
  }

  static listProviders(): LLMProvider[] {
    return Array.from(this.providers.keys())
  }

  static getProvider(provider: LLMProvider): LLMProviderInterface {
    const implementation = this.providers.get(provider)
    if (!implementation) {
      throw new Error(`Provider ${provider} not found`)
    }
    return implementation
  }

  static async chat(
    messages: LLMMessage[],
    config: LLMConfig & LLMConfigWithTools,
    context?: {
      agentId?: string
      conversationId?: string
      taskId?: string
      sessionId?: string
    },
  ): Promise<LLMResponseWithTools> {
    const requestId = generateRequestId()
    progressTracker.startRequest(requestId)

    // Start tracing
    const trace = TraceService.startTrace({
      name: `${config.provider}/${config.model}`,
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
      sessionId: context?.sessionId,
      input: messages[messages.length - 1]?.content,
    })

    const span = TraceService.startSpan({
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
        input: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      },
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
    })

    try {
      const provider = this.getProvider(config.provider)
      const response = (await provider.chat(
        messages,
        config,
      )) as LLMResponseWithTools

      // End span and trace with success
      await TraceService.endSpan(span.id, {
        status: 'completed',
        usage: response.usage,
        output: {
          content: response.content,
          toolCalls: response.tool_calls?.map((tc) => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}'),
          })),
        },
      })
      await TraceService.endTrace(trace.id, {
        status: 'completed',
        output:
          response.content ||
          (response.tool_calls
            ? `[Tool calls: ${response.tool_calls.map((tc) => tc.function.name).join(', ')}]`
            : ''),
      })

      return response
    } catch (error) {
      // End span and trace with error
      await TraceService.endSpan(span.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      await TraceService.endTrace(trace.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      progressTracker.endRequest(requestId)
    }
  }

  static async *streamChat(
    messages: LLMMessage[],
    config: LLMConfig,
    context?: {
      agentId?: string
      conversationId?: string
      taskId?: string
      sessionId?: string
      tags?: string[]
    },
  ): AsyncIterableIterator<string> {
    const requestId = generateRequestId()
    progressTracker.startRequest(requestId)

    // Start tracing
    const trace = TraceService.startTrace({
      name: `${config.provider}/${config.model} (stream)`,
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
      sessionId: context?.sessionId,
      tags: context?.tags,
      input: messages[messages.length - 1]?.content,
    })

    const span = TraceService.startSpan({
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
        input: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      },
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
    })

    let fullResponse = ''

    try {
      const provider = this.getProvider(config.provider)
      console.log('△', 'using:', config.provider, config.model, { config })

      for await (const chunk of provider.streamChat(messages, config)) {
        fullResponse += chunk
        yield chunk
      }

      // End span and trace with success
      // Note: Streaming doesn't provide token usage from the provider,
      // so we estimate based on input/output text length
      const estimatedUsage = estimateTokenUsage(
        messages.map((m) => ({ role: m.role, content: m.content })),
        fullResponse,
      )
      await TraceService.endSpan(span.id, {
        status: 'completed',
        usage: estimatedUsage,
        output: { content: fullResponse },
      })
      await TraceService.endTrace(trace.id, {
        status: 'completed',
        output: fullResponse,
      })
    } catch (error) {
      // End span and trace with error
      await TraceService.endSpan(span.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      await TraceService.endTrace(trace.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      progressTracker.endRequest(requestId)
    }
  }

  static async validateApiKey(
    provider: LLMProvider,
    apiKey: string,
  ): Promise<boolean> {
    const implementation = this.getProvider(provider)
    return implementation.validateApiKey(apiKey)
  }

  static async getAvailableModels(
    provider: LLMProvider,
    config?: Partial<LLMConfig>,
  ): Promise<string[]> {
    const implementation = this.getProvider(provider)
    if (implementation.getAvailableModels) {
      return implementation.getAvailableModels(config)
    }
    return []
  }

  // Expose progress stats for components that need direct access
  static getProgressStats(): LLMProgressStats {
    return progressTracker.getStats()
  }
}

// Provider implementations
export * from './providers'

// Register all providers
import {
  LocalLLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  VertexAIProvider,
  MistralProvider,
  OllamaProvider,
  OpenRouterProvider,
  DeepSeekProvider,
  GrokProvider,
  HuggingFaceProvider,
  OpenAICompatibleProvider,
  CustomProvider,
} from './providers'

// Initialize providers after LLMService is defined
LLMService.registerProvider('local', new LocalLLMProvider())
LLMService.registerProvider('ollama', new OllamaProvider())
LLMService.registerProvider('openai', new OpenAIProvider())
LLMService.registerProvider('anthropic', new AnthropicProvider())
LLMService.registerProvider('google', new GoogleProvider())
LLMService.registerProvider('vertex-ai', new VertexAIProvider())
LLMService.registerProvider('mistral', new MistralProvider())
LLMService.registerProvider('openrouter', new OpenRouterProvider())
LLMService.registerProvider('deepseek', new DeepSeekProvider())
LLMService.registerProvider('grok', new GrokProvider())
LLMService.registerProvider('huggingface', new HuggingFaceProvider())
LLMService.registerProvider('openai-compatible', new OpenAICompatibleProvider())
LLMService.registerProvider('custom', new CustomProvider())
