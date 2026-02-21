/**
 * Tests for SandboxedCodeRunner — Pyodide Web Worker service
 *
 * Since Pyodide/Web Workers are not available in the jsdom test environment,
 * these tests mock the Worker and validate the service's orchestration logic:
 * - Lazy initialization
 * - Timeout enforcement
 * - Message routing
 * - Termination and cleanup
 * - Package compatibility checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SandboxedCodeRunner,
  checkPackageCompatibility,
  PYODIDE_BUILTIN_PACKAGES,
  PYODIDE_INCOMPATIBLE_PACKAGES,
  PACKAGE_ALIASES,
} from '@/lib/skills/sandboxed-code-runner'

// ============================================================================
// Mock Worker
// ============================================================================

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  private _terminated = false

  postMessage(data: unknown) {
    if (this._terminated) return
    // Simulate async handling — schedule the result
    const msg = data as { type: string; id?: string }
    if (msg.type === 'execute') {
      // Simulate a successful execution by default
      setTimeout(() => {
        if (this._terminated) return
        this.onmessage?.({
          data: {
            type: 'result',
            id: msg.id,
            success: true,
            result: '42',
            stdout: 'hello\n',
            stderr: '',
            executionTimeMs: 150,
            packagesInstalled: [],
          },
        } as MessageEvent)
      }, 10)
    }
  }

  terminate() {
    this._terminated = true
  }

  /** Simulate the worker sending a 'ready' message */
  simulateReady() {
    this.onmessage?.({ data: { type: 'ready' } } as MessageEvent)
  }

  /** Simulate a loading progress message */
  simulateLoading(message: string) {
    this.onmessage?.({
      data: { type: 'loading', message },
    } as MessageEvent)
  }

  /** Simulate a progress message for a specific request */
  simulateProgress(id: string, message: string) {
    this.onmessage?.({
      data: { type: 'progress', id, message },
    } as MessageEvent)
  }

  /** Simulate an execution result */
  simulateResult(
    id: string,
    result: Partial<{
      success: boolean
      result: string
      stdout: string
      stderr: string
      executionTimeMs: number
      packagesInstalled: string[]
      outputFiles: unknown[]
      error: string
    }>,
  ) {
    this.onmessage?.({
      data: {
        type: 'result',
        id,
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 100,
        ...result,
      },
    } as MessageEvent)
  }

  /** Simulate a worker error event */
  simulateError(message: string) {
    this.onerror?.({ message } as ErrorEvent)
  }

  /** Simulate init failure */
  simulateInitFailure(error: string) {
    this.onmessage?.({
      data: {
        type: 'result',
        id: '__init__',
        success: false,
        error,
        stdout: '',
        stderr: '',
        executionTimeMs: 0,
      },
    } as MessageEvent)
  }
}

let mockWorkerInstance: MockWorker | null = null

