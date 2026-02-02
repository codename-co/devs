import {
  LLMProviderInterface,
  LLMMessage,
  LLMResponseWithTools,
} from '../index'
import { LLMConfig } from '@/types'
import { convertMessagesToOpenAIFormat } from '../attachment-processor'
import { LLMConfigWithTools, stripModelPrefix } from '../types'
import {
  addToolsToRequestBody,
  parseToolCallsFromResponse,
  processStreamingToolCallDelta,
  finalizeAccumulatedToolCalls,
  formatToolCallsForStream,
  ToolCallAccumulator,
} from './openai-tools-support'

export class OpenRouterProvider implements LLMProviderInterface {
  private baseUrl = 'https://openrouter.ai/api/v1'
  public static readonly DEFAULT_MODEL = 'openai/gpt-4o-mini'

  /**
   * Gets the model ID with provider prefix stripped.
   * OpenRouter model IDs are in the format "org/model", e.g., "moonshotai/kimi-k2".
   * When stored in DEVS, they may have an "openrouter/" prefix, e.g., "openrouter/moonshotai/kimi-k2".
   * This method strips only the first prefix, preserving the org/model format.
   */
  private getModelId(modelWithPrefix: string | undefined): string {
    return stripModelPrefix(modelWithPrefix, OpenRouterProvider.DEFAULT_MODEL)
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    // Convert messages with attachment handling (OpenAI-compatible format)
    const convertedMessages = await convertMessagesToOpenAIFormat(messages)

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
          'HTTP-Referer':
            globalThis.location?.origin || 'http://localhost:3000',
          'X-Title': 'DEVS AI Platform',
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${response.statusText} - ${error}`)
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
    // Convert messages with attachment handling (OpenAI-compatible format)
    const convertedMessages = await convertMessagesToOpenAIFormat(messages)

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
          'HTTP-Referer':
            globalThis.location?.origin || 'http://localhost:3000',
          'X-Title': 'DEVS AI Platform',
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${response.statusText} - ${error}`)
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
