import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import { convertMessagesToTextOnlyFormat } from '../attachment-processor'

export class HuggingFaceProvider implements LLMProviderInterface {
  private baseUrl = 'https://api-inference.huggingface.co/models'

  /**
   * Format messages as a single prompt for HuggingFace models
   * Uses text-only conversion for attachment handling
   */
  private async formatMessages(messages: LLMMessage[]): Promise<string> {
    // Convert to text-only format (handles attachments)
    const textMessages = await convertMessagesToTextOnlyFormat(messages)

    // Convert chat messages to a single prompt for HF models
    const formattedMessages = textMessages.map((msg) => {
      if (msg.role === 'system') return `System: ${msg.content}`
      if (msg.role === 'user') return `User: ${msg.content}`
      if (msg.role === 'assistant') return `Assistant: ${msg.content}`
      return msg.content
    })
    return formattedMessages.join('\n') + '\nAssistant:'
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const model = config?.model || 'meta-llama/Llama-2-7b-chat-hf'
    const endpoint = config?.baseUrl || `${this.baseUrl}/${model}`

    const formattedInput = await this.formatMessages(messages)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify({
        inputs: formattedInput,
        parameters: {
          temperature: config?.temperature || 0.7,
          max_new_tokens: config?.maxTokens || 512,
          return_full_text: false,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(
        `HuggingFace API error: ${response.statusText} - ${error}`,
      )
    }

    const data = await response.json()

    // Handle different response formats
    let content = ''
    if (Array.isArray(data)) {
      content = data[0]?.generated_text || ''
    } else if (data.generated_text) {
      content = data.generated_text
    } else if (data[0]?.generated_text) {
      content = data[0].generated_text
    }

    return {
      content,
      // HuggingFace Inference API doesn't return token usage
      usage: undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const model = config?.model || 'meta-llama/Llama-2-7b-chat-hf'
    const endpoint = config?.baseUrl || `${this.baseUrl}/${model}`

    const formattedInput = await this.formatMessages(messages)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify({
        inputs: formattedInput,
        parameters: {
          temperature: config?.temperature || 0.7,
          max_new_tokens: config?.maxTokens || 512,
          return_full_text: false,
        },
        options: {
          use_cache: false,
          wait_for_model: true,
        },
        stream: true,
      }),
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

          try {
            const parsed = JSON.parse(data)
            if (parsed.token?.text) {
              yield parsed.token.text
            } else if (parsed.generated_text) {
              yield parsed.generated_text
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Test with a simple model
      const response = await fetch(`${this.baseUrl}/gpt2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: 'Test',
          options: {
            wait_for_model: false,
          },
        }),
      })
      // 503 means model is loading, which is still a valid response
      return response.ok || response.status === 503
    } catch {
      return false
    }
  }
}
