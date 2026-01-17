/**
 * Generate Presentation Tool Plugin Tests
 *
 * Tests for the generate presentation tool plugin.
 *
 * @module test/tools/plugins/generate-presentation.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolPluginRegistry } from '@/tools/registry'
import { generatePresentationPlugin } from '@/tools/plugins/generate-presentation'

describe('generatePresentationPlugin', () => {
  let registry: ToolPluginRegistry

  beforeEach(() => {
    registry = new ToolPluginRegistry()
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(generatePresentationPlugin.metadata.name).toBe('generate_presentation')
    })

    it('should have presentation category', () => {
      expect(generatePresentationPlugin.metadata.category).toBe('presentation')
    })

    it('should have presentation-related tags', () => {
      expect(generatePresentationPlugin.metadata.tags).toContain('presentation')
      expect(generatePresentationPlugin.metadata.tags).toContain('slides')
      expect(generatePresentationPlugin.metadata.tags).toContain('marpit')
    })

    it('should have valid icon', () => {
      expect(generatePresentationPlugin.metadata.icon).toBe('Presentation')
    })
  })

  describe('definition', () => {
    it('should have function type', () => {
      expect(generatePresentationPlugin.definition.type).toBe('function')
    })

    it('should have matching function name', () => {
      expect(generatePresentationPlugin.definition.function.name).toBe('generate_presentation')
    })

    it('should require title and slides parameters', () => {
      const params = generatePresentationPlugin.definition.function.parameters
      expect(params.required).toContain('title')
      expect(params.required).toContain('slides')
    })
  })

  describe('registration', () => {
    it('should register successfully', () => {
      registry.register(generatePresentationPlugin)

      expect(registry.has('generate_presentation')).toBe(true)
    })

    it('should appear in presentation category', () => {
      registry.register(generatePresentationPlugin)

      const presentationTools = registry.getByCategory('presentation')
      expect(presentationTools).toHaveLength(1)
      expect(presentationTools[0].metadata.name).toBe('generate_presentation')
    })
  })

  describe('validate', () => {
    it('should pass valid params', () => {
      const params = {
        title: 'My Presentation',
        slides: [{ type: 'title', title: 'Welcome' }],
      }

      expect(() => generatePresentationPlugin.validate!(params)).not.toThrow()
    })

    it('should throw for missing title', () => {
      const params = {
        slides: [{ type: 'title' }],
      } as { title: string; slides: unknown[] }

      expect(() => generatePresentationPlugin.validate!(params)).toThrow(
        'Title is required',
      )
    })

    it('should throw for empty title', () => {
      const params = {
        title: '   ',
        slides: [{ type: 'title' }],
      }

      expect(() => generatePresentationPlugin.validate!(params)).toThrow(
        'Title cannot be empty',
      )
    })

    it('should throw for missing slides', () => {
      const params = {
        title: 'My Presentation',
      } as { title: string; slides: unknown[] }

      expect(() => generatePresentationPlugin.validate!(params)).toThrow(
        'Slides array is required',
      )
    })

    it('should throw for empty slides array', () => {
      const params = {
        title: 'My Presentation',
        slides: [],
      }

      expect(() => generatePresentationPlugin.validate!(params)).toThrow(
        'At least one slide is required',
      )
    })

    it('should throw for non-array slides', () => {
      const params = {
        title: 'My Presentation',
        slides: 'not an array' as unknown as unknown[],
      }

      expect(() => generatePresentationPlugin.validate!(params)).toThrow(
        'Slides array is required',
      )
    })
  })

  describe('handler', () => {
    it('should generate a presentation', async () => {
      const result = await generatePresentationPlugin.handler(
        {
          title: 'Test Presentation',
          slides: [
            { type: 'title', title: 'Welcome' },
            { type: 'content', title: 'Slide 1', content: 'Hello World' },
          ],
        },
        {},
      )

      expect(result).toHaveProperty('markdown')
      expect(result).toHaveProperty('slideCount')
      expect((result as { slideCount: number }).slideCount).toBe(2)
    })
  })
})
