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
  ToolDefinition,
  ToolChoice,
  ToolCall,
  LLMConfigWithTools,
  GroundingMetadata,
} from '../types'

/**
 * Anthropic web search tool definition.
 * Uses the web_search_20250305 type for native web grounding.
 */
const ANTHROPIC_WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
}

export class AnthropicProvider implements LLMProviderInterface {
  private baseUrl = 'https://api.anthropic.com/v1'
  public static readonly DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
  public static readonly DEFAULT_MAX_TOKENS = 8192

  /**
   * Convert OpenAI tool format to Anthropic tool format
   */
  private convertToolsToAnthropicFormat(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }))
  }

  /**
   * Convert OpenAI tool_choice to Anthropic tool_choice format
   */
  private convertToolChoiceToAnthropicFormat(toolChoice: ToolChoice): any {
    if (toolChoice === 'none') {
      // Anthropic doesn't have a direct 'none' - we omit tools instead
      return undefined
    }
    if (toolChoice === 'auto') {
      return { type: 'auto' }
    }
    if (toolChoice === 'required') {
      return { type: 'any' }
    }
    // Forced tool choice
    if (typeof toolChoice === 'object' && toolChoice.type === 'function') {
      return { type: 'tool', name: toolChoice.function.name }
    }
    return { type: 'auto' }
  }

  /**
   * Convert Anthropic tool_use content blocks to OpenAI tool_calls format
   */
  private convertToolUseToToolCalls(contentBlocks: any[]): ToolCall[] {
    return contentBlocks
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        type: 'function' as const,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      }))
  }

  private async convertMessageToAnthropicFormat(
    message: LLMMessage,
  ): Promise<any> {
    if (!message.attachments || message.attachments.length === 0) {
      // Return null for messages with empty/whitespace-only content
      // This will be filtered out in the chat methods
      if (!message.content.trim()) {
        return null
      }
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
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    // Convert messages to Anthropic format
    const systemMessage =
      messages.find((m) => m.role === 'system')?.content || ''
    const convertedMessages = await Promise.all(
      messages
        .filter((m) => m.role !== 'system')
        .map((msg) => this.convertMessageToAnthropicFormat(msg)),
    )
    // Filter out null messages (those with empty/whitespace-only content)
    const userMessages = convertedMessages.filter((m) => m !== null)

    const endpoint = `${config?.baseUrl || this.baseUrl}/messages`
    console.log('[ANTHROPIC-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: config?.model || AnthropicProvider.DEFAULT_MODEL,
      messagesCount: userMessages.length,
      hasSystemMessage: !!systemMessage,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
      enableWebSearch: !!config?.enableWebSearch,
    })

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || AnthropicProvider.DEFAULT_MODEL,
      system: systemMessage,
      messages: userMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || AnthropicProvider.DEFAULT_MAX_TOKENS,
    }

    // Build tools array
    const tools: any[] = []

    // Add web search tool if enabled
    if (config?.enableWebSearch) {
      tools.push(ANTHROPIC_WEB_SEARCH_TOOL)
    }

    // Add custom tools if provided (and tool_choice is not 'none')
    if (
      config?.tools &&
      config.tools.length > 0 &&
      config?.tool_choice !== 'none'
    ) {
      tools.push(...this.convertToolsToAnthropicFormat(config.tools))
    }

    // Add tools to request if any
    if (tools.length > 0 && config?.tool_choice !== 'none') {
      requestBody.tools = tools
      if (config?.tool_choice) {
        const anthropicToolChoice = this.convertToolChoiceToAnthropicFormat(
          config.tool_choice,
        )
        if (anthropicToolChoice) {
          requestBody.tool_choice = anthropicToolChoice
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
      body: JSON.stringify(requestBody),
    })

    console.log('[ANTHROPIC-PROVIDER] 📡 Response received:', {
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
      throw new Error(`Anthropic API error: ${errorMessage}`)
    }

    const data = await response.json()

    // Extract text content from response
    const textContent = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')

    // Extract tool_use blocks and convert to OpenAI format
    // Filter out web_search tool calls as they are handled internally
    const toolCalls = this.convertToolUseToToolCalls(
      data.content.filter(
        (block: any) =>
          block.type === 'tool_use' && block.name !== 'web_search',
      ),
    )

    // Extract grounding metadata from web search results
    const groundingMetadata = this.extractGroundingMetadata(data.content)

    // Map Anthropic stop_reason to OpenAI finish_reason
    let finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' =
      'stop'
    if (data.stop_reason === 'tool_use') {
      // Only set to tool_calls if there are non-web-search tool calls
      finishReason = toolCalls.length > 0 ? 'tool_calls' : 'stop'
    } else if (data.stop_reason === 'max_tokens') {
      finishReason = 'length'
    } else if (data.stop_reason === 'end_turn') {
      finishReason = 'stop'
    }

    return {
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      groundingMetadata,
      finish_reason: finishReason,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    }
  }

  /**
   * Extract grounding metadata from Anthropic web search results.
   */
  private extractGroundingMetadata(
    contentBlocks: any[],
  ): GroundingMetadata | undefined {
    // Find web_search_tool_result blocks
    const webSearchResults = contentBlocks.filter(
      (block: any) => block.type === 'web_search_tool_result',
    )

    if (webSearchResults.length === 0) {
      return undefined
    }

    const webResults: Array<{ title: string; url: string; snippet?: string }> =
      []

    for (const result of webSearchResults) {
      if (result.content && Array.isArray(result.content)) {
        for (const item of result.content) {
          if (item.type === 'web_search_result') {
            webResults.push({
              title: item.title || '',
              url: item.url || '',
              snippet: item.encrypted_content ? '[Encrypted content]' : '',
            })
          }
        }
      }
    }

    return {
      isGrounded: webResults.length > 0,
      webResults,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const systemMessage =
      messages.find((m) => m.role === 'system')?.content || ''
    const convertedMessages = await Promise.all(
      messages
        .filter((m) => m.role !== 'system')
        .map((msg) => this.convertMessageToAnthropicFormat(msg)),
    )
    // Filter out null messages (those with empty/whitespace-only content)
    const userMessages = convertedMessages.filter((m) => m !== null)

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || AnthropicProvider.DEFAULT_MODEL,
      system: systemMessage,
      messages: userMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || AnthropicProvider.DEFAULT_MAX_TOKENS,
      stream: true,
    }

    // Build tools array
    const tools: any[] = []

    // Add web search tool if enabled
    if (config?.enableWebSearch) {
      tools.push(ANTHROPIC_WEB_SEARCH_TOOL)
    }

    // Add custom tools if provided (and tool_choice is not 'none')
    if (
      config?.tools &&
      config.tools.length > 0 &&
      config?.tool_choice !== 'none'
    ) {
      tools.push(...this.convertToolsToAnthropicFormat(config.tools))
    }

    // Add tools to request if any
    if (tools.length > 0 && config?.tool_choice !== 'none') {
      requestBody.tools = tools
      if (config?.tool_choice) {
        const anthropicToolChoice = this.convertToolChoiceToAnthropicFormat(
          config.tool_choice,
        )
        if (anthropicToolChoice) {
          requestBody.tool_choice = anthropicToolChoice
        }
      }
    }

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
      throw new Error(`Anthropic API error: ${errorMessage}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    // Track tool use blocks being built
    const toolUseBlocks: Map<
      number,
      { id: string; name: string; input: string }
    > = new Map()
    let currentToolIndex = -1

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

            // Handle text content delta
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text
            }

            // Handle tool use block start
            if (
              parsed.type === 'content_block_start' &&
              parsed.content_block?.type === 'tool_use'
            ) {
              currentToolIndex = parsed.index
              toolUseBlocks.set(currentToolIndex, {
                id: parsed.content_block.id,
                name: parsed.content_block.name,
                input: '',
              })
            }

            // Handle tool use input delta
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'input_json_delta'
            ) {
              const block = toolUseBlocks.get(parsed.index)
              if (block) {
                block.input += parsed.delta.partial_json
              }
            }

            // Handle message stop - emit accumulated tool calls
            if (
              parsed.type === 'message_stop' ||
              parsed.type === 'message_delta'
            ) {
              if (toolUseBlocks.size > 0 && parsed.type === 'message_stop') {
                const toolCalls = Array.from(toolUseBlocks.values()).map(
                  (block) => ({
                    id: block.id,
                    type: 'function' as const,
                    function: {
                      name: block.name,
                      arguments: block.input,
                    },
                  }),
                )
                // Yield tool calls as JSON with special prefix
                yield `\n__TOOL_CALLS__${JSON.stringify(toolCalls)}`
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
