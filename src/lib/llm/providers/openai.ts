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
import { ToolCall, LLMConfigWithTools, stripModelPrefix } from '../types'

export class OpenAIProvider implements LLMProviderInterface {
  protected baseUrl = 'https://api.openai.com/v1'
  public static readonly DEFAULT_MODEL = 'gpt-5-2025-08-07'

  /**
   * Gets the model ID with provider prefix stripped.
   */
  private getModelId(modelWithPrefix: string | undefined): string {
    return stripModelPrefix(modelWithPrefix, OpenAIProvider.DEFAULT_MODEL)
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
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const endpoint = `${config?.baseUrl || this.baseUrl}/chat/completions`
    const model = this.getModelId(config?.model)
    console.log('[OPENAI-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model,
      messagesCount: messages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
    })

    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model,
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    // Add tools if provided
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = config.tools
      if (config.tool_choice) {
        requestBody.tool_choice = config.tool_choice
      }
      if (config.parallel_tool_calls !== undefined) {
        requestBody.parallel_tool_calls = config.parallel_tool_calls
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config?.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    console.log('[OPENAI-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const errorData = await response.json()
        errorMessage =
          errorData.error?.message || JSON.stringify(errorData) || errorMessage
      } catch {
        // If we can't parse the error body, use statusText
      }
      throw new Error(`OpenAI API error: ${errorMessage}`)
    }

    const data = await response.json()
    const message = data.choices[0].message

    // Parse tool_calls from response if present
    let toolCalls: ToolCall[] | undefined
    if (message.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: tc.type as 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }))
    }

    return {
      content: message.content || '',
      tool_calls: toolCalls,
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
      messages.map((msg) => this.convertMessageToOpenAIFormat(msg)),
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
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = config.tools
      if (config.tool_choice) {
        requestBody.tool_choice = config.tool_choice
      }
      if (config.parallel_tool_calls !== undefined) {
        requestBody.parallel_tool_calls = config.parallel_tool_calls
      }
    }

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
      throw new Error(`OpenAI API error: ${errorMessage}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    // Accumulate tool calls from streaming deltas
    const toolCallAccumulators: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map()

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
              const toolCalls = Array.from(toolCallAccumulators.values()).map(
                (tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.arguments },
                }),
              )
              // Yield tool calls as JSON with special prefix
              yield `\n__TOOL_CALLS__${JSON.stringify(toolCalls)}`
            }
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta

            // Handle content delta
            if (delta?.content) {
              yield delta.content
            }

            // Handle tool call deltas
            if (delta?.tool_calls) {
              for (const tcDelta of delta.tool_calls) {
                const index = tcDelta.index
                if (!toolCallAccumulators.has(index)) {
                  toolCallAccumulators.set(index, {
                    id: tcDelta.id || '',
                    name: tcDelta.function?.name || '',
                    arguments: '',
                  })
                }
                const acc = toolCallAccumulators.get(index)!
                if (tcDelta.id) acc.id = tcDelta.id
                if (tcDelta.function?.name) acc.name = tcDelta.function.name
                if (tcDelta.function?.arguments)
                  acc.arguments += tcDelta.function.arguments
              }
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
