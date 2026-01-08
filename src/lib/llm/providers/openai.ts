import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import type { ToolChatOptions, ToolCall } from '../tool-types'
import { toOpenAIToolFormat, parseOpenAIToolCalls } from '../tool-types'
import { LLMConfig } from '@/types'
import {
  processAttachments,
  formatTextAttachmentContent,
  getUnsupportedDocumentMessage,
} from '../attachment-processor'

export class OpenAIProvider implements LLMProviderInterface {
  protected baseUrl = 'https://api.openai.com/v1'
  public static readonly DEFAULT_MODEL = 'gpt-5-2025-08-07'
  public readonly supportsTools = true

  private async convertMessageToOpenAIFormat(
    message: LLMMessage,
  ): Promise<any> {
    // Handle tool result messages
    if (message.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        content: message.content,
      }
    }

    // Handle assistant messages with tool calls
    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
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
    // Using Chat Completions API format: 'text' and 'image_url' types
    // For PDFs/documents, OpenAI Chat Completions uses 'file' type with base64 data
    const content: any[] = []

    // Add attachments first (files before text per OpenAI best practices)
    for (const attachment of processedAttachments) {
      if (attachment.type === 'image') {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else if (attachment.type === 'document') {
        // OpenAI supports PDFs natively via 'file' type
        if (attachment.mimeType === 'application/pdf') {
          content.push({
            type: 'file',
            file: {
              filename: attachment.name,
              file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
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
    const endpoint = `${config?.baseUrl || this.baseUrl}/chat/completions`
    console.log('[OPENAI-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || OpenAIProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!options?.tools?.length,
    })

    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
    )

    // Build request body
    const body: Record<string, unknown> = {
      model: config?.model || OpenAIProvider.DEFAULT_MODEL,
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    // Add tools if provided
    if (options?.tools?.length) {
      body.tools = options.tools.map(toOpenAIToolFormat)
      if (options.toolChoice) {
        if (typeof options.toolChoice === 'string') {
          body.tool_choice = options.toolChoice
        } else {
          body.tool_choice = {
            type: 'function',
            function: { name: options.toolChoice.name },
          }
        }
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify(body),
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
    const message = data.choices[0].message
    const finishReason = data.choices[0].finish_reason

    // Check for Gemini's function call filter (malformed tool calls)
    if (finishReason?.includes('function_call_filter')) {
      console.warn(
        '[OPENAI-PROVIDER] ⚠️ Gemini filtered malformed function call:',
        finishReason,
      )
      // Return content-only response, letting the agent continue without tools
      return {
        content:
          message.content ||
          'I encountered an issue processing my response. Let me try a different approach.',
        toolCalls: undefined,
        stopReason: 'content',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      }
    }

    // Parse tool calls if present
    let toolCalls: ToolCall[] | undefined
    if (message.tool_calls?.length) {
      toolCalls = parseOpenAIToolCalls(message.tool_calls)
    }

    return {
      content: message.content || '',
      toolCalls,
      stopReason:
        finishReason === 'tool_calls'
          ? 'tool_calls'
          : finishReason === 'length'
            ? 'length'
            : 'content',
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
      messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
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
          model: config?.model || OpenAIProvider.DEFAULT_MODEL,
          messages: convertedMessages,
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
