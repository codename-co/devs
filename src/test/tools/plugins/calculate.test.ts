/**
 * Calculate Tool Plugin Tests
 *
 * Tests for the calculate tool plugin.
 *
 * @module test/tools/plugins/calculate.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolPluginRegistry } from '@/tools/registry'
import { calculatePlugin } from '@/tools/plugins/calculate'

describe('calculatePlugin', () => {
  let registry: ToolPluginRegistry

  beforeEach(() => {
    registry = new ToolPluginRegistry()
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(calculatePlugin.metadata.name).toBe('calculate')
    })

    it('should have math category', () => {
      expect(calculatePlugin.metadata.category).toBe('math')
    })

    it('should have math-related tags', () => {
      expect(calculatePlugin.metadata.tags).toContain('math')
      expect(calculatePlugin.metadata.tags).toContain('calculation')
    })

    it('should have valid icon', () => {
      expect(calculatePlugin.metadata.icon).toBe('MathBook')
    })
  })

  describe('definition', () => {
    it('should have function type', () => {
      expect(calculatePlugin.definition.type).toBe('function')
    })

    it('should have matching function name', () => {
      expect(calculatePlugin.definition.function.name).toBe('calculate')
    })

    it('should require expression parameter', () => {
      const params = calculatePlugin.definition.function.parameters
      expect(params.required).toContain('expression')
    })
  })

  describe('registration', () => {
    it('should register successfully', () => {
      registry.register(calculatePlugin)

      expect(registry.has('calculate')).toBe(true)
    })

    it('should be retrievable after registration', () => {
      registry.register(calculatePlugin)

      const registered = registry.get('calculate')
      expect(registered?.metadata.name).toBe('calculate')
    })

    it('should appear in math category', () => {
      registry.register(calculatePlugin)

      const mathTools = registry.getByCategory('math')
      expect(mathTools).toHaveLength(1)
      expect(mathTools[0].metadata.name).toBe('calculate')
    })
  })

  describe('handler', () => {
    it('should evaluate simple expressions', async () => {
      const result = await calculatePlugin.handler({ expression: '2 + 2' }, {})

      expect(result).toHaveProperty('result', 4)
    })

    it('should evaluate expressions with Math functions', async () => {
      const result = await calculatePlugin.handler(
        { expression: 'Math.sqrt(16)' },
        {},
      )

      expect(result).toHaveProperty('result', 4)
    })

    it('should evaluate expressions with variables', async () => {
      const result = await calculatePlugin.handler(
        {
          expression: 'Math.PI * radius ** 2',
          variables: { radius: 1 },
        },
        {},
      )

      expect(result).toHaveProperty('result')
      // PI * 1^2 = PI
      expect((result as { result: number }).result).toBeCloseTo(Math.PI, 5)
    })

    it('should handle errors gracefully', async () => {
      const result = await calculatePlugin.handler({ expression: '' }, {})

      expect(result).toHaveProperty('error')
    })
  })

  describe('validate', () => {
    it('should pass valid params', () => {
      const params = { expression: '1 + 1' }

      expect(() => calculatePlugin.validate!(params)).not.toThrow()
    })

    it('should throw for missing expression', () => {
      const params = {} as { expression: string }

      expect(() => calculatePlugin.validate!(params)).toThrow(
        'Expression is required',
      )
    })

    it('should throw for non-string expression', () => {
      const params = { expression: 123 as unknown as string }

      expect(() => calculatePlugin.validate!(params)).toThrow(
        'Expression is required and must be a string',
      )
    })

    it('should throw for invalid variable type', () => {
      const params = {
        expression: 'x + 1',
        variables: { x: 'not a number' as unknown as number },
      }

      expect(() => calculatePlugin.validate!(params)).toThrow(
        'Variable "x" must be a number',
      )
    })

    it('should throw for non-finite variable', () => {
      const params = {
        expression: 'x + 1',
        variables: { x: Infinity },
      }

      expect(() => calculatePlugin.validate!(params)).toThrow(
        'Variable "x" must be a finite number',
      )
    })
  })
})
