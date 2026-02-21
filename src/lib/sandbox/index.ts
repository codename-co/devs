/**
 * Sandbox — Polyglot Code Execution Engine
 *
 * Provides a unified API for executing code in Python or JavaScript
 * inside fully isolated WASM sandboxes. Each language has its own
 * runtime engine (Pyodide for Python, QuickJS for JavaScript) but
 * shares a common request/response contract.
 *
 * @module lib/sandbox
 *
 * @example
 * ```typescript
 * import { sandbox } from '@/lib/sandbox'
 *
 * // Execute Python
 * const py = await sandbox.execute({
 *   language: 'python',
 *   code: 'import math; print(math.pi)',
 *   packages: ['numpy'],
 *   files: [{ path: 'data.csv', content: 'a,b\n1,2' }],
 * })
 * console.log(py.stdout) // "3.141592653589793\n"
 *
 * // Execute JavaScript
 * const js = await sandbox.execute({
 *   language: 'javascript',
 *   code: 'export default [1,2,3].reduce((a,b) => a+b, 0)',
 * })
 * console.log(js.result) // "6"
 *
 * // Pre-warm a runtime
 * await sandbox.warmup('python')
 * ```
 */

// ── Core ────────────────────────────────────────────────────────────
export { Sandbox, sandbox } from './sandbox'

// ── Types ───────────────────────────────────────────────────────────
export type {
  SandboxLanguage,
  SandboxRuntime,
  SandboxFile,
  SandboxRequest,
  SandboxResult,
  SandboxErrorType,
  SandboxConsoleEntry,
  SandboxState,
  SandboxProgressEvent,
  SandboxProgressListener,
  ISandboxRuntime,
} from './types'

export {
  LANGUAGE_RUNTIME_MAP,
  DEFAULT_TIMEOUTS,
  MAX_TIMEOUTS,
  MIN_TIMEOUT_MS,
} from './types'

// ── Runtimes ────────────────────────────────────────────────────────
export { PythonRuntime } from './runtimes/python'
export { JavaScriptRuntime } from './runtimes/javascript'

// ── Python-specific re-exports (package compatibility, etc.) ────────
export {
  checkPackageCompatibility,
  PACKAGE_ALIASES,
  PYODIDE_BUILTIN_PACKAGES,
  PYODIDE_INCOMPATIBLE_PACKAGES,
} from './runtimes/python'
