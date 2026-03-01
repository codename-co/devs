/**
 * Tests for ChatJimmy LLM Provider
 *
 * Tests the ChatJimmy provider implementation, including
 * message conversion, streaming, and unauthenticated access.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ChatJimmyProvider,
  CHATJIMMY_MODELS,
  stripStatsTrailer,
} from '@/lib/llm/providers/chatjimmy'

const mockFetch = vi.fn()

// Mock window to enable proxy URL resolution
const originalWindow = globalThis.window

describe('ChatJimmyProvider', () => {
  let provider: ChatJimmyProvider

  beforeEach(() => {
    provider = new ChatJimmyProvider()
    global.fetch = mockFetch
    mockFetch.mockClear()
    // Ensure window exists so getChatEndpoint() returns the proxy path
    if (typeof globalThis.window === 'undefined') {
      ;(globalThis as any).window = { location: { hostname: 'localhost' } }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalWindow === undefined) {
      delete (globalThis as any).window
    }
  })

  describe('chat', () => {
    it('should send messages in ChatJimmy format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Hello from ChatJimmy!',
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'coucou' }],
        { model: 'llama3.1-8B' },
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]

      expect(url).toBe('/api/chatjimmy/chat')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body)
      expect(body).toEqual({
        messages: [{ role: 'user', content: 'coucou' }],
        chatOptions: {
          selectedModel: 'llama3.1-8B',
          systemPrompt: '',
          topK: 8,
        },
        attachment: null,
      })

      expect(result.content).toBe('Hello from ChatJimmy!')
    })

    it('should extract system prompt from system messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Response',
      })

      await provider.chat(
        [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hi' },
        ],
        { model: 'deepseek-r1' },
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.chatOptions.systemPrompt).toBe('You are helpful.')
      expect(body.chatOptions.selectedModel).toBe('deepseek-r1')
      expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }])
    })

    it('should concatenate multiple system messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Response',
      })

      await provider.chat(
        [
          { role: 'system', content: 'First instruction.' },
          { role: 'system', content: 'Second instruction.' },
          { role: 'user', content: 'Hi' },
        ],
        {},
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.chatOptions.systemPrompt).toBe(
        'First instruction.\nSecond instruction.',
      )
    })

    it('should use default model when none specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Response',
      })

      await provider.chat([{ role: 'user', content: 'Hi' }])

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.chatOptions.selectedModel).toBe('llama3.1-8B')
    })

    it('should strip stats trailer from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          'Hello!\n<|stats|>{"done":true,"total_tokens":23}<|/stats|>',
      })

      const result = await provider.chat([{ role: 'user', content: 'Hi' }], {
        model: 'llama3.1-8B',
      })

      expect(result.content).toBe('Hello!')
    })

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        text: async () => 'Something went wrong',
      })

      await expect(
        provider.chat([{ role: 'user', content: 'Hi' }]),
      ).rejects.toThrow('ChatJimmy API error')
    })
  })

  describe('streamChat', () => {
    it('should stream response chunks', async () => {
      const chunks = ['Hello', ' from', ' ChatJimmy!']
      let chunkIndex = 0

      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex >= chunks.length) {
            return { done: true, value: undefined }
          }
          const encoder = new TextEncoder()
          const value = encoder.encode(chunks[chunkIndex++])
          return { done: false, value }
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      })

      const received: string[] = []
      for await (const chunk of provider.streamChat(
        [{ role: 'user', content: 'Hi' }],
        { model: 'llama3.1-8B' },
      )) {
        received.push(chunk)
      }

      expect(received).toEqual(chunks)
    })

    it('should strip stats trailer from streamed chunks', async () => {
      const chunks = ['Hello', ' world!', '<|stats|>{"done":true}<|/stats|>']
      let chunkIndex = 0

      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex >= chunks.length) {
            return { done: true, value: undefined }
          }
          const encoder = new TextEncoder()
          const value = encoder.encode(chunks[chunkIndex++])
          return { done: false, value }
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      })

      const received: string[] = []
      for await (const chunk of provider.streamChat(
        [{ role: 'user', content: 'Hi' }],
        { model: 'llama3.1-8B' },
      )) {
        received.push(chunk)
      }

      expect(received).toEqual(['Hello', ' world!'])
    })

    it('should throw when no response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      })

      const gen = provider.streamChat([{ role: 'user', content: 'Hi' }])
      await expect(gen.next()).rejects.toThrow('No response body')
    })

    it('should throw on stream API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
        text: async () => 'Service unavailable',
      })

      const gen = provider.streamChat([{ role: 'user', content: 'Hi' }])
      await expect(gen.next()).rejects.toThrow('ChatJimmy API error')
    })
  })

  describe('stripStatsTrailer', () => {
    it('should remove stats block from text', () => {
      const text = 'Hello!<|stats|>{"done":true}<|/stats|>'
      expect(stripStatsTrailer(text)).toBe('Hello!')
    })

    it('should return text unchanged if no stats block', () => {
      expect(stripStatsTrailer('Hello!')).toBe('Hello!')
    })

    it('should handle empty text', () => {
      expect(stripStatsTrailer('')).toBe('')
    })
  })

  describe('validateApiKey', () => {
    it('should always return true (unauthenticated)', async () => {
      expect(await provider.validateApiKey('')).toBe(true)
      expect(await provider.validateApiKey('anything')).toBe(true)
    })
  })

  describe('getAvailableModels', () => {
    it('should return the static model list', async () => {
      const models = await provider.getAvailableModels()
      expect(models).toEqual(CHATJIMMY_MODELS)
      expect(models).toContain('llama3.1-8B')
      expect(models).toContain('deepseek-r1')
    })
  })
})
