/**
 * Built-in Image Generation Presets
 *
 * Pre-configured presets for common image generation use cases.
 * Users can use these as-is or as starting points for custom presets.
 */

import { ImagePreset, PresetCategory } from '../types'

/**
 * Built-in presets organized by category
 */
export const BUILT_IN_PRESETS: ImagePreset[] = [
  // ==========================================================================
  // Photography Presets
  // ==========================================================================
  {
    id: 'preset-photo-portrait',
    name: 'Portrait Photo',
    description: 'Professional portrait photography style',
    icon: '📸',
    settings: {
      style: 'natural',
      lighting: 'studio',
      composition: 'portrait',
      aspectRatio: '3:4',
      quality: 'hd',
    },
    tags: ['photography', 'portrait'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-photo-landscape',
    name: 'Landscape Photo',
    description: 'Stunning landscape photography',
    icon: '🏞️',
    settings: {
      style: 'natural',
      lighting: 'golden-hour',
      composition: 'landscape',
      aspectRatio: '16:9',
      quality: 'hd',
      colorPalette: 'vibrant',
    },
    tags: ['photography', 'landscape', 'nature'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-photo-product',
    name: 'Product Shot',
    description: 'Clean product photography',
    icon: '📦',
    settings: {
      style: 'natural',
      lighting: 'studio',
      composition: 'close-up',
      aspectRatio: '1:1',
      quality: 'hd',
      colorPalette: 'muted',
    },
    tags: ['photography', 'product', 'commercial'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-photo-street',
    name: 'Street Photography',
    description: 'Urban street photography style',
    icon: '🌆',
    settings: {
      style: 'natural',
      lighting: 'natural',
      composition: 'wide-angle',
      aspectRatio: '3:2',
      quality: 'standard',
      colorPalette: 'muted',
    },
    tags: ['photography', 'street', 'urban'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },

  // ==========================================================================
  // Artistic Presets
  // ==========================================================================
  {
    id: 'preset-art-watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting style',
    icon: '🎨',
    settings: {
      style: 'watercolor',
      lighting: 'soft',
      colorPalette: 'pastel',
      aspectRatio: '4:3',
      quality: 'hd',
    },
    tags: ['art', 'painting', 'watercolor'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-art-oil',
    name: 'Oil Painting',
    description: 'Classic oil painting style',
    icon: '🖼️',
    settings: {
      style: 'oil-painting',
      lighting: 'dramatic',
      colorPalette: 'warm',
      aspectRatio: '4:3',
      quality: 'hd',
    },
    tags: ['art', 'painting', 'classical'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-art-anime',
    name: 'Anime Style',
    description: 'Japanese anime/manga aesthetic',
    icon: '✨',
    settings: {
      style: 'anime',
      lighting: 'soft',
      colorPalette: 'vibrant',
      aspectRatio: '16:9',
      quality: 'hd',
    },
    tags: ['art', 'anime', 'illustration'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-art-sketch',
    name: 'Pencil Sketch',
    description: 'Hand-drawn pencil sketch look',
    icon: '✏️',
    settings: {
      style: 'sketch',
      colorPalette: 'monochrome',
      aspectRatio: '1:1',
      quality: 'standard',
    },
    tags: ['art', 'sketch', 'drawing'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-art-abstract',
    name: 'Abstract Art',
    description: 'Modern abstract composition',
    icon: '🔷',
    settings: {
      style: 'abstract',
      colorPalette: 'vibrant',
      aspectRatio: '1:1',
      quality: 'hd',
    },
    tags: ['art', 'abstract', 'modern'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },

  // ==========================================================================
  // Digital Art Presets
  // ==========================================================================
  {
    id: 'preset-digital-3d',
    name: '3D Render',
    description: 'High-quality 3D rendered look',
    icon: '🎮',
    settings: {
      style: '3d-render',
      lighting: 'studio',
      aspectRatio: '16:9',
      quality: 'ultra',
    },
    tags: ['digital', '3d', 'render'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-digital-pixel',
    name: 'Pixel Art',
    description: 'Retro 8-bit pixel art style',
    icon: '👾',
    settings: {
      style: 'pixel-art',
      colorPalette: 'vibrant',
      aspectRatio: '1:1',
      quality: 'standard',
    },
    tags: ['digital', 'pixel', 'retro'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-digital-comic',
    name: 'Comic Book',
    description: 'Bold comic book illustration',
    icon: '💥',
    settings: {
      style: 'comic',
      colorPalette: 'vibrant',
      aspectRatio: '3:4',
      quality: 'hd',
    },
    tags: ['digital', 'comic', 'illustration'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },

  // ==========================================================================
  // Concept Art Presets
  // ==========================================================================
  {
    id: 'preset-concept-fantasy',
    name: 'Epic Fantasy',
    description: 'High fantasy concept art',
    icon: '⚔️',
    settings: {
      style: 'fantasy',
      lighting: 'dramatic',
      colorPalette: 'warm',
      composition: 'wide-angle',
      aspectRatio: '21:9',
      quality: 'ultra',
    },
    tags: ['concept', 'fantasy', 'epic'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-concept-scifi',
    name: 'Sci-Fi',
    description: 'Futuristic science fiction art',
    icon: '🚀',
    settings: {
      style: 'cinematic',
      lighting: 'neon',
      colorPalette: 'cool',
      composition: 'wide-angle',
      aspectRatio: '21:9',
      quality: 'ultra',
    },
    tags: ['concept', 'scifi', 'futuristic'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-concept-character',
    name: 'Character Design',
    description: 'Character concept art',
    icon: '🦸',
    settings: {
      style: 'digital-art',
      lighting: 'studio',
      composition: 'portrait',
      aspectRatio: '3:4',
      quality: 'hd',
    },
    tags: ['concept', 'character', 'design'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-concept-environment',
    name: 'Environment Art',
    description: 'Detailed environment concept',
    icon: '🏔️',
    settings: {
      style: 'cinematic',
      lighting: 'golden-hour',
      colorPalette: 'earth',
      composition: 'landscape',
      aspectRatio: '21:9',
      quality: 'ultra',
    },
    tags: ['concept', 'environment', 'landscape'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },

  // ==========================================================================
  // Marketing & Social Media Presets
  // ==========================================================================
  {
    id: 'preset-social-instagram',
    name: 'Instagram Post',
    description: 'Perfect for Instagram feed',
    icon: '📱',
    settings: {
      aspectRatio: '1:1',
      quality: 'hd',
      colorPalette: 'vibrant',
    },
    tags: ['social', 'instagram', 'marketing'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-social-story',
    name: 'Story/Reel',
    description: 'Vertical format for stories',
    icon: '📲',
    settings: {
      aspectRatio: '9:16',
      quality: 'hd',
      colorPalette: 'vibrant',
    },
    tags: ['social', 'story', 'vertical'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-social-banner',
    name: 'Social Banner',
    description: 'Wide banner for social headers',
    icon: '🖼️',
    settings: {
      aspectRatio: '16:9',
      quality: 'hd',
      style: 'vivid',
    },
    tags: ['social', 'banner', 'header'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-marketing-hero',
    name: 'Hero Image',
    description: 'Website hero section image',
    icon: '🦸',
    settings: {
      aspectRatio: '21:9',
      quality: 'ultra',
      style: 'cinematic',
      lighting: 'dramatic',
    },
    tags: ['marketing', 'hero', 'website'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },

  // ==========================================================================
  // Special Effects Presets
  // ==========================================================================
  {
    id: 'preset-fx-vintage',
    name: 'Vintage Film',
    description: 'Classic vintage film look',
    icon: '📽️',
    settings: {
      style: 'vintage',
      colorPalette: 'sepia',
      quality: 'standard',
    },
    tags: ['effect', 'vintage', 'retro'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-fx-cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit cyberpunk aesthetic',
    icon: '🌃',
    settings: {
      style: 'cinematic',
      lighting: 'neon',
      colorPalette: 'neon',
      quality: 'hd',
    },
    tags: ['effect', 'cyberpunk', 'neon'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-fx-moody',
    name: 'Moody Dark',
    description: 'Dark and atmospheric mood',
    icon: '🌑',
    settings: {
      style: 'cinematic',
      lighting: 'moody',
      colorPalette: 'cool',
      quality: 'hd',
    },
    tags: ['effect', 'moody', 'dark'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'preset-fx-minimalist',
    name: 'Clean Minimal',
    description: 'Clean minimalist design',
    icon: '⬜',
    settings: {
      style: 'minimalist',
      colorPalette: 'muted',
      composition: 'symmetrical',
      quality: 'hd',
    },
    tags: ['effect', 'minimal', 'clean'],
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
]

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): ImagePreset[] {
  const categoryTags: Record<PresetCategory, string[]> = {
    style: ['effect', 'vintage', 'moody', 'minimal'],
    photography: ['photography', 'portrait', 'landscape', 'product'],
    illustration: ['art', 'painting', 'drawing'],
    'concept-art': ['concept', 'fantasy', 'scifi', 'character'],
    marketing: ['marketing', 'social', 'banner'],
    'social-media': ['social', 'instagram', 'story'],
    custom: [],
  }

  const tags = categoryTags[category]
  return BUILT_IN_PRESETS.filter((preset) =>
    preset.tags?.some((tag) => tags.includes(tag)),
  )
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): ImagePreset | undefined {
  return BUILT_IN_PRESETS.find((preset) => preset.id === id)
}

/**
 * Search presets by name or tags
 */
export function searchPresets(query: string): ImagePreset[] {
  const lowerQuery = query.toLowerCase()
  return BUILT_IN_PRESETS.filter(
    (preset) =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description?.toLowerCase().includes(lowerQuery) ||
      preset.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  )
}
