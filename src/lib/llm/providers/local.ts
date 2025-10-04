import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import {
  pipeline,
  env,
  TextGenerationPipeline,
} from '@huggingface/transformers'
import { inspectAllCaches, startCacheMonitoring } from '../cache-debug'

// Configure transformers.js for browser environment with persistent caching
env.allowLocalModels = false
env.allowRemoteModels = true

// Configure caching - rely on browser's built-in HTTP cache for large files
// Small files (<200MB) will be cached by service worker in Cache API
// Large files will use browser's HTTP disk cache
env.useBrowserCache = true
env.useFSCache = false // Disable FS cache (not applicable in browser)

// Configure WASM backend
if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1
  env.backends.onnx.wasm.proxy = false
}

// Log cache configuration
console.log('[LOCAL-LLM] 🔧 Cache configuration:', {
  useBrowserCache: env.useBrowserCache,
  useFSCache: env.useFSCache,
  note: 'Large files (>100MB) will use browser HTTP cache',
})

// Expose debugging utilities globally in development
if (typeof window !== 'undefined') {
  ;(window as any).inspectTransformersCache = inspectAllCaches
  ;(window as any).startCacheMonitoring = startCacheMonitoring
  console.log('💡 Debugging utilities available:')
  console.log(
    '  - window.inspectTransformersCache() - Inspect all browser caches',
  )
  console.log('  - window.startCacheMonitoring() - Monitor cache operations')
}

/**
 * Local LLM provider using transformers.js and WebGPU
 * Runs models entirely in the browser without server dependencies
 */
export class LocalLLMProvider implements LLMProviderInterface {
  private static pipeline: TextGenerationPipeline | null = null
  private static currentModel: string | null = null
  private static isLoading = false
  private static loadingPromise: Promise<TextGenerationPipeline> | null = null

  // Default model: Granite-4.0 Micro optimized for browser inference
  private static readonly DEFAULT_MODEL =
    'onnx-community/granite-4.0-micro-ONNX-web'

  // Progress callback for model loading
  private static progressCallback:
    | ((progress: {
        status: string
        loaded?: number
        total?: number
        progress?: number
      }) => void)
    | null = null

  /**
   * Set a callback to receive model loading progress updates
   */
  static setProgressCallback(
    callback: (progress: {
      status: string
      loaded?: number
      total?: number
      progress?: number
    }) => void,
  ) {
    this.progressCallback = callback
  }

  /**
   * Initialize the model pipeline
   */
  private async getPipeline(
    modelName?: string,
  ): Promise<TextGenerationPipeline> {
    const targetModel = modelName || LocalLLMProvider.DEFAULT_MODEL

    // If pipeline exists and is for the same model, return it
    if (
      LocalLLMProvider.pipeline &&
      LocalLLMProvider.currentModel === targetModel
    ) {
      return LocalLLMProvider.pipeline
    }

    // If already loading, wait for that to complete
    if (LocalLLMProvider.isLoading && LocalLLMProvider.loadingPromise) {
      return LocalLLMProvider.loadingPromise
    }

    // Start loading
    LocalLLMProvider.isLoading = true
    LocalLLMProvider.loadingPromise = this.loadPipeline(targetModel)

    try {
      const newPipeline = await LocalLLMProvider.loadingPromise
      LocalLLMProvider.pipeline = newPipeline
      LocalLLMProvider.currentModel = targetModel
      return newPipeline
    } finally {
      LocalLLMProvider.isLoading = false
      LocalLLMProvider.loadingPromise = null
    }
  }

