/**
 * Phase 3 — LLM layer regression: the AI SDK ChatJimmy path (custom
 * `LanguageModelV4`) must reproduce the hand-rolled provider's `content`. The
 * golden fixtures were recorded from the (now deleted) legacy provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiSdkProvider } from '@/lib/llm/ai-sdk/adapter'
import { chatJimmyBinding } from '@/lib/llm/ai-sdk/chatjimmy'
import { assertMatchesGolden } from '@/test/golden'
import type { LLMMessage } from '@/lib/llm'
import type { LLMConfig } from '@/types'

function textResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  })
}

function streamResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder()
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  })
}

const STATS = '<|stats|>{"tokens":5}<|/stats|>'
const FULL_BODY = `Hello from Jimmy${STATS}`
const STREAM_CHUNKS = ['Hello ', 'from Jimmy', STATS]

const CONFIG: Partial<LLMConfig> = {
  provider: 'chatjimmy',
  model: 'llama3.1-8B',
}

async function joinStream(it: AsyncIterableIterator<string>): Promise<string> {
  let out = ''
  for await (const chunk of it) out += chunk
  return out
}

describe('LLM regression — ChatJimmy (AI SDK custom model) vs golden', () => {
  const mockFetch = vi.fn()
  let chatjimmy: AiSdkProvider

  beforeEach(() => {
    chatjimmy = new AiSdkProvider(() => Promise.resolve(chatJimmyBinding))
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const messages: LLMMessage[] = [
    { role: 'system', content: 'Be brief.' },
    { role: 'user', content: 'Hi' },
  ]

  it('chat: strips the stats trailer and matches golden', async () => {
    mockFetch.mockResolvedValue(textResponse(FULL_BODY))
    const out = await chatjimmy.chat(messages, CONFIG)
    expect(out.content).toBe('Hello from Jimmy')
    expect(out.tool_calls).toBeUndefined()
    await assertMatchesGolden('llm/chatjimmy-chat-basic', { content: out.content })
  })

  it('streamChat: concatenated text matches golden', async () => {
    mockFetch.mockResolvedValue(streamResponse(STREAM_CHUNKS))
    const text = await joinStream(chatjimmy.streamChat(messages, CONFIG))
    expect(text).toBe('Hello from Jimmy')
    await assertMatchesGolden('llm/chatjimmy-stream-basic', { text })
  })

  it('sends the ChatJimmy protocol body (systemPrompt + messages)', async () => {
    mockFetch.mockResolvedValue(textResponse(FULL_BODY))
    await chatjimmy.chat(messages, CONFIG)

    expect(mockFetch).toHaveBeenCalled()
    const [, init] = mockFetch.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.chatOptions.selectedModel).toBe('llama3.1-8B')
    expect(body.chatOptions.systemPrompt).toBe('Be brief.')
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }])
  })
})
