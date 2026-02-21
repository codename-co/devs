/**
 * Sandboxed Code Runner — Pyodide Service
 *
 * A service that manages the Pyodide Web Worker lifecycle and provides
 * a clean API for executing Python scripts in a sandboxed environment.
 *
 * Key features:
 * - Lazy initialization: Pyodide (~25 MB WASM) loads only on first use
 * - Timeout enforcement: terminates the worker if execution exceeds the limit
 * - File I/O: maps input files to a virtual filesystem, collects outputs
 * - Package installation: auto-installs PyPI packages via micropip
 * - Event-based progress reporting
 *
 * @module lib/skills/sandboxed-code-runner
 */

// ============================================================================
// Types
// ============================================================================

/** Request to execute a Python script in the sandbox. */
export interface SandboxExecutionRequest {
  /** Python source code to execute */
  script: string
  /** Variables to inject into Python globals */
  context?: Record<string, unknown>
  /** PyPI packages to install before running */
  packages?: string[]
  /** Files to mount in the virtual filesystem */
  files?: SandboxInputFile[]
  /** Max execution time in ms (default: 60000) */
  timeout?: number
  /** Skill ID for tracing/logging */
  skillId?: string
  /** Script path for tracing/logging */
  scriptPath?: string
}

/** A file to mount in the sandbox virtual filesystem. */
export interface SandboxInputFile {
  /** Path in the virtual FS (e.g. "data.csv" → mounted at /input/data.csv) */
  path: string
  /** File content (text or base64-encoded binary) */
  content: string
  /** Content encoding: 'text' (default) or 'base64' */
  encoding?: 'text' | 'base64'
}

/** An output file produced by the script. */
export interface SandboxOutputFile {
  /** Path in the virtual FS (e.g. "/output/result.csv") */
  path: string
  /** File content */
  content: string
  /** Content encoding: 'text' or 'base64' */
  encoding: 'text' | 'base64'
}

/** Result of executing a script in the sandbox. */
export interface SandboxExecutionResult {
  /** Whether execution completed without errors */
  success: boolean
  /** Script return value (stringified) */
  result?: string
  /** Captured stdout output */
  stdout: string
  /** Captured stderr output */
  stderr: string
  /** Execution time in milliseconds */
  executionTimeMs: number
  /** Packages that were installed */
  packagesInstalled?: string[]
  /** Files written to /output/ */
  outputFiles?: SandboxOutputFile[]
  /** Error message if success is false */
  error?: string
}

/** State of the sandboxed code runner. */
export type SandboxState = 'idle' | 'loading' | 'ready' | 'executing' | 'error'

/** Progress event emitted during execution. */
export interface SandboxProgressEvent {
  type: 'loading' | 'progress'
  message: string
  requestId?: string
}

/** Listener for sandbox events. */
export type SandboxEventListener = (event: SandboxProgressEvent) => void

// ============================================================================
// Constants
// ============================================================================

/** Default execution timeout: 60 seconds */
const DEFAULT_TIMEOUT_MS = 60_000

/** Maximum execution timeout: 5 minutes */
const MAX_TIMEOUT_MS = 300_000

/** Minimum timeout: 5 seconds */
const MIN_TIMEOUT_MS = 5_000

// ============================================================================
// Package Aliases
// ============================================================================

/**
 * Common package name aliases.
 * Maps import names / informal names → actual PyPI / Pyodide package names.
 * Must be kept in sync with PACKAGE_ALIASES in pyodide-worker.js.
 */
export const PACKAGE_ALIASES: Record<string, string> = {
  pil: 'pillow',
  cv2: 'opencv-python',
  bs4: 'beautifulsoup4',
  yaml: 'pyyaml',
  sklearn: 'scikit-learn',
  skimage: 'scikit-image',
  dateutil: 'python-dateutil',
  attr: 'attrs',
  crypto: 'pycryptodome',
  serial: 'pyserial',
}

// ============================================================================
// Known Pyodide Packages
// ============================================================================

/**
 * Packages pre-compiled in Pyodide (available via `loadPackage`).
 * These include C extensions compiled to WASM.
 */
