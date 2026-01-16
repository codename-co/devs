/**
 * Presentation Tools Service
 *
 * This module provides the implementation for the generate_presentation tool.
 * It enables LLM agents to create professional Marpit markdown presentations.
 *
 * @module lib/presentation-tools/service
 */

import type {
  GeneratePresentationParams,
  GeneratePresentationResult,
  GeneratePresentationError,
  SlideContent,
} from './types'

export { PRESENTATION_TOOL_DEFINITIONS } from './types'

// ============================================================================
// Constants
// ============================================================================

/**
 * Marpit-required directives that must be preserved.
 */
const REQUIRED_DIRECTIVES = {
  marp: true,
  theme: 'devs',
  paginate: true,
  _paginate: false,
  size: '16:9',
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Slugify a string for use as an anchor ID.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Generate YAML frontmatter for the presentation.
 */
function generateFrontmatter(params: GeneratePresentationParams): string {
  const lines: string[] = ['---']

  lines.push(`title: ${params.title}`)

  if (params.author) {
    lines.push(`author: ${params.author}`)
  }

  lines.push(`marp: ${REQUIRED_DIRECTIVES.marp}`)
  lines.push(`theme: ${REQUIRED_DIRECTIVES.theme}`)
  lines.push(`lang: ${params.lang || 'en'}`)
  lines.push(`paginate: ${REQUIRED_DIRECTIVES.paginate}`)
  lines.push(`_paginate: ${REQUIRED_DIRECTIVES._paginate}`)
  lines.push(`size: ${REQUIRED_DIRECTIVES.size}`)

  lines.push('---')

  return lines.join('\n')
}

/**
 * Generate a title slide.
 */
function generateTitleSlide(
  slide: SlideContent,
  params: GeneratePresentationParams,
): string {
  const lines: string[] = []

  // Main title
  lines.push(`# ${slide.title || params.title}`)

  // Horizontal rule separator
  lines.push('')
  lines.push('<hr>')
  lines.push('')

  // Author and organization
  const authorLine = [params.author, params.organization]
    .filter(Boolean)
    .join(', ')
  if (authorLine) {
    lines.push(authorLine)
  }

  // Subtitle if provided
  if (slide.subtitle) {
    lines.push('')
    lines.push(slide.subtitle)
  }

  // Footer with date and event
  if (params.date || params.event) {
    const footerParts = [params.date, params.event].filter(Boolean).join(' — ')
    lines.push('')
    lines.push(`<!-- _footer: ${footerParts} -->`)
  }

  return lines.join('\n')
}

/**
 * Generate an agenda slide with linked sections.
 */
function generateAgendaSlide(
  slide: SlideContent,
  allSlides: SlideContent[],
): string {
  const lines: string[] = []

  lines.push(`**${slide.title || 'Agenda'}:**`)
  lines.push('')

  // Find all section slides and create links
  const sections = allSlides.filter((s) => s.type === 'section' && s.title)

  if (sections.length > 0) {
    sections.forEach((section, index) => {
      const anchor = slugify(section.title || `section-${index + 1}`)
      lines.push(`${index + 1}. [${section.title}](#${anchor})`)
    })
  } else if (slide.content) {
    // Use provided content if no sections found
    lines.push(slide.content)
  } else {
    lines.push('1. Introduction')
    lines.push('2. Main Content')
    lines.push('3. Conclusion')
  }

  return lines.join('\n')
}

/**
 * Generate a section divider slide.
 */
function generateSectionSlide(slide: SlideContent): string {
  const lines: string[] = []

  // Section title as H2 with bold
  lines.push(`## **${slide.title || 'Section'}**`)

  // Subtitle in italics if provided
  if (slide.subtitle) {
    lines.push('')
    lines.push(`_${slide.subtitle}_`)
  }

  return lines.join('\n')
}

/**
 * Generate a standard content slide.
 */
function generateContentSlide(slide: SlideContent): string {
  const lines: string[] = []

  // Title
  if (slide.title) {
    lines.push(`### ${slide.title}`)
    lines.push('')
  }

  // Subtitle
  if (slide.subtitle) {
    lines.push(`_${slide.subtitle}_`)
    lines.push('')
  }

  // Content
  if (slide.content) {
    lines.push(slide.content)
  }

  return lines.join('\n')
}

/**
 * Generate a quote slide.
 */
function generateQuoteSlide(slide: SlideContent): string {
  const lines: string[] = []

  // Full-slide quote format
  lines.push('> > #### ' + (slide.title || '').replace(/\n/g, '<br>'))

  if (slide.content) {
    lines.push('> >')
    lines.push(`> > ${slide.content}`)
  }

  if (slide.subtitle) {
    lines.push('> >')
    lines.push(`> > _${slide.subtitle}_`)
  }

  return lines.join('\n')
}

/**
 * Generate a comparison slide.
 */
function generateComparisonSlide(slide: SlideContent): string {
  const lines: string[] = []

  if (slide.title) {
    lines.push(`### ${slide.title}`)
    lines.push('')
  }

  // Content should contain the comparison - user formats as markdown table or columns
  if (slide.content) {
    lines.push(slide.content)
  } else {
    // Default comparison template
    lines.push('| Before | After |')
    lines.push('|--------|-------|')
    lines.push('| Current state | Future state |')
  }

  return lines.join('\n')
}

/**
 * Generate a summary/key takeaways slide.
 */
function generateSummarySlide(slide: SlideContent): string {
  const lines: string[] = []

  lines.push(`### ${slide.title || 'Key Takeaways'}`)
  lines.push('')

  if (slide.content) {
    lines.push(slide.content)
  }

  return lines.join('\n')
}

/**
 * Generate a Q&A slide.
 */
function generateQnASlide(slide: SlideContent): string {
  const lines: string[] = []

  lines.push(`## ${slide.title || 'Questions?'}`)

  if (slide.subtitle) {
    lines.push('')
    lines.push(`_${slide.subtitle}_`)
  }

  if (slide.content) {
    lines.push('')
    lines.push(slide.content)
  }

  return lines.join('\n')
}

/**
 * Generate a single slide based on its type.
 */
function generateSlide(
  slide: SlideContent,
  params: GeneratePresentationParams,
  allSlides: SlideContent[],
): string {
  let content: string

  switch (slide.type) {
    case 'title':
      content = generateTitleSlide(slide, params)
      break
    case 'agenda':
      content = generateAgendaSlide(slide, allSlides)
      break
    case 'section':
      content = generateSectionSlide(slide)
      break
    case 'quote':
      content = generateQuoteSlide(slide)
      break
    case 'comparison':
      content = generateComparisonSlide(slide)
      break
    case 'summary':
      content = generateSummarySlide(slide)
      break
    case 'qna':
      content = generateQnASlide(slide)
      break
    case 'content':
    default:
      content = generateContentSlide(slide)
      break
  }

  // Add speaker notes if present
  if (slide.notes) {
    content += '\n\n<!--\n' + slide.notes + '\n-->'
  }

  // Add footer if present
  if (slide.footer) {
    content += `\n\n<!-- _footer: ${slide.footer} -->`
  }

  return content
}

// ============================================================================
// Generate Presentation Tool Implementation
// ============================================================================

/**
 * Type guard to check if result is an error.
 */
export function isGeneratePresentationError(
  result: GeneratePresentationResult | GeneratePresentationError,
): result is GeneratePresentationError {
  return 'error' in result
}

/**
 * Type guard to check if result is successful.
 */
export function isGeneratePresentationSuccess(
  result: GeneratePresentationResult | GeneratePresentationError,
): result is GeneratePresentationResult {
  return 'markdown' in result
}

/**
 * Generate a Marpit markdown presentation.
 *
 * This function:
 * 1. Validates input parameters
 * 2. Generates YAML frontmatter
 * 3. Generates each slide based on its type
 * 4. Returns the complete Marpit markdown
 *
 * @param params - The presentation parameters
 * @returns Promise resolving to GeneratePresentationResult or GeneratePresentationError
 *
 * @example
 * ```typescript
 * const result = await generatePresentation({
 *   title: 'My Presentation',
 *   author: 'John Doe',
 *   slides: [
 *     { type: 'title', title: 'My Presentation' },
 *     { type: 'agenda' },
 *     { type: 'section', title: 'Introduction' },
 *     { type: 'content', title: 'Overview', content: '- Point 1\n- Point 2' },
 *     { type: 'qna' }
 *   ]
 * })
 * ```
 */
export async function generatePresentation(
  params: GeneratePresentationParams,
): Promise<GeneratePresentationResult | GeneratePresentationError> {
  // Validate required parameters
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
    const sections: string[] = []

    // Generate frontmatter
    const frontmatter = generateFrontmatter(params)

    // Generate each slide
    for (const slide of params.slides) {
      const slideContent = generateSlide(slide, params, params.slides)
      sections.push(slideContent)
    }

    // Join with slide separators (---)
    const markdown = frontmatter + '\n\n' + sections.join('\n\n---\n\n')

    return {
      markdown,
      slideCount: params.slides.length,
      metadata: {
        title: params.title,
        author: params.author,
        lang: params.lang || 'en',
      },
    }
  } catch (error) {
    return {
      error: 'generation',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to generate presentation',
    }
  }
}
