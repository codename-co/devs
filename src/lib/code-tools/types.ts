/**
 * Code Tools Types
 *
 * This module defines types for the polyglot code execution tool.
 * The execute tool allows LLM agents to run JavaScript or Python code
 * in WASM-isolated sandboxes (QuickJS for JS, Pyodide for Python).
 *
 * @module lib/code-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'
import type { SandboxLanguage } from '@/lib/sandbox/types'

// ============================================================================
// Execute Tool Types
// ============================================================================

/**
 * Parameters for the execute tool.
 * Executes code in a WASM-sandboxed environment (JavaScript via QuickJS,
 * Python via Pyodide).
 */
export interface ExecuteParams {
  /**
   * The code to execute in the chosen language.
   *
   * **JavaScript** (QuickJS, ES2020):
   * - Use `export default <value>` to return a result
   * - Console methods captured and returned
   * - No DOM, network, filesystem, or Node.js APIs
   *
   * **Python** (Pyodide, CPython 3.x):
   * - Use `print()` for output
   * - Full standard library available
   * - Install packages via the `packages` parameter
   * - No network or filesystem access
   */
  code: string

  /**
   * Language to execute. Defaults to 'javascript' for backwards compatibility.
   * @default 'javascript'
   */
  language?: SandboxLanguage

  /**
   * Optional input data to pass to the code.
   * Available as the `input` variable in the execution context.
   */
  input?: unknown

  /**
   * Packages to install before running (Python only).
   * Uses micropip to install from PyPI.
   * Ignored for JavaScript.
   *
   * @example ['numpy', 'pandas']
   */
  packages?: string[]

  /**
   * Maximum execution time in milliseconds.
   * Defaults: JS 5 000 ms, Python 60 000 ms.
   * Limits:  JS 30 000 ms, Python 300 000 ms.
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
      description: `Execute code in a secure WASM sandbox. Supports JavaScript (QuickJS) and Python (Pyodide).

The code runs in complete isolation with no access to browser APIs, network, or file system.
Console output and print() statements are captured and returned.
The 'input' variable contains any data passed via the input parameter.

**JavaScript** (default):
- Use 'export default <value>' to return a result
- Full ES2020 support
- IMPORTANT: Web APIs like URL, URLSearchParams, fetch, Blob are NOT available
- Use the built-in parseURL(urlString) helper to parse URLs

**Python**:
- Use print() for output
- Full standard library (math, json, collections, itertools, etc.)
- Install PyPI packages via the 'packages' parameter (e.g. ["numpy", "pandas"])
- Packages are installed once and cached for subsequent calls

Examples:
\`\`\`javascript
// JavaScript — simple calculation
const sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0);
export default sum;
\`\`\`

\`\`\`python
# Python — with numpy
import numpy as np
matrix = np.eye(3)
print(matrix)
print("det =", np.linalg.det(matrix))
\`\`\``,
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The code to execute in the chosen language.',
          },
          language: {
            type: 'string',
            enum: ['javascript', 'python'],
            description: 'Language to execute. Defaults to "javascript".',
          },
          input: {
            type: 'object',
            description:
              'Optional input data available as the "input" variable in the code.',
          },
          packages: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Python packages to install before execution (e.g. ["numpy", "pandas"]). Ignored for JavaScript.',
          },
          timeout: {
            type: 'number',
            description:
              'Maximum execution time in ms. Defaults: JS 5000, Python 60000. Limits: JS 30000, Python 300000.',
          },
        },
        required: ['code'],
      },
    },
  },
}
