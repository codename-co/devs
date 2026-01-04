import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

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

  private convertMessageToOpenAIFormat(message: LLMMessage): any {
    if (!message.attachments || message.attachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    // For messages with attachments, we need to handle different scenarios:
    // 1. If there are images -> use content array with image_url (requires multimodal model)
    // 2. If only documents/text -> flatten to string content for max compatibility

    const hasImages = message.attachments.some((a) => a.type === 'image')

    if (hasImages) {
      // Use content array format for multimodal models
      const content: any[] = []

      message.attachments.forEach((attachment) => {
        if (attachment.type === 'image') {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.data}`,
            },
          })
        } else if (attachment.type === 'text') {
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
        } else if (attachment.type === 'document') {
          content.push({
            type: 'text',
            text: `\n\n[Document: ${attachment.name} (${attachment.mimeType}) - PDF/document files require a multimodal model]\n\n`,
          })
        }
      })

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

      message.attachments.forEach((attachment) => {
        if (attachment.type === 'text') {
          try {
            const fileContent = atob(attachment.data)
            textContent += `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`
          } catch {
            textContent += `\n\n[File: ${attachment.name} - could not decode]\n\n`
          }
        } else if (attachment.type === 'document') {
          // For PDFs/documents without a multimodal model, we can't process them
          textContent += `\n\n[Document: ${attachment.name} (${attachment.mimeType}) - PDF/document content cannot be read by text-only models. Please copy-paste the text content or use a multimodal model.]\n\n`
        }
      })

      textContent += message.content

      return {
        role: message.role,
        content: textContent.trim(),
      }
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
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
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Only add Authorization header if API key is provided
    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config?.model || OpenAICompatibleProvider.DEFAULT_MODEL,
        messages: messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens,
      }),
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
    if (!config?.baseUrl) {
      throw new Error('OpenAI-compatible provider requires a base URL')
    }

    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Only add Authorization header if API key is provided
    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config?.model || OpenAICompatibleProvider.DEFAULT_MODEL,
        messages: messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens,
        stream: true,
      }),
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
