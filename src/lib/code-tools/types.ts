/**
 * Code Tools Types
 *
 * This module defines types for the code execution tool.
 * The execute tool allows LLM agents to run JavaScript code
 * in a QuickJS WebAssembly sandbox for maximum security.
 *
 * @module lib/code-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Execute Tool Types
// ============================================================================

/**
 * Parameters for the execute tool.
 * Executes JavaScript code in a WASM-sandboxed environment.
 */
export interface ExecuteParams {
  /**
   * The JavaScript code to execute.
   * Runs in QuickJS WebAssembly sandbox with full ES2020 support.
   *
   * Supports:
   * - Variable declarations (let, const, var)
   * - Functions and arrow functions
   * - Async/await
   * - Loops (for, while, do-while)
   * - Conditionals (if/else, switch)
   * - Array and object operations
   * - Math operations
   * - String manipulation
   * - Promises
   * - JSON operations
   *
   * Does NOT support (by design, for security):
   * - DOM access (document, window)
   * - Network requests (fetch, XMLHttpRequest)
   * - File system access
   * - Web APIs (URL, URLSearchParams, Blob, FormData, etc.)
   * - Node.js modules (require, process, Buffer, etc.)
   */
  code: string

  /**
   * Optional input data to pass to the code.
   * Available as the `input` variable in the execution context.
   */
  input?: unknown

  /**
   * Maximum execution time in milliseconds.
   * QuickJS enforces strict timeout limits.
   * @default 5000
   */
  timeout?: number
}

/**
 * Console output entry captured during execution.
 */
export interface ConsoleEntry {
  /** Console method that was called */
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  /** Stringified arguments */
  args: string[]
  /** Timestamp relative to execution start */
  timestamp: number
}

/**
 * Result of successful code execution.
 */
export interface ExecuteResult {
  /** The return value of the code (via `export default`) */
  result: unknown
  /** Formatted result as string */
  formatted: string
  /** Console output captured during execution */
  console: ConsoleEntry[]
  /** Execution time in milliseconds */
  executionTime: number
}

/**
 * Error result from code execution.
 */
export interface ExecuteError {
  /** Error type */
  error: 'syntax' | 'runtime' | 'timeout' | 'security'
  /** Human-readable error message */
  message: string
  /** Stack trace (if available) */
  stack?: string
  /** Console output captured before the error */
  console: ConsoleEntry[]
}

// ============================================================================
// Code Tool Names
// ============================================================================

/**
 * Type for code tool names.
 */
export type CodeToolName = 'execute'

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Pre-defined tool definitions for code execution.
 * These can be directly passed to LLM requests.
 */
export const CODE_TOOL_DEFINITIONS: Record<CodeToolName, ToolDefinition> = {
  execute: {
    type: 'function',
    function: {
      name: 'execute',
      description: `Execute JavaScript code in a secure QuickJS WebAssembly sandbox.

The code runs in complete isolation with no access to browser APIs, network, or file system.
Use 'export default <value>' to return a result from your code.
Console methods (log, warn, error, info, debug) are captured and returned.
The 'input' variable contains any data passed via the input parameter.

IMPORTANT: Web APIs like URL, URLSearchParams, fetch, Blob are NOT available.
Use the built-in parseURL(urlString) helper to parse URLs.

Example:
\`\`\`javascript
// Simple calculation
const sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0);
console.log('Sum:', sum);
export default sum;

// With input data (if input = { numbers: [1,2,3] })
const result = input.numbers.map(n => n * 2);
export default result;
\`\`\``,
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description:
              'The JavaScript code to execute. Use "export default <value>" to return a result.',
          },
          input: {
            type: 'object',
            description:
              'Optional input data available as the "input" variable in the code.',
          },
          timeout: {
            type: 'number',
            description:
              'Maximum execution time in milliseconds (default: 5000, max: 30000).',
          },
        },
        required: ['code'],
      },
    },
  },
}
