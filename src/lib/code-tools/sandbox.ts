/**
 * Code Sandbox - QuickJS WebAssembly Sandbox
 *
 * This module provides a secure JavaScript execution environment
 * using QuickJS compiled to WebAssembly. This provides true
 * isolation with no access to the host environment.
 *
 * @module lib/code-tools/sandbox
 */

import { getQuickJS, type QuickJSWASMModule } from 'quickjs-emscripten'
import type { ConsoleEntry } from './types'

// ============================================================================
// Types
// ============================================================================

export interface SandboxExecutionResult {
  success: boolean
  result?: unknown
  console: ConsoleEntry[]
  error?: string
  errorType?: 'syntax' | 'runtime' | 'timeout' | 'security'
}

// ============================================================================
// Singleton QuickJS Instance
// ============================================================================

let quickJsModule: QuickJSWASMModule | null = null
let quickJsInitPromise: Promise<QuickJSWASMModule> | null = null

/**
 * Get or initialize the QuickJS WebAssembly module.
 * The module is cached for reuse across multiple executions.
 */
async function getQuickJSModule(): Promise<QuickJSWASMModule> {
  if (quickJsModule) {
    return quickJsModule
  }

  if (quickJsInitPromise) {
    return quickJsInitPromise
  }

  quickJsInitPromise = getQuickJS()
  quickJsModule = await quickJsInitPromise
  quickJsInitPromise = null

  return quickJsModule
}

/**
 * Destroy the QuickJS instance to free resources.
 * Call this when the sandbox is no longer needed.
 */
export function destroySandbox(): void {
  quickJsModule = null
  quickJsInitPromise = null
}

// ============================================================================
// Code Execution
// ============================================================================

/**
 * Execute JavaScript code in the QuickJS WebAssembly sandbox.
 *
 * @param code - The JavaScript code to execute
 * @param input - Optional input data available as `input` variable
 * @param timeout - Maximum execution time in milliseconds
 * @returns Execution result with captured console output
 */
export async function executeInSandbox(
  code: string,
  input?: unknown,
  timeout: number = 5000,
): Promise<SandboxExecutionResult> {
  const consoleLogs: ConsoleEntry[] = []
  const startTime = performance.now()

  // Create console capture functions
  const captureConsole = (type: ConsoleEntry['type']) => {
    return (...args: unknown[]) => {
      consoleLogs.push({
        type,
        args: args.map((arg) => formatValue(arg)),
        timestamp: performance.now() - startTime,
      })
    }
  }

  try {
    const QuickJS = await getQuickJSModule()
    const vm = QuickJS.newContext()

    try {
      // Set up interrupt handler for timeout
      const deadline = Date.now() + timeout
      vm.runtime.setInterruptHandler(() => Date.now() > deadline)

      // Set up memory limit (32MB)
      vm.runtime.setMemoryLimit(1024 * 1024 * 32)

      // Create console object in the VM
      const consoleHandle = vm.newObject()

      // Add console methods
      const logFn = vm.newFunction('log', (...args) => {
        const values = args.map((arg) => vm.dump(arg))
        captureConsole('log')(...values)
      })
      vm.setProp(consoleHandle, 'log', logFn)
      logFn.dispose()

      const warnFn = vm.newFunction('warn', (...args) => {
        const values = args.map((arg) => vm.dump(arg))
        captureConsole('warn')(...values)
      })
      vm.setProp(consoleHandle, 'warn', warnFn)
      warnFn.dispose()

      const errorFn = vm.newFunction('error', (...args) => {
        const values = args.map((arg) => vm.dump(arg))
        captureConsole('error')(...values)
      })
      vm.setProp(consoleHandle, 'error', errorFn)
      errorFn.dispose()

      const infoFn = vm.newFunction('info', (...args) => {
        const values = args.map((arg) => vm.dump(arg))
        captureConsole('info')(...values)
      })
      vm.setProp(consoleHandle, 'info', infoFn)
      infoFn.dispose()

      const debugFn = vm.newFunction('debug', (...args) => {
        const values = args.map((arg) => vm.dump(arg))
        captureConsole('debug')(...values)
      })
      vm.setProp(consoleHandle, 'debug', debugFn)
      debugFn.dispose()

      vm.setProp(vm.global, 'console', consoleHandle)
      consoleHandle.dispose()

      // Inject input data
      if (input !== undefined) {
        const inputJson = JSON.stringify(input)
        const inputResult = vm.evalCode(`(${inputJson})`)
        if (inputResult.error) {
          const errorMessage = vm.dump(inputResult.error)
          inputResult.error.dispose()
          return {
            success: false,
            error: `Failed to inject input: ${errorMessage}`,
            errorType: 'runtime',
            console: consoleLogs,
          }
        }
        vm.setProp(vm.global, 'input', inputResult.value)
        inputResult.value.dispose()
      }

      // Wrap code to handle export default
      const wrappedCode = wrapCode(code, input)

      // Execute the code
      const result = vm.evalCode(wrappedCode)

      if (result.error) {
        const errorMessage = vm.dump(result.error)
        result.error.dispose()
        const errorType = classifyError(String(errorMessage))
        return {
          success: false,
          error: String(errorMessage),
          errorType,
          console: consoleLogs,
        }
      }

      // Get the result value
      const resultValue = vm.dump(result.value)
      result.value.dispose()

      return {
        success: true,
        result: resultValue,
        console: consoleLogs,
      }
    } finally {
      vm.dispose()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorType = classifyError(errorMessage)

    return {
      success: false,
      error: errorMessage,
      errorType,
      console: consoleLogs,
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap user code to handle the default export pattern.
 * Since quickjs-emscripten evalCode doesn't support ES modules by default,
 * we transform 'export default X' to return the value directly.
 */
function wrapCode(code: string, _input?: unknown): string {
  // Check if code has export default
  const hasExportDefault = /export\s+default\b/.test(code)

  if (hasExportDefault) {
    // Transform export default to a return value
    // Replace 'export default X' with '__result__ = X'
    const transformedCode = code.replace(
      /export\s+default\s+/g,
      '__result__ = ',
    )

    return `
var __result__ = undefined;
${transformedCode}
__result__;
`
  }

  // No export default - wrap to evaluate and return the last expression
  // Use an IIFE to handle potential return statements
  return `
(function() {
  ${code}
})();
`
}

/**
 * Classify an error message into an error type.
 */
function classifyError(
  message: string,
): 'syntax' | 'runtime' | 'timeout' | 'security' {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('execution time')
  ) {
    return 'timeout'
  }

  if (
    lowerMessage.includes('syntaxerror') ||
    lowerMessage.includes('unexpected token') ||
    lowerMessage.includes('unexpected end')
  ) {
    return 'syntax'
  }

  if (
    lowerMessage.includes('not allowed') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('security')
  ) {
    return 'security'
  }

  return 'runtime'
}

/**
 * Format a value for console output.
 */
function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'function') {
    return '[Function]'
  }

  if (typeof value === 'symbol') {
    return value.toString()
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Format a result value for display.
 */
export function formatResult(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN'
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity'
    return String(value)
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'function') {
    return '[Function]'
  }

  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value)
    } catch {
      return '[Array]'
    }
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return '[Object]'
    }
  }

  return String(value)
}
