/**
 * ChatJimmy LLM Provider
 *
 * Unauthenticated provider using https://chatjimmy.ai/api/chat.
 * Supports chat and streaming with models like llama3.1-8B.
 *
 * @module lib/llm/providers/chatjimmy
 */

import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import { LLMConfigWithTools } from '../types'

/**
 * Strip the ChatJimmy stats trailer from response text.
 * ChatJimmy appends `<|stats|>{...}<|/stats|>` at the end of responses.
 */
export function stripStatsTrailer(text: string): string {
  const statsIdx = text.indexOf('<|stats|>')
  if (statsIdx !== -1) {
    return text.slice(0, statsIdx)
  }
  return text
}

/** Available ChatJimmy models */
export const CHATJIMMY_MODELS = [
  'llama3.1-8B',
  'deepseek-r1',
  'mistral-small-3.1',
  'gemma-3-4b',
  'qwen2.5-coder',
]

const CHATJIMMY_BASE_URL = 'https://chatjimmy.ai/api/chat'

/**
 * Resolve the ChatJimmy API endpoint.
 * In dev, requests are proxied via Vite to avoid CORS issues.
 * In production, the generic CORS proxy is used as fallback.
 */
function getChatEndpoint(): string {
  if (typeof window !== 'undefined' && window.location) {
    // Use the proxy route (works in both dev via oauthProxyPlugin and prod via Caddy/bridge)
    return '/api/chatjimmy/chat'
  }
  return CHATJIMMY_BASE_URL
}

/**
 * Converts LLM messages to ChatJimmy format.
 * ChatJimmy uses a standard {role, content} messages array
 * with a separate systemPrompt field in chatOptions.
 */
function convertMessages(messages: LLMMessage[]): {
  chatMessages: Array<{ role: string; content: string }>
  systemPrompt: string
} {
  let systemPrompt = ''
  const chatMessages: Array<{ role: string; content: string }> = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Collect system messages into systemPrompt
      systemPrompt += (systemPrompt ? '\n' : '') + msg.content
    } else {
      chatMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }
  }

  return { chatMessages, systemPrompt }
}

export class ChatJimmyProvider implements LLMProviderInterface {
  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponse> {
    const { chatMessages, systemPrompt } = convertMessages(messages)
    const model = config?.model || 'llama3.1-8B'

    const response = await fetch(getChatEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: chatMessages,
        chatOptions: {
          selectedModel: model,
          systemPrompt,
          topK: 8,
        },
        attachment: null,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ChatJimmy API error: ${response.statusText} - ${error}`)
    }

    // ChatJimmy returns streaming text by default; for non-stream chat,
    // we consume the entire response as text and strip the stats trailer
    const raw = await response.text()
    const content = stripStatsTrailer(raw)

    return {
      content: content.trim(),
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const { chatMessages, systemPrompt } = convertMessages(messages)
    const model = config?.model || 'llama3.1-8B'

    const response = await fetch(getChatEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: chatMessages,
        chatOptions: {
          selectedModel: model,
          systemPrompt,
          topK: 8,
        },
        attachment: null,
      }),
      signal: config?.signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ChatJimmy API error: ${response.statusText} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      if (!chunk) continue

      // Strip stats trailer if present in this chunk
      const statsIdx = chunk.indexOf('<|stats|>')
      if (statsIdx !== -1) {
        const clean = chunk.slice(0, statsIdx)
        if (clean) yield clean
        break // Stats block signals end of content
      }

      yield chunk
    }
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    // ChatJimmy is unauthenticated — always valid
    return true
  }

  async getAvailableModels(): Promise<string[]> {
    return CHATJIMMY_MODELS
  }
}
