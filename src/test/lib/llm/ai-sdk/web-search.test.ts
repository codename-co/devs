/**
 * Regression: provider-native web search grounding must actually reach the
 * model and its results must reach the caller.
 *
 * Two things regressed silently during the AI SDK migration (REPORT §4
 * Phase 3):
 *  1. Only the Google binding ever looked at `config.enableWebSearch` — the
 *     Anthropic binding documented `web_search` support (see
 *     `lib/llm/types.ts`) but never registered the tool, so Claude had no way
 *     to search the web at all.
 *  2. Even when a provider *did* search (Google), the AI SDK adapter never
 *     turned `result.sources` into `GroundingMetadata` / the
 *     `__GROUNDING_METADATA__` stream marker `chat.ts` expects, so citations
 *     were silently dropped.
 *
 * These tests drive `AiSdkProvider` against a fake `LanguageModelV4` (same
 * technique as `chatjimmy-parity.test.ts`) so they exercise the real
 * `adapter.ts` tool-merging / source-extraction logic without depending on
 * the exact Anthropic wire format.
 */
import { describe, it, expect } from 'vitest'
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Usage,
} from '@ai-sdk/provider'
import { AiSdkProvider } from '@/lib/llm/ai-sdk/adapter'
import { anthropicBinding } from '@/lib/llm/ai-sdk/bindings'
import type { AiSdkBinding, FullConfig } from '@/lib/llm/ai-sdk/adapter'
import type { LLMMessage } from '@/lib/llm'

const USAGE: LanguageModelV4Usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
}

const messages: LLMMessage[] = [
  { role: 'user', content: 'quelle sera la météo demain à Palaiseau ?' },
]

describe('anthropicBinding.providerTools', () => {
  it('registers the native web_search tool only when enableWebSearch is set', async () => {
    const withSearch = await anthropicBinding.providerTools!({
      enableWebSearch: true,
    } as FullConfig)
    expect(withSearch).toBeDefined()
    expect(Object.keys(withSearch!)).toEqual(['web_search'])

    const withoutSearch = await anthropicBinding.providerTools!(
      {} as FullConfig,
    )
    expect(withoutSearch).toBeUndefined()
  })
})

describe('AiSdkProvider — provider-executed web search (chat)', () => {
  /** A fake model whose `doGenerate` returns a server-executed web_search
   *  tool call + its source, mirroring what @ai-sdk/anthropic normalizes
   *  Claude's `server_tool_use` / `web_search_tool_result` blocks into. */
  function fakeSearchModel(): LanguageModelV4 {
    return {
      specificationVersion: 'v4',
      provider: 'fake-anthropic',
      modelId: 'fake-claude',
      supportedUrls: {},
      async doGenerate(_options: LanguageModelV4CallOptions) {
        return {
          content: [
            {
              type: 'tool-call' as const,
              toolCallId: 'srvtoolu_1',
              toolName: 'web_search',
              input: JSON.stringify({ query: 'météo demain Palaiseau' }),
              providerExecuted: true,
            },
            {
              type: 'source' as const,
              sourceType: 'url' as const,
              id: 'src_1',
              url: 'https://meteofrance.com/meteo-france/palaiseau-91120',
              title: 'Météo Palaiseau demain - Météo France',
            },
            {
              type: 'text' as const,
              text: 'Demain à Palaiseau : ciel nuageux, 14°C.',
            },
          ],
          finishReason: { unified: 'stop' as const, raw: 'end_turn' },
          usage: USAGE,
          warnings: [],
        }
      },
      async doStream() {
        throw new Error('not used in this test')
      },
    }
  }

  function fakeBinding(): AiSdkBinding {
    return {
      defaultModel: 'fake-claude',
      createModel: () => Promise.resolve(fakeSearchModel()),
      // The fake model ignores tool defs and always "searches" — using the
      // real Anthropic factory here just proves a valid provider-defined tool
      // survives `generateText`'s tool validation end to end.
      providerTools: async (config: FullConfig) => {
        if (!config.enableWebSearch) return undefined
        const { anthropic } = await import('@ai-sdk/anthropic')
        return { web_search: anthropic.tools.webSearch_20250305() }
      },
    }
  }

  it('surfaces grounding metadata and drops the provider-executed tool call', async () => {
    const provider = new AiSdkProvider(() => Promise.resolve(fakeBinding()))
    const result = await provider.chat(messages, { enableWebSearch: true })

    expect(result.content).toContain('Palaiseau')
    // The web_search call ran server-side — DEVS must not see it as a
    // pending tool call requiring client execution.
    expect(result.tool_calls).toBeUndefined()
    expect(result.finish_reason).toBe('stop')
    expect(result.groundingMetadata).toEqual({
      isGrounded: true,
      webResults: [
        {
          title: 'Météo Palaiseau demain - Météo France',
          url: 'https://meteofrance.com/meteo-france/palaiseau-91120',
        },
      ],
    })
  })

  it('does not request the tool when enableWebSearch is unset', async () => {
    let seenConfig: FullConfig | undefined
    const binding: AiSdkBinding = {
      defaultModel: 'fake-claude',
      createModel: () => Promise.resolve(fakeSearchModel()),
      providerTools: async (config: FullConfig) => {
        seenConfig = config
        if (!config.enableWebSearch) return undefined
        const { anthropic } = await import('@ai-sdk/anthropic')
        return { web_search: anthropic.tools.webSearch_20250305() }
      },
    }
    const provider = new AiSdkProvider(() => Promise.resolve(binding))
    await provider.chat(messages, {})

    expect(seenConfig?.enableWebSearch).toBeFalsy()
  })
})
