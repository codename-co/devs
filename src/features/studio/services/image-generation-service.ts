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
import { TraceService } from '@/features/traces/trace-service'
import { CostEstimate } from '@/features/traces/types'
import { getVertexAIAuthInfo } from '@/lib/llm/vertex-ai-auth'

// =============================================================================
// Image Generation Pricing (USD per image)
// =============================================================================

/**
 * Estimated cost per image for different providers/models
 * These are approximate costs as of January 2026
 */
const IMAGE_PRICING: Record<string, number> = {
  // OpenAI DALL-E
  'dall-e-3': 0.04, // $0.04 per image (1024x1024)
  'dall-e-3-hd': 0.08, // $0.08 per image (HD quality)
  'dall-e-2': 0.02, // $0.02 per image
  // Google Gemini
  'gemini-2.5-flash-image': 0.02, // Fast image generation
  'gemini-3-pro-image-preview': 0.05, // Professional quality, up to 4K
  'gemini-image': 0.02, // Legacy
  'imagen-3': 0.03,
  // Stability AI
  'stable-diffusion-xl': 0.002,
  sd3: 0.035,
  'sd3-turbo': 0.004,
  // Replicate (varies by model)
  'replicate-default': 0.01,
  // Together AI
  'together-default': 0.005,
  // Fal.ai
  'fal-default': 0.01,
  // Hugging Face
  'huggingface-default': 0.005,
  // Default fallback
  default: 0.02,
}

/**
 * Get estimated cost for image generation
 */
function getImageCost(
  provider: ImageProvider,
  model: string | undefined,
  imagesGenerated: number,
  quality?: string,
): CostEstimate {
  // Try exact model match first
  let costPerImage = IMAGE_PRICING[model || ''] || 0

  // Try provider-specific default
  if (!costPerImage) {
    costPerImage = IMAGE_PRICING[`${provider}-default`] || 0
  }

  // Fallback to global default
  if (!costPerImage) {
    costPerImage = IMAGE_PRICING['default']
  }

  // Adjust for HD quality (DALL-E specific)
  if (quality === 'hd' || quality === 'ultra') {
    costPerImage *= 2
  }

  const totalCost = costPerImage * imagesGenerated

  return {
    inputCost: 0, // Image generation doesn't have input/output split
    outputCost: totalCost,
    totalCost,
    currency: 'USD',
  }
}

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
 * OpenAI-Compatible Provider (LM Studio, LocalAI, vLLM, etc.)
 *
 * Handles two scenarios:
 * 1. Server supports /images/generations endpoint (standard OpenAI Images API)
 * 2. Fallback to /chat/completions for servers that only support chat
 *
 * Also normalizes the base URL to ensure /v1 is appended when missing.
 */
class OpenAICompatibleImageProvider implements ImageProviderInterface {
  /**
   * Normalize base URL to ensure /v1 is present.
   * Handles URLs like:
   * - http://localhost:4444 -> http://localhost:4444/v1
   * - http://localhost:4444/ -> http://localhost:4444/v1
   * - http://localhost:4444/v1 -> http://localhost:4444/v1
   * - http://localhost:4444/v1/ -> http://localhost:4444/v1
   * - http://localhost:4444/v2 -> http://localhost:4444/v2 (preserved)
   */
  private normalizeBaseUrl(baseUrl: string): string {
    let url = baseUrl.replace(/\/+$/, '')
    if (!/\/v\d+$/.test(url)) {
      url = `${url}/v1`
    }
    return url
  }

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    if (!config.baseUrl) {
      throw new Error(
        'Base URL is required for OpenAI-compatible image generation',
      )
    }

    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const dimensions = getDimensionsFromSettings(settings)
    const ratio = dimensions.width / dimensions.height
    const size =
      ratio > 1.5 ? '1792x1024' : ratio < 0.67 ? '1024x1792' : '1024x1024'

