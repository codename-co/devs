/**
 * PPTX Tools Service
 *
 * This module provides the implementation for the generate_pptx tool.
 * It enables LLM agents to create PowerPoint presentations by generating
 * pptxgenjs JavaScript code.
 *
 * @module lib/pptx-tools/service
 */

import type {
  GeneratePptxParams,
  GeneratePptxResult,
  GeneratePptxError,
  PptxSlideContent,
} from './types'
import type { PptxTheme } from '@/lib/pptx-themes'
import { getPptxTheme, PPTX_THEME_AUTO } from '@/lib/pptx-themes'
import { userSettings, getEffectiveSettings } from '@/stores/userStore'

export { PPTX_TOOL_DEFINITIONS } from './types'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape a string for safe use in JavaScript code generation.
 * Handles single quotes, backslashes, and newlines.
 */
function escapeJs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

/**
 * Normalize content to an array of strings.
 */
function normalizeContent(content: string | string[] | undefined): string[] {
  if (!content) return []
  if (Array.isArray(content)) return content
  return content.split('\n').filter((line) => line.trim() !== '')
}

/**
 * Generate pptxgenjs code for a title slide.
 */
function generateTitleSlide(
  slideVar: string,
  slide: PptxSlideContent,
  params: GeneratePptxParams,
  theme: PptxTheme,
): string {
  const lines: string[] = []
  const title = slide.title || params.title

  lines.push(`${slideVar}.background = { color: '${theme.accentBg}' };`)
  lines.push(
    `${slideVar}.addText('${escapeJs(title)}', {`,
    `  x: 0.5, y: 1.2, w: 9, h: 1.5,`,
    `  fontSize: 36, fontFace: '${escapeJs(theme.headingFont)}',`,
    `  color: '${theme.accentText}', bold: true, align: 'center',`,
    `});`,
  )

  // Separator line
  lines.push(
    `${slideVar}.addShape(pres.ShapeType.line, {`,
    `  x: 3, y: 2.7, w: 4, h: 0,`,
    `  line: { color: '${theme.accentMuted}', width: 1 },`,
    `});`,
  )

  // Author and organization
  const authorLine = [params.author, params.organization]
    .filter(Boolean)
    .join(', ')
  if (authorLine) {
    lines.push(
      `${slideVar}.addText('${escapeJs(authorLine)}', {`,
      `  x: 0.5, y: 3, w: 9, h: 0.8,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', align: 'center',`,
      `});`,
    )
  }

  // Subtitle
  if (slide.subtitle) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.subtitle)}', {`,
      `  x: 0.5, y: 3.8, w: 9, h: 0.6,`,
      `  fontSize: 14, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', align: 'center',`,
      `});`,
    )
  }

  // Date and event footer
  const footerParts = [params.date, params.event].filter(Boolean).join(' — ')
  if (footerParts) {
    lines.push(
      `${slideVar}.addText('${escapeJs(footerParts)}', {`,
      `  x: 0.5, y: 4.8, w: 9, h: 0.5,`,
      `  fontSize: 10, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', align: 'center',`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for an agenda slide.
 */
function generateAgendaSlide(
  slideVar: string,
  slide: PptxSlideContent,
  allSlides: PptxSlideContent[],
  theme: PptxTheme,
): string {
  const lines: string[] = []
  const title = slide.title || 'Agenda'

  lines.push(`${slideVar}.background = { color: '${theme.contentBg}' };`)
  lines.push(
    `${slideVar}.addText('${escapeJs(title)}:', {`,
    `  x: 0.5, y: 0.3, w: 9, h: 0.8,`,
    `  fontSize: 28, fontFace: '${escapeJs(theme.headingFont)}',`,
    `  color: '${theme.primaryColor}', bold: true,`,
    `});`,
  )

  // Collect section titles or use provided content
  const sections = allSlides
    .filter((s) => s.type === 'section' && s.title)
    .map((s) => s.title!)

  const items = sections.length > 0 ? sections : normalizeContent(slide.content)

  if (items.length > 0) {
    const textRuns = items
      .map((item, i) => {
        const isLast = i === items.length - 1
        const text = `${i + 1}. ${item}`
        return `  { text: '${escapeJs(text)}', options: { ${isLast ? '' : 'breakLine: true'} } }`
      })
      .join(',\n')

    lines.push(
      `${slideVar}.addText([`,
      textRuns,
      `], {`,
      `  x: 0.8, y: 1.5, w: 8, h: 3,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.contentText}', lineSpacingMultiple: 1.5,`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a section divider slide.
 */
function generateSectionSlide(
  slideVar: string,
  slide: PptxSlideContent,
  theme: PptxTheme,
): string {
  const lines: string[] = []
  const title = slide.title || 'Section'

  lines.push(`${slideVar}.background = { color: '${theme.accentBg}' };`)
  lines.push(
    `${slideVar}.addText('${escapeJs(title)}', {`,
    `  x: 0.5, y: 2, w: 9, h: 1.5,`,
    `  fontSize: 32, fontFace: '${escapeJs(theme.headingFont)}',`,
    `  color: '${theme.accentText}', bold: true, align: 'center',`,
    `});`,
  )

  if (slide.subtitle) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.subtitle)}', {`,
      `  x: 0.5, y: 3.5, w: 9, h: 0.8,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', italic: true, align: 'center',`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a content slide.
 */
function generateContentSlide(
  slideVar: string,
  slide: PptxSlideContent,
  theme: PptxTheme,
): string {
  const lines: string[] = []

  lines.push(`${slideVar}.background = { color: '${theme.contentBg}' };`)

  if (slide.title) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.title)}', {`,
      `  x: 0.5, y: 0.3, w: 9, h: 0.8,`,
      `  fontSize: 24, fontFace: '${escapeJs(theme.headingFont)}',`,
      `  color: '${theme.primaryColor}',`,
      `});`,
    )
  }

  const items = normalizeContent(slide.content)
  if (items.length > 0) {
    const textRuns = items
      .map((item, i) => {
        const isLast = i === items.length - 1
        // Strip leading "- " or "* " for bullet formatting
        const cleanItem = item.replace(/^[-*]\s+/, '')
        return `  { text: '${escapeJs(cleanItem)}', options: { ${isLast ? '' : 'breakLine: true'} } }`
      })
      .join(',\n')

    lines.push(
      `${slideVar}.addText([`,
      textRuns,
      `], {`,
      `  x: 0.8, y: 1.5, w: 8, h: 3,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.contentText}', bullet: true, lineSpacingMultiple: 1.5,`,
      `});`,
    )
  } else if (typeof slide.content === 'string' && slide.content) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.content)}', {`,
      `  x: 0.8, y: 1.5, w: 8, h: 3,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.contentText}', lineSpacingMultiple: 1.5,`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a quote slide.
 */
