import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class LiteLLMProvider implements LLMProviderInterface {
  private getBaseUrl(config?: Partial<LLMConfig>): string {
    return config?.baseUrl || 'http://localhost:4000'
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const baseUrl = this.getBaseUrl(config)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config?.model || 'gpt-3.5-turbo',
        messages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LiteLLM API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content,
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
    const baseUrl = this.getBaseUrl(config)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config?.model || 'gpt-3.5-turbo',
        messages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LiteLLM API error: ${response.statusText} - ${error}`)
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
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content
            if (content) yield content
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    // LiteLLM may or may not require API keys depending on configuration
    // We'll check if the server is accessible
    try {
      const baseUrl =
        apiKey && apiKey.startsWith('http') ? apiKey : 'http://localhost:4000'
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers:
          apiKey && !apiKey.startsWith('http')
            ? {
                Authorization: `Bearer ${apiKey}`,
              }
            : {},
      })

      // LiteLLM returns 200 with model list or 401 if auth is required
      return response.ok || response.status === 404 // 404 means server is up but route might differ
    } catch {
      return false
    }
  }
}
