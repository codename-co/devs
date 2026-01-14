/**
 * Tool Executor Tests
 *
 * Tests for the tool execution system:
 * - KnowledgeToolRegistry: register, unregister, get, has, list
 * - KnowledgeToolExecutor: execute single tool, batch execution
 * - Error handling: invalid tool, parse errors, timeouts
 * - formatResultForLLM: result formatting for LLM consumption
 *
 * @module test/lib/tool-executor/executor.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ToolCall, ToolDefinition } from '@/lib/llm/types'
import type {
  ToolExecutionContext,
  ToolHandler,
  ToolRegistrationOptions,
} from '@/lib/tool-executor/types'
import type { JSONSchemaProperty } from '@/lib/llm/types'
import { createMockDb, resetMockDb } from '@/test/stores/mocks'

// Create mocks
const mockDb = createMockDb()

// Extend mock with hasStore method
const extendedMockDb = {
  ...mockDb,
  hasStore: vi.fn(() => true),
}

// Setup global mocks for knowledge tools
vi.mock('@/lib/db', () => ({ db: extendedMockDb }))

// Import after mocks are set up
let executorModule: typeof import('@/lib/tool-executor/executor')

/**
 * Helper to create a mock tool definition
 */
function createToolDefinition(
  name: string,
  description = 'Test tool',
  parameters: Record<string, JSONSchemaProperty> = {}
): ToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties: parameters,
        required: [],
      },
    },
  }
}

/**
 * Helper to create a mock tool call
 */
function createToolCall(
  name: string,
  args: Record<string, unknown> = {},
  id = `call-${Date.now()}`
): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  }
}

