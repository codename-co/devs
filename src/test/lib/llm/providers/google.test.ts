/**
 * Tests for Google LLM Provider
 *
 * Tests the Google Gemini provider implementation, including model ID normalization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoogleProvider } from '@/lib/llm/providers/google'
import { sanitizeSchemaForGemini } from '@/lib/llm/providers/google'

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

  describe('sanitizeSchemaForGemini', () => {
    it('should remove top-level additionalProperties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        additionalProperties: false,
      }
      const result = sanitizeSchemaForGemini(schema)
      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      })
      expect(result).not.toHaveProperty('additionalProperties')
    })

    it('should remove nested additionalProperties from property values', () => {
      const schema = {
        type: 'object',
        properties: {
          variables: {
            type: 'object',
            description: 'Named variables',
            additionalProperties: { type: 'number' },
          },
        },
      }
      const result = sanitizeSchemaForGemini(schema)
      expect(result).toEqual({
        type: 'object',
        properties: {
          variables: {
            type: 'object',
            description: 'Named variables',
          },
        },
      })
    })

    it('should preserve non-additionalProperties fields', () => {
      const schema = {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Math expression',
          },
          precision: {
            type: 'integer',
            minimum: 0,
            maximum: 20,
          },
        },
        required: ['expression'],
      }
      const result = sanitizeSchemaForGemini(schema)
      expect(result).toEqual(schema)
    })

    it('should handle deeply nested schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          outer: {
            type: 'object',
            properties: {
              inner: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  value: { type: 'string' },
                },
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      }
      const result = sanitizeSchemaForGemini(schema)
      expect(result).toEqual({
        type: 'object',
        properties: {
          outer: {
            type: 'object',
            properties: {
              inner: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                },
              },
            },
          },
        },
      })
    })

    it('should handle arrays in schema (e.g. enum values)', () => {
      const schema = {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['fast', 'slow'],
          },
        },
      }
      const result = sanitizeSchemaForGemini(schema)
      expect(result).toEqual(schema)
    })

    it('should handle empty schema', () => {
      const result = sanitizeSchemaForGemini({})
      expect(result).toEqual({})
    })

    it('should strip additionalProperties from items in arrays of objects', () => {
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      }
      const result = sanitizeSchemaForGemini(schema)
      expect(result).toEqual({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      })
    })
  })
})
