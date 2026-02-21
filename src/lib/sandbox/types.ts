/**
 * Sandbox Types
 *
 * Unified type definitions for the polyglot code execution sandbox.
 * Supports Python (Pyodide) and JavaScript (QuickJS) runtimes with
 * a common request/response contract and consistent capabilities.
 *
 * @module lib/sandbox/types
 */

// ============================================================================
// Language & Runtime
// ============================================================================

/** Supported sandbox languages. Extensible for future runtimes. */
export type SandboxLanguage = 'python' | 'javascript'

/** Runtime engine powering each language. */
export type SandboxRuntime = 'pyodide' | 'quickjs'

/** Map from language to default runtime. */
export const LANGUAGE_RUNTIME_MAP: Record<SandboxLanguage, SandboxRuntime> = {
  python: 'pyodide',
  javascript: 'quickjs',
}

// ============================================================================
// Request
// ============================================================================

/** A file to mount in the sandbox virtual filesystem. */
export interface SandboxFile {
  /** Path in the virtual FS (e.g. "data.csv" → /input/data.csv) */
  path: string
  /** File content (text or base64-encoded binary) */
  content: string
  /** Content encoding: 'text' (default) or 'base64' */
  encoding?: 'text' | 'base64'
}

/** Request to execute code in the sandbox. */
export interface SandboxRequest {
  /** Language to execute */
  language: SandboxLanguage
  /** Source code to execute */
  code: string
  /** Variables to inject into the execution context */
  context?: Record<string, unknown>
  /** Packages to install before running (language-appropriate) */
  packages?: string[]
  /** Files to mount in the virtual filesystem */
  files?: SandboxFile[]
  /** Max execution time in ms */
  timeout?: number
  /** Trace identifier for logging/observability */
  traceId?: string
  /** Human-readable label for logging */
  label?: string
}

// ============================================================================
// Result
// ============================================================================

/** Classified error types across all runtimes. */
export type SandboxErrorType =
  | 'syntax'
  | 'runtime'
  | 'timeout'
  | 'memory'
  | 'security'

/** Console entry captured during execution. */
export interface SandboxConsoleEntry {
  /** Console method or output stream */
  type: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'stdout' | 'stderr'
  /** Stringified output */
  args: string[]
  /** Timestamp relative to execution start (ms) */
  timestamp: number
}

/** Result of executing code in the sandbox. */
export interface SandboxResult {
  /** Whether execution completed without errors */
  success: boolean
  /** Return value (stringified) */
  result?: string
  /** Captured stdout output (Python) or empty string (JS) */
  stdout: string
  /** Captured stderr output (Python) or empty string (JS) */
  stderr: string
  /** Captured console entries (JS) or mapped from stdout/stderr (Python) */
  console: SandboxConsoleEntry[]
  /** Execution time in milliseconds */
  executionTimeMs: number
  /** Output files written to /output/ */
  outputFiles?: SandboxFile[]
  /** Packages that were installed */
  packagesInstalled?: string[]
  /** Error message if success is false */
  error?: string
  /** Classified error type if success is false */
  errorType?: SandboxErrorType
  /** Language that was executed */
  language: SandboxLanguage
}

// ============================================================================
// State & Events
// ============================================================================

/** State of the sandbox. */
export type SandboxState = 'idle' | 'loading' | 'ready' | 'executing' | 'error'

/** Progress event emitted during execution. */
export interface SandboxProgressEvent {
  type: 'loading' | 'installing' | 'executing' | 'complete'
  message: string
  language?: SandboxLanguage
  requestId?: string
}

/** Listener for sandbox progress events. */
export type SandboxProgressListener = (event: SandboxProgressEvent) => void

// ============================================================================
// Runtime Interface
// ============================================================================

/**
 * Interface that each language runtime must implement.
 *
 * Runtimes are responsible for:
 * - Managing their execution engine lifecycle (lazy init, teardown)
 * - Translating SandboxRequest → runtime-specific execution
 * - Normalizing results into SandboxResult
 * - Timeout enforcement
 * - Progress reporting
 */
export interface ISandboxRuntime {
  /** The language this runtime handles. */
  readonly language: SandboxLanguage

  /** Current state of the runtime. */
  getState(): SandboxState

  /** Whether the runtime is loaded and ready to execute. */
  isReady(): boolean

  /**
   * Initialize the runtime engine.
   * Called lazily on first execute() or explicitly to pre-warm.
   */
  initialize(): Promise<void>

  /**
   * Execute code and return a normalized result.
   *
   * @param request - The execution request
   * @param onProgress - Optional progress callback
   * @returns Normalized execution result
   */
  execute(
    request: SandboxRequest,
    onProgress?: SandboxProgressListener,
  ): Promise<SandboxResult>

  /**
   * Terminate the runtime and free all resources.
   * The next execute() call should lazily re-initialize.
   */
  terminate(): void
}

// ============================================================================
// Constants
// ============================================================================

/** Default execution timeouts per language (ms). */
export const DEFAULT_TIMEOUTS: Record<SandboxLanguage, number> = {
  python: 60_000,
  javascript: 5_000,
}

/** Maximum execution timeouts per language (ms). */
export const MAX_TIMEOUTS: Record<SandboxLanguage, number> = {
  python: 300_000,
  javascript: 30_000,
}

/** Minimum timeout for any language (ms). */
export const MIN_TIMEOUT_MS = 5_000