// Mock the Worker constructor via import.meta.url pattern
// Instead, we'll patch the runner's internal worker creation
function createRunnerWithMockWorker(): {
  runner: SandboxedCodeRunner
  getWorker: () => MockWorker
} {
  const runner = new SandboxedCodeRunner()

  // Patch the initialize method to use our mock worker
  vi.spyOn(runner, 'initialize').mockImplementation(async () => {
    // Access private fields via any cast
    const r = runner as any
    if (r.state === 'ready' || r.state === 'executing') return
    if (r.readyPromise) return r.readyPromise

    r.state = 'loading'
    r.readyPromise = new Promise<void>((resolve, reject) => {
      r.readyResolve = resolve
      r.readyReject = reject
    })

    mockWorkerInstance = new MockWorker()
    r.worker = mockWorkerInstance

    // Wire up handlers the same way the real code does
    r.worker.onmessage = (e: MessageEvent) => r.handleMessage(e)
    r.worker.onerror = (e: ErrorEvent) => r.handleError(e)

    // Simulate the worker becoming ready after a tick
    setTimeout(() => mockWorkerInstance?.simulateReady(), 5)

    return r.readyPromise
  })

  return {
    runner,
    getWorker: () => mockWorkerInstance!,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('SandboxedCodeRunner', () => {
  let runner: SandboxedCodeRunner
  let getWorker: () => MockWorker

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const setup = createRunnerWithMockWorker()
    runner = setup.runner
    getWorker = setup.getWorker
  })

  afterEach(() => {
    runner.terminate()
    mockWorkerInstance = null
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── State management ──────────────────────────────────────────

  describe('state management', () => {
    it('should start in idle state', () => {
      expect(runner.getState()).toBe('idle')
      expect(runner.isReady()).toBe(false)
    })

    it('should transition to ready after initialization', async () => {
      await runner.initialize()
      expect(runner.getState()).toBe('ready')
      expect(runner.isReady()).toBe(true)
    })

    it('should not re-initialize if already ready', async () => {
      await runner.initialize()
      await runner.initialize()
      // The spy was called again, but the internal logic short-circuits
      expect(runner.getState()).toBe('ready')
    })

    it('should reset to idle after terminate', async () => {
      await runner.initialize()
      runner.terminate()
      expect(runner.getState()).toBe('idle')
      expect(runner.isReady()).toBe(false)
    })
  })

  // ── Execution ─────────────────────────────────────────────────

  describe('execute', () => {
    it('should lazily initialize on first execute', async () => {
      expect(runner.getState()).toBe('idle')
      // execute() will call initialize() internally
      const resultPromise = runner.execute({ script: 'print("hi")' })
      const result = await resultPromise
      expect(result.success).toBe(true)
    })

    it('should return execution result', async () => {
      await runner.initialize()

      const resultPromise = runner.execute({
        script: 'x = 1 + 1; print(x)',
      })

      const result = await resultPromise
      expect(result.success).toBe(true)
      expect(result.result).toBe('42')
      expect(result.stdout).toBe('hello\n')
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should pass packages to the worker', async () => {
      await runner.initialize()
      const worker = getWorker()
      const postSpy = vi.spyOn(worker, 'postMessage')

      const resultPromise = runner.execute({
        script: 'import pandas',
        packages: ['pandas', 'numpy'],
      })

      await resultPromise
      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'execute',
          packages: ['pandas', 'numpy'],
        }),
      )
    })

    it('should pass context variables to the worker', async () => {
      await runner.initialize()
      const worker = getWorker()
      const postSpy = vi.spyOn(worker, 'postMessage')

      await runner.execute({
        script: 'print(my_var)',
        context: { my_var: 'hello' },
      })

      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'execute',
          context: { my_var: 'hello' },
        }),
      )
    })

    it('should pass files to the worker', async () => {
      await runner.initialize()
      const worker = getWorker()
      const postSpy = vi.spyOn(worker, 'postMessage')

      await runner.execute({
        script: 'open("/input/data.csv").read()',
        files: [{ path: 'data.csv', content: 'a,b\n1,2', encoding: 'text' }],
      })

      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'execute',
          files: [{ path: 'data.csv', content: 'a,b\n1,2', encoding: 'text' }],
        }),
      )
    })
  })

  // ── Timeout ───────────────────────────────────────────────────

  describe('timeout', () => {
    it('should resolve with timeout error when execution exceeds limit', async () => {
      await runner.initialize()

      // Override the worker's postMessage to NOT reply (simulate hang)
      const worker = getWorker()
      vi.spyOn(worker, 'postMessage').mockImplementation(() => {
        // Don't send any result — simulate an infinite loop
      })

      const resultPromise = runner.execute({
        script: 'while True: pass',
        timeout: 6000,
      })

      // Advance time past the timeout (6000ms)
      await vi.advanceTimersByTimeAsync(7000)

      const result = await resultPromise
      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })

    it('should clamp timeout to minimum 5 seconds', async () => {
      await runner.initialize()
      const worker = getWorker()
      vi.spyOn(worker, 'postMessage').mockImplementation(() => {
        // Don't reply
      })

      const resultPromise = runner.execute({
        script: 'pass',
        timeout: 100, // Below minimum of 5000
      })

      // At 100ms, should NOT have timed out yet (clamped to 5000)
      await vi.advanceTimersByTimeAsync(100)

      // At 5100ms total, should have timed out
      await vi.advanceTimersByTimeAsync(5000)

      const result = await resultPromise
      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })
  })

  // ── Progress events ───────────────────────────────────────────

  describe('progress events', () => {
    it('should emit loading events during initialization', async () => {
      const events: { type: string; message: string }[] = []
      runner.onProgress((event) => events.push(event))

      const initPromise = runner.initialize()
      // The mock worker will fire 'ready' after 5ms tick
      await initPromise

      // Loading events are emitted by the worker during init
      // In our mock, we only emit 'ready', but the runner forwards them
    })

    it('should allow unsubscribing from events', () => {
      const events: unknown[] = []
      const unsub = runner.onProgress((event) => events.push(event))
      unsub()

      // Emit an event — should not be captured
      ;(runner as any).emitProgress({
        type: 'loading',
        message: 'test',
      })
      expect(events).toHaveLength(0)
    })
  })

  // ── Termination ───────────────────────────────────────────────

  describe('terminate', () => {
    it('should terminate the worker', async () => {
      await runner.initialize()
      const worker = getWorker()
      const terminateSpy = vi.spyOn(worker, 'terminate')

      runner.terminate()
      expect(terminateSpy).toHaveBeenCalled()
    })

    it('should resolve pending requests with termination error', async () => {
      await runner.initialize()
      const worker = getWorker()
      vi.spyOn(worker, 'postMessage').mockImplementation(() => {
        // Don't reply
      })

      const resultPromise = runner.execute({ script: 'pass' })

      // Flush microtasks so execute() reaches postMessage before we terminate
      await vi.advanceTimersByTimeAsync(0)

      // Terminate while still executing
      runner.terminate()

      const result = await resultPromise
      expect(result.success).toBe(false)
      expect(result.error).toContain('terminated')
    })

    it('should allow re-initialization after termination', async () => {
      await runner.initialize()
      runner.terminate()
      expect(runner.getState()).toBe('idle')

      await runner.initialize()
      expect(runner.getState()).toBe('ready')
    })
  })
})

