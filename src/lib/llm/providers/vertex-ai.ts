import {
  LLMProviderInterface,
  LLMMessage,
  LLMResponseWithTools,
} from '../index'
import { LLMConfig } from '@/types'
import {
  processAttachments,
  formatTextAttachmentContent,
  getUnsupportedDocumentMessage,
} from '../attachment-processor'
import { isPdf } from '../../document-converter'
import { ToolCall, ToolDefinition, LLMConfigWithTools } from '../types'

/**
 * Google Cloud Service Account JSON key structure
 */
interface ServiceAccountKey {
  type: 'service_account'
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
  universe_domain?: string
}

/**
 * Cache for access tokens to avoid regenerating on every request
 */
interface TokenCache {
  accessToken: string
  expiresAt: number
}

export class VertexAIProvider implements LLMProviderInterface {
  public static readonly DEFAULT_MODEL = 'gemini-2.5-flash'

  private tokenCache: Map<string, TokenCache> = new Map()

  /**
   * Detect if the API key is a JSON service account key
   */
  private isJsonKey(apiKey?: string): boolean {
    if (!apiKey) return false
    const trimmed = apiKey.trim()
    return trimmed.startsWith('{') && trimmed.includes('"type"')
  }

  /**
   * Parse JSON service account key
   */
  private parseJsonKey(apiKey: string): ServiceAccountKey {
    try {
      const key = JSON.parse(apiKey.trim())
      if (key.type !== 'service_account') {
        throw new Error(
          'Invalid service account key: type must be "service_account"',
        )
      }
      if (!key.project_id || !key.private_key || !key.client_email) {
        throw new Error(
          'Invalid service account key: missing required fields (project_id, private_key, client_email)',
        )
      }
      return key as ServiceAccountKey
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format for service account key')
      }
      throw error
    }
  }

  /**
   * Create a JWT for Google OAuth 2.0
   */
  private async createJwt(serviceAccount: ServiceAccountKey): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const expiry = now + 3600 // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    }

    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    }

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    const signatureInput = `${encodedHeader}.${encodedPayload}`

    // Sign with the private key using Web Crypto API
    const signature = await this.signWithPrivateKey(
      signatureInput,
      serviceAccount.private_key,
    )

    return `${signatureInput}.${signature}`
  }

  /**
   * Base64URL encode a string
   */
  private base64UrlEncode(str: string): string {
    const base64 = btoa(unescape(encodeURIComponent(str)))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Base64URL encode a Uint8Array
   */
  private base64UrlEncodeBytes(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Sign data with RSA private key using Web Crypto API
   */
  private async signWithPrivateKey(
    data: string,
    privateKeyPem: string,
  ): Promise<string> {
    // Remove PEM headers and convert to binary
    const pemContents = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
      .replace(/-----END RSA PRIVATE KEY-----/g, '')
      .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign'],
    )

    // Sign the data
    const encoder = new TextEncoder()
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(data),
    )

    return this.base64UrlEncodeBytes(new Uint8Array(signature))
  }

  /**
   * Exchange JWT for access token
   */
  private async exchangeJwtForAccessToken(
    jwt: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get access token: ${error}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    }
  }

  /**
   * Get access token from service account key (with caching)
   */
  private async getAccessTokenFromServiceAccount(
    serviceAccount: ServiceAccountKey,
  ): Promise<string> {
    const cacheKey = serviceAccount.client_email

    // Check cache
    const cached = this.tokenCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now() + 60000) {
      // 1 minute buffer
      return cached.accessToken
    }

    // Generate new token
    const jwt = await this.createJwt(serviceAccount)
    const { accessToken, expiresIn } = await this.exchangeJwtForAccessToken(jwt)

    // Cache the token
    this.tokenCache.set(cacheKey, {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    })

    return accessToken
  }

  /**
   * Get endpoint and auth info based on API key format
   */
  private async getAuthInfo(config?: Partial<LLMConfig>): Promise<{
    endpoint: string
    accessToken: string
  }> {
    const apiKey = config?.apiKey || ''

    if (this.isJsonKey(apiKey)) {
      // JSON service account key
      const serviceAccount = this.parseJsonKey(apiKey)
      const accessToken =
        await this.getAccessTokenFromServiceAccount(serviceAccount)

      // Default to us-central1 if no baseUrl specified
      const location = 'us-central1'
      const endpoint =
        config?.baseUrl ||
        `https://${location}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${location}`

      return { endpoint, accessToken }
    } else {
      // Legacy format: LOCATION:PROJECT_ID:API_KEY
      const parts = apiKey.split(':')
      if (parts.length < 3) {
        throw new Error(
          'Vertex AI requires either:\n' +
            '1. A JSON service account key (paste the entire JSON), or\n' +
            '2. Format: LOCATION:PROJECT_ID:ACCESS_TOKEN',
        )
      }

      const [location, projectId, ...tokenParts] = parts
      const accessToken = tokenParts.join(':') // In case token has colons
      const endpoint =
        config?.baseUrl ||
        `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`

      return { endpoint, accessToken }
    }
  }

  /**
   * Convert OpenAI tool format to Gemini/Vertex AI tool format
   */
  private convertToolsToGeminiFormat(tools: ToolDefinition[]): any[] {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        })),
      },
    ]
  }

  /**
   * Convert Gemini function call response to OpenAI tool_calls format
   */
  private convertFunctionCallsToToolCalls(parts: any[]): ToolCall[] {
    const toolCalls: ToolCall[] = []
    for (const part of parts) {
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${toolCalls.length}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          },
        })
      }
    }
    return toolCalls
  }

  /**
   * Convert message to Vertex AI format with attachment handling
   * Vertex AI (Gemini models) supports images and PDFs natively; Word docs are converted to text
   */
  private async convertMessageToVertexFormat(
    message: LLMMessage,
  ): Promise<any> {
    const parts: any[] = []

    if (message.attachments && message.attachments.length > 0) {
      // Process attachments (converts Word docs to text)
      const processedAttachments = await processAttachments(message.attachments)

      for (const attachment of processedAttachments) {
        if (attachment.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else if (
          attachment.type === 'document' &&
          isPdf(attachment.mimeType)
        ) {
          // PDFs are supported natively by Vertex AI (Gemini)
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else if (attachment.type === 'text') {
          // Text content from converted documents
          parts.push({
            text: formatTextAttachmentContent(attachment),
          })
        } else if (attachment.type === 'document') {
          // Unsupported document formats
          parts.push({
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
      }
    }

    if (message.content.trim()) {
      parts.push({ text: message.content })
    }

    return {
      role: message.role === 'assistant' ? 'model' : message.role,
      parts: parts.length > 0 ? parts : [{ text: '' }],
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const { endpoint, accessToken } = await this.getAuthInfo(config)
    const model = config?.model || VertexAIProvider.DEFAULT_MODEL

    // Convert messages to Vertex AI format (may involve async document conversion)
    const contents = await Promise.all(
      messages.map((msg) => this.convertMessageToVertexFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens,
        candidateCount: 1,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    }

    // Add tools if provided (convert to Gemini format)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = this.convertToolsToGeminiFormat(config.tools)
    }

    const response = await fetch(
      `${endpoint}/publishers/google/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Vertex AI')
    }

    const candidate = data.candidates[0]
    const parts = candidate.content?.parts || []

    // Extract text content
    let content = ''
    for (const part of parts) {
      if (part.text) {
        content += part.text
      }
    }

    // Extract function calls as tool_calls
    const toolCalls = this.convertFunctionCallsToToolCalls(parts)

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      finish_reason:
        candidate.finishReason === 'STOP'
          ? 'stop'
          : candidate.finishReason === 'MAX_TOKENS'
            ? 'length'
            : toolCalls.length > 0
              ? 'tool_calls'
              : 'stop',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): AsyncIterableIterator<string> {
    const { endpoint, accessToken } = await this.getAuthInfo(config)
    const model = config?.model || VertexAIProvider.DEFAULT_MODEL

    // Convert messages to Vertex AI format (may involve async document conversion)
    const contents = await Promise.all(
      messages.map((msg) => this.convertMessageToVertexFormat(msg)),
    )

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens,
        candidateCount: 1,
      },
    }

    // Add tools if provided (convert to Gemini format)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = this.convertToolsToGeminiFormat(config.tools)
    }

    const response = await fetch(
      `${endpoint}/publishers/google/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI API error: ${response.statusText} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    // Accumulate function calls
    const accumulatedToolCalls: ToolCall[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.slice(6).trim()

          try {
            const parsed = JSON.parse(data)
            const parts = parsed.candidates?.[0]?.content?.parts || []

            for (const part of parts) {
              // Handle text content
              if (part.text) {
                yield part.text
              }

              // Handle function calls
              if (part.functionCall) {
                accumulatedToolCalls.push({
                  id: `call_${accumulatedToolCalls.length}`,
                  type: 'function',
                  function: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args || {}),
                  },
                })
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Yield accumulated tool calls at the end
    if (accumulatedToolCalls.length > 0) {
      yield `\n__TOOL_CALLS__${JSON.stringify(accumulatedToolCalls)}`
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Check if it's a JSON service account key
      if (this.isJsonKey(apiKey)) {
        try {
          const serviceAccount = this.parseJsonKey(apiKey)
          // Try to get an access token - this validates the key
          await this.getAccessTokenFromServiceAccount(serviceAccount)
          return true
        } catch {
          return false
        }
      }

      // Legacy format: LOCATION:PROJECT_ID:ACCESS_TOKEN
      const parts = apiKey.split(':')
      if (parts.length < 3) {
        return false
      }

      const [location, projectId, ...tokenParts] = parts
      const accessToken = tokenParts.join(':')
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`

      // Try to list available models
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      // 403 means auth failed, 404 might mean wrong project/location but auth is valid
      return response.ok || response.status === 404
    } catch {
      return false
    }
  }
}
