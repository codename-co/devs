/**
 * Code Tools Module
 *
 * Provides a secure code execution tool for LLM agents.
 * Executes JavaScript code in a QuickJS WebAssembly sandbox.
 *
 * Features:
 * - Full ES2020 JavaScript support
 * - True WASM isolation (no access to host environment)
 * - Console output capture (log, warn, error, info, debug)
 * - Input data injection for parameterized execution
 * - Memory and execution time limits
 * - No access to browser APIs, network, or file system
 *
 * @module lib/code-tools
 *
 * @example
 * ```typescript
 * import { execute, CODE_TOOL_DEFINITIONS } from '@/lib/code-tools'
 *
 * // Simple calculation (use export default to return value)
 * const result = await execute({
 *   code: 'export default 2 + 2'
 * })
 *
 * // With input data
 * const result = await execute({
 *   code: 'export default input.numbers.reduce((a, b) => a + b, 0)',
 *   input: { numbers: [1, 2, 3, 4, 5] }
 * })
 *
 * // Complex algorithm with console output
 * const result = await execute({
 *   code: `
 *     function fib(n) {
 *       if (n <= 1) return n;
 *       return fib(n - 1) + fib(n - 2);
 *     }
 *     const result = fib(10);
 *     console.log('Fibonacci(10) =', result);
 *     export default result;
 *   `
 * })
 *
 * // Get tool definition for LLM
 * const toolDef = CODE_TOOL_DEFINITIONS.execute
 * ```
 */

export {
  execute,
  isExecuteError,
  isExecuteSuccess,
  CODE_TOOL_DEFINITIONS,
} from './service'

export { executeInSandbox, formatResult, destroySandbox } from './sandbox'

export type {
  ExecuteParams,
  ExecuteResult,
  ExecuteError,
  ConsoleEntry,
  CodeToolName,
} from './types'
