import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class OllamaProvider implements LLMProviderInterface {
  private getBaseUrl(config?: Partial<LLMConfig>): string {
    return config?.baseUrl || 'http://localhost:11434'
  }

  private convertMessageToOllamaFormat(message: LLMMessage): any {
    let content = message.content

    // If there are attachments, append them to the content
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach((attachment) => {
        if (attachment.type === 'image') {
          // For images, we'll include them as base64 with description
          // Note: Ollama's support for images depends on the model
          content += `\n\n--- Image: ${attachment.name} ---\n[Image data: ${attachment.mimeType}]\ndata:${attachment.mimeType};base64,${attachment.data}\n--- End of ${attachment.name} ---\n\n`
        } else if (attachment.type === 'text') {
          // For text files, decode and include the content
          const fileContent = atob(attachment.data) // Decode base64 text files
          content += `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`
        } else {
          // For document files, include them with description
          const fileContent = `[Document: ${attachment.name} (${attachment.mimeType})]`
          content += `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`
        }
      })
    }

    return {
      role: message.role,
      content: content,
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const baseUrl = this.getBaseUrl(config)

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model || 'llama2',
        messages: messages.map((msg) => this.convertMessageToOllamaFormat(msg)),
        stream: false,
        options: {
          temperature: config?.temperature || 0.7,
          num_predict: config?.maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    return {
      content: data.message.content,
      usage:
        data.prompt_eval_count && data.eval_count
          ? {
              promptTokens: data.prompt_eval_count,
              completionTokens: data.eval_count,
              totalTokens: data.prompt_eval_count + data.eval_count,
            }
          : undefined,
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const baseUrl = this.getBaseUrl(config)

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model || 'llama2',
        messages: messages.map((msg) => this.convertMessageToOllamaFormat(msg)),
        stream: true,
        options: {
          temperature: config?.temperature || 0.7,
          num_predict: config?.maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${response.statusText} - ${error}`)
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
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.message?.content) {
              yield parsed.message.content
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    // Ollama doesn't require API keys, but we can check if the server is running
    // For Ollama, if an API key is provided, it's actually a custom base URL
    try {
      const baseUrl =
        apiKey && apiKey !== 'ollama-no-key' ? apiKey : 'http://localhost:11434'
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
      })

      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(config?: Partial<LLMConfig>): Promise<string[]> {
    try {
      const baseUrl = this.getBaseUrl(config)
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch {
      return []
    }
  }
}
