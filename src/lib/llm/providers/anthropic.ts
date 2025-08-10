import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class AnthropicProvider implements LLMProviderInterface {
  private baseUrl = 'https://api.anthropic.com/v1'

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    // Convert messages to Anthropic format
    const systemMessage =
      messages.find((m) => m.role === 'system')?.content || ''
    const userMessages = messages.filter((m) => m.role !== 'system')

    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config?.apiKey || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config?.model || 'claude-sonnet-4-20250514',
          system: systemMessage,
          messages: userMessages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens || 1024,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.content[0].text,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const systemMessage =
      messages.find((m) => m.role === 'system')?.content || ''
    const userMessages = messages.filter((m) => m.role !== 'system')

    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config?.apiKey || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config?.model || 'claude-sonnet-4-20250514',
          system: systemMessage,
          messages: userMessages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens || 1024,
          stream: true,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
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
        if (line.trim().startsWith('data: ')) {
          const data = line.slice(6).trim()

          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text
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
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      })
      return response.ok || response.status === 400 // 400 might mean invalid model but valid key
    } catch {
      return false
    }
  }
}
