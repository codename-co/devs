import { OpenAIProvider } from './openai'
import { LLMConfig } from '@/types'
import { LLMConfigWithTools, stripModelPrefix } from '../types'
import { LLMMessage, LLMResponseWithTools } from '../index'
import { BRIDGE_URL } from '@/config/bridge'
import type { NormalizedModel } from '@/lib/models-dev/types'

// =============================================================================
// Types
// =============================================================================

/** Copilot session token returned by the token exchange endpoint. */
interface CopilotToken {
  token: string
  expires_at: number // Unix timestamp in seconds
}

/** Model entry from the Copilot /models endpoint. */
interface CopilotModel {
  id: string
  name?: string
  version?: string
  capabilities?: {
    family?: string
    type?: string
    limits?: {
      max_prompt_tokens?: number
      max_output_tokens?: number
    }
    supports?: {
      tool_calls?: boolean
      streaming?: boolean
      parallel_tool_calls?: boolean
    }
  }
  publisher?: string
  supported_input_modalities?: string[]
  supported_output_modalities?: string[]
  tags?: string[]
}

// =============================================================================
// Provider
// =============================================================================

/**
 * GitHub Copilot LLM Provider.
 *
 * Uses the GitHub Copilot Chat API (OpenAI-compatible).
 *
 * Authentication:
 *   1. User authenticates via OAuth device flow → gets a GitHub OAuth token (gho_...)
 *   2. The OAuth token is exchanged for a short-lived Copilot session token
 *      via GET api.github.com/copilot_internal/v2/token
 *   3. The Copilot token is used with api.githubcopilot.com/chat/completions
 *
 * The device flow MUST use a Copilot-authorized OAuth App client_id
 * (default: VS Code Copilot extension's public client_id Iv1.b507a08c87ecfe98)
 * so that the token exchange endpoint accepts the resulting token.
 */
export class GitHubCopilotProvider extends OpenAIProvider {
  protected override baseUrl = `${BRIDGE_URL}/api/github-copilot-api`
  private static readonly COPILOT_DEFAULT_MODEL = 'gpt-4o'

  /** Required headers for all Copilot API calls */
  private static readonly COPILOT_HEADERS = {
    'Editor-Version': 'vscode/1.99.0',
    'Editor-Plugin-Version': 'copilot/1.999.0',
    'User-Agent': 'GithubCopilot/1.999.0',
  }

  /** Token exchange endpoint (proxied for CORS) */
  private static readonly TOKEN_URL = `${BRIDGE_URL}/api/github-api/copilot_internal/v2/token`

  /** Cached Copilot session token per OAuth token */
  private static cachedTokens: Map<string, CopilotToken> = new Map()

  /** Cached models list (avoids re-fetching on every render) */
  private static modelsCache: {
    models: CopilotModel[]
    expiresAt: number
  } | null = null

  // ---------------------------------------------------------------------------
  // Token resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve the API token to use with the Copilot API.
   *
   * - ghu_ tokens (from VS Code/GitHub App): exchanged via copilot_internal
   * - github_pat_ tokens (fine-grained PATs): used directly
   * - gho_ tokens (OAuth): attempt exchange, fall back to direct
   */
  static async resolveToken(inputToken: string): Promise<string> {
    // Check cache
    const cached = GitHubCopilotProvider.cachedTokens.get(inputToken)
    if (cached && cached.expires_at > Date.now() / 1000 + 60) {
      return cached.token
    }

    // Fine-grained PATs work directly — no exchange needed
    if (inputToken.startsWith('github_pat_')) {
      return inputToken
    }

    // ghu_ tokens and gho_ tokens: try the exchange
    return GitHubCopilotProvider.getCopilotToken(inputToken)
  }

  // ---------------------------------------------------------------------------
  // Token exchange
  // ---------------------------------------------------------------------------

