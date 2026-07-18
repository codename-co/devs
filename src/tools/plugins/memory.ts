/**
 * Memory Tool Plugin
 *
 * Gives every agent a single, KISS long-term memory primitive: a small markdown
 * document it curates itself with the `remember` tool. Inspired by Anthropic's
 * memory tool (https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
 * and simplified to one document per agent. See docs/more/MEMORY.md.
 *
 * The document is injected whole into the system prompt at the start of every
 * conversation (see `buildMemoryContextForChat`), so anything stored here is
 * remembered next time — this is what makes DEVS learn by default.
 *
 * @module tools/plugins/memory
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'
import { applyMemoryOperation } from '@/lib/memory-learning-service'
import { GLOBAL_MEMORY_AGENT_ID } from '@/lib/memory-learning-service'
// ============================================================================
// Types
// ============================================================================

export interface RememberParams {
  action: 'view' | 'append' | 'replace' | 'delete'
  /** Text to append, or the replacement text for `replace`. */
  content?: string
  /** Existing text to locate, for `replace` and `delete`. */
  find?: string
  /**
   * Where to store the memory: 'agent' (default, only this agent remembers) or
   * 'global' (shared with every agent).
   */
  scope?: 'agent' | 'global'
}

export interface RememberResult {
  status: string
}

// ============================================================================
// Tool Definition (OpenAI function-calling format)
// ============================================================================

export const REMEMBER_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'remember',
    description:
      'Save or update long-term memory about the user so future conversations stay personalised and consistent. ' +
      'Your current memory is already shown to you at the start of the conversation. ' +
      'Use this tool whenever you learn something durable and worth keeping: the user\u2019s name, role, preferences, ongoing goals/projects, or corrections to something you previously remembered. ' +
      'Do NOT store one-off requests, transient details, secrets/credentials, or things you merely said yourself. ' +
      'Keep memory concise \u2014 it has a small size budget, so prefer updating or removing old notes over piling on new ones. ' +
      'Actions: "append" adds a note (`content`); "replace" swaps existing text `find` with `content`; "delete" removes text `find`; "view" returns the current memory. ' +
      'Use `scope`="global" only for facts true regardless of which agent helps (e.g. the user name or language); otherwise keep the default agent scope.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['view', 'append', 'replace', 'delete'],
          description:
            'The memory operation to perform: append, replace, delete, or view.',
        },
        content: {
          type: 'string',
          description:
            'For "append": the note to add. For "replace": the new text. A short, self-contained fact written for your future self.',
        },
        find: {
          type: 'string',
          description:
            'For "replace" and "delete": the exact existing text in memory to locate.',
        },
        scope: {
          type: 'string',
          enum: ['agent', 'global'],
          description:
            'Where to store/read the memory: "agent" (default, private to you) or "global" (shared across all agents, for facts true regardless of which agent helps, e.g. the user name or language).',
        },
      },
      required: ['action'],
    },
  },
}

// ============================================================================
// Plugin
// ============================================================================

export const rememberPlugin: ToolPlugin<RememberParams, RememberResult> =
  createToolPlugin({
    metadata: {
      name: 'remember',
      displayName: 'Remember',
      shortDescription: 'Save long-term memory about the user',
      icon: 'Brain',
      category: 'memory',
      tags: ['memory', 'remember', 'personalization', 'continuity'],
      // Not exposed by default: memory is captured transparently in the
      // background (see autoCaptureToMemory). Agents can still opt in to the
      // explicit tool if they want direct control.
      enabledByDefault: false,
      estimatedDuration: 200,
      requiresConfirmation: false,
    },
    definition: REMEMBER_TOOL_DEFINITION,
    handler: async (args, context): Promise<RememberResult> => {
      const agentId = context.agentId
      if (!agentId) {
        return { status: 'No agent context available; memory not saved.' }
      }
      const targetId =
        args.scope === 'global' ? GLOBAL_MEMORY_AGENT_ID : agentId
      const status = await applyMemoryOperation(targetId, args.action, {
        content: args.content,
        find: args.find,
      })
      return { status }
    },
    validate: (args): RememberParams => {
      const params = args as RememberParams
      const valid = ['view', 'append', 'replace', 'delete']
      if (!params.action || !valid.includes(params.action)) {
        throw new Error(
          '`action` is required and must be one of: view, append, replace, delete',
        )
      }
      if (params.action === 'append' && !params.content) {
        throw new Error('`content` is required for the "append" action')
      }
      if (params.action === 'replace' && (!params.find || !params.content)) {
        throw new Error(
          '`find` and `content` are required for the "replace" action',
        )
      }
      if (params.action === 'delete' && !params.find) {
        throw new Error('`find` is required for the "delete" action')
      }
      return params
    },
  })
