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
 * LM Studio Provider
 *
 * A dedicated provider for LM Studio, which exposes an OpenAI-compatible API.
 * Default base URL: http://localhost:1234/v1
 * Authentication is optional — LM Studio runs locally and doesn't require an API key by default.
 *
 * @see https://lmstudio.ai/docs/api
 */
export class LMStudioProvider implements LLMProviderInterface {
  public static readonly DEFAULT_BASE_URL = 'http://localhost:1234'
  public static readonly DEFAULT_MODEL = 'default'

  /**
   * Normalizes the base URL to ensure it ends with /v1
   */
  private normalizeBaseUrl(baseUrl: string): string {
    let url = baseUrl.replace(/\/+$/, '')
    if (!/\/v\d+$/.test(url)) {
      url = `${url}/v1`
    }
    return url
  }

  private getBaseUrl(config?: Partial<LLMConfig>): string {
    return this.normalizeBaseUrl(
      config?.baseUrl || LMStudioProvider.DEFAULT_BASE_URL,
    )
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

    const processedAttachments = await processAttachments(message.attachments)
    const hasImages = processedAttachments.some((a) => a.type === 'image')

    if (hasImages) {
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
    const baseUrl = this.getBaseUrl(config)
    const endpoint = `${baseUrl}/chat/completions`
    console.log('[LM-STUDIO-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || LMStudioProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const requestBody: Record<string, unknown> = {
      model: config?.model || LMStudioProvider.DEFAULT_MODEL,
      messages: await Promise.all(
        messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
      ),
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    addToolsToRequestBody(requestBody, config)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    console.log('[LM-STUDIO-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `LM Studio API error: ${response.statusText} - ${errorText}`,
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
    const baseUrl = this.getBaseUrl(config)
    console.log('[LM-STUDIO-PROVIDER] 🚀 Starting stream request:', {
      endpoint: `${baseUrl}/chat/completions`,
      model: config?.model || LMStudioProvider.DEFAULT_MODEL,
      messagesCount: messages.length,
      hasTools: !!config?.tools?.length,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const requestBody: Record<string, unknown> = {
      model: config?.model || LMStudioProvider.DEFAULT_MODEL,
      messages: await Promise.all(
        messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
      ),
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    }

    addToolsToRequestBody(requestBody, config)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: config?.signal,
    })

    console.log('[LM-STUDIO-PROVIDER] 📡 Stream response:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `LM Studio API error: ${response.statusText} - ${errorText}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let chunkCount = 0

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
              '[LM-STUDIO-PROVIDER] ✅ Stream complete, chunks received:',
              chunkCount,
            )
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

            if (delta?.content) {
              chunkCount++
              yield delta.content
            }

            if (delta?.tool_calls) {
              processStreamingToolCallDelta(
                toolCallAccumulators,
                delta.tool_calls,
              )
            }
          } catch (e) {
            console.warn(
              '[LM-STUDIO-PROVIDER] ⚠️ Failed to parse chunk:',
              data,
            )
          }
        }
      }
    }
    console.log(
      '[LM-STUDIO-PROVIDER] 🏁 Stream ended (no [DONE]), chunks received:',
      chunkCount,
    )
  }

  async validateApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    const normalizedUrl = this.normalizeBaseUrl(
      baseUrl || LMStudioProvider.DEFAULT_BASE_URL,
    )

    try {
      const headers: Record<string, string> = {}
      if (apiKey && apiKey !== 'lm-studio-no-key') {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const response = await fetch(`${normalizedUrl}/models`, {
        method: 'GET',
        headers,
      })
      return response.ok
    } catch {
      // Server might not be running
      return false
    }
  }

  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    const baseUrl = this.getBaseUrl(config)

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
