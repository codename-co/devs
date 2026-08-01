/**
 * Tests for Agent Companies export pipeline.
 *
 * Follows TDD — tests written first, then implementation.
 */
import { describe, it, expect, vi } from 'vitest'

// Mock config
vi.mock('@/lib/teams/config', () => ({
  teamsConfig: {
    org: { id: 'acme', name: 'Acme Corporation' },
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

import {
  generateCompanyMd,
  generateTeamMd,
  generateAgentsMd,
  generateSkillMd,
  generateTasksMd,
  buildExportFiles,
} from '@/lib/teams/agent-companies/export'

import type { Agent, Task, InstalledSkill, Space } from '@/types'

// ============================================================================
// COMPANY.md generation
// ============================================================================

describe('generateCompanyMd', () => {
  it('generates COMPANY.md with org info', () => {
    const result = generateCompanyMd({
      name: 'Acme Corporation',
      description: 'An AI-powered company',
    })

    expect(result).toContain('---')
    expect(result).toContain('name: Acme Corporation')
    expect(result).toContain('description: An AI-powered company')
    expect(result).toContain('# Acme Corporation')
  })

  it('includes optional fields when present', () => {
    const result = generateCompanyMd({
      name: 'TestCo',
      domain: 'test.com',
      version: '2.0',
    })

    expect(result).toContain('domain: test.com')
    expect(result).toContain('version: "2.0"')
  })
})

// ============================================================================
// TEAM.md generation
// ============================================================================

describe('generateTeamMd', () => {
  it('generates TEAM.md from a space', () => {
    const space: Space = {
      id: 'space-1',
      name: 'Engineering',
      icon: 'Code' as any,
      ownership: 'enterprise',
      orgId: 'acme',
      createdAt: new Date('2024-01-15'),
    }

    const result = generateTeamMd(space)

    expect(result).toContain('---')
    expect(result).toContain('name: Engineering')
    expect(result).toContain('icon: Code')
    expect(result).toContain('# Engineering')
  })
})

// ============================================================================
// AGENTS.md generation
// ============================================================================

describe('generateAgentsMd', () => {
  it('generates AGENTS.md from multiple agents', () => {
    const agents: Partial<Agent>[] = [
      {
        id: 'a1',
        name: 'Backend Dev',
        slug: 'backend-dev',
        role: 'Senior backend developer',
        instructions: 'Build scalable APIs and services.',
        tags: ['backend', 'api'],
        temperature: 0.7,
        icon: 'Code' as any,
        color: 'blue' as any,
        createdAt: new Date(),
      },
      {
        id: 'a2',
        name: 'Frontend Dev',
        slug: 'frontend-dev',
        role: 'Senior frontend developer',
        instructions: 'Build beautiful and accessible UIs.',
        tags: ['frontend', 'react'],
        createdAt: new Date(),
      },
    ]

    const result = generateAgentsMd(agents as Agent[])

    expect(result).toContain('## Backend Dev')
    expect(result).toContain('**Role:** Senior backend developer')
    expect(result).toContain('**Tags:** backend, api')
    expect(result).toContain('**Temperature:** 0.7')
    expect(result).toContain('**Icon:** Code')
    expect(result).toContain('**Color:** blue')
    expect(result).toContain('Build scalable APIs and services.')

    expect(result).toContain('## Frontend Dev')
    expect(result).toContain('**Role:** Senior frontend developer')
    expect(result).toContain('Build beautiful and accessible UIs.')
  })

  it('generates empty AGENTS.md for no agents', () => {
    const result = generateAgentsMd([])
    expect(result).toContain('---')
    expect(result).not.toContain('##')
  })

  it('omits optional metadata lines when not set', () => {
    const agents: Partial<Agent>[] = [
      {
        id: 'a1',
        name: 'Simple Agent',
        slug: 'simple-agent',
        role: 'Worker',
        instructions: 'Do work.',
        createdAt: new Date(),
      },
    ]

    const result = generateAgentsMd(agents as Agent[])

    expect(result).toContain('## Simple Agent')
    expect(result).toContain('**Role:** Worker')
    expect(result).not.toContain('**Tags:**')
    expect(result).not.toContain('**Temperature:**')
    expect(result).not.toContain('**Icon:**')
    expect(result).not.toContain('**Color:**')
  })
})

// ============================================================================
// SKILL.md generation
// ============================================================================

describe('generateSkillMd', () => {
  it('generates SKILL.md from installed skill', () => {
    const skill: Partial<InstalledSkill> = {
      id: 's1',
      name: 'Code Review',
      description: 'Automated code review',
      author: 'devs-team',
      license: 'MIT',
      skillMdContent: 'Review code for quality and security.',
      autoActivate: true,
      installedAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
      assignedAgentIds: [],
      stars: 0,
      githubUrl: '',
      scripts: [],
      references: [],
      assets: [],
    }

    const result = generateSkillMd(skill as InstalledSkill)

    expect(result).toContain('---')
    expect(result).toContain('name: Code Review')
    expect(result).toContain('description: Automated code review')
    expect(result).toContain('author: devs-team')
    expect(result).toContain('license: MIT')
    expect(result).toContain('autoActivate: true')
    expect(result).toContain('Review code for quality and security.')
  })
})

// ============================================================================
// TASK.md generation
// ============================================================================

describe('generateTasksMd', () => {
  it('generates TASK.md from tasks', () => {
    const tasks: Partial<Task>[] = [
      {
        id: 't1',
        title: 'Set up CI/CD',
        description: 'Configure automated testing.',
        status: 'pending',
        workflowId: 'w1',
        dependencies: [],
        requirements: [],
        artifacts: [],
        steps: [],
        estimatedPasses: 1,
        actualPasses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        complexity: 'simple',
      },
      {
        id: 't2',
        title: 'Write docs',
        description: 'Document all API endpoints.',
        status: 'pending',
        workflowId: 'w1',
        dependencies: ['t1'],
        requirements: [],
        artifacts: [],
        steps: [],
        estimatedPasses: 1,
        actualPasses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        complexity: 'simple',
      },
    ]

    const result = generateTasksMd(tasks as Task[], tasks as Task[])

    expect(result).toContain('## Set up CI/CD')
    expect(result).toContain('Configure automated testing.')
    expect(result).toContain('## Write docs')
    expect(result).toContain('Document all API endpoints.')
    // The dependency should reference the task title, not the ID
    expect(result).toContain('**Dependencies:** Set up CI/CD')
  })

  it('generates empty TASK.md for no tasks', () => {
    const result = generateTasksMd([], [])
    expect(result).toContain('---')
    expect(result).not.toContain('##')
  })
})

// ============================================================================
// Full export file builder
// ============================================================================

describe('buildExportFiles', () => {
  it('builds a complete file set from DEVS entities', () => {
    const spaces: Space[] = [
      {
        id: 'space-eng',
        name: 'Engineering',
        ownership: 'enterprise',
        orgId: 'acme',
        createdAt: new Date(),
      },
    ]

    const agents: Agent[] = [
      {
        id: 'a1',
        name: 'Backend Dev',
        slug: 'backend-dev',
        role: 'Senior backend developer',
        instructions: 'Build APIs.',
        createdAt: new Date(),
      } as Agent,
    ]

    const skills: InstalledSkill[] = []
    const tasks: Task[] = []

    const result = buildExportFiles({
      orgName: 'Acme Corporation',
      spaces,
      agentsBySpace: { 'space-eng': agents },
      skillsBySpace: { 'space-eng': skills },
      tasksBySpace: { 'space-eng': tasks },
    })

    expect(result.company.name).toBe('Acme Corporation')
    expect(result.files.length).toBeGreaterThanOrEqual(2) // COMPANY.md + at least 1 TEAM.md

    const paths = result.files.map((f) => f.path)
    expect(paths).toContain('COMPANY.md')
    expect(paths.some((p) => p.includes('TEAM.md'))).toBe(true)
    expect(paths.some((p) => p.includes('AGENTS.md'))).toBe(true)
  })

  it('omits AGENTS.md when space has no agents', () => {
    const spaces: Space[] = [
      {
        id: 'space-empty',
        name: 'Empty Space',
        ownership: 'enterprise',
        orgId: 'acme',
        createdAt: new Date(),
      },
    ]

    const result = buildExportFiles({
      orgName: 'TestCo',
      spaces,
      agentsBySpace: { 'space-empty': [] },
      skillsBySpace: { 'space-empty': [] },
      tasksBySpace: { 'space-empty': [] },
    })

    const paths = result.files.map((f) => f.path)
    expect(paths).toContain('COMPANY.md')
    expect(paths.some((p) => p.includes('TEAM.md'))).toBe(true)
    // AGENTS.md should be omitted when there are no agents
    expect(paths.some((p) => p.includes('AGENTS.md'))).toBe(false)
  })

  it('organizes files by team directory', () => {
    const spaces: Space[] = [
      {
        id: 's1',
        name: 'Engineering',
        ownership: 'enterprise',
        orgId: 'acme',
        createdAt: new Date(),
      },
      {
        id: 's2',
        name: 'Marketing',
        ownership: 'enterprise',
        orgId: 'acme',
        createdAt: new Date(),
      },
    ]

    const agents: Agent[] = [
      {
        id: 'a1',
        name: 'Dev',
        slug: 'dev',
        role: 'Developer',
        instructions: 'Code.',
        createdAt: new Date(),
      } as Agent,
    ]

    const result = buildExportFiles({
      orgName: 'TestCo',
      spaces,
      agentsBySpace: {
        s1: agents,
        s2: [],
      },
      skillsBySpace: { s1: [], s2: [] },
      tasksBySpace: { s1: [], s2: [] },
    })

    const paths = result.files.map((f) => f.path)
    expect(paths.some((p) => p.startsWith('teams/engineering/'))).toBe(true)
    expect(paths.some((p) => p.startsWith('teams/marketing/'))).toBe(true)
  })
})
