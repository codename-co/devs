import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class OpenAIProvider implements LLMProviderInterface {
  protected baseUrl = 'https://api.openai.com/v1'
  public static readonly DEFAULT_MODEL = 'gpt-5-2025-08-07'

  private convertMessageToOpenAIFormat(message: LLMMessage): any {
    if (!message.attachments || message.attachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    // For messages with attachments, create a content array
    // Using Chat Completions API format: 'text' and 'image_url' types
    // For PDFs/documents, OpenAI Chat Completions uses 'file' type with base64 data
    const content = []

    // Add attachments first (files before text per OpenAI best practices)
    message.attachments.forEach((attachment) => {
      if (attachment.type === 'image') {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else if (attachment.type === 'document') {
        // OpenAI Chat Completions API supports 'file' type for documents (PDFs, etc.)
        content.push({
          type: 'file',
          file: {
            filename: attachment.name,
            file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else if (attachment.type === 'text') {
        // For text files, decode and include as text content
        try {
          const fileContent = atob(attachment.data)
          content.push({
            type: 'text',
            text: `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`,
          })
        } catch {
          // If decoding fails, include as file
          content.push({
            type: 'file',
            file: {
              filename: attachment.name,
              file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
            },
          })
        }
      }
    })

    // Add text content after attachments
    if (message.content.trim()) {
      content.push({
        type: 'text',
        text: message.content,
      })
    }

    return {
      role: message.role,
      content: content,
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const endpoint = `${config?.baseUrl || this.baseUrl}/chat/completions`
    console.log('[OPENAI-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || OpenAIProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify({
        model: config?.model || OpenAIProvider.DEFAULT_MODEL,
        messages: messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens,
      }),
    })

    console.log('[OPENAI-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    })

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
          model: config?.model || OpenAIProvider.DEFAULT_MODEL,
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
