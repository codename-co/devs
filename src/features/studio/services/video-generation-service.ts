/**
 * Video Generation Service
 *
 * Unified service for generating videos using Google's Veo models.
 * Handles the asynchronous polling pattern required by the Veo API.
 */

import {
  VideoProvider,
  VideoProviderConfig,
  VideoGenerationSettings,
  VideoGenerationRequest,
  VideoGenerationResponse,
  GeneratedVideo,
  DEFAULT_VIDEO_SETTINGS,
  VideoModel,
} from '../types'
import { TraceService } from '@/features/traces/trace-service'
import { CostEstimate } from '@/features/traces/types'
import { errorToast } from '@/lib/toast'
import { getVertexAIAuthInfo } from '@/lib/llm/vertex-ai-auth'

// =============================================================================
// Video Generation Pricing (USD per video)
// =============================================================================

/**
 * Estimated cost per video for different models
 * Based on Google's pricing as of January 2026
 */
const VIDEO_PRICING: Record<string, Record<string, number>> = {
  // Veo 3.1 pricing per second of video
  'veo-3.1-generate-preview': {
    '720p': 0.35, // $0.35 per second at 720p
    '1080p': 0.5, // $0.50 per second at 1080p
    '4k': 1.0, // $1.00 per second at 4K
  },
  'veo-3.1-fast-generate-preview': {
    '720p': 0.2,
    '1080p': 0.3,
    '4k': 0.6,
  },
  'veo-2-generate-001': {
    '720p': 0.25,
    '1080p': 0.35,
    '4k': 0.0, // Veo 2 doesn't support 4K
  },
}

/**
 * Get estimated cost for video generation
 */
function getVideoCost(
  model: string | undefined,
  resolution: string,
  durationSeconds: number,
): CostEstimate {
  const modelPricing = VIDEO_PRICING[model || 'veo-3.1-generate-preview']
  const costPerSecond = modelPricing?.[resolution] || 0.35
  const totalCost = costPerSecond * durationSeconds

  return {
    inputCost: 0,
    outputCost: totalCost,
    totalCost,
    currency: 'USD',
  }
}

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * Interface that all video generation providers must implement
 */
export interface VideoProviderInterface {
  /**
   * Start video generation (returns operation for polling)
   */
  startGeneration(
    prompt: string,
    settings: VideoGenerationSettings,
    config: VideoProviderConfig,
  ): Promise<{ operationName: string }>

  /**
   * Poll for video generation completion
   */
  pollOperation(
    operationName: string,
    config: VideoProviderConfig,
  ): Promise<{
    done: boolean
    videos?: GeneratedVideo[]
    error?: string
  }>

  /**
   * Download video from the API
   */
  downloadVideo(
    videoFile: any,
    config: VideoProviderConfig,
  ): Promise<{ url: string; blob: Blob }>

  /**
   * Validate API key
   */
  validateApiKey(apiKey: string): Promise<boolean>
}

// =============================================================================
// Google Veo Provider
// =============================================================================

/**
 * Google Veo Video Provider
 * Implements the asynchronous video generation API with polling
 */
