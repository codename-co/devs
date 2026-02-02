import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Agent } from '@/types'
import {
  createMockToast,
  createTestAgent,
} from './mocks'

// Create mocks
const mockToast = createMockToast()
const mockFetch = vi.fn()

// Mock Yjs agents map - use a real Map for testing
const mockAgentsMap = new Map<string, Agent>()

// Mock Yjs module
vi.mock('@/lib/yjs', () => {
  return {
    agents: {
      get: (id: string) => mockAgentsMap.get(id),
      set: (id: string, value: Agent) => mockAgentsMap.set(id, value),
      has: (id: string) => mockAgentsMap.has(id),
      delete: (id: string) => mockAgentsMap.delete(id),
      values: () => mockAgentsMap.values(),
      keys: () => mockAgentsMap.keys(),
      entries: () => mockAgentsMap.entries(),
      forEach: (fn: (value: Agent, key: string) => void) => mockAgentsMap.forEach(fn),
      [Symbol.iterator]: () => mockAgentsMap[Symbol.iterator](),
      observe: vi.fn(),
      unobserve: vi.fn(),
    },
    whenReady: Promise.resolve(),
    isReady: () => true,
    transact: <T>(fn: () => T): T => fn(),
    useLiveMap: vi.fn(() => Array.from(mockAgentsMap.values())),
    useLiveValue: vi.fn((_map: unknown, id: string) => mockAgentsMap.get(id)),
    useSyncReady: vi.fn(() => true),
  }
})

vi.mock('@/lib/toast', () => mockToast)

// Mock global fetch
global.fetch = mockFetch

// We need to dynamically import the module to reset its state between tests
let agentStore: typeof import('@/stores/agentStore')

// Helper to reset the mock agents map
function resetMockAgentsMap() {
  mockAgentsMap.clear()
}

