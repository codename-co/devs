/**
 * Tests for Anthropic LLM Provider
 *
 * Tests the Anthropic Claude provider implementation, including model ID normalization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnthropicProvider } from '@/lib/llm/providers/anthropic'

// Mock fetch globally
const mockFetch = vi.fn()

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider

  beforeEach(() => {
    provider = new AnthropicProvider()
    global.fetch = mockFetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('model ID stripping', () => {
    it('should strip provider prefix from model ID', async () => {
      // Mock successful response with headers
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'claude-haiku-4-5',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'anthropic/claude-haiku-4-5',
        apiKey: 'test-key',
      })

      // Verify the request body has the stripped model ID
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe('claude-haiku-4-5')
    })

    it('should handle model ID without prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'claude-sonnet-4-5-20250929',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'claude-sonnet-4-5-20250929',
        apiKey: 'test-key',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe('claude-sonnet-4-5-20250929')
    })

    it('should use default model when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: AnthropicProvider.DEFAULT_MODEL,
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        apiKey: 'test-key',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe(AnthropicProvider.DEFAULT_MODEL)
    })
  })
})
