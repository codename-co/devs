/**
 * Tool Plugin Registry Tests
 *
 * Tests for the tool plugin registration system.
 * Follows TDD practices as required by AGENTS.md.
 *
 * @module test/tools/registry.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToolPluginRegistry, createToolPlugin } from '@/tools/registry'
import type { ToolPlugin, ToolMetadata } from '@/tools/types'
import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock tool definition
 */
function createMockDefinition(name: string): ToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description: `Test tool ${name}`,
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
        required: ['input'],
      },
    },
  }
}

/**
 * Create a mock tool metadata
 */
function createMockMetadata(
  name: string,
  category: ToolMetadata['category'] = 'utility',
  tags: string[] = [],
): ToolMetadata {
  return {
    name,
    displayName: `Test ${name}`,
    shortDescription: `Test tool ${name}`,
    icon: 'Puzzle',
    category,
    tags,
  }
}

/**
 * Create a mock tool plugin
 */
function createMockPlugin<
  TArgs = { input: string },
  TResult = { output: string },
>(
  name: string,
  options?: {
    category?: ToolMetadata['category']
    tags?: string[]
    handler?: (args: TArgs) => Promise<TResult>
    initialize?: () => Promise<void>
    cleanup?: () => Promise<void>
  },
): ToolPlugin<TArgs, TResult> {
  return {
    metadata: createMockMetadata(
      name,
      options?.category ?? 'utility',
      options?.tags ?? [],
    ),
    definition: createMockDefinition(name),
    handler: options?.handler ?? (async () => ({ output: 'test' }) as TResult),
    initialize: options?.initialize,
    cleanup: options?.cleanup,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ToolPluginRegistry', () => {
  let registry: ToolPluginRegistry

  beforeEach(() => {
    registry = new ToolPluginRegistry()
  })

  describe('register', () => {
    it('should register a tool plugin', () => {
      const plugin = createMockPlugin('test_tool')

      registry.register(plugin)

      expect(registry.has('test_tool')).toBe(true)
      expect(registry.count()).toBe(1)
    })

    it('should throw error when registering duplicate tool', () => {
      const plugin = createMockPlugin('test_tool')

      registry.register(plugin)

      expect(() => registry.register(plugin)).toThrow(
        'Tool "test_tool" is already registered',
      )
    })

    it('should allow replacing existing tool with replace option', () => {
      const plugin1 = createMockPlugin('test_tool')
      const plugin2 = createMockPlugin('test_tool', {
        handler: async () => ({ output: 'replaced' }),
      })

      registry.register(plugin1)
      registry.register(plugin2, { replace: true })

      expect(registry.has('test_tool')).toBe(true)
      expect(registry.count()).toBe(1)
    })

    it('should call initialize function when provided', async () => {
      const initialize = vi.fn().mockResolvedValue(undefined)
      const plugin = createMockPlugin('test_tool', { initialize })

      registry.register(plugin)

      // Wait for async initialize to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(initialize).toHaveBeenCalled()
    })

    it('should set enabled status from options', () => {
      const plugin = createMockPlugin('test_tool')

      registry.register(plugin, { enabled: false })

      const registered = registry.get('test_tool')
      expect(registered?.enabled).toBe(false)
    })

    it('should default to enabled when not specified', () => {
      const plugin = createMockPlugin('test_tool')

      registry.register(plugin)

      const registered = registry.get('test_tool')
      expect(registered?.enabled).toBe(true)
    })
  })

  describe('unregister', () => {
    it('should unregister a tool', async () => {
      const plugin = createMockPlugin('test_tool')
      registry.register(plugin)

      const result = await registry.unregister('test_tool')

      expect(result).toBe(true)
      expect(registry.has('test_tool')).toBe(false)
    })

    it('should return false when unregistering non-existent tool', async () => {
      const result = await registry.unregister('non_existent')

      expect(result).toBe(false)
    })

    it('should call cleanup function when provided', async () => {
      const cleanup = vi.fn().mockResolvedValue(undefined)
      const plugin = createMockPlugin('test_tool', { cleanup })
      registry.register(plugin)

      await registry.unregister('test_tool')

      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('get', () => {
    it('should return registered tool', () => {
      const plugin = createMockPlugin('test_tool')
      registry.register(plugin)

      const registered = registry.get('test_tool')

      expect(registered).toBeDefined()
      expect(registered?.metadata.name).toBe('test_tool')
    })

    it('should return undefined for non-existent tool', () => {
      const result = registry.get('non_existent')

      expect(result).toBeUndefined()
    })

    it('should include registeredAt timestamp', () => {
      const plugin = createMockPlugin('test_tool')
      registry.register(plugin)

      const registered = registry.get('test_tool')

      expect(registered?.registeredAt).toBeInstanceOf(Date)
    })
  })

  describe('has', () => {
    it('should return true for registered tool', () => {
      const plugin = createMockPlugin('test_tool')
      registry.register(plugin)

      expect(registry.has('test_tool')).toBe(true)
    })

    it('should return false for non-registered tool', () => {
      expect(registry.has('non_existent')).toBe(false)
    })
  })

  describe('list', () => {
    beforeEach(() => {
      registry.register(
        createMockPlugin('math_tool', {
          category: 'math',
          tags: ['arithmetic'],
        }),
      )
      registry.register(
        createMockPlugin('code_tool', { category: 'code', tags: ['python'] }),
      )
      registry.register(
        createMockPlugin('util_tool', {
          category: 'utility',
          tags: ['helper'],
        }),
      )
    })

    it('should return all registered tools', () => {
      const tools = registry.list()

      expect(tools).toHaveLength(3)
    })

    it('should filter by category', () => {
      const tools = registry.list({ category: 'math' })

      expect(tools).toHaveLength(1)
      expect(tools[0].metadata.name).toBe('math_tool')
    })

    it('should filter by tags', () => {
      const tools = registry.list({ tags: ['python'] })

      expect(tools).toHaveLength(1)
      expect(tools[0].metadata.name).toBe('code_tool')
    })

    it('should filter by enabled status', () => {
      registry.setEnabled('math_tool', false)

      const tools = registry.list({ enabledOnly: true })

      expect(tools).toHaveLength(2)
      expect(tools.find((t) => t.metadata.name === 'math_tool')).toBeUndefined()
    })

    it('should combine filters', () => {
      registry.register(
        createMockPlugin('math_util', { category: 'math', tags: ['helper'] }),
      )

      const tools = registry.list({ category: 'math', tags: ['helper'] })

      expect(tools).toHaveLength(1)
      expect(tools[0].metadata.name).toBe('math_util')
    })
  })

  describe('listNames', () => {
    it('should return all registered tool names', () => {
      registry.register(createMockPlugin('tool_a'))
      registry.register(createMockPlugin('tool_b'))

      const names = registry.listNames()

      expect(names).toHaveLength(2)
      expect(names).toContain('tool_a')
      expect(names).toContain('tool_b')
    })

    it('should return empty array when no tools registered', () => {
      const names = registry.listNames()

      expect(names).toHaveLength(0)
    })
  })

  describe('listMetadata', () => {
    it('should return metadata for all tools', () => {
      registry.register(createMockPlugin('tool_a'))
      registry.register(createMockPlugin('tool_b'))

      const metadata = registry.listMetadata()

      expect(metadata).toHaveLength(2)
      expect(metadata[0]).toHaveProperty('name')
      expect(metadata[0]).toHaveProperty('displayName')
      expect(metadata[0]).toHaveProperty('icon')
    })

    it('should apply filters', () => {
      registry.register(createMockPlugin('math_tool', { category: 'math' }))
      registry.register(createMockPlugin('code_tool', { category: 'code' }))

      const metadata = registry.listMetadata({ category: 'math' })

      expect(metadata).toHaveLength(1)
      expect(metadata[0].name).toBe('math_tool')
    })
  })

  describe('listDefinitions', () => {
    it('should return definitions for all tools', () => {
      registry.register(createMockPlugin('tool_a'))
      registry.register(createMockPlugin('tool_b'))

      const definitions = registry.listDefinitions()

      expect(definitions).toHaveLength(2)
      expect(definitions[0]).toHaveProperty('type', 'function')
      expect(definitions[0].function).toHaveProperty('name')
    })

    it('should apply filters', () => {
      registry.register(createMockPlugin('math_tool', { category: 'math' }))
      registry.register(createMockPlugin('code_tool', { category: 'code' }))

      const definitions = registry.listDefinitions({ category: 'math' })

      expect(definitions).toHaveLength(1)
      expect(definitions[0].function.name).toBe('math_tool')
    })
  })

  describe('setEnabled', () => {
    it('should enable a tool', () => {
      const plugin = createMockPlugin('test_tool')
      registry.register(plugin, { enabled: false })

      const result = registry.setEnabled('test_tool', true)

      expect(result).toBe(true)
      expect(registry.get('test_tool')?.enabled).toBe(true)
    })

    it('should disable a tool', () => {
      const plugin = createMockPlugin('test_tool')
      registry.register(plugin)

      const result = registry.setEnabled('test_tool', false)

      expect(result).toBe(true)
      expect(registry.get('test_tool')?.enabled).toBe(false)
    })

    it('should return false for non-existent tool', () => {
      const result = registry.setEnabled('non_existent', true)

      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('should return count of registered tools', () => {
      expect(registry.count()).toBe(0)

      registry.register(createMockPlugin('tool_a'))
      expect(registry.count()).toBe(1)

      registry.register(createMockPlugin('tool_b'))
      expect(registry.count()).toBe(2)
    })
  })

  describe('clear', () => {
    it('should remove all tools', async () => {
      registry.register(createMockPlugin('tool_a'))
      registry.register(createMockPlugin('tool_b'))

      await registry.clear()

      expect(registry.count()).toBe(0)
    })

    it('should call cleanup on all tools', async () => {
      const cleanup1 = vi.fn().mockResolvedValue(undefined)
      const cleanup2 = vi.fn().mockResolvedValue(undefined)

      registry.register(createMockPlugin('tool_a', { cleanup: cleanup1 }))
      registry.register(createMockPlugin('tool_b', { cleanup: cleanup2 }))

      await registry.clear()

      expect(cleanup1).toHaveBeenCalled()
      expect(cleanup2).toHaveBeenCalled()
    })
  })

  describe('getByCategory', () => {
    it('should return tools in the specified category', () => {
      registry.register(createMockPlugin('math_tool', { category: 'math' }))
      registry.register(createMockPlugin('code_tool', { category: 'code' }))

      const mathTools = registry.getByCategory('math')

      expect(mathTools).toHaveLength(1)
      expect(mathTools[0].metadata.name).toBe('math_tool')
    })
  })

  describe('getCategories', () => {
    it('should return all unique categories', () => {
      registry.register(createMockPlugin('math_tool', { category: 'math' }))
      registry.register(createMockPlugin('code_tool', { category: 'code' }))
      registry.register(createMockPlugin('another_math', { category: 'math' }))

      const categories = registry.getCategories()

      expect(categories).toHaveLength(2)
      expect(categories).toContain('math')
      expect(categories).toContain('code')
    })

    it('should return sorted categories', () => {
      registry.register(createMockPlugin('z_tool', { category: 'utility' }))
      registry.register(createMockPlugin('a_tool', { category: 'code' }))

      const categories = registry.getCategories()

      expect(categories).toEqual(['code', 'utility'])
    })
  })
})

describe('createToolPlugin', () => {
  it('should return the same plugin with proper types', () => {
    const plugin = createToolPlugin({
      metadata: createMockMetadata('test_tool'),
      definition: createMockDefinition('test_tool'),
      handler: async (args: { input: string }) => ({ output: args.input }),
    })

    expect(plugin.metadata.name).toBe('test_tool')
    expect(plugin.definition.function.name).toBe('test_tool')
    expect(plugin.handler).toBeDefined()
  })
})