function generateQuoteSlide(
  slideVar: string,
  slide: PptxSlideContent,
  theme: PptxTheme,
): string {
  const lines: string[] = []

  lines.push(`${slideVar}.background = { color: '${theme.accentBg}' };`)

  if (slide.title) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.title)}', {`,
      `  x: 1, y: 1.5, w: 8, h: 0.8,`,
      `  fontSize: 20, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', italic: true,`,
      `});`,
    )
  }

  const quoteText =
    typeof slide.content === 'string'
      ? slide.content
      : Array.isArray(slide.content)
        ? slide.content.join('\n')
        : ''
  if (quoteText) {
    lines.push(
      `${slideVar}.addText('${escapeJs(quoteText)}', {`,
      `  x: 1, y: 2.3, w: 8, h: 1.2,`,
      `  fontSize: 28, fontFace: '${escapeJs(theme.headingFont)}',`,
      `  color: '${theme.accentText}', bold: true, align: 'center',`,
      `});`,
    )
  }

  if (slide.subtitle) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.subtitle)}', {`,
      `  x: 1, y: 3.5, w: 8, h: 0.8,`,
      `  fontSize: 16, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', italic: true, align: 'center',`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a comparison slide.
 */
function generateComparisonSlide(
  slideVar: string,
  slide: PptxSlideContent,
  theme: PptxTheme,
): string {
  const lines: string[] = []

  lines.push(`${slideVar}.background = { color: '${theme.contentBg}' };`)

  if (slide.title) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.title)}', {`,
      `  x: 0.5, y: 0.3, w: 9, h: 0.8,`,
      `  fontSize: 24, fontFace: '${escapeJs(theme.headingFont)}',`,
      `  color: '${theme.primaryColor}',`,
      `});`,
    )
  }

  const items = normalizeContent(slide.content)
  if (items.length > 0) {
    const textRuns = items
      .map((item, i) => {
        const isLast = i === items.length - 1
        return `  { text: '${escapeJs(item)}', options: { ${isLast ? '' : 'breakLine: true'} } }`
      })
      .join(',\n')

    lines.push(
      `${slideVar}.addText([`,
      textRuns,
      `], {`,
      `  x: 0.8, y: 1.5, w: 8, h: 3,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.contentText}', lineSpacingMultiple: 1.5,`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a summary slide.
 */
function generateSummarySlide(
  slideVar: string,
  slide: PptxSlideContent,
  theme: PptxTheme,
): string {
  const lines: string[] = []
  const title = slide.title || 'Key Takeaways'

  lines.push(`${slideVar}.background = { color: '${theme.contentBg}' };`)
  lines.push(
    `${slideVar}.addText('${escapeJs(title)}', {`,
    `  x: 0.5, y: 0.3, w: 9, h: 0.8,`,
    `  fontSize: 24, fontFace: '${escapeJs(theme.headingFont)}',`,
    `  color: '${theme.primaryColor}', bold: true,`,
    `});`,
  )

  const items = normalizeContent(slide.content)
  if (items.length > 0) {
    const textRuns = items
      .map((item, i) => {
        const isLast = i === items.length - 1
        const cleanItem = item.replace(/^[-*]\s+/, '')
        return `  { text: '${escapeJs(cleanItem)}', options: { ${isLast ? '' : 'breakLine: true'} } }`
      })
      .join(',\n')

    lines.push(
      `${slideVar}.addText([`,
      textRuns,
      `], {`,
      `  x: 0.8, y: 1.5, w: 8, h: 3,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.contentText}', bullet: true, lineSpacingMultiple: 1.5,`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a Q&A / closing slide.
 */
function generateQnASlide(
  slideVar: string,
  slide: PptxSlideContent,
  theme: PptxTheme,
): string {
  const lines: string[] = []
  const title = slide.title || 'Thank you'

  lines.push(`${slideVar}.background = { color: '${theme.accentBg}' };`)
  lines.push(
    `${slideVar}.addText('${escapeJs(title)}', {`,
    `  x: 0.5, y: 2, w: 9, h: 1.5,`,
    `  fontSize: 36, fontFace: '${escapeJs(theme.headingFont)}',`,
    `  color: '${theme.accentText}', bold: true, align: 'center',`,
    `});`,
  )

  if (slide.subtitle) {
    lines.push(
      `${slideVar}.addText('${escapeJs(slide.subtitle)}', {`,
      `  x: 0.5, y: 3.5, w: 9, h: 0.8,`,
      `  fontSize: 18, fontFace: '${escapeJs(theme.bodyFont)}',`,
      `  color: '${theme.accentMuted}', align: 'center',`,
      `});`,
    )
  }

  return lines.join('\n')
}

/**
 * Generate pptxgenjs code for a single slide.
 */
function generateSlide(
  slideVar: string,
  slide: PptxSlideContent,
  params: GeneratePptxParams,
  allSlides: PptxSlideContent[],
  theme: PptxTheme,
): string {
  switch (slide.type) {
    case 'title':
      return generateTitleSlide(slideVar, slide, params, theme)
    case 'agenda':
      return generateAgendaSlide(slideVar, slide, allSlides, theme)
    case 'section':
      return generateSectionSlide(slideVar, slide, theme)
    case 'quote':
      return generateQuoteSlide(slideVar, slide, theme)
    case 'comparison':
      return generateComparisonSlide(slideVar, slide, theme)
    case 'summary':
      return generateSummarySlide(slideVar, slide, theme)
    case 'qna':
      return generateQnASlide(slideVar, slide, theme)
    case 'content':
    default:
      return generateContentSlide(slideVar, slide, theme)
  }
}

// ============================================================================
// Generate PPTX Tool Implementation
// ============================================================================

/**
 * Type guard to check if result is an error.
 */
export function isGeneratePptxError(
  result: GeneratePptxResult | GeneratePptxError,
): result is GeneratePptxError {
  return 'error' in result
}

/**
 * Type guard to check if result is successful.
 */
export function isGeneratePptxSuccess(
  result: GeneratePptxResult | GeneratePptxError,
): result is GeneratePptxResult {
  return 'code' in result
}

/**
 * Generate pptxgenjs JavaScript code for a PowerPoint presentation.
 *
 * @param params - The presentation parameters
 * @returns Promise resolving to GeneratePptxResult or GeneratePptxError
 */
export async function generatePptx(
  params: GeneratePptxParams,
): Promise<GeneratePptxResult | GeneratePptxError> {
  if (!params.title || typeof params.title !== 'string') {
    return {
      error: 'validation',
      message: 'Title is required and must be a string',
    }
  }

  if (!Array.isArray(params.slides) || params.slides.length === 0) {
    return {
      error: 'validation',
      message: 'Slides array is required and must not be empty',
    }
  }

  try {
    // Resolve the PPTX theme from effective settings (space-aware)
    const { pptxTheme: pptxThemeId } = getEffectiveSettings()
    const { colorTheme: currentColorTheme } = userSettings.getState()
    const theme = getPptxTheme(
      pptxThemeId ?? PPTX_THEME_AUTO,
      currentColorTheme,
    )

    const codeLines: string[] = []

    // Presentation setup
    codeLines.push(`const pres = new pptxgen();`)
    codeLines.push(`pres.layout = 'LAYOUT_16x9';`)
    codeLines.push(`pres.title = '${escapeJs(params.title)}';`)
    if (params.author) {
      codeLines.push(`pres.author = '${escapeJs(params.author)}';`)
    }
    codeLines.push(
      `pres.theme = { headFontFace: '${escapeJs(theme.headingFont)}', bodyFontFace: '${escapeJs(theme.bodyFont)}' };`,
    )
    codeLines.push('')

    // Generate each slide
    params.slides.forEach((slide, index) => {
      const slideNum = index + 1
      const slideVar = `slide${slideNum}`

      codeLines.push(
        `// Slide ${slideNum}${slide.title ? ` — ${slide.title}` : ''}`,
      )
      codeLines.push(`let ${slideVar} = pres.addSlide();`)

      // Slide number (skip title slide)
      if (slide.type !== 'title') {
        codeLines.push(
          `${slideVar}.slideNumber = { x: '95%', y: '95%', fontSize: 10, color: '${theme.contentMuted}' };`,
        )
      }

      const slideCode = generateSlide(
        slideVar,
        slide,
        params,
        params.slides,
        theme,
      )
      codeLines.push(slideCode)

      // Add speaker notes if present
      if (slide.notes) {
        codeLines.push(`${slideVar}.addNotes('${escapeJs(slide.notes)}');`)
      }

      codeLines.push('')
    })

    const code = codeLines.join('\n')

    return {
      code,
      slideCount: params.slides.length,
      metadata: {
        title: params.title,
        author: params.author,
      },
    }
  } catch (error) {
    return {
      error: 'generation',
      message:
        error instanceof Error ? error.message : 'Failed to generate PPTX',
    }
  }
}
