/**
 * Presentation Tools Module
 *
 * Provides a tool for LLM agents to generate professional presentations
 * in Marpit markdown format.
 *
 * Features:
 * - Complete Marpit markdown generation with YAML frontmatter
 * - Multiple slide types (title, agenda, section, content, quote, etc.)
 * - Professional formatting and visual hierarchy
 * - Speaker notes support
 * - Automatic agenda generation with linked sections
 *
 * @module lib/presentation-tools
 *
 * @example
 * ```typescript
 * import { generatePresentation, PRESENTATION_TOOL_DEFINITIONS } from '@/lib/presentation-tools'
 *
 * // Generate a simple presentation
 * const result = await generatePresentation({
 *   title: 'Q4 Review',
 *   author: 'Jane Smith',
 *   organization: 'Acme Corp',
 *   date: 'January 2026',
 *   slides: [
 *     { type: 'title', title: 'Q4 Review' },
 *     { type: 'agenda' },
 *     { type: 'section', title: 'Highlights' },
 *     { type: 'content', title: 'Revenue Growth', content: '- 25% YoY increase\n- New markets opened' },
 *     { type: 'summary', content: '- Strong quarter\n- Exceeded targets' },
 *     { type: 'qna' }
 *   ]
 * })
 *
 * console.log(result.markdown) // Complete Marpit markdown
 *
 * // Get tool definition for LLM
 * const toolDef = PRESENTATION_TOOL_DEFINITIONS.generate_presentation
 * ```
 */

export {
  generatePresentation,
  isGeneratePresentationError,
  isGeneratePresentationSuccess,
  PRESENTATION_TOOL_DEFINITIONS,
} from './service'

export type {
  GeneratePresentationParams,
  GeneratePresentationResult,
  GeneratePresentationError,
  SlideContent,
  PresentationToolName,
} from './types'
