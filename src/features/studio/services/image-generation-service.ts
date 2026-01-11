/**
 * Image Generation Service
 *
 * Unified service for generating images across multiple AI providers.
 * Handles provider abstraction, request management, and response normalization.
 */

import {
  ImageProvider,
  ImageProviderConfig,
  ImageGenerationSettings,
  ImageGenerationRequest,
  ImageGenerationResponse,
  GeneratedImage,
  DEFAULT_IMAGE_SETTINGS,
} from '../types'
import {
  compilePrompt,
  generateNegativePrompt,
  getDimensionsFromSettings,
  normalizePrompt,
} from './prompt-compiler'

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * Interface that all image generation providers must implement
 */
export interface ImageProviderInterface {
  generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]>

  /**
   * Stream images as they are generated (optional)
   * Providers that support streaming should implement this method
   */
  streamGenerate?(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): AsyncIterable<GeneratedImage>

  validateApiKey(apiKey: string): Promise<boolean>

  getAvailableModels?(): Promise<string[]>

  /**
   * Whether this provider supports streaming
   */
  supportsStreaming?: boolean
}

// =============================================================================
// Provider Implementations
// =============================================================================

/**
 * OpenAI DALL-E Provider
 */
class OpenAIImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://api.openai.com/v1'

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const dimensions = getDimensionsFromSettings(settings)

    // DALL-E 3 supported sizes
    const size = this.getNearestDalleSize(dimensions.width, dimensions.height)

    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/images/generations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          ...(config.organizationId && {
            'OpenAI-Organization': config.organizationId,
          }),
        },
        body: JSON.stringify({
          model: config.model || 'dall-e-3',
          prompt: prompt,
          n: Math.min(settings.count, 1), // DALL-E 3 only supports n=1
          size,
          quality:
            settings.quality === 'hd' || settings.quality === 'ultra'
              ? 'hd'
              : 'standard',
          style: settings.style === 'vivid' ? 'vivid' : 'natural',
          response_format: 'b64_json',
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.statusText}`,
      )
    }

    const data = await response.json()

    return data.data.map((item: any, index: number) => ({
      id: `openai-${Date.now()}-${index}`,
      requestId: '', // Will be set by caller
      url: item.url || `data:image/png;base64,${item.b64_json}`,
      base64: item.b64_json,
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      format: 'png' as const,
      revisedPrompt: item.revised_prompt,
      createdAt: new Date(),
    }))
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  private getNearestDalleSize(width: number, height: number): string {
    // DALL-E 3 supported sizes: 1024x1024, 1792x1024, 1024x1792
    const ratio = width / height

    if (ratio > 1.5) return '1792x1024' // Landscape
    if (ratio < 0.67) return '1024x1792' // Portrait
    return '1024x1024' // Square
  }
}

/**
 * Stability AI Provider
 */
class StabilityImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://api.stability.ai/v1'

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const dimensions = getDimensionsFromSettings(settings)
    const negativePrompt = generateNegativePrompt(
      settings.negativePrompt,
      settings,
    )

    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/generation/${config.model || 'stable-diffusion-xl-1024-v1-0'}/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
          ],
          cfg_scale: settings.guidanceScale || 7,
          width: this.roundToMultiple(dimensions.width, 64),
          height: this.roundToMultiple(dimensions.height, 64),
          samples: settings.count,
          steps:
            settings.quality === 'draft'
              ? 20
              : settings.quality === 'ultra'
                ? 50
                : 30,
          seed: settings.seed,
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.message || `Stability API error: ${response.statusText}`,
      )
    }

    const data = await response.json()

    return data.artifacts.map((artifact: any, index: number) => ({
      id: `stability-${Date.now()}-${index}`,
      requestId: '',
      url: `data:image/png;base64,${artifact.base64}`,
      base64: artifact.base64,
      width: dimensions.width,
      height: dimensions.height,
      format: 'png' as const,
      seed: artifact.seed,
      createdAt: new Date(),
    }))
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user/account`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  private roundToMultiple(value: number, multiple: number): number {
    return Math.round(value / multiple) * multiple
  }
}

/**
 * Replicate Provider
 */
class ReplicateImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://api.replicate.com/v1'

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const dimensions = getDimensionsFromSettings(settings)
    const negativePrompt = generateNegativePrompt(
      settings.negativePrompt,
      settings,
    )

    // Start prediction
    const createResponse = await fetch(
      `${config.baseUrl || this.baseUrl}/predictions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${config.apiKey}`,
        },
        body: JSON.stringify({
          version: config.model || 'stability-ai/sdxl:latest',
          input: {
            prompt,
            negative_prompt: negativePrompt,
            width: dimensions.width,
            height: dimensions.height,
            num_outputs: settings.count,
            guidance_scale: settings.guidanceScale || 7.5,
            seed: settings.seed,
          },
        }),
      },
    )

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}))
      throw new Error(
        error.detail || `Replicate API error: ${createResponse.statusText}`,
      )
    }

    const prediction = await createResponse.json()

    // Poll for completion
    const result = await this.pollPrediction(prediction.id, config.apiKey)

    if (result.status === 'failed') {
      throw new Error(result.error || 'Image generation failed')
    }

    const outputs = Array.isArray(result.output)
      ? result.output
      : [result.output]

    return outputs.map((url: string, index: number) => ({
      id: `replicate-${Date.now()}-${index}`,
      requestId: '',
      url,
      width: dimensions.width,
      height: dimensions.height,
      format: 'png' as const,
      createdAt: new Date(),
    }))
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: { Authorization: `Token ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async pollPrediction(
    id: string,
    apiKey: string,
    maxAttempts = 60,
  ): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${this.baseUrl}/predictions/${id}`, {
        headers: { Authorization: `Token ${apiKey}` },
      })

      const prediction = await response.json()

      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    throw new Error('Prediction timed out')
  }
}

