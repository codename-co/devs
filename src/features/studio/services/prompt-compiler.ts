/**
 * Prompt Compiler Service
 *
 * Compiles user prompts with preset settings into optimized prompts
 * for image generation models. Handles style injection, quality keywords,
 * and provider-specific optimizations.
 */

import {
  ImageGenerationSettings,
  ImageStyle,
  LightingPreset,
  ColorPalette,
  CompositionPreset,
  ImageQuality,
  EnhancedPrompt,
  PromptEnhancementOptions,
} from '../types'

// =============================================================================
// Style Keyword Mappings
// =============================================================================

const STYLE_KEYWORDS: Record<ImageStyle, string[]> = {
  natural: ['photorealistic', 'realistic', 'natural lighting'],
  vivid: ['vibrant colors', 'high saturation', 'vivid', 'colorful'],
  artistic: ['artistic', 'painterly', 'expressive brushstrokes'],
  anime: ['anime style', 'manga', 'Japanese animation aesthetic'],
  'digital-art': ['digital art', 'digital illustration', 'clean lines'],
  cinematic: ['cinematic', 'film still', 'movie scene', 'anamorphic'],
  fantasy: ['fantasy art', 'epic fantasy', 'magical', 'ethereal'],
  minimalist: ['minimalist', 'clean', 'simple', 'negative space'],
  vintage: ['vintage', 'retro', 'nostalgic', 'film grain'],
  '3d-render': ['3D render', 'octane render', 'blender', 'CGI'],
  watercolor: ['watercolor painting', 'watercolor art', 'soft edges', 'paper texture'],
  'oil-painting': ['oil painting', 'impasto', 'canvas texture', 'classical art'],
  sketch: ['pencil sketch', 'hand drawn', 'line art', 'graphite'],
  'pixel-art': ['pixel art', '8-bit', 'retro game', 'pixelated'],
  comic: ['comic book style', 'graphic novel', 'bold outlines', 'halftone'],
  abstract: ['abstract art', 'non-representational', 'geometric shapes'],
  none: [],
}

const LIGHTING_KEYWORDS: Record<LightingPreset, string[]> = {
  natural: ['natural daylight', 'sun lighting'],
  studio: ['studio lighting', 'professional lighting', 'softbox'],
  dramatic: ['dramatic lighting', 'high contrast', 'chiaroscuro'],
  soft: ['soft lighting', 'diffused light', 'gentle shadows'],
  'golden-hour': ['golden hour', 'warm sunset light', 'magic hour'],
  neon: ['neon lighting', 'cyberpunk lights', 'glowing'],
  moody: ['moody lighting', 'atmospheric', 'dark ambiance'],
  backlit: ['backlit', 'rim lighting', 'silhouette'],
  none: [],
}

const COLOR_KEYWORDS: Record<ColorPalette, string[]> = {
  vibrant: ['vibrant colors', 'bold palette', 'saturated'],
  pastel: ['pastel colors', 'soft palette', 'muted tones'],
  monochrome: ['black and white', 'monochromatic', 'grayscale'],
  sepia: ['sepia tone', 'warm brown tones', 'vintage color'],
  cool: ['cool tones', 'blue palette', 'cold colors'],
  warm: ['warm tones', 'orange and red palette', 'warm colors'],
  earth: ['earth tones', 'natural colors', 'organic palette'],
  neon: ['neon colors', 'fluorescent', 'electric colors'],
  muted: ['muted colors', 'desaturated', 'subtle palette'],
  none: [],
}

const COMPOSITION_KEYWORDS: Record<CompositionPreset, string[]> = {
  portrait: ['portrait shot', 'head and shoulders', 'face focused'],
  landscape: ['wide shot', 'panoramic view', 'landscape composition'],
  'close-up': ['close-up shot', 'macro', 'detailed view'],
  'wide-angle': ['wide angle lens', 'expansive view', '24mm'],
  aerial: ['aerial view', 'birds eye view', 'drone shot'],
  'low-angle': ['low angle shot', 'looking up', 'heroic angle'],
  'dutch-angle': ['dutch angle', 'tilted frame', 'dynamic composition'],
  symmetrical: ['symmetrical composition', 'centered', 'balanced'],
  'rule-of-thirds': ['rule of thirds', 'balanced composition'],
  none: [],
}

const QUALITY_KEYWORDS: Record<ImageQuality, string[]> = {
  draft: [],
  standard: ['high quality', 'detailed'],
  hd: ['highly detailed', '4K', 'sharp focus', 'high resolution'],
  ultra: [
    'ultra detailed',
    '8K',
    'masterpiece',
    'best quality',
    'intricate details',
    'sharp focus',
  ],
}

// =============================================================================
// Prompt Compilation
// =============================================================================

/**
 * Compiles a user prompt with settings into an optimized generation prompt
 */
