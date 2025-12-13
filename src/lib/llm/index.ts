import { LLMProvider, LLMConfig } from '@/types'

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
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse>
  streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
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
    config: LLMConfig,
  ): Promise<LLMResponse> {
    const requestId = generateRequestId()
    progressTracker.startRequest(requestId)
    try {
      const provider = this.getProvider(config.provider)
      return await provider.chat(messages, config)
    } finally {
      progressTracker.endRequest(requestId)
    }
  }

  static async *streamChat(
    messages: LLMMessage[],
    config: LLMConfig,
  ): AsyncIterableIterator<string> {
    const requestId = generateRequestId()
    progressTracker.startRequest(requestId)
    try {
      const provider = this.getProvider(config.provider)
      console.log('△', 'using:', config.provider, config.model, { config })
      yield* provider.streamChat(messages, config)
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
