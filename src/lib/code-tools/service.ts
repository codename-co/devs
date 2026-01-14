/**
 * Code Tools Service
 *
 * This module provides the implementation for the execute tool.
 * It enables LLM agents to run JavaScript code safely in a
 * QuickJS WebAssembly sandbox.
 *
 * @module lib/code-tools/service
 */

import type { ExecuteParams, ExecuteResult, ExecuteError } from './types'
import { CODE_TOOL_DEFINITIONS } from './types'
import { executeInSandbox, formatResult } from './sandbox'

// ============================================================================
// Constants
// ============================================================================

/** Default execution timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 5000

/** Maximum execution timeout in milliseconds */
const MAX_TIMEOUT_MS = 30000

/** Maximum code length in characters */
const MAX_CODE_LENGTH = 100000

// ============================================================================
// Execute Tool Implementation
// ============================================================================

/**
 * Execute function - runs JavaScript code in a QuickJS WebAssembly sandbox.
 *
 * This function:
 * 1. Validates input parameters
 * 2. Executes the code in QuickJS WASM sandbox
 * 3. Captures console output
 * 4. Returns the result or an error
 *
 * @param params - The execution parameters
 * @returns Promise resolving to ExecuteResult or ExecuteError
 *
 * @example
 * ```typescript
 * // Simple expression (returns last expression value)
 * const result = await execute({ code: '2 + 2' })
 * // { result: undefined, formatted: 'undefined', console: [], executionTime: 1 }
 * // Note: Use 'export default 2 + 2' to return the value
 *
 * // With export default
 * const result = await execute({
 *   code: 'export default 2 + 2'
 * })
 * // { result: 4, formatted: '4', console: [], executionTime: 1 }
 *
 * // With console output
 * const result = await execute({
 *   code: 'console.log("Hello"); export default 42'
 * })
 * // { result: 42, formatted: '42', console: [{ type: 'log', args: ['Hello'], ... }], executionTime: 2 }
 *
 * // With input data
 * const result = await execute({
 *   code: 'export default input.numbers.reduce((a, b) => a + b, 0)',
 *   input: { numbers: [1, 2, 3, 4, 5] }
 * })
 * // { result: 15, formatted: '15', console: [], executionTime: 1 }
 *
 * // Complex algorithm
 * const result = await execute({
 *   code: `
 *     function fib(n) {
 *       if (n <= 1) return n;
 *       return fib(n - 1) + fib(n - 2);
 *     }
 *     export default fib(10)
 *   `
 * })
 * // { result: 55, formatted: '55', console: [], executionTime: 5 }
 * ```
 */
export async function execute(
  params: ExecuteParams,
): Promise<ExecuteResult | ExecuteError> {
  const startTime = performance.now()
  const { code, input, timeout = DEFAULT_TIMEOUT_MS } = params

  // Validate code parameter
  if (!code || typeof code !== 'string') {
    return {
      error: 'syntax',
      message: 'Code is required and must be a string',
      console: [],
    }
  }

  const trimmedCode = code.trim()

  if (!trimmedCode) {
    return {
      error: 'syntax',
      message: 'Code cannot be empty',
      console: [],
    }
  }

  if (trimmedCode.length > MAX_CODE_LENGTH) {
    return {
      error: 'security',
      message: `Code too long (max ${MAX_CODE_LENGTH} characters)`,
      console: [],
    }
  }

  // Validate timeout
  const validTimeout = Math.min(
    MAX_TIMEOUT_MS,
    Math.max(100, Math.round(timeout)),
  )

  try {
    // Execute in QuickJS sandbox
    const response = await executeInSandbox(trimmedCode, input, validTimeout)

    const executionTime = performance.now() - startTime

    if (response.success) {
      return {
        result: response.result,
        formatted: formatResult(response.result),
        console: response.console,
        executionTime: Math.round(executionTime * 100) / 100,
      }
    } else {
      return {
        error: response.errorType || 'runtime',
        message: response.error || 'Execution failed',
        console: response.console,
      }
    }
  } catch (error) {
    return {
      error: 'runtime',
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
      console: [],
    }
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if result is an error.
 */
export function isExecuteError(
  result: ExecuteResult | ExecuteError,
): result is ExecuteError {
  return 'error' in result
}

/**
 * Type guard to check if result is successful.
 */
export function isExecuteSuccess(
  result: ExecuteResult | ExecuteError,
): result is ExecuteResult {
  return !('error' in result)
}

// ============================================================================
// Re-export tool definitions
// ============================================================================

export { CODE_TOOL_DEFINITIONS }
