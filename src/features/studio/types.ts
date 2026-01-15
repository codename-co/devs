/**
 * Image Generation Feature Types
 *
 * Type definitions for the AI Image Generation system, supporting multiple
 * providers (OpenAI DALL-E, Stability AI, Replicate, etc.) with a unified
 * preset-based interface for defining image characteristics.
 */

// =============================================================================
// Image Generation Providers
// =============================================================================

/**
 * Supported image generation providers
 */
export type ImageProvider =
  | 'openai' // DALL-E 3
  | 'google' // Google Gemini
  | 'stability' // Stability AI (Stable Diffusion)
  | 'replicate' // Replicate (various models)
  | 'together' // Together AI
  | 'fal' // Fal.ai

/**
 * Image model identifier
 */
export type ImageModel =
  // OpenAI
  | 'dall-e-3'
  | 'dall-e-2'
  | 'gpt-image-1'
  // Google Gemini
  | 'gemini-2.5-flash-image'
  | 'gemini-2.0-flash-preview-image-generation'
  | 'gemini-3-pro-image-preview'
  // Google Imagen
  | 'imagen-4.0-generate-001'
  | 'imagen-4.0-ultra-generate-001'
  | 'imagen-4.0-fast-generate-001'
  // Stability AI
  | 'stable-diffusion-xl-1024-v1-0'
  | 'stable-diffusion-v1-6'
  | 'stable-image-core'
  | 'stable-image-ultra'
  // Together AI
  | 'black-forest-labs/FLUX.1-schnell'
  | 'black-forest-labs/FLUX.1-dev'
  | 'black-forest-labs/FLUX.1.1-pro'
  | 'stabilityai/stable-diffusion-xl-base-1.0'
  // Fal.ai
  | 'fal-ai/flux/schnell'
  | 'fal-ai/flux/dev'
  | 'fal-ai/flux-pro'
  // Replicate
  | 'stability-ai/sdxl'
  | 'bytedance/sdxl-lightning-4step'

/**
 * Available models per provider
 */
export const IMAGE_MODELS_BY_PROVIDER: Record<
  ImageProvider,
  { id: ImageModel; name: string; description?: string }[]
> = {
  openai: [
    {
      id: 'dall-e-3',
      name: 'DALL·E 3',
      description: 'Latest model, best quality',
    },
    { id: 'dall-e-2', name: 'DALL·E 2', description: 'Faster, lower cost' },
    {
      id: 'gpt-image-1',
      name: 'GPT Image',
      description: 'Native GPT image generation',
    },
  ],
  google: [
    {
      id: 'gemini-3-pro-image-preview',
      name: 'Gemini 3 Pro Image',
      description: 'Professional quality, up to 4K, thinking-enabled',
    },
    {
      id: 'gemini-2.5-flash-image',
      name: 'Gemini 2.5 Flash Image',
      description: 'Fast image generation',
    },
  ],
  stability: [
    {
      id: 'stable-image-ultra',
      name: 'Stable Image Ultra',
      description: 'Highest quality',
    },
    {
      id: 'stable-image-core',
      name: 'Stable Image Core',
      description: 'Fast & balanced',
    },
    {
      id: 'stable-diffusion-xl-1024-v1-0',
      name: 'SDXL 1.0',
      description: 'Classic SDXL',
    },
    {
      id: 'stable-diffusion-v1-6',
      name: 'SD 1.6',
      description: 'Legacy model',
    },
  ],
  together: [
    {
      id: 'black-forest-labs/FLUX.1.1-pro',
      name: 'FLUX 1.1 Pro',
      description: 'Best quality',
    },
    {
      id: 'black-forest-labs/FLUX.1-dev',
      name: 'FLUX 1 Dev',
      description: 'Development model',
    },
    {
      id: 'black-forest-labs/FLUX.1-schnell',
      name: 'FLUX Schnell',
      description: 'Fast generation',
    },
    {
      id: 'stabilityai/stable-diffusion-xl-base-1.0',
      name: 'SDXL Base',
      description: 'Stable Diffusion XL',
    },
  ],
  fal: [
    {
      id: 'fal-ai/flux-pro',
      name: 'FLUX Pro',
      description: 'Professional quality',
    },
    {
      id: 'fal-ai/flux/dev',
      name: 'FLUX Dev',
      description: 'Development model',
    },
    {
      id: 'fal-ai/flux/schnell',
      name: 'FLUX Schnell',
      description: 'Fast generation',
    },
  ],
  replicate: [
    {
      id: 'stability-ai/sdxl',
      name: 'SDXL',
      description: 'Stable Diffusion XL',
    },
    {
      id: 'bytedance/sdxl-lightning-4step',
      name: 'SDXL Lightning',
      description: '4-step fast generation',
    },
  ],
}

