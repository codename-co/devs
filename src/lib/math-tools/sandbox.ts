/**
 * Math Sandbox - Secure Expression Evaluation
 *
 * This module provides a sandboxed JavaScript execution environment
 * for evaluating mathematical expressions safely. It uses:
 *
 * 1. Expression validation to prevent code injection
 * 2. A restricted execution context with only Math functions
 * 3. Web Worker isolation for browser environments (optional)
 * 4. Timeout protection against infinite loops
 *
 * @module lib/math-tools/sandbox
 */

import type { SandboxRequest, SandboxResponse } from './types'

// ============================================================================
// Constants
// ============================================================================

/** Default execution timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 5000

/** Blocked keywords that could be used for code injection */
const BLOCKED_KEYWORDS = [
  'eval',
  'Function',
  'constructor',
  'prototype',
  '__proto__',
  'window',
  'document',
  'global',
  'globalThis',
  'process',
  'require',
  'import',
  'export',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'setTimeout',
  'setInterval',
  'alert',
  'confirm',
  'prompt',
  'console',
  'debugger',
  'this',
  'self',
  'top',
  'parent',
  'frames',
  'location',
  'history',
  'navigator',
  'screen',
  'Blob',
  'File',
  'FileReader',
  'URL',
]

/** Allowed Math properties and methods */
const ALLOWED_MATH_MEMBERS = [
  // Constants
  'E',
  'LN10',
  'LN2',
  'LOG10E',
  'LOG2E',
  'PI',
  'SQRT1_2',
  'SQRT2',
  // Methods
  'abs',
  'acos',
  'acosh',
  'asin',
  'asinh',
  'atan',
  'atan2',
  'atanh',
  'cbrt',
  'ceil',
  'clz32',
  'cos',
  'cosh',
  'exp',
  'expm1',
  'floor',
  'fround',
  'hypot',
  'imul',
  'log',
  'log10',
  'log1p',
  'log2',
  'max',
  'min',
  'pow',
  'random',
  'round',
  'sign',
  'sin',
  'sinh',
  'sqrt',
  'tan',
  'tanh',
  'trunc',
  // Custom additions (not in standard Math)
  'factorial',
  'permutations',
  'combinations',
  'gcd',
  'lcm',
  'deg2rad',
  'rad2deg',
]

// ============================================================================
// Expression Validation
// ============================================================================

/**
 * Security error thrown when an expression fails validation.
 */
export class ExpressionSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpressionSecurityError'
  }
}

/**
 * Validates a mathematical expression for security.
 * Throws ExpressionSecurityError if the expression is potentially unsafe.
 *
 * @param expression - The expression to validate
 * @param variables - Optional variable names that are allowed
 * @throws ExpressionSecurityError if validation fails
 */
