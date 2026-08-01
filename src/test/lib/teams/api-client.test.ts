/**
 * Tests for the Teams API client — server-gated write functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies
vi.mock('@/lib/teams/config', () => ({
  getApiUrl: (path: string) => `https://devs.internal.acme.com:4444/api${path}`,
  teamsConfig: {
    org: { id: 'acme', name: 'Acme Corp' },
    auth: { issuer: 'https://acme.okta.com', clientId: 'test' },
    server: { url: 'https://devs.internal.acme.com:4444' },
    llm: {
      proxyUrl: 'https://litellm.internal.acme.com',
      allowedProviders: ['openai'],
      defaultProvider: 'openai',
      defaultModel: 'gpt-4o',
    },
  },
  isTeams: true,
}))

vi.mock('@/features/auth/auth-service', () => ({
  authService: {
    getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  listSpaces,
  createSpace,
  createTeamAgent,
  updateTeamAgent,
  deleteTeamAgent,
  copyAgentToTeam,
  queryAuditEvents,
  getActiveSeatCount,
} from '@/lib/teams/api-client'

describe('Teams API client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('listSpaces', () => {
    it('fetches spaces with auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ spaces: [{ id: 's1', name: 'Engineering' }] }),
      })

      const result = await listSpaces()

      expect(result.spaces).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://devs.internal.acme.com:4444/api/spaces',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        }),
      )
    })
  })

  describe('createSpace', () => {
    it('sends POST with name and orgId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            space: { id: 's1', name: 'Marketing', org_id: 'acme' },
          }),
      })

      const result = await createSpace('Marketing', 'acme')

      expect(result.space.name).toBe('Marketing')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://devs.internal.acme.com:4444/api/spaces',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Marketing', orgId: 'acme' }),
        }),
      )
    })
  })

  describe('createTeamAgent', () => {
    it('sends POST to space-scoped agents endpoint', async () => {
      const agentData = {
        name: 'Research Bot',
        role: 'researcher',
        instructions: 'Search and summarize papers',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            agent: { id: 'a1', ...agentData },
          }),
      })

      const result = await createTeamAgent('space-1', agentData)

      expect(result.agent.name).toBe('Research Bot')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://devs.internal.acme.com:4444/api/spaces/space-1/agents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(agentData),
        }),
      )
    })
  })

  describe('updateTeamAgent', () => {
    it('sends PUT with partial updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            agent: { id: 'a1', name: 'Updated Bot' },
          }),
      })

      const result = await updateTeamAgent('space-1', 'a1', {
        name: 'Updated Bot',
      })

      expect(result.agent.name).toBe('Updated Bot')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://devs.internal.acme.com:4444/api/spaces/space-1/agents/a1',
        expect.objectContaining({ method: 'PUT' }),
      )
    })
  })

  describe('deleteTeamAgent', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

      const result = await deleteTeamAgent('space-1', 'a1')

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://devs.internal.acme.com:4444/api/spaces/space-1/agents/a1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })

  describe('copyAgentToTeam', () => {
    it('sends POST to copy endpoint', async () => {
      const agentData = {
        name: 'Copied Bot',
        role: 'assistant',
        instructions: 'Help users',
        sourceAgentId: 'personal-agent-1',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agent: { id: 'a2', ...agentData } }),
      })

      const result = await copyAgentToTeam('space-1', agentData)

      expect(result.agent.name).toBe('Copied Bot')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://devs.internal.acme.com:4444/api/spaces/space-1/agents/copy',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  describe('queryAuditEvents', () => {
    it('passes query params correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ events: [], total: 0, limit: 100, offset: 0 }),
      })

      await queryAuditEvents({ spaceId: 's1', entityType: 'agent', limit: 50 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('spaceId=s1')
      expect(calledUrl).toContain('entityType=agent')
      expect(calledUrl).toContain('limit=50')
    })
  })

  describe('getActiveSeatCount', () => {
    it('returns seat count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ activeSeats: 42, since: '2024-01-01' }),
      })

      const result = await getActiveSeatCount()

      expect(result.activeSeats).toBe(42)
    })
  })

  describe('error handling', () => {
    it('throws on non-ok response with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ error: 'Admin access required' })),
      })

      await expect(listSpaces()).rejects.toThrow('API error 403: Admin access required')
    })

    it('throws on non-ok response with plain text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(listSpaces()).rejects.toThrow('API error 500: Internal Server Error')
    })
  })
})