/**
 * Get default model for a provider
 */
export function getDefaultModelForProvider(
  provider: ImageProvider,
): ImageModel {
  const models = IMAGE_MODELS_BY_PROVIDER[provider]
  return models[0]?.id || 'dall-e-3'
}

/**
 * Status of an image generation request
 */
export type ImageGenerationStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'

// =============================================================================
// Image Presets & Settings
// =============================================================================

/**
 * Aspect ratio presets for image generation
 */
export type AspectRatio =
  | '1:1' // Square (1024x1024)
  | '16:9' // Landscape widescreen (1792x1024)
  | '9:16' // Portrait/mobile (1024x1792)
  | '4:3' // Classic landscape
  | '3:4' // Classic portrait
  | '3:2' // Photo landscape
  | '2:3' // Photo portrait
  | '21:9' // Ultrawide

/**
 * Quality levels for image generation
 */
export type ImageQuality = 'draft' | 'standard' | 'hd' | 'ultra'

/**
 * Visual style presets
 */
export type ImageStyle =
  | 'natural' // Photorealistic
  | 'vivid' // Enhanced, vibrant colors
  | 'artistic' // Painterly, artistic interpretation
  | 'anime' // Anime/manga style
  | 'digital-art' // Digital illustration
  | 'cinematic' // Film-like quality
  | 'fantasy' // Fantasy art style
  | 'minimalist' // Clean, minimal design
  | 'vintage' // Retro/vintage look
  | '3d-render' // 3D rendered look
  | 'watercolor' // Watercolor painting
  | 'oil-painting' // Oil painting style
  | 'sketch' // Pencil/pen sketch
  | 'pixel-art' // Retro pixel art
  | 'comic' // Comic book style
  | 'abstract' // Abstract art
  | 'none' // No style modifier

/**
 * Lighting presets
 */
export type LightingPreset =
  | 'natural' // Natural daylight
  | 'studio' // Professional studio lighting
  | 'dramatic' // High contrast, dramatic
  | 'soft' // Soft, diffused light
  | 'golden-hour' // Warm sunset/sunrise
  | 'neon' // Neon/cyberpunk lighting
  | 'moody' // Dark, atmospheric
  | 'backlit' // Silhouette/rim lighting
  | 'none' // No lighting modifier

/**
 * Color palette presets
 */
export type ColorPalette =
  | 'vibrant' // Bold, saturated colors
  | 'pastel' // Soft, muted pastels
  | 'monochrome' // Black and white
  | 'sepia' // Warm brown tones
  | 'cool' // Blue/cool tones
  | 'warm' // Red/orange warm tones
  | 'earth' // Natural earth tones
  | 'neon' // Bright neon colors
  | 'muted' // Desaturated, subtle
  | 'none' // No color modifier

/**
 * Camera/composition presets
 */
export type CompositionPreset =
  | 'portrait' // Portrait framing
  | 'landscape' // Wide landscape shot
  | 'close-up' // Macro/detail shot
  | 'wide-angle' // Wide perspective
  | 'aerial' // Bird's eye view
  | 'low-angle' // Looking up
  | 'dutch-angle' // Tilted/dynamic
  | 'symmetrical' // Centered, balanced
  | 'rule-of-thirds' // Classic composition
  | 'none' // No composition modifier

// =============================================================================
// Configuration & Settings
// =============================================================================

/**
 * Complete image generation settings
 */
export interface ImageGenerationSettings {
  /** Target aspect ratio */
  aspectRatio: AspectRatio
  /** Quality level */
  quality: ImageQuality
  /** Visual style preset */
  style: ImageStyle
  /** Lighting preset */
  lighting: LightingPreset
  /** Color palette */
  colorPalette: ColorPalette
  /** Composition/camera preset */
  composition: CompositionPreset
  /** Number of images to generate (1-4) */
  count: number
  /** Negative prompt (what to avoid) */
  negativePrompt?: string
  /** Seed for reproducibility */
  seed?: number
  /** Model-specific guidance scale (0-20) */
  guidanceScale?: number
  /** Custom width override */
  width?: number
  /** Custom height override */
  height?: number
  /** Reference image for image-to-image generation (base64 data) */
  referenceImageBase64?: string
  /** Reference image MIME type */
  referenceImageMimeType?: string
}

