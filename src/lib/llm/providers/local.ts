import { LLMProviderInterface, LLMMessage, LLMResponse } from '../index'
import { LLMConfig } from '@/types'
import type { TextGenerationPipeline } from '@huggingface/transformers'
import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai'
import { getHuggingFaceHost, configureTransformersHost } from '@/lib/huggingface'
import { inspectAllCaches, startCacheMonitoring } from '../cache-debug'
import { convertMessagesToTextOnlyFormat } from '../attachment-processor'

/**
 * Registry mapping local model IDs to their LiteRT .task file URLs.
 * These models use MediaPipe GenAI for inference instead of transformers.js + ONNX,
 * because their QAT quantization (q2f16 / 2-bit) is not supported by ONNX Runtime.
 * The MediaPipe WASM runtime handles all QAT bit-widths natively.
 */
const LITERT_MODEL_REGISTRY: Record<string, string> = {
  'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX':
    'https://huggingface.co/huggingworld/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task',
  'huggingworld/gemma-4-E2B-it-litert-lm':
    'https://huggingface.co/huggingworld/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task',
}

// The `@huggingface/transformers` runtime (WebGPU/WASM, tens of MB) must never
// land in the boot graph (REPORT §4 Phase 1). It is dynamically imported and
// configured once, lazily, the first time a local model is actually used.
type TransformersModule = typeof import('@huggingface/transformers')
let transformersPromise: Promise<TransformersModule> | null = null