export function validateExpression(
  expression: string,
  variables?: Record<string, number>,
): void {
  const trimmed = expression.trim()

  if (!trimmed) {
    throw new ExpressionSecurityError('Expression cannot be empty')
  }

  if (trimmed.length > 1000) {
    throw new ExpressionSecurityError(
      'Expression too long (max 1000 characters)',
    )
  }

  // Check for blocked keywords (case-insensitive for some)
  for (const keyword of BLOCKED_KEYWORDS) {
    // Use word boundary check to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(expression)) {
      throw new ExpressionSecurityError(
        `Blocked keyword detected: "${keyword}"`,
      )
    }
  }

  // Check for property access chains that might be exploits
  // Allow Math.xxx but block other chains
  const propertyAccessPattern = /\b(?!Math\.)[a-zA-Z_]\w*\s*\./g
  const propertyMatches = expression.match(propertyAccessPattern)
  if (propertyMatches) {
    // Check if it's a valid variable followed by property access (not allowed)
    throw new ExpressionSecurityError(
      'Property access is only allowed on Math object',
    )
  }

  // Validate Math member access
  const mathAccessPattern = /Math\.([a-zA-Z_]\w*)/g
  let mathMatch
  while ((mathMatch = mathAccessPattern.exec(expression)) !== null) {
    const member = mathMatch[1]
    if (!ALLOWED_MATH_MEMBERS.includes(member)) {
      throw new ExpressionSecurityError(
        `Unknown Math member: "${member}". Allowed: ${ALLOWED_MATH_MEMBERS.join(', ')}`,
      )
    }
  }

  // Check for bracket notation (potential bypass)
  if (/\[.*\]/.test(expression)) {
    throw new ExpressionSecurityError(
      'Bracket notation is not allowed in expressions',
    )
  }

  // Check for string literals
  if (/['"`]/.test(expression)) {
    throw new ExpressionSecurityError(
      'String literals are not allowed in expressions',
    )
  }

  // Check for semicolons (multiple statements)
  if (/;/.test(expression)) {
    throw new ExpressionSecurityError('Multiple statements (;) are not allowed')
  }

  // Check for assignment operators
  if (/(?<![=!<>])=(?!=)/.test(expression)) {
    throw new ExpressionSecurityError('Assignment operators are not allowed')
  }

  // Validate variable names if provided
  if (variables) {
    const variableNames = Object.keys(variables)

    // Check that variable names are valid identifiers
    for (const name of variableNames) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new ExpressionSecurityError(
          `Invalid variable name: "${name}". Must start with letter or underscore.`,
        )
      }
      if (BLOCKED_KEYWORDS.includes(name.toLowerCase())) {
        throw new ExpressionSecurityError(`Variable name "${name}" is reserved`)
      }
    }

    // Check that variable values are numbers
    for (const [name, value] of Object.entries(variables)) {
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new ExpressionSecurityError(
          `Variable "${name}" must be a finite number`,
        )
      }
    }
  }
}

// ============================================================================
// Safe Evaluation
// ============================================================================

/**
 * Creates a restricted evaluation context with only Math functions.
 *
 * @param variables - Optional variables to inject into context
 * @returns An object containing the safe context
 */
/**
 * Custom math functions not available in standard Math object.
 */
const CUSTOM_MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  /** Factorial: n! = n × (n-1) × ... × 1. Only works for n <= 170 (JS number limit) */
  factorial: (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) {
      throw new Error('Factorial requires a non-negative integer')
    }
    if (n > 170) {
      return Infinity // Beyond JS number precision
    }
    let result = 1
    for (let i = 2; i <= n; i++) {
      result *= i
    }
    return result
  },

  /** Permutations: P(n, r) = n! / (n-r)! */
  permutations: (n: number, r: number): number => {
    if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) {
      throw new Error('Permutations require non-negative integers')
    }
    if (r > n) return 0
    let result = 1
    for (let i = n; i > n - r; i--) {
      result *= i
    }
    return result
  },

  /** Combinations: C(n, r) = n! / (r! × (n-r)!) */
  combinations: (n: number, r: number): number => {
    if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) {
      throw new Error('Combinations require non-negative integers')
    }
    if (r > n) return 0
    if (r === 0 || r === n) return 1
    // Use smaller r for efficiency
    if (r > n - r) r = n - r
    let result = 1
    for (let i = 0; i < r; i++) {
      result = (result * (n - i)) / (i + 1)
    }
    return Math.round(result)
  },

  /** Greatest Common Divisor using Euclidean algorithm */
  gcd: (a: number, b: number): number => {
    a = Math.abs(Math.round(a))
    b = Math.abs(Math.round(b))
    while (b !== 0) {
      const t = b
      b = a % b
      a = t
    }
    return a
  },

  /** Least Common Multiple */
  lcm: (a: number, b: number): number => {
    a = Math.abs(Math.round(a))
    b = Math.abs(Math.round(b))
    if (a === 0 || b === 0) return 0
    return (a * b) / CUSTOM_MATH_FUNCTIONS.gcd(a, b)
  },

  /** Convert degrees to radians */
  deg2rad: (degrees: number): number => {
    return degrees * (Math.PI / 180)
  },

  /** Convert radians to degrees */
  rad2deg: (radians: number): number => {
    return radians * (180 / Math.PI)
  },
}

