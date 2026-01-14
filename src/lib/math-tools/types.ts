/**
 * Math Tools Types
 *
 * This module defines types for the math/calculation tool.
 * The calculate tool allows LLM agents to perform mathematical
 * computations in a sandboxed JavaScript environment.
 *
 * @module lib/math-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Calculate Tool Types
// ============================================================================

/**
 * Parameters for the calculate tool.
 * Evaluates mathematical expressions in a sandboxed environment.
 */
export interface CalculateParams {
  /**
   * The mathematical expression to evaluate.
   * Supports standard arithmetic, Math functions, and variables.
   * Examples:
   * - "2 + 2"
   * - "Math.sqrt(16) + Math.pow(2, 3)"
   * - "(a + b) / 2" with variables { a: 10, b: 20 }
   */
  expression: string
  /**
   * Optional variables to use in the expression.
   * Keys become available as variables in the expression.
   */
  variables?: Record<string, number>
  /**
   * Precision for the result (decimal places).
   * @default 10
   */
  precision?: number
}

/**
 * Result of a successful calculation.
 */
export interface CalculateResult {
  /** The evaluated result */
  result: number
  /** The original expression that was evaluated */
  expression: string
  /** Formatted result as string (respects precision) */
  formatted: string
  /** Variables that were used (if any) */
  variables?: Record<string, number>
  /** Execution time in milliseconds */
  executionTime: number
}

/**
 * Error result from calculation.
 */
export interface CalculateError {
  /** Error type */
  error: 'syntax' | 'runtime' | 'timeout' | 'security' | 'invalid_variable'
  /** Human-readable error message */
  message: string
  /** The expression that failed */
  expression: string
}

// ============================================================================
// Math Tool Names
// ============================================================================

/**
 * Type for math tool names.
 */
export type MathToolName = 'calculate'

// ============================================================================
// Sandbox Types
// ============================================================================

/**
 * Message sent to the math sandbox worker.
 */
export interface SandboxRequest {
  /** Unique request ID for correlation */
  id: string
  /** The expression to evaluate */
  expression: string
  /** Variables to inject */
  variables?: Record<string, number>
}

/**
 * Response from the math sandbox worker.
 */
export interface SandboxResponse {
  /** Request ID for correlation */
  id: string
  /** Whether the evaluation succeeded */
  success: boolean
  /** The result (if successful) */
  result?: number
  /** Error message (if failed) */
  error?: string
  /** Error type (if failed) */
  errorType?: 'syntax' | 'runtime' | 'security'
}

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Pre-defined tool definitions for math operations.
 * These can be directly passed to LLM requests.
 */
export const MATH_TOOL_DEFINITIONS: Record<MathToolName, ToolDefinition> = {
  calculate: {
    type: 'function',
    function: {
      name: 'calculate',
      description:
        'Evaluate a SINGLE mathematical expression and return the result. ' +
        'CRITICAL: This is NOT a JavaScript interpreter. It ONLY evaluates pure math expressions. ' +
        'FORBIDDEN (will error): let, const, var, for, while, if, function, =>, {}, [], semicolons, IIFE, loops of ANY kind. ' +
        'ALLOWED: numbers, +, -, *, /, %, ** (power), parentheses, ternary (? :), Math.* functions, variable names. ' +
        'For sequences like Fibonacci, use CLOSED-FORM FORMULAS: ' +
        'F(n) = Math.round((Math.pow((1+Math.sqrt(5))/2, n) - Math.pow((1-Math.sqrt(5))/2, n)) / Math.sqrt(5)). ' +
        'Sum of first n Fibonacci = F(n+2) - 1. ' +
        'ALWAYS write mathematical expressions, NEVER pre-calculate values yourself. ' +
        'VALID: "2 + 2", "Math.sqrt(16)", "Math.PI * r ** 2", "Math.factorial(5)", "Math.combinations(10, 3)". ' +
        'INVALID: "(function() {...})()", "let x = 1", "for(...)", "[a, b] = [b, a]".',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'A SINGLE pure mathematical expression (NOT code). ' +
              'Think of it as what you would type into a scientific calculator, not a programming IDE. ' +
              'NO CODE CONSTRUCTS: no variable declarations, no loops, no functions, no IIFE, no destructuring, no semicolons. ' +
              'ONLY MATH: numbers, operators (+, -, *, /, %, **), parentheses, ternary (? :), Math.* functions. ' +
              'For Fibonacci F(n): "Math.round((Math.pow((1+Math.sqrt(5))/2, n) - Math.pow((1-Math.sqrt(5))/2, n)) / Math.sqrt(5))". ' +
              'For sum of first n Fibonacci: "Math.round((Math.pow((1+Math.sqrt(5))/2, n+2) - Math.pow((1-Math.sqrt(5))/2, n+2)) / Math.sqrt(5)) - 1". ' +
              '\n\nAVAILABLE MATH FUNCTIONS (exhaustive list):\n' +
              '• CONSTANTS: Math.E (Euler), Math.PI, Math.LN2, Math.LN10, Math.LOG2E, Math.LOG10E, Math.SQRT2, Math.SQRT1_2\n' +
              '• BASIC: Math.abs(x), Math.sign(x), Math.round(x), Math.floor(x), Math.ceil(x), Math.trunc(x), Math.fround(x)\n' +
              '• POWERS & ROOTS: Math.pow(x,y), Math.sqrt(x), Math.cbrt(x), Math.exp(x), Math.expm1(x), Math.hypot(...values)\n' +
              '• LOGARITHMS: Math.log(x), Math.log10(x), Math.log2(x), Math.log1p(x)\n' +
              '• TRIGONOMETRY: Math.sin(x), Math.cos(x), Math.tan(x), Math.asin(x), Math.acos(x), Math.atan(x), Math.atan2(y,x)\n' +
              '• HYPERBOLIC: Math.sinh(x), Math.cosh(x), Math.tanh(x), Math.asinh(x), Math.acosh(x), Math.atanh(x)\n' +
              '• MIN/MAX: Math.min(...values), Math.max(...values)\n' +
              '• RANDOM: Math.random()\n' +
              '• BITWISE: Math.clz32(x), Math.imul(x,y)\n' +
              '• COMBINATORICS (custom): Math.factorial(n), Math.permutations(n,r), Math.combinations(n,r)\n' +
              '• NUMBER THEORY (custom): Math.gcd(a,b), Math.lcm(a,b)\n' +
              '• ANGLE CONVERSION (custom): Math.deg2rad(degrees), Math.rad2deg(radians)\n' +
              '\nExamples: "Math.factorial(5)" → 120, "Math.combinations(10, 3)" → 120, "Math.gcd(48, 18)" → 6',
          },
          variables: {
            type: 'object',
            description:
              'Named numeric variables to inject into the expression. ' +
              'Example: { "n": 28 } with expression for Fibonacci formula. ' +
              'Example: { "radius": 5, "height": 10 } for "Math.PI * radius ** 2 * height". ' +
              'All values must be finite numbers.',
            additionalProperties: {
              type: 'number',
            },
          },
          precision: {
            type: 'integer',
            description:
              'Number of decimal places for the result (default: 10)',
            minimum: 0,
            maximum: 20,
          },
        },
        required: ['expression'],
      },
    },
  },
}