async function ensureTransformers(): Promise<TransformersModule> {
  if (!transformersPromise) {
    transformersPromise = import('@huggingface/transformers').then((mod) => {
      const { env } = mod

      // Configure transformers.js for browser environment with persistent caching
      env.allowLocalModels = false
      env.allowRemoteModels = true

      // Rely on the browser's built-in HTTP cache for large files; small files
      // (<200MB) are cached by the service worker in the Cache API.
      env.useBrowserCache = true
      env.useFSCache = false // Disable FS cache (not applicable in browser)
      configureTransformersHost()

      // Configure WASM backend
      if (env.backends.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = 1
        env.backends.onnx.wasm.proxy = false
      }

      console.log('[LOCAL-LLM] 🔧 Cache configuration:', {
        useBrowserCache: env.useBrowserCache,
        useFSCache: env.useFSCache,
        note: 'Large files (>100MB) will use browser HTTP cache',
      })

      return mod
    })
  }
  return transformersPromise
}

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
 * Local AI provider using transformers.js and WebGPU
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
  // When true, bypass WebGPU and use WASM backend (set after WebGPU runtime failure)
  private static useWasmFallback = false

  // Default model, optimized for browser inference
  // Default model. Uses MediaPipe GenAI + LiteRT (.task) for inference — the QAT
  // quantization (2-bit / q2f16) is not supported by ONNX Runtime but is handled
  // natively by the MediaPipe WASM runtime, making it ideal for lower-end devices.
  // See LITERT_MODEL_REGISTRY for the .task URL this ID resolves to.
  public static readonly DEFAULT_MODEL = 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX'
  // Alternatives (all use transformers.js + ONNX):
  // 'onnx-community/gemma-4-E2B-it-ONNX'       — non-QAT, q4f16, ~1.1 GB
  // 'onnx-community/Qwen3.5-0.8B-ONNX'
  // 'onnx-community/granite-4.0-350m-ONNX-web'

  // ---- MediaPipe GenAI state (LiteRT models only) ----
  private static mediaPipeInference: LlmInference | null = null
  private static currentLiteRTModel: string | null = null
  private static mediaPipeLoadingPromise: Promise<LlmInference> | null = null

  // Progress callback for model loading
  private static progressCallback:
    | ((progress: {
        status: string
        loaded?: number
        total?: number
        progress?: number
        modelName?: string
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
      modelName?: string
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
   * Detect GPU buffer allocation / runtime errors from ONNX Runtime WebGPU backend.
   * These occur when a tensor size overflows or exceeds the device's maxBufferSize.
   */
  private static isGpuBufferError(error: unknown): boolean {
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : String(error)
    return (
      msg.includes('createBuffer') ||
      msg.includes('unsigned long long') ||
      msg.includes('maxBufferSize') ||
      msg.includes('GPUBufferDescriptor') ||
      msg.includes('GPUDevice')
    )
  }

  /**
   * Returns true when a model ID is served via MediaPipe GenAI + LiteRT (.task)
   * rather than transformers.js + ONNX.
   */
  static isLiteRTModel(modelName: string): boolean {
    return modelName in LITERT_MODEL_REGISTRY
  }

  /**
   * Format a messages array into a Gemma 4 instruction-tuning prompt string.
   * MediaPipe's LlmInference.generateResponse() takes a raw string, so we
   * apply the turn-marker template here instead of relying on a tokenizer.
   *
   * Gemma 4 IT format:
   *   <start_of_turn>user\n{content}<end_of_turn>\n
   *   <start_of_turn>model\n{content}<end_of_turn>\n   (for prior turns)
   *   <start_of_turn>model\n                          (generation prompt)
   */
  private formatMessagesForLiteRT(messages: LLMMessage[]): string {
    let prompt = ''
    // Collect system instructions to prepend into the first user turn
    const systemParts: string[] = []
    const conversationMessages: LLMMessage[] = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(typeof msg.content === 'string' ? msg.content : '')
      } else {
        conversationMessages.push(msg)
      }
    }

    for (let i = 0; i < conversationMessages.length; i++) {
      const msg = conversationMessages[i]
      const content = msg.content

      const isFirstUser = msg.role === 'user' && i === 0 && systemParts.length > 0
      const text = isFirstUser ? `${systemParts.join('\n')}\n${content}` : content

      if (msg.role === 'user') {
        prompt += `<start_of_turn>user\n${text}<end_of_turn>\n`
      } else if (msg.role === 'assistant') {
        prompt += `<start_of_turn>model\n${text}<end_of_turn>\n`
      }
    }

    // Append the generation prompt
    prompt += '<start_of_turn>model\n'
    return prompt
  }

  /**
   * Load and cache a MediaPipe LlmInference instance for a LiteRT model.
   */
  private async getMediaPipeInference(modelName: string): Promise<LlmInference> {
    if (
      LocalLLMProvider.mediaPipeInference &&
      LocalLLMProvider.currentLiteRTModel === modelName
    ) {
      return LocalLLMProvider.mediaPipeInference
    }

    if (LocalLLMProvider.mediaPipeLoadingPromise) {
      return LocalLLMProvider.mediaPipeLoadingPromise
    }

    LocalLLMProvider.mediaPipeLoadingPromise = this.loadMediaPipeInference(modelName)
    try {
      const inference = await LocalLLMProvider.mediaPipeLoadingPromise
      LocalLLMProvider.mediaPipeInference = inference
      LocalLLMProvider.currentLiteRTModel = modelName
      return inference
    } finally {
      LocalLLMProvider.mediaPipeLoadingPromise = null
    }
  }

  /**
   * Initialise a MediaPipe GenAI LlmInference from a LiteRT .task file.
   * MediaPipe's own WASM runtime supports the QAT 2-bit quantization that
   * ONNX Runtime rejects.
   *
   * Download strategy (mirrors the reference HF space):
   *   1. Check OPFS for a cached copy (validated by a companion _size file).
   *   2. If missing/invalid, fetch from network and tee the body:
   *      one branch → MediaPipe, the other → OPFS for future use.
   *   3. Pipe the consumer branch through a TransformStream that counts bytes
   *      and fires progressCallback on every chunk.
   *   4. Pass the reader as `modelAssetBuffer` so MediaPipe streams it in.
   */
  private async loadMediaPipeInference(modelName: string): Promise<LlmInference> {
    const taskUrl = LITERT_MODEL_REGISTRY[modelName]
    if (!taskUrl) {
      throw new Error(`No LiteRT .task URL registered for model "${modelName}"`)
    }

    const fileName = taskUrl.split('/').pop()!

    LocalLLMProvider.progressCallback?.({ status: 'loading', progress: 0, modelName })
    console.log(`[LOCAL-LLM] Loading LiteRT model "${modelName}" via MediaPipe GenAI`)

    // ------------------------------------------------------------------
    // 1. Resolve a ReadableStream — OPFS cache first, then network
    // ------------------------------------------------------------------
    let modelStream: ReadableStream<Uint8Array>
    let contentLength = -1

    const opfsRoot = await navigator.storage.getDirectory().catch(() => null)

    if (opfsRoot) {
      try {
        const fileHandle = await opfsRoot.getFileHandle(fileName)
        const sizeHandle = await opfsRoot.getFileHandle(`${fileName}_size`)
        const file = await fileHandle.getFile()
        const expectedSize = parseInt(await (await sizeHandle.getFile()).text(), 10)
        if (file.size === expectedSize && expectedSize > 0) {
          console.log('[LOCAL-LLM] LiteRT model served from OPFS cache')
          modelStream = file.stream() as unknown as ReadableStream<Uint8Array>
          contentLength = file.size
        } else {
          throw new Error('OPFS size mismatch — re-downloading')
        }
      } catch {
        // Cache miss or corruption — fall through to network fetch
        modelStream = await this.fetchLiteRTWithOPFSWrite(
          taskUrl,
          fileName,
          opfsRoot,
          (len) => { contentLength = len },
        )
      }
    } else {
      // OPFS unavailable (e.g. private browsing) — plain network fetch
      const response = await fetch(taskUrl)
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download LiteRT model: ${response.status} ${response.statusText}`)
      }
      contentLength = Number(response.headers.get('Content-Length')) || -1
      modelStream = response.body
    }

    // ------------------------------------------------------------------
    // 2. Wrap with a progress-reporting TransformStream
    // ------------------------------------------------------------------
    let bytesRead = 0
    const progressTransform = new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        bytesRead += chunk.length
        LocalLLMProvider.progressCallback?.({
          status: 'downloading',
          loaded: bytesRead,
          total: contentLength > 0 ? contentLength : undefined,
          progress:
            contentLength > 0 ? Math.round((bytesRead / contentLength) * 100) : undefined,
          modelName,
        })
        controller.enqueue(chunk)
      },
    })
    const trackedStream = modelStream.pipeThrough(progressTransform)

    // ------------------------------------------------------------------
    // 3. Load via MediaPipe GenAI
    // ------------------------------------------------------------------
    const genaiFileset = await FilesetResolver.forGenAiTasks('/wasm/mediapipe-genai')

    const inference = await LlmInference.createFromOptions(genaiFileset, {
      baseOptions: { modelAssetBuffer: trackedStream.getReader() },
      maxTokens: 2048,
      topK: 40,
      temperature: 0.7,
      randomSeed: 101,
    })

    LocalLLMProvider.progressCallback?.({ status: 'ready', progress: 100, modelName })
    return inference
  }

  /**
   * Fetch a LiteRT .task file from the network, tee the body so that
   * one branch is written to OPFS in the background while the other is
   * returned to the caller for immediate consumption.
   */
  private async fetchLiteRTWithOPFSWrite(
    url: string,
    fileName: string,
    opfsRoot: FileSystemDirectoryHandle,
    onContentLength: (len: number) => void,
  ): Promise<ReadableStream<Uint8Array>> {
    // HEAD request to learn the expected size before streaming
    let expectedSize = -1
    try {
      const head = await fetch(url, { method: 'HEAD' })
      expectedSize = Number(head.headers.get('Content-Length'))
      if (isNaN(expectedSize) || expectedSize <= 0) expectedSize = -1
    } catch {
      // best-effort
    }
    onContentLength(expectedSize)

    console.log('[LOCAL-LLM] Fetching LiteRT model from network and caching to OPFS')
    const response = await fetch(url)
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download LiteRT model from ${url}: ${response.status} ${response.statusText}`)
    }

    // Tee: consumer stream → MediaPipe; cache stream → OPFS
    const [streamForConsumer, streamForCache] = response.body.tee()

    // Write to OPFS in the background (non-blocking)
    ;(async () => {
      try {
        const fileHandle = await opfsRoot.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()

        // Count bytes through the cache branch so we know the exact written size
        // without depending on Content-Length (which HuggingFace CDN may omit).
        let bytesWritten = 0
        const counter = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            bytesWritten += chunk.length
            controller.enqueue(chunk)
          },
        })
        await streamForCache.pipeThrough(counter).pipeTo(writable)

        // Write _size AFTER the model is fully written—it acts as a
        // "write complete" flag. If the process is interrupted before this
        // point the model file won't have a companion _size file and will
        // be treated as a cache miss on the next load.
        const sizeHandle = await opfsRoot.getFileHandle(`${fileName}_size`, { create: true })
        const sw = await sizeHandle.createWritable()
        await sw.write(new TextEncoder().encode(String(bytesWritten)))
        await sw.close()

        console.log(`[LOCAL-LLM] LiteRT model cached to OPFS as "${fileName}" (${bytesWritten} bytes)`)
      } catch (err) {
        console.error('[LOCAL-LLM] Failed to cache LiteRT model to OPFS:', err)
        // Clean up partial files so the next load triggers a fresh download
        try { await opfsRoot.removeEntry(fileName) } catch { /* ignore */ }
        try { await opfsRoot.removeEntry(`${fileName}_size`) } catch { /* ignore */ }
      }
    })()

    return streamForConsumer
  }

  /**
   * Detect unsupported quantization bit-width errors from the WebGPU ONNX Runtime backend.
   * The WebGPU GatherBlockQuantized kernel only supports 4-bit and 8-bit weights;
   * models quantized to 2-bit (q2f16) will hit this at session-creation time.
   * The fix is to retry with the WASM backend, which has no such restriction.
   */
  private static isQuantizationError(error: unknown): boolean {
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : String(error)
    return (
      msg.includes("bits_ == 4 || bits_ == 8") ||
      msg.includes("'bits' must be 4 or 8") ||
      msg.includes('GatherBlockQuantized')
    )
  }

  /**
   * Detect memory allocation errors (e.g., ArrayBuffer too large for the browser).
   * This happens when a model's weight file exceeds the browser's memory limits.
   */
  private static isMemoryAllocationError(error: unknown): boolean {
    if (error instanceof RangeError) {
      const msg = error.message.toLowerCase()
      return (
        msg.includes('array buffer allocation failed') ||
        msg.includes('invalid array buffer length') ||
        msg.includes('out of memory')
      )
    }
    return false
  }

  /**
   * Determine the best dtype for a model based on its name and WebGPU device limits.
   * ONNX-web models are pre-quantized and should use q4f16 to avoid GPU buffer overflow.
   * Falls back to fp16 for other models, then fp32 as last resort.
   */
  private static getDtypeForModel(
    modelName: string,
  ):
    | 'q4'
    | 'q4f16'
    | 'q2f16'
    | 'q8'
    | 'fp16'
    | 'fp32'
    | Record<string, 'q2f16' | 'q4f16' | 'fp16' | 'fp32'> {
    const lower = modelName.toLowerCase()

    // ONNX-web models are pre-quantized for browser inference — always use q4f16
    if (lower.includes('onnx-web') || lower.includes('onnx_web')) {
      return 'q4f16'
    }

    // Bonsai models — use q4 (smallest supported quant: 1067MB for 1.7B)
    if (lower.includes('bonsai')) {
      return 'q4'
    }

    // LFM2.5 (Liquid) — use q4f16 for smallest download (243MB)
    if (lower.includes('lfm')) {
      return 'q4f16'
    }

    // Gemma 4 QAT mobile — use q4f16 (4-bit is the minimum ONNX Runtime supports;
    // q2f16 causes a GatherBlockQuantized bits_ assertion in both WebGPU and WASM backends)
    if (lower.includes('gemma') && lower.includes('qat') && lower.includes('mobile')) {
      return 'q4f16'
    }

    // Gemma 4 (non-QAT) — use q4f16 quantization
    if (lower.includes('gemma') && lower.includes('4') && lower.includes('e2b')) {
      return 'q4f16'
    }

    // Gemma 270m — use q4f16 for smallest download (260MB)
    if (lower.includes('gemma') && lower.includes('270m')) {
      return 'q4f16'
    }

    // For ONNX community models, choose dtype based on model size
    // Models > ~500M params in fp16 can exceed browser ArrayBuffer limits
    if (lower.includes('onnx')) {
      // Detect large models (≥1B params) by common naming conventions
      const sizeMatch = lower.match(/(\d+(?:\.\d+)?)(b|m)/)
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1])
        const unit = sizeMatch[2]
        const paramsInM = unit === 'b' ? size * 1000 : size
        // Models ≥ 500M params: use q4f16 to keep files under browser memory limits
        if (paramsInM >= 500) {
          return 'q4f16'
        }
      }
      return 'fp16'
    }

    // Default to fp16 for WebGPU — fp32 often exceeds maxBufferSize
    return 'fp16'
  }

  /**
   * Load the model pipeline with progress tracking.
   * Uses WebGPU by default, falls back to WASM if WebGPU previously failed at runtime.
   */
  private async loadPipeline(
    modelName: string,
  ): Promise<TextGenerationPipeline> {
    if (LocalLLMProvider.progressCallback) {
      LocalLLMProvider.progressCallback({
        status: 'loading',
        progress: 0,
        modelName,
      })
    }

    const dtype = LocalLLMProvider.getDtypeForModel(modelName)
    const device = LocalLLMProvider.useWasmFallback ? 'wasm' : 'webgpu'
    console.log(
      `[LOCAL-LLM] Loading model "${modelName}" with dtype: ${typeof dtype === 'string' ? dtype : JSON.stringify(dtype)}, device: ${device}`,
    )

    try {
      const { pipeline } = await ensureTransformers()
      const generator = await pipeline('text-generation', modelName, {
        device,
        dtype,
        progress_callback: (progress: any) => {
          LocalLLMProvider.progressCallback?.({
            status: progress.status || 'downloading',
            loaded: progress.loaded,
            total: progress.total,
            progress: progress.progress,
            modelName,
          })
        },
      })

      LocalLLMProvider.progressCallback?.({
        status: 'ready',
        progress: 100,
        modelName,
      })

      return generator
    } catch (error: unknown) {
      // If memory allocation fails, the model is too large for this browser/device
      if (LocalLLMProvider.isMemoryAllocationError(error)) {
        console.error(
          `[LOCAL-LLM] Model "${modelName}" is too large for browser memory (dtype: ${dtype}). ` +
            'Try a smaller model or a quantized variant (e.g., an ONNX-web model).',
        )
        LocalLLMProvider.progressCallback?.({
          status: 'error',
          progress: 0,
          modelName,
        })
        throw new Error(
          `Model "${modelName}" is too large to load in the browser. ` +
            'The model weights exceed the maximum memory that can be allocated. ' +
            'Please choose a smaller model or a quantized variant (look for models ending in "-ONNX-web").',
        )
      }

      // If WebGPU loading itself fails, try WASM fallback automatically
      if (
        !LocalLLMProvider.useWasmFallback &&
        LocalLLMProvider.isGpuBufferError(error)
      ) {
        console.warn(
          `[LOCAL-LLM] WebGPU loading failed for "${modelName}", retrying with WASM backend...`,
        )
        LocalLLMProvider.useWasmFallback = true
        return this.loadPipeline(modelName)
      }

      // WebGPU ONNX Runtime only supports 4-bit and 8-bit quantization; q2f16 (2-bit)
      // models will fail with a GatherBlockQuantized bits error. WASM handles all widths.
      if (
        !LocalLLMProvider.useWasmFallback &&
        LocalLLMProvider.isQuantizationError(error)
      ) {
        console.warn(
          `[LOCAL-LLM] WebGPU does not support 2-bit quantization for "${modelName}". ` +
            'Retrying with WASM backend...',
        )
        LocalLLMProvider.useWasmFallback = true
        return this.loadPipeline(modelName)
      }

      // Both backends exhausted — quantization width is unsupported everywhere
      if (LocalLLMProvider.isQuantizationError(error)) {
        throw new Error(
          `Model "${modelName}" uses a quantization bit-width (e.g. 2-bit) that is not ` +
            'supported by ONNX Runtime in this browser. Please choose a different model ' +
            'or a variant with 4-bit or 8-bit quantization (e.g. a model ending in "-ONNX-web").',
        )
      }

      throw error
    }
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
    try {
      return await this._executeChatInference(messages, config)
    } catch (error: unknown) {
      // If WebGPU fails at inference time, automatically retry with WASM
      if (
        !LocalLLMProvider.useWasmFallback &&
        LocalLLMProvider.isGpuBufferError(error)
      ) {
        console.warn(
          '[LOCAL-LLM] WebGPU inference failed with GPU buffer error. ' +
            'Falling back to WASM backend and retrying...',
        )
        LocalLLMProvider.useWasmFallback = true
        await LocalLLMProvider.unload()
        return this._executeChatInference(messages, config)
      }
      throw error
    }
  }

  private async _executeChatInference(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const modelName = config?.model || LocalLLMProvider.DEFAULT_MODEL

    // ---- MediaPipe / LiteRT path ----
    if (LocalLLMProvider.isLiteRTModel(modelName)) {
      const inference = await this.getMediaPipeInference(modelName)
      const prompt = this.formatMessagesForLiteRT(messages)
      const response = await inference.generateResponse(prompt)
      return {
        content: response.trim(),
        usage: {
          promptTokens: NaN,
          completionTokens: response.length / 4,
          totalTokens: NaN,
        },
      }
    }

    // ---- transformers.js / ONNX path ----
    const generator = await this.getPipeline(modelName)

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
    let response =
      Array.isArray(result) &&
      result[0] &&
      typeof result[0] === 'object' &&
      'generated_text' in result[0]
        ? (result[0] as any).generated_text
        : typeof result === 'object' && result && 'generated_text' in result
          ? (result as any).generated_text
          : ''

    // Strip the prompt from the response (generated_text includes the input prompt)
    if (response.startsWith(prompt)) {
      response = response.slice(prompt.length)
    }

    // Clean up any trailing special tokens
    const stopTokens = [
      '<|endoftext|>',
      '</s>',
      '<|end|>',
      '<|eot_id|>',
      '<|assistant|>',
      '<|user|>',
      '<|system|>',
    ]
    for (const token of stopTokens) {
      const tokenIndex = response.indexOf(token)
      if (tokenIndex !== -1) {
        response = response.slice(0, tokenIndex)
      }
    }

    return {
      content: response.trim(),
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
    try {
      yield* this._executeStreamInference(messages, config)
    } catch (error: unknown) {
      // If WebGPU fails at inference time, automatically retry with WASM
      if (
        !LocalLLMProvider.useWasmFallback &&
        LocalLLMProvider.isGpuBufferError(error)
      ) {
        console.warn(
          '[LOCAL-LLM] WebGPU streaming failed with GPU buffer error. ' +
            'Falling back to WASM backend and retrying...',
        )
        LocalLLMProvider.useWasmFallback = true
        await LocalLLMProvider.unload()
        yield* this._executeStreamInference(messages, config)
      } else {
        throw error
      }
    }
  }

  private async *_executeStreamInference(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>,
  ): AsyncIterableIterator<string> {
    const modelName = config?.model || LocalLLMProvider.DEFAULT_MODEL

    // ---- MediaPipe / LiteRT path ----
    if (LocalLLMProvider.isLiteRTModel(modelName)) {
      const inference = await this.getMediaPipeInference(modelName)
      const prompt = this.formatMessagesForLiteRT(messages)

      const chunks: string[] = []
      let chunkIndex = 0
      let generationComplete = false

      // Kick off generation; progressListener fires synchronously from WASM
      const responsePromise = inference.generateResponse(
        prompt,
        (partial: string, done: boolean) => {
          if (partial) chunks.push(partial)
          if (done) generationComplete = true
        },
      )

      // Yield chunks as they arrive from the callback
      while (!generationComplete || chunkIndex < chunks.length) {
        if (chunkIndex < chunks.length) {
          yield chunks[chunkIndex++]
        } else {
          await new Promise<void>((resolve) => setTimeout(resolve, 10))
        }
      }
      // Drain any final chunks that arrived in the last tick
      while (chunkIndex < chunks.length) {
        yield chunks[chunkIndex++]
      }

      await responsePromise
      return
    }

    // ---- transformers.js / ONNX path ----
    const generator = await this.getPipeline(modelName)

    // Format messages using the tokenizer's chat template (with attachment processing)
    const prompt = await this.formatMessages(messages, generator.tokenizer)

    // Collect chunks from the streamer
    const chunks: string[] = []
    let chunkIndex = 0

    // Create text streamer with callback
    const { TextStreamer } = await ensureTransformers()
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
        `${getHuggingFaceHost()}/api/models?author=onnx-community&library=transformers.js&limit=1000`,
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
                modelId.toLowerCase().includes('bonsai') ||
                modelId.toLowerCase().includes('lfm') ||
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
        'onnx-community/gemma-4-E2B-it-ONNX',
        'onnx-community/gemma-3-270m-it-ONNX',
        'onnx-community/granite-4.0-350m-ONNX-web',
        'onnx-community/Bonsai-1.7B-ONNX',
        'onnx-community/Qwen3-0.6B-ONNX',
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
    // Also release any MediaPipe LiteRT inference instance
    LocalLLMProvider.mediaPipeInference?.close()
    LocalLLMProvider.mediaPipeInference = null
    LocalLLMProvider.currentLiteRTModel = null
    LocalLLMProvider.mediaPipeLoadingPromise = null
  }
}
