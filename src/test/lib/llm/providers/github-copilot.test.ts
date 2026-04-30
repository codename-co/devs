/**
 * Tests for GitHub Copilot LLM Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GitHubCopilotProvider } from '@/lib/llm/providers/github-copilot'

const mockFetch = vi.fn()

describe('GitHubCopilotProvider', () => {
  let provider: GitHubCopilotProvider

  beforeEach(() => {
    provider = new GitHubCopilotProvider()
    global.fetch = mockFetch
    mockFetch.mockClear()
    // Reset all static caches
    ;(GitHubCopilotProvider as any).cachedTokens = new Map()
    ;(GitHubCopilotProvider as any).modelsCache = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Mock a successful token exchange */
  function mockTokenExchange() {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'copilot-session-token',
        expires_at: Date.now() / 1000 + 3600,
      }),
    })
  }

  describe('getCopilotToken', () => {
    it('should exchange OAuth token for Copilot session token', async () => {
      mockTokenExchange()

      const token = await GitHubCopilotProvider.getCopilotToken('gho_oauth')

      expect(token).toBe('copilot-session-token')
      expect(mockFetch.mock.calls[0][0]).toContain(
        'copilot_internal/v2/token',
      )
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer gho_oauth',
      )
    })

    it('should cache the exchanged token', async () => {
      mockTokenExchange()

      await GitHubCopilotProvider.getCopilotToken('gho_oauth')
      const token2 = await GitHubCopilotProvider.getCopilotToken('gho_oauth')

      expect(token2).toBe('copilot-session-token')
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only one exchange
    })

    it('should throw on exchange failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      })

      await expect(
        GitHubCopilotProvider.getCopilotToken('bad_token'),
      ).rejects.toThrow('token exchange returned 404')
    })
  })

  describe('chat', () => {
    it('should exchange token then call chat endpoint', async () => {
      mockTokenExchange()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'gpt-4o',
        apiKey: 'gho_oauth_token',
      })

      // Token exchange
      expect(mockFetch.mock.calls[0][0]).toContain('copilot_internal')

      // Chat uses the exchanged Copilot token
      expect(mockFetch.mock.calls[1][0]).toContain(
        '/api/github-copilot-api/chat/completions',
      )
      expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe(
        'Bearer copilot-session-token',
      )
    })

    it('should strip provider prefix from model ID', async () => {
      mockTokenExchange()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Hi' },
              finish_reason: 'stop',
            },
          ],
        }),
      })

      await provider.chat([{ role: 'user', content: 'Hello' }], {
        model: 'github-copilot/claude-3.5-sonnet',
        apiKey: 'gho_token',
      })

      const body = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(body.model).toBe('claude-3.5-sonnet')
    })
  })

  describe('validateApiKey', () => {
    it('should validate via token exchange and models check', async () => {
      mockTokenExchange()
      // /models check
      mockFetch.mockResolvedValueOnce({ ok: true })
      const result = await provider.validateApiKey('gho_valid')
      expect(result).toBe(true)
    })

    it('should return false when exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized',
      })
      const result = await provider.validateApiKey('bad_token')
      expect(result).toBe(false)
    })

    it('should skip exchange for fine-grained PATs', async () => {
      // No exchange call, just /models
      mockFetch.mockResolvedValueOnce({ ok: true })
      const result = await provider.validateApiKey('github_pat_xxx')
      expect(result).toBe(true)
      // Only one call (models), no exchange
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAvailableModels', () => {
    it('should exchange token then fetch models', async () => {
      mockTokenExchange()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
          ],
        }),
      })

      const models = await provider.getAvailableModels({
        apiKey: 'gho_token',
      })

      expect(models).toContain('gpt-4o')
      expect(models).toContain('claude-3.5-sonnet')
    })
  })

  describe('getModelInfo', () => {
    it('should return NormalizedModel with capabilities', async () => {
      mockTokenExchange()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'gpt-4o',
              name: 'GPT-4o',
              capabilities: {
                family: 'gpt-4o',
                limits: {
                  max_prompt_tokens: 131072,
                  max_output_tokens: 16384,
                },
                supports: { tool_calls: true, streaming: true },
              },
            },
          ],
        }),
      })

      const info = await GitHubCopilotProvider.getModelInfo(
        'gpt-4o',
        'gho_token',
      )

      expect(info).not.toBeNull()
      expect(info!.name).toBe('GPT-4o')
      expect(info!.capabilities.tools).toBe(true)
      expect(info!.capabilities.vision).toBe(true) // inferred from "4o"
      expect(info!.limits.contextWindow).toBe(131072)
      expect(info!.limits.maxOutput).toBe(16384)
    })

    it('should return null for unknown model', async () => {
      mockTokenExchange()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const info = await GitHubCopilotProvider.getModelInfo(
        'nonexistent',
        'gho_token',
      )
      expect(info).toBeNull()
    })
  })
})
