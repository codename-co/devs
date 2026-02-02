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
import { LLMConfigWithTools, stripModelPrefix } from '../types'
import {
  addToolsToRequestBody,
  parseToolCallsFromResponse,
  processStreamingToolCallDelta,
  finalizeAccumulatedToolCalls,
  formatToolCallsForStream,
  ToolCallAccumulator,
} from './openai-tools-support'

export class MistralProvider implements LLMProviderInterface {
  private baseUrl = 'https://api.mistral.ai/v1'
  public static readonly DEFAULT_MODEL = 'mistral-medium'

  /**
   * Gets the model ID with provider prefix stripped.
   */
  private getModelId(modelWithPrefix: string | undefined): string {
    return stripModelPrefix(modelWithPrefix, MistralProvider.DEFAULT_MODEL)
  }

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
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToMistralFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: this.getModelId(config?.model),
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
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
      let errorMessage = response.statusText
      try {
        const errorData = await response.json()
        errorMessage =
          errorData.error?.message || JSON.stringify(errorData) || errorMessage
      } catch {
        // If we can't parse the error body, use statusText
      }
      throw new Error(`Mistral API error: ${errorMessage}`)
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
      messages.map((msg) => this.convertMessageToMistralFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: this.getModelId(config?.model),
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
      let errorMessage = response.statusText
      try {
        const errorData = await response.json()
        errorMessage =
          errorData.error?.message || JSON.stringify(errorData) || errorMessage
      } catch {
        // If we can't parse the error body, use statusText
      }
      throw new Error(`Mistral API error: ${errorMessage}`)
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
