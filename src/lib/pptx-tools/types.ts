/**
 * PPTX Tools Types
 *
 * This module defines types for the generate_pptx tool.
 * The generate_pptx tool allows LLM agents to create professional
 * PowerPoint presentations using pptxgenjs code.
 *
 * @module lib/pptx-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Generate PPTX Tool Types
// ============================================================================

/**
 * Slide content structure for PPTX generation.
 */
export interface PptxSlideContent {
  /**
   * Slide type for automatic formatting.
   */
  type?:
    | 'title'
    | 'agenda'
    | 'content'
    | 'section'
    | 'quote'
    | 'comparison'
    | 'summary'
    | 'qna'
  /**
   * Main title or heading for the slide.
   */
  title?: string
  /**
   * Subtitle or secondary heading.
   */
  subtitle?: string
  /**
   * Content body - bullet points or text items.
   * For bullet lists, use an array of strings.
   */
  content?: string | string[]
  /**
   * Speaker notes (hidden from presentation).
   */
  notes?: string
  /**
   * Footer text for the slide.
   */
  footer?: string
}

/**
 * Parameters for the generate_pptx tool.
 * Generates pptxgenjs JavaScript code for a PowerPoint presentation.
 */
export interface GeneratePptxParams {
  /**
   * Presentation title displayed on the title slide.
   */
  title: string

  /**
   * Author name(s) for the presentation.
   */
  author?: string

  /**
   * Organization or company name.
   */
  organization?: string

  /**
   * Presentation date (e.g., "January 16, 2026").
   */
  date?: string

  /**
   * Event or venue information displayed in the footer of the title slide.
   */
  event?: string

  /**
   * Primary color for the presentation (hex without #, e.g., "003B75").
   * @default Inherited from the active PPTX theme
   */
  primaryColor?: string

  /**
   * Array of slides to generate.
   */
  slides: PptxSlideContent[]
}

/**
 * Result of successful PPTX generation.
 */
export interface GeneratePptxResult {
  /** The generated pptxgenjs JavaScript code */
  code: string
  /** Number of slides in the presentation */
  slideCount: number
  /** Presentation metadata */
  metadata: {
    title: string
    author?: string
  }
}

/**
 * Error result from PPTX generation.
 */
export interface GeneratePptxError {
  /** Error type */
  error: 'validation' | 'generation'
  /** Human-readable error message */
  message: string
}

// ============================================================================
// PPTX Tool Names
// ============================================================================

/**
 * Type for PPTX tool names.
 */
export type PptxToolName = 'generate_pptx'

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Pre-defined tool definitions for PPTX generation.
 * These can be directly passed to LLM requests.
 */
export const PPTX_TOOL_DEFINITIONS: Record<PptxToolName, ToolDefinition> = {
  generate_pptx: {
    type: 'function',
    function: {
      name: 'generate_pptx',
      description: /* md */ `Generate a professional PowerPoint presentation as pptxgenjs code.

## What's expected in the Output

You will produce pptxgenjs JavaScript code that creates a complete slide deck with:
- A presentation object using \`new pptxgen()\`
- 16:9 layout with professional color scheme
- Title slide with author, organization, and event info
- Content slides with proper formatting
- Section dividers and transitions
- Professional typography and visual hierarchy

## Slide types

- "title": Opening slide with dark background, title, subtitle, author
- "agenda": Table of contents with numbered items
- "section": Section divider with dark background
- "content": Standard content slide with bullet points or text
- "quote": Full-slide quote or citation with styled blockquote
- "comparison": Side-by-side comparison layout
- "summary": Key takeaways slide
- "qna": Questions or thank-you closing slide

## pptxgenjs Structure

IMPORTANT: After calling this tool, you MUST include the generated code in your response inside a \`\`\`pptx code block so it renders as a presentation preview. Example:

\`\`\`pptx
[paste the code field from the result here]
\`\`\`

The code uses the pptxgenjs library and creates a \`pres\` variable that can be downloaded as a .pptx file.

## Design Guidelines

- Colors and fonts are automatically inherited from the user's active PPTX theme
- Do NOT hardcode colors or font faces — the platform applies the theme automatically
- Use consistent color scheme: dark primary for section/title slides, themed background for content
- Typography hierarchy: 36pt titles, 24pt headings, 18pt body
- Subtle separators (lines) to add visual polish
- Bullet points for lists with proper indentation
- White space for readability
- Slide numbers are added automatically (except on the title slide)

## Content Guidelines

- Every slide should have one main message
- Use concise language and avoid text-heavy slides
- Support claims with evidence and metrics when appropriate
- Include clear next steps and calls-to-action

Use this tool when asked to create PowerPoint presentations, PPTX files, or downloadable slide decks.`,
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Presentation title displayed on the title slide',
          },
          author: {
            type: 'string',
            description: 'Author name(s) for the presentation',
          },
          organization: {
            type: 'string',
            description: 'Organization or company name',
          },
          date: {
            type: 'string',
            description: 'Presentation date (e.g., "January 16, 2026")',
          },
          event: {
            type: 'string',
            description:
              'Event or venue information displayed in the footer of the title slide',
          },
          primaryColor: {
            type: 'string',
            description:
              'Optional primary color override (hex without #). Defaults to the active PPTX theme color.',
          },
          slides: {
            type: 'array',
            description:
              'Array of slides to generate. Each slide has type, title, subtitle, content, notes, and footer.',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'title',
                    'agenda',
                    'content',
                    'section',
                    'quote',
                    'comparison',
                    'summary',
                    'qna',
                  ],
                  description:
                    'Slide type for automatic formatting. Default: "content"',
                },
                title: {
                  type: 'string',
                  description: 'Main title or heading for the slide',
                },
                subtitle: {
                  type: 'string',
                  description: 'Subtitle or secondary heading',
                },
                content: {
                  type: 'string',
                  description:
                    'Content body - text or newline-separated bullet points',
                },
                notes: {
                  type: 'string',
                  description: 'Speaker notes (hidden from presentation)',
                },
                footer: {
                  type: 'string',
                  description: 'Footer text for this specific slide',
                },
              },
            },
          },
        },
        required: ['title', 'slides'],
      },
    },
  },
}
