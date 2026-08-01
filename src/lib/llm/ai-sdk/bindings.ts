/**
 * @module lib/llm/ai-sdk/bindings
 *
 * Per-provider {@link AiSdkBinding}s that back the `LLMService` facade via the
 * AI SDK (REPORT §4 Phase 3). Each binding is a few lines: build the model from
 * the right `@ai-sdk/*` package, plus the thin provider-specific bits the SDK
 * does not cover (thinking options, key validation, live model listing). This
 * **replaces** the hand-rolled `providers/*.ts` HTTP/streaming/parsing layer.
 *
 * All `@ai-sdk/*` packages are **dynamically imported** so they never enter the
 * boot graph (Phase 1 invariant).
 */
import type { LLMConfig } from '@/types'
import { getHuggingFaceRouterHost } from '@/lib/huggingface'
import type { AiSdkBinding, AiSdkModelConfig, FullConfig } from './adapter'

// ── Shared HTTP helpers (the only fetch code left in the LLM layer) ──────────

function bearer(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

/** Validate a key against an OpenAI-style `GET {base}/models`. */
async function openAiStyleValidate(
  base: string,
  apiKey?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${base}/models`, { headers: bearer(apiKey) })
    return res.ok
  } catch {
    return false
  }
}

/** List models from an OpenAI-style `GET {base}/models` (`data[].id`). */
async function openAiStyleList(
  base: string,
  apiKey?: string,
): Promise<string[]> {
  try {
    const res = await fetch(`${base}/models`, { headers: bearer(apiKey) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data ?? []).map((m: { id: string }) => m.id)
  } catch {
    return []
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Ensure an absolute URL. Users often enter local endpoints without a scheme
 * (e.g. `localhost:1234`); the legacy layer tolerated that via `fetch`, but the
 * AI SDK builds `new URL()` and throws on a scheme-less/relative base.
 */
function ensureAbsolute(url: string): string {
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  const host = u.split('/')[0].toLowerCase()
  // Prefix matches already cover a trailing `:port` (e.g. `localhost:1234`).
  const isLocal =
    /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      host,
    ) || /^\d+\.\d+\.\d+\.\d+/.test(host)
  return `${isLocal ? 'http' : 'https'}://${u}`
}

/**
 * Normalise an OpenAI-compatible base URL to an absolute, version-suffixed
 * origin — mirrors the deleted legacy `normalizeBaseUrl` (append `/v1` unless a
 * `/vN` path is already present) so existing credentials keep working.
 */
function normalizeCompatBase(raw: string): string {
  let url = trimTrailingSlash(ensureAbsolute(raw))
  if (!/\/v\d+$/.test(url)) url = `${url}/v1`
  return url
}

// ── OpenAI ───────────────────────────────────────────────────────────────

const OPENAI_BASE = 'https://api.openai.com/v1'

export const openAiBinding: AiSdkBinding = {
  defaultModel: 'gpt-5-2025-08-07',
  async createModel(config: AiSdkModelConfig) {
    const { createOpenAI } = await import('@ai-sdk/openai')
    const provider = createOpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    })
    // `.chat()` forces Chat Completions (parity with the legacy layer and broad
    // OpenAI-compatible/local support; the default factory uses the Responses API).
    return provider.chat(config.modelId)
  },
  validateApiKey: (apiKey, baseUrl) =>
    openAiStyleValidate(trimTrailingSlash(baseUrl || OPENAI_BASE), apiKey),
}

// ── Anthropic ──────────────────────────────────────────────────────────────

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

export const anthropicBinding: AiSdkBinding = {
  defaultModel: ANTHROPIC_DEFAULT_MODEL,
  async createModel(config: AiSdkModelConfig) {
    const { createAnthropic } = await import('@ai-sdk/anthropic')
    const provider = createAnthropic({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      // Required for browser (BYOK) usage — matches the legacy layer.
      headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
    })
    return provider(config.modelId)
  },
  providerOptions(config: FullConfig) {
    const anthropic: Record<string, unknown> = {}
    if (config.thinking) {
      anthropic.thinking =
        config.thinking.type === 'enabled'
          ? {
              type: 'enabled',
              budgetTokens: config.thinking.budget_tokens,
              display: 'summarized',
            }
          : { type: 'adaptive', display: 'summarized' }
    }
    if (config.effort) anthropic.effort = config.effort
    return Object.keys(anthropic).length ? { anthropic } : undefined
  },
  async providerTools(config: FullConfig) {
    if (!config.enableWebSearch) return undefined
    // Native `web_search_20250305` server tool: Anthropic runs the search
    // itself and folds the results back into the same turn, so this never
    // needs DEVS' own tool-execution loop (filtered out via `providerExecuted`).
    const { anthropic } = await import('@ai-sdk/anthropic')
    return { web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) }
  },
  async validateApiKey(apiKey) {
    // Validate on the endpoint the key is actually used with (`/v1/messages`,
    // which honours the browser-access header). What matters is whether *auth*
    // passes — not whether the specific request succeeds — so treat anything
    // that is not 401/403 as “key accepted”. This is robust against model
    // retirement (404), bad-request (400) and rate limits (429). `/v1/models`
    // is avoided: it can reject a key that `/v1/messages` accepts.
    try {
      const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: ANTHROPIC_DEFAULT_MODEL,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      })
      return res.status !== 401 && res.status !== 403
    } catch {
      return false
    }
  },
}

// ── Google (Gemini) ──────────────────────────────────────────────────────