    // Try the standard /images/generations endpoint first
    try {
      const images = await this.tryImagesEndpoint(
        baseUrl,
        prompt,
        settings,
        config,
        size,
      )
      return images
    } catch (imagesError: any) {
      // If the endpoint is not found or unsupported, fall back to chat completions
      const isEndpointError =
        imagesError.message?.includes('Unexpected endpoint') ||
        imagesError.message?.includes('404') ||
        imagesError.message?.includes('Not Found') ||
        imagesError.message?.includes('not found') ||
        imagesError.message?.includes('not supported') ||
        imagesError.status === 404

      if (!isEndpointError) {
        // Re-throw if it's a different kind of error (auth, rate limit, etc.)
        throw imagesError
      }

      console.warn(
        `[Studio] /images/generations not supported, falling back to /chat/completions`,
      )

      // Fall back to chat completions
      return this.tryChatCompletions(baseUrl, prompt, settings, config, size)
    }
  }

  /**
   * Try the standard OpenAI /images/generations endpoint
   */
  private async tryImagesEndpoint(
    baseUrl: string,
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
    size: string,
  ): Promise<GeneratedImage[]> {
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'default',
        prompt,
        n: Math.min(settings.count, 1),
        size,
        response_format: 'b64_json',
      }),
    })

    const data = await response.json().catch(() => ({}))

    // Handle error responses — some servers (LM Studio) return HTTP 200
    // with an error body instead of a proper 4xx status code
    if (!response.ok || data.error) {
      const errMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || `API error: ${response.statusText}`
      const errObj = new Error(errMsg)
      ;(errObj as any).status = response.status
      throw errObj
    }

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Unexpected response format: missing data array')
    }

    return data.data.map((item: any, index: number) => ({
      id: `compat-${Date.now()}-${index}`,
      requestId: '',
      url: item.url || `data:image/png;base64,${item.b64_json}`,
      base64: item.b64_json,
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      format: 'png' as const,
      revisedPrompt: item.revised_prompt,
      createdAt: new Date(),
    }))
  }

  /**
   * Fallback: use /chat/completions to generate images.
   * Many OpenAI-compatible servers (LM Studio, Ollama, etc.) serve image
   * models through the chat completions endpoint. The model returns the
   * image as a base64 data URI in the assistant message content.
   */
  private async tryChatCompletions(
    baseUrl: string,
    prompt: string,
    _settings: ImageGenerationSettings,
    config: ImageProviderConfig,
    size: string,
  ): Promise<GeneratedImage[]> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'default',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message ||
          error.error ||
          `Chat completions API error: ${response.statusText}`,
      )
    }

    const data = await response.json()
    const images: GeneratedImage[] = []
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in chat completions response')
    }

    // Try to extract base64 images from the response content.
    // Models may return: data:image/...;base64,DATA  or  raw base64.
    const dataUriRegex = /data:image\/([\w+]+);base64,([A-Za-z0-9+/=\s]+)/g
    let match: RegExpExecArray | null
    let idx = 0

    while ((match = dataUriRegex.exec(content)) !== null) {
      const format = match[1] === 'jpeg' ? 'jpg' : match[1]
      const base64 = match[2].replace(/\s/g, '')
      images.push({
        id: `compat-chat-${Date.now()}-${idx}`,
        requestId: '',
        url: `data:image/${match[1]};base64,${base64}`,
        base64,
        width: parseInt(size.split('x')[0]),
        height: parseInt(size.split('x')[1]),
        format: format as any,
        createdAt: new Date(),
      })
      idx++
    }

    // If no data URI found, check if the whole content is raw base64
    if (images.length === 0) {
      const trimmed = content.trim()
      if (/^[A-Za-z0-9+/=\s]{100,}$/.test(trimmed)) {
        const base64 = trimmed.replace(/\s/g, '')
        images.push({
          id: `compat-chat-${Date.now()}-0`,
          requestId: '',
          url: `data:image/png;base64,${base64}`,
          base64,
          width: parseInt(size.split('x')[0]),
          height: parseInt(size.split('x')[1]),
          format: 'png' as const,
          createdAt: new Date(),
        })
      }
    }

    if (images.length === 0) {
      throw new Error(
        'The model did not return any image data. This model may not support image generation.',
      )
    }

    return images
  }

  async validateApiKey(
    apiKey: string,
    config?: ImageProviderConfig,
  ): Promise<boolean> {
    try {
      const baseUrl = config?.baseUrl
        ? this.normalizeBaseUrl(config.baseUrl)
        : ''
      if (!baseUrl) return false
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
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
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const model = config.model || 'gemini-2.5-flash-image'

    // Build parts array with text prompt and optional reference image(s)
    const parts: Array<
      { text: string } | { inline_data: { mime_type: string; data: string } }
    > = []

    // Add text prompt
    parts.push({ text: prompt })

    // Add reference images if provided (Gemini 3 Pro supports up to 14 images)
    if (settings.referenceImages && settings.referenceImages.length > 0) {
      for (const image of settings.referenceImages) {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.base64,
          },
        })
      }
    } else if (
      settings.referenceImageBase64 &&
      settings.referenceImageMimeType
    ) {
      // Backward compatibility: single reference image
      parts.push({
        inline_data: {
          mime_type: settings.referenceImageMimeType,
          data: settings.referenceImageBase64,
        },
      })
    }

    // Build generation config
    const generationConfig: Record<string, any> = {
      responseModalities: ['TEXT', 'IMAGE'],
    }

    // Build image config based on model
    const imageConfig: Record<string, string> = {}

    // Add aspect ratio if not default
    if (settings.aspectRatio && settings.aspectRatio !== '1:1') {
      imageConfig.aspectRatio = settings.aspectRatio
    }

    // Add image size for gemini-3-pro-image-preview (supports 1K, 2K, 4K)
    if (model === 'gemini-3-pro-image-preview') {
      const imageSize =
        settings.quality === 'ultra'
          ? '4K'
          : settings.quality === 'hd'
            ? '2K'
            : '1K'
      imageConfig.imageSize = imageSize
    }

    // Only add imageConfig if we have settings
    if (Object.keys(imageConfig).length > 0) {
      generationConfig.imageConfig = imageConfig
    }

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
              parts,
            },
          ],
          generationConfig,
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
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): AsyncIterable<GeneratedImage> {
    const model = config.model || 'gemini-2.5-flash-image'

    // Build parts array with text prompt and optional reference image(s)
    const parts: Array<
      { text: string } | { inline_data: { mime_type: string; data: string } }
    > = []

    // Add text prompt
    parts.push({ text: prompt })

    // Add reference images if provided (Gemini 3 Pro supports up to 14 images)
    if (settings.referenceImages && settings.referenceImages.length > 0) {
      for (const image of settings.referenceImages) {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.base64,
          },
        })
      }
    } else if (
      settings.referenceImageBase64 &&
      settings.referenceImageMimeType
    ) {
      // Backward compatibility: single reference image
      parts.push({
        inline_data: {
          mime_type: settings.referenceImageMimeType,
          data: settings.referenceImageBase64,
        },
      })
    }

    // Build generation config
    const generationConfig: Record<string, any> = {
      responseModalities: ['TEXT', 'IMAGE'],
    }

    // Build image config based on model
    const imageConfig: Record<string, string> = {}

    // Add aspect ratio if not default
    if (settings.aspectRatio && settings.aspectRatio !== '1:1') {
      imageConfig.aspectRatio = settings.aspectRatio
    }

    // Add image size for gemini-3-pro-image-preview (supports 1K, 2K, 4K)
    if (model === 'gemini-3-pro-image-preview') {
      const imageSize =
        settings.quality === 'ultra'
          ? '4K'
          : settings.quality === 'hd'
            ? '2K'
            : '1K'
      imageConfig.imageSize = imageSize
    }

    // Only add imageConfig if we have settings
    if (Object.keys(imageConfig).length > 0) {
      generationConfig.imageConfig = imageConfig
    }

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
              parts,
            },
          ],
          generationConfig,
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

