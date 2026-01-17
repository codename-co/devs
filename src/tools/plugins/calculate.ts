/**
 * Calculate Tool Plugin
 *
 * A tool plugin that provides mathematical calculation capabilities.
 * This demonstrates how to create a tool plugin using the new interface.
 *
 * @module tools/plugins/calculate
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import { calculate, MATH_TOOL_DEFINITIONS } from '@/lib/math-tools/service'
import type {
  CalculateParams,
  CalculateResult,
  CalculateError,
} from '@/lib/math-tools/types'

// ============================================================================
// Calculate Tool Plugin
// ============================================================================

/**
 * Calculate tool plugin for mathematical expression evaluation.
 *
 * This tool enables LLM agents to perform mathematical computations
 * in a sandboxed JavaScript environment.
 *
 * Features:
 * - Arithmetic operators (+, -, *, /, %, **)
 * - All Math.* functions (sqrt, pow, sin, cos, etc.)
 * - Custom functions (factorial, combinations, permutations, gcd, lcm)
 * - Variable support for complex calculations
 * - Web Worker isolation for maximum security
 *
 * @example
 * ```typescript
 * import { calculatePlugin } from '@/tools/plugins/calculate'
 * import { toolRegistry } from '@/tools'
 *
 * // Register the plugin
 * toolRegistry.register(calculatePlugin)
 *
 * // The tool is now available for agents
 * ```
 */
export const calculatePlugin: ToolPlugin<
  CalculateParams,
  CalculateResult | CalculateError
> = createToolPlugin({
  metadata: {
    name: 'calculate',
    displayName: 'Calculate',
    shortDescription: 'Evaluate mathematical expressions',
    icon: 'MathBook',
    category: 'math',
    tags: ['math', 'calculation', 'arithmetic', 'compute'],
    enabledByDefault: false,
    estimatedDuration: 100,
    requiresConfirmation: false,
  },
  definition: MATH_TOOL_DEFINITIONS.calculate,
  handler: async (args, context) => {
    // Check for abort signal
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }

    return calculate(args)
  },
  validate: (args): CalculateParams => {
    const params = args as CalculateParams

    if (!params.expression || typeof params.expression !== 'string') {
      throw new Error('Expression is required and must be a string')
    }

    if (params.variables !== undefined) {
      if (typeof params.variables !== 'object' || params.variables === null) {
        throw new Error('Variables must be an object')
      }

      for (const [name, value] of Object.entries(params.variables)) {
        if (typeof value !== 'number') {
          throw new Error(`Variable "${name}" must be a number`)
        }
        if (!isFinite(value)) {
          throw new Error(`Variable "${name}" must be a finite number`)
        }
      }
    }

    return params
  },
})

export default calculatePlugin
