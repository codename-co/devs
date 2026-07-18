/**
 * Sub-agent delegation — the lean "meta agent" primitive.
 *
 * The default DEVS agent runs the same lean single-agent ReAct loop as every
 * other agent (see `src/lib/chat.ts`). To let it act as a *meta* agent —
 * orchestrating specialists and delegating complex work — it is given a single
 * `delegate` tool that spawns a specialist **sub-agent** running that same lean
 * loop, then returns the sub-agent's result.
 *
 * This is orchestration-as-a-tool (REPORT §2.3 "sub-agents via the simple
 * orchestrator"): one recursive lean loop, no heavy task-decomposer /
 * team-coordinator / synthesis pipeline.
 *
 * Recursion is bounded by construction:
 *  - a sub-agent is never the `devs` meta agent (falls back to a generalist);
 *  - sub-agents run through `runAgent`, whose tool set does **not** include
 *    `delegate`, so a sub-agent cannot delegate further.
 *
 * @module lib/subagent
 */

import type { Agent, Task } from '@/types'
import {
  getAgentById,
  getAgentBySlug,
  getAgentBySlugAsync,
  getAllAgents,
} from '@/stores/agentStore'

/** Arguments accepted by the `delegate` tool. */
export interface DelegateInput {
  /** The self-contained task/instructions for the sub-agent. */
  task: string
  /**
   * Optional. Either the slug/id of an existing agent, or a free-form
   * role/specialty (e.g. "senior copywriter"). When it does not match an
   * existing agent, an ad-hoc generalist specialist is created for the role.
   */
  agent?: string
  /** Optional. Relevant context/data the sub-agent needs to do the work. */
  context?: string
}

/** Result returned by the `delegate` tool. */
export interface DelegateResult {
  /** The name of the sub-agent that executed the task. */
  agent: string
  /** The sub-agent's final deliverable/response. */
  response: string
  /** Number of turns the sub-agent used. */
  turnsUsed: number
}

/** Turn budget for a delegated sub-agent's lean loop. */
const SUBAGENT_MAX_TURNS = 12

/**
 * Resolve the specialist to run. Prefers an existing agent (by slug then id);
 * otherwise fabricates a lightweight generalist whose role is the supplied
 * string. The `devs` meta agent is never used as a sub-agent (prevents an
 * infinite delegate → delegate recursion).
 */
async function resolveSubAgent(spec?: string): Promise<Agent> {
  const key = spec?.trim()
  if (key) {
    const existing =
      getAgentBySlug(key) ||
      getAgentById(key) ||
      (await getAgentBySlugAsync(key)) ||
      undefined
    if (existing && existing.id !== 'devs') return existing
  }
  return makeGeneralist(key)
}

/** Build an ad-hoc generalist specialist for a free-form role. */
function makeGeneralist(role?: string): Agent {
  const r = role && role.length > 0 ? role : 'Generalist'
  const name = r.length <= 40 ? r : 'Specialist'
  return {
    id: `subagent-${crypto.randomUUID()}`,
    slug: 'subagent',
    name,
    role: r,
    instructions: `You are a ${r}. You have been delegated a self-contained task by a coordinating agent. Complete it thoroughly using the tools available to you, then return a complete, self-contained result the coordinator can use directly. Do not ask follow-up questions — make reasonable assumptions and state them briefly.`,
    createdAt: new Date(),
  } as Agent
}

/** Build a minimal synthetic Task for the sub-agent's lean loop. */
function synthTask(input: DelegateInput): Task {
  const now = new Date()
  return {
    id: `deleg-${crypto.randomUUID()}`,
    workflowId: `deleg-${crypto.randomUUID()}`,
    title: input.task.slice(0, 80),
    description: input.task,
    complexity: 'simple',
    status: 'in_progress',
    dependencies: [],
    requirements: [],
    artifacts: [],
    steps: [],
    estimatedPasses: 1,
    actualPasses: 0,
    createdAt: now,
    updatedAt: now,
  } as Task
}

/**
 * Run a delegated sub-agent through the lean agentic loop and return its result.
 *
 * Reuses `runAgent` (the shared lean-loop primitive) via a lazy import so the
 * orchestrator graph stays off the boot path.
 */
export async function runSubAgent(
  input: DelegateInput,
  opts?: { signal?: AbortSignal },
): Promise<DelegateResult> {
  const agent = await resolveSubAgent(input.agent)
  const task = synthTask(input)

  const prompt = input.context
    ? `${input.task}\n\n## Context\n${input.context}`
    : input.task

  const { runAgent } = await import('@/lib/orchestrator/agent-runner')
  const result = await runAgent({
    task,
    agent,
    prompt,
    scope: { maxTurns: SUBAGENT_MAX_TURNS },
    signal: opts?.signal,
  })

  return {
    agent: agent.name,
    response: result.response?.trim() || '(the sub-agent produced no output)',
    turnsUsed: result.turnsUsed,
  }
}

/**
 * A short catalogue of the specialist agents currently available to delegate
 * to, used to enrich the `delegate` tool description so the meta agent knows
 * who it can call on. Excludes the `devs` meta agent itself.
 */
export function listDelegatableAgents(): Array<{ slug: string; role: string }> {
  return getAllAgents()
    .filter((a) => a.id !== 'devs' && !a.deletedAt)
    .map((a) => ({ slug: a.slug || a.id, role: a.role || a.name }))
}