/**
 * Hugging Face Inference API Provider
 *
 * Uses the HuggingFace router for text-to-image generation.
 * Supports any model hosted on HuggingFace that implements the text-to-image pipeline.
 *
 * API endpoint: POST https://router.huggingface.co/hf-inference/models/{model_id}
 * Request: { inputs: "prompt", parameters: { ... } }
 * Response: raw image bytes
 */
class HuggingFaceImageProvider implements ImageProviderInterface {
  private baseUrl = 'https://router.huggingface.co/hf-inference/models'

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const model = config.model || 'black-forest-labs/FLUX.1-schnell'
    const dimensions = getDimensionsFromSettings(settings)
    const negativePrompt = generateNegativePrompt(
      settings.negativePrompt,
      settings,
    )

    const parameters: Record<string, any> = {}

    if (settings.guidanceScale) {
      parameters.guidance_scale = settings.guidanceScale
    }
    if (negativePrompt) {
      parameters.negative_prompt = negativePrompt
    }
    if (dimensions.width) {
      parameters.width = dimensions.width
    }
    if (dimensions.height) {
      parameters.height = dimensions.height
    }
    if (settings.seed !== undefined) {
      parameters.seed = settings.seed
    }

    // Map quality to inference steps
    const steps =
      settings.quality === 'draft'
        ? 10
        : settings.quality === 'ultra'
          ? 50
          : settings.quality === 'hd'
            ? 35
            : 25
    parameters.num_inference_steps = steps