  /**
   * Exchange a GitHub OAuth token (gho_...) for a short-lived Copilot
   * session token. Cached and auto-refreshed when expired.
   */
  static async getCopilotToken(oauthToken: string): Promise<string> {
    // Return cached token if still valid (with 60s safety buffer)
    const cached = GitHubCopilotProvider.cachedTokens.get(oauthToken)
    if (cached && cached.expires_at > Date.now() / 1000 + 60) {
      return cached.token
    }

    console.log('[COPILOT] Exchanging OAuth token for Copilot session token...', {
      tokenPrefix: oauthToken.substring(0, 8) + '...',
      endpoint: GitHubCopilotProvider.TOKEN_URL,
    })

    const response = await fetch(GitHubCopilotProvider.TOKEN_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        Accept: 'application/json',
        ...GitHubCopilotProvider.COPILOT_HEADERS,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[COPILOT] Token exchange failed:', {
        status: response.status,
        body,
      })
      if (response.status === 404) {
        throw new Error(
          'Copilot token exchange returned 404. ' +
            'This usually means: (1) no active Copilot subscription for this account, ' +
            '(2) SAML SSO org hasn\u2019t authorized the Copilot OAuth App, or ' +
            '(3) the credential was created with a non-Copilot OAuth App. ' +
            'Try removing this provider and signing in again.',
        )
      }
      throw new Error(
        `Copilot token exchange failed (${response.status}): ${body}`,
      )
    }

    const data: CopilotToken = await response.json()
    console.log('[COPILOT] Token exchange successful, expires at:', new Date(data.expires_at * 1000).toISOString())
    GitHubCopilotProvider.cachedTokens.set(oauthToken, data)
    return data.token
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  override async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const copilotToken = config?.apiKey
      ? await GitHubCopilotProvider.resolveToken(config.apiKey)
      : undefined

    return super.chat(messages, {
      ...config,
      apiKey: copilotToken,
      baseUrl: config?.baseUrl || this.baseUrl,
      model: stripModelPrefix(
        config?.model,
        GitHubCopilotProvider.COPILOT_DEFAULT_MODEL,
      ),
    })
  }

  override async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const copilotToken = config?.apiKey
      ? await GitHubCopilotProvider.resolveToken(config.apiKey)
      : undefined

    yield* super.streamChat(messages, {
      ...config,
      apiKey: copilotToken,
      baseUrl: config?.baseUrl || this.baseUrl,
      model: stripModelPrefix(
        config?.model,
        GitHubCopilotProvider.COPILOT_DEFAULT_MODEL,
      ),
    })
  }

  override async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const token = await GitHubCopilotProvider.resolveToken(apiKey)
      const response = await fetch(`${BRIDGE_URL}/api/github-copilot-api/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...GitHubCopilotProvider.COPILOT_HEADERS,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------------
  // Models listing
  // ---------------------------------------------------------------------------

  /**
   * Get available models from the Copilot API.
   * Respects Copilot Business org policies.
   */
  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    const models = await GitHubCopilotProvider.fetchModels(config?.apiKey)
    return models.map((m) => m.id)
  }

  /**
   * Get detailed model information as a NormalizedModel.
   * Used by the ModelSelector for tooltips with capabilities and limits.
   */
  static async getModelInfo(
    modelId: string,
    oauthToken?: string,
  ): Promise<NormalizedModel | null> {
    const models = await GitHubCopilotProvider.fetchModels(oauthToken)
    const model = models.find((m) => m.id === modelId)
    if (!model) return null
    return GitHubCopilotProvider.toNormalizedModel(model)
  }

  /** Fetch models from api.githubcopilot.com/models with 10-min cache. */
  private static async fetchModels(
    oauthToken?: string,
  ): Promise<CopilotModel[]> {
    if (
      GitHubCopilotProvider.modelsCache &&
      GitHubCopilotProvider.modelsCache.expiresAt > Date.now()
    ) {
      return GitHubCopilotProvider.modelsCache.models
    }

    try {
      const copilotToken = oauthToken
        ? await GitHubCopilotProvider.resolveToken(oauthToken)
        : undefined

      const response = await fetch(
        `${BRIDGE_URL}/api/github-copilot-api/models`,
        {
          method: 'GET',
          headers: {
            ...(copilotToken
              ? { Authorization: `Bearer ${copilotToken}` }
              : {}),
            Accept: 'application/json',
            ...GitHubCopilotProvider.COPILOT_HEADERS,
          },
        },
      )

      if (!response.ok) return []

      const data = await response.json()
      const models: CopilotModel[] = data.data || data || []

      GitHubCopilotProvider.modelsCache = {
        models,
        expiresAt: Date.now() + 10 * 60 * 1000,
      }

      return models
    } catch {
      return []
    }
  }

  // ---------------------------------------------------------------------------
  // NormalizedModel conversion
  // ---------------------------------------------------------------------------

  private static toNormalizedModel(model: CopilotModel): NormalizedModel {
    const caps = model.capabilities
    const supports = caps?.supports
    const limits = caps?.limits
    const inputModalities = model.supported_input_modalities || ['text']
    const outputModalities = model.supported_output_modalities || ['text']

    const hasVision =
      inputModalities.includes('image') ||
      /vision|4o|4\.1|gpt-5/i.test(model.id)

    const hasReasoning = /^o\d|reasoning|deepseek-r/i.test(model.id)

    return {
      id: model.id,
      name: model.name || model.id,
      providerId: 'github-copilot',
      providerName: `GitHub Copilot${model.publisher ? ` · ${model.publisher}` : ''}`,
      family: caps?.family || model.id.split('/')[0],
      pricing: {
        inputPerMillion: 0,
        outputPerMillion: 0,
      },
      limits: {
        contextWindow: limits?.max_prompt_tokens || 0,
        maxInput: limits?.max_prompt_tokens || undefined,
        maxOutput: limits?.max_output_tokens || 0,
      },
      capabilities: {
        vision: hasVision,
        tools: supports?.tool_calls ?? false,
        reasoning: hasReasoning,
        structuredOutput: false,
        attachments: hasVision,
        audio: inputModalities.includes('audio'),
      },
      modalities: {
        input: inputModalities,
        output: outputModalities,
      },
      metadata: {
        releaseDate: '',
        lastUpdated: '',
        openWeights: false,
        status: undefined,
      },
    }
  }
}