function createSafeContext(
  variables?: Record<string, number>,
): Record<string, unknown> {
  // Create a frozen Math-like object with only allowed members
  const safeMath: Record<string, unknown> = {}

  // Add standard Math members
  for (const member of ALLOWED_MATH_MEMBERS) {
    // Check if it's a custom function first
    if (member in CUSTOM_MATH_FUNCTIONS) {
      safeMath[member] = CUSTOM_MATH_FUNCTIONS[member]
    } else {
      const value = Math[member as keyof Math]
      safeMath[member] = typeof value === 'function' ? value.bind(Math) : value
    }
  }

  const context: Record<string, unknown> = {
    Math: Object.freeze(safeMath),
  }

  // Add variables to context
  if (variables) {
    for (const [name, value] of Object.entries(variables)) {
      context[name] = value
    }
  }

  return Object.freeze(context)
}

/**
 * Evaluates a mathematical expression in a sandboxed context.
 *
 * This function:
 * 1. Validates the expression for security
 * 2. Creates a restricted execution context
 * 3. Evaluates the expression using Function constructor
 * 4. Returns the numeric result
 *
 * @param expression - The mathematical expression to evaluate
 * @param variables - Optional variables to use in the expression
 * @returns The numeric result of the evaluation
 * @throws ExpressionSecurityError if validation fails
 * @throws Error if evaluation fails
 */
export function evaluateExpression(
  expression: string,
  variables?: Record<string, number>,
): number {
  // Validate first
  validateExpression(expression, variables)

  // Create safe context
  const context = createSafeContext(variables)

  // Build the function body
  // We inject context variables as function parameters
  const paramNames = Object.keys(context)
  const paramValues = Object.values(context)

  // Create and execute the function
  // This is safer than eval() because:
  // 1. We control what variables are available
  // 2. The expression has been validated
  // 3. The context is frozen
  try {
    // Using Function constructor in strict mode
    const fn = new Function(
      ...paramNames,
      `"use strict"; return (${expression});`,
    )
    const result = fn(...paramValues)

    // Validate the result is a number
    if (typeof result !== 'number') {
      throw new Error(`Expression must return a number, got ${typeof result}`)
    }

    return result
  } catch (error) {
    if (error instanceof ExpressionSecurityError) {
      throw error
    }

    // Wrap syntax/runtime errors with more context
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'

    if (
      message.includes('SyntaxError') ||
      message.includes('Unexpected token')
    ) {
      throw new Error(`Syntax error in expression: ${message}`)
    }

    throw new Error(`Evaluation error: ${message}`)
  }
}

// ============================================================================
// Web Worker Sandbox (for browser use)
// ============================================================================

/**
 * Inline Web Worker code for sandboxed evaluation.
 * This runs in a completely isolated context.
 */
const WORKER_CODE = `
  const ALLOWED_MATH_MEMBERS = ${JSON.stringify(ALLOWED_MATH_MEMBERS)};
  const BLOCKED_KEYWORDS = ${JSON.stringify(BLOCKED_KEYWORDS)};

  // Restricted Math object
  const safeMath = {};
  for (const member of ALLOWED_MATH_MEMBERS) {
    const value = Math[member];
    safeMath[member] = typeof value === 'function' ? value.bind(Math) : value;
  }
  Object.freeze(safeMath);

  self.onmessage = function(e) {
    const { id, expression, variables } = e.data;

    try {
      // Basic validation
      if (!expression || typeof expression !== 'string') {
        throw new Error('Invalid expression');
      }

      if (expression.length > 1000) {
        throw new Error('Expression too long');
      }

      // Check for blocked keywords
      for (const keyword of BLOCKED_KEYWORDS) {
        const regex = new RegExp('\\\\b' + keyword + '\\\\b', 'i');
        if (regex.test(expression)) {
          self.postMessage({
            id,
            success: false,
            error: 'Blocked keyword detected: ' + keyword,
            errorType: 'security'
          });
          return;
        }
      }

      // Build context
      const context = { Math: safeMath };
      if (variables && typeof variables === 'object') {
        for (const [name, value] of Object.entries(variables)) {
          if (typeof value === 'number' && isFinite(value)) {
            context[name] = value;
          }
        }
      }

      // Evaluate
      const paramNames = Object.keys(context);
      const paramValues = Object.values(context);
      const fn = new Function(...paramNames, '"use strict"; return (' + expression + ');');
      const result = fn(...paramValues);

      if (typeof result !== 'number') {
        throw new Error('Expression must return a number');
      }

      self.postMessage({ id, success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isSyntax = message.includes('SyntaxError') || message.includes('Unexpected');
      self.postMessage({
        id,
        success: false,
        error: message,
        errorType: isSyntax ? 'syntax' : 'runtime'
      });
    }
  };
`