export const PYODIDE_BUILTIN_PACKAGES = new Set([
  'numpy',
  'pandas',
  'scipy',
  'matplotlib',
  'scikit-learn',
  'sklearn',
  'pillow',
  'PIL',
  'lxml',
  'beautifulsoup4',
  'bs4',
  'sqlalchemy',
  'sympy',
  'networkx',
  'shapely',
  'pyyaml',
  'yaml',
  'regex',
  'jsonschema',
  'jinja2',
  'markupsafe',
  'packaging',
  'certifi',
  'charset-normalizer',
  'idna',
  'urllib3',
  'six',
  'python-dateutil',
  'pytz',
  'setuptools',
  'wheel',
  'micropip',
  'pytest',
  'hypothesis',
  'attrs',
  'pluggy',
  'iniconfig',
  'tomli',
  'coverage',
  'cffi',
  'pycparser',
  'cryptography',
  'pyopenssl',
  'asn1crypto',
  'biopython',
  'astropy',
  'gdal',
  'fiona',
  'geopandas',
  'statsmodels',
  'patsy',
  'seaborn',
  'bokeh',
  'tornado',
  'ruamel.yaml',
  'msgpack',
  'cbor',
  'ujson',
  'orjson',
  'opencv-python',
  'cv2',
  'pywavelets',
])

/**
 * Packages known to NOT work with Pyodide (require system dependencies).
 */
export const PYODIDE_INCOMPATIBLE_PACKAGES = new Set([
  'pdf2image', // Requires poppler system binary
  'tesseract', // Requires tesseract-ocr binary
  'psycopg2', // Requires libpq
  'mysqlclient', // Requires libmysqlclient
  'torch', // Too large / uses CUDA
  'tensorflow', // Too large / requires GPU
  'playwright', // Requires browser binaries
])

/**
 * Check if a package is likely compatible with Pyodide.
 *
 * @returns 'builtin' if pre-compiled, 'micropip' if pure-Python (likely works),
 *          'incompatible' if known to not work, 'unknown' otherwise
 */
export function checkPackageCompatibility(
  packageName: string,
): 'builtin' | 'micropip' | 'incompatible' | 'unknown' {
  const normalized = packageName.toLowerCase().replace(/_/g, '-')

  // Check direct match first
  if (PYODIDE_BUILTIN_PACKAGES.has(normalized)) return 'builtin'
  if (PYODIDE_INCOMPATIBLE_PACKAGES.has(normalized)) return 'incompatible'

  // Check through alias resolution (e.g. 'pil' → 'pillow' → builtin)
  const alias = PACKAGE_ALIASES[normalized]
  if (alias) {
    const aliasNormalized = alias.toLowerCase().replace(/_/g, '-')
    if (PYODIDE_BUILTIN_PACKAGES.has(aliasNormalized)) return 'builtin'
    if (PYODIDE_INCOMPATIBLE_PACKAGES.has(aliasNormalized))
      return 'incompatible'
  }

  // Most pure-Python packages work via micropip
  return 'unknown'
}

// ============================================================================
// SandboxedCodeRunner
// ============================================================================

/**
 * Manages a Pyodide Web Worker for executing Python code in a sandboxed
 * environment. The worker is lazily created on first execution and can
 * be explicitly terminated.
 *
 * @example
 * ```typescript
 * import { sandboxedCodeRunner } from '@/lib/skills/sandboxed-code-runner'
 *
 * const result = await sandboxedCodeRunner.execute({
 *   script: 'import math; print(math.pi)',
 *   packages: [],
 *   timeout: 30000,
 * })
 *
 * console.log(result.stdout) // "3.141592653589793\n"
 * ```
 */
export class SandboxedCodeRunner {
  private worker: Worker | null = null
  private state: SandboxState = 'idle'
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null
  private readyReject: ((err: Error) => void) | null = null
  private listeners: Set<SandboxEventListener> = new Set()
  private pendingRequests: Map<
    string,
    {
      resolve: (result: SandboxExecutionResult) => void
      reject: (err: Error) => void
      timeoutId: ReturnType<typeof setTimeout> | null
    }
  > = new Map()

  /** Current state of the runner. */
  getState(): SandboxState {
    return this.state
  }

  /** Whether the Pyodide runtime is loaded and ready. */
  isReady(): boolean {
    return this.state === 'ready' || this.state === 'executing'
  }

  /**
   * Subscribe to progress events.
   *
   * @returns Unsubscribe function
   */
  onProgress(listener: SandboxEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Emit a progress event to all listeners. */
  private emitProgress(event: SandboxProgressEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (_) {
        // Don't let a listener error break execution
      }
    }
  }

