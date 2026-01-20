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
import { isPdf } from '../../document-converter'
import { ToolCall, ToolDefinition, LLMConfigWithTools } from '../types'

export class VertexAIProvider implements LLMProviderInterface {
  public static readonly DEFAULT_MODEL = 'gemini-2.5-flash'

  /**
   * Convert OpenAI tool format to Gemini/Vertex AI tool format
   */
  private convertToolsToGeminiFormat(tools: ToolDefinition[]): any[] {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        })),
      },
    ]
  }

  /**
   * Convert Gemini function call response to OpenAI tool_calls format
   */
  private convertFunctionCallsToToolCalls(parts: any[]): ToolCall[] {
    const toolCalls: ToolCall[] = []
    for (const part of parts) {
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${toolCalls.length}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          },
        })
      }
    }
    return toolCalls
  }

  private getEndpoint(config?: Partial<LLMConfig>): string {
    // Vertex AI requires location and project ID in the URL
    // Format: https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL:predict
    if (config?.baseUrl) {
      return config.baseUrl
    }

    // Extract location and project from API key (expected format: LOCATION:PROJECT_ID:API_KEY)
    const parts = config?.apiKey?.split(':') || []
    if (parts.length >= 2) {
      const [location, projectId] = parts
      return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`
    }

    throw new Error(
      'Vertex AI requires location and project ID. Use format: LOCATION:PROJECT_ID:API_KEY',
    )
  }

  private getApiKey(config?: Partial<LLMConfig>): string {
    // Extract actual API key from composite format
    const parts = config?.apiKey?.split(':') || []
    return parts[parts.length - 1] || ''
  }

  /**
   * Convert message to Vertex AI format with attachment handling
   * Vertex AI (Gemini models) supports images and PDFs natively; Word docs are converted to text
   */
  private async convertMessageToVertexFormat(
    message: LLMMessage,
  ): Promise<any> {
    const parts: any[] = []

    if (message.attachments && message.attachments.length > 0) {
      // Process attachments (converts Word docs to text)
      const processedAttachments = await processAttachments(message.attachments)

      for (const attachment of processedAttachments) {
        if (attachment.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else if (
          attachment.type === 'document' &&
          isPdf(attachment.mimeType)
        ) {
          // PDFs are supported natively by Vertex AI (Gemini)
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else if (attachment.type === 'text') {
          // Text content from converted documents
          parts.push({
            text: formatTextAttachmentContent(attachment),
          })
        } else if (attachment.type === 'document') {
          // Unsupported document formats
          parts.push({
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
      }
    }

    if (message.content.trim()) {
      parts.push({ text: message.content })
    }

    return {
      role: message.role === 'assistant' ? 'model' : message.role,
      parts: parts.length > 0 ? parts : [{ text: '' }],
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const endpoint = this.getEndpoint(config)
    const apiKey = this.getApiKey(config)
    const model = config?.model || VertexAIProvider.DEFAULT_MODEL

    // Convert messages to Vertex AI format (may involve async document conversion)
    const contents = await Promise.all(
      messages.map((msg) => this.convertMessageToVertexFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens,
        candidateCount: 1,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    }

    // Add tools if provided (convert to Gemini format)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = this.convertToolsToGeminiFormat(config.tools)
    }

    const response = await fetch(
      `${endpoint}/publishers/google/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Vertex AI')
    }

    const candidate = data.candidates[0]
    const parts = candidate.content?.parts || []

    // Extract text content
    let content = ''
    for (const part of parts) {
      if (part.text) {
        content += part.text
      }
    }

    // Extract function calls as tool_calls
    const toolCalls = this.convertFunctionCallsToToolCalls(parts)

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      finish_reason:
        candidate.finishReason === 'STOP'
          ? 'stop'
          : candidate.finishReason === 'MAX_TOKENS'
            ? 'length'
            : toolCalls.length > 0
              ? 'tool_calls'
              : 'stop',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const endpoint = this.getEndpoint(config)
    const apiKey = this.getApiKey(config)
    const model = config?.model || VertexAIProvider.DEFAULT_MODEL

    // Convert messages to Vertex AI format (may involve async document conversion)
    const contents = await Promise.all(
      messages.map((msg) => this.convertMessageToVertexFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens,
        candidateCount: 1,
      },
    }

    // Add tools if provided (convert to Gemini format)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = this.convertToolsToGeminiFormat(config.tools)
    }

    const response = await fetch(
      `${endpoint}/publishers/google/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI API error: ${response.statusText} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    // Accumulate function calls
    const accumulatedToolCalls: ToolCall[] = []

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
            const parts = parsed.candidates?.[0]?.content?.parts || []

            for (const part of parts) {
              // Handle text content
              if (part.text) {
                yield part.text
              }

              // Handle function calls
              if (part.functionCall) {
                accumulatedToolCalls.push({
                  id: `call_${accumulatedToolCalls.length}`,
                  type: 'function',
                  function: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args || {}),
                  },
                })
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Yield accumulated tool calls at the end
    if (accumulatedToolCalls.length > 0) {
      yield `\n__TOOL_CALLS__${JSON.stringify(accumulatedToolCalls)}`
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Parse the composite API key
      const parts = apiKey.split(':')
      if (parts.length < 3) {
        return false
      }

      const [location, projectId, actualKey] = parts
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`

      // Try to list available models
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${actualKey}`,
        },
      })

      // 403 means auth failed, 404 might mean wrong project/location but auth is valid
      return response.ok || response.status === 404
    } catch {
      return false
    }
  }
}
