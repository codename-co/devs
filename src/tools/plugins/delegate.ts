/**
 * Delegate Tool Plugin
 *
 * Gives the DEVS meta agent a single, KISS orchestration primitive: delegate a
 * self-contained subtask to a specialist sub-agent that runs the same lean
 * agentic loop, then return its result. See `src/lib/subagent.ts` for the
 * recursion-safety guarantees.
 *
 * @module tools/plugins/delegate
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'
import type { DelegateInput, DelegateResult } from '@/lib/subagent'

// ============================================================================
// Tool Definition (OpenAI function-calling format)
// ============================================================================

export const DELEGATE_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'delegate',
    description:
      'Delegate a self-contained subtask to a specialist sub-agent and get its result back. ' +
      'Use this to orchestrate complex work: break the goal into independent pieces and delegate each to the most fitting specialist. ' +
      'The sub-agent runs autonomously with its own tools and returns a complete deliverable. ' +
      'Delegate one focused subtask per call; call multiple times for multiple pieces, then synthesise the results yourself.',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description:
            'A clear, self-contained description of the subtask for the sub-agent, including everything it needs to succeed without asking questions.',
        },
        agent: {
          type: 'string',
          description:
            'Optional. The slug of an existing specialist agent to use, OR a free-form role/specialty (e.g. "senior financial analyst"). If omitted, a capable generalist handles it.',
        },
        context: {
          type: 'string',
          description:
            'Optional. Relevant background, data, or outputs from earlier steps that the sub-agent should build on.',
        },
      },
      required: ['task'],
    },
  },
}

// ============================================================================
// Plugin
// ============================================================================

export const delegatePlugin: ToolPlugin<DelegateInput, DelegateResult> =
  createToolPlugin({
    metadata: {
      name: 'delegate',
      displayName: 'Delegate to sub-agent',
      shortDescription: 'Delegate a subtask to a specialist sub-agent',
      icon: 'Community',
      category: 'orchestration',
      tags: ['orchestration', 'delegate', 'subagent', 'meta'],
      enabledByDefault: false,
      estimatedDuration: 30000,
      requiresConfirmation: false,
    },
    definition: DELEGATE_TOOL_DEFINITION,
    handler: async (args, context) => {
      const { runSubAgent } = await import('@/lib/subagent')
      return runSubAgent(args, { signal: context.abortSignal })
    },
    validate: (args): DelegateInput => {
      const params = args as DelegateInput
      if (!params.task || typeof params.task !== 'string') {
        throw new Error('`task` is required and must be a string')
      }
      if (params.agent !== undefined && typeof params.agent !== 'string') {
        throw new Error('`agent` must be a string')
      }
      if (params.context !== undefined && typeof params.context !== 'string') {
        throw new Error('`context` must be a string')
      }
      return params
    },
  })

export default delegatePlugin
