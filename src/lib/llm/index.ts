import { LLMProvider, LLMConfig } from '@/types'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
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
    const provider = this.getProvider(config.provider)
    return provider.chat(messages, config)
  }

  static async *streamChat(
    messages: LLMMessage[],
    config: LLMConfig,
  ): AsyncIterableIterator<string> {
    const provider = this.getProvider(config.provider)
    yield* provider.streamChat(messages, config)
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
}

// Provider implementations
export * from './providers'

// Register all providers
import {
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
  CustomProvider,
} from './providers'

// Initialize providers after LLMService is defined
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
LLMService.registerProvider('custom', new CustomProvider())
