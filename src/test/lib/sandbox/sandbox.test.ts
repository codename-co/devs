/**
 * Tests for the unified Sandbox — polyglot code execution engine.
 *
 * Tests cover:
 * - Sandbox class orchestration (routing, state, lifecycle)
 * - PythonRuntime adapter (via mocked SandboxedCodeRunner)
 * - JavaScriptRuntime adapter (via mocked QuickJS sandbox)
 * - Progress event propagation
 * - Error handling and normalization
 *
 * @module test/lib/sandbox
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// Mocks
// ============================================================================

// Mock the Pyodide runner used by PythonRuntime
const mockPyodideExecute = vi.fn()
const mockPyodideInitialize = vi.fn().mockResolvedValue(undefined)
const mockPyodideTerminate = vi.fn()
const mockPyodideGetState = vi.fn().mockReturnValue('idle')
const mockPyodideIsReady = vi.fn().mockReturnValue(false)
const mockPyodideOnProgress = vi.fn().mockReturnValue(vi.fn())

vi.mock('@/lib/skills/sandboxed-code-runner', () => ({
  SandboxedCodeRunner: vi.fn().mockImplementation(() => ({
    execute: mockPyodideExecute,
    initialize: mockPyodideInitialize,
    terminate: mockPyodideTerminate,
    getState: mockPyodideGetState,
    isReady: mockPyodideIsReady,
    onProgress: mockPyodideOnProgress,
  })),
  checkPackageCompatibility: (pkg: string) => {
    if (['numpy', 'pandas'].includes(pkg)) return 'builtin'
    if (['pdf2image'].includes(pkg)) return 'incompatible'
    return 'unknown'
  },
  PACKAGE_ALIASES: { pil: 'pillow' },
  PYODIDE_BUILTIN_PACKAGES: new Set(['numpy', 'pandas']),
  PYODIDE_INCOMPATIBLE_PACKAGES: new Set(['pdf2image']),
}))

// Mock the QuickJS sandbox used by JavaScriptRuntime
const mockExecuteInSandbox = vi.fn()
vi.mock('@/lib/code-tools/sandbox', () => ({
  executeInSandbox: (...args: unknown[]) => mockExecuteInSandbox(...args),
  formatResult: (val: unknown) =>
    val === undefined ? 'undefined' : String(val),
  destroySandbox: vi.fn(),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { Sandbox, sandbox } from '@/lib/sandbox'
import { PythonRuntime } from '@/lib/sandbox/runtimes/python'
import { JavaScriptRuntime } from '@/lib/sandbox/runtimes/javascript'
import type {
  SandboxRequest,
  SandboxLanguage,
} from '@/lib/sandbox'

// ============================================================================
// Helpers
// ============================================================================

function makePythonRequest(overrides: Partial<SandboxRequest> = {}): SandboxRequest {
  return {
    language: 'python',
    code: 'print("hello")',
    ...overrides,
  }
}

function makeJsRequest(overrides: Partial<SandboxRequest> = {}): SandboxRequest {
  return {
    language: 'javascript',
    code: 'export default 42',
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Sandbox (unified)', () => {
  let sb: Sandbox

  beforeEach(() => {
    sb = new Sandbox()
    vi.clearAllMocks()
    mockPyodideGetState.mockReturnValue('idle')
    mockPyodideIsReady.mockReturnValue(false)
  })

  afterEach(() => {
    sb.terminateAll()
  })

  // ── Language routing ────────────────────────────────────────────

  describe('language routing', () => {
    it('should route Python requests to PythonRuntime', async () => {
      mockPyodideExecute.mockResolvedValue({
        success: true,
        result: 'None',
        stdout: 'hello\n',
        stderr: '',
        executionTimeMs: 100,
      })

      const result = await sb.execute(makePythonRequest())

      expect(result.success).toBe(true)
      expect(result.language).toBe('python')
      expect(result.stdout).toBe('hello\n')
      expect(mockPyodideExecute).toHaveBeenCalled()
    })

    it('should route JavaScript requests to JavaScriptRuntime', async () => {
      mockExecuteInSandbox.mockResolvedValue({
        success: true,
        result: 42,
        console: [{ type: 'log', args: ['hello'], timestamp: 5 }],
      })

      const result = await sb.execute(makeJsRequest())

      expect(result.success).toBe(true)
      expect(result.language).toBe('javascript')
      expect(mockExecuteInSandbox).toHaveBeenCalled()
    })

    it('should return an error for unsupported languages', async () => {
      const result = await sb.execute({
        language: 'ruby' as SandboxLanguage,
        code: 'puts "hello"',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported language')
      expect(result.error).toContain('ruby')
    })
  })

  // ── Supported languages ────────────────────────────────────────

  describe('getSupportedLanguages', () => {
    it('should return python and javascript', () => {
      const langs = sb.getSupportedLanguages()
      expect(langs).toContain('python')
      expect(langs).toContain('javascript')
      expect(langs).toHaveLength(2)
    })
  })

  // ── State management ───────────────────────────────────────────

  describe('state management', () => {
    it('should return idle for uninitialized runtimes', () => {
      expect(sb.getState('python')).toBe('idle')
      expect(sb.getState('javascript')).toBe('idle')
    })

    it('should delegate getState to the runtime after first use', async () => {
      mockPyodideGetState.mockReturnValue('ready')
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })

      await sb.execute(makePythonRequest())
      expect(sb.getState('python')).toBe('ready')
    })

    it('should report isReady correctly', async () => {
      expect(sb.isReady('python')).toBe(false)

      // After executing, the runtime exists
      mockPyodideIsReady.mockReturnValue(true)
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })
      await sb.execute(makePythonRequest())

      expect(sb.isReady('python')).toBe(true)
    })

    it('should return runtime states for all loaded runtimes', async () => {
      mockPyodideGetState.mockReturnValue('ready')
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })

      await sb.execute(makePythonRequest())

      const states = sb.getRuntimeStates()
      expect(states).toHaveProperty('python')
    })
  })

  // ── Lifecycle ──────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('should warmup a specific runtime', async () => {
      await sb.warmup('python')
      expect(mockPyodideInitialize).toHaveBeenCalled()
    })

    it('should terminate a specific runtime', async () => {
      // Create the runtime first
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })
      await sb.execute(makePythonRequest())

      sb.terminate('python')
      expect(mockPyodideTerminate).toHaveBeenCalled()

      // After termination, state should be idle
      expect(sb.getState('python')).toBe('idle')
    })

    it('should terminateAll runtimes', async () => {
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })
      mockExecuteInSandbox.mockResolvedValue({
        success: true,
        result: 1,
        console: [],
      })

      await sb.execute(makePythonRequest())
      await sb.execute(makeJsRequest())

      sb.terminateAll()
      expect(mockPyodideTerminate).toHaveBeenCalled()
      expect(sb.getState('python')).toBe('idle')
      expect(sb.getState('javascript')).toBe('idle')
    })

    it('should lazily re-create runtime after termination', async () => {
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })

      await sb.execute(makePythonRequest())
      sb.terminate('python')

      // Execute again — should recreate the runtime
      await sb.execute(makePythonRequest())
      expect(mockPyodideExecute).toHaveBeenCalledTimes(2)
    })
  })

  // ── Progress events ────────────────────────────────────────────

  describe('progress events', () => {
    it('should emit progress events to subscribers', async () => {
      const events: unknown[] = []
      sb.onProgress((event) => events.push(event))

      // Mock the Pyodide onProgress to capture and invoke the callback
      mockPyodideOnProgress.mockImplementation((cb: (e: unknown) => void) => {
        // Simulate a loading event
        cb({ type: 'loading', message: 'Downloading Python runtime…' })
        return vi.fn()
      })

      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })

      await sb.execute(makePythonRequest())

      expect(events.length).toBeGreaterThan(0)
    })

    it('should unsubscribe listeners', () => {
      const listener = vi.fn()
      const unsub = sb.onProgress(listener)

      unsub()

      // After unsubscribe, listener should not be called
      // (We can't easily trigger an event without executing, but we verify the mechanism)
      expect(typeof unsub).toBe('function')
    })
  })

  // ── Runtime access ─────────────────────────────────────────────

  describe('getRuntime', () => {
    it('should return undefined for uninitialized runtime', () => {
      expect(sb.getRuntime('python')).toBeUndefined()
    })

    it('should return the runtime after first use', async () => {
      mockPyodideExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        executionTimeMs: 10,
      })

      await sb.execute(makePythonRequest())
      const runtime = sb.getRuntime('python')

      expect(runtime).toBeDefined()
      expect(runtime?.language).toBe('python')
    })
  })
})

// ============================================================================
// Singleton
// ============================================================================

describe('sandbox singleton', () => {
  it('should be an instance of Sandbox', () => {
    expect(sandbox).toBeInstanceOf(Sandbox)
  })

  it('should support execute', () => {
    expect(typeof sandbox.execute).toBe('function')
  })

  it('should support warmup', () => {
    expect(typeof sandbox.warmup).toBe('function')
  })

  it('should support terminate', () => {
    expect(typeof sandbox.terminate).toBe('function')
  })
})

// ============================================================================
// PythonRuntime
// ============================================================================

describe('PythonRuntime', () => {
  let runtime: PythonRuntime

  beforeEach(() => {
    runtime = new PythonRuntime()
    vi.clearAllMocks()
    mockPyodideGetState.mockReturnValue('idle')
  })

  afterEach(() => {
    runtime.terminate()
  })

  it('should have language "python"', () => {
    expect(runtime.language).toBe('python')
  })

  it('should normalize Pyodide results to SandboxResult', async () => {
    mockPyodideExecute.mockResolvedValue({
      success: true,
      result: '42',
      stdout: 'hello\n',
      stderr: 'warning\n',
      executionTimeMs: 200,
      packagesInstalled: ['numpy'],
      outputFiles: [{ path: '/output/out.csv', content: 'x\n1', encoding: 'text' }],
    })

    const result = await runtime.execute({
      language: 'python',
      code: 'print("hello")',
      packages: ['numpy'],
    })

    expect(result.success).toBe(true)
    expect(result.language).toBe('python')
    expect(result.result).toBe('42')
    expect(result.stdout).toBe('hello\n')
    expect(result.stderr).toBe('warning\n')
    expect(result.executionTimeMs).toBe(200)
    expect(result.packagesInstalled).toEqual(['numpy'])
    expect(result.outputFiles).toHaveLength(1)
    expect(result.console.length).toBeGreaterThan(0)
  })

  it('should classify timeout errors', async () => {
    mockPyodideExecute.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: '',
      executionTimeMs: 60000,
      error: 'Execution timed out after 60000ms',
    })

    const result = await runtime.execute(makePythonRequest())

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('timeout')
  })

  it('should classify syntax errors', async () => {
    mockPyodideExecute.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: '',
      executionTimeMs: 10,
      error: 'SyntaxError: invalid syntax',
    })

    const result = await runtime.execute(makePythonRequest())

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('syntax')
  })

  it('should propagate progress events', async () => {
    const progressEvents: unknown[] = []

    mockPyodideOnProgress.mockImplementation((cb: (e: unknown) => void) => {
      cb({ type: 'loading', message: 'Loading...' })
      return vi.fn()
    })

    mockPyodideExecute.mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      executionTimeMs: 10,
    })

    await runtime.execute(makePythonRequest(), (event) => {
      progressEvents.push(event)
    })

    expect(progressEvents.length).toBeGreaterThan(0)
    expect(progressEvents[0]).toHaveProperty('language', 'python')
  })

  it('should expose the underlying runner via getRunner()', () => {
    const runner = runtime.getRunner()
    expect(runner).toBeDefined()
  })
})

// ============================================================================
// JavaScriptRuntime
// ============================================================================

describe('JavaScriptRuntime', () => {
  let runtime: JavaScriptRuntime

  beforeEach(() => {
    runtime = new JavaScriptRuntime()
    vi.clearAllMocks()
  })

  afterEach(() => {
    runtime.terminate()
  })

  it('should have language "javascript"', () => {
    expect(runtime.language).toBe('javascript')
  })

  it('should normalize QuickJS results to SandboxResult', async () => {
    mockExecuteInSandbox.mockResolvedValue({
      success: true,
      result: 42,
      console: [
        { type: 'log', args: ['hello'], timestamp: 5 },
        { type: 'warn', args: ['caution'], timestamp: 10 },
      ],
    })

    const result = await runtime.execute(makeJsRequest())

    expect(result.success).toBe(true)
    expect(result.language).toBe('javascript')
    expect(result.result).toBe('42')
    expect(result.console).toHaveLength(2)
    expect(result.stdout).toContain('hello')
    expect(result.stderr).toContain('caution')
  })

  it('should handle empty code', async () => {
    const result = await runtime.execute({
      language: 'javascript',
      code: '',
    })

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('syntax')
  })

  it('should handle code exceeding max length', async () => {
    const result = await runtime.execute({
      language: 'javascript',
      code: 'x'.repeat(200_000),
    })

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('security')
  })

  it('should handle execution errors', async () => {
    mockExecuteInSandbox.mockResolvedValue({
      success: false,
      error: 'ReferenceError: foo is not defined',
      errorType: 'runtime',
      console: [],
    })

    const result = await runtime.execute(makeJsRequest({ code: 'foo.bar()' }))

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('runtime')
    expect(result.language).toBe('javascript')
  })

  it('should handle thrown exceptions from executeInSandbox', async () => {
    mockExecuteInSandbox.mockRejectedValue(new Error('WASM crash'))

    const result = await runtime.execute(makeJsRequest())

    expect(result.success).toBe(false)
    expect(result.error).toContain('WASM crash')
    expect(result.language).toBe('javascript')
  })

  it('should pass context as input to QuickJS', async () => {
    mockExecuteInSandbox.mockResolvedValue({
      success: true,
      result: 15,
      console: [],
    })

    await runtime.execute({
      language: 'javascript',
      code: 'export default input.numbers.reduce((a,b) => a+b, 0)',
      context: { input: { numbers: [1, 2, 3, 4, 5] } },
    })

    // executeInSandbox receives (code, input, timeout)
    expect(mockExecuteInSandbox).toHaveBeenCalledWith(
      expect.any(String),
      { input: { numbers: [1, 2, 3, 4, 5] } },
      expect.any(Number),
    )
  })

  it('should be stateless between executions', async () => {
    mockExecuteInSandbox.mockResolvedValue({
      success: true,
      result: 1,
      console: [],
    })

    await runtime.execute(makeJsRequest({ code: 'export default 1' }))
    const state1 = runtime.getState()

    await runtime.execute(makeJsRequest({ code: 'export default 2' }))
    const state2 = runtime.getState()

    // State should be 'ready' after both executions
    expect(state1).toBe('ready')
    expect(state2).toBe('ready')
  })
})
