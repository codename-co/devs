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
import {
  LLMConfigWithTools,
  GroundingMetadata,
  GoogleThinkingConfig,
  stripModelPrefix,
} from '../types'
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
/**
 * Recursively strip JSON Schema properties unsupported by the Gemini native API
 * (e.g. additionalProperties). This prevents 400 errors when sending tool
 * definitions through the native generateContent / streamGenerateContent endpoints.
 */
export function sanitizeSchemaForGemini(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const UNSUPPORTED_KEYS = ['additionalProperties']

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_KEYS.includes(key)) continue

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeSchemaForGemini(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeSchemaForGemini(item as Record<string, unknown>)
          : item,
      )
    } else {
      result[key] = value
    }
  }
  return result
}

export class GoogleProvider implements LLMProviderInterface {
  protected baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai'
  protected nativeBaseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  public static readonly DEFAULT_MODEL = 'gemini-2.0-flash'

  /**
   * Gets the model ID with provider prefix stripped.
   */
  private getModelId(modelWithPrefix: string | undefined): string {
    return stripModelPrefix(modelWithPrefix, GoogleProvider.DEFAULT_MODEL)
  }

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
   * Build the native Gemini thinkingConfig object from GoogleThinkingConfig.
   */
  private buildNativeThinkingConfig(
    thinking: GoogleThinkingConfig,
  ): Record<string, unknown> {
    const thinkingConfig: Record<string, unknown> = {}
    if (thinking.thinkingLevel !== undefined) {
      thinkingConfig.thinkingLevel = thinking.thinkingLevel.toUpperCase()
    }
    if (thinking.thinkingBudget !== undefined) {
      thinkingConfig.thinkingBudget = thinking.thinkingBudget
    }
    if (thinking.includeThoughts) {
      thinkingConfig.includeThoughts = true
    }
    return thinkingConfig
  }

  /**
   * Map GoogleThinkingConfig to OpenAI-compatible reasoning_effort.
   * Gemini's thinkingLevel maps to: minimal→low, low→low, medium→medium, high→high
   */
  private mapThinkingToReasoningEffort(
    thinking: GoogleThinkingConfig,
  ): string | undefined {
    if (thinking.thinkingLevel) {
      const mapping: Record<string, string> = {
        minimal: 'low',
        low: 'low',
        medium: 'medium',
        high: 'high',
      }
      return mapping[thinking.thinkingLevel]
    }
    // Map thinkingBudget to reasoning_effort for OpenAI-compat
    if (thinking.thinkingBudget !== undefined) {
      if (thinking.thinkingBudget === 0) return 'none'
      if (thinking.thinkingBudget <= 1024) return 'low'
      if (thinking.thinkingBudget <= 8192) return 'medium'
      return 'high'
    }
    return undefined
  }

