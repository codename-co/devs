import {
  LLMProviderInterface,
  LLMMessage,
  LLMResponseWithTools,
} from '../index'
import { LLMConfig } from '@/types'
import {
  processAttachments,
  formatTextAttachmentContent,
  getUnsupportedDocumentMessage,
} from '../attachment-processor'
import { LLMConfigWithTools } from '../types'
import {
  addToolsToRequestBody,
  parseToolCallsFromResponse,
  processStreamingToolCallDelta,
  finalizeAccumulatedToolCalls,
  formatToolCallsForStream,
  ToolCallAccumulator,
} from './openai-tools-support'

/**
 * Google Gemini Provider
 *
 * Uses Google's OpenAI-compatible API endpoint with proper file handling.
 * Google uses 'inline_data' for files instead of OpenAI's 'file' type.
 *
 * Supported MIME types:
 * - Images: image/png, image/jpeg, image/webp, image/heic, image/heif
 * - Documents: application/pdf only
 * - Text files: Converted to text content automatically
 *
 * Unsupported formats (like .docx, .xlsx) are converted to text via mammoth.
 */
export class GoogleProvider implements LLMProviderInterface {
  protected baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai'
  public static readonly DEFAULT_MODEL = 'gemini-2.0-flash'

  // MIME types that Google Gemini supports for binary/vision processing
  private static readonly SUPPORTED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif',
  ]

  private static readonly SUPPORTED_DOCUMENT_TYPES = ['application/pdf']

  /**
   * Check if a MIME type is supported by Google Gemini for binary upload
   */
  private isSupportedBinaryType(mimeType: string): boolean {
    return (
      GoogleProvider.SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
      GoogleProvider.SUPPORTED_DOCUMENT_TYPES.includes(mimeType)
    )
  }

  private async convertMessageToGoogleFormat(
    message: LLMMessage,
  ): Promise<any> {
    if (!message.attachments || message.attachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    // Process attachments (converts Word docs to text automatically)
    const processedAttachments = await processAttachments(message.attachments)

    // For messages with attachments, create a content array
    // Google's OpenAI-compatible API uses 'inline_data' for files
    const content: any[] = []

    for (const attachment of processedAttachments) {
      if (attachment.type === 'image') {
        // Check if this image type is supported
        if (this.isSupportedBinaryType(attachment.mimeType)) {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.data}`,
            },
          })
        } else {
          content.push({
            type: 'text',
            text: `\n\n[Image: ${attachment.name} (${attachment.mimeType}) - Format not supported by Google Gemini. Supported formats: PNG, JPEG, WEBP, HEIC, HEIF]\n\n`,
          })
        }
      } else if (attachment.type === 'text') {
        // Text content (including converted Word docs)
        content.push({
          type: 'text',
          text: formatTextAttachmentContent(attachment),
        })
      } else if (attachment.type === 'document') {
        // Check if this document type is natively supported (only PDF)
        if (this.isSupportedBinaryType(attachment.mimeType)) {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.data}`,
            },
          })
        } else {
          // Unsupported document format
          content.push({
            type: 'text',
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
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
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const endpoint = `${config?.baseUrl || this.baseUrl}/chat/completions`
    console.log('[GOOGLE-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || GoogleProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
    })

    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToGoogleFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || GoogleProvider.DEFAULT_MODEL,
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    // Add tools if provided
    addToolsToRequestBody(requestBody, config)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
    const message = data.choices[0].message

    return {
      content: message.content || '',
      tool_calls: parseToolCallsFromResponse(message),
      finish_reason: data.choices[0].finish_reason,
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
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToGoogleFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || GoogleProvider.DEFAULT_MODEL,
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    }

    // Add tools if provided
    addToolsToRequestBody(requestBody, config)

    const response = await fetch(
      `${config?.baseUrl || this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config?.apiKey}`,
        },
        body: JSON.stringify(requestBody),
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

    // Accumulate tool calls from streaming deltas
    const toolCallAccumulators: Map<number, ToolCallAccumulator> = new Map()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            // If we accumulated tool calls, yield them as a special marker
            if (toolCallAccumulators.size > 0) {
              const toolCalls =
                finalizeAccumulatedToolCalls(toolCallAccumulators)
              yield formatToolCallsForStream(toolCalls)
            }
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta

            // Handle content delta
            if (delta?.content) yield delta.content

            // Handle tool call deltas
            if (delta?.tool_calls) {
              processStreamingToolCallDelta(
                toolCallAccumulators,
                delta.tool_calls,
              )
            }
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