/**
 * Creates a Web Worker from inline code using Blob URL.
 */
function createWorker(): Worker {
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  const worker = new Worker(url)
  URL.revokeObjectURL(url)
  return worker
}

/**
 * Sandbox class for managing Web Worker-based evaluation.
 * Use this for maximum isolation in browser environments.
 */
export class MathSandbox {
  private worker: Worker | null = null
  private pendingRequests: Map<
    string,
    {
      resolve: (result: number) => void
      reject: (error: Error) => void
      timeoutId: ReturnType<typeof setTimeout>
    }
  > = new Map()

  /**
   * Initialize the sandbox worker.
   */
  init(): void {
    if (this.worker) return

    try {
      this.worker = createWorker()
      this.worker.onmessage = this.handleMessage.bind(this)
      this.worker.onerror = this.handleError.bind(this)
    } catch {
      // Web Workers not available, fallback to sync evaluation
      console.warn('[MathSandbox] Web Workers not available, using sync mode')
      this.worker = null
    }
  }

  /**
   * Handle messages from the worker.
   */
  private handleMessage(event: MessageEvent<SandboxResponse>): void {
    const { id, success, result, error, errorType } = event.data
    const pending = this.pendingRequests.get(id)

    if (!pending) return

    clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(id)

    if (success && result !== undefined) {
      pending.resolve(result)
    } else {
      const err = new Error(error || 'Evaluation failed')
      err.name = errorType === 'security' ? 'SecurityError' : 'EvaluationError'
      pending.reject(err)
    }
  }

  /**
   * Handle worker errors.
   */
  private handleError(event: ErrorEvent): void {
    console.error('[MathSandbox] Worker error:', event.message)
    // Reject all pending requests
    for (const [_id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('Worker error: ' + event.message))
    }
    this.pendingRequests.clear()
  }

  /**
   * Evaluate an expression in the sandbox.
   *
   * @param expression - The expression to evaluate
   * @param variables - Optional variables
   * @param timeout - Timeout in milliseconds
   * @returns Promise resolving to the numeric result
   */
  async evaluate(
    expression: string,
    variables?: Record<string, number>,
    timeout: number = DEFAULT_TIMEOUT_MS,
  ): Promise<number> {
    // If worker not available, fall back to sync evaluation
    if (!this.worker) {
      return evaluateExpression(expression, variables)
    }

    const id = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Evaluation timed out'))
      }, timeout)

      this.pendingRequests.set(id, { resolve, reject, timeoutId })

      const request: SandboxRequest = { id, expression, variables }
      this.worker!.postMessage(request)
    })
  }

  /**
   * Check if the sandbox is using Web Worker isolation.
   */
  isWorkerMode(): boolean {
    return this.worker !== null
  }

  /**
   * Terminate the sandbox worker.
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    // Reject all pending requests
    for (const [_id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('Sandbox destroyed'))
    }
    this.pendingRequests.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Default sandbox instance */
let defaultSandbox: MathSandbox | null = null

/**
 * Get the default sandbox instance.
 * Creates one if it doesn't exist.
 */
export function getDefaultSandbox(): MathSandbox {
  if (!defaultSandbox) {
    defaultSandbox = new MathSandbox()
    defaultSandbox.init()
  }
  return defaultSandbox
}

/**
 * Destroy the default sandbox instance.
 */
export function destroyDefaultSandbox(): void {
  if (defaultSandbox) {
    defaultSandbox.destroy()
    defaultSandbox = null
  }
}
