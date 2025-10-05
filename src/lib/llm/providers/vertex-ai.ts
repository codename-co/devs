import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class VertexAIProvider implements LLMProviderInterface {
  public static readonly DEFAULT_MODEL = 'gemini-2.5-flash'

  private getEndpoint(config?: Partial<LLMConfig>): string {
    // Vertex AI requires location and project ID in the URL
    // Format: https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL:predict
    if (config?.baseUrl) {
      return config.baseUrl
    }

    // Extract location and project from API key (expected format: LOCATION:PROJECT_ID:API_KEY)
    const parts = config?.apiKey?.split(':') || []
    if (parts.length >= 2) {
      const [location, projectId] = parts
      return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`
    }

    throw new Error(
      'Vertex AI requires location and project ID. Use format: LOCATION:PROJECT_ID:API_KEY',
    )
  }

  private getApiKey(config?: Partial<LLMConfig>): string {
    // Extract actual API key from composite format
    const parts = config?.apiKey?.split(':') || []
    return parts[parts.length - 1] || ''
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const endpoint = this.getEndpoint(config)
    const apiKey = this.getApiKey(config)
    const model = config?.model || VertexAIProvider.DEFAULT_MODEL

    // Convert messages to Vertex AI format
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }))

    const response = await fetch(
      `${endpoint}/publishers/google/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
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
        }),
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

    return {
      content: data.candidates[0].content.parts[0].text,
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
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const endpoint = this.getEndpoint(config)
    const apiKey = this.getApiKey(config)
    const model = config?.model || VertexAIProvider.DEFAULT_MODEL

    // Convert messages to Vertex AI format
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }))

    const response = await fetch(
      `${endpoint}/publishers/google/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config?.temperature || 0.7,
            maxOutputTokens: config?.maxTokens,
            candidateCount: 1,
          },
        }),
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
            if (
              parsed.candidates &&
              parsed.candidates[0]?.content?.parts[0]?.text
            ) {
              yield parsed.candidates[0].content.parts[0].text
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Parse the composite API key
      const parts = apiKey.split(':')
      if (parts.length < 3) {
        return false
      }

      const [location, projectId, actualKey] = parts
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}`

      // Try to list available models
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${actualKey}`,
        },
      })

      // 403 means auth failed, 404 might mean wrong project/location but auth is valid
      return response.ok || response.status === 404
    } catch {
      return false
    }
  }
}
