import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

/**
 * Google Gemini Provider
 *
 * Uses Google's OpenAI-compatible API endpoint with proper file handling.
 * Google uses 'inline_data' for files instead of OpenAI's 'file' type.
 */
export class GoogleProvider implements LLMProviderInterface {
  protected baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai'
  public static readonly DEFAULT_MODEL = 'gemini-2.0-flash'

  private convertMessageToGoogleFormat(message: LLMMessage): any {
    if (!message.attachments || message.attachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    // For messages with attachments, create a content array
    // Google's OpenAI-compatible API uses 'inline_data' for files
    const content: any[] = []

    // Add attachments first
    message.attachments.forEach((attachment) => {
      if (attachment.type === 'image') {
        // Google supports image_url format
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else if (attachment.type === 'document') {
        // Google uses inline_data for documents (PDFs, etc.)
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
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
          content.push({
            type: 'text',
            text: `\n\n[File: ${attachment.name} - could not decode]\n\n`,
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
    console.log('[GOOGLE-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || GoogleProvider.DEFAULT_MODEL,
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
        model: config?.model || GoogleProvider.DEFAULT_MODEL,
        messages: messages.map((msg) => this.convertMessageToGoogleFormat(msg)),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens,
      }),
    })

    console.log('[GOOGLE-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google API error: ${response.statusText} - ${errorText}`)
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
          model: config?.model || GoogleProvider.DEFAULT_MODEL,
          messages: messages.map((msg) =>
            this.convertMessageToGoogleFormat(msg),
          ),
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens,
          stream: true,
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google API error: ${response.statusText} - ${errorText}`)
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
          } catch {
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
