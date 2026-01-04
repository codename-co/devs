import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Agent } from '@/types'
import {
  createMockDb,
  createMockToast,
  createTestAgent,
  resetMockDb,
} from './mocks'

// Create mocks
const mockDb = createMockDb()
const mockToast = createMockToast()
const mockFetch = vi.fn()

// Setup global mocks
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/toast', () => mockToast)

// Mock global fetch
global.fetch = mockFetch

// We need to dynamically import the module to reset its state between tests
let agentStore: typeof import('@/stores/agentStore')

describe('agentStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetMockDb(mockDb)
    mockFetch.mockReset()

    // Reset module cache to clear internal state (agentCache, agentsList)
    vi.resetModules()

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
    it('should return devs agent for id "devs"', async () => {
      const agent = await agentStore.getAgentById('devs')

      expect(agent).toBeDefined()
      expect(agent?.id).toBe('devs')
    })

    it('should return cached agent if available', async () => {
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

      const agent1 = await agentStore.getAgentById('test-agent')
      const agent2 = await agentStore.getAgentById('test-agent')

      // Fetch should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(agent1).toBe(agent2)
    })

    it('should load from IndexedDB for custom agents', async () => {
      const customAgent = createTestAgent({
        id: 'custom-123',
        name: 'Custom Agent',
      })

      mockDb.get.mockResolvedValueOnce(customAgent)

      const agent = await agentStore.getAgentById('custom-123')

      expect(mockDb.get).toHaveBeenCalledWith('agents', 'custom-123')
      expect(agent).toBeDefined()
      expect(agent?.id).toBe('custom-123')
    })

    it('should return null for non-existent agent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      mockDb.get.mockResolvedValueOnce(null)

      const agent = await agentStore.getAgentById('non-existent')

      expect(agent).toBeNull()
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValue(false)
      const customAgent = createTestAgent({ id: 'custom-456' })
      mockDb.get.mockResolvedValueOnce(customAgent)

      await agentStore.getAgentById('custom-456')

      expect(mockDb.init).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
      mockDb.get.mockRejectedValueOnce(new Error('DB Error'))

      const agent = await agentStore.getAgentById('custom-error')

      expect(agent).toBeNull()
    })

    it('should handle empty id', async () => {
      const agent = await agentStore.getAgentById('')

      expect(agent).toBeNull()
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

      // Mock custom agents
      const customAgent = createTestAgent({ id: 'custom-1', name: 'Custom 1' })
      mockDb.getAll.mockResolvedValueOnce([customAgent])

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

      mockDb.getAll.mockResolvedValueOnce([])

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

    it('should save agent to IndexedDB', async () => {
      const agentData = {
        name: 'DB Agent',
        role: 'Saved Role',
      }

      await agentStore.createAgent(agentData)

      expect(mockDb.add).toHaveBeenCalledWith(
        'agents',
        expect.objectContaining({
          name: 'DB Agent',
          role: 'Saved Role',
        }),
      )
    })

    it('should show success toast on creation', async () => {
      const agentData = {
        name: 'Toast Agent',
        role: 'Role',
      }

      await agentStore.createAgent(agentData)

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValue(false)

      await agentStore.createAgent({
        name: 'Init Agent',
        role: 'Role',
      })

      expect(mockDb.init).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockDb.add.mockRejectedValueOnce(new Error('DB Write Error'))

      await expect(
        agentStore.createAgent({
          name: 'Error Agent',
          role: 'Role',
        }),
      ).rejects.toThrow()

      expect(mockToast.errorToast).toHaveBeenCalled()
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
      mockDb.get.mockResolvedValueOnce(existingAgent)

      const updated = await agentStore.updateAgent('custom-update', {
        name: 'Updated Name',
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.id).toBe('custom-update')
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should preserve agent ID during update', async () => {
      const existingAgent = createTestAgent({ id: 'custom-preserve' })
      mockDb.get.mockResolvedValueOnce(existingAgent)

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
      mockDb.get.mockResolvedValueOnce(existingAgent)

      const updated = await agentStore.updateAgent('custom-timestamp', {
        name: 'Time Test',
      })

      expect(updated.updatedAt).not.toEqual(oldDate)
      expect(updated.updatedAt?.getTime()).toBeGreaterThan(oldDate.getTime())
    })

    it('should throw error for non-existent agent', async () => {
      mockDb.get.mockResolvedValueOnce(null)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      await expect(
        agentStore.updateAgent('non-existent', { name: 'Test' }),
      ).rejects.toThrow('Agent with id non-existent not found')
    })

    it('should show success toast on update', async () => {
      const existingAgent = createTestAgent({ id: 'custom-toast-update' })
      mockDb.get.mockResolvedValueOnce(existingAgent)

      await agentStore.updateAgent('custom-toast-update', { name: 'New' })

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const existingAgent = createTestAgent({ id: 'custom-db-error' })
      mockDb.get.mockResolvedValueOnce(existingAgent)
      mockDb.update.mockRejectedValueOnce(new Error('Update failed'))

      await expect(
        agentStore.updateAgent('custom-db-error', { name: 'Test' }),
      ).rejects.toThrow()

      expect(mockToast.errorToast).toHaveBeenCalled()
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

    it('should delete custom agent from IndexedDB', async () => {
      await agentStore.deleteAgent('custom-delete')

      expect(mockDb.delete).toHaveBeenCalledWith('agents', 'custom-delete')
    })

    it('should show success toast on deletion', async () => {
      await agentStore.deleteAgent('custom-toast-delete')

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should show error toast on failure', async () => {
      mockDb.delete.mockRejectedValueOnce(new Error('Delete failed'))

      await expect(
        agentStore.deleteAgent('custom-error-delete'),
      ).rejects.toThrow()

      expect(mockToast.errorToast).toHaveBeenCalled()
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValue(false)

      await agentStore.deleteAgent('custom-init-delete')

      expect(mockDb.init).toHaveBeenCalled()
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
      mockDb.get.mockResolvedValueOnce(customAgent)

      await agentStore.softDeleteAgent('custom-soft-delete')

      expect(mockDb.update).toHaveBeenCalledWith(
        'agents',
        expect.objectContaining({
          id: 'custom-soft-delete',
          deletedAt: expect.any(Date),
        }),
      )
    })

    it('should throw error for non-existent agent', async () => {
      mockDb.get.mockResolvedValueOnce(null)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      await expect(
        agentStore.softDeleteAgent('custom-non-existent'),
      ).rejects.toThrow('Agent with id custom-non-existent not found')
    })

    it('should show success toast on soft deletion', async () => {
      const customAgent = createTestAgent({ id: 'custom-soft-toast' })
      mockDb.get.mockResolvedValueOnce(customAgent)

      await agentStore.softDeleteAgent('custom-soft-toast')

      expect(mockToast.successToast).toHaveBeenCalled()
    })

    it('should update updatedAt timestamp', async () => {
      const oldDate = new Date('2020-01-01')
      const customAgent = createTestAgent({
        id: 'custom-soft-time',
        updatedAt: oldDate,
      })
      mockDb.get.mockResolvedValueOnce(customAgent)

      await agentStore.softDeleteAgent('custom-soft-time')

      expect(mockDb.update).toHaveBeenCalledWith(
        'agents',
        expect.objectContaining({
          updatedAt: expect.any(Date),
        }),
      )

      const updateCall = mockDb.update.mock.calls[0][1] as Agent
      expect(updateCall.updatedAt?.getTime()).toBeGreaterThan(oldDate.getTime())
    })
  })

  // ============================================
  // loadCustomAgents Tests
  // ============================================
  describe('loadCustomAgents', () => {
    it('should load custom agents from IndexedDB', async () => {
      const customAgents = [
        createTestAgent({ id: 'custom-1', name: 'Agent 1' }),
        createTestAgent({ id: 'custom-2', name: 'Agent 2' }),
      ]
      mockDb.getAll.mockResolvedValueOnce(customAgents)

      const agents = await agentStore.loadCustomAgents()

      expect(agents).toHaveLength(2)
      expect(agents[0].id).toBe('custom-1')
      expect(agents[1].id).toBe('custom-2')
    })

    it('should filter out soft-deleted agents', async () => {
      const customAgents = [
        createTestAgent({ id: 'custom-active', name: 'Active' }),
        createTestAgent({
          id: 'custom-deleted',
          name: 'Deleted',
          deletedAt: new Date(),
        }),
      ]
      mockDb.getAll.mockResolvedValueOnce(customAgents)

      const agents = await agentStore.loadCustomAgents()

      expect(agents).toHaveLength(1)
      expect(agents[0].id).toBe('custom-active')
    })

    it('should return empty array on database error', async () => {
      mockDb.getAll.mockRejectedValueOnce(new Error('DB Error'))

      const agents = await agentStore.loadCustomAgents()

      expect(agents).toEqual([])
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValue(false)
      mockDb.getAll.mockResolvedValueOnce([])

      await agentStore.loadCustomAgents()

      expect(mockDb.init).toHaveBeenCalled()
    })

    it('should cache loaded agents', async () => {
      const customAgent = createTestAgent({ id: 'custom-cache' })
      mockDb.getAll.mockResolvedValueOnce([customAgent])

      await agentStore.loadCustomAgents()

      // Now getting the agent should use cache
      mockDb.get.mockResolvedValueOnce(customAgent) // Fallback
      const agent = await agentStore.getAgentById('custom-cache')

      expect(agent?.id).toBe('custom-cache')
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

      mockDb.getAll.mockResolvedValueOnce([])
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

      // Mock custom agents
      const customAgent = createTestAgent({ id: 'custom-sep' })
      mockDb.getAll.mockResolvedValueOnce([customAgent])

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

      const customAgent = createTestAgent({ id: 'custom-only' })
      mockDb.getAll.mockResolvedValueOnce([customAgent])

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

      mockDb.getAll.mockResolvedValueOnce([])

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
      expect(mockDb.add).toHaveBeenCalledTimes(2)
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
})
