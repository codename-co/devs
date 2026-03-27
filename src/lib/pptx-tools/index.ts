/**
 * PPTX Tools Module
 *
 * Provides a tool for LLM agents to generate professional PowerPoint
 * presentations using pptxgenjs code.
 *
 * @module lib/pptx-tools
 *
 * @example
 * ```typescript
 * import { generatePptx, PPTX_TOOL_DEFINITIONS } from '@/lib/pptx-tools'
 *
 * const result = await generatePptx({
 *   title: 'Q4 Review',
 *   author: 'Jane Smith',
 *   organization: 'Acme Corp',
 *   slides: [
 *     { type: 'title', title: 'Q4 Review' },
 *     { type: 'agenda' },
 *     { type: 'section', title: 'Highlights' },
 *     { type: 'content', title: 'Revenue Growth', content: ['25% YoY increase', 'New markets opened'] },
 *     { type: 'qna' }
 *   ]
 * })
 *
 * console.log(result.code) // pptxgenjs JavaScript code
 * ```
 */

export {
  generatePptx,
  isGeneratePptxError,
  isGeneratePptxSuccess,
  PPTX_TOOL_DEFINITIONS,
} from './service'

export type {
  GeneratePptxParams,
  GeneratePptxResult,
  GeneratePptxError,
  PptxSlideContent,
  PptxToolName,
} from './types'
