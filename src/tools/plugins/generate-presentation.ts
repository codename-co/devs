/**
 * Presentation Tool Plugin (Generate Presentation)
 *
 * A tool plugin that provides Marpit presentation generation capabilities.
 * Creates professional slide deck presentations in valid Marpit markdown format.
 *
 * @module tools/plugins/generate-presentation
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import {
  generatePresentation,
  PRESENTATION_TOOL_DEFINITIONS,
} from '@/lib/presentation-tools/service'
import type {
  GeneratePresentationParams,
  GeneratePresentationResult,
  GeneratePresentationError,
} from '@/lib/presentation-tools/types'

// ============================================================================
// Generate Presentation Tool Plugin
// ============================================================================

/**
 * Generate presentation tool plugin for creating Marpit slide decks.
 *
 * This tool enables LLM agents to create professional presentations
 * in valid Marpit markdown format.
 *
 * Features:
 * - Multiple slide types (title, agenda, content, section, quote, comparison, summary, qna)
 * - YAML frontmatter with presentation metadata
 * - Speaker notes support
 * - Professional formatting and visual hierarchy
 *
 * @example
 * ```typescript
 * import { generatePresentationPlugin } from '@/tools/plugins/generate-presentation'
 * import { toolRegistry } from '@/tools'
 *
 * // Register the plugin
 * toolRegistry.register(generatePresentationPlugin)
 * ```
 */
export const generatePresentationPlugin: ToolPlugin<
  GeneratePresentationParams,
  GeneratePresentationResult | GeneratePresentationError
> = createToolPlugin({
  metadata: {
    name: 'generate_presentation',
    displayName: 'Generate Presentation',
    shortDescription: 'Create Marpit slide deck presentations',
    icon: 'Presentation',
    category: 'presentation',
    tags: ['presentation', 'slides', 'marpit', 'markdown', 'deck'],
    enabledByDefault: false,
    estimatedDuration: 500,
    requiresConfirmation: false,
  },
  definition: PRESENTATION_TOOL_DEFINITIONS.generate_presentation,
  handler: async (args, context) => {
    // Check for abort signal
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }

    return generatePresentation(args)
  },
  validate: (args): GeneratePresentationParams => {
    const params = args as GeneratePresentationParams

    if (!params.title || typeof params.title !== 'string') {
      throw new Error('Title is required and must be a string')
    }

    if (params.title.trim() === '') {
      throw new Error('Title cannot be empty')
    }

    if (!params.slides || !Array.isArray(params.slides)) {
      throw new Error('Slides array is required')
    }

    if (params.slides.length === 0) {
      throw new Error('At least one slide is required')
    }

    return params
  },
})

export default generatePresentationPlugin
