/**
 * Sandbox — Polyglot Code Execution Engine
 *
 * Central class that provides a unified API for executing code in any
 * supported language. Routes requests to the appropriate runtime (Pyodide
 * for Python, QuickJS for JavaScript) and normalizes results.
 *
 * All runtimes share:
 * - WASM-level isolation (no host access)
 * - Timeout enforcement
 * - Consistent result format
 * - Progress event reporting
 *
 * @module lib/sandbox/sandbox
 *
 * @example
 * ```typescript
 * import { sandbox } from '@/lib/sandbox'
 *
 * // Python
 * const py = await sandbox.execute({
 *   language: 'python',
 *   code: 'import math; print(math.pi)',
 *   packages: ['numpy'],
 * })
 *
 * // JavaScript
 * const js = await sandbox.execute({
 *   language: 'javascript',
 *   code: 'export default [1,2,3].reduce((a,b) => a+b, 0)',
 * })
 * ```
 */

import { PythonRuntime } from './runtimes/python'
import { JavaScriptRuntime } from './runtimes/javascript'
import type {
  ISandboxRuntime,
  SandboxLanguage,
  SandboxRequest,
  SandboxResult,
  SandboxState,
  SandboxProgressEvent,
  SandboxProgressListener,
} from './types'

// ============================================================================
// Sandbox
// ============================================================================

/**
 * Polyglot sandbox that routes code execution to the appropriate
 * WASM-isolated runtime.
 *
 * - Lazily creates runtimes on first use for each language
 * - Provides a single progress event stream across all runtimes
 * - Manages runtime lifecycle (init, terminate, restart)
 */
export class Sandbox {
  private runtimes: Map<SandboxLanguage, ISandboxRuntime> = new Map()
  private listeners: Set<SandboxProgressListener> = new Set()

  /**
   * Execute code in the specified language.
   *
   * @param request - Execution request including language, code, and options
   * @returns Normalized execution result
   */
  async execute(request: SandboxRequest): Promise<SandboxResult> {
    const { language } = request

    if (!this.isSupportedLanguage(language)) {
      return {
        success: false,
        error: `Unsupported language: "${language}". Supported: ${this.getSupportedLanguages().join(', ')}`,
        errorType: 'runtime',
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 0,
        language: language ?? ('unknown' as SandboxLanguage),
      }
    }

    const runtime = this.getOrCreateRuntime(language)

    // Wrap progress listener to also emit to sandbox-level listeners
    const onProgress: SandboxProgressListener = (event) => {
      this.emitProgress(event)
    }

    return runtime.execute(request, onProgress)
  }

  /**
   * Pre-warm a specific runtime so the first execute() is instant.
   *
   * @param language - Language runtime to pre-warm
   */
  async warmup(language: SandboxLanguage): Promise<void> {
    const runtime = this.getOrCreateRuntime(language)
    await runtime.initialize()
  }

  /**
   * Terminate a specific runtime and free resources.
   * The next execute() for that language will lazily re-init.
   *
   * @param language - Language runtime to terminate
   */
  terminate(language: SandboxLanguage): void {
    const runtime = this.runtimes.get(language)
    if (runtime) {
      runtime.terminate()
      this.runtimes.delete(language)
    }
  }

  /**
   * Terminate all runtimes and free all resources.
   */
  terminateAll(): void {
    for (const [_lang, runtime] of this.runtimes) {
      runtime.terminate()
    }
    this.runtimes.clear()
  }

  /**
   * Get the state of a specific language runtime.
   *
   * @param language - Language to check
   * @returns Runtime state, or 'idle' if not initialized
   */
  getState(language: SandboxLanguage): SandboxState {
    return this.runtimes.get(language)?.getState() ?? 'idle'
  }

  /**
   * Check whether a language runtime is loaded and ready.
   *
   * @param language - Language to check
   */
  isReady(language: SandboxLanguage): boolean {
    return this.runtimes.get(language)?.isReady() ?? false
  }

  /**
   * Get all currently loaded runtimes and their states.
   */
  getRuntimeStates(): Record<SandboxLanguage, SandboxState> {
    const states: Partial<Record<SandboxLanguage, SandboxState>> = {}
    for (const [lang, runtime] of this.runtimes) {
      states[lang] = runtime.getState()
    }
    return states as Record<SandboxLanguage, SandboxState>
  }

  /**
   * Get the list of supported languages.
   */
  getSupportedLanguages(): SandboxLanguage[] {
    return ['python', 'javascript']
  }

  /**
   * Subscribe to progress events from any runtime.
   *
   * @param listener - Progress listener
   * @returns Unsubscribe function
   */
  onProgress(listener: SandboxProgressListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Access the underlying runtime for a language.
   * Useful for runtime-specific features (e.g. Python file bridge).
   *
   * @param language - Language runtime to access
   * @returns Runtime instance, or undefined if not initialized
   */
  getRuntime(language: SandboxLanguage): ISandboxRuntime | undefined {
    return this.runtimes.get(language)
  }

  // ── Internal ──────────────────────────────────────────────────

  private isSupportedLanguage(lang: string): lang is SandboxLanguage {
    return ['python', 'javascript'].includes(lang)
  }

  private getOrCreateRuntime(language: SandboxLanguage): ISandboxRuntime {
    let runtime = this.runtimes.get(language)
    if (!runtime) {
      runtime = this.createRuntime(language)
      this.runtimes.set(language, runtime)
    }
    return runtime
  }

  private createRuntime(language: SandboxLanguage): ISandboxRuntime {
    switch (language) {
      case 'python':
        return new PythonRuntime()
      case 'javascript':
        return new JavaScriptRuntime()
      default:
        throw new Error(`No runtime registered for language: "${language}"`)
    }
  }

  private emitProgress(event: SandboxProgressEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (_) {
        // Don't let a listener error break execution
      }
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

/**
 * Global singleton instance of the polyglot sandbox.
 *
 * @example
 * ```typescript
 * import { sandbox } from '@/lib/sandbox'
 *
 * const result = await sandbox.execute({
 *   language: 'python',
 *   code: 'print("Hello from Python!")',
 * })
 * ```
 */
export const sandbox = new Sandbox()
