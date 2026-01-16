/**
 * Presentation Tools Tests
 *
 * Tests for the Marpit presentation generation tool.
 *
 * @module test/lib/presentation-tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  generatePresentation,
  isGeneratePresentationError,
  isGeneratePresentationSuccess,
  PRESENTATION_TOOL_DEFINITIONS,
} from '@/lib/presentation-tools'
import type {
  GeneratePresentationResult,
  GeneratePresentationError,
} from '@/lib/presentation-tools'
import {
  registerPresentationTools,
  arePresentationToolsRegistered,
  unregisterPresentationTools,
  defaultRegistry,
} from '@/lib/tool-executor'

describe('presentation-tools', () => {
  describe('PRESENTATION_TOOL_DEFINITIONS', () => {
    it('should have generate_presentation tool definition', () => {
      expect(PRESENTATION_TOOL_DEFINITIONS.generate_presentation).toBeDefined()
      expect(PRESENTATION_TOOL_DEFINITIONS.generate_presentation.type).toBe(
        'function',
      )
      expect(
        PRESENTATION_TOOL_DEFINITIONS.generate_presentation.function.name,
      ).toBe('generate_presentation')
    })

    it('should have correct parameters schema', () => {
      const params =
        PRESENTATION_TOOL_DEFINITIONS.generate_presentation.function.parameters
      expect(params.type).toBe('object')
      expect(params.required).toContain('title')
      expect(params.required).toContain('slides')
      expect(params.properties?.title).toBeDefined()
      expect(params.properties?.slides).toBeDefined()
      expect(params.properties?.author).toBeDefined()
      expect(params.properties?.lang).toBeDefined()
    })
  })

  describe('generatePresentation', () => {
    it('should return error for missing title', async () => {
      const result = await generatePresentation({
        title: '',
        slides: [{ type: 'content', title: 'Test' }],
      })

      expect(isGeneratePresentationError(result)).toBe(true)
      const error = result as GeneratePresentationError
      expect(error.error).toBe('validation')
      expect(error.message).toContain('Title is required')
    })

    it('should return error for empty slides array', async () => {
      const result = await generatePresentation({
        title: 'Test Presentation',
        slides: [],
      })

      expect(isGeneratePresentationError(result)).toBe(true)
      const error = result as GeneratePresentationError
      expect(error.error).toBe('validation')
      expect(error.message).toContain('Slides array is required')
    })

    it('should generate valid Marpit markdown with frontmatter', async () => {
      const result = await generatePresentation({
        title: 'Test Presentation',
        author: 'Test Author',
        slides: [{ type: 'title', title: 'Test Presentation' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      // Check frontmatter
      expect(success.markdown).toContain('---')
      expect(success.markdown).toContain('title: Test Presentation')
      expect(success.markdown).toContain('author: Test Author')
      expect(success.markdown).toContain('marp: true')
      expect(success.markdown).toContain('theme: devs')
      expect(success.markdown).toContain('paginate: true')
      expect(success.markdown).toContain('_paginate: false')
      expect(success.markdown).toContain('size: 16:9')
    })

    it('should include language in frontmatter', async () => {
      const result = await generatePresentation({
        title: 'Test',
        lang: 'fr',
        slides: [{ type: 'content', content: 'Contenu' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult
      expect(success.markdown).toContain('lang: fr')
      expect(success.metadata.lang).toBe('fr')
    })

    it('should default language to en', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [{ type: 'content', content: 'Content' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult
      expect(success.markdown).toContain('lang: en')
      expect(success.metadata.lang).toBe('en')
    })

    it('should generate title slide correctly', async () => {
      const result = await generatePresentation({
        title: 'My Presentation',
        author: 'John Doe',
        organization: 'Acme Corp',
        date: 'January 2026',
        event: 'Tech Conference, NYC',
        slides: [{ type: 'title', title: 'My Presentation' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('# My Presentation')
      expect(success.markdown).toContain('<hr>')
      expect(success.markdown).toContain('John Doe, Acme Corp')
      expect(success.markdown).toContain(
        '<!-- _footer: January 2026 — Tech Conference, NYC -->',
      )
    })

    it('should generate agenda slide with section links', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          { type: 'agenda' },
          { type: 'section', title: 'Introduction' },
          { type: 'section', title: 'Main Content' },
          { type: 'section', title: 'Conclusion' },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('**Agenda:**')
      expect(success.markdown).toContain('[Introduction](#introduction)')
      expect(success.markdown).toContain('[Main Content](#main-content)')
      expect(success.markdown).toContain('[Conclusion](#conclusion)')
    })

    it('should generate section divider slide', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          { type: 'section', title: 'Part One', subtitle: 'First section' },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('## **Part One**')
      expect(success.markdown).toContain('_First section_')
    })

    it('should generate content slide with bullet points', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          {
            type: 'content',
            title: 'Features',
            content: '- Feature 1\n- Feature 2\n- Feature 3',
          },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('### Features')
      expect(success.markdown).toContain('- Feature 1')
      expect(success.markdown).toContain('- Feature 2')
      expect(success.markdown).toContain('- Feature 3')
    })

    it('should generate quote slide', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          {
            type: 'quote',
            title: 'E = mc²',
            content: 'The famous equation',
            subtitle: 'Einstein, 1905',
          },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('> > #### E = mc²')
      expect(success.markdown).toContain('_Einstein, 1905_')
    })

    it('should generate Q&A slide', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [{ type: 'qna', title: 'Any Questions?' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('## Any Questions?')
    })

    it('should include speaker notes when provided', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          {
            type: 'content',
            title: 'Slide',
            content: 'Content',
            notes: 'Remember to emphasize this point',
          },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('<!--')
      expect(success.markdown).toContain('Remember to emphasize this point')
      expect(success.markdown).toContain('-->')
    })

    it('should include slide footer when provided', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          {
            type: 'content',
            title: 'Slide',
            footer: 'Source: Company Report 2025',
          },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain(
        '<!-- _footer: Source: Company Report 2025 -->',
      )
    })

    it('should separate slides with --- separator', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          { type: 'title', title: 'Title' },
          { type: 'content', title: 'Content 1' },
          { type: 'content', title: 'Content 2' },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      // Count slide separators (should be 3: after frontmatter, between slides)
      const separatorCount = (success.markdown.match(/\n---\n/g) || []).length
      expect(separatorCount).toBeGreaterThanOrEqual(2)
    })

    it('should return correct slide count', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          { type: 'title' },
          { type: 'agenda' },
          { type: 'content' },
          { type: 'qna' },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult
      expect(success.slideCount).toBe(4)
    })

    it('should return metadata in result', async () => {
      const result = await generatePresentation({
        title: 'My Deck',
        author: 'Jane Doe',
        lang: 'de',
        slides: [{ type: 'title' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult
      expect(success.metadata.title).toBe('My Deck')
      expect(success.metadata.author).toBe('Jane Doe')
      expect(success.metadata.lang).toBe('de')
    })

    it('should generate comparison slide with default template', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [{ type: 'comparison', title: 'Before vs After' }],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('### Before vs After')
      expect(success.markdown).toContain('| Before | After |')
    })

    it('should generate summary slide', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          {
            type: 'summary',
            content: '- Key point 1\n- Key point 2',
          },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('### Key Takeaways')
      expect(success.markdown).toContain('- Key point 1')
    })

    it('should handle content slide with subtitle', async () => {
      const result = await generatePresentation({
        title: 'Test',
        slides: [
          {
            type: 'content',
            title: 'Main Title',
            subtitle: 'A subtitle for context',
            content: 'Some content here',
          },
        ],
      })

      expect(isGeneratePresentationSuccess(result)).toBe(true)
      const success = result as GeneratePresentationResult

      expect(success.markdown).toContain('### Main Title')
      expect(success.markdown).toContain('_A subtitle for context_')
      expect(success.markdown).toContain('Some content here')
    })
  })

  describe('type guards', () => {
    it('isGeneratePresentationError should correctly identify errors', () => {
      const error: GeneratePresentationError = {
        error: 'validation',
        message: 'Test error',
      }
      const success: GeneratePresentationResult = {
        markdown: '---\ntitle: Test\n---',
        slideCount: 1,
        metadata: { title: 'Test', lang: 'en' },
      }

      expect(isGeneratePresentationError(error)).toBe(true)
      expect(isGeneratePresentationError(success)).toBe(false)
    })

    it('isGeneratePresentationSuccess should correctly identify success', () => {
      const error: GeneratePresentationError = {
        error: 'validation',
        message: 'Test error',
      }
      const success: GeneratePresentationResult = {
        markdown: '---\ntitle: Test\n---',
        slideCount: 1,
        metadata: { title: 'Test', lang: 'en' },
      }

      expect(isGeneratePresentationSuccess(success)).toBe(true)
      expect(isGeneratePresentationSuccess(error)).toBe(false)
    })
  })

  describe('tool registration', () => {
    beforeEach(() => {
      // Ensure tools are unregistered before each test
      if (arePresentationToolsRegistered()) {
        unregisterPresentationTools()
      }
    })

    afterEach(() => {
      // Clean up after each test
      if (arePresentationToolsRegistered()) {
        unregisterPresentationTools()
      }
    })

    it('should register presentation tools', () => {
      expect(arePresentationToolsRegistered()).toBe(false)

      registerPresentationTools()

      expect(arePresentationToolsRegistered()).toBe(true)
      expect(defaultRegistry.has('generate_presentation')).toBe(true)
    })

    it('should unregister presentation tools', () => {
      registerPresentationTools()
      expect(arePresentationToolsRegistered()).toBe(true)

      unregisterPresentationTools()

      expect(arePresentationToolsRegistered()).toBe(false)
    })
  })
})