    const apiUrl = `${config.baseUrl || this.baseUrl}/${model}`

    // Generate images sequentially (HF inference returns one image per call)
    const images: GeneratedImage[] = []
    const count = Math.min(settings.count, 4)

    for (let i = 0; i < count; i++) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters:
            Object.keys(parameters).length > 0 ? parameters : undefined,
        }),
      })

      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage: string
        try {
          const errorData = await response.json()
          errorMessage =
            errorData.error || errorData.message || response.statusText
        } catch {
          errorMessage = await response.text().catch(() => response.statusText)
        }
        throw new Error(`Hugging Face API error: ${errorMessage}`)
      }

      // Response is raw image bytes
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Convert to base64
      let binary = ''
      for (let j = 0; j < uint8Array.length; j++) {
        binary += String.fromCharCode(uint8Array[j])
      }
      const base64 = btoa(binary)

      // Determine format from content type
      const format = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg'

      images.push({
        id: `huggingface-${Date.now()}-${i}`,
        requestId: '',
        url: `data:${contentType};base64,${base64}`,
        base64,
        width: dimensions.width,
        height: dimensions.height,
        format: format as 'png' | 'jpg' | 'webp',
        size: blob.size,
        createdAt: new Date(),
      })
    }

    return images
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// =============================================================================
// Vertex AI Image Provider
// =============================================================================

/**
 * Google Vertex AI Image Provider
 *
 * Uses service account key authentication to access Gemini and Imagen models
 * via the Vertex AI API (aiplatform.googleapis.com).
 *
 * Supports two model families:
 * - Gemini models (gemini-*): Use generateContent endpoint, same format as Google AI
 * - Imagen models (imagen-*): Use predict endpoint with Imagen-specific format
 */
class VertexAIImageProvider implements ImageProviderInterface {
  /**
   * Detect whether a model is an Imagen model (vs Gemini)
   */
  private isImagenModel(model: string): boolean {
    return model.startsWith('imagen')
  }