  /**
   * Load the model pipeline with progress tracking
   */
  private async loadPipeline(
    modelName: string,
  ): Promise<TextGenerationPipeline> {
    if (LocalLLMProvider.progressCallback) {
      LocalLLMProvider.progressCallback({
        status: 'loading',
        progress: 0,
      })
    }

    const pipe = await pipeline('text-generation', modelName, {
      device: 'webgpu',
      // dtype: 'fp16',
      progress_callback: (progress: any) => {
        if (LocalLLMProvider.progressCallback) {
          LocalLLMProvider.progressCallback({
            status: progress.status || 'downloading',
            loaded: progress.loaded,
            total: progress.total,
            progress: progress.progress,
          })
        }
      },
    })

    if (LocalLLMProvider.progressCallback) {
      LocalLLMProvider.progressCallback({
        status: 'ready',
        progress: 100,
      })
    }

    // Inspect cache after model loads
    console.log('🔍 Model loaded, inspecting cache...')
    setTimeout(inspectAllCaches, 1000)

    return pipe as TextGenerationPipeline
  }

  /**
   * Convert messages to a single prompt string
   */
  private messagesToPrompt(messages: LLMMessage[]): string {
    let prompt = ''

    for (const message of messages) {
      let content = message.content

      // Handle attachments
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach((attachment) => {
          if (attachment.type === 'text') {
            const fileContent = atob(attachment.data)
            content += `\n\n--- File: ${attachment.name} ---\n${fileContent}\n--- End of ${attachment.name} ---\n\n`
          } else if (attachment.type === 'image') {
            content += `\n\n[Image: ${attachment.name} - Image analysis not supported in local mode]\n\n`
          } else {
            content += `\n\n[Document: ${attachment.name} - Document parsing not supported in local mode]\n\n`
          }
        })
      }

      if (message.role === 'system') {
        prompt += `### System:\n${content}\n\n`
      } else if (message.role === 'user') {
        prompt += `### User:\n${content}\n\n`
      } else if (message.role === 'assistant') {
        prompt += `### Assistant:\n${content}\n\n`
      }
    }

    // Add final prompt for assistant response
    prompt += '### Assistant:\n'

    return prompt
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const pipe = await this.getPipeline(config?.model)
    const prompt = this.messagesToPrompt(messages)

    const result = await pipe(prompt, {
      max_new_tokens: config?.maxTokens || 512,
      temperature: config?.temperature || 0.7,
      do_sample: true,
      top_k: 50,
      top_p: 0.95,
    })

    // Extract generated text
    const generatedText =
      Array.isArray(result) &&
      result[0] &&
      typeof result[0] === 'object' &&
      'generated_text' in result[0]
        ? (result[0] as any).generated_text
        : typeof result === 'object' && result && 'generated_text' in result
          ? (result as any).generated_text
          : ''

    // Remove the prompt from the response
    const response = generatedText.replace(prompt, '').trim()

    return {
      content: response,
      usage: {
        promptTokens: prompt.length / 4, // Rough estimate
        completionTokens: response.length / 4, // Rough estimate
        totalTokens: (prompt.length + response.length) / 4,
      },
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    // For now, transformers.js doesn't support true streaming in browser
    // We'll simulate it by yielding the complete response
    const response = await this.chat(messages, config)

    // Yield the response character by character for a streaming effect
    const words = response.content.split(' ')
    for (let i = 0; i < words.length; i++) {
      yield words[i] + (i < words.length - 1 ? ' ' : '')
      // Small delay to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    // Local models don't require API keys
    // Always return true to indicate the provider is available
    return true
  }

  async getAvailableModels(): Promise<string[]> {
    // Return list of available local models
    return [
      LocalLLMProvider.DEFAULT_MODEL,
      'onnx-community/Phi-3.5-mini-instruct-ONNX-web',
    ]
  }

  /**
   * Check if the current environment supports WebGPU
   */
  static async isWebGPUSupported(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      return false
    }

    try {
      const gpu = (navigator as any).gpu
      const adapter = await gpu.requestAdapter()
      return adapter !== null
    } catch {
      return false
    }
  }

  /**
   * Unload the current model to free memory
   */
  static async unload(): Promise<void> {
    LocalLLMProvider.pipeline = null
    LocalLLMProvider.currentModel = null
    LocalLLMProvider.isLoading = false
    LocalLLMProvider.loadingPromise = null
  }
}