class GoogleVeoProvider implements VideoProviderInterface {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  async startGeneration(
    prompt: string,
    settings: VideoGenerationSettings,
    config: VideoProviderConfig,
  ): Promise<{ operationName: string }> {
    const model = config.model || 'veo-3.1-generate-preview'

    // Build instances array (mldev format)
    const instance: Record<string, any> = {
      prompt,
    }

    // Add reference image for image-to-video
    if (settings.referenceImageBase64 && settings.referenceImageMimeType) {
      instance.image = {
        bytesBase64Encoded: settings.referenceImageBase64,
        mimeType: settings.referenceImageMimeType,
      }
    }

    // Add last frame for interpolation
    if (settings.lastFrameBase64 && settings.lastFrameMimeType) {
      instance.lastFrame = {
        bytesBase64Encoded: settings.lastFrameBase64,
        mimeType: settings.lastFrameMimeType,
      }
    }

    // Add reference images if provided
    // Note: referenceImages is an advanced feature not yet in VideoGenerationSettings

    // Build parameters object (mldev format)
    const parameters: Record<string, any> = {}

    // Sample count (number of videos) - default to 1
    parameters.sampleCount = 1

    // Duration
    if (settings.duration) {
      parameters.durationSeconds = settings.duration
    }

    // Aspect ratio
    if (settings.aspectRatio) {
      parameters.aspectRatio = settings.aspectRatio
    }

    // Resolution
    if (settings.resolution) {
      parameters.resolution = settings.resolution
    }

    // Person generation policy
    if (settings.personGeneration) {
      parameters.personGeneration = settings.personGeneration
    }

    // Negative prompt
    if (settings.negativePrompt) {
      parameters.negativePrompt = settings.negativePrompt
    }

    // Build final request body in mldev format
    const finalRequestBody: Record<string, any> = {
      instances: [instance],
    }

    // Only add parameters if we have any
    if (Object.keys(parameters).length > 0) {
      finalRequestBody.parameters = parameters
    }

    // Use predictLongRunning endpoint (correct for Veo API)
    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/models/${model}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify(finalRequestBody),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Veo API error: ${response.statusText}`,
      )
    }

    const data = await response.json()

    if (!data.name) {
      throw new Error('No operation name returned from Veo API')
    }

    return { operationName: data.name }
  }

  async pollOperation(
    operationName: string,
    config: VideoProviderConfig,
  ): Promise<{
    done: boolean
    videos?: GeneratedVideo[]
    error?: string
  }> {
    // The operation name is the full path, we just need to call it
    const response = await fetch(
      `${config.baseUrl || this.baseUrl}/${operationName}`,
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': config.apiKey,
        },
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message || `Veo API error: ${response.statusText}`,
      )
    }

    const data = await response.json()

    if (data.error) {
      return {
        done: true,
        error: data.error.message || 'Video generation failed',
      }
    }

    if (!data.done) {
      return { done: false }
    }

    // Check for RAI (Responsible AI) content filtering
    const generateVideoResponse = data.response?.generateVideoResponse
    if (generateVideoResponse?.raiMediaFilteredCount > 0) {
      const reasons = generateVideoResponse.raiMediaFilteredReasons || []
      const errorMessage =
        reasons.length > 0
          ? reasons.join('. ')
          : 'Content was filtered due to safety guidelines.'
      errorToast('Video generation blocked', errorMessage)
      return {
        done: true,
        error: errorMessage,
      }
    }

    // Video generation is complete
    const videos: GeneratedVideo[] = []

    // The mldev API returns response.generateVideoResponse.generatedSamples
    const generatedSamples = generateVideoResponse?.generatedSamples || []

    for (const genSample of generatedSamples) {
      if (genSample.video) {
        // Download the video
        const downloaded = await this.downloadVideo(genSample.video, config)

        videos.push({
          id: `veo-${Date.now()}-${videos.length}`,
          requestId: '',
          url: downloaded.url,
          blob: downloaded.blob,
          width: this.getWidthFromResolution(
            generateVideoResponse?.resolution || '720p',
            generateVideoResponse?.aspectRatio || '16:9',
          ),
          height: this.getHeightFromResolution(
            generateVideoResponse?.resolution || '720p',
            generateVideoResponse?.aspectRatio || '16:9',
          ),
          duration: generateVideoResponse?.durationSeconds || 8,
          format: 'mp4',
          hasAudio: true, // Veo 3.1 generates audio by default
          seed: genSample.seed,
          createdAt: new Date(),
        })
      }
    }

    return { done: true, videos }
  }

  async downloadVideo(
    videoFile: any,
    config: VideoProviderConfig,
  ): Promise<{ url: string; blob: Blob }> {
    // videoFile contains the file info, we need to download it
    // The API returns a file object with a uri or we need to use files.download

    // Try to get the video URI from the file object
    let downloadUrl: string

    if (videoFile.uri) {
      // If URI is provided, use it directly
      downloadUrl = videoFile.uri
    } else if (videoFile.name) {
      // Construct the download URL from the file name
      downloadUrl = `${config.baseUrl || this.baseUrl}/${videoFile.name}:download`
    } else {
      throw new Error('No video URI or name available for download')
    }

    // Download the video
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'x-goog-api-key': config.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    return { url, blob }
  }

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

  private getWidthFromResolution(
    resolution: string,
    aspectRatio: string,
  ): number {
    const isPortrait = aspectRatio === '9:16'
    switch (resolution) {
      case '4k':
        return isPortrait ? 2160 : 3840
      case '1080p':
        return isPortrait ? 1080 : 1920
      case '720p':
      default:
        return isPortrait ? 720 : 1280
    }
  }

  private getHeightFromResolution(
    resolution: string,
    aspectRatio: string,
  ): number {
    const isPortrait = aspectRatio === '9:16'
    switch (resolution) {
      case '4k':
        return isPortrait ? 3840 : 2160
      case '1080p':
        return isPortrait ? 1920 : 1080
      case '720p':
      default:
        return isPortrait ? 1280 : 720
    }
  }
}

// =============================================================================
// Vertex AI Veo Provider
// =============================================================================

/**
 * Vertex AI Veo Video Provider
 *
 * Uses service account key authentication to access Veo models
 * via the Vertex AI API (aiplatform.googleapis.com).
 * Same Veo models as the Google provider but with service account auth.
 */
class VertexAIVeoProvider implements VideoProviderInterface {
  async startGeneration(
    prompt: string,
    settings: VideoGenerationSettings,
    config: VideoProviderConfig,
  ): Promise<{ operationName: string }> {
    const model = config.model || 'veo-3.1-generate-preview'
    const auth = await getVertexAIAuthInfo(
      config.apiKey,
      'us-central1',
      config.baseUrl,
    )

    const instance: Record<string, any> = { prompt }

    if (settings.referenceImageBase64 && settings.referenceImageMimeType) {
      instance.image = {
        bytesBase64Encoded: settings.referenceImageBase64,
        mimeType: settings.referenceImageMimeType,
      }
    }

    if (settings.lastFrameBase64 && settings.lastFrameMimeType) {
      instance.lastFrame = {
        bytesBase64Encoded: settings.lastFrameBase64,
        mimeType: settings.lastFrameMimeType,
      }
    }

    const parameters: Record<string, any> = { sampleCount: 1 }

    if (settings.duration) {
      parameters.durationSeconds = settings.duration
    }
    if (settings.aspectRatio) {
      parameters.aspectRatio = settings.aspectRatio
    }
    if (settings.resolution) {
      parameters.resolution = settings.resolution
    }
    if (settings.personGeneration) {
      parameters.personGeneration = settings.personGeneration
    }
    if (settings.negativePrompt) {
      parameters.negativePrompt = settings.negativePrompt
    }

    const finalRequestBody: Record<string, any> = {
      instances: [instance],
    }
    if (Object.keys(parameters).length > 0) {
      finalRequestBody.parameters = parameters
    }

    const url = `${auth.endpoint}/publishers/google/models/${model}:predictLongRunning`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify(finalRequestBody),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message ||
          `Vertex AI Veo API error: ${response.statusText}`,
      )
    }

    const data = await response.json()
    if (!data.name) {
      throw new Error('No operation name returned from Vertex AI Veo API')
    }

    return { operationName: data.name }
  }

  async pollOperation(
    operationName: string,
    config: VideoProviderConfig,
  ): Promise<{
    done: boolean
    videos?: GeneratedVideo[]
    error?: string
  }> {
    const auth = await getVertexAIAuthInfo(
      config.apiKey,
      'us-central1',
      config.baseUrl,
    )

    // The operation name is a full resource path; use the base Vertex AI URL
    const baseUrl = auth.endpoint.split('/projects/')[0]
    const response = await fetch(`${baseUrl}/${operationName}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.error?.message ||
          `Vertex AI Veo API error: ${response.statusText}`,
      )
    }

    const data = await response.json()

    if (data.error) {
      return {
        done: true,
        error: data.error.message || 'Video generation failed',
      }
    }

    if (!data.done) {
      return { done: false }
    }

    const generateVideoResponse = data.response?.generateVideoResponse
    if (generateVideoResponse?.raiMediaFilteredCount > 0) {
      const reasons = generateVideoResponse.raiMediaFilteredReasons || []
      const errorMessage =
        reasons.length > 0
          ? reasons.join('. ')
          : 'Content was filtered due to safety guidelines.'
      errorToast('Video generation blocked', errorMessage)
      return { done: true, error: errorMessage }
    }

    const videos: GeneratedVideo[] = []
    const generatedSamples = generateVideoResponse?.generatedSamples || []

    for (const genSample of generatedSamples) {
      if (genSample.video) {
        const downloaded = await this.downloadVideo(genSample.video, config)
        const isPortrait =
          (generateVideoResponse?.aspectRatio || '16:9') === '9:16'
        const resolution = generateVideoResponse?.resolution || '720p'

        videos.push({
          id: `vertex-ai-veo-${Date.now()}-${videos.length}`,
          requestId: '',
          url: downloaded.url,
          blob: downloaded.blob,
          width: this.getDimension(resolution, isPortrait, 'width'),
          height: this.getDimension(resolution, isPortrait, 'height'),
          duration: generateVideoResponse?.durationSeconds || 8,
          format: 'mp4',
          hasAudio: true,
          seed: genSample.seed,
          createdAt: new Date(),
        })
      }
    }

    return { done: true, videos }
  }

  async downloadVideo(
    videoFile: any,
    config: VideoProviderConfig,
  ): Promise<{ url: string; blob: Blob }> {
    const auth = await getVertexAIAuthInfo(
      config.apiKey,
      'us-central1',
      config.baseUrl,
    )

    let downloadUrl: string
    if (videoFile.uri) {
      downloadUrl = videoFile.uri
    } else if (videoFile.name) {
      const baseUrl = auth.endpoint.split('/projects/')[0]
      downloadUrl = `${baseUrl}/${videoFile.name}:download`
    } else {
      throw new Error('No video URI or name available for download')
    }

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    return { url, blob }
  }

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

  private getDimension(
    resolution: string,
    isPortrait: boolean,
    axis: 'width' | 'height',
  ): number {
    const landscape: Record<string, [number, number]> = {
      '4k': [3840, 2160],
      '1080p': [1920, 1080],
      '720p': [1280, 720],
    }
    const dims = landscape[resolution] || landscape['720p']
    const [w, h] = isPortrait ? [dims[1], dims[0]] : dims
    return axis === 'width' ? w : h
  }
}

