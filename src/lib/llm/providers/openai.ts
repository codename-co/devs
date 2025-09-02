import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class OpenAIProvider implements LLMProviderInterface {
  protected baseUrl = 'https://api.openai.com/v1'

  private convertMessageToOpenAIFormat(message: LLMMessage): any {
    if (!message.attachments || message.attachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    // For messages with attachments, create a content array
    const content = []

    // Add text content first
    if (message.content.trim()) {
      content.push({
        type: 'text',
        text: message.content,
      })
    }

    // Add attachments
    message.attachments.forEach((attachment) => {
      if (attachment.type === 'image') {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else {
        // For documents, include them as text with description
        const fileContent =
          attachment.type === 'text'
            ? atob(attachment.data) // Decode base64 text files
            : `[File: ${attachment.name} (${attachment.mimeType})]`

        content.push({
          type: 'text',
          text: `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`,
        })
      }
    })

    return {
      role: message.role,
      content: content,
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.apiKey}`,
        },
        body: JSON.stringify({
          model: config?.model || 'gpt-5-2025-08-07',
          messages: messages.map((msg) =>
            this.convertMessageToOpenAIFormat(msg),
          ),
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
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
    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.apiKey}`,
        },
        body: JSON.stringify({
          model: config?.model || 'gpt-5-2025-08-07',
          messages: messages.map((msg) =>
            this.convertMessageToOpenAIFormat(msg),
          ),
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens,
          stream: true,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
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
    try {
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
}