// The legacy provider used Gemini's OpenAI-compatible endpoint for validation.
const GOOGLE_OPENAI_BASE =
  'https://generativelanguage.googleapis.com/v1beta/openai'

export const googleBinding: AiSdkBinding = {
  defaultModel: 'gemini-2.0-flash',
  async createModel(config: AiSdkModelConfig) {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
    const provider = createGoogleGenerativeAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    })
    return provider(config.modelId)
  },
  providerOptions(config: FullConfig) {
    const google: Record<string, unknown> = {}
    if (config.googleThinking) google.thinkingConfig = config.googleThinking
    if (config.enableWebSearch) google.useSearchGrounding = true
    return Object.keys(google).length ? { google } : undefined
  },
  validateApiKey: (apiKey) => openAiStyleValidate(GOOGLE_OPENAI_BASE, apiKey),
}

// ── Mistral ────────────────────────────────────────────────────────────────

const MISTRAL_BASE = 'https://api.mistral.ai/v1'

export const mistralBinding: AiSdkBinding = {
  defaultModel: 'mistral-medium',
  async createModel(config: AiSdkModelConfig) {
    const { createMistral } = await import('@ai-sdk/mistral')
    const provider = createMistral({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    })
    return provider(config.modelId)
  },
  validateApiKey: (apiKey) => openAiStyleValidate(MISTRAL_BASE, apiKey),
}

// ── OpenAI-compatible family (shared factory) ──────────────────────────────

interface CompatOptions {
  name: string
  defaultModel: string
  /** Resolve the OpenAI-compatible base URL (incl. `/v1`) from config. */
  resolveBase(config: AiSdkModelConfig): string | undefined
  /** Custom validate/list (defaults to OpenAI-style /models on resolveBase). */
  validate?(apiKey: string, baseUrl?: string): Promise<boolean>
  list?(config?: Partial<LLMConfig>): Promise<string[]>
}

/** Build an `@ai-sdk/openai-compatible` binding. */
export function makeCompatBinding(opts: CompatOptions): AiSdkBinding {
  const resolveNormalized = (config: AiSdkModelConfig): string => {
    const raw = opts.resolveBase(config)
    if (!raw) {
      throw new Error(
        `${opts.name}: a base URL is required. Set it in Settings → Providers.`,
      )
    }
    return normalizeCompatBase(raw)
  }
  return {
    defaultModel: opts.defaultModel,
    async createModel(config: AiSdkModelConfig) {
      const baseURL = resolveNormalized(config)
      const { createOpenAICompatible } = await import(
        '@ai-sdk/openai-compatible'
      )
      const provider = createOpenAICompatible({
        name: opts.name,
        baseURL,
        ...(config.apiKey ? { apiKey: config.apiKey } : {}),
      })
      return provider(config.modelId)
    },
    validateApiKey:
      opts.validate ??
      ((apiKey, baseUrl) => {
        const raw = opts.resolveBase({ apiKey, baseUrl, modelId: '' })
        return raw
          ? openAiStyleValidate(normalizeCompatBase(raw), apiKey)
          : Promise.resolve(true)
      }),
    listModels:
      opts.list ??
      ((config) => {
        const raw = opts.resolveBase({
          apiKey: config?.apiKey,
          baseUrl: config?.baseUrl,
          modelId: '',
        })
        return raw
          ? openAiStyleList(normalizeCompatBase(raw), config?.apiKey)
          : Promise.resolve([])
      }),
  }
}

const OLLAMA_DEFAULT_HOST = 'http://localhost:11434'
const LMSTUDIO_DEFAULT_HOST = 'http://localhost:1234'

export const openRouterBinding = makeCompatBinding({
  name: 'openrouter',
  defaultModel: 'openai/gpt-4o-mini',
  resolveBase: () => 'https://openrouter.ai/api/v1',
})

export const ollamaBinding = makeCompatBinding({
  name: 'ollama',
  defaultModel: 'llama3.2',
  // Raw host; `normalizeCompatBase` adds the OpenAI-compatible `/v1` suffix.
  resolveBase: (c) => c.baseUrl || OLLAMA_DEFAULT_HOST,
  // Ollama lists installed models via its native /api/tags endpoint.
  list: async (config) => {
    const host = trimTrailingSlash(
      ensureAbsolute(config?.baseUrl || OLLAMA_DEFAULT_HOST),
    )
    try {
      const res = await fetch(`${host}/api/tags`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.models ?? []).map((m: { name: string }) => m.name)
    } catch {
      return []
    }
  },
  validate: async (apiKey, baseUrl) => {
    const host = trimTrailingSlash(
      ensureAbsolute(
        baseUrl ||
          (apiKey && apiKey !== 'ollama-no-key' ? apiKey : OLLAMA_DEFAULT_HOST),
      ),
    )
    try {
      const res = await fetch(`${host}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  },
})

export const lmStudioBinding = makeCompatBinding({
  name: 'lm-studio',
  defaultModel: 'default',
  resolveBase: (c) => c.baseUrl || LMSTUDIO_DEFAULT_HOST,
})

export const openAiCompatibleBinding = makeCompatBinding({
  name: 'openai-compatible',
  defaultModel: 'default',
  resolveBase: (c) => c.baseUrl || undefined,
})

export const customBinding = makeCompatBinding({
  name: 'custom',
  defaultModel: 'default',
  resolveBase: (c) => c.baseUrl || undefined,
  validate: (apiKey) => Promise.resolve(!!apiKey),
})

export const huggingFaceBinding = makeCompatBinding({
  name: 'huggingface',
  defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
  resolveBase: () => `${getHuggingFaceRouterHost()}/v1`,
})
