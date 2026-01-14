/**
 * Math Tools Service
 *
 * This module provides the implementation for the calculate tool.
 * It enables LLM agents to perform mathematical computations safely
 * in a sandboxed JavaScript environment.
 *
 * @module lib/math-tools/service
 */

import type {
  CalculateParams,
  CalculateResult,
  CalculateError,
} from './types'
import {
  evaluateExpression,
  ExpressionSecurityError,
  getDefaultSandbox,
} from './sandbox'

// ============================================================================
// Constants
// ============================================================================

/** Default precision for results (decimal places) */
const DEFAULT_PRECISION = 10

/** Maximum execution timeout in milliseconds */
const MAX_TIMEOUT_MS = 5000

// ============================================================================
// Calculate Tool Implementation
// ============================================================================

/**
 * Formats a number with the specified precision.
 * Removes trailing zeros after decimal point.
 *
 * @param value - The number to format
 * @param precision - Number of decimal places
 * @returns Formatted string representation
 */
function formatResult(value: number, precision: number): string {
  if (!isFinite(value)) {
    if (Number.isNaN(value)) return 'NaN'
    return value > 0 ? 'Infinity' : '-Infinity'
  }

  // Handle very small numbers that would display as 0
  if (Math.abs(value) < Math.pow(10, -precision) && value !== 0) {
    return value.toExponential(precision)
  }

  // Handle very large numbers
  if (Math.abs(value) >= Math.pow(10, 15)) {
    return value.toExponential(precision)
  }

  // Format with precision and remove trailing zeros
  const fixed = value.toFixed(precision)
  return fixed.replace(/\.?0+$/, '') || '0'
}

/**
 * Calculate function - evaluates a mathematical expression.
 *
 * This function:
 * 1. Validates input parameters
 * 2. Evaluates the expression in a sandboxed environment
 * 3. Returns the formatted result or an error
 *
 * @param params - The calculation parameters
 * @returns Promise resolving to CalculateResult or CalculateError
 *
 * @example
 * ```typescript
 * // Simple arithmetic
 * const result = await calculate({ expression: '2 + 2' })
 * // { result: 4, expression: '2 + 2', formatted: '4', executionTime: 1 }
 *
 * // With Math functions
 * const result = await calculate({ expression: 'Math.sqrt(16) + Math.pow(2, 3)' })
 * // { result: 12, expression: 'Math.sqrt(16) + Math.pow(2, 3)', formatted: '12', executionTime: 2 }
 *
 * // With variables
 * const result = await calculate({
 *   expression: 'Math.PI * radius ** 2',
 *   variables: { radius: 5 }
 * })
 * // { result: 78.5398163397, expression: '...', formatted: '78.5398163397', variables: { radius: 5 }, executionTime: 1 }
 * ```
 */
export async function calculate(
  params: CalculateParams,
): Promise<CalculateResult | CalculateError> {
  const startTime = performance.now()
  const { expression, variables, precision = DEFAULT_PRECISION } = params

  // Validate expression parameter
  if (!expression || typeof expression !== 'string') {
    return {
      error: 'syntax',
      message: 'Expression is required and must be a string',
      expression: expression || '',
    }
  }

  const trimmedExpression = expression.trim()

  if (!trimmedExpression) {
    return {
      error: 'syntax',
      message: 'Expression cannot be empty',
      expression: '',
    }
  }

  // Validate variables if provided
  if (variables !== undefined) {
    if (typeof variables !== 'object' || variables === null) {
      return {
        error: 'invalid_variable',
        message: 'Variables must be an object',
        expression: trimmedExpression,
      }
    }

    for (const [name, value] of Object.entries(variables)) {
      if (typeof value !== 'number') {
        return {
          error: 'invalid_variable',
          message: `Variable "${name}" must be a number, got ${typeof value}`,
          expression: trimmedExpression,
        }
      }

      if (!isFinite(value)) {
        return {
          error: 'invalid_variable',
          message: `Variable "${name}" must be a finite number`,
          expression: trimmedExpression,
        }
      }
    }
  }

  // Validate precision
  const validPrecision = Math.min(20, Math.max(0, Math.round(precision)))

  try {
    // Try sandbox evaluation first (if available)
    const sandbox = getDefaultSandbox()
    let result: number

    if (sandbox.isWorkerMode()) {
      // Use Web Worker sandbox for maximum isolation
      result = await sandbox.evaluate(
        trimmedExpression,
        variables,
        MAX_TIMEOUT_MS,
      )
    } else {
      // Fallback to synchronous evaluation
      result = evaluateExpression(trimmedExpression, variables)
    }

    const executionTime = performance.now() - startTime

    return {
      result,
      expression: trimmedExpression,
      formatted: formatResult(result, validPrecision),
      variables,
      executionTime: Math.round(executionTime * 100) / 100,
    }
  } catch (error) {
    // Determine error type
    let errorType: CalculateError['error'] = 'runtime'
    let message = 'An error occurred during evaluation'

    if (error instanceof ExpressionSecurityError) {
      errorType = 'security'
      message = error.message
    } else if (error instanceof Error) {
      message = error.message

      if (
        message.includes('Syntax') ||
        message.includes('Unexpected') ||
        message.includes('token')
      ) {
        errorType = 'syntax'
      } else if (message.includes('timed out')) {
        errorType = 'timeout'
      }
    }

    return {
      error: errorType,
      message,
      expression: trimmedExpression,
    }
  }
}

/**
 * Type guard to check if a result is an error.
 */
export function isCalculateError(
  result: CalculateResult | CalculateError,
): result is CalculateError {
  return 'error' in result
}

/**
 * Type guard to check if a result is successful.
 */
export function isCalculateSuccess(
  result: CalculateResult | CalculateError,
): result is CalculateResult {
  return 'result' in result
}

// Re-export MATH_TOOL_DEFINITIONS for convenience
export { MATH_TOOL_DEFINITIONS } from './types'
