import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'

export class OllamaProvider implements LLMProviderInterface {
  private getBaseUrl(config?: Partial<LLMConfig>): string {
    return config?.baseUrl || 'http://localhost:11434'
  }

  private convertMessageToOllamaFormat(message: LLMMessage): any {
    let content = message.content
    const images: string[] = []

    // If there are attachments, handle them appropriately
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach((attachment) => {
        if (attachment.type === 'image') {
          // Ollama supports images array for multimodal models (e.g., llava, bakllava)
          images.push(attachment.data) // Raw base64 without data URL prefix
        } else if (attachment.type === 'text') {
          // For text files, decode and include the content
          try {
            const fileContent = atob(attachment.data)
            content += `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`
          } catch {
            content += `\n\n[File: ${attachment.name} (${attachment.mimeType}) - could not decode]\n\n`
          }
        } else if (attachment.type === 'document') {
          // For documents like PDFs, Ollama doesn't have native support
          // Include as a note - user should use a multimodal model or external tool
          content += `\n\n[Document attached: ${attachment.name} (${attachment.mimeType}) - Note: Ollama does not natively support PDF parsing. Consider using a vision model with document images or extracting text first.]\n\n`
        }
      })
    }

    const result: any = {
      role: message.role,
      content: content,
    }

    // Add images array if we have image attachments
    if (images.length > 0) {
      result.images = images
    }

    return result
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
