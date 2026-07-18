/**
 * Tests for the KISS agent memory (docs/more/MEMORY.md).
 *
 * Covers the agent-directed memory document operations used by the `remember`
 * tool and the whole-document injection used at conversation start.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──

// In-memory stand-in for the per-agent memory document synthesis.
const docByAgent = new Map<string, string>()
let legacyApproved: Array<{
  title: string
  content: string
  validationStatus: string
}> = []
let legacyGlobal: Array<{
  title: string
  content: string
  validationStatus: string
}> = []

vi.mock('@/stores/agentMemoryStore', () => ({
  useAgentMemoryStore: {
    getState: () => ({
      loadMemoryDocument: async (agentId: string) => {
        const synthesis = docByAgent.get(agentId)
        return synthesis !== undefined ? { agentId, synthesis } : null
      },
      createOrUpdateMemoryDocument: async (
        agentId: string,
        updates: { synthesis?: string },
      ) => {
        docByAgent.set(agentId, updates.synthesis ?? '')
        return { agentId, synthesis: updates.synthesis ?? '' }
      },
    }),
  },
  getMemoriesByAgentId: () => [],
  getMemoriesByAgentIdDecrypted: async () => legacyApproved,
  getGlobalMemoriesDecrypted: async () => legacyGlobal,
}))

// Keep other imports of the service from pulling heavy deps.
const mockChat = vi.fn(async () => ({ content: '' }))
let mockConfig: unknown = { provider: 'test' }
vi.mock('@/lib/llm', () => ({
  LLMService: { chat: (...args: unknown[]) => (mockChat as any)(...args) },
  LLMMessage: {},
}))
vi.mock('@/lib/credential-service', () => ({
  CredentialService: { getActiveConfig: async () => mockConfig },
}))
vi.mock('@/stores/conversationStore', () => ({ useConversationStore: {} }))

import {
  applyMemoryOperation,
  readAgentMemory,
  writeAgentMemory,
  buildMemoryContextForChat,
  compactAgentMemory,
  autoCaptureToMemory,
  GLOBAL_MEMORY_AGENT_ID,
} from '@/lib/memory-learning-service'

const AGENT = 'agent-1'

beforeEach(() => {
  docByAgent.clear()
  legacyApproved = []
  legacyGlobal = []
  mockChat.mockReset()
  mockChat.mockResolvedValue({ content: '' })
  mockConfig = { provider: 'test' }
})

describe('agent memory document operations', () => {
  it('starts empty', async () => {
    expect(await readAgentMemory(AGENT)).toBe('')
  })

  it('appends notes', async () => {
    const status = await applyMemoryOperation(AGENT, 'append', {
      content: '- Name: Arnaud. Prefers French.',
    })
    expect(status).toMatch(/updated/i)
    expect(await readAgentMemory(AGENT)).toContain('Arnaud')
  })

  it('appends onto existing content on a new line', async () => {
    await writeAgentMemory(AGENT, '- Line one')
    await applyMemoryOperation(AGENT, 'append', { content: '- Line two' })
    expect(await readAgentMemory(AGENT)).toBe('- Line one\n- Line two')
  })

  it('replaces existing text', async () => {
    await writeAgentMemory(AGENT, '- Prefers French')
    await applyMemoryOperation(AGENT, 'replace', {
      find: 'French',
      content: 'German',
    })
    expect(await readAgentMemory(AGENT)).toBe('- Prefers German')
  })

  it('reports when replace target is missing', async () => {
    await writeAgentMemory(AGENT, '- Prefers French')
    const status = await applyMemoryOperation(AGENT, 'replace', {
      find: 'Spanish',
      content: 'German',
    })
    expect(status).toMatch(/not found/i)
    expect(await readAgentMemory(AGENT)).toBe('- Prefers French')
  })

  it('deletes text and tidies blank lines', async () => {
    await writeAgentMemory(AGENT, '- One\n- Two\n- Three')
    await applyMemoryOperation(AGENT, 'delete', { content: '', find: '- Two\n' })
    const mem = await readAgentMemory(AGENT)
    expect(mem).not.toContain('Two')
    expect(mem).toContain('One')
    expect(mem).toContain('Three')
  })

  it('view returns current memory without mutating', async () => {
    await writeAgentMemory(AGENT, '- Something')
    const status = await applyMemoryOperation(AGENT, 'view', {})
    expect(status).toContain('Something')
    expect(await readAgentMemory(AGENT)).toBe('- Something')
  })

  it('refuses to grow beyond the size budget', async () => {
    const big = 'x'.repeat(3999)
    await writeAgentMemory(AGENT, big)
    const status = await applyMemoryOperation(AGENT, 'append', {
      content: 'y'.repeat(100),
    })
    expect(status).toMatch(/full|consolidate/i)
    // Unchanged
    expect(await readAgentMemory(AGENT)).toBe(big)
  })
})

describe('lazy migration from legacy memories', () => {
  it('flattens approved legacy memories into the document once', async () => {
    legacyApproved = [
      { title: 'Name', content: 'Arnaud', validationStatus: 'approved' },
      { title: 'Lang', content: 'French', validationStatus: 'auto_approved' },
      { title: 'Ignore', content: 'pending one', validationStatus: 'pending' },
    ]
    const mem = await readAgentMemory(AGENT)
    expect(mem).toContain('Name: Arnaud')
    expect(mem).toContain('Lang: French')
    expect(mem).not.toContain('pending one')
    // Persisted, so a second read no longer depends on legacy data.
    legacyApproved = []
    expect(await readAgentMemory(AGENT)).toContain('Arnaud')
  })
})

describe('buildMemoryContextForChat', () => {
  it('returns empty string when there is no memory', async () => {
    expect(await buildMemoryContextForChat(AGENT)).toBe('')
  })

  it('injects the whole document verbatim', async () => {
    await writeAgentMemory(AGENT, '- Name: Arnaud')
    const ctx = await buildMemoryContextForChat(AGENT)
    expect(ctx).toContain('Name: Arnaud')
    expect(ctx).toMatch(/remember/i)
  })

  it('injects both the global and the agent-specific documents', async () => {
    await writeAgentMemory(GLOBAL_MEMORY_AGENT_ID, '- User speaks French')
    await writeAgentMemory(AGENT, '- Prefers concise answers')
    const ctx = await buildMemoryContextForChat(AGENT)
    expect(ctx).toContain('User speaks French')
    expect(ctx).toContain('Prefers concise answers')
    expect(ctx).toMatch(/Shared/i)
    expect(ctx).toMatch(/own notes/i)
  })

  it('injects the global document even when the agent has none', async () => {
    await writeAgentMemory(GLOBAL_MEMORY_AGENT_ID, '- User speaks French')
    const ctx = await buildMemoryContextForChat(AGENT)
    expect(ctx).toContain('User speaks French')
  })
})

describe('global memory scope', () => {
  it('reads and writes the global document independently of agents', async () => {
    await applyMemoryOperation(GLOBAL_MEMORY_AGENT_ID, 'append', {
      content: '- User name is Arnaud',
    })
    expect(await readAgentMemory(GLOBAL_MEMORY_AGENT_ID)).toContain('Arnaud')
    // Agent-specific memory is unaffected
    expect(await readAgentMemory(AGENT)).toBe('')
  })

  it('migrates legacy isGlobal memories into the global document', async () => {
    legacyGlobal = [
      { title: 'Lang', content: 'French', validationStatus: 'approved' },
    ]
    const mem = await readAgentMemory(GLOBAL_MEMORY_AGENT_ID)
    expect(mem).toContain('Lang: French')
  })
})

describe('compactAgentMemory', () => {
  it('is a no-op on empty memory (no LLM call)', async () => {
    expect(await compactAgentMemory(AGENT)).toBe('')
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('replaces the document with the compacted result', async () => {
    await writeAgentMemory(AGENT, '- a\n- a\n- b')
    mockChat.mockResolvedValue({ content: '- a\n- b' })
    const result = await compactAgentMemory(AGENT)
    expect(result).toBe('- a\n- b')
    expect(await readAgentMemory(AGENT)).toBe('- a\n- b')
  })

  it('strips code fences from the model output', async () => {
    await writeAgentMemory(AGENT, '- something')
    mockChat.mockResolvedValue({ content: '```markdown\n- clean\n```' })
    expect(await compactAgentMemory(AGENT)).toBe('- clean')
  })

  it('keeps existing memory when there is no LLM config', async () => {
    await writeAgentMemory(AGENT, '- keep me')
    mockConfig = null
    expect(await compactAgentMemory(AGENT)).toBe('- keep me')
    expect(mockChat).not.toHaveBeenCalled()
  })
})

describe('autoCaptureToMemory', () => {
  it('appends new durable notes returned by the model', async () => {
    mockChat.mockResolvedValue({ content: '- Name: Arnaud\n- Prefers French' })
    const notes = await autoCaptureToMemory(
      'I am Arnaud and I prefer French',
      'Enchanté !',
      AGENT,
    )
    expect(notes.length).toBe(2)
    const mem = await readAgentMemory(AGENT)
    expect(mem).toContain('Name: Arnaud')
    expect(mem).toContain('Prefers French')
  })

  it('captures nothing when the model returns NONE', async () => {
    mockChat.mockResolvedValue({ content: 'NONE' })
    const notes = await autoCaptureToMemory('what time is it?', '3pm', AGENT)
    expect(notes).toEqual([])
    expect(await readAgentMemory(AGENT)).toBe('')
  })

  it('does not duplicate notes already in memory', async () => {
    await writeAgentMemory(AGENT, '- Name: Arnaud')
    mockChat.mockResolvedValue({ content: '- Name: Arnaud\n- Lives in Paris' })
    const notes = await autoCaptureToMemory('...', '...', AGENT)
    expect(notes).toEqual(['- Lives in Paris'])
    const mem = await readAgentMemory(AGENT)
    expect(mem.match(/Name: Arnaud/g)?.length).toBe(1)
  })

  it('is a no-op without an LLM config', async () => {
    mockConfig = null
    const notes = await autoCaptureToMemory('x', 'y', AGENT)
    expect(notes).toEqual([])
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('skips appending when it would exceed the size budget', async () => {
    await writeAgentMemory(AGENT, 'x'.repeat(3990))
    mockChat.mockResolvedValue({ content: '- ' + 'y'.repeat(50) })
    const notes = await autoCaptureToMemory('...', '...', AGENT)
    expect(notes).toEqual([])
  })
})
