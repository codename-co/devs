import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import {
  pipeline,
  env,
  TextGenerationPipeline,
  TextStreamer,
} from '@huggingface/transformers'
import { inspectAllCaches, startCacheMonitoring } from '../cache-debug'
import { convertMessagesToTextOnlyFormat } from '../attachment-processor'

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
  // Cache for available models to avoid repeated HuggingFace API calls
  private static cachedModels: string[] | null = null
  private static modelsPromise: Promise<string[]> | null = null

  // Default model, optimized for browser inference
  public static readonly DEFAULT_MODEL =
    'onnx-community/granite-4.0-350m-ONNX-web'
  // isLowEndDevice()
  //   ? 'onnx-community/granite-4.0-350m-ONNX-web'
  //   : 'onnx-community/granite-4.0-micro-ONNX-web'

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

    const generator = await pipeline('text-generation', modelName, {
      device: 'webgpu',
      // dtype: 'q4f16',
      // dtype: 'fp16',
      progress_callback: (progress: any) => {
        LocalLLMProvider.progressCallback?.({
          status: progress.status || 'downloading',
          loaded: progress.loaded,
          total: progress.total,
          progress: progress.progress,
        })
      },
    })

    LocalLLMProvider.progressCallback?.({
      status: 'ready',
      progress: 100,
    })

    return generator
  }

  /**
   * Format messages using the tokenizer's chat template or a fallback template
   * Uses text-only conversion for attachment handling
   */
  private async formatMessages(
    messages: LLMMessage[],
    tokenizer: any,
  ): Promise<string> {
    // Convert to text-only format (handles attachments)
    const textMessages = await convertMessagesToTextOnlyFormat(messages)

    try {
      // Try to use the tokenizer's built-in chat template
      const formatted = tokenizer.apply_chat_template(textMessages, {
        tokenize: false,
        add_generation_prompt: true,
      })
      return formatted
    } catch (error) {
      // Fallback: Use a simple chat template compatible with most models
      // This template is based on common instruction-following model formats
      const chatTemplate = `{% for message in messages %}{% if message['role'] == 'system' %}<|system|>
{{ message['content'] }}</s>
{% elif message['role'] == 'user' %}<|user|>
{{ message['content'] }}</s>
{% elif message['role'] == 'assistant' %}<|assistant|>
{{ message['content'] }}</s>
{% endif %}{% endfor %}{% if add_generation_prompt %}<|assistant|>
{% endif %}`

      return tokenizer.apply_chat_template(textMessages, {
        tokenize: false,
        add_generation_prompt: true,
        chat_template: chatTemplate,
      })
    }
  }

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const generator = await this.getPipeline(config?.model)

    // Format messages using the tokenizer's chat template (with attachment processing)
    const prompt = await this.formatMessages(messages, generator.tokenizer)

    const result = await generator(prompt, {
      max_new_tokens: config?.maxTokens || 512,
      temperature: config?.temperature || 0.7,
      do_sample: true,
      top_k: 50,
      top_p: 0.95,
    })

    // Extract generated text
    const response =
      Array.isArray(result) &&
      result[0] &&
      typeof result[0] === 'object' &&
      'generated_text' in result[0]
        ? (result[0] as any).generated_text
        : typeof result === 'object' && result && 'generated_text' in result
          ? (result as any).generated_text
          : ''

    return {
      content: response,
      usage: {
        promptTokens: NaN, // TODO: Not available
        completionTokens: response.length / 4, // Rough estimate
        totalTokens: NaN, // TODO: Not available
      },
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const generator = await this.getPipeline(config?.model)

    // Format messages using the tokenizer's chat template (with attachment processing)
    const prompt = await this.formatMessages(messages, generator.tokenizer)

    // Collect chunks from the streamer
    const chunks: string[] = []
    let chunkIndex = 0

    // Create text streamer with callback
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (text) => {
        chunks.push(text)
      },
    })

    // Start generation in background
    const generationPromise = generator(prompt, {
      max_new_tokens: config?.maxTokens || 512,
      temperature: config?.temperature || 0.7,
      do_sample: true,
      top_k: 50,
      top_p: 0.95,
      streamer,
    })

    // Yield chunks as they become available
    while (true) {
      if (chunkIndex < chunks.length) {
        yield chunks[chunkIndex]
        chunkIndex++
      } else {
        // Check if generation is complete
        const status = await Promise.race([
          generationPromise.then(() => 'done'),
          new Promise((resolve) => setTimeout(() => resolve('pending'), 10)),
        ])

        if (status === 'done' && chunkIndex >= chunks.length) {
          break
        }
      }
    }

    // Ensure generation completes
    await generationPromise
  }

  async validateApiKey(_apiKey: string): Promise<boolean> {
    // Local models don't require API keys
    // Always return true to indicate the provider is available
    return true
  }

  async getAvailableModels(): Promise<string[]> {
    // Return cached models if available
    if (LocalLLMProvider.cachedModels) {
      return LocalLLMProvider.cachedModels
    }

    // If a fetch is already in progress, wait for it
    if (LocalLLMProvider.modelsPromise) {
      return LocalLLMProvider.modelsPromise
    }

    // Start a new fetch and cache the promise
    LocalLLMProvider.modelsPromise = this.fetchAvailableModels()

    try {
      const models = await LocalLLMProvider.modelsPromise
      LocalLLMProvider.cachedModels = models
      return models
    } finally {
      LocalLLMProvider.modelsPromise = null
    }
  }

  private async fetchAvailableModels(): Promise<string[]> {
    try {
      // Fetch models from HuggingFace API filtered by onnx-community and transformers.js
      const response = await fetch(
        'https://huggingface.co/api/models?author=onnx-community&library=transformers.js&limit=1000',
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const models = await response.json()

      // Extract model IDs and filter for text generation models
      // We look for models with 'text-generation' or similar tasks
      const textGenModels = models
        .filter((model: any) => {
          // Include models that are likely text generation models
          const pipeline = model.pipeline_tag
          const modelId = model.modelId || model.id || ''

          // Include text generation, text2text-generation, and similar tasks
          // Also include models that don't have a pipeline tag but have common naming patterns
          return (
            pipeline === 'text-generation' ||
            pipeline === 'text2text-generation' ||
            (!pipeline &&
              (modelId.toLowerCase().includes('qwen') ||
                modelId.toLowerCase().includes('phi') ||
                modelId.toLowerCase().includes('granite') ||
                modelId.toLowerCase().includes('gemma') ||
                modelId.toLowerCase().includes('gpt')))
          )
        })
        .map((model: any) => model.modelId || model.id)
        .filter(Boolean)

      // Always include the default model first if it exists
      const defaultModel = LocalLLMProvider.DEFAULT_MODEL
      const modelSet = new Set(textGenModels)

      if (!modelSet.has(defaultModel)) {
        modelSet.add(defaultModel)
      }

      // Convert to array with default model first
      const result = [
        defaultModel,
        ...(Array.from(modelSet).filter((m) => m !== defaultModel) as string[]),
      ]

      return result.length > 0 ? result : [defaultModel]
    } catch (error) {
      console.error('Failed to fetch models from HuggingFace:', error)
      // Fallback to default models list
      return [
        LocalLLMProvider.DEFAULT_MODEL,
        'onnx-community/Phi-3.5-mini-instruct-ONNX-web',
        'onnx-community/Qwen3-0.6B-ONNX',
        'onnx-community/gemma-3-270m-it-ONNX',
      ]
    }
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
