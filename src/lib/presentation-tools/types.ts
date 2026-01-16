/**
 * Presentation Tools Types
 *
 * This module defines types for the Marpit presentation generation tool.
 * The generate_presentation tool allows LLM agents to create professional
 * slide deck presentations in valid Marpit markdown format.
 *
 * @module lib/presentation-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Generate Presentation Tool Types
// ============================================================================

/**
 * Slide content structure.
 */
export interface SlideContent {
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
   * Content body - can be markdown text, bullet points, etc.
   */
  content?: string
  /**
   * Speaker notes (hidden from presentation, shown in presenter view).
   */
  notes?: string
  /**
   * Footer text for the slide.
   */
  footer?: string
}

/**
 * Parameters for the generate_presentation tool.
 * Generates a complete Marpit markdown presentation.
 */
export interface GeneratePresentationParams {
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
   * Event or venue information for the footer.
   */
  event?: string

  /**
   * Language code for the presentation (e.g., "en", "fr", "de").
   * @default "en"
   */
  lang?: string

  /**
   * Array of slides to generate.
   * Each slide can have a type, title, subtitle, content, and notes.
   */
  slides: SlideContent[]
}

/**
 * Result of successful presentation generation.
 */
export interface GeneratePresentationResult {
  /** The generated Marpit markdown content */
  markdown: string
  /** Number of slides in the presentation */
  slideCount: number
  /** Presentation metadata */
  metadata: {
    title: string
    author?: string
    lang: string
  }
}

/**
 * Error result from presentation generation.
 */
export interface GeneratePresentationError {
  /** Error type */
  error: 'validation' | 'generation'
  /** Human-readable error message */
  message: string
}

// ============================================================================
// Presentation Tool Names
// ============================================================================

/**
 * Type for presentation tool names.
 */
export type PresentationToolName = 'generate_presentation'

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Pre-defined tool definitions for presentation generation.
 * These can be directly passed to LLM requests.
 */
export const PRESENTATION_TOOL_DEFINITIONS: Record<
  PresentationToolName,
  ToolDefinition
> = {
  generate_presentation: {
    type: 'function',
    function: {
      name: 'generate_presentation',
      description: /* md */ `Generate a professional presentation in Marpit markdown format.

## What's expected in the Output

You will produce Marpit markdown that creates a complete slide deck with:
- YAML frontmatter with title, author, and settings
- Title slide with author and event information
- Agenda slide with linked sections
- Content slides with proper heading hierarchy
- Section dividers and transitions
- Professional formatting and visual hierarchy

## Slide types

- "title": Opening slide with title, subtitle, author
- "agenda": Table of contents with section links
- "section": Section divider slide
- "content": Standard content slide with bullet points
- "quote": Full-slide quote or citation
- "comparison": Side-by-side comparison layout
- "summary": Key takeaways slide
- "qna": Questions and answers slide

## Marpit Structure

IMPORTANT: After calling this tool, you MUST include the generated markdown in your response inside a \`\`\`marpit code block so it renders as a presentation. Example:

\`\`\`marpit
[paste the markdown field from the result here]
\`\`\`

**IMPORTANT:** The following marp directives **MUST** be preserved as-is: \`marp: true\`, \`theme: devs\`, \`paginate: true\`, \`_paginate: false\`, \`size: 16:9\`.
NEVER modify or remove these directives.

## Advanced Design Elements

### Content Types

- **Executive Summaries**: High-level overviews for C-suite audiences
- **Deep Dives**: Detailed technical presentations with comprehensive analysis
- **Pitch Decks**: Persuasive startup or project presentations
- **Training Materials**: Educational content with learning objectives
- **Status Reports**: Progress updates with metrics and timelines
- **Strategic Plans**: Vision, goals, and roadmap presentations

### Visual Elements

- **Typography Hierarchy**: Strategic use of headers, subheaders, and body text
- **White Space**: Balanced layouts that guide attention and improve readability
- **Bullet Points**: Structured information with clear hierarchy
- **Quotes and Callouts**: Emphasis boxes for key messages
- **Progressive Disclosure**: Building complex ideas across multiple slides

### Advanced Marpit Features

- **Background Images**: Strategic use of visuals to support content
- **Multi-column Layouts**: Flexible content organization
- **Speaker Notes**: Hidden content for presenter guidance

## Content Strategy

### Narrative Structure

- **Hook**: Compelling opening that grabs attention
- **Problem/Opportunity**: Clear articulation of the challenge or opportunity
- **Solution**: Your proposal or approach
- **Evidence**: Supporting data, examples, or proof points
- **Action**: Clear next steps and call-to-action

### Slide Types

- **Title Slides**: Strong opening with clear value proposition
- **Agenda Slides**: Roadmap of presentation content
- **Content Slides**: Core information with visual support
- **Transition Slides**: Smooth movement between sections
- **Summary Slides**: Key takeaways and reinforcement
- **Q&A Slides**: Prepared for audience interaction

### Audience Adaptation

- **Executive Audience**: High-level, strategic focus with clear ROI
- **Technical Audience**: Deep technical detail with implementation focus
- **Mixed Audience**: Layered information accessible to all levels
- **External Stakeholders**: Clear context and background information
- **Internal Teams**: Collaborative tone with action-oriented content

## Typography Guidelines

- **Hierarchy**: Use consistent heading levels (H1 for titles, H2 for sections, H3 for subsections)
- **Emphasis**: Strategic use of bold for keypoints and italic for dimmed text
- **Lists**: Well-structured bullet points and numbered lists

## Content Guidelines

- **Clarity**: Every slide should have one main message
- **Brevity**: Use concise language and avoid text-heavy slides
- **Relevance**: Ensure all content supports the overall narrative
- **Action-Oriented**: Include clear next steps and calls-to-action
- **Data-Driven**: Support claims with evidence and metrics when appropriate

## Advanced Presentation Patterns

### Problem-Solution Framework

1. Current State Analysis
2. Problem Identification
3. Solution Overview
4. Implementation Plan
5. Expected Outcomes

### Before-After Comparison

1. Baseline Situation
2. Proposed Changes
3. Expected Results
4. Success Metrics
5. Timeline

### Three-Part Structure

1. What (The Situation)
2. So What (The Implications)
3. Now What (The Actions)

### Pyramid Principle

1. Executive Summary
2. Supporting Arguments
3. Detailed Evidence
4. Recommendations
5. Next Steps

## Response Format

Your response must ONLY contain sophisticated, professional Marpit markdown starting with the YAML frontmatter (---) and containing well-structured slide content. Slides MUST start with a horizontal rule (---) as separator. Create presentations that are engaging, informative, and visually appealing. No additional text, explanations, or formatting - just pure Marpit presentation markup that showcases professional presentation design principles.

## Examples of Advanced Elements

- Clear information hierarchy and visual flow
- Engaging opening slides that hook the audience
- Compelling calls-to-action and next steps
- Balanced text and white space for readability
- Consistent branding and design elements
- Audience-appropriate content depth and complexity
- Smooth narrative flow between slides
- Professional closing with clear outcomes

Create presentations that don't just inform, but inspire action and drive results through exceptional visual communication and strategic content design.

Use this tool when asked to create presentations, slide decks, or pitch decks.`,
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
          lang: {
            type: 'string',
            description:
              'Language code (e.g., "en", "fr", "de"). Default: "en"',
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
                    'Content body - markdown text with bullet points, numbered lists, etc.',
                },
                notes: {
                  type: 'string',
                  description:
                    'Speaker notes (hidden from presentation, shown in presenter view)',
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