/**
 * Default settings for image generation
 */
export const DEFAULT_IMAGE_SETTINGS: ImageGenerationSettings = {
  aspectRatio: '1:1',
  quality: 'standard',
  style: 'natural',
  lighting: 'none',
  colorPalette: 'none',
  composition: 'none',
  count: 1,
}

/**
 * Provider-specific configuration
 */
export interface ImageProviderConfig {
  provider: ImageProvider
  apiKey: string
  baseUrl?: string
  model?: string
  /** Organization ID (for OpenAI) */
  organizationId?: string
}

// =============================================================================
// Preset Collections
// =============================================================================

/**
 * A saved preset combining multiple settings
 */
export interface ImagePreset {
  id: string
  name: string
  description?: string
  icon?: string
  /** The settings this preset applies */
  settings: Partial<ImageGenerationSettings>
  /** Tags for categorization */
  tags?: string[]
  /** Whether this is a built-in preset */
  isBuiltIn?: boolean
  createdAt: Date
  updatedAt?: Date
}

/**
 * Categories for organizing presets
 */
export type PresetCategory =
  | 'style'
  | 'photography'
  | 'illustration'
  | 'concept-art'
  | 'marketing'
  | 'social-media'
  | 'custom'

// =============================================================================
// Generation Request & Response
// =============================================================================

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
  id: string
  /** The user's prompt */
  prompt: string
  /** Compiled prompt with preset modifiers */
  compiledPrompt: string
  /** Applied settings */
  settings: ImageGenerationSettings
  /** Provider configuration */
  providerConfig: ImageProviderConfig
  /** Request status */
  status: ImageGenerationStatus
  /** Timestamp of request */
  createdAt: Date
  /** When generation started */
  startedAt?: Date
  /** When generation completed */
  completedAt?: Date
  /** Error message if failed */
  error?: string
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  id: string
  /** Reference to the generation request */
  requestId: string
  /** Image URL (temporary or permanent) */
  url: string
  /** Base64-encoded image data (for local storage) */
  base64?: string
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** File format */
  format: 'png' | 'jpg' | 'webp'
  /** File size in bytes */
  size?: number
  /** Revised prompt (if provider modified it) */
  revisedPrompt?: string
  /** Generation seed used */
  seed?: number
  /** When this image was generated */
  createdAt: Date
}

/**
 * Complete generation response
 */
export interface ImageGenerationResponse {
  request: ImageGenerationRequest
  images: GeneratedImage[]
  /** Total generation time in ms */
  generationTimeMs?: number
  /** Provider-specific usage/billing info */
  usage?: {
    imagesGenerated: number
    estimatedCost?: number
  }
}

// =============================================================================
// History & Gallery
// =============================================================================

/**
 * An entry in the studio generation history
 */
export interface StudioEntry {
  id: string
  prompt: string
  settings: ImageGenerationSettings
  images: GeneratedImage[]
  isFavorite?: boolean
  tags?: string[]
  createdAt: Date
}

// =============================================================================
// UI State
// =============================================================================

/**
 * State for the image generation UI
 */
export interface ImageGenUIState {
  /** Current prompt text */
  prompt: string
  /** Current settings */
  settings: ImageGenerationSettings
  /** Active preset (if any) */
  activePresetId?: string
  /** Whether generation is in progress */
  isGenerating: boolean
  /** Current generation progress (0-100) */
  progress?: number
  /** Currently selected images for actions */
  selectedImageIds: string[]
  /** View mode for gallery */
  viewMode: 'grid' | 'list' | 'masonry'
  /** Show advanced settings panel */
  showAdvancedSettings: boolean
}

// =============================================================================
// Prompt Enhancement
// =============================================================================

/**
 * Prompt enhancement options
 */
export interface PromptEnhancementOptions {
  /** Add style keywords */
  enhanceStyle?: boolean
  /** Add quality keywords */
  enhanceQuality?: boolean
  /** Add technical photography terms */
  enhanceTechnical?: boolean
  /** Make prompt more detailed */
  expandDetails?: boolean
}

/**
 * Result of prompt enhancement
 */
export interface EnhancedPrompt {
  original: string
  enhanced: string
  additions: string[]
}
