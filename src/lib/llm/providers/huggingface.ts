import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import { convertMessagesToTextOnlyFormat } from '../attachment-processor'

export class HuggingFaceProvider implements LLMProviderInterface {
  private baseUrl = 'https://router.huggingface.co/v1'

  /**
   * Convert LLMMessage to OpenAI-compatible format
   */
  private async formatMessages(
    messages: LLMMessage[],
  ): Promise<Array<{ role: string; content: string }>> {
    const textMessages = await convertMessagesToTextOnlyFormat(messages)
    return textMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const model = config?.model || 'meta-llama/Llama-3.1-8B-Instruct'
    const endpoint = config?.baseUrl || `${this.baseUrl}/chat/completions`

    const formattedMessages = await this.formatMessages(messages)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 512,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(
        `HuggingFace API error: ${response.statusText} - ${error}`,
      )
    }

    const data = await response.json()

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const model = config?.model || 'meta-llama/Llama-3.1-8B-Instruct'
    const endpoint = config?.baseUrl || `${this.baseUrl}/chat/completions`

    const formattedMessages = await this.formatMessages(messages)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 512,
        stream: true,
      }),
      signal: config?.signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(
        `HuggingFace API error: ${response.statusText} - ${error}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim().startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Test with a simple request to the models endpoint
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    // Popular models available on HuggingFace Inference API
    // These are curated for quality and availability
    const popularModels = [
      // Meta Llama models
      'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
      // Mistral models
      'mistralai/Mistral-7B-Instruct-v0.3',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      // Microsoft Phi models
      'microsoft/Phi-3.5-mini-instruct',
      'microsoft/Phi-3-mini-4k-instruct',
      // Qwen models
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      // Google Gemma models
      'google/gemma-2-27b-it',
      'google/gemma-2-9b-it',
      // DeepSeek models
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      // Cohere models
      'CohereForAI/c4ai-command-r-plus',
    ]

    // Try to fetch models from the API if apiKey is provided
    if (config?.apiKey) {
      try {
        const response = await fetch(`${this.baseUrl}/models`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const apiModels = data.data?.map((model: any) => model.id) || []
          // If API returns models, use those (but filter for chat-capable ones)
          if (apiModels.length > 0) {
            // Return API models, preferring the popular ones first
            const popularSet = new Set(popularModels)
            const sortedModels = [
              ...apiModels.filter((m: string) => popularSet.has(m)),
              ...apiModels.filter((m: string) => !popularSet.has(m)),
            ]
            return sortedModels.slice(0, 50) // Limit to 50 models
          }
        }
      } catch {
        // Fall through to return popular models
      }
    }

    return popularModels
  }
}
