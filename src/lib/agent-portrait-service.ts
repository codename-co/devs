/**
 * Agent Portrait Service
 *
 * Generates AI portraits for agents based on their metadata (name, role, instructions).
 * Uses the ImageGenerationService to create unique visual representations.
 */

import { ImageGenerationService } from '@/features/studio/services/image-generation-service'
import { CredentialService } from '@/lib/credential-service'
import { Agent } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface PortraitGenerationResult {
  success: boolean
  portrait?: string // Base64-encoded image data
  error?: string
}

// =============================================================================
// Portrait Prompt Generation
// =============================================================================

/**
 * Generates a portrait prompt from agent metadata
 */
function generatePortraitPrompt(
  agent: Pick<Agent, 'name' | 'role' | 'instructions'>,
): string {
  // Build a consistent, high-quality prompt for the DEVS avatar system
  const prompt = [
    // Core identity - the image model will interpret name and role to establish visual personality
    `Portrait of an AI assistant named "${agent.name}" who specializes in: ${agent.role}. The character's appearance, expression, and subtle visual cues should reflect both their name personality and expertise.`,

    // Unified art style (critical for consistency across all avatars)
    'Art style: Clean vector-inspired digital illustration, flat design with subtle gradients, geometric shapes, minimalist aesthetic similar to modern tech company avatars',

    // Consistent composition
    'Composition: Centered bust portrait, shoulders visible, head slightly tilted, direct eye contact with viewer, symmetrical framing',

    // Background adapts to role while staying cohesive
    'Background: Soft gradient, subtle accent glow behind the figure matching the character energy, abstract geometric shapes faintly visible, clean and uncluttered',

    // Professional appearance informed by role
    'Appearance: Stylized human figure, expression and demeanor should match their role, modern attire suggested by clean lines, approachable yet authoritative presence',

    // Lighting and color - let role inform palette
    'Lighting: Soft studio lighting from front-left, subtle rim light, cohesive muted color palette with accent color that complements the role personality',

    // Quality specifications
    'Quality: High resolution, crisp edges, no artifacts, suitable for circular crop, works well at small sizes as avatar',

    // Exclusions for consistency
    'Avoid: Photorealism, busy backgrounds, text, logos, hands, full body, excessive detail, cartoonish proportions',
  ].join('. ')

  return prompt
}

// =============================================================================
// Portrait Generation Service
// =============================================================================

/** Supported image generation providers */
const IMAGE_PROVIDERS = [
  'google',
  'openai',
  'stability',
  'together',
  'fal',
  'replicate',
] as const
type ImageProviderType = (typeof IMAGE_PROVIDERS)[number]

/**
 * Agent Portrait Service
 *
 * Generates unique AI portraits for agents based on their metadata
 */
export class AgentPortraitService {
  /**
   * Try to get an image generation provider configuration
   */
  private static async getImageConfig(): Promise<{
    config: Awaited<ReturnType<typeof CredentialService.getActiveConfig>>
    provider: ImageProviderType
  } | null> {
    // Try each provider until we find one that's configured
    for (const provider of IMAGE_PROVIDERS) {
      const config = await CredentialService.getActiveConfig(provider)
      if (config) {
        return { config, provider }
      }
    }
    return null
  }

  /**
   * Generate a portrait for an agent
   *
   * @param agent - Agent metadata (name, role, instructions)
   * @returns Promise with the generated portrait as base64 or error
   */
  static async generatePortrait(
    agent: Pick<Agent, 'name' | 'role' | 'instructions'>,
  ): Promise<PortraitGenerationResult> {
    try {
      // Get image generation configuration
      const imageConfig = await this.getImageConfig()

      if (!imageConfig || !imageConfig.config) {
        return {
          success: false,
          error:
            'No image generation provider configured. Please configure one in Settings (OpenAI, Google, Stability AI, Fal.ai, etc.).',
        }
      }

      const { config, provider } = imageConfig

      // Generate the prompt
      const prompt = generatePortraitPrompt(agent)

      // Generate the image
      const response = await ImageGenerationService.generate(
        prompt,
        {
          aspectRatio: '1:1', // Square portrait
          quality: 'standard',
          count: 1,
        },
        {
          provider,
          apiKey: config.apiKey!,
          baseUrl: config.baseUrl,
        },
        {
          agentId: 'portrait-generator',
        },
      )

      if (!response.images || response.images.length === 0) {
        return {
          success: false,
          error: 'No image was generated. Please try again.',
        }
      }

      const image = response.images[0]

      // Handle different response formats
      let base64Data: string

      if (image.base64) {
        base64Data = image.base64
      } else if (image.url) {
        // Fetch the image and convert to base64
        try {
          const imageResponse = await fetch(image.url)
          const blob = await imageResponse.blob()
          base64Data = await blobToBase64(blob)
        } catch {
          return {
            success: false,
            error: 'Failed to download generated image.',
          }
        }
      } else {
        return {
          success: false,
          error: 'Generated image has no data.',
        }
      }

      return {
        success: true,
        portrait: base64Data,
      }
    } catch (error) {
      console.error('Error generating agent portrait:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate portrait',
      }
    }
  }

  /**
   * Check if image generation is available
   */
  static async isAvailable(): Promise<boolean> {
    const imageConfig = await this.getImageConfig()
    return imageConfig !== null
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
