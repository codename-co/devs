import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import {
  processAttachments,
  formatTextAttachmentContent,
  getUnsupportedDocumentMessage,
} from '../attachment-processor'

export class AnthropicProvider implements LLMProviderInterface {
  private baseUrl = 'https://api.anthropic.com/v1'
  public static readonly DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
  public static readonly DEFAULT_MAX_TOKENS = 8192

  private async convertMessageToAnthropicFormat(
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

    // For messages with attachments, create a content array
    const content: any[] = []

    // Add attachments first
    for (const attachment of processedAttachments) {
      if (attachment.type === 'image') {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: attachment.mimeType,
            data: attachment.data,
          },
        })
      } else if (attachment.type === 'document') {
        // Anthropic supports PDFs natively via document type
        if (attachment.mimeType === 'application/pdf') {
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else {
          // Unsupported document format
          content.push({
            type: 'text',
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
      } else if (attachment.type === 'text') {
        // For text files (including converted docs), decode and include as text content
        content.push({
          type: 'text',
          text: formatTextAttachmentContent(attachment),
        })
      }
    }

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
    // Convert messages to Anthropic format
    const systemMessage =
      messages.find((m) => m.role === 'system')?.content || ''
    const userMessages = await Promise.all(
      messages
        .filter((m) => m.role !== 'system')
        .map((msg) => this.convertMessageToAnthropicFormat(msg)),
    )

    const endpoint = `${config?.baseUrl || this.baseUrl}/messages`
    console.log('[ANTHROPIC-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || AnthropicProvider.DEFAULT_MODEL,
      messagesCount: userMessages.length,
      hasSystemMessage: !!systemMessage,
      temperature: config?.temperature || 0.7,
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config?.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config?.model || AnthropicProvider.DEFAULT_MODEL,
        system: systemMessage,
        messages: userMessages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || AnthropicProvider.DEFAULT_MAX_TOKENS,
      }),
    })

    console.log('[ANTHROPIC-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    })

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
    const userMessages = await Promise.all(
      messages
        .filter((m) => m.role !== 'system')
        .map((msg) => this.convertMessageToAnthropicFormat(msg)),
    )

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
          model: config?.model || AnthropicProvider.DEFAULT_MODEL,
          system: systemMessage,
          messages: userMessages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens || AnthropicProvider.DEFAULT_MAX_TOKENS,
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
