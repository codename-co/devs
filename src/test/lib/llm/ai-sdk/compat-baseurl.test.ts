/**
 * Regression for the AI SDK openai-compatible URL crash: a credential base URL
 * without a scheme (e.g. `localhost:1234`) or missing `/v1` made the SDK throw
 * `TypeError: Failed to construct 'URL'`. The legacy `fetch`-based layer
 * tolerated it; the bindings must normalise the base to an absolute, `/v1`
 * origin (matching the deleted `normalizeBaseUrl`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiSdkProvider } from '@/lib/llm/ai-sdk/adapter'
import {
  openAiCompatibleBinding,
  lmStudioBinding,
  ollamaBinding,
  customBinding,
} from '@/lib/llm/ai-sdk/bindings'
import type { LLMMessage } from '@/lib/llm'
import type { LLMConfig } from '@/types'

function chatCompletion(): Response {
  return new Response(
    JSON.stringify({
      id: 'x',
      object: 'chat.completion',
      created: 1,
      model: 'm',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

const messages: LLMMessage[] = [{ role: 'user', content: 'hi' }]

describe('openai-compatible base URL normalisation', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(chatCompletion())
  })
  afterEach(() => vi.unstubAllGlobals())

  function requestedUrl(): string {
    const [url] = mockFetch.mock.calls[0]
    return typeof url === 'string' ? url : url.toString()
  }

  it('scheme-less host:port → absolute http URL with /v1 (was: Invalid URL crash)', async () => {
    const p = new AiSdkProvider(() => Promise.resolve(openAiCompatibleBinding))
    const cfg: Partial<LLMConfig> = {
      provider: 'openai-compatible',
      model: 'my-model',
      baseUrl: 'localhost:8080',
      apiKey: 'k',
    }
    const out = await p.chat(messages, cfg)
    expect(out.content).toBe('ok')
    expect(requestedUrl()).toBe('http://localhost:8080/v1/chat/completions')
  })

  it('LM Studio default host resolves to http://localhost:1234/v1', async () => {
    const p = new AiSdkProvider(() => Promise.resolve(lmStudioBinding))
    await p.chat(messages, { provider: 'lm-studio', model: 'default' })
    expect(requestedUrl()).toBe('http://localhost:1234/v1/chat/completions')
  })

  it('Ollama default host resolves to http://localhost:11434/v1', async () => {
    const p = new AiSdkProvider(() => Promise.resolve(ollamaBinding))
    await p.chat(messages, { provider: 'ollama', model: 'llama3.2' })
    expect(requestedUrl()).toBe('http://localhost:11434/v1/chat/completions')
  })

  it('does not double a base that already ends in /v1', async () => {
    const p = new AiSdkProvider(() => Promise.resolve(openAiCompatibleBinding))
    await p.chat(messages, {
      provider: 'openai-compatible',
      model: 'm',
      baseUrl: 'https://api.example.com/v1',
    })
    expect(requestedUrl()).toBe('https://api.example.com/v1/chat/completions')
  })

  it('custom provider without a base URL throws a clear error (not a URL crash)', async () => {
    const p = new AiSdkProvider(() => Promise.resolve(customBinding))
    await expect(
      p.chat(messages, { provider: 'custom', model: 'm' }),
    ).rejects.toThrow(/base URL is required/)
  })
})