describe('Tool Executor', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetMockDb(mockDb)
    extendedMockDb.hasStore.mockReturnValue(true)

    // Reset module cache
    vi.resetModules()

    // Re-import the module fresh
    executorModule = await import('@/lib/tool-executor/executor')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // KnowledgeToolRegistry Tests
  // ============================================
  describe('KnowledgeToolRegistry', () => {
    describe('register', () => {
      it('should register a new tool', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('test_tool')
        const handler: ToolHandler = vi.fn()

        registry.register(definition, handler)

        expect(registry.has('test_tool')).toBe(true)
      })

      it('should store handler with definition', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('test_tool')
        const handler: ToolHandler = vi.fn().mockResolvedValue('result')

        registry.register(definition, handler)

        const tool = registry.get('test_tool')
        expect(tool).toBeDefined()
        expect(tool?.definition).toBe(definition)
        expect(tool?.handler).toBe(handler)
      })

      it('should throw when registering duplicate tool without replace option', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('test_tool')

        registry.register(definition, vi.fn())

        expect(() => {
          registry.register(definition, vi.fn())
        }).toThrow('already registered')
      })

      it('should allow replacing tool with replace option', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('test_tool')
        const handler1: ToolHandler = vi.fn().mockResolvedValue('first')
        const handler2: ToolHandler = vi.fn().mockResolvedValue('second')

        registry.register(definition, handler1)
        registry.register(definition, handler2, { replace: true })

        const tool = registry.get('test_tool')
        expect(tool?.handler).toBe(handler2)
      })

      it('should store registration options', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('test_tool')
        const options: ToolRegistrationOptions = {
          tags: ['custom', 'test'],
          requiresConfirmation: true,
          estimatedDuration: 1000,
        }

        registry.register(definition, vi.fn(), options)

        const tool = registry.get('test_tool')
        expect(tool?.tags).toEqual(['custom', 'test'])
        expect(tool?.requiresConfirmation).toBe(true)
        expect(tool?.estimatedDuration).toBe(1000)
      })
    })

    describe('unregister', () => {
      it('should remove a registered tool', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('test_tool')

        registry.register(definition, vi.fn())
        const removed = registry.unregister('test_tool')

        expect(removed).toBe(true)
        expect(registry.has('test_tool')).toBe(false)
      })

      it('should return false for non-existent tool', () => {
        const registry = new executorModule.KnowledgeToolRegistry()

        const removed = registry.unregister('non_existent')

        expect(removed).toBe(false)
      })
    })

    describe('get', () => {
      it('should return registered tool by name', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const definition = createToolDefinition('my_tool')

        registry.register(definition, vi.fn())

        const tool = registry.get('my_tool')
        expect(tool).toBeDefined()
        expect(tool?.definition.function.name).toBe('my_tool')
      })

      it('should return undefined for non-existent tool', () => {
        const registry = new executorModule.KnowledgeToolRegistry()

        const tool = registry.get('non_existent')

        expect(tool).toBeUndefined()
      })
    })

    describe('has', () => {
      it('should return true for registered tool', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('test_tool'), vi.fn())

        expect(registry.has('test_tool')).toBe(true)
      })

      it('should return false for non-registered tool', () => {
        const registry = new executorModule.KnowledgeToolRegistry()

        expect(registry.has('non_existent')).toBe(false)
      })
    })

    describe('listDefinitions', () => {
      it('should return all registered tool definitions', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('tool_1'), vi.fn())
        registry.register(createToolDefinition('tool_2'), vi.fn())
        registry.register(createToolDefinition('tool_3'), vi.fn())

        const definitions = registry.listDefinitions()

        expect(definitions.length).toBe(3)
        expect(definitions.map((d) => d.function.name)).toContain('tool_1')
        expect(definitions.map((d) => d.function.name)).toContain('tool_2')
        expect(definitions.map((d) => d.function.name)).toContain('tool_3')
      })

      it('should filter by tags', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('tool_1'), vi.fn(), { tags: ['knowledge'] })
        registry.register(createToolDefinition('tool_2'), vi.fn(), { tags: ['custom'] })
        registry.register(createToolDefinition('tool_3'), vi.fn(), { tags: ['knowledge', 'search'] })

        const definitions = registry.listDefinitions({ tags: ['knowledge'] })

        expect(definitions.length).toBe(2)
        expect(definitions.map((d) => d.function.name)).toContain('tool_1')
        expect(definitions.map((d) => d.function.name)).toContain('tool_3')
      })

      it('should filter by excludeTags', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('tool_1'), vi.fn(), { tags: ['safe'] })
        registry.register(createToolDefinition('tool_2'), vi.fn(), { tags: ['dangerous'] })

        const definitions = registry.listDefinitions({ excludeTags: ['dangerous'] })

        expect(definitions.length).toBe(1)
        expect(definitions[0].function.name).toBe('tool_1')
      })

      it('should filter by includeConfirmationRequired', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('safe_tool'), vi.fn(), { requiresConfirmation: false })
        registry.register(createToolDefinition('risky_tool'), vi.fn(), { requiresConfirmation: true })

        const definitions = registry.listDefinitions({ includeConfirmationRequired: false })

        expect(definitions.length).toBe(1)
        expect(definitions[0].function.name).toBe('safe_tool')
      })
    })

    describe('listNames', () => {
      it('should return all registered tool names', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('alpha'), vi.fn())
        registry.register(createToolDefinition('beta'), vi.fn())

        const names = registry.listNames()

        expect(names).toContain('alpha')
        expect(names).toContain('beta')
      })

      it('should return empty array when no tools registered', () => {
        const registry = new executorModule.KnowledgeToolRegistry()

        const names = registry.listNames()

        expect(names).toEqual([])
      })
    })

    describe('count', () => {
      it('should return number of registered tools', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('tool_1'), vi.fn())
        registry.register(createToolDefinition('tool_2'), vi.fn())

        expect(registry.count()).toBe(2)
      })

      it('should return 0 when empty', () => {
        const registry = new executorModule.KnowledgeToolRegistry()

        expect(registry.count()).toBe(0)
      })
    })

    describe('clear', () => {
      it('should remove all registered tools', () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        registry.register(createToolDefinition('tool_1'), vi.fn())
        registry.register(createToolDefinition('tool_2'), vi.fn())

        registry.clear()

        expect(registry.count()).toBe(0)
        expect(registry.has('tool_1')).toBe(false)
      })
    })
  })

  // ============================================
  // KnowledgeToolExecutor Tests
  // ============================================
  describe('KnowledgeToolExecutor', () => {
    describe('execute (single tool)', () => {
      it('should execute a registered tool successfully', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler = vi.fn().mockResolvedValue({ data: 'result' })
        registry.register(createToolDefinition('test_tool'), handler)

        const toolCall = createToolCall('test_tool', { input: 'value' })
        const result = await executor.execute(toolCall)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.result).toEqual({ data: 'result' })
        }
        expect(handler).toHaveBeenCalledWith(
          { input: 'value' },
          expect.any(Object)
        )
      })

      it('should pass context to handler', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler = vi.fn().mockResolvedValue('ok')
        registry.register(createToolDefinition('test_tool'), handler)

        const toolCall = createToolCall('test_tool')
        const context: ToolExecutionContext = {
          agentId: 'agent-123',
          conversationId: 'conv-456',
        }

        await executor.execute(toolCall, { context })

        expect(handler).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            agentId: 'agent-123',
            conversationId: 'conv-456',
          })
        )
      })

      it('should measure execution duration', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        // Handler with a small delay
        const handler = vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return 'done'
        })
        registry.register(createToolDefinition('test_tool'), handler)

        const result = await executor.execute(createToolCall('test_tool'))

        expect(result.duration).toBeGreaterThan(0)
      })

      it('should return error for unregistered tool', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const toolCall = createToolCall('non_existent_tool')
        const result = await executor.execute(toolCall)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errorType).toBe('not_found')
          expect(result.error).toContain('not registered')
        }
      })

      it('should handle empty arguments', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler = vi.fn().mockResolvedValue('ok')
        registry.register(createToolDefinition('test_tool'), handler)

        const toolCall: ToolCall = {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: '',
          },
        }

        const result = await executor.execute(toolCall)

        expect(result.success).toBe(true)
        expect(handler).toHaveBeenCalledWith({}, expect.any(Object))
      })
    })

    describe('error handling', () => {
      it('should handle parse errors in arguments', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(createToolDefinition('test_tool'), vi.fn())

        const toolCall: ToolCall = {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: 'invalid json {',
          },
        }

        const result = await executor.execute(toolCall)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errorType).toBe('parse')
          expect(result.error).toContain('parse')
        }
      })

      it('should handle handler throwing an error', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler = vi.fn().mockRejectedValue(new Error('Handler failed'))
        registry.register(createToolDefinition('test_tool'), handler)

        const result = await executor.execute(createToolCall('test_tool'))

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errorType).toBe('execution')
          expect(result.error).toContain('Handler failed')
        }
      })

      it('should handle timeout', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        // Handler that respects abort signal (this is the expected pattern)
        const handler = vi.fn().mockImplementation(async (_args, context) => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => resolve('done'), 10000)
            // Listen for abort from timeout
            context.abortSignal?.addEventListener('abort', () => {
              clearTimeout(timeoutId)
              reject(new Error('Aborted by timeout'))
            })
          })
        })
        registry.register(createToolDefinition('slow_tool'), handler)

        const result = await executor.execute(
          createToolCall('slow_tool'),
          { timeout: 30 }
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(['timeout', 'aborted', 'execution']).toContain(result.errorType)
        }
      }, 10000)

      it('should handle aborted execution', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const abortController = new AbortController()

        // Handler that checks abort signal
        const handler = vi.fn().mockImplementation(async (_args, context) => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          if (context.abortSignal?.aborted) {
            throw new Error('Aborted')
          }
          return 'done'
        })
        registry.register(createToolDefinition('test_tool'), handler)

        // Abort almost immediately
        setTimeout(() => abortController.abort(), 10)

        const result = await executor.execute(
          createToolCall('test_tool'),
          { context: { abortSignal: abortController.signal } }
        )

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(['aborted', 'execution']).toContain(result.errorType)
        }
      })

      it('should handle non-object arguments', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(createToolDefinition('test_tool'), vi.fn())

        const toolCall: ToolCall = {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: '"just a string"',
          },
        }

        const result = await executor.execute(toolCall)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errorType).toBe('parse')
          expect(result.error).toContain('must be a JSON object')
        }
      })

      it('should handle array arguments', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(createToolDefinition('test_tool'), vi.fn())

        const toolCall: ToolCall = {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: '["array", "not", "object"]',
          },
        }

        const result = await executor.execute(toolCall)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errorType).toBe('parse')
        }
      })
    })

    describe('executeBatch', () => {
      it('should execute multiple tools', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler1 = vi.fn().mockResolvedValue('result1')
        const handler2 = vi.fn().mockResolvedValue('result2')

        registry.register(createToolDefinition('tool_1'), handler1)
        registry.register(createToolDefinition('tool_2'), handler2)

        const toolCalls = [
          createToolCall('tool_1', {}, 'call-1'),
          createToolCall('tool_2', {}, 'call-2'),
        ]

        const result = await executor.executeBatch(toolCalls)

        expect(result.results.length).toBe(2)
        expect(result.successCount).toBe(2)
        expect(result.failureCount).toBe(0)
      })

      it('should execute in parallel by default', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const executionOrder: string[] = []

        const handler1 = vi.fn().mockImplementation(async () => {
          executionOrder.push('start-1')
          await new Promise((resolve) => setTimeout(resolve, 50))
          executionOrder.push('end-1')
          return 'result1'
        })

        const handler2 = vi.fn().mockImplementation(async () => {
          executionOrder.push('start-2')
          await new Promise((resolve) => setTimeout(resolve, 20))
          executionOrder.push('end-2')
          return 'result2'
        })

        registry.register(createToolDefinition('tool_1'), handler1)
        registry.register(createToolDefinition('tool_2'), handler2)

        await executor.executeBatch([
          createToolCall('tool_1', {}, 'call-1'),
          createToolCall('tool_2', {}, 'call-2'),
        ])

        // In parallel, both start before either ends
        expect(executionOrder.slice(0, 2)).toEqual(
          expect.arrayContaining(['start-1', 'start-2'])
        )
      })

      it('should execute sequentially when parallel is false', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const executionOrder: string[] = []

        const handler1 = vi.fn().mockImplementation(async () => {
          executionOrder.push('start-1')
          await new Promise((resolve) => setTimeout(resolve, 10))
          executionOrder.push('end-1')
          return 'result1'
        })

        const handler2 = vi.fn().mockImplementation(async () => {
          executionOrder.push('start-2')
          executionOrder.push('end-2')
          return 'result2'
        })

        registry.register(createToolDefinition('tool_1'), handler1)
        registry.register(createToolDefinition('tool_2'), handler2)

        await executor.executeBatch(
          [
            createToolCall('tool_1', {}, 'call-1'),
            createToolCall('tool_2', {}, 'call-2'),
          ],
          { parallel: false }
        )

        // Sequential: first tool completes before second starts
        expect(executionOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2'])
      })

      it('should continue on error by default', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler1 = vi.fn().mockRejectedValue(new Error('Failed'))
        const handler2 = vi.fn().mockResolvedValue('success')

        registry.register(createToolDefinition('failing_tool'), handler1)
        registry.register(createToolDefinition('working_tool'), handler2)

        const result = await executor.executeBatch(
          [
            createToolCall('failing_tool', {}, 'call-1'),
            createToolCall('working_tool', {}, 'call-2'),
          ],
          { parallel: false }
        )

        expect(result.results.length).toBe(2)
        expect(result.successCount).toBe(1)
        expect(result.failureCount).toBe(1)
      })

      it('should stop on error when continueOnError is false', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const handler1 = vi.fn().mockRejectedValue(new Error('Failed'))
        const handler2 = vi.fn().mockResolvedValue('success')

        registry.register(createToolDefinition('failing_tool'), handler1)
        registry.register(createToolDefinition('working_tool'), handler2)

        const result = await executor.executeBatch(
          [
            createToolCall('failing_tool', {}, 'call-1'),
            createToolCall('working_tool', {}, 'call-2'),
          ],
          { parallel: false, continueOnError: false }
        )

        // Should stop after first failure
        expect(result.failureCount).toBe(1)
        expect(handler2).not.toHaveBeenCalled()
      })

      it('should handle empty tool calls array', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const result = await executor.executeBatch([])

        expect(result.results).toEqual([])
        expect(result.successCount).toBe(0)
        expect(result.failureCount).toBe(0)
        expect(result.totalDuration).toBe(0)
      })

      it('should report total duration', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('tool'),
          vi.fn().mockResolvedValue('ok')
        )

        const result = await executor.executeBatch([
          createToolCall('tool', {}, 'call-1'),
          createToolCall('tool', {}, 'call-2'),
        ])

        expect(result.totalDuration).toBeGreaterThanOrEqual(0)
      })

      it('should respect maxConcurrency option', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        let concurrent = 0
        let maxConcurrent = 0

        const handler = vi.fn().mockImplementation(async () => {
          concurrent++
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          await new Promise((resolve) => setTimeout(resolve, 20))
          concurrent--
          return 'ok'
        })

        registry.register(createToolDefinition('tool'), handler)

        await executor.executeBatch(
          Array.from({ length: 10 }, (_, i) =>
            createToolCall('tool', {}, `call-${i}`)
          ),
          { maxConcurrency: 2 }
        )

        expect(maxConcurrent).toBeLessThanOrEqual(2)
      })
    })

    describe('formatResultForLLM', () => {
      it('should format successful string result', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue('Simple string result')
        )

        const result = await executor.execute(createToolCall('test_tool'))
        const formatted = executor.formatResultForLLM(result)

        expect(formatted).toBe('Simple string result')
      })

      it('should format successful object result as JSON', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue({ key: 'value', nested: { data: true } })
        )

        const result = await executor.execute(createToolCall('test_tool'))
        const formatted = executor.formatResultForLLM(result)

        const parsed = JSON.parse(formatted)
        expect(parsed.key).toBe('value')
        expect(parsed.nested.data).toBe(true)
      })

      it('should format number result as string', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue(42)
        )

        const result = await executor.execute(createToolCall('test_tool'))
        const formatted = executor.formatResultForLLM(result)

        expect(formatted).toBe('42')
      })

      it('should format boolean result as string', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue(true)
        )

        const result = await executor.execute(createToolCall('test_tool'))
        const formatted = executor.formatResultForLLM(result)

        expect(formatted).toBe('true')
      })

      it('should format null result as "null"', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue(null)
        )

        const result = await executor.execute(createToolCall('test_tool'))
        const formatted = executor.formatResultForLLM(result)

        expect(formatted).toBe('null')
      })

      it('should format error result as JSON error object', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        const result = await executor.execute(createToolCall('non_existent'))
        const formatted = executor.formatResultForLLM(result)

        const parsed = JSON.parse(formatted)
        expect(parsed.error).toBe(true)
        expect(parsed.type).toBe('not_found')
        expect(parsed.message).toBeDefined()
      })

      it('should format array result as JSON', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue([1, 2, 3, 'four'])
        )

        const result = await executor.execute(createToolCall('test_tool'))
        const formatted = executor.formatResultForLLM(result)

        const parsed = JSON.parse(formatted)
        expect(parsed).toEqual([1, 2, 3, 'four'])
      })
    })

    describe('event listeners', () => {
      it('should emit tool_execution_start event', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue('ok')
        )

        const listener = vi.fn()
        executor.addEventListener(listener)

        await executor.execute(createToolCall('test_tool'))

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'tool_execution_start',
            toolName: 'test_tool',
          })
        )
      })

      it('should emit tool_execution_complete event', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue('result')
        )

        const listener = vi.fn()
        executor.addEventListener(listener)

        await executor.execute(createToolCall('test_tool'))

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'tool_execution_complete',
            result: expect.objectContaining({ success: true }),
          })
        )
      })

      it('should allow removing event listener', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue('ok')
        )

        const listener = vi.fn()
        const removeListener = executor.addEventListener(listener)

        // Execute once - should trigger listener
        await executor.execute(createToolCall('test_tool'))
        expect(listener).toHaveBeenCalledTimes(2) // start + complete

        // Remove listener
        removeListener()
        listener.mockClear()

        // Execute again - should not trigger listener
        await executor.execute(createToolCall('test_tool'))
        expect(listener).not.toHaveBeenCalled()
      })

      it('should handle listener errors gracefully', async () => {
        const registry = new executorModule.KnowledgeToolRegistry()
        const executor = new executorModule.KnowledgeToolExecutor(registry)

        registry.register(
          createToolDefinition('test_tool'),
          vi.fn().mockResolvedValue('ok')
        )

        const errorListener = vi.fn().mockImplementation(() => {
          throw new Error('Listener error')
        })
        executor.addEventListener(errorListener)

        // Should not throw despite listener error
        const result = await executor.execute(createToolCall('test_tool'))

        expect(result.success).toBe(true)
      })
    })
  })

  // ============================================
  // Knowledge Tools Registration Tests
  // ============================================
  describe('Knowledge Tools Registration', () => {
    it('should register all knowledge tools', () => {
      const { defaultRegistry, registerKnowledgeTools, areKnowledgeToolsRegistered } = executorModule

      // Clear any existing tools
      defaultRegistry.clear()

      expect(areKnowledgeToolsRegistered()).toBe(false)

      registerKnowledgeTools()

      expect(areKnowledgeToolsRegistered()).toBe(true)
      expect(defaultRegistry.has('search_knowledge')).toBe(true)
      expect(defaultRegistry.has('read_document')).toBe(true)
      expect(defaultRegistry.has('list_documents')).toBe(true)
      expect(defaultRegistry.has('get_document_summary')).toBe(true)
    })

    it('should unregister all knowledge tools', () => {
      const { defaultRegistry, registerKnowledgeTools, unregisterKnowledgeTools, areKnowledgeToolsRegistered } = executorModule

      defaultRegistry.clear()
      registerKnowledgeTools()
      expect(areKnowledgeToolsRegistered()).toBe(true)

      unregisterKnowledgeTools()

      expect(areKnowledgeToolsRegistered()).toBe(false)
      expect(defaultRegistry.has('search_knowledge')).toBe(false)
    })

    it('should provide default registry and executor instances', () => {
      const { defaultRegistry, defaultExecutor } = executorModule

      expect(defaultRegistry).toBeInstanceOf(executorModule.KnowledgeToolRegistry)
      expect(defaultExecutor).toBeInstanceOf(executorModule.KnowledgeToolExecutor)
      expect(defaultExecutor.registry).toBe(defaultRegistry)
    })
  })
})
