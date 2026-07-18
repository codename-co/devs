/**
 * Phase 3 — LLM layer regression: the AI SDK OpenAI path must reproduce the
 * hand-rolled provider's canonical output. The golden fixtures in
 * `fixtures/golden/llm/openai-*` were recorded from the (now deleted) legacy
 * provider, so matching them proves the AI SDK adapter preserves behaviour.
 * Never loosen these assertions to force GREEN (REPORT §3.4).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiSdkProvider } from '@/lib/llm/ai-sdk/adapter'
import { openAiBinding } from '@/lib/llm/ai-sdk/bindings'
import { assertMatchesGolden } from '@/test/golden'
import type { LLMMessage } from '@/lib/llm'
import type { LLMConfig } from '@/types'
import type { LLMConfigWithTools } from '@/lib/llm/types'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function sseResponse(events: string[]): Response {
  const payload = events.map((e) => `data: ${e}\n\n`).join('') + 'data: [DONE]\n\n'
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

const BASIC_COMPLETION = {
  id: 'chatcmpl-basic',
  object: 'chat.completion',
  created: 1,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'Hello there!' },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 9, completion_tokens: 2, total_tokens: 11 },
}

const TOOL_COMPLETION = {
  id: 'chatcmpl-tools',
  object: 'chat.completion',
  created: 1,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_weather', arguments: '{"location":"Paris"}' },
          },
        ],
      },
      finish_reason: 'tool_calls',
    },
  ],
  usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
}

const STREAM_EVENTS = [
  JSON.stringify({
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'gpt-4o',
    choices: [{ index: 0, delta: { role: 'assistant', content: 'Hello' }, finish_reason: null }],
  }),
  JSON.stringify({
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'gpt-4o',
    choices: [{ index: 0, delta: { content: ' there!' }, finish_reason: null }],
  }),
  JSON.stringify({
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'gpt-4o',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  }),
]

const TOOL_DEF: LLMConfigWithTools['tools'] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the weather for a location',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string' } },
        required: ['location'],
      },
    },
  },
]

const CONFIG: Partial<LLMConfig> & LLMConfigWithTools = {
  provider: 'openai',
  model: 'openai/gpt-4o',
  apiKey: 'test-key',
  temperature: 0.7,
}

async function joinStream(it: AsyncIterableIterator<string>): Promise<string> {
  let out = ''
  for await (const chunk of it) out += chunk
  return out
}

describe('LLM regression — OpenAI (AI SDK) vs recorded legacy golden', () => {
  const mockFetch = vi.fn()
  let openai: AiSdkProvider

  beforeEach(() => {
    openai = new AiSdkProvider(() => Promise.resolve(openAiBinding))
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const messages: LLMMessage[] = [
    { role: 'system', content: 'You are concise.' },
    { role: 'user', content: 'Say hello' },
  ]

  it('chat (basic text) matches golden', async () => {
    mockFetch.mockResolvedValue(jsonResponse(BASIC_COMPLETION))
    const out = await openai.chat(messages, CONFIG)
    await assertMatchesGolden('llm/openai-chat-basic', out)
  })

  it('chat (tool call) matches golden', async () => {
    mockFetch.mockResolvedValue(jsonResponse(TOOL_COMPLETION))
    const out = await openai.chat(messages, { ...CONFIG, tools: TOOL_DEF })
    await assertMatchesGolden('llm/openai-chat-tools', out)
  })

  it('streamChat (text) matches golden', async () => {
    mockFetch.mockResolvedValue(sseResponse(STREAM_EVENTS))
    const text = await joinStream(openai.streamChat(messages, CONFIG))
    expect(text).toBe('Hello there!')
    await assertMatchesGolden('llm/openai-stream-basic', { text })
  })
})
