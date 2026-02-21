/**
 * Python Runtime — Pyodide Adapter
 *
 * Adapts the existing Pyodide Web Worker (sandboxed-code-runner) to the
 * unified ISandboxRuntime interface. This is a thin wrapper that delegates
 * to the proven SandboxedCodeRunner class and normalizes its output.
 *
 * Isolation model:
 * - Web Worker thread (no DOM, no localStorage, no IndexedDB)
 * - Emscripten WASM virtual filesystem
 * - Timeout via Worker.terminate()
 *
 * @module lib/sandbox/runtimes/python
 */

import {
  SandboxedCodeRunner,
  checkPackageCompatibility,
  PACKAGE_ALIASES,
  PYODIDE_BUILTIN_PACKAGES,
  PYODIDE_INCOMPATIBLE_PACKAGES,
} from '@/lib/skills/sandboxed-code-runner'
import type {
  SandboxExecutionRequest,
  SandboxExecutionResult as PyodideResult,
  SandboxState as PyodideState,
} from '@/lib/skills/sandboxed-code-runner'
import type {
  ISandboxRuntime,
  SandboxRequest,
  SandboxResult,
  SandboxState,
  SandboxProgressListener,
  SandboxConsoleEntry,
} from '../types'

// ============================================================================
// Python Runtime
// ============================================================================

/**
 * Python runtime powered by Pyodide (CPython 3.11 compiled to WebAssembly).
 *
 * Features:
 * - Full CPython 3.11 with standard library
 * - Package installation via micropip (60+ pre-compiled WASM packages)
 * - Virtual filesystem for file I/O
 * - Off-main-thread execution via Web Worker
 * - Timeout enforcement via Worker.terminate()
 */
export class PythonRuntime implements ISandboxRuntime {
  readonly language = 'python' as const
  private runner: SandboxedCodeRunner

  constructor() {
    this.runner = new SandboxedCodeRunner()
  }

  getState(): SandboxState {
    return this.mapState(this.runner.getState())
  }

  isReady(): boolean {
    return this.runner.isReady()
  }

  async initialize(): Promise<void> {
    return this.runner.initialize()
  }

  async execute(
    request: SandboxRequest,
    onProgress?: SandboxProgressListener,
  ): Promise<SandboxResult> {
    const startTime = performance.now()

    // Subscribe to progress events from the Pyodide runner
    let unsubscribe: (() => void) | undefined
    if (onProgress) {
      unsubscribe = this.runner.onProgress((event) => {
        onProgress({
          type: event.type === 'loading' ? 'loading' : 'executing',
          message: event.message,
          language: 'python',
          requestId: event.requestId,
        })
      })
    }

    try {
      // Build Pyodide-specific request
      const pyRequest: SandboxExecutionRequest = {
        script: request.code,
        context: request.context,
        packages: request.packages,
        files: request.files,
        timeout: request.timeout,
        skillId: request.traceId,
        scriptPath: request.label,
      }

      const pyResult = await this.runner.execute(pyRequest)
      return this.normalizeResult(pyResult, startTime)
    } finally {
      unsubscribe?.()
    }
  }

  terminate(): void {
    this.runner.terminate()
  }

  /**
   * Access the underlying SandboxedCodeRunner for advanced use cases
   * (e.g. subscribing to progress events directly).
   */
  getRunner(): SandboxedCodeRunner {
    return this.runner
  }

  // ── Normalization ─────────────────────────────────────────────

  private normalizeResult(
    pyResult: PyodideResult,
    startTime: number,
  ): SandboxResult {
    const console: SandboxConsoleEntry[] = []

    // Map stdout to console entries
    if (pyResult.stdout.trim()) {
      console.push({
        type: 'stdout',
        args: [pyResult.stdout],
        timestamp: performance.now() - startTime,
      })
    }

    // Map stderr to console entries
    if (pyResult.stderr.trim()) {
      console.push({
        type: 'stderr',
        args: [pyResult.stderr],
        timestamp: performance.now() - startTime,
      })
    }

    return {
      success: pyResult.success,
      result: pyResult.result,
      stdout: pyResult.stdout,
      stderr: pyResult.stderr,
      console,
      executionTimeMs: pyResult.executionTimeMs,
      outputFiles: pyResult.outputFiles,
      packagesInstalled: pyResult.packagesInstalled,
      error: pyResult.error,
      errorType: pyResult.error ? this.classifyPythonError(pyResult.error) : undefined,
      language: 'python',
    }
  }

  private classifyPythonError(
    error: string,
  ): SandboxResult['errorType'] {
    const lower = error.toLowerCase()
    if (lower.includes('timed out') || lower.includes('timeout'))
      return 'timeout'
    if (lower.includes('syntaxerror')) return 'syntax'
    if (lower.includes('memoryerror')) return 'memory'
    if (lower.includes('permission') || lower.includes('security'))
      return 'security'
    return 'runtime'
  }

  private mapState(pyState: PyodideState): SandboxState {
    // States are identical, but this ensures type correctness
    return pyState
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  checkPackageCompatibility,
  PACKAGE_ALIASES,
  PYODIDE_BUILTIN_PACKAGES,
  PYODIDE_INCOMPATIBLE_PACKAGES,
}
