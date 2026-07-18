/**
 * Provider key-validation regression.
 *
 * Anthropic validation must reflect whether *auth* passes, not whether a
 * specific model request succeeds:
 *  - `GET /v1/models` can 401 a key that `/v1/messages` accepts (scope/CORS) —
 *    avoid it.
 *  - A hardcoded model can be retired by Anthropic → 404 — a 404 still means the
 *    key was accepted, so it must count as valid.
 * So validation POSTs to `/v1/messages` and treats anything that is not 401/403
 * as a valid key.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { anthropicBinding } from '@/lib/llm/ai-sdk/bindings'
import { AiSdkProvider } from '@/lib/llm/ai-sdk/adapter'

describe('provider key validation', () => {
  const mockFetch = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('Anthropic validates against /v1/messages with the browser-access header', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const ok = await anthropicBinding.validateApiKey!('sk-ant-key')

    expect(ok).toBe(true)
    const [url, init] = mockFetch.mock.calls[0]
    expect(String(url)).toBe('https://api.anthropic.com/v1/messages')
    expect(init?.method).toBe('POST')
    expect(init?.headers['x-api-key']).toBe('sk-ant-key')
    expect(init?.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  })

  it('treats a retired-model 404 as a valid key (auth passed)', async () => {
    mockFetch.mockResolvedValue(new Response('not found', { status: 404 }))
    expect(await anthropicBinding.validateApiKey!('sk-ant-key')).toBe(true)
  })

  it('treats a 400 bad-request as a valid key (auth passed)', async () => {
    mockFetch.mockResolvedValue(new Response('bad request', { status: 400 }))
    expect(await anthropicBinding.validateApiKey!('sk-ant-key')).toBe(true)
  })

  it('reports an invalid key (401) as invalid', async () => {
    mockFetch.mockResolvedValue(new Response('unauthorized', { status: 401 }))
    expect(await anthropicBinding.validateApiKey!('bad')).toBe(false)
  })

  it('trims whitespace/newlines from the key before sending (common 401 cause)', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const provider = new AiSdkProvider(() => Promise.resolve(anthropicBinding))
    await provider.validateApiKey('  sk-ant-key\n')
    const [, init] = mockFetch.mock.calls[0]
    expect(init?.headers['x-api-key']).toBe('sk-ant-key')
  })
})
