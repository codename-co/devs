/**
 * Tests for Agent Companies import pipeline.
 *
 * Follows TDD — tests written first, then implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock API client
vi.mock('@/lib/teams/api-client', () => ({
  createSpace: vi.fn(),
  createTeamAgent: vi.fn(),
}))

// Mock auth
vi.mock('@/features/auth/auth-service', () => ({
  authService: {
    getAccessToken: vi.fn().mockResolvedValue('mock-token'),
  },
}))

// Mock config
vi.mock('@/lib/teams/config', () => ({
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
  getApiUrl: (path: string) =>
    `https://devs.internal.acme.com:4444/api${path}`,
}))

import { importPackage } from '@/lib/teams/agent-companies/import'
import type { AgentCompaniesPackage } from '@/lib/teams/agent-companies/types'
import * as apiClient from '@/lib/teams/api-client'

describe('importPackage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates spaces from team manifests', async () => {
    const mockCreateSpace = vi.mocked(apiClient.createSpace)
    mockCreateSpace.mockResolvedValue({
      space: { id: 'space-1', name: 'Engineering', org_id: 'acme', created_at: new Date().toISOString() },
    })

    const pkg: AgentCompaniesPackage = {
      company: { name: 'TestCo' },
      teams: [
        {
          frontmatter: { name: 'Engineering', description: 'Eng team' },
          body: 'Engineering team.',
        },
      ],
      agents: [],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    expect(mockCreateSpace).toHaveBeenCalledWith('Engineering', 'acme')
    expect(result.success).toBe(true)
    expect(result.created.spaces).toBe(1)
  })

  it('creates agents from agent manifest entries', async () => {
    const mockCreateSpace = vi.mocked(apiClient.createSpace)
    mockCreateSpace.mockResolvedValue({
      space: { id: 'space-1', name: 'Engineering', org_id: 'acme', created_at: new Date().toISOString() },
    })

    const mockCreateAgent = vi.mocked(apiClient.createTeamAgent)
    mockCreateAgent.mockResolvedValue({
      agent: { id: 'agent-1', name: 'Backend Dev' },
    })

    const pkg: AgentCompaniesPackage = {
      teams: [
        { frontmatter: { name: 'Engineering' }, body: '' },
      ],
      agents: [
        {
          name: 'Backend Dev',
          role: 'Senior backend developer',
          instructions: 'Build APIs.',
          tags: ['backend'],
          temperature: 0.7,
        },
      ],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    expect(mockCreateAgent).toHaveBeenCalledWith('space-1', expect.objectContaining({
      name: 'Backend Dev',
      role: 'Senior backend developer',
      instructions: 'Build APIs.',
      tags: ['backend'],
      temperature: 0.7,
    }))
    expect(result.success).toBe(true)
    expect(result.created.agents).toBe(1)
  })

  it('assigns agents to the first space when multiple teams exist', async () => {
    const mockCreateSpace = vi.mocked(apiClient.createSpace)
    mockCreateSpace
      .mockResolvedValueOnce({
        space: { id: 'space-1', name: 'Engineering', org_id: 'acme', created_at: new Date().toISOString() },
      })
      .mockResolvedValueOnce({
        space: { id: 'space-2', name: 'Marketing', org_id: 'acme', created_at: new Date().toISOString() },
      })

    const mockCreateAgent = vi.mocked(apiClient.createTeamAgent)
    mockCreateAgent.mockResolvedValue({
      agent: { id: 'agent-1', name: 'Worker' },
    })

    const pkg: AgentCompaniesPackage = {
      teams: [
        { frontmatter: { name: 'Engineering' }, body: '' },
        { frontmatter: { name: 'Marketing' }, body: '' },
      ],
      agents: [
        { name: 'Worker', role: 'Worker', instructions: 'Work.' },
      ],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    // Agent goes to the first space created
    expect(mockCreateAgent).toHaveBeenCalledWith('space-1', expect.anything())
    expect(result.created.spaces).toBe(2)
    expect(result.created.agents).toBe(1)
  })

  it('creates a default space when no teams are specified', async () => {
    const mockCreateSpace = vi.mocked(apiClient.createSpace)
    mockCreateSpace.mockResolvedValue({
      space: { id: 'space-default', name: 'TestCo', org_id: 'acme', created_at: new Date().toISOString() },
    })

    const mockCreateAgent = vi.mocked(apiClient.createTeamAgent)
    mockCreateAgent.mockResolvedValue({
      agent: { id: 'agent-1', name: 'Bot' },
    })

    const pkg: AgentCompaniesPackage = {
      company: { name: 'TestCo' },
      teams: [],
      agents: [
        { name: 'Bot', role: 'Assistant', instructions: 'Help.' },
      ],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    // Should create a default space named after the company
    expect(mockCreateSpace).toHaveBeenCalledWith('TestCo', 'acme')
    expect(result.created.spaces).toBe(1)
    expect(result.created.agents).toBe(1)
  })

  it('collects warnings for failed agent creation', async () => {
    const mockCreateSpace = vi.mocked(apiClient.createSpace)
    mockCreateSpace.mockResolvedValue({
      space: { id: 'space-1', name: 'Eng', org_id: 'acme', created_at: new Date().toISOString() },
    })

    const mockCreateAgent = vi.mocked(apiClient.createTeamAgent)
    mockCreateAgent.mockRejectedValue(new Error('API error 409: Agent already exists'))

    const pkg: AgentCompaniesPackage = {
      teams: [{ frontmatter: { name: 'Eng' }, body: '' }],
      agents: [
        { name: 'Dup Agent', role: 'Worker', instructions: 'Work.' },
      ],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    // Import succeeds overall but with warnings
    expect(result.success).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Dup Agent')
    expect(result.created.agents).toBe(0)
  })

  it('reports error when space creation fails', async () => {
    const mockCreateSpace = vi.mocked(apiClient.createSpace)
    mockCreateSpace.mockRejectedValue(new Error('API error 403: Forbidden'))

    const pkg: AgentCompaniesPackage = {
      teams: [{ frontmatter: { name: 'Eng' }, body: '' }],
      agents: [],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Eng')
  })

  it('imports empty package successfully', async () => {
    const pkg: AgentCompaniesPackage = {
      teams: [],
      agents: [],
      skills: [],
      projects: [],
      tasks: [],
    }

    const result = await importPackage(pkg, 'acme')

    expect(result.success).toBe(true)
    expect(result.created.spaces).toBe(0)
    expect(result.created.agents).toBe(0)
  })
})
