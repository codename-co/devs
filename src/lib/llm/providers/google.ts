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
import { LLMConfigWithTools, GroundingMetadata } from '../types'
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
 * When web search grounding is enabled, uses the native Gemini API with
 * google_search tool for real-time web information.
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
  protected nativeBaseUrl = 'https://generativelanguage.googleapis.com/v1beta'
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

  /**
   * Convert messages to native Gemini API format for grounded requests.
   */
  private async convertMessagesToNativeFormat(
    messages: LLMMessage[],
  ): Promise<{ contents: any[]; systemInstruction?: any }> {
    const contents: any[] = []
    let systemInstruction: any = undefined

    for (const message of messages) {
      if (message.role === 'system') {
        // System messages become systemInstruction in native API
        systemInstruction = { parts: [{ text: message.content }] }
        continue
      }

      const parts: any[] = []

      // Handle attachments if present
      if (message.attachments && message.attachments.length > 0) {
        const processedAttachments = await processAttachments(
          message.attachments,
        )
        for (const attachment of processedAttachments) {
          if (
            attachment.type === 'image' &&
            this.isSupportedBinaryType(attachment.mimeType)
          ) {
            parts.push({
              inline_data: {
                mime_type: attachment.mimeType,
                data: attachment.data,
              },
            })
          } else if (attachment.type === 'text') {
            parts.push({ text: formatTextAttachmentContent(attachment) })
          } else if (attachment.type === 'document') {
            if (this.isSupportedBinaryType(attachment.mimeType)) {
              parts.push({
                inline_data: {
                  mime_type: attachment.mimeType,
                  data: attachment.data,
                },
              })
            } else {
              parts.push({ text: getUnsupportedDocumentMessage(attachment) })
            }
          }
        }
      }

      // Add text content
      if (message.content.trim()) {
        parts.push({ text: message.content })
      }

      if (parts.length > 0) {
        contents.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts,
        })
      }
    }

    return { contents, systemInstruction }
  }

  /**
   * Parse grounding metadata from native Gemini API response.
   */
  private parseGroundingMetadata(
    candidate: any,
  ): GroundingMetadata | undefined {
    const groundingMeta = candidate.groundingMetadata
    if (!groundingMeta) {
      return undefined
    }

    return {
      isGrounded: true,
      searchQueries:
        groundingMeta.searchQueries || groundingMeta.webSearchQueries,
      webResults:
        groundingMeta.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || '',
          url: chunk.web?.uri || '',
          snippet: '',
        })) ||
        groundingMeta.webResults?.map((result: any) => ({
          title: result.title || '',
          url: result.url || result.uri || '',
          snippet: result.snippet || '',
        })),
    }
  }

  /**
   * Chat using native Gemini API with Google Search grounding.
   * Uses the native API format which supports the google_search tool.
   */
  private async chatWithGrounding(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const model = config?.model || GoogleProvider.DEFAULT_MODEL
    const endpoint = `${this.nativeBaseUrl}/models/${model}:generateContent?key=${config?.apiKey}`

    console.log('[GOOGLE-PROVIDER] 🔍 Making grounded LLM request:', {
      model,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      grounding: true,
    })

    const { contents, systemInstruction } =
      await this.convertMessagesToNativeFormat(messages)

    // Build request body with google_search tool
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens,
      },
      tools: [{ google_search: {} }],
    }

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('[GOOGLE-PROVIDER] 📡 Grounded response received:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]

    if (!candidate) {
      throw new Error('No response candidate from Gemini API')
    }

    // Extract text content from parts
    const textContent =
      candidate.content?.parts
        ?.filter((part: any) => part.text)
        ?.map((part: any) => part.text)
        ?.join('') || ''

    // Parse grounding metadata
    const groundingMetadata = this.parseGroundingMetadata(candidate)

    return {
      content: textContent,
      groundingMetadata,
      finish_reason: candidate.finishReason === 'STOP' ? 'stop' : 'stop',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    // Use native API with grounding if web search is enabled
    if (config?.enableWebSearch) {
      return this.chatWithGrounding(messages, config)
    }

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

  /**
   * Stream chat using native Gemini API with Google Search grounding.
   */
  private async *streamChatWithGrounding(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const model = config?.model || GoogleProvider.DEFAULT_MODEL
    const endpoint = `${this.nativeBaseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${config?.apiKey}`

    console.log('[GOOGLE-PROVIDER] 🔍 Making streaming grounded request:', {
      model,
      messagesCount: messages.length,
      grounding: true,
    })

    const { contents, systemInstruction } =
      await this.convertMessagesToNativeFormat(messages)

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens,
      },
      tools: [{ google_search: {} }],
    }

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

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
            const candidate = parsed.candidates?.[0]

            // Extract text from parts
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  yield part.text
                }
              }
            }

            // If we have grounding metadata at the end, emit it as special marker
            if (candidate?.groundingMetadata && candidate?.finishReason) {
              const groundingMeta = this.parseGroundingMetadata(candidate)
              if (groundingMeta) {
                yield `\n__GROUNDING_METADATA__${JSON.stringify(groundingMeta)}`
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    // Use native API with grounding if web search is enabled
    if (config?.enableWebSearch) {
      yield* this.streamChatWithGrounding(messages, config)
      return
    }

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
