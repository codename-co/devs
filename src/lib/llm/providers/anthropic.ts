import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import type { ToolChatOptions, ToolCall } from '../tool-types'
import { toAnthropicToolFormat, parseAnthropicToolCalls } from '../tool-types'
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
  public readonly supportsTools = true

  private async convertMessageToAnthropicFormat(
    message: LLMMessage,
  ): Promise<any> {
    // Handle tool result messages
    if (message.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: message.toolCallId,
            content: message.content,
          },
        ],
      }
    }

    // Handle assistant messages with tool calls
    if (message.role === 'assistant' && message.toolCalls?.length) {
      const content: any[] = []
      if (message.content) {
        content.push({ type: 'text', text: message.content })
      }
      for (const tc of message.toolCalls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        })
      }
      return {
        role: 'assistant',
        content,
      }
    }

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
    options?: ToolChatOptions,
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
      hasTools: !!options?.tools?.length,
    })

    // Build request body
    const body: Record<string, unknown> = {
      model: config?.model || AnthropicProvider.DEFAULT_MODEL,
      system: systemMessage,
      messages: userMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || AnthropicProvider.DEFAULT_MAX_TOKENS,
    }

    // Add tools if provided
    if (options?.tools?.length) {
      body.tools = options.tools.map(toAnthropicToolFormat)
      if (options.toolChoice) {
        if (options.toolChoice === 'auto') {
          body.tool_choice = { type: 'auto' }
        } else if (options.toolChoice === 'required') {
          body.tool_choice = { type: 'any' }
        } else if (options.toolChoice === 'none') {
          // Don't send tools at all for 'none'
          delete body.tools
        } else {
          body.tool_choice = { type: 'tool', name: options.toolChoice.name }
        }
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config?.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
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

    // Extract text content and tool calls from response
    let textContent = ''
    let toolCalls: ToolCall[] | undefined

    if (Array.isArray(data.content)) {
      // Extract text blocks
      const textBlocks = data.content.filter(
        (block: any) => block.type === 'text',
      )
      textContent = textBlocks.map((block: any) => block.text).join('')

      // Extract tool use blocks
      toolCalls = parseAnthropicToolCalls(data.content)
      if (toolCalls.length === 0) {
        toolCalls = undefined
      }
    } else {
      textContent = data.content[0]?.text || ''
    }

    return {
      content: textContent,
      toolCalls,
      stopReason:
        data.stop_reason === 'tool_use'
          ? 'tool_calls'
          : data.stop_reason === 'max_tokens'
            ? 'length'
            : 'content',
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