describe('agentStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetMockAgentsMap()
    mockFetch.mockReset()

    // Reset module cache to clear internal state (agentCache, agentsList)
    vi.resetModules()

    // Re-mock the yjs module after reset
    vi.doMock('@/lib/yjs', () => ({
      agents: {
        get: (id: string) => mockAgentsMap.get(id),
        set: (id: string, value: Agent) => mockAgentsMap.set(id, value),
        has: (id: string) => mockAgentsMap.has(id),
        delete: (id: string) => mockAgentsMap.delete(id),
        values: () => mockAgentsMap.values(),
        keys: () => mockAgentsMap.keys(),
        entries: () => mockAgentsMap.entries(),
        forEach: (fn: (value: Agent, key: string) => void) => mockAgentsMap.forEach(fn),
        [Symbol.iterator]: () => mockAgentsMap[Symbol.iterator](),
        observe: vi.fn(),
        unobserve: vi.fn(),
      },
      whenReady: Promise.resolve(),
      isReady: () => true,
      transact: <T>(fn: () => T): T => fn(),
      useLiveMap: vi.fn(() => Array.from(mockAgentsMap.values())),
      useLiveValue: vi.fn((_map: unknown, id: string) => mockAgentsMap.get(id)),
      useSyncReady: vi.fn(() => true),
    }))

    // Re-import the module fresh
    agentStore = await import('@/stores/agentStore')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Restore original fetch after all tests
  afterEach(() => {
    global.fetch = mockFetch
  })

  // ============================================
  // getDefaultAgent Tests
  // ============================================
  describe('getDefaultAgent', () => {
    it('should return the devs agent', () => {
      const agent = agentStore.getDefaultAgent()

      expect(agent).toBeDefined()
      expect(agent.id).toBe('devs')
      expect(agent.name).toBeDefined()
    })

    it('should return an agent with required properties', () => {
      const agent = agentStore.getDefaultAgent()

      expect(agent.id).toBe('devs')
      expect(agent.role).toBeDefined()
      expect(agent.instructions).toBeDefined()
      expect(agent.tags).toBeDefined()
      expect(Array.isArray(agent.tags)).toBe(true)
      expect(agent.createdAt).toBeInstanceOf(Date)
    })

    it('should return the same agent instance on multiple calls', () => {
      const agent1 = agentStore.getDefaultAgent()
      const agent2 = agentStore.getDefaultAgent()

      expect(agent1).toBe(agent2)
    })

    it('should have orchestrator tag', () => {
      const agent = agentStore.getDefaultAgent()

      expect(agent.tags).toContain('orchestrator')
    })

    it('should have i18n translations', () => {
      const agent = agentStore.getDefaultAgent()

      expect(agent.i18n).toBeDefined()
      expect(agent.i18n?.fr).toBeDefined()
      expect(agent.i18n?.es).toBeDefined()
    })
  })

  // ============================================
  // getAgentById Tests
  // ============================================
  describe('getAgentById', () => {
    it('should return devs agent for id "devs"', () => {
      const agent = agentStore.getAgentById('devs')

      expect(agent).toBeDefined()
      expect(agent?.id).toBe('devs')
    })

    it('should return cached built-in agent if available', async () => {
      // First call loads from JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-agent',
          name: 'Test Agent',
          role: 'Test Role',
          instructions: 'Test instructions',
          tags: ['test'],
        }),
      })

      // Use getAgentByIdAsync to load from JSON
      const agent1 = await agentStore.getAgentByIdAsync('test-agent')
      // Second call should use cache
      const agent2 = await agentStore.getAgentByIdAsync('test-agent')

      // Fetch should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(agent1).toEqual(agent2)
    })

    it('should load custom agents from Yjs', () => {
      const customAgent = createTestAgent({
        id: 'custom-123',
        name: 'Custom Agent',
      })

      // Add agent to Yjs mock
      mockAgentsMap.set('custom-123', customAgent)

      const agent = agentStore.getAgentById('custom-123')

      expect(agent).toBeDefined()
      expect(agent?.id).toBe('custom-123')
    })

    it('should return undefined for non-existent agent', () => {
      const agent = agentStore.getAgentById('non-existent')

      expect(agent).toBeUndefined()
    })

    it('should not return soft-deleted agents', () => {
      const deletedAgent = createTestAgent({
        id: 'custom-deleted',
        name: 'Deleted Agent',
        deletedAt: new Date(),
      })

      mockAgentsMap.set('custom-deleted', deletedAgent)

      const agent = agentStore.getAgentById('custom-deleted')

      expect(agent).toBeUndefined()
    })

    it('should handle empty id', () => {
      const agent = agentStore.getAgentById('')

      expect(agent).toBeUndefined()
    })
  })

  // ============================================
  // getAvailableAgents Tests
  // ============================================
  describe('getAvailableAgents', () => {
    it('should load agents from manifest.json', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['agent1', 'agent2', 'agent3'],
        }),
      })

      const agents = await agentStore.getAvailableAgents()

      expect(mockFetch).toHaveBeenCalledWith('/agents/manifest.json')
      expect(agents).toContain('devs')
      expect(agents).toContain('agent1')
      expect(agents).toContain('agent2')
      expect(agents).toContain('agent3')
    })

    it('should always include devs as first agent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['writer', 'developer'],
        }),
      })

      const agents = await agentStore.getAvailableAgents()

      expect(agents[0]).toBe('devs')
    })

    it('should cache the agents list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['agent1'],
        }),
      })

      const agents1 = await agentStore.getAvailableAgents()
      const agents2 = await agentStore.getAvailableAgents()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(agents1).toEqual(agents2)
    })

    it('should return only devs on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const agents = await agentStore.getAvailableAgents()

      expect(agents).toEqual(['devs'])
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const agents = await agentStore.getAvailableAgents()

      expect(agents).toEqual(['devs'])
    })

    it('should handle empty manifest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const agents = await agentStore.getAvailableAgents()

      expect(agents).toContain('devs')
    })
  })

  // ============================================
  // loadAllAgents Tests
  // ============================================
  describe('loadAllAgents', () => {
    it('should load both built-in and custom agents', async () => {
      // Mock manifest
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['test-agent'],
        }),
      })

      // Mock agent JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-agent',
          name: 'Test Agent',
          role: 'Test',
          instructions: 'Instructions',
          tags: ['developer'],
        }),
      })

      // Add custom agent to Yjs mock
      mockAgentsMap.set('custom-1', createTestAgent({ id: 'custom-1', name: 'Custom 1' }))

      const agents = await agentStore.loadAllAgents()

      expect(agents.some((a) => a.id === 'devs')).toBe(true)
      expect(agents.some((a) => a.id === 'test-agent')).toBe(true)
      expect(agents.some((a) => a.id === 'custom-1')).toBe(true)
    })

    it('should filter out null agents from loading failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['failing-agent'],
        }),
      })

      // Agent JSON load fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const agents = await agentStore.loadAllAgents()

      // Should still have devs, but not the failing agent
      expect(agents.some((a) => a.id === 'devs')).toBe(true)
      expect(agents.some((a) => a.id === 'failing-agent')).toBe(false)
    })
  })

  // ============================================
  // createAgent Tests
  // ============================================
  describe('createAgent', () => {
    it('should create a custom agent with generated ID', async () => {
      const agentData = {
        name: 'New Agent',
        role: 'Test Role',
        instructions: 'Test instructions',
        tags: ['test'],
      }

      const agent = await agentStore.createAgent(agentData)

      expect(agent.id).toMatch(/^custom-/)
      expect(agent.name).toBe('New Agent')
      expect(agent.role).toBe('Test Role')
      expect(agent.createdAt).toBeInstanceOf(Date)
      expect(agent.updatedAt).toBeInstanceOf(Date)
    })

    it('should save agent to Yjs', async () => {
      const agentData = {
        name: 'Yjs Agent',
        role: 'Saved Role',
      }

      const agent = await agentStore.createAgent(agentData)

      // Check that agent was saved to the Yjs mock map
      expect(mockAgentsMap.has(agent.id)).toBe(true)
      const savedAgent = mockAgentsMap.get(agent.id)
      expect(savedAgent?.name).toBe('Yjs Agent')
      expect(savedAgent?.role).toBe('Saved Role')
    })

    it('should show success toast on creation', async () => {
      const agentData = {
        name: 'Toast Agent',
        role: 'Role',
      }

      await agentStore.createAgent(agentData)

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should include optional fields when provided', async () => {
      const agentData = {
        name: 'Full Agent',
        role: 'Full Role',
        instructions: 'Full instructions',
        temperature: 0.7,
        tags: ['tag1', 'tag2'],
        knowledgeItemIds: ['kb-1', 'kb-2'],
      }

      const agent = await agentStore.createAgent(agentData)

      expect(agent.temperature).toBe(0.7)
      expect(agent.tags).toEqual(['tag1', 'tag2'])
      expect(agent.knowledgeItemIds).toEqual(['kb-1', 'kb-2'])
    })

    it('should set empty instructions if not provided', async () => {
      const agentData = {
        name: 'No Instructions',
        role: 'Role',
      }

      const agent = await agentStore.createAgent(agentData)

      expect(agent.instructions).toBe('')
    })
  })

  // ============================================
  // updateAgent Tests
  // ============================================
  describe('updateAgent', () => {
    it('should update existing agent', async () => {
      const existingAgent = createTestAgent({
        id: 'custom-update',
        name: 'Original Name',
      })
      mockAgentsMap.set('custom-update', existingAgent)

      const updated = await agentStore.updateAgent('custom-update', {
        name: 'Updated Name',
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.id).toBe('custom-update')
      // Verify the update was saved to Yjs
      expect(mockAgentsMap.get('custom-update')?.name).toBe('Updated Name')
    })

    it('should preserve agent ID during update', async () => {
      const existingAgent = createTestAgent({ id: 'custom-preserve' })
      mockAgentsMap.set('custom-preserve', existingAgent)

      const updated = await agentStore.updateAgent('custom-preserve', {
        id: 'should-not-change',
        name: 'New Name',
      } as Partial<Agent>)

      expect(updated.id).toBe('custom-preserve')
    })

    it('should update the updatedAt timestamp', async () => {
      const oldDate = new Date('2020-01-01')
      const existingAgent = createTestAgent({
        id: 'custom-timestamp',
        updatedAt: oldDate,
      })
      mockAgentsMap.set('custom-timestamp', existingAgent)

      const updated = await agentStore.updateAgent('custom-timestamp', {
        name: 'Time Test',
      })

      expect(updated.updatedAt).not.toEqual(oldDate)
      expect(updated.updatedAt?.getTime()).toBeGreaterThan(oldDate.getTime())
    })

    it('should throw error for non-existent agent', async () => {
      await expect(
        agentStore.updateAgent('non-existent', { name: 'Test' }),
      ).rejects.toThrow('Agent with id non-existent not found')
    })

    it('should show success toast on update', async () => {
      const existingAgent = createTestAgent({ id: 'custom-toast-update' })
      mockAgentsMap.set('custom-toast-update', existingAgent)

      await agentStore.updateAgent('custom-toast-update', { name: 'New' })

      expect(mockToast.successToast).toHaveBeenCalled()
    })
  })

  // ============================================
  // deleteAgent Tests
  // ============================================
  describe('deleteAgent', () => {
    it('should prevent deletion of devs agent', async () => {
      await expect(agentStore.deleteAgent('devs')).rejects.toThrow(
        'Cannot delete the default agent',
      )
    })

    it('should prevent deletion of built-in agents', async () => {
      await expect(agentStore.deleteAgent('writer')).rejects.toThrow(
        'Cannot delete built-in agents',
      )
    })

    it('should soft delete custom agent in Yjs', async () => {
      const customAgent = createTestAgent({ id: 'custom-delete' })
      mockAgentsMap.set('custom-delete', customAgent)

      await agentStore.deleteAgent('custom-delete')

      // Check that agent was soft-deleted
      const deletedAgent = mockAgentsMap.get('custom-delete')
      expect(deletedAgent?.deletedAt).toBeInstanceOf(Date)
    })

    it('should show success toast on deletion', async () => {
      const customAgent = createTestAgent({ id: 'custom-toast-delete' })
      mockAgentsMap.set('custom-toast-delete', customAgent)

      await agentStore.deleteAgent('custom-toast-delete')

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should throw error for non-existent agent', async () => {
      await expect(
        agentStore.deleteAgent('custom-non-existent'),
      ).rejects.toThrow('Agent with id custom-non-existent not found')
    })
  })

  // ============================================
  // softDeleteAgent Tests
  // ============================================
  describe('softDeleteAgent', () => {
    it('should prevent soft deletion of devs agent', async () => {
      await expect(agentStore.softDeleteAgent('devs')).rejects.toThrow(
        'Cannot delete the default agent',
      )
    })

    it('should prevent soft deletion of built-in agents', async () => {
      await expect(agentStore.softDeleteAgent('writer')).rejects.toThrow(
        'Cannot delete built-in agents',
      )
    })

    it('should set deletedAt on custom agent', async () => {
      const customAgent = createTestAgent({ id: 'custom-soft-delete' })
      mockAgentsMap.set('custom-soft-delete', customAgent)

      await agentStore.softDeleteAgent('custom-soft-delete')

      const deletedAgent = mockAgentsMap.get('custom-soft-delete')
      expect(deletedAgent?.deletedAt).toBeInstanceOf(Date)
    })

    it('should throw error for non-existent agent', async () => {
      await expect(
        agentStore.softDeleteAgent('custom-non-existent'),
      ).rejects.toThrow('Agent with id custom-non-existent not found')
    })

    it('should show success toast on soft deletion', async () => {
      const customAgent = createTestAgent({ id: 'custom-soft-toast' })
      mockAgentsMap.set('custom-soft-toast', customAgent)

      await agentStore.softDeleteAgent('custom-soft-toast')

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should update updatedAt timestamp', async () => {
      const oldDate = new Date('2020-01-01')
      const customAgent = createTestAgent({
        id: 'custom-soft-time',
        updatedAt: oldDate,
      })
      mockAgentsMap.set('custom-soft-time', customAgent)

      await agentStore.softDeleteAgent('custom-soft-time')

      const deletedAgent = mockAgentsMap.get('custom-soft-time')
      expect(deletedAgent?.updatedAt?.getTime()).toBeGreaterThan(oldDate.getTime())
    })
  })

  // ============================================
  // loadCustomAgents Tests
  // ============================================
  describe('loadCustomAgents', () => {
    it('should load custom agents from Yjs', async () => {
      mockAgentsMap.set('custom-1', createTestAgent({ id: 'custom-1', name: 'Agent 1' }))
      mockAgentsMap.set('custom-2', createTestAgent({ id: 'custom-2', name: 'Agent 2' }))

      const agents = await agentStore.loadCustomAgents()

      expect(agents).toHaveLength(2)
      expect(agents.some(a => a.id === 'custom-1')).toBe(true)
      expect(agents.some(a => a.id === 'custom-2')).toBe(true)
    })

    it('should filter out soft-deleted agents', async () => {
      mockAgentsMap.set('custom-active', createTestAgent({ id: 'custom-active', name: 'Active' }))
      mockAgentsMap.set('custom-deleted', createTestAgent({
        id: 'custom-deleted',
        name: 'Deleted',
        deletedAt: new Date(),
      }))

      const agents = await agentStore.loadCustomAgents()

      expect(agents).toHaveLength(1)
      expect(agents[0].id).toBe('custom-active')
    })

    it('should return empty array when no custom agents', async () => {
      // No agents in mock map
      const agents = await agentStore.loadCustomAgents()

      expect(agents).toEqual([])
    })
  })

  // ============================================
  // getAgentsByCategory Tests
  // ============================================
  describe('getAgentsByCategory', () => {
    beforeEach(() => {
      // Mock manifest
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['developer-agent', 'writer-agent', 'other-agent'],
        }),
      })

      // Mock agent JSONs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'developer-agent',
          name: 'Dev Agent',
          role: 'Developer',
          instructions: 'Code',
          tags: ['developer', 'coding'],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'writer-agent',
          name: 'Writer Agent',
          role: 'Writer',
          instructions: 'Write',
          tags: ['writer', 'content'],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'other-agent',
          name: 'Other Agent',
          role: 'Other',
          instructions: 'Other',
          tags: ['unknown'],
        }),
      })
    })

    it('should group agents by first tag', async () => {
      const { agentsByCategory } = await agentStore.getAgentsByCategory()

      expect(agentsByCategory['default']).toBeDefined()
      expect(agentsByCategory['developer']).toBeDefined()
      expect(agentsByCategory['writer']).toBeDefined()
    })

    it('should put devs in default category', async () => {
      const { agentsByCategory } = await agentStore.getAgentsByCategory()

      expect(agentsByCategory['default'].some((a) => a.id === 'devs')).toBe(
        true,
      )
    })

    it('should put unknown tags in other category', async () => {
      const { agentsByCategory } = await agentStore.getAgentsByCategory()

      expect(agentsByCategory['other']).toBeDefined()
      expect(
        agentsByCategory['other'].some((a) => a.id === 'other-agent'),
      ).toBe(true)
    })

    it('should order categories with default first and other last', async () => {
      const { orderedCategories } = await agentStore.getAgentsByCategory()

      expect(orderedCategories[0]).toBe('default')
      expect(orderedCategories[orderedCategories.length - 1]).toBe('other')
    })
  })

  // ============================================
  // getAgentsSeparated Tests
  // ============================================
  describe('getAgentsSeparated', () => {
    it('should return separated custom and built-in agents', async () => {
      // Mock manifest
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: ['builtin-1'],
        }),
      })

      // Mock built-in agent
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'builtin-1',
          name: 'Built-in Agent',
          role: 'Role',
          instructions: 'Instructions',
          tags: ['developer'],
        }),
      })

      // Add custom agent to Yjs mock
      mockAgentsMap.set('custom-sep', createTestAgent({ id: 'custom-sep' }))

      const { customAgents, builtInAgents } =
        await agentStore.getAgentsSeparated()

      expect(customAgents.some((a) => a.id === 'custom-sep')).toBe(true)
      expect(builtInAgents.some((a) => a.id === 'devs')).toBe(true)
      expect(builtInAgents.some((a) => a.id === 'builtin-1')).toBe(true)
    })

    it('should not include custom agents in built-in list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: [],
        }),
      })

      mockAgentsMap.set('custom-only', createTestAgent({ id: 'custom-only' }))

      const { builtInAgents } = await agentStore.getAgentsSeparated()

      expect(builtInAgents.some((a) => a.id === 'custom-only')).toBe(false)
    })

    it('should not include built-in agents in custom list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agents: [],
        }),
      })

      const { customAgents } = await agentStore.getAgentsSeparated()

      expect(customAgents.some((a) => a.id === 'devs')).toBe(false)
    })
  })

  // ============================================
  // Edge Cases and Error Handling
  // ============================================
  describe('Edge Cases', () => {
    it('should handle concurrent agent creation', async () => {
      const agentData1 = { name: 'Agent 1', role: 'Role 1' }
      const agentData2 = { name: 'Agent 2', role: 'Role 2' }

      const [agent1, agent2] = await Promise.all([
        agentStore.createAgent(agentData1),
        agentStore.createAgent(agentData2),
      ])

      expect(agent1.id).not.toBe(agent2.id)
      // Both should be in Yjs
      expect(mockAgentsMap.has(agent1.id)).toBe(true)
      expect(mockAgentsMap.has(agent2.id)).toBe(true)
    })

    it('should handle agent with special characters in name', async () => {
      const agentData = {
        name: 'Agent with "quotes" & <special> chars',
        role: 'Role',
      }

      const agent = await agentStore.createAgent(agentData)

      expect(agent.name).toBe('Agent with "quotes" & <special> chars')
    })

    it('should handle agent with empty tags array', async () => {
      const agentData = {
        name: 'No Tags Agent',
        role: 'Role',
        tags: [],
      }

      const agent = await agentStore.createAgent(agentData)

      expect(agent.tags).toEqual([])
    })

    it('should handle unicode characters in agent data', async () => {
      const agentData = {
        name: '日本語エージェント',
        role: '开发者角色',
        instructions: 'Instruções em português 🚀',
      }

      const agent = await agentStore.createAgent(agentData)

      expect(agent.name).toBe('日本語エージェント')
      expect(agent.role).toBe('开发者角色')
      expect(agent.instructions).toBe('Instruções em português 🚀')
    })
  })

  // ============================================
  // Slug Tests
  // ============================================
  describe('slug functionality', () => {
    it('should have slug on default devs agent', () => {
      const agent = agentStore.getDefaultAgent()

      expect(agent.slug).toBe('devs')
    })

    it('should auto-generate slug from agent name on create', async () => {
      const agent = await agentStore.createAgent({
        name: 'My Custom Agent',
        role: 'Test Role',
      })

      expect(agent.slug).toBe('my-custom-agent')
    })

    it('should generate unique slugs for duplicate names', async () => {
      // First agent with name "Test Agent"
      const agent1 = await agentStore.createAgent({
        name: 'Test Agent',
        role: 'Role 1',
      })

      // Second agent with same name should get unique slug
      const agent2 = await agentStore.createAgent({
        name: 'Test Agent',
        role: 'Role 2',
      })

      expect(agent1.slug).toBe('test-agent')
      expect(agent2.slug).toBe('test-agent-2')
    })

    it('should handle special characters in slug generation', async () => {
      const agent = await agentStore.createAgent({
        name: 'Café Résumé Agent!',
        role: 'Test',
      })

      expect(agent.slug).toBe('cafe-resume-agent')
    })

    it('should get agent by slug', () => {
      const customAgent = createTestAgent({
        id: 'custom-123',
        slug: 'my-agent-slug',
        name: 'My Agent',
      })

      mockAgentsMap.set('custom-123', customAgent)

      const agent = agentStore.getAgentBySlug('my-agent-slug')

      expect(agent).toBeDefined()
      expect(agent?.slug).toBe('my-agent-slug')
    })

    it('should return devs agent for "devs" slug', () => {
      const agent = agentStore.getAgentBySlug('devs')

      expect(agent).toBeDefined()
      expect(agent?.id).toBe('devs')
      expect(agent?.slug).toBe('devs')
    })

    it('should fall back to ID lookup if slug not found', () => {
      const customAgent = createTestAgent({
        id: 'custom-123',
        slug: 'agent-slug',
        name: 'Test Agent',
      })

      mockAgentsMap.set('custom-123', customAgent)

      // Lookup by ID should still work
      const agent = agentStore.getAgentBySlug('custom-123')

      expect(agent).toBeDefined()
      expect(agent?.id).toBe('custom-123')
    })

    it('should update slug when name changes', async () => {
      const customAgent = createTestAgent({
        id: 'custom-123',
        slug: 'old-name',
        name: 'Old Name',
      })

      mockAgentsMap.set('custom-123', customAgent)

      const updatedAgent = await agentStore.updateAgent('custom-123', {
        name: 'New Name',
      })

      expect(updatedAgent.slug).toBe('new-name')
    })

    it('should preserve slug when updating non-name fields', async () => {
      const customAgent = createTestAgent({
        id: 'custom-123',
        slug: 'original-slug',
        name: 'Original Name',
      })

      mockAgentsMap.set('custom-123', customAgent)

      const updatedAgent = await agentStore.updateAgent('custom-123', {
        role: 'New Role',
      })

      expect(updatedAgent.slug).toBe('original-slug')
      expect(updatedAgent.name).toBe('Original Name')
    })
  })
})