export function compilePrompt(
  userPrompt: string,
  settings: ImageGenerationSettings,
): string {
  const parts: string[] = []

  // Start with the user's prompt
  parts.push(userPrompt.trim())

  // Add style keywords
  if (settings.style !== 'none') {
    const styleKeywords = STYLE_KEYWORDS[settings.style]
    if (styleKeywords.length > 0) {
      parts.push(styleKeywords.slice(0, 2).join(', '))
    }
  }

  // Add lighting keywords
  if (settings.lighting !== 'none') {
    const lightingKeywords = LIGHTING_KEYWORDS[settings.lighting]
    if (lightingKeywords.length > 0) {
      parts.push(lightingKeywords[0])
    }
  }

  // Add color palette keywords
  if (settings.colorPalette !== 'none') {
    const colorKeywords = COLOR_KEYWORDS[settings.colorPalette]
    if (colorKeywords.length > 0) {
      parts.push(colorKeywords[0])
    }
  }

  // Add composition keywords
  if (settings.composition !== 'none') {
    const compositionKeywords = COMPOSITION_KEYWORDS[settings.composition]
    if (compositionKeywords.length > 0) {
      parts.push(compositionKeywords[0])
    }
  }

  // Add quality keywords
  const qualityKeywords = QUALITY_KEYWORDS[settings.quality]
  if (qualityKeywords.length > 0) {
    parts.push(qualityKeywords.slice(0, 2).join(', '))
  }

  return parts.join(', ')
}

/**
 * Enhances a prompt with AI-optimized keywords
 */
export function enhancePrompt(
  prompt: string,
  options: PromptEnhancementOptions = {},
): EnhancedPrompt {
  const additions: string[] = []

  if (options.enhanceStyle) {
    additions.push('trending on artstation', 'award winning')
  }

  if (options.enhanceQuality) {
    additions.push('highly detailed', 'sharp focus', 'professional')
  }

  if (options.enhanceTechnical) {
    additions.push('DSLR photo', 'f/2.8', 'bokeh')
  }

  if (options.expandDetails && prompt.length < 50) {
    additions.push('intricate details', 'rich textures')
  }

  const enhanced = additions.length > 0
    ? `${prompt}, ${additions.join(', ')}`
    : prompt

  return {
    original: prompt,
    enhanced,
    additions,
  }
}

/**
 * Generates a negative prompt based on settings
 */
export function generateNegativePrompt(
  userNegativePrompt?: string,
  settings?: Partial<ImageGenerationSettings>,
): string {
  const negatives: string[] = [
    'blurry',
    'bad quality',
    'distorted',
    'deformed',
    'ugly',
    'duplicate',
    'watermark',
    'text',
    'logo',
  ]

  // Add style-specific negatives
  if (settings?.style === 'natural') {
    negatives.push('cartoon', 'anime', 'illustration', 'drawing')
  } else if (settings?.style === 'anime') {
    negatives.push('realistic', 'photorealistic', '3D')
  }

  // Add user's negative prompt
  if (userNegativePrompt?.trim()) {
    negatives.unshift(userNegativePrompt.trim())
  }

  return negatives.join(', ')
}

/**
 * Gets dimensions from aspect ratio and quality
 */
export function getDimensionsFromSettings(
  settings: ImageGenerationSettings,
): { width: number; height: number } {
  // Custom dimensions override
  if (settings.width && settings.height) {
    return { width: settings.width, height: settings.height }
  }

  // Base size based on quality
  const baseSizes: Record<ImageQuality, number> = {
    draft: 512,
    standard: 1024,
    hd: 1024,
    ultra: 1024, // Most providers max at 1024, upscaling handles ultra
  }

  const baseSize = baseSizes[settings.quality]

  // Aspect ratio to dimensions mapping
  const aspectRatios: Record<string, { width: number; height: number }> = {
    '1:1': { width: baseSize, height: baseSize },
    '16:9': { width: Math.round(baseSize * 1.75), height: baseSize },
    '9:16': { width: baseSize, height: Math.round(baseSize * 1.75) },
    '4:3': { width: Math.round(baseSize * 1.33), height: baseSize },
    '3:4': { width: baseSize, height: Math.round(baseSize * 1.33) },
    '3:2': { width: Math.round(baseSize * 1.5), height: baseSize },
    '2:3': { width: baseSize, height: Math.round(baseSize * 1.5) },
    '21:9': { width: Math.round(baseSize * 2.33), height: baseSize },
  }

  return aspectRatios[settings.aspectRatio] || { width: baseSize, height: baseSize }
}

/**
 * Validates and normalizes a prompt
 */
export function normalizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s,.!?-]/g, '') // Remove special characters except basic punctuation
    .slice(0, 4000) // Max length for most providers
}