  /**
   * Initialize the Pyodide worker. Called lazily on first `execute()`.
   * Can also be called explicitly to pre-warm the sandbox.
   *
   * @returns Promise that resolves when Pyodide is ready
   */
  async initialize(): Promise<void> {
    if (this.state === 'ready' || this.state === 'executing') return
    if (this.readyPromise) return this.readyPromise

    this.state = 'loading'

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })

    try {
      this.worker = new Worker(
        new URL('../../workers/pyodide-worker.js', import.meta.url),
        { type: 'classic' },
      )

      this.worker.onmessage = (e) => this.handleMessage(e)
      this.worker.onerror = (e) => this.handleError(e)
    } catch (err) {
      this.state = 'error'
      this.readyReject?.(err instanceof Error ? err : new Error(String(err)))
      this.readyPromise = null
      throw err
    }

    return this.readyPromise
  }

  /**
   * Execute a Python script in the sandbox.
   *
   * Initializes Pyodide lazily if not already loaded.
   *
   * @param request - Execution request
   * @returns Execution result
   */
  async execute(
    request: SandboxExecutionRequest,
  ): Promise<SandboxExecutionResult> {
    // Ensure Pyodide is loaded
    await this.initialize()

    const timeout = this.clampTimeout(request.timeout ?? DEFAULT_TIMEOUT_MS)
    const id = this.generateId()

    return new Promise<SandboxExecutionResult>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        this.terminateAndRespawn()
        resolve({
          success: false,
          error: `Execution timed out after ${timeout}ms`,
          stdout: '',
          stderr: '',
          executionTimeMs: timeout,
        })
      }, timeout)

      this.pendingRequests.set(id, { resolve, reject, timeoutId })

      this.state = 'executing'
      this.worker!.postMessage({
        type: 'execute',
        id,
        script: request.script,
        packages: request.packages ?? [],
        context: request.context ?? {},
        files: request.files ?? [],
      })
    })
  }

  /**
   * Terminate the current worker and reset state.
   * The next `execute()` call will create a fresh worker.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    // Reject all pending requests
    for (const [_id, pending] of this.pendingRequests) {
      if (pending.timeoutId) clearTimeout(pending.timeoutId)
      pending.resolve({
        success: false,
        error: 'Sandbox was terminated',
        stdout: '',
        stderr: '',
        executionTimeMs: 0,
      })
    }
    this.pendingRequests.clear()

    this.state = 'idle'
    this.readyPromise = null
    this.readyResolve = null
    this.readyReject = null
  }

  /**
   * Terminate the current worker and start a fresh one.
   * Used after timeouts or unrecoverable errors.
   */
  private terminateAndRespawn(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.state = 'idle'
    this.readyPromise = null
    this.readyResolve = null
    this.readyReject = null
    // Don't auto-respawn — next execute() will lazily re-init
  }

  // ── Message handling ────────────────────────────────────────────

  private handleMessage(e: MessageEvent): void {
    const msg = e.data

    switch (msg.type) {
      case 'ready':
        this.state = 'ready'
        this.readyResolve?.()
        break

      case 'loading':
        this.emitProgress({ type: 'loading', message: msg.message })
        break

      case 'progress': {
        this.emitProgress({
          type: 'progress',
          message: msg.message,
          requestId: msg.id,
        })
        break
      }

      case 'result': {
        const pending = this.pendingRequests.get(msg.id)
        if (pending) {
          if (pending.timeoutId) clearTimeout(pending.timeoutId)
          this.pendingRequests.delete(msg.id)

          // If that was an init error (id === '__init__'), reject the ready promise
          if (msg.id === '__init__' && !msg.success) {
            this.state = 'error'
            this.readyReject?.(new Error(msg.error))
            return
          }

          this.state = this.pendingRequests.size > 0 ? 'executing' : 'ready'
          pending.resolve({
            success: msg.success,
            result: msg.result,
            stdout: msg.stdout ?? '',
            stderr: msg.stderr ?? '',
            executionTimeMs: msg.executionTimeMs ?? 0,
            packagesInstalled: msg.packagesInstalled,
            outputFiles: msg.outputFiles,
            error: msg.error,
          })
        } else if (msg.id === '__init__' && !msg.success) {
          // Init failure without a pending promise (edge case)
          this.state = 'error'
          this.readyReject?.(new Error(msg.error))
        }
        break
      }
    }
  }

  private handleError(e: ErrorEvent): void {
    console.error('[SandboxedCodeRunner] Worker error:', e.message)
    this.state = 'error'
    this.readyReject?.(new Error(`Worker error: ${e.message}`))

    // Reject all pending requests
    for (const [_id, pending] of this.pendingRequests) {
      if (pending.timeoutId) clearTimeout(pending.timeoutId)
      pending.resolve({
        success: false,
        error: `Worker error: ${e.message}`,
        stdout: '',
        stderr: '',
        executionTimeMs: 0,
      })
    }
    this.pendingRequests.clear()
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private clampTimeout(timeout: number): number {
    return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, timeout))
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

// ============================================================================
// Singleton
// ============================================================================

/**
 * Global singleton instance of the sandboxed code runner.
 *
 * Usage:
 * ```typescript
 * import { sandboxedCodeRunner } from '@/lib/skills/sandboxed-code-runner'
 *
 * const result = await sandboxedCodeRunner.execute({ script: 'print("hello")' })
 * ```
 */
export const sandboxedCodeRunner = new SandboxedCodeRunner()
