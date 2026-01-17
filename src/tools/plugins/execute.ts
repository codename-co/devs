/**
 * Code Tool Plugin (Execute)
 *
 * A tool plugin that provides JavaScript code execution capabilities.
 * Executes code in a QuickJS WebAssembly sandbox for maximum security.
 *
 * @module tools/plugins/execute
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import { execute, CODE_TOOL_DEFINITIONS } from '@/lib/code-tools/service'
import type {
  ExecuteParams,
  ExecuteResult,
  ExecuteError,
} from '@/lib/code-tools/types'

// ============================================================================
// Execute Tool Plugin
// ============================================================================

/**
 * Execute tool plugin for JavaScript code execution.
 *
 * This tool enables LLM agents to run JavaScript code safely
 * in a QuickJS WebAssembly sandbox.
 *
 * Features:
 * - Full ES2020 JavaScript support
 * - Complete isolation (no DOM, network, or filesystem access)
 * - Console output capture
 * - Input data passing
 * - Configurable timeout
 *
 * @example
 * ```typescript
 * import { executePlugin } from '@/tools/plugins/execute'
 * import { toolRegistry } from '@/tools'
 *
 * // Register the plugin
 * toolRegistry.register(executePlugin)
 * ```
 */
export const executePlugin: ToolPlugin<
  ExecuteParams,
  ExecuteResult | ExecuteError
> = createToolPlugin({
  metadata: {
    name: 'execute',
    displayName: 'Execute Code',
    shortDescription: 'Run JavaScript code in a secure sandbox',
    icon: 'Terminal',
    category: 'code',
    tags: ['code', 'javascript', 'execution', 'sandbox', 'compute'],
    enabledByDefault: false,
    estimatedDuration: 5000,
    requiresConfirmation: false,
  },
  definition: CODE_TOOL_DEFINITIONS.execute,
  handler: async (args, context) => {
    // Check for abort signal
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }

    return execute(args)
  },
  validate: (args): ExecuteParams => {
    const params = args as ExecuteParams

    if (!params.code || typeof params.code !== 'string') {
      throw new Error('Code is required and must be a string')
    }

    if (params.code.trim() === '') {
      throw new Error('Code cannot be empty')
    }

    if (params.timeout !== undefined) {
      if (typeof params.timeout !== 'number' || params.timeout < 0) {
        throw new Error('Timeout must be a positive number')
      }
      if (params.timeout > 30000) {
        throw new Error('Timeout cannot exceed 30000ms')
      }
    }

    return params
  },
})

export default executePlugin
