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
 * OpenAI-Compatible Provider
 *
 * A provider for any LLM service that implements the OpenAI API specification.
 * Users can configure their own base URL to connect to services like:
 * - LM Studio
 * - LocalAI
 * - vLLM
 * - Text Generation WebUI
 * - Together AI
 * - Fireworks AI
 * - Any OpenAI-compatible endpoint
 */
export class OpenAICompatibleProvider implements LLMProviderInterface {
  public static readonly DEFAULT_MODEL = 'default'

  /**
   * Normalizes the base URL to ensure it ends with a version path
   * Handles URLs like:
   * - http://localhost:4444 -> http://localhost:4444/v1
   * - http://localhost:4444/ -> http://localhost:4444/v1
   * - http://localhost:4444/v1 -> http://localhost:4444/v1
   * - http://localhost:4444/v1/ -> http://localhost:4444/v1
   * - http://localhost:4444/v2 -> http://localhost:4444/v2 (preserved)
   */
  private normalizeBaseUrl(baseUrl: string): string {
    // Remove trailing slash
    let url = baseUrl.replace(/\/+$/, '')
    // Only add /v1 if no version path (/v1, /v2, etc.) is present
    if (!/\/v\d+$/.test(url)) {
      url = `${url}/v1`
    }
    return url
  }

  private async convertMessageToOpenAIFormat(
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

    // For messages with attachments, we need to handle different scenarios:
    // 1. If there are images -> use content array with image_url (requires multimodal model)
    // 2. If only documents/text -> flatten to string content for max compatibility

    const hasImages = processedAttachments.some((a) => a.type === 'image')

    if (hasImages) {
      // Use content array format for multimodal models
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
        content.push({
          type: 'text',
          text: message.content,
        })
      }

      return {
        role: message.role,
        content: content,
      }
    } else {
      // No images - use simple string content for maximum compatibility
      // This works with text-only models like Mistral, Llama, etc.
      let textContent = ''

      for (const attachment of processedAttachments) {
        if (attachment.type === 'text') {
          textContent += formatTextAttachmentContent(attachment)
        } else if (attachment.type === 'document') {
          textContent += getUnsupportedDocumentMessage(attachment)
        }
      }

      textContent += message.content

      return {
        role: message.role,
        content: textContent.trim(),
      }
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    if (!config?.baseUrl) {
      throw new Error('OpenAI-compatible provider requires a base URL')
    }

    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const endpoint = `${baseUrl}/chat/completions`
    console.log('[OPENAI-COMPATIBLE-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || OpenAICompatibleProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Only add Authorization header if API key is provided
    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || OpenAICompatibleProvider.DEFAULT_MODEL,
      messages: await Promise.all(
        messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
      ),
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    // Add tools if provided
    addToolsToRequestBody(requestBody, config)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    console.log('[OPENAI-COMPATIBLE-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `OpenAI-compatible API error: ${response.statusText} - ${errorText}`,
      )
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
    if (!config?.baseUrl) {
      throw new Error('OpenAI-compatible provider requires a base URL')
    }

    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    console.log('[OPENAI-COMPATIBLE-PROVIDER] 🚀 Starting stream request:', {
      endpoint: `${baseUrl}/chat/completions`,
      model: config?.model || OpenAICompatibleProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      hasTools: !!config?.tools?.length,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Only add Authorization header if API key is provided
    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || OpenAICompatibleProvider.DEFAULT_MODEL,
      messages: await Promise.all(
        messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
      ),
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    }

    // Add tools if provided
    addToolsToRequestBody(requestBody, config)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: config?.signal,
    })

    console.log('[OPENAI-COMPATIBLE-PROVIDER] 📡 Stream response:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `OpenAI-compatible API error: ${response.statusText} - ${errorText}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let chunkCount = 0

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
            console.log(
              '[OPENAI-COMPATIBLE-PROVIDER] ✅ Stream complete, chunks received:',
              chunkCount,
            )
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
            if (delta?.content) {
              chunkCount++
              yield delta.content
            }

            // Handle tool call deltas
            if (delta?.tool_calls) {
              processStreamingToolCallDelta(
                toolCallAccumulators,
                delta.tool_calls,
              )
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn(
              '[OPENAI-COMPATIBLE-PROVIDER] ⚠️ Failed to parse chunk:',
              data,
            )
          }
        }
      }
    }
    console.log(
      '[OPENAI-COMPATIBLE-PROVIDER] 🏁 Stream ended (no [DONE]), chunks received:',
      chunkCount,
    )
  }

  async validateApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    if (!baseUrl) {
      // Can't validate without a base URL
      return true
    }

    const normalizedUrl = this.normalizeBaseUrl(baseUrl)

    try {
      const headers: Record<string, string> = {}
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const response = await fetch(`${normalizedUrl}/models`, {
        method: 'GET',
        headers,
      })
      return response.ok
    } catch {
      // If /models endpoint fails, try a simple health check
      // Some OpenAI-compatible servers don't implement /models
      return true
    }
  }

  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    if (!config?.baseUrl) {
      return []
    }

    const baseUrl = this.normalizeBaseUrl(config.baseUrl)

    try {
      const headers: Record<string, string> = {}
      if (config?.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`
      }

      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.data?.map((model: any) => model.id) || []
    } catch {
      return []
    }
  }
}