  /**
   * Chat using native Gemini API with Google Search grounding.
   * Uses the native API format which supports the google_search tool.
   */
  private async chatWithGrounding(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const model = this.getModelId(config?.model)
    const endpoint = `${this.nativeBaseUrl}/models/${model}:generateContent?key=${config?.apiKey}`

    console.log('[GOOGLE-PROVIDER] 🔍 Making grounded LLM request:', {
      model,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      grounding: true,
      googleThinking: config?.googleThinking,
    })

    const { contents, systemInstruction } =
      await this.convertMessagesToNativeFormat(messages)

    // Only google_search for grounded requests.
    // Combining google_search with function_declarations is only supported
    // in the Live API — the regular generateContent endpoint rejects it.
    const generationConfig: Record<string, unknown> = {
      temperature: config?.temperature || 0.7,
      maxOutputTokens: config?.maxTokens,
    }

    // Add thinking config for native API
    if (config?.googleThinking) {
      generationConfig.thinkingConfig = this.buildNativeThinkingConfig(
        config.googleThinking,
      )
    }

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig,
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

    // Extract text and thinking content from parts
    let textContent = ''
    let thinkingContent = ''
    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        if (part.thought) {
          thinkingContent += (thinkingContent ? '\n' : '') + part.text
        } else {
          textContent += part.text
        }
      }
    }

    // Parse grounding metadata
    const groundingMetadata = this.parseGroundingMetadata(candidate)

    return {
      content: textContent,
      thinking: thinkingContent || undefined,
      groundingMetadata,
      finish_reason: 'stop',
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
    const model = this.getModelId(config?.model)
    console.log('[GOOGLE-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
      googleThinking: config?.googleThinking,
    })

    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToGoogleFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model,
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    // Add thinking config for OpenAI-compat API
    if (config?.googleThinking) {
      const reasoningEffort = this.mapThinkingToReasoningEffort(
        config.googleThinking,
      )
      if (reasoningEffort) {
        requestBody.reasoning_effort = reasoningEffort
      }
      // Use google extra body for includeThoughts and fine-grained control
      if (
        config.googleThinking.includeThoughts ||
        config.googleThinking.thinkingBudget !== undefined
      ) {
        const thinkingConfig: Record<string, unknown> = {}
        if (config.googleThinking.thinkingLevel) {
          thinkingConfig.thinking_level = config.googleThinking.thinkingLevel
        }
        if (config.googleThinking.thinkingBudget !== undefined) {
          thinkingConfig.thinking_budget = config.googleThinking.thinkingBudget
        }
        if (config.googleThinking.includeThoughts) {
          thinkingConfig.include_thoughts = true
        }
        requestBody.google = { thinking_config: thinkingConfig }
        // Remove reasoning_effort when using native thinking_config
        // (they can't be used at the same time)
        delete requestBody.reasoning_effort
      }
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
      thinking: message.reasoning_content || undefined,
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
    const model = this.getModelId(config?.model)
    const endpoint = `${this.nativeBaseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${config?.apiKey}`

    console.log('[GOOGLE-PROVIDER] 🔍 Making streaming grounded request:', {
      model,
      messagesCount: messages.length,
      grounding: true,
      googleThinking: config?.googleThinking,
    })

    const { contents, systemInstruction } =
      await this.convertMessagesToNativeFormat(messages)

    // Only google_search for grounded requests.
    // Combining google_search with function_declarations is only supported
    // in the Live API — the regular streamGenerateContent endpoint rejects it.
    const streamGenerationConfig: Record<string, unknown> = {
      temperature: config?.temperature || 0.7,
      maxOutputTokens: config?.maxTokens,
    }

    // Add thinking config for native API
    if (config?.googleThinking) {
      streamGenerationConfig.thinkingConfig = this.buildNativeThinkingConfig(
        config.googleThinking,
      )
    }

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: streamGenerationConfig,
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
      signal: config?.signal,
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

            // Extract text from parts, separating thinking from content
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  if (part.thought) {
                    yield `\n__THINKING_DELTA__${part.text}`
                  } else {
                    yield part.text
                  }
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
      model: this.getModelId(config?.model),
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    }

    // Add thinking config for OpenAI-compat API
    if (config?.googleThinking) {
      const reasoningEffort = this.mapThinkingToReasoningEffort(
        config.googleThinking,
      )
      if (reasoningEffort) {
        requestBody.reasoning_effort = reasoningEffort
      }
      if (
        config.googleThinking.includeThoughts ||
        config.googleThinking.thinkingBudget !== undefined
      ) {
        const thinkingConfig: Record<string, unknown> = {}
        if (config.googleThinking.thinkingLevel) {
          thinkingConfig.thinking_level = config.googleThinking.thinkingLevel
        }
        if (config.googleThinking.thinkingBudget !== undefined) {
          thinkingConfig.thinking_budget = config.googleThinking.thinkingBudget
        }
        if (config.googleThinking.includeThoughts) {
          thinkingConfig.include_thoughts = true
        }
        requestBody.google = { thinking_config: thinkingConfig }
        delete requestBody.reasoning_effort
      }
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
        signal: config?.signal,
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
