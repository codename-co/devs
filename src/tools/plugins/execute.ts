/**
 * Code Tool Plugin (Execute)
 *
 * A polyglot tool plugin that provides code execution capabilities.
 * Routes through the unified Sandbox — QuickJS for JavaScript,
 * Pyodide for Python.
 *
 * @module tools/plugins/execute
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import { sandbox } from '@/lib/sandbox'
import { CODE_TOOL_DEFINITIONS } from '@/lib/code-tools/types'
import type {
  ExecuteParams,
  ExecuteResult,
  ExecuteError,
} from '@/lib/code-tools/types'
import { MAX_TIMEOUTS } from '@/lib/sandbox/types'
import type { SandboxLanguage } from '@/lib/sandbox/types'

// ============================================================================
// Execute Tool Plugin
// ============================================================================

/**
 * Execute tool plugin for polyglot code execution.
 *
 * This tool enables LLM agents to run JavaScript or Python code
 * safely in WASM sandboxes via the unified Sandbox.
 *
 * Features:
 * - JavaScript: Full ES2020 via QuickJS
 * - Python: CPython 3.x via Pyodide with PyPI package support
 * - Complete isolation (no DOM, network, or filesystem access)
 * - Console / stdout capture
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
    shortDescription: 'Run JavaScript or Python code in a secure sandbox',
    icon: 'Terminal',
    category: 'code',
    tags: ['code', 'javascript', 'python', 'execution', 'sandbox', 'compute'],
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

    const language: SandboxLanguage = args.language ?? 'javascript'

    // Route through the unified sandbox
    const result = await sandbox.execute({
      language,
      code: args.code,
      context: args.input != null ? { input: args.input } : undefined,
      packages: language === 'python' ? args.packages : undefined,
      timeout: args.timeout,
    })

    // Map SandboxResult back to the legacy ExecuteResult | ExecuteError format
    if (result.success) {
      // Parse the result back to a native JS value if possible
      let nativeResult: unknown = result.result
      try {
        if (result.result !== undefined && result.result !== 'undefined') {
          nativeResult = JSON.parse(result.result)
        }
      } catch {
        // Keep as string if not parseable
      }

      return {
        result: nativeResult,
        formatted: result.result ?? 'undefined',
        console: result.console.map((e) => ({
          type: e.type as 'log' | 'warn' | 'error' | 'info' | 'debug',
          args: e.args,
          timestamp: e.timestamp,
        })),
        executionTime: result.executionTimeMs,
      } satisfies ExecuteResult
    } else {
      const errorType = result.errorType ?? 'runtime'
      return {
        error: (errorType === 'memory'
          ? 'runtime'
          : errorType) as ExecuteError['error'],
        message: result.error ?? 'Execution failed',
        console: result.console.map((e) => ({
          type: e.type as 'log' | 'warn' | 'error' | 'info' | 'debug',
          args: e.args,
          timestamp: e.timestamp,
        })),
      } satisfies ExecuteError
    }
  },
  validate: (args): ExecuteParams => {
    const params = args as ExecuteParams

    if (!params.code || typeof params.code !== 'string') {
      throw new Error('Code is required and must be a string')
    }

    if (params.code.trim() === '') {
      throw new Error('Code cannot be empty')
    }

    // Validate language
    const language: SandboxLanguage = params.language ?? 'javascript'
    if (!['javascript', 'python'].includes(language)) {
      throw new Error(
        `Unsupported language: "${language}". Supported: javascript, python`,
      )
    }

    // Validate timeout against language-specific limits
    if (params.timeout !== undefined) {
      if (typeof params.timeout !== 'number' || params.timeout < 0) {
        throw new Error('Timeout must be a positive number')
      }
      const maxTimeout = MAX_TIMEOUTS[language]
      if (params.timeout > maxTimeout) {
        throw new Error(`Timeout cannot exceed ${maxTimeout}ms for ${language}`)
      }
    }

    // Validate packages (Python only)
    if (params.packages !== undefined) {
      if (!Array.isArray(params.packages)) {
        throw new Error('Packages must be an array of strings')
      }
      if (params.packages.some((p) => typeof p !== 'string')) {
        throw new Error('Each package must be a string')
      }
    }

    return params
  },
})

export default executePlugin