// =============================================================================
// Video Generation Service
// =============================================================================

/**
 * Main video generation service
 */
export class VideoGenerationService {
  private static providers = new Map<VideoProvider, VideoProviderInterface>()

  // Initialize default providers
  static {
    this.providers.set('google', new GoogleVeoProvider())
    this.providers.set('vertex-ai', new VertexAIVeoProvider())
  }

  /**
   * Register a custom provider
   */
  static registerProvider(
    name: VideoProvider,
    provider: VideoProviderInterface,
  ): void {
    this.providers.set(name, provider)
  }

  /**
   * Get a provider by name
   */
  static getProvider(name: VideoProvider): VideoProviderInterface {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Video provider '${name}' not found`)
    }
    return provider
  }

  /**
   * List all registered providers
   */
  static listProviders(): VideoProvider[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Generate video with polling
   * This method handles the full lifecycle including polling for completion
   */
  static async generate(
    prompt: string,
    settings: Partial<VideoGenerationSettings> = {},
    config: VideoProviderConfig,
    options?: {
      onProgress?: (progress: number, message: string) => void
      pollIntervalMs?: number
      maxPollAttempts?: number
      context?: {
        agentId?: string
        conversationId?: string
        taskId?: string
        sessionId?: string
      }
    },
  ): Promise<VideoGenerationResponse> {
    const fullSettings: VideoGenerationSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      ...settings,
    }

    const request: VideoGenerationRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      settings: fullSettings,
      providerConfig: {
        ...config,
        apiKey: '[REDACTED]',
      } as VideoProviderConfig,
      status: 'pending',
      createdAt: new Date(),
    }

    // Start tracing
    const trace = TraceService.startTrace({
      name: `${config.provider}/${config.model || 'default'} (video)`,
      agentId: options?.context?.agentId,
      conversationId: options?.context?.conversationId,
      taskId: options?.context?.taskId,
      sessionId: options?.context?.sessionId,
      input: prompt,
    })

    const span = TraceService.startSpan({
      traceId: trace.id,
      name: `Video Generation: ${config.model || config.provider}`,
      type: 'video',
      model: {
        provider: config.provider as any,
        model: config.model || `${config.provider}-default`,
      },
      io: {
        input: {
          prompt,
          variables: {
            aspectRatio: fullSettings.aspectRatio,
            resolution: fullSettings.resolution,
            duration: fullSettings.duration,
          },
        },
      },
      agentId: options?.context?.agentId,
      conversationId: options?.context?.conversationId,
      taskId: options?.context?.taskId,
    })

    const startTime = Date.now()
    const pollInterval = options?.pollIntervalMs || 10000 // 10 seconds default
    const maxAttempts = options?.maxPollAttempts || 60 // 10 minutes max

    try {
      const provider = this.getProvider(config.provider)

      // Start generation
      options?.onProgress?.(5, 'Starting video generation...')
      const { operationName } = await provider.startGeneration(
        prompt,
        fullSettings,
        config,
      )

      request.operationName = operationName
      request.status = 'queued'
      request.startedAt = new Date()

      options?.onProgress?.(10, 'Video generation queued...')

      // Poll for completion
      let videos: GeneratedVideo[] = []
      let attempts = 0

      while (attempts < maxAttempts) {
        attempts++

        // Calculate progress (10-90% range for polling)
        const pollProgress = Math.min(10 + (attempts / maxAttempts) * 80, 90)
        options?.onProgress?.(
          pollProgress,
          `Generating video... (${Math.floor(attempts * (pollInterval / 1000))}s)`,
        )

        // Wait before polling
        await new Promise((resolve) => setTimeout(resolve, pollInterval))

        const result = await provider.pollOperation(operationName, config)

        if (result.done) {
          if (result.error) {
            throw new Error(result.error)
          }
          videos = result.videos || []
          break
        }

        request.status = 'generating'
      }

      if (attempts >= maxAttempts && videos.length === 0) {
        throw new Error('Video generation timed out')
      }

      // Set requestId on all videos
      videos.forEach((video) => {
        video.requestId = request.id
      })

      const generationTimeMs = Date.now() - startTime

      options?.onProgress?.(100, 'Video generation complete!')

      // Calculate cost for tracing
      const cost = getVideoCost(
        config.model,
        fullSettings.resolution,
        fullSettings.duration,
      )

      // End span and trace with success
      await TraceService.endSpan(span.id, {
        status: 'completed',
        cost,
        output: {
          response: {
            videosGenerated: videos.length,
            generationTimeMs,
          },
        },
      })
      await TraceService.endTrace(trace.id, {
        status: 'completed',
        output: `Generated ${videos.length} video(s)`,
      })

      return {
        request: {
          ...request,
          status: 'completed',
          completedAt: new Date(),
        },
        videos,
        generationTimeMs,
        usage: {
          videosGenerated: videos.length,
          estimatedCost: cost.totalCost,
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
        videos: [],
      }
    }
  }

  /**
   * Start video generation without waiting for completion
   * Returns the operation name for manual polling
   */
  static async startGeneration(
    prompt: string,
    settings: Partial<VideoGenerationSettings> = {},
    config: VideoProviderConfig,
  ): Promise<{ requestId: string; operationName: string }> {
    const fullSettings: VideoGenerationSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      ...settings,
    }

    const provider = this.getProvider(config.provider)
    const { operationName } = await provider.startGeneration(
      prompt,
      fullSettings,
      config,
    )

    return {
      requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operationName,
    }
  }

  /**
   * Poll an existing operation for completion
   */
  static async pollOperation(
    operationName: string,
    config: VideoProviderConfig,
  ): Promise<{
    done: boolean
    videos?: GeneratedVideo[]
    error?: string
  }> {
    const provider = this.getProvider(config.provider)
    return provider.pollOperation(operationName, config)
  }

  /**
   * Validate an API key for a provider
   */
  static async validateApiKey(
    provider: VideoProvider,
    apiKey: string,
  ): Promise<boolean> {
    const impl = this.getProvider(provider)
    return impl.validateApiKey(apiKey)
  }

  /**
   * Get available models for video generation
   */
  static getAvailableModels(): VideoModel[] {
    return [
      'veo-3.1-generate-preview',
      'veo-3.1-fast-generate-preview',
      'veo-2-generate-001',
    ]
  }
}