/**
 * Together AI Provider
 */
class TogetherImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://api.together.xyz/v1'

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const dimensions = getDimensionsFromSettings(settings)
    const negativePrompt = generateNegativePrompt(
      settings.negativePrompt,
      settings,
    )

    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/images/generations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'stabilityai/stable-diffusion-xl-base-1.0',
          prompt,
          negative_prompt: negativePrompt,
          width: dimensions.width,
          height: dimensions.height,
          n: settings.count,
          steps:
            settings.quality === 'draft'
              ? 20
              : settings.quality === 'ultra'
                ? 50
                : 30,
          seed: settings.seed,
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Together API error: ${response.statusText}`,
      )
    }

    const data = await response.json()

    return data.data.map((item: any, index: number) => ({
      id: `together-${Date.now()}-${index}`,
      requestId: '',
      url: item.url || `data:image/png;base64,${item.b64_json}`,
      base64: item.b64_json,
      width: dimensions.width,
      height: dimensions.height,
      format: 'png' as const,
      createdAt: new Date(),
    }))
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Fal.ai Provider
 */
class FalImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://fal.run'

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const dimensions = getDimensionsFromSettings(settings)
    const negativePrompt = generateNegativePrompt(
      settings.negativePrompt,
      settings,
    )

    const model = config.model || 'fal-ai/flux/schnell'

    const response = await fetch(`${config.baseUrl || this.baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${config.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt,
        image_size: {
          width: dimensions.width,
          height: dimensions.height,
        },
        num_images: settings.count,
        guidance_scale: settings.guidanceScale || 7.5,
        seed: settings.seed,
        num_inference_steps:
          settings.quality === 'draft'
            ? 4
            : settings.quality === 'ultra'
              ? 50
              : 28,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `Fal API error: ${response.statusText}`)
    }

    const data = await response.json()

    return data.images.map((image: any, index: number) => ({
      id: `fal-${Date.now()}-${index}`,
      requestId: '',
      url: image.url,
      width: image.width || dimensions.width,
      height: image.height || dimensions.height,
      format: 'png' as const,
      seed: data.seed,
      createdAt: new Date(),
    }))
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Fal doesn't have a dedicated validation endpoint
      // Try a minimal request to check key validity
      const response = await fetch(`${this.baseUrl}/fal-ai/flux/schnell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify({ prompt: 'test', num_images: 1 }),
      })
      return response.status !== 401
    } catch {
      return false
    }
  }
}

/**
 * Google Gemini Image Provider
 * Uses Gemini models with image generation capability
 */
class GoogleImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  async generate(
    prompt: string,
    _settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const model = config.model || 'gemini-2.5-flash-image'

    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Google API error: ${response.statusText}`,
      )
    }

    const data = await response.json()
    const images: GeneratedImage[] = []

    // Extract images from response parts
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const mimeType = part.inlineData.mimeType
          const format = mimeType.includes('png')
            ? 'png'
            : mimeType.includes('jpeg')
              ? 'jpg'
              : 'png'
          images.push({
            id: `google-${Date.now()}-${images.length}`,
            requestId: '',
            url: `data:${mimeType};base64,${part.inlineData.data}`,
            base64: part.inlineData.data,
            width: 1024,
            height: 1024,
            format: format as 'png' | 'jpg' | 'webp',
            createdAt: new Date(),
          })
        }
      }
    }

    if (images.length === 0) {
      // Check if we got text response instead
      const textParts = data.candidates?.[0]?.content?.parts?.filter(
        (p: any) => p.text,
      )
      if (textParts?.length > 0) {
        throw new Error(
          `Model returned text instead of image. The model "${model}" may not support image generation. Try using "gemini-2.0-flash-preview-image-generation".`,
        )
      }
      throw new Error(
        'No images were generated. Ensure you are using a model that supports image generation.',
      )
    }

    return images
  }

  /**
   * Stream images as they are generated using Gemini's streaming API
   */
  async *streamGenerate(
    prompt: string,
    _settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): AsyncIterable<GeneratedImage> {
    const model = config.model || 'gemini-2.5-flash-image'

    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Google API error: ${response.statusText}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let imageCount = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]' || !data) continue

          try {
            const parsed = JSON.parse(data)

            // Extract images from streaming response
            for (const candidate of parsed.candidates || []) {
              for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.mimeType?.startsWith('image/')) {
                  const mimeType = part.inlineData.mimeType
                  const format = mimeType.includes('png')
                    ? 'png'
                    : mimeType.includes('jpeg')
                      ? 'jpg'
                      : 'png'

                  yield {
                    id: `google-stream-${Date.now()}-${imageCount++}`,
                    requestId: '',
                    url: `data:${mimeType};base64,${part.inlineData.data}`,
                    base64: part.inlineData.data,
                    width: 1024,
                    height: 1024,
                    format: format as 'png' | 'jpg' | 'webp',
                    createdAt: new Date(),
                  }
                }
              }
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    }
  }

  supportsStreaming = true

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-goog-api-key': apiKey,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// =============================================================================
// Image Generation Service
// =============================================================================

