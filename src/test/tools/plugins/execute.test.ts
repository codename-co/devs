/**
 * Execute Tool Plugin Tests
 *
 * Tests for the execute (code) tool plugin.
 *
 * @module test/tools/plugins/execute.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolPluginRegistry } from '@/tools/registry'
import { executePlugin } from '@/tools/plugins/execute'

describe('executePlugin', () => {
  let registry: ToolPluginRegistry

  beforeEach(() => {
    registry = new ToolPluginRegistry()
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(executePlugin.metadata.name).toBe('execute')
    })

    it('should have code category', () => {
      expect(executePlugin.metadata.category).toBe('code')
    })

    it('should have code-related tags', () => {
      expect(executePlugin.metadata.tags).toContain('code')
      expect(executePlugin.metadata.tags).toContain('javascript')
      expect(executePlugin.metadata.tags).toContain('sandbox')
    })

    it('should have valid icon', () => {
      expect(executePlugin.metadata.icon).toBe('Terminal')
    })
  })

  describe('definition', () => {
    it('should have function type', () => {
      expect(executePlugin.definition.type).toBe('function')
    })

    it('should have matching function name', () => {
      expect(executePlugin.definition.function.name).toBe('execute')
    })

    it('should require code parameter', () => {
      const params = executePlugin.definition.function.parameters
      expect(params.required).toContain('code')
    })
  })

  describe('registration', () => {
    it('should register successfully', () => {
      registry.register(executePlugin)

      expect(registry.has('execute')).toBe(true)
    })

    it('should appear in code category', () => {
      registry.register(executePlugin)

      const codeTools = registry.getByCategory('code')
      expect(codeTools).toHaveLength(1)
      expect(codeTools[0].metadata.name).toBe('execute')
    })
  })

  describe('validate', () => {
    it('should pass valid params', () => {
      const params = { code: 'export default 1 + 1' }

      expect(() => executePlugin.validate!(params)).not.toThrow()
    })

    it('should throw for missing code', () => {
      const params = {} as { code: string }

      expect(() => executePlugin.validate!(params)).toThrow(
        'Code is required',
      )
    })

    it('should throw for empty code', () => {
      const params = { code: '   ' }

      expect(() => executePlugin.validate!(params)).toThrow(
        'Code cannot be empty',
      )
    })

    it('should throw for invalid timeout', () => {
      const params = { code: '1+1', timeout: -100 }

      expect(() => executePlugin.validate!(params)).toThrow(
        'Timeout must be a positive number',
      )
    })

    it('should throw for excessive timeout', () => {
      const params = { code: '1+1', timeout: 60000 }

      expect(() => executePlugin.validate!(params)).toThrow(
        'Timeout cannot exceed 30000ms',
      )
    })
  })
})