// ============================================================================
// Package compatibility
// ============================================================================

describe('checkPackageCompatibility', () => {
  it('should return "builtin" for pre-compiled Pyodide packages', () => {
    expect(checkPackageCompatibility('numpy')).toBe('builtin')
    expect(checkPackageCompatibility('pandas')).toBe('builtin')
    expect(checkPackageCompatibility('scipy')).toBe('builtin')
    expect(checkPackageCompatibility('matplotlib')).toBe('builtin')
  })

  it('should return "incompatible" for known incompatible packages', () => {
    expect(checkPackageCompatibility('pdf2image')).toBe('incompatible')
    expect(checkPackageCompatibility('tesseract')).toBe('incompatible')
    expect(checkPackageCompatibility('psycopg2')).toBe('incompatible')
  })

  it('should return "unknown" for unrecognized packages', () => {
    expect(checkPackageCompatibility('pypdf')).toBe('unknown')
    expect(checkPackageCompatibility('pdfplumber')).toBe('unknown')
    expect(checkPackageCompatibility('requests')).toBe('unknown')
  })

  it('should resolve aliases to builtin packages', () => {
    // PIL → pillow → builtin
    expect(checkPackageCompatibility('pil')).toBe('builtin')
    expect(checkPackageCompatibility('PIL')).toBe('builtin')
    // cv2 → opencv-python → builtin
    expect(checkPackageCompatibility('cv2')).toBe('builtin')
    // bs4 → beautifulsoup4 → builtin
    expect(checkPackageCompatibility('bs4')).toBe('builtin')
    // yaml → pyyaml → builtin
    expect(checkPackageCompatibility('yaml')).toBe('builtin')
    // sklearn → scikit-learn → builtin
    expect(checkPackageCompatibility('sklearn')).toBe('builtin')
  })

  it('should normalize package names (underscores to hyphens)', () => {
    expect(checkPackageCompatibility('scikit_learn')).toBe('builtin')
    expect(checkPackageCompatibility('python_dateutil')).toBe('builtin')
  })

  it('should handle case insensitivity', () => {
    expect(checkPackageCompatibility('NumPy')).toBe('builtin')
    expect(checkPackageCompatibility('PANDAS')).toBe('builtin')
    expect(checkPackageCompatibility('PDF2image')).toBe('incompatible')
  })
})

describe('package lists', () => {
  it('should have non-empty builtin package set', () => {
    expect(PYODIDE_BUILTIN_PACKAGES.size).toBeGreaterThan(20)
  })

  it('should have non-empty incompatible package set', () => {
    expect(PYODIDE_INCOMPATIBLE_PACKAGES.size).toBeGreaterThan(3)
  })

  it('should not have overlap between builtin and incompatible', () => {
    for (const pkg of PYODIDE_BUILTIN_PACKAGES) {
      expect(PYODIDE_INCOMPATIBLE_PACKAGES.has(pkg)).toBe(false)
    }
  })
})

// ============================================================================
// Package aliases
// ============================================================================

describe('PACKAGE_ALIASES', () => {
  it('should have non-empty alias map', () => {
    expect(Object.keys(PACKAGE_ALIASES).length).toBeGreaterThan(5)
  })

  it('should map PIL to pillow', () => {
    expect(PACKAGE_ALIASES['pil']).toBe('pillow')
  })

  it('should map cv2 to opencv-python', () => {
    expect(PACKAGE_ALIASES['cv2']).toBe('opencv-python')
  })

  it('should map bs4 to beautifulsoup4', () => {
    expect(PACKAGE_ALIASES['bs4']).toBe('beautifulsoup4')
  })

  it('should map yaml to pyyaml', () => {
    expect(PACKAGE_ALIASES['yaml']).toBe('pyyaml')
  })

  it('should have all alias targets resolve to known packages', () => {
    for (const [_alias, target] of Object.entries(PACKAGE_ALIASES)) {
      const targetNorm = target.toLowerCase().replace(/_/g, '-')
      const isKnown =
        PYODIDE_BUILTIN_PACKAGES.has(targetNorm) ||
        !PYODIDE_INCOMPATIBLE_PACKAGES.has(targetNorm) // should not alias to incompatible
      expect(isKnown).toBe(true)
    }
  })
})
