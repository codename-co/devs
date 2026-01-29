/**
 * Tests for Google LLM Provider
 *
 * Tests the Google Gemini provider implementation, including model ID normalization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoogleProvider } from '@/lib/llm/providers/google'

// Mock fetch globally
const mockFetch = vi.fn()

describe('GoogleProvider', () => {
  let provider: GoogleProvider

  beforeEach(() => {
    provider = new GoogleProvider()
    global.fetch = mockFetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getModelId (via chat method)', () => {
    it('should strip provider prefix from model ID', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Hello!', role: 'assistant' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'google/gemini-2.5-flash',
        apiKey: 'test-key',
      })

      // Verify the request body has the stripped model ID
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe('gemini-2.5-flash')
    })

    it('should handle model ID without prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Hello!', role: 'assistant' },
              finish_reason: 'stop',
            },
          ],
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe('gemini-2.0-flash')
    })

    it('should use default model when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Hello!', role: 'assistant' },
              finish_reason: 'stop',
            },
          ],
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        apiKey: 'test-key',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe(GoogleProvider.DEFAULT_MODEL)
    })

    it('should handle nested provider paths correctly', async () => {
      // Some providers might have paths like "vertex-ai/google/gemini-2.5-flash"
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Hello!', role: 'assistant' },
              finish_reason: 'stop',
            },
          ],
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'vertex-ai/google/gemini-2.5-flash',
        apiKey: 'test-key',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      // Should keep everything after the first slash
      expect(body.model).toBe('google/gemini-2.5-flash')
    })
  })

  describe('grounded chat model ID stripping', () => {
    it('should strip provider prefix in grounded requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Hello!' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'google/gemini-2.5-flash',
        apiKey: 'test-key',
        enableWebSearch: true,
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      // URL should contain the stripped model ID
      expect(url).toContain('/models/gemini-2.5-flash:generateContent')
      expect(url).not.toContain('/models/google/')
    })
  })
})
