/**
 * Tests for Agent Companies round-trip: export → parse → verify.
 *
 * Ensures that exporting DEVS entities and re-parsing them
 * produces equivalent data (snapshot fidelity).
 */
import { describe, it, expect, vi } from 'vitest'

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
  generateAgentsMd,
  generateTeamMd,
  generateTasksMd,
  generateSkillMd,
} from '@/lib/teams/agent-companies/export'

import {
  parseCompanyManifest,
  parseAgentsManifest,
  parseTeamManifest,
  parseTasksManifest,
  parseSkillManifest,
} from '@/lib/teams/agent-companies/parser'

import type { Agent, Space, Task, InstalledSkill } from '@/types'

describe('Agent Companies round-trip', () => {
  it('COMPANY.md round-trips correctly', () => {
    const company = { name: 'Acme Corp', description: 'AI company', domain: 'acme.com' }
    const md = generateCompanyMd(company)
    const parsed = parseCompanyManifest(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('Acme Corp')
    expect(parsed!.description).toBe('AI company')
    expect(parsed!.domain).toBe('acme.com')
  })

  it('TEAM.md round-trips correctly', () => {
    const space: Space = {
      id: 's1',
      name: 'Engineering',
      icon: 'Code' as any,
      ownership: 'enterprise',
      orgId: 'acme',
      createdAt: new Date(),
    }
    const md = generateTeamMd(space)
    const parsed = parseTeamManifest(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.frontmatter.name).toBe('Engineering')
    expect(parsed!.frontmatter.icon).toBe('Code')
  })

  it('AGENTS.md round-trips correctly', () => {
    const agents: Agent[] = [
      {
        id: 'a1',
        name: 'Backend Dev',
        slug: 'backend-dev',
        role: 'Senior backend developer',
        instructions: 'Build robust APIs.',
        tags: ['backend', 'api'],
        temperature: 0.7,
        icon: 'Code' as any,
        color: 'blue' as any,
        createdAt: new Date(),
      } as Agent,
      {
        id: 'a2',
        name: 'Frontend Dev',
        slug: 'frontend-dev',
        role: 'Frontend engineer',
        instructions: 'Build accessible UIs.',
        createdAt: new Date(),
      } as Agent,
    ]

    const md = generateAgentsMd(agents)
    const parsed = parseAgentsManifest(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.agents).toHaveLength(2)

    expect(parsed!.agents[0].name).toBe('Backend Dev')
    expect(parsed!.agents[0].role).toBe('Senior backend developer')
    expect(parsed!.agents[0].tags).toEqual(['backend', 'api'])
    expect(parsed!.agents[0].temperature).toBe(0.7)
    expect(parsed!.agents[0].icon).toBe('Code')
    expect(parsed!.agents[0].color).toBe('blue')
    expect(parsed!.agents[0].instructions).toContain('Build robust APIs.')

    expect(parsed!.agents[1].name).toBe('Frontend Dev')
    expect(parsed!.agents[1].role).toBe('Frontend engineer')
    expect(parsed!.agents[1].instructions).toContain('Build accessible UIs.')
  })

  it('TASK.md round-trips correctly', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Set up CI',
        description: 'Configure GitHub Actions.',
        workflowId: 'w1',
        dependencies: [],
        requirements: [],
        artifacts: [],
        steps: [],
        estimatedPasses: 1,
        actualPasses: 0,
        status: 'pending',
        complexity: 'simple',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task,
      {
        id: 't2',
        title: 'Write docs',
        description: 'Document endpoints.',
        workflowId: 'w1',
        dependencies: ['t1'],
        requirements: [],
        artifacts: [],
        steps: [],
        estimatedPasses: 1,
        actualPasses: 0,
        status: 'pending',
        complexity: 'simple',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task,
    ]

    const md = generateTasksMd(tasks, tasks)
    const parsed = parseTasksManifest(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.tasks).toHaveLength(2)

    expect(parsed!.tasks[0].title).toBe('Set up CI')
    expect(parsed!.tasks[0].description).toContain('Configure GitHub Actions.')

    expect(parsed!.tasks[1].title).toBe('Write docs')
    expect(parsed!.tasks[1].description).toContain('Document endpoints.')
    // Dependencies reference title, not ID
    expect(parsed!.tasks[1].dependencies).toEqual(['Set up CI'])
  })

  it('SKILL.md round-trips correctly', () => {
    const skill: InstalledSkill = {
      id: 's1',
      name: 'Code Review',
      description: 'Automated code review',
      author: 'devs-team',
      license: 'MIT',
      skillMdContent: 'Review code for bugs and style issues.',
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

    const md = generateSkillMd(skill)
    const parsed = parseSkillManifest(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.frontmatter.name).toBe('Code Review')
    expect(parsed!.frontmatter.description).toBe('Automated code review')
    expect(parsed!.frontmatter.author).toBe('devs-team')
    expect(parsed!.frontmatter.license).toBe('MIT')
    expect(parsed!.frontmatter.autoActivate).toBe(true)
    expect(parsed!.body).toContain('Review code for bugs and style issues.')
  })
})
