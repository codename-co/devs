/**
 * JavaScript Runtime — QuickJS Adapter
 *
 * Adapts the existing QuickJS WASM sandbox (code-tools) to the unified
 * ISandboxRuntime interface. Normalizes QuickJS results into common
 * SandboxResult format.
 *
 * Isolation model:
 * - QuickJS WASM sandbox (no host JS environment access)
 * - Memory limit: 32 MB
 * - Timeout via QuickJS interrupt handler
 * - No DOM, no network, no filesystem
 *
 * @module lib/sandbox/runtimes/javascript
 */

import {
  executeInSandbox,
  formatResult,
  destroySandbox,
} from '@/lib/code-tools/sandbox'
import type { SandboxExecutionResult as QuickJsInternalResult } from '@/lib/code-tools/sandbox'
import type { ConsoleEntry } from '@/lib/code-tools/types'
import type {
  ISandboxRuntime,
  SandboxRequest,
  SandboxResult,
  SandboxState,
  SandboxProgressListener,
  SandboxConsoleEntry,
} from '../types'

// ============================================================================
// Constants
// ============================================================================

/** Maximum code length in characters */
const MAX_CODE_LENGTH = 100_000

// ============================================================================
// JavaScript Runtime
// ============================================================================

/**
 * JavaScript runtime powered by QuickJS (compiled to WebAssembly).
 *
 * Features:
 * - Full ES2020 JavaScript support
 * - Complete WASM isolation (no access to host environment)
 * - 32 MB memory limit per execution
 * - Per-call VM creation (stateless between executions)
 * - Console output capture (log, warn, error, info, debug)
 * - Context injection via `input` variable
 * - Return values via `export default`
 */
export class JavaScriptRuntime implements ISandboxRuntime {
  readonly language = 'javascript' as const
  private state: SandboxState = 'idle'

  getState(): SandboxState {
    return this.state
  }

  isReady(): boolean {
    // QuickJS is stateless — always ready once WASM module is cached.
    // The module loads lazily on first execute, so we report ready
    // if we've ever successfully executed.
    return this.state === 'ready' || this.state === 'idle'
  }

  async initialize(): Promise<void> {
    // QuickJS initializes lazily on first evalCode via getQuickJS().
    // We could pre-warm here, but it adds ~500ms for little benefit.
    this.state = 'ready'
  }

  async execute(
    request: SandboxRequest,
    onProgress?: SandboxProgressListener,
  ): Promise<SandboxResult> {
    const startTime = performance.now()
    const code = request.code?.trim()

    // Validate code
    if (!code) {
      return {
        success: false,
        error: 'Code is required and cannot be empty',
        errorType: 'syntax',
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 0,
        language: 'javascript',
      }
    }

    if (code.length > MAX_CODE_LENGTH) {
      return {
        success: false,
        error: `Code too long (max ${MAX_CODE_LENGTH} characters)`,
        errorType: 'security',
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 0,
        language: 'javascript',
      }
    }

    this.state = 'executing'
    onProgress?.({
      type: 'executing',
      message: 'Running JavaScript…',
      language: 'javascript',
    })

    try {
      const timeout = request.timeout ?? 5000
      const input = request.context ?? undefined

      const internalResult = await executeInSandbox(code, input, timeout)
      const executionTimeMs = Math.round(
        (performance.now() - startTime) * 100,
      ) / 100

      this.state = 'ready'

      return this.normalizeResult(internalResult, executionTimeMs)
    } catch (err) {
      this.state = 'ready'
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        errorType: 'runtime',
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: Math.round(
          (performance.now() - startTime) * 100,
        ) / 100,
        language: 'javascript',
      }
    }
  }

  terminate(): void {
    destroySandbox()
    this.state = 'idle'
  }

  // ── Normalization ─────────────────────────────────────────────

  private normalizeResult(
    internal: QuickJsInternalResult,
    executionTimeMs: number,
  ): SandboxResult {
    // Convert QuickJS ConsoleEntry[] to SandboxConsoleEntry[]
    const consoleEntries: SandboxConsoleEntry[] = (internal.console ?? []).map(
      (entry: ConsoleEntry) => ({
        type: entry.type,
        args: entry.args,
        timestamp: entry.timestamp,
      }),
    )

    // Build stdout from console.log entries (for symmetry with Python)
    const stdout = consoleEntries
      .filter((e) => e.type === 'log' || e.type === 'info')
      .map((e) => e.args.join(' '))
      .join('\n')

    // Build stderr from console.error/warn entries
    const stderr = consoleEntries
      .filter((e) => e.type === 'error' || e.type === 'warn')
      .map((e) => e.args.join(' '))
      .join('\n')

    // Format the result value
    const resultStr =
      internal.result !== undefined ? formatResult(internal.result) : undefined

    return {
      success: internal.success,
      result: resultStr,
      stdout,
      stderr,
      console: consoleEntries,
      executionTimeMs,
      error: internal.error,
      errorType: internal.errorType,
      language: 'javascript',
    }
  }
}
