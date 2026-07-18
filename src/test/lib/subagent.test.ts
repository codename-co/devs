import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Agent } from '@/types'

// ── Mocks ────────────────────────────────────────────────────────────────────
// Mock the agent store resolvers so we control which specialists "exist".
const specialist: Agent = {
  id: 'writer-1',
  slug: 'copywriter',
  name: 'Copywriter',
  role: 'Senior copywriter',
  instructions: 'Write great copy.',
  createdAt: new Date(),
} as Agent

const devsAgent: Agent = {
  id: 'devs',
  slug: 'devs',
  name: 'DEVS',
  role: 'Meta agent',
  instructions: '',
  createdAt: new Date(),
} as Agent

vi.mock('@/stores/agentStore', () => ({
  getAgentBySlug: (slug: string) =>
    slug === 'copywriter'
      ? specialist
      : slug === 'devs'
        ? devsAgent
        : undefined,
  getAgentById: (id: string) =>
    id === 'writer-1' ? specialist : id === 'devs' ? devsAgent : undefined,
  getAgentBySlugAsync: async () => null,
  getAllAgents: () => [devsAgent, specialist],
}))

// Capture what runAgent is called with, and return a canned result.
const runAgentMock = vi.fn(async (cfg: any) => ({
  success: true,
  response: `done by ${cfg.agent.name}`,
  turnsUsed: 3,
  toolCallsLog: [],
}))

vi.mock('@/lib/orchestrator/agent-runner', () => ({
  runAgent: (cfg: any) => runAgentMock(cfg),
}))

import { runSubAgent, listDelegatableAgents } from '@/lib/subagent'

beforeEach(() => {
  runAgentMock.mockClear()
})

describe('runSubAgent', () => {
  it('resolves an existing specialist by slug', async () => {
    const result = await runSubAgent({ task: 'Write a tagline', agent: 'copywriter' })
    expect(result.agent).toBe('Copywriter')
    expect(result.response).toBe('done by Copywriter')
    expect(result.turnsUsed).toBe(3)
    // The specialist agent was passed straight through to the lean loop.
    expect(runAgentMock.mock.calls[0][0].agent.id).toBe('writer-1')
  })

  it('creates an ad-hoc generalist when the role has no matching agent', async () => {
    const result = await runSubAgent({
      task: 'Analyse the numbers',
      agent: 'financial analyst',
    })
    const passedAgent = runAgentMock.mock.calls[0][0].agent
    expect(passedAgent.id).not.toBe('devs')
    expect(passedAgent.role).toBe('financial analyst')
    expect(passedAgent.name).toBe('financial analyst')
    expect(result.agent).toBe('financial analyst')
  })

  it('never delegates to the devs meta agent (recursion guard)', async () => {
    await runSubAgent({ task: 'Do everything', agent: 'devs' })
    const passedAgent = runAgentMock.mock.calls[0][0].agent
    expect(passedAgent.id).not.toBe('devs')
    // Falls back to a generalist whose role is the requested string.
    expect(passedAgent.slug).toBe('subagent')
  })

  it('folds context into the sub-agent prompt', async () => {
    await runSubAgent({ task: 'Summarise', context: 'Some data here' })
    const prompt = runAgentMock.mock.calls[0][0].prompt as string
    expect(prompt).toContain('Summarise')
    expect(prompt).toContain('## Context')
    expect(prompt).toContain('Some data here')
  })

  it('bounds the sub-agent turn budget', async () => {
    await runSubAgent({ task: 'x' })
    expect(runAgentMock.mock.calls[0][0].scope.maxTurns).toBeGreaterThan(0)
  })
})

describe('listDelegatableAgents', () => {
  it('excludes the devs meta agent from the roster', () => {
    const roster = listDelegatableAgents()
    expect(roster.some((a) => a.slug === 'devs')).toBe(false)
    expect(roster.some((a) => a.slug === 'copywriter')).toBe(true)
  })
})
