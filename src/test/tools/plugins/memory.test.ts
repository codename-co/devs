/**
 * Tests for the `remember` memory tool plugin.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ToolExecutionContext } from '@/lib/tool-executor/types'

const applyMemoryOperation = vi.fn(
  async (_agentId: string, action: string) => `applied:${action}`,
)

vi.mock('@/lib/memory-learning-service', () => ({
  applyMemoryOperation: (...args: unknown[]) =>
    (applyMemoryOperation as any)(...args),
  GLOBAL_MEMORY_AGENT_ID: '__global__',
}))

import { rememberPlugin, REMEMBER_TOOL_DEFINITION } from '@/tools/plugins/memory'

const ctx = (agentId?: string): ToolExecutionContext => ({ agentId })

beforeEach(() => applyMemoryOperation.mockClear())

describe('remember tool definition', () => {
  it('is named "remember" and not exposed by default', () => {
    expect(REMEMBER_TOOL_DEFINITION.function.name).toBe('remember')
    expect(rememberPlugin.metadata.name).toBe('remember')
    // Memory is captured transparently in the background, so the explicit
    // tool is opt-in rather than on every agent by default.
    expect(rememberPlugin.metadata.enabledByDefault).toBe(false)
    expect(rememberPlugin.metadata.category).toBe('memory')
  })
})

describe('remember tool validation', () => {
  it('rejects an invalid action', () => {
    expect(() => rememberPlugin.validate!({ action: 'nope' })).toThrow()
  })
  it('requires content for append', () => {
    expect(() => rememberPlugin.validate!({ action: 'append' })).toThrow()
  })
  it('requires find and content for replace', () => {
    expect(() =>
      rememberPlugin.validate!({ action: 'replace', find: 'x' }),
    ).toThrow()
  })
  it('accepts a valid append', () => {
    expect(
      rememberPlugin.validate!({ action: 'append', content: 'hi' }),
    ).toEqual({ action: 'append', content: 'hi' })
  })
})

describe('remember tool handler', () => {
  it('delegates to applyMemoryOperation with the agent id', async () => {
    const res = await rememberPlugin.handler(
      { action: 'append', content: 'note' },
      ctx('agent-1'),
    )
    expect(applyMemoryOperation).toHaveBeenCalledWith('agent-1', 'append', {
      content: 'note',
      find: undefined,
    })
    expect(res.status).toBe('applied:append')
  })

  it('is a no-op without an agent context', async () => {
    const res = await rememberPlugin.handler(
      { action: 'view' },
      ctx(undefined),
    )
    expect(applyMemoryOperation).not.toHaveBeenCalled()
    expect(res.status).toMatch(/no agent/i)
  })

  it('routes scope "global" to the global memory document', async () => {
    await rememberPlugin.handler(
      { action: 'append', content: 'note', scope: 'global' },
      ctx('agent-1'),
    )
    expect(applyMemoryOperation).toHaveBeenCalledWith('__global__', 'append', {
      content: 'note',
      find: undefined,
    })
  })

  it('defaults to the agent scope', async () => {
    await rememberPlugin.handler(
      { action: 'append', content: 'note' },
      ctx('agent-1'),
    )
    expect(applyMemoryOperation).toHaveBeenCalledWith('agent-1', 'append', {
      content: 'note',
      find: undefined,
    })
  })
})