  async generate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): Promise<GeneratedImage[]> {
    const model = config.model || 'gemini-2.5-flash-image'
    const auth = await getVertexAIAuthInfo(
      config.apiKey,
      'us-central1',
      config.baseUrl,
    )

    if (this.isImagenModel(model)) {
      return this.generateWithImagen(prompt, settings, model, auth)
    }
    return this.generateWithGemini(prompt, settings, model, auth)
  }

  /**
   * Generate images using Gemini models on Vertex AI
   */
  private async generateWithGemini(
    prompt: string,
    settings: ImageGenerationSettings,
    model: string,
    auth: { endpoint: string; accessToken: string },
  ): Promise<GeneratedImage[]> {
    // Build parts array with text prompt and optional reference images
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = []

    parts.push({ text: prompt })

    if (settings.referenceImages && settings.referenceImages.length > 0) {
      for (const image of settings.referenceImages) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64,
          },
        })
      }
    } else if (
      settings.referenceImageBase64 &&
      settings.referenceImageMimeType
    ) {
      parts.push({
        inlineData: {
          mimeType: settings.referenceImageMimeType,
          data: settings.referenceImageBase64,
        },
      })
    }

    const generationConfig: Record<string, any> = {
      responseModalities: ['TEXT', 'IMAGE'],
    }

    const imageConfig: Record<string, string> = {}
    if (settings.aspectRatio && settings.aspectRatio !== '1:1') {
      imageConfig.aspectRatio = settings.aspectRatio
    }
    if (model === 'gemini-3-pro-image-preview') {
      const imageSize =
        settings.quality === 'ultra'
          ? '4K'
          : settings.quality === 'hd'
            ? '2K'
            : '1K'
      imageConfig.imageSize = imageSize
    }
    if (Object.keys(imageConfig).length > 0) {
      generationConfig.imageConfig = imageConfig
    }

    const url = `${auth.endpoint}/publishers/google/models/${model}:generateContent`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Vertex AI API error: ${response.statusText}`,
      )
    }

    const data = await response.json()
    const images: GeneratedImage[] = []

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
            id: `vertex-ai-${Date.now()}-${images.length}`,
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
      const textParts = data.candidates?.[0]?.content?.parts?.filter(
        (p: any) => p.text,
      )
      if (textParts?.length > 0) {
        throw new Error(
          `Model returned text instead of image. The model "${model}" may not support image generation on Vertex AI.`,
        )
      }
      throw new Error(
        'No images were generated. Ensure you are using a model that supports image generation.',
      )
    }

    return images
  }

  /**
   * Generate images using Imagen models on Vertex AI
   */
  private async generateWithImagen(
    prompt: string,
    settings: ImageGenerationSettings,
    model: string,
    auth: { endpoint: string; accessToken: string },
  ): Promise<GeneratedImage[]> {
    // Imagen uses the predict endpoint
    const url = `${auth.endpoint}/publishers/google/models/${model}:predict`

    const instance: Record<string, any> = { prompt }

    // Add reference image for image-to-image
    if (settings.referenceImageBase64 && settings.referenceImageMimeType) {
      instance.image = {
        bytesBase64Encoded: settings.referenceImageBase64,
      }
    }

    const parameters: Record<string, any> = {
      sampleCount: Math.min(settings.count, 4),
    }

    if (settings.aspectRatio && settings.aspectRatio !== '1:1') {
      parameters.aspectRatio = settings.aspectRatio
    }

    if (settings.negativePrompt) {
      parameters.negativePrompt = settings.negativePrompt
    }

    if (settings.seed !== undefined) {
      parameters.seed = settings.seed
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({
        instances: [instance],
        parameters,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message ||
          `Vertex AI Imagen API error: ${response.statusText}`,
      )
    }

    const data = await response.json()
    const images: GeneratedImage[] = []

    for (const prediction of data.predictions || []) {
      if (prediction.bytesBase64Encoded) {
        const mimeType = prediction.mimeType || 'image/png'
        const format = mimeType.includes('png')
          ? 'png'
          : mimeType.includes('jpeg')
            ? 'jpg'
            : 'png'
        images.push({
          id: `vertex-ai-imagen-${Date.now()}-${images.length}`,
          requestId: '',
          url: `data:${mimeType};base64,${prediction.bytesBase64Encoded}`,
          base64: prediction.bytesBase64Encoded,
          width: 1024,
          height: 1024,
          format: format as 'png' | 'jpg' | 'webp',
          createdAt: new Date(),
        })
      }
    }

    if (images.length === 0) {
      throw new Error(
        'No images were generated. The model may have filtered the content or encountered an error.',
      )
    }

    return images
  }

  /**
   * Stream images using Gemini models on Vertex AI
   */
  async *streamGenerate(
    prompt: string,
    settings: ImageGenerationSettings,
    config: ImageProviderConfig,
  ): AsyncIterable<GeneratedImage> {
    const model = config.model || 'gemini-2.5-flash-image'

    // Imagen models do not support streaming
    if (this.isImagenModel(model)) {
      const images = await this.generate(prompt, settings, config)
      for (const image of images) {
        yield image
      }
      return
    }

    const auth = await getVertexAIAuthInfo(
      config.apiKey,
      'us-central1',
      config.baseUrl,
    )

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = []
    parts.push({ text: prompt })

    if (settings.referenceImages && settings.referenceImages.length > 0) {
      for (const image of settings.referenceImages) {
        parts.push({
          inlineData: { mimeType: image.mimeType, data: image.base64 },
        })
      }
    } else if (
      settings.referenceImageBase64 &&
      settings.referenceImageMimeType
    ) {
      parts.push({
        inlineData: {
          mimeType: settings.referenceImageMimeType,
          data: settings.referenceImageBase64,
        },
      })
    }

    const generationConfig: Record<string, any> = {
      responseModalities: ['TEXT', 'IMAGE'],
    }
    const imageConfig: Record<string, string> = {}
    if (settings.aspectRatio && settings.aspectRatio !== '1:1') {
      imageConfig.aspectRatio = settings.aspectRatio
    }
    if (model === 'gemini-3-pro-image-preview') {
      const imageSize =
        settings.quality === 'ultra'
          ? '4K'
          : settings.quality === 'hd'
            ? '2K'
            : '1K'
      imageConfig.imageSize = imageSize
    }
    if (Object.keys(imageConfig).length > 0) {
      generationConfig.imageConfig = imageConfig
    }

    const url = `${auth.endpoint}/publishers/google/models/${model}:streamGenerateContent?alt=sse`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Vertex AI API error: ${response.statusText}`,
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
                    id: `vertex-ai-stream-${Date.now()}-${imageCount++}`,
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
      const auth = await getVertexAIAuthInfo(apiKey, 'us-central1')
      const response = await fetch(
        `${auth.endpoint}/publishers/google/models`,
        {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        },
      )
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
    this.providers.set('vertex-ai', new VertexAIImageProvider())
    this.providers.set('stability', new StabilityImageProvider())
    this.providers.set('replicate', new ReplicateImageProvider())
    this.providers.set('together', new TogetherImageProvider())
    this.providers.set('fal', new FalImageProvider())
    this.providers.set('huggingface', new HuggingFaceImageProvider())
    // OpenAI-compatible providers (LM Studio, LocalAI, vLLM, etc.)
    // Use dedicated provider with URL normalization and /chat/completions fallback
    this.providers.set('openai-compatible', new OpenAICompatibleImageProvider())
    this.providers.set('custom', new OpenAICompatibleImageProvider())
    this.providers.set('ollama', new OpenAICompatibleImageProvider())
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
    context?: {
      agentId?: string
      conversationId?: string
      taskId?: string
      sessionId?: string
    },
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

    // Start tracing
    const trace = TraceService.startTrace({
      name: `${config.provider}/${config.model || 'default'} (image)`,
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
      sessionId: context?.sessionId,
      input: compiledPrompt,
    })

    const span = TraceService.startSpan({
      traceId: trace.id,
      name: `Image Generation: ${config.model || config.provider}`,
      type: 'image',
      model: {
        provider: config.provider as any,
        model: config.model || `${config.provider}-default`,
      },
      io: {
        input: {
          prompt: compiledPrompt,
          variables: {
            style: fullSettings.style,
            aspectRatio: fullSettings.aspectRatio,
            quality: fullSettings.quality,
            count: fullSettings.count,
          },
        },
      },
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
    })

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

      // Calculate cost for tracing
      const cost = getImageCost(
        config.provider,
        config.model,
        images.length,
        fullSettings.quality,
      )

      // End span and trace with success
      await TraceService.endSpan(span.id, {
        status: 'completed',
        cost,
        output: {
          response: {
            imagesGenerated: images.length,
            generationTimeMs,
          },
        },
      })
      await TraceService.endTrace(trace.id, {
        status: 'completed',
        output: `Generated ${images.length} image(s)`,
      })

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
      // End span and trace with error
      await TraceService.endSpan(span.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      await TraceService.endTrace(trace.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })

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
    context?: {
      agentId?: string
      conversationId?: string
      taskId?: string
      sessionId?: string
    },
  ): AsyncIterable<GeneratedImage> {
    const fullSettings: ImageGenerationSettings = {
      ...DEFAULT_IMAGE_SETTINGS,
      ...settings,
    }

    const normalizedPrompt = normalizePrompt(prompt)
    const compiledPrompt = compilePrompt(normalizedPrompt, fullSettings)
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const provider = this.getProvider(config.provider)

    // Start tracing
    const trace = TraceService.startTrace({
      name: `${config.provider}/${config.model || 'default'} (image stream)`,
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
      sessionId: context?.sessionId,
      input: compiledPrompt,
    })

    const span = TraceService.startSpan({
      traceId: trace.id,
      name: `Image Generation Stream: ${config.model || config.provider}`,
      type: 'image',
      model: {
        provider: config.provider as any,
        model: config.model || `${config.provider}-default`,
      },
      io: {
        input: {
          prompt: compiledPrompt,
          variables: {
            style: fullSettings.style,
            aspectRatio: fullSettings.aspectRatio,
            quality: fullSettings.quality,
            count: fullSettings.count,
            streaming: true,
          },
        },
      },
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      taskId: context?.taskId,
    })

    let imagesGenerated = 0
    const startTime = Date.now()

    try {
      // If provider supports streaming, use it
      if (provider.supportsStreaming && provider.streamGenerate) {
        for await (const image of provider.streamGenerate(
          compiledPrompt,
          fullSettings,
          config,
        )) {
          image.requestId = requestId
          imagesGenerated++
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
          imagesGenerated++
          onImageReceived?.(image)
          yield image
        }
      }

      const generationTimeMs = Date.now() - startTime

      // Calculate cost for tracing
      const cost = getImageCost(
        config.provider,
        config.model,
        imagesGenerated,
        fullSettings.quality,
      )

      // End span and trace with success
      await TraceService.endSpan(span.id, {
        status: 'completed',
        cost,
        output: {
          response: {
            imagesGenerated,
            generationTimeMs,
          },
        },
      })
      await TraceService.endTrace(trace.id, {
        status: 'completed',
        output: `Generated ${imagesGenerated} image(s)`,
      })
    } catch (error) {
      // End span and trace with error
      await TraceService.endSpan(span.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      await TraceService.endTrace(trace.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
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
