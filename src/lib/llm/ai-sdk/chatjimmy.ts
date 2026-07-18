/**
 * @module lib/llm/ai-sdk/chatjimmy
 *
 * Custom AI SDK **language model** for ChatJimmy (REPORT §4 Phase 3). ChatJimmy
 * is a bespoke, unauthenticated endpoint — *not* OpenAI-compatible — so it
 * cannot ride an `@ai-sdk/*` package. Instead this implements the AI SDK
 * `LanguageModelV4` spec directly over ChatJimmy's protocol, so the provider
 * flows through the same {@link AiSdkProvider} adapter (`generateText`/
 * `streamText`) as every other standard provider.
 *
 * The module is **self-contained** (endpoint, request body, `<|stats|>` trailer
 * stripping, message mapping) so the hand-rolled `providers/chatjimmy.ts` can be
 * deleted after soak without losing the protocol.
 */
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from '@ai-sdk/provider'
import type { AiSdkBinding, AiSdkModelConfig } from './adapter'

const CHATJIMMY_BASE_URL = 'https://chatjimmy.ai/api/chat'
const DEFAULT_MODEL = 'llama3.1-8B'
const STATS_MARKER = '<|stats|>'

/** Resolve the endpoint — proxied in the browser (dev via Vite, prod via bridge). */
function getChatEndpoint(): string {
  if (typeof window !== 'undefined' && window.location) {
    return '/api/chatjimmy/chat'
  }
  return CHATJIMMY_BASE_URL
}

/** Strip ChatJimmy's `<|stats|>{…}<|/stats|>` trailer from response text. */
function stripStatsTrailer(text: string): string {
  const idx = text.indexOf(STATS_MARKER)
  return idx === -1 ? text : text.slice(0, idx)
}

/** Map the AI SDK v4 prompt to ChatJimmy's `{messages, systemPrompt}` shape. */
function promptToChatJimmy(prompt: LanguageModelV4Prompt): {
  chatMessages: Array<{ role: string; content: string }>
  systemPrompt: string
} {
  let systemPrompt = ''
  const chatMessages: Array<{ role: string; content: string }> = []
  for (const msg of prompt) {
    if (msg.role === 'system') {
      systemPrompt += (systemPrompt ? '\n' : '') + msg.content
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      const text = msg.content
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('')
      chatMessages.push({ role: msg.role, content: text })
    }
    // 'tool' role is ignored — ChatJimmy has no tool calling.
  }
  return { chatMessages, systemPrompt }
}

function buildBody(prompt: LanguageModelV4Prompt, modelId: string): string {
  const { chatMessages, systemPrompt } = promptToChatJimmy(prompt)
  return JSON.stringify({
    messages: chatMessages,
    chatOptions: { selectedModel: modelId, systemPrompt, topK: 8 },
    attachment: null,
  })
}

async function post(
  prompt: LanguageModelV4Prompt,
  modelId: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const res = await fetch(getChatEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: buildBody(prompt, modelId),
    signal,
  })
  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText)
    throw new Error(`ChatJimmy API error: ${res.statusText} - ${error}`)
  }
  return res
}

/** ChatJimmy reports no token usage — all fields are unknown. */
const UNKNOWN_USAGE: LanguageModelV4Usage = {
  inputTokens: {
    total: undefined,
    noCache: undefined,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
}

/** Build a ChatJimmy `LanguageModelV4` for the given model id. */
export function chatJimmyLanguageModel(
  modelId: string = DEFAULT_MODEL,
): LanguageModelV4 {
  return {
    specificationVersion: 'v4',
    provider: 'chatjimmy',
    modelId,
    supportedUrls: {},

    async doGenerate(options: LanguageModelV4CallOptions) {
      const res = await post(options.prompt, modelId, options.abortSignal)
      const text = stripStatsTrailer(await res.text()).trim()
      return {
        content: text ? [{ type: 'text' as const, text }] : [],
        finishReason: { unified: 'stop' as const, raw: undefined },
        usage: UNKNOWN_USAGE,
        warnings: [],
      }
    },

    async doStream(options: LanguageModelV4CallOptions) {
      const res = await post(options.prompt, modelId, options.abortSignal)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('ChatJimmy: no response body')
      const decoder = new TextDecoder()

      const stream = new ReadableStream<LanguageModelV4StreamPart>({
        async start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] })
          controller.enqueue({ type: 'text-start', id: '0' })
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = decoder.decode(value, { stream: true })
              if (!chunk) continue
              const idx = chunk.indexOf(STATS_MARKER)
              if (idx !== -1) {
                const clean = chunk.slice(0, idx)
                if (clean) {
                  controller.enqueue({ type: 'text-delta', id: '0', delta: clean })
                }
                break // stats block signals end of content
              }
              controller.enqueue({ type: 'text-delta', id: '0', delta: chunk })
            }
          } catch (error) {
            controller.enqueue({ type: 'error', error })
          }
          controller.enqueue({ type: 'text-end', id: '0' })
          controller.enqueue({
            type: 'finish',
            usage: UNKNOWN_USAGE,
            finishReason: { unified: 'stop', raw: undefined },
          })
          controller.close()
        },
      })

      return { stream }
    },
  }
}

/** Binding for the flag-gated selector. */
export const chatJimmyBinding: AiSdkBinding = {
  defaultModel: DEFAULT_MODEL,
  createModel(config: AiSdkModelConfig) {
    return Promise.resolve(chatJimmyLanguageModel(config.modelId || DEFAULT_MODEL))
  },
}
