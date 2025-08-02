import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class GoogleProvider implements LLMProviderInterface {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/models/${config?.model || 'gemini-pro'}:generateContent?key=${config?.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }],
          })),
          generationConfig: {
            temperature: config?.temperature || 0.7,
            maxOutputTokens: config?.maxTokens,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    // Google AI doesn't support streaming yet in the REST API
    const response = await this.chat(messages, config)
    yield response.content
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`, {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }
}
