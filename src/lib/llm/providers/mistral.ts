import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import {
  processAttachments,
  formatTextAttachmentContent,
  getUnsupportedDocumentMessage,
} from '../attachment-processor'

export class MistralProvider implements LLMProviderInterface {
  private baseUrl = 'https://api.mistral.ai/v1'

  /**
   * Convert message to Mistral format with attachment handling
   * Mistral API supports text messages; documents are converted to text
   */
  private async convertMessageToMistralFormat(
    message: LLMMessage,
  ): Promise<any> {
    if (!message.attachments || message.attachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    // Process attachments (converts Word docs to text)
    const processedAttachments = await processAttachments(message.attachments)

    // Mistral supports images for vision models, otherwise flatten to text
    const hasImages = processedAttachments.some((a) => a.type === 'image')

    if (hasImages) {
      // Use content array for multimodal
      const content: any[] = []

      for (const attachment of processedAttachments) {
        if (attachment.type === 'image') {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.data}`,
            },
          })
        } else if (attachment.type === 'text') {
          content.push({
            type: 'text',
            text: formatTextAttachmentContent(attachment),
          })
        } else if (attachment.type === 'document') {
          content.push({
            type: 'text',
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
      }

      if (message.content.trim()) {
        content.push({ type: 'text', text: message.content })
      }

      return { role: message.role, content }
    } else {
      // Text-only: flatten to string
      let textContent = ''

      for (const attachment of processedAttachments) {
        if (attachment.type === 'text') {
          textContent += formatTextAttachmentContent(attachment)
        } else if (attachment.type === 'document') {
          textContent += getUnsupportedDocumentMessage(attachment)
        }
      }

      textContent += message.content

      return { role: message.role, content: textContent.trim() }
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToMistralFormat(msg)),
    )

    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.apiKey}`,
        },
        body: JSON.stringify({
          model: config?.model || 'mistral-medium',
          messages: convertedMessages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`)
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
    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToMistralFormat(msg)),
    )

    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.apiKey}`,
        },
        body: JSON.stringify({
          model: config?.model || 'mistral-medium',
          messages: convertedMessages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens,
          stream: true,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`)
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
