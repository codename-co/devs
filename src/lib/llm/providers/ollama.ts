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
import { ToolCall, LLMConfigWithTools } from '../types'

export class OllamaProvider implements LLMProviderInterface {
  private getBaseUrl(config?: Partial<LLMConfig>): string {
    return config?.baseUrl || 'http://localhost:11434'
  }

  private async convertMessageToOllamaFormat(
    message: LLMMessage,
  ): Promise<any> {
    let content = message.content
    const images: string[] = []

    // If there are attachments, handle them appropriately
    if (message.attachments && message.attachments.length > 0) {
      // Process attachments (converts Word docs to text)
      const processedAttachments = await processAttachments(message.attachments)

      for (const attachment of processedAttachments) {
        if (attachment.type === 'image') {
          // Ollama supports images array for multimodal models (e.g., llava, bakllava)
          images.push(attachment.data) // Raw base64 without data URL prefix
        } else if (attachment.type === 'text') {
          // For text files (including converted docs), decode and include the content
          content += formatTextAttachmentContent(attachment)
        } else if (attachment.type === 'document') {
          // For documents like PDFs, Ollama doesn't have native support
          content += getUnsupportedDocumentMessage(attachment)
        }
      }
    }

    const result: any = {
      role: message.role,
      content: content,
    }

    // Add images array if we have image attachments
    if (images.length > 0) {
      result.images = images
    }

    return result
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const baseUrl = this.getBaseUrl(config)

    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToOllamaFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || 'llama2',
      messages: convertedMessages,
      stream: false,
      options: {
        temperature: config?.temperature || 0.7,
        num_predict: config?.maxTokens,
      },
    }

    // Add tools if provided (Ollama uses same format as OpenAI)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = config.tools
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()
    const message = data.message

    // Parse tool_calls from response if present (Ollama format)
    let toolCalls: ToolCall[] | undefined
    if (message.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc: any, index: number) => ({
        id: tc.id || `call_${index}`, // Ollama may not provide IDs
        type: 'function' as const,
        function: {
          name: tc.function.name,
          // Ollama returns arguments as object, need to stringify
          arguments:
            typeof tc.function.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function.arguments),
        },
      }))
    }

    return {
      content: message.content || '',
      tool_calls: toolCalls,
      finish_reason: data.done_reason || (data.done ? 'stop' : undefined),
      usage:
        data.prompt_eval_count && data.eval_count
          ? {
              promptTokens: data.prompt_eval_count,
              completionTokens: data.eval_count,
              totalTokens: data.prompt_eval_count + data.eval_count,
            }
          : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const baseUrl = this.getBaseUrl(config)

    // Convert messages (may involve async document conversion)
    const convertedMessages = await Promise.all(
      messages.map((msg) => this.convertMessageToOllamaFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: config?.model || 'llama2',
      messages: convertedMessages,
      stream: true,
      options: {
        temperature: config?.temperature || 0.7,
        num_predict: config?.maxTokens,
      },
    }

    // Add tools if provided
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = config.tools
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: config?.signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${response.statusText} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    // Track accumulated tool calls
    const accumulatedToolCalls: ToolCall[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line)

            // Handle content
            if (parsed.message?.content) {
              yield parsed.message.content
            }

            // Handle tool calls (Ollama sends them in message.tool_calls)
            if (parsed.message?.tool_calls) {
              for (const tc of parsed.message.tool_calls) {
                accumulatedToolCalls.push({
                  id: tc.id || `call_${accumulatedToolCalls.length}`,
                  type: 'function' as const,
                  function: {
                    name: tc.function.name,
                    arguments:
                      typeof tc.function.arguments === 'string'
                        ? tc.function.arguments
                        : JSON.stringify(tc.function.arguments),
                  },
                })
              }
            }

            // On done, yield tool calls if any
            if (parsed.done && accumulatedToolCalls.length > 0) {
              yield `\n__TOOL_CALLS__${JSON.stringify(accumulatedToolCalls)}`
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    // Ollama doesn't require API keys, but we can check if the server is running
    // For Ollama, if an API key is provided, it's actually a custom base URL
    try {
      const baseUrl =
        apiKey && apiKey !== 'ollama-no-key' ? apiKey : 'http://localhost:11434'
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
      })

      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    try {
      const baseUrl = this.getBaseUrl(config)
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch {
      return []
    }
  }
}
