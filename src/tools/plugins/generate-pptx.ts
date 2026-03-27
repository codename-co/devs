/**
 * PPTX Tool Plugin (Generate PPTX)
 *
 * A tool plugin that provides PowerPoint presentation generation capabilities.
 * Creates pptxgenjs JavaScript code for professional slide decks.
 *
 * @module tools/plugins/generate-pptx
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import { generatePptx, PPTX_TOOL_DEFINITIONS } from '@/lib/pptx-tools/service'
import type {
  GeneratePptxParams,
  GeneratePptxResult,
  GeneratePptxError,
} from '@/lib/pptx-tools/types'

// ============================================================================
// Generate PPTX Tool Plugin
// ============================================================================

/**
 * Generate PPTX tool plugin for creating PowerPoint presentations.
 *
 * This tool enables LLM agents to create professional presentations
 * as pptxgenjs JavaScript code that can be previewed and downloaded as .pptx files.
 */
export const generatePptxPlugin: ToolPlugin<
  GeneratePptxParams,
  GeneratePptxResult | GeneratePptxError
> = createToolPlugin({
  metadata: {
    name: 'generate_pptx',
    displayName: 'Generate PPTX',
    shortDescription: 'Create PowerPoint presentations',
    icon: 'Presentation',
    category: 'presentation',
    tags: ['presentation', 'slides', 'pptx', 'powerpoint', 'pptxgenjs'],
    enabledByDefault: false,
    estimatedDuration: 500,
    requiresConfirmation: false,
  },
  definition: PPTX_TOOL_DEFINITIONS.generate_pptx,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }

    return generatePptx(args)
  },
  validate: (args): GeneratePptxParams => {
    const params = args as GeneratePptxParams

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

export default generatePptxPlugin
