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
import {
  ToolCall,
  ToolDefinition,
  LLMConfigWithTools,
  stripModelPrefix,
} from '../types'

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
  private static readonly ANTHROPIC_VERSION = 'vertex-2023-10-16'

  private tokenCache: Map<string, TokenCache> = new Map()

  /**
   * Gets the model ID with provider prefix stripped.
   */
  private getModelId(modelWithPrefix: string | undefined): string {
    return stripModelPrefix(modelWithPrefix, VertexAIProvider.DEFAULT_MODEL)
  }

  /**
   * Check if the model is an Anthropic model (Claude)
   */
  private isAnthropicModel(model: string): boolean {
    return model.startsWith('claude')
  }

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
   * @param config - LLM configuration
   * @param model - The model being used (needed to determine correct region)
   */
  private async getAuthInfo(
    config?: Partial<LLMConfig>,
    model?: string,
  ): Promise<{
    endpoint: string
    accessToken: string
  }> {
    const apiKey = config?.apiKey || ''

    // Anthropic models require specific regions - default to us-east5
    // Global region does NOT support Anthropic models
    const isAnthropic = model && this.isAnthropicModel(model)
    const defaultLocation = isAnthropic ? 'us-east5' : 'global'

    if (this.isJsonKey(apiKey)) {
      // JSON service account key
      const serviceAccount = this.parseJsonKey(apiKey)
      const accessToken =
        await this.getAccessTokenFromServiceAccount(serviceAccount)

      const location = defaultLocation
      // Anthropic models require regional endpoint: ${location}-aiplatform.googleapis.com
      // Gemini models use the base endpoint: aiplatform.googleapis.com
      const hostname = isAnthropic
        ? `${location}-aiplatform.googleapis.com`
        : 'aiplatform.googleapis.com'
      const endpoint =
        config?.baseUrl ||
        `https://${hostname}/v1/projects/${serviceAccount.project_id}/locations/${location}`

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
      // Anthropic models require regional endpoint: ${location}-aiplatform.googleapis.com
      // Gemini models use the base endpoint: aiplatform.googleapis.com
      const hostname = isAnthropic
        ? `${location}-aiplatform.googleapis.com`
        : 'aiplatform.googleapis.com'
      const endpoint =
        config?.baseUrl ||
        `https://${hostname}/v1/projects/${projectId}/locations/${location}`

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

  /**
   * Convert message to Anthropic format for Vertex AI
   * Anthropic via Vertex uses the standard Anthropic message format
   */
  private async convertMessageToAnthropicFormat(
    message: LLMMessage,
  ): Promise<any> {
    const content: any[] = []

    if (message.attachments && message.attachments.length > 0) {
      const processedAttachments = await processAttachments(message.attachments)

      for (const attachment of processedAttachments) {
        if (attachment.type === 'image') {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else if (
          attachment.type === 'document' &&
          isPdf(attachment.mimeType)
        ) {
          // PDFs supported natively by Claude
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.data,
            },
          })
        } else if (attachment.type === 'text') {
          content.push({
            type: 'text',
            text: formatTextAttachmentContent(attachment),
          })
        } else if (attachment.type === 'document') {
          content.push({
            type: 'text',
            text: getUnsupportedDocumentMessage(attachment),
          })
        }
      }
    }

    if (message.content.trim()) {
      content.push({ type: 'text', text: message.content })
    }

    return {
      role: message.role,
      content:
        content.length === 1 && content[0].type === 'text'
          ? content[0].text
          : content.length > 0
            ? content
            : '',
    }
  }

  /**
   * Convert OpenAI tool format to Anthropic tool format
   */
  private convertToolsToAnthropicFormat(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }))
  }

  /**
   * Make a chat request to Anthropic via Vertex AI
   */
  private async chatAnthropic(
    messages: LLMMessage[],
    config: (Partial<LLMConfig> & LLMConfigWithTools) | undefined,
    endpoint: string,
    accessToken: string,
    model: string,
  ): Promise<LLMResponseWithTools> {
    // Extract system message if present
    let systemMessage: string | undefined
    const filteredMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        systemMessage = msg.content
        return false
      }
      return true
    })

    // Convert messages to Anthropic format
    const anthropicMessages = await Promise.all(
      filteredMessages.map((msg) => this.convertMessageToAnthropicFormat(msg)),
    )

    // Build request body in Anthropic format
    const requestBody: Record<string, unknown> = {
      anthropic_version: VertexAIProvider.ANTHROPIC_VERSION,
      messages: anthropicMessages,
      max_tokens: config?.maxTokens || 4096,
    }

    if (config?.temperature !== undefined) {
      requestBody.temperature = config.temperature
    }

    if (systemMessage) {
      requestBody.system = systemMessage
    }

    // Add tools if provided (Anthropic format)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(config.tools)
    }

    const response = await fetch(
      `${endpoint}/publishers/anthropic/models/${model}:rawPredict`,
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
      throw new Error(
        `Vertex AI (Anthropic) API error: ${response.statusText} - ${error}`,
      )
    }

    const data = await response.json()

    // Parse Anthropic response format
    let content = ''
    const toolCalls: ToolCall[] = []

    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          content += block.text
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input || {}),
            },
          })
        }
      }
    }

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      finish_reason:
        data.stop_reason === 'end_turn'
          ? 'stop'
          : data.stop_reason === 'max_tokens'
            ? 'length'
            : data.stop_reason === 'tool_use'
              ? 'tool_calls'
              : 'stop',
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens:
              (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
        : undefined,
    }
  }

  /**
   * Stream chat from Anthropic via Vertex AI
   */
  private async *streamChatAnthropic(
    messages: LLMMessage[],
    config: (Partial<LLMConfig> & LLMConfigWithTools) | undefined,
    endpoint: string,
    accessToken: string,
    model: string,
  ): AsyncIterableIterator<string> {
    // Extract system message if present
    let systemMessage: string | undefined
    const filteredMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        systemMessage = msg.content
        return false
      }
      return true
    })

    // Convert messages to Anthropic format
    const anthropicMessages = await Promise.all(
      filteredMessages.map((msg) => this.convertMessageToAnthropicFormat(msg)),
    )

    // Build request body in Anthropic format
    const requestBody: Record<string, unknown> = {
      anthropic_version: VertexAIProvider.ANTHROPIC_VERSION,
      messages: anthropicMessages,
      max_tokens: config?.maxTokens || 4096,
      stream: true,
    }

    if (config?.temperature !== undefined) {
      requestBody.temperature = config.temperature
    }

    if (systemMessage) {
      requestBody.system = systemMessage
    }

    // Add tools if provided (Anthropic format)
    if (config?.tools && config.tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(config.tools)
    }

    const response = await fetch(
      `${endpoint}/publishers/anthropic/models/${model}:streamRawPredict`,
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
      throw new Error(
        `Vertex AI (Anthropic) API error: ${response.statusText} - ${error}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    const accumulatedToolCalls: ToolCall[] = []
    let currentToolUse: { id: string; name: string; input: string } | null =
      null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            // Handle different event types from Anthropic streaming
            if (parsed.type === 'content_block_start') {
              if (parsed.content_block?.type === 'tool_use') {
                currentToolUse = {
                  id: parsed.content_block.id,
                  name: parsed.content_block.name,
                  input: '',
                }
              }
            } else if (parsed.type === 'content_block_delta') {
              if (parsed.delta?.type === 'text_delta') {
                yield parsed.delta.text
              } else if (
                parsed.delta?.type === 'input_json_delta' &&
                currentToolUse
              ) {
                currentToolUse.input += parsed.delta.partial_json || ''
              }
            } else if (parsed.type === 'content_block_stop') {
              if (currentToolUse) {
                accumulatedToolCalls.push({
                  id: currentToolUse.id,
                  type: 'function',
                  function: {
                    name: currentToolUse.name,
                    arguments: currentToolUse.input || '{}',
                  },
                })
                currentToolUse = null
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

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig> & LLMConfigWithTools,
  ): Promise<LLMResponseWithTools> {
    const model = this.getModelId(config?.model)
    const { endpoint, accessToken } = await this.getAuthInfo(config, model)

    // Route to Anthropic handler if using Claude models
    if (this.isAnthropicModel(model)) {
      return this.chatAnthropic(messages, config, endpoint, accessToken, model)
    }

    // Extract system message for Gemini (must be separate from contents)
    let systemInstruction: string | undefined
    const filteredMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        // Combine multiple system messages if present
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n\n${msg.content}`
          : msg.content
        return false
      }
      return true
    })

    // Convert messages to Vertex AI format (may involve async document conversion)
    const contents = await Promise.all(
      filteredMessages.map((msg) => this.convertMessageToVertexFormat(msg)),
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

    // Add system instruction if present
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      }
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
    const model = this.getModelId(config?.model)
    const { endpoint, accessToken } = await this.getAuthInfo(config, model)

    // Route to Anthropic handler if using Claude models
    if (this.isAnthropicModel(model)) {
      yield* this.streamChatAnthropic(
        messages,
        config,
        endpoint,
        accessToken,
        model,
      )
      return
    }

    // Extract system message for Gemini (must be separate from contents)
    let systemInstruction: string | undefined
    const filteredMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        // Combine multiple system messages if present
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n\n${msg.content}`
          : msg.content
        return false
      }
      return true
    })

    // Convert messages to Vertex AI format (may involve async document conversion)
    const contents = await Promise.all(
      filteredMessages.map((msg) => this.convertMessageToVertexFormat(msg)),
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

    // Add system instruction if present
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      }
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
      const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`

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
