/**
 * Math Tools Module
 *
 * Provides a secure calculation tool for LLM agents.
 * Evaluates mathematical expressions in a sandboxed JavaScript environment.
 *
 * Features:
 * - Arithmetic operators (+, -, *, /, %, **)
 * - All Math.* functions (sqrt, pow, sin, cos, etc.)
 * - Variable support for complex calculations
 * - Web Worker isolation for maximum security
 * - Expression validation to prevent code injection
 *
 * @module lib/math-tools
 *
 * @example
 * ```typescript
 * import { calculate, MATH_TOOL_DEFINITIONS } from '@/lib/math-tools'
 *
 * // Simple calculation
 * const result = await calculate({ expression: '2 + 2' })
 *
 * // With variables
 * const result = await calculate({
 *   expression: 'Math.PI * radius ** 2',
 *   variables: { radius: 5 }
 * })
 *
 * // Get tool definition for LLM
 * const toolDef = MATH_TOOL_DEFINITIONS.calculate
 * ```
 */

export {
  calculate,
  isCalculateError,
  isCalculateSuccess,
  MATH_TOOL_DEFINITIONS,
} from './service'

export {
  evaluateExpression,
  validateExpression,
  ExpressionSecurityError,
  MathSandbox,
  getDefaultSandbox,
  destroyDefaultSandbox,
} from './sandbox'

export type {
  CalculateParams,
  CalculateResult,
  CalculateError,
  MathToolName,
  SandboxRequest,
  SandboxResponse,
} from './types'

export { MATH_TOOL_DEFINITIONS as MATH_TOOL_DEFINITIONS_TYPE } from './types'
