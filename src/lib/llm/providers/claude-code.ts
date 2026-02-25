/**
 * Claude Code API Provider
 *
 * A provider for connecting to Claude Code API servers that expose an OpenAI-compatible
 * API interface for the Claude Code CLI/Agent SDK.
 *
 * Claude Code API servers include:
 * - claude-code-openai-wrapper (Python): https://github.com/RichardAtCT/claude-code-openai-wrapper
 * - claude-code-api-rs (Rust): https://github.com/zhanghandong/claude-code-api-rs
 *
 * These servers wrap the Claude Code CLI/Agent SDK and expose OpenAI-compatible
 * `/v1/chat/completions` endpoints with additional features:
 * - Session continuity for multi-turn conversations
 * - Tool enabling for Claude Code capabilities (Read, Write, Bash, etc.)
 * - Real-time cost and token tracking
 *
 * @module lib/llm/providers/claude-code
 */

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

/**
 * Extended config options specific to Claude Code API
 */
export interface ClaudeCodeConfig extends LLMConfigWithTools {
  /**
   * Session ID for conversation continuity.
   * When provided, the Claude Code API will maintain conversation context
   * across multiple requests.
   */
  sessionId?: string

  /**
   * Enable Claude Code tools (Read, Write, Bash, Glob, Grep, etc.)
   * When true, Claude can interact with the filesystem and execute commands.
   * Default: false (for faster responses)
   */
  enableTools?: boolean
}

/**
 * Claude Code API Provider
 *
 * Connects to a Claude Code API server (self-hosted wrapper for Claude Code CLI).
 * The server must be running and accessible at the configured baseUrl.
 *
 * @example
 * ```typescript
 * // Using with a local Claude Code API server
 * const response = await provider.chat(
 *   [{ role: 'user', content: 'What files are in the current directory?' }],
 *   {
 *     baseUrl: 'http://localhost:8000',
 *     model: 'claude-sonnet-4-5-20250929',
 *     enableTools: true,  // Enable file access
 *     sessionId: 'my-session'  // Maintain conversation context
 *   }
 * )
 * ```
 */
export class ClaudeCodeProvider implements LLMProviderInterface {
  // Default to localhost:8000 (common for claude-code-openai-wrapper)
  // Users can override with their own server URL
  private defaultBaseUrl = 'http://localhost:8000'
  public static readonly DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

  /**
   * Gets the model ID with provider prefix stripped.
   */
  private getModelId(modelWithPrefix: string | undefined): string {
    return stripModelPrefix(modelWithPrefix, ClaudeCodeProvider.DEFAULT_MODEL)
  }

  /**
   * Normalizes the base URL to ensure it ends with /v1
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

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & ClaudeCodeConfig,
  ): Promise<LLMResponseWithTools> {
    const baseUrl = this.normalizeBaseUrl(
      config?.baseUrl || this.defaultBaseUrl,
    )
    const endpoint = `${baseUrl}/chat/completions`

    // Convert messages with attachment handling (OpenAI-compatible format)
    const convertedMessages = await convertMessagesToOpenAIFormat(messages)

    console.log('[CLAUDE-CODE-PROVIDER] 🚀 Making LLM request:', {
      endpoint,
      model: this.getModelId(config?.model),
      messagesCount: convertedMessages.length,
      temperature: config?.temperature || 0.7,
      hasTools: !!config?.tools?.length,
      enableClaudeCodeTools: !!config?.enableTools,
      sessionId: config?.sessionId,
    })

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: this.getModelId(config?.model),
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
    }

    // Add session ID for conversation continuity (Claude Code API specific)
    if (config?.sessionId) {
      requestBody.session_id = config.sessionId
    }

    // Add enable_tools flag (Claude Code API specific)
    // When true, enables Claude Code tools like Read, Write, Bash, etc.
    if (config?.enableTools) {
      requestBody.enable_tools = true
    }

    // Add tools if provided (standard OpenAI format)
    addToolsToRequestBody(requestBody, config)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add Authorization header if API key is provided
    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    console.log('[CLAUDE-CODE-PROVIDER] 📡 Response received:', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Claude Code API error: ${response.statusText} - ${errorText}`,
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
    config?: Partial<LLMConfig> & ClaudeCodeConfig,
  ): AsyncIterableIterator<string> {
    const baseUrl = this.normalizeBaseUrl(
      config?.baseUrl || this.defaultBaseUrl,
    )

    // Convert messages with attachment handling (OpenAI-compatible format)
    const convertedMessages = await convertMessagesToOpenAIFormat(messages)

    console.log('[CLAUDE-CODE-PROVIDER] 🚀 Starting stream request:', {
      endpoint: `${baseUrl}/chat/completions`,
      model: this.getModelId(config?.model),
      messagesCount: convertedMessages.length,
      hasTools: !!config?.tools?.length,
      enableClaudeCodeTools: !!config?.enableTools,
      sessionId: config?.sessionId,
    })

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: this.getModelId(config?.model),
      messages: convertedMessages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    }

    // Add session ID for conversation continuity
    if (config?.sessionId) {
      requestBody.session_id = config.sessionId
    }

    // Add enable_tools flag (Claude Code API specific)
    if (config?.enableTools) {
      requestBody.enable_tools = true
    }

    // Add tools if provided
    addToolsToRequestBody(requestBody, config)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: config?.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Claude Code API error: ${response.statusText} - ${errorText}`,
      )
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

  /**
   * Validates the API key by checking the server health endpoint.
   * Claude Code API servers may or may not require authentication.
   */
  async validateApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const url = baseUrl || this.defaultBaseUrl
      // Try health endpoint first (no auth needed)
      const healthResponse = await fetch(`${url}/health`)
      if (healthResponse.ok) {
        // Server is reachable
        if (!apiKey) {
          return true // No key required
        }
        // Validate with auth status endpoint if key provided
        const authResponse = await fetch(`${url}/v1/auth/status`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })
        return authResponse.ok
      }

      // Fallback: try models endpoint
      const modelsResponse = await fetch(`${url}/v1/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      })
      return modelsResponse.ok
    } catch {
      return false
    }
  }

  /**
   * Get available models from the Claude Code API server.
   */
  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    try {
      const baseUrl = this.normalizeBaseUrl(
        config?.baseUrl || this.defaultBaseUrl,
      )
      const headers: Record<string, string> = {}
      if (config?.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`
      }

      const response = await fetch(`${baseUrl}/models`, {
        headers,
      })

      if (!response.ok) {
        return [ClaudeCodeProvider.DEFAULT_MODEL]
      }

      const data = await response.json()
      return (
        data.data?.map((m: { id: string }) => m.id) || [
          ClaudeCodeProvider.DEFAULT_MODEL,
        ]
      )
    } catch {
      return [ClaudeCodeProvider.DEFAULT_MODEL]
    }
  }
}
