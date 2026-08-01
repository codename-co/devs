/**
 * @module lib/llm/providers/devs-enterprise
 *
 * DEVS Enterprise LLM Provider
 *
 * Routes all LLM requests through the organization's LLM proxy (e.g. LiteLLM,
 * Azure API Management, AWS Bedrock) with the user's OAuth2 access token
 * for authentication.
 *
 * ## Design
 *
 * - Uses the OpenAI-compatible API format (most LLM proxies speak it)
 * - Attaches the user's OAuth2 bearer token instead of an API key
 * - The proxy holds real API keys — the client never sees them
 * - The proxy handles model routing, rate limiting, and usage logging
 *
 * ## When is this provider used?
 *
 * Only in Enterprise spaces when Teams mode is active. Personal spaces
 * continue to use the user's own providers (BYOK).
 *
 * ## Configuration
 *
 * The proxy URL and allowed models come from `window.__DEVS_TEAMS__.llm`.
 * No per-user configuration needed.
 */

import type {
  LLMProviderInterface,
  LLMMessage,
  LLMResponseWithTools,
} from '../index'
import type { LLMConfig } from '@/types'
import type { LLMConfigWithTools } from '../types'
import {
  processAttachments,
  formatTextAttachmentContent,
  getUnsupportedDocumentMessage,
} from '../attachment-processor'
import {
  addToolsToRequestBody,
  parseToolCallsFromResponse,
  processStreamingToolCallDelta,
  finalizeAccumulatedToolCalls,
  formatToolCallsForStream,
  type ToolCallAccumulator,
} from './openai-tools-support'
import { teamsConfig } from '@/lib/teams/config'
import { authService } from '@/features/auth/auth-service'

/**
 * DEVS Enterprise provider — routes LLM requests through the org's proxy.
 *
 * Implements the same interface as all other providers, but instead of
 * using a user-provided API key, it uses the OAuth2 access token from
 * the Teams auth session.
 */
export class DevsEnterpriseProvider implements LLMProviderInterface {
  /**
   * Default model from the Teams config, or a sensible fallback.
   */
  static get DEFAULT_MODEL(): string {
    return teamsConfig?.llm.defaultModel ?? 'gpt-4o'
  }

  /**
   * Get the proxy base URL from the Teams config.
   */
  private getBaseUrl(): string {
    if (!teamsConfig?.llm.proxyUrl) {
      throw new Error(
        'DEVS Enterprise provider requires Teams mode with a configured LLM proxy URL',
      )
    }
    // Ensure the URL ends with a version path for OpenAI compatibility
    let url = teamsConfig.llm.proxyUrl.replace(/\/+$/, '')
    if (!/\/v\d+$/.test(url)) {
      url += '/v1'
    }
    return url
  }

  /**
   * Get the current OAuth2 access token for authorization.
   */
  private async getAuthHeader(): Promise<string> {
    const token = await authService.getAccessToken()
    if (!token) {
      throw new Error(
        'DEVS Enterprise provider requires an authenticated Teams session',
      )
    }
    return `Bearer ${token}`
  }

  /**
   * Convert a message to OpenAI format (with multimodal support).
   */
  private async convertMessage(message: LLMMessage): Promise<any> {
    if (!message.attachments || message.attachments.length === 0) {
      return { role: message.role, content: message.content }
    }

    const processedAttachments = await processAttachments(message.attachments)
    const content: any[] = []

    for (const attachment of processedAttachments) {
      if (attachment.type === 'image') {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else if (attachment.type === 'document') {
        if (attachment.mimeType === 'application/pdf') {
          content.push({
            type: 'file',
            file: {
              filename: attachment.name,
              file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
            },
          })
        } else {
          content.push({
            type: 'text',
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
      } else if (attachment.type === 'text') {
        content.push({
          type: 'text',
          text: formatTextAttachmentContent(attachment),
        })
      }
    }

    if (message.content.trim()) {
      content.push({ type: 'text', text: message.content })
    }

    return { role: message.role, content }
  }

  /**
   * Non-streaming chat completion.
   */
  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const baseUrl = this.getBaseUrl()
    const auth = await this.getAuthHeader()
    const model = config?.model ?? DevsEnterpriseProvider.DEFAULT_MODEL

    const convertedMessages = await Promise.all(
      messages.map((m) => this.convertMessage(m)),
    )

    const body: any = {
      model,
      messages: convertedMessages,
      stream: false,
    }

    if (config?.temperature !== undefined) body.temperature = config.temperature
    if (config?.maxTokens !== undefined) body.max_tokens = config.maxTokens

    // Add tool definitions if present
    if (config?.tools) {
      addToolsToRequestBody(body, config)
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: config?.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Enterprise LLM proxy error: ${response.status} — ${errorText}`,
      )
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    if (!choice) {
      throw new Error('No response from Enterprise LLM proxy')
    }

    const result: LLMResponseWithTools = {
      content: choice.message?.content ?? '',
      finish_reason: choice.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    }

    // Parse tool calls if present
    if (choice.message?.tool_calls) {
      result.tool_calls = parseToolCallsFromResponse(choice.message.tool_calls)
      result.finish_reason = 'tool_calls'
    }

    return result
  }

  /**
   * Streaming chat completion.
   */
  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const baseUrl = this.getBaseUrl()
    const auth = await this.getAuthHeader()
    const model = config?.model ?? DevsEnterpriseProvider.DEFAULT_MODEL

    const convertedMessages = await Promise.all(
      messages.map((m) => this.convertMessage(m)),
    )

    const body: any = {
      model,
      messages: convertedMessages,
      stream: true,
    }

    if (config?.temperature !== undefined) body.temperature = config.temperature
    if (config?.maxTokens !== undefined) body.max_tokens = config.maxTokens

    if (config?.tools) {
      addToolsToRequestBody(body, config)
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: config?.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Enterprise LLM proxy stream error: ${response.status} — ${errorText}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body from Enterprise LLM proxy')

    const decoder = new TextDecoder()
    let buffer = ''
    const toolCallAccumulator = new Map<number, ToolCallAccumulator>()
    let hasToolCalls = false

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta

            if (!delta) continue

            // Handle text content
            if (delta.content) {
              yield delta.content
            }

            // Handle tool call deltas
            if (delta.tool_calls) {
              hasToolCalls = true
              processStreamingToolCallDelta(toolCallAccumulator, delta.tool_calls)
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Yield tool calls at the end of stream
    if (hasToolCalls) {
      const toolCalls = finalizeAccumulatedToolCalls(toolCallAccumulator)
      if (toolCalls.length > 0) {
        yield formatToolCallsForStream(toolCalls)
      }
    }
  }

  /**
   * API key validation is not applicable for the Enterprise provider.
   * Auth is handled via OAuth2 tokens, not API keys.
   */
  async validateApiKey(_apiKey: string, _baseUrl?: string): Promise<boolean> {
    // Enterprise provider doesn't use API keys.
    // Auth validation happens through the OAuth2 flow.
    return true
  }

  /**
   * Get available models from the Teams config allowlist.
   *
   * In Enterprise mode, models come from the admin-configured allowlist,
   * not from the proxy's /models endpoint.
   */
  async getAvailableModels(_config?: Partial<LLMConfig>): Promise<string[]> {
    return teamsConfig?.llm.allowedModels ?? []
  }
}