/**
 * Main image generation service
 */
export class ImageGenerationService {
  private static providers = new Map<ImageProvider, ImageProviderInterface>()

  // Initialize default providers
  static {
    this.providers.set('openai', new OpenAIImageProvider())
    this.providers.set('google', new GoogleImageProvider())
    this.providers.set('stability', new StabilityImageProvider())
    this.providers.set('replicate', new ReplicateImageProvider())
    this.providers.set('together', new TogetherImageProvider())
    this.providers.set('fal', new FalImageProvider())
  }

  /**
   * Register a custom provider
   */
  static registerProvider(
    name: ImageProvider,
    provider: ImageProviderInterface,
  ): void {
    this.providers.set(name, provider)
  }

  /**
   * Get a provider by name
   */
  static getProvider(name: ImageProvider): ImageProviderInterface {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Image provider '${name}' not found`)
    }
    return provider
  }

  /**
   * List all registered providers
   */
  static listProviders(): ImageProvider[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Generate images
   */
  static async generate(
    prompt: string,
    settings: Partial<ImageGenerationSettings> = {},
    config: ImageProviderConfig,
  ): Promise<ImageGenerationResponse> {
    const fullSettings: ImageGenerationSettings = {
      ...DEFAULT_IMAGE_SETTINGS,
      ...settings,
    }

    const normalizedPrompt = normalizePrompt(prompt)
    const compiledPrompt = compilePrompt(normalizedPrompt, fullSettings)

    const request: ImageGenerationRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: normalizedPrompt,
      compiledPrompt,
      settings: fullSettings,
      providerConfig: {
        ...config,
        apiKey: '[REDACTED]',
      } as ImageProviderConfig,
      status: 'generating',
      createdAt: new Date(),
      startedAt: new Date(),
    }

    try {
      const provider = this.getProvider(config.provider)
      const startTime = Date.now()

      const images = await provider.generate(
        compiledPrompt,
        fullSettings,
        config,
      )

      // Set requestId on all images
      images.forEach((img) => {
        img.requestId = request.id
      })

      const generationTimeMs = Date.now() - startTime

      return {
        request: {
          ...request,
          status: 'completed',
          completedAt: new Date(),
        },
        images,
        generationTimeMs,
        usage: {
          imagesGenerated: images.length,
        },
      }
    } catch (error) {
      return {
        request: {
          ...request,
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        images: [],
      }
    }
  }

  /**
   * Check if a provider supports streaming
   */
  static supportsStreaming(provider: ImageProvider): boolean {
    const impl = this.getProvider(provider)
    return (
      impl.supportsStreaming === true &&
      typeof impl.streamGenerate === 'function'
    )
  }

  /**
   * Stream images as they are generated (for providers that support it)
   * Falls back to regular generate for providers that don't support streaming
   */
  static async *streamGenerate(
    prompt: string,
    settings: Partial<ImageGenerationSettings> = {},
    config: ImageProviderConfig,
    onImageReceived?: (image: GeneratedImage) => void,
  ): AsyncIterable<GeneratedImage> {
    const fullSettings: ImageGenerationSettings = {
      ...DEFAULT_IMAGE_SETTINGS,
      ...settings,
    }

    const normalizedPrompt = normalizePrompt(prompt)
    const compiledPrompt = compilePrompt(normalizedPrompt, fullSettings)
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const provider = this.getProvider(config.provider)

    // If provider supports streaming, use it
    if (provider.supportsStreaming && provider.streamGenerate) {
      for await (const image of provider.streamGenerate(
        compiledPrompt,
        fullSettings,
        config,
      )) {
        image.requestId = requestId
        onImageReceived?.(image)
        yield image
      }
    } else {
      // Fall back to regular generation
      const images = await provider.generate(
        compiledPrompt,
        fullSettings,
        config,
      )
      for (const image of images) {
        image.requestId = requestId
        onImageReceived?.(image)
        yield image
      }
    }
  }

  /**
   * Validate an API key for a provider
   */
  static async validateApiKey(
    provider: ImageProvider,
    apiKey: string,
  ): Promise<boolean> {
    const impl = this.getProvider(provider)
    return impl.validateApiKey(apiKey)
  }
}
