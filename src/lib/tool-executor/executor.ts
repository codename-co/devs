/**
 * Tool Executor Implementation
 *
 * Provides the core implementation for tool registration and execution.
 * This module handles:
 * - Tool registration with type-safe handlers
 * - Single and batch tool execution
 * - Error handling and result formatting
 * - Event emission for monitoring
 *
 * @module lib/tool-executor/executor
 */

import type { ToolCall, ToolDefinition, ParsedToolCall } from '@/lib/llm/types'
import { TraceService } from '@/features/traces/trace-service'
import type {
  ToolExecutionContext,
  ToolHandler,
  RegisteredTool,
  ToolExecutionResult,
  ToolExecutionSuccess,
  ToolExecutionError,
  BatchToolExecutionResult,
  ToolRegistry,
  ToolRegistrationOptions,
  ToolListOptions,
  ToolExecutor,
  ExecuteToolOptions,
  ExecuteBatchOptions,
  ToolExecutionEvent,
  ToolExecutionEventListener,
} from './types'
import {
  createToolSuccess,
  createToolError,
  isToolExecutionSuccess,
} from './types'

// Import plugin system for bridging
import {
  registerCategoryWithLegacy,
  unregisterCategoryFromLegacy,
  isCategoryRegisteredInLegacy,
} from '@/tools/bridge'

// ============================================================================
// Constants
// ============================================================================

/** Default timeout for tool execution (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000

/** Default maximum concurrent executions in batch mode */
const DEFAULT_MAX_CONCURRENCY = 5

// ============================================================================
// KnowledgeToolRegistry Implementation
// ============================================================================

/**
 * Registry for managing tool registrations.
 * Stores tool definitions and handlers for lookup during execution.
 *
 * @example
 * ```typescript
 * const registry = new KnowledgeToolRegistry()
 * registry.register(
 *   myToolDefinition,
 *   async (args, context) => { ... },
 *   { tags: ['custom'] }
 * )
 * ```
 */
export class KnowledgeToolRegistry implements ToolRegistry {
  /** Internal storage for registered tools */
  private tools: Map<string, RegisteredTool> = new Map()

  /**
   * Register a new tool with its handler.
   *
   * @template TArgs - Type of the tool's arguments
   * @template TResult - Type of the tool's result
   * @param definition - The tool definition for LLM
   * @param handler - The function to execute when tool is called
   * @param options - Registration options
   * @throws Error if tool already exists and replace is false
   */
  register<TArgs = Record<string, unknown>, TResult = unknown>(
    definition: ToolDefinition,
    handler: ToolHandler<TArgs, TResult>,
    options?: ToolRegistrationOptions,
  ): void {
    const name = definition.function.name

    if (this.tools.has(name) && !options?.replace) {
      throw new Error(
        `Tool "${name}" is already registered. Use { replace: true } to override.`,
      )
    }

    const registeredTool: RegisteredTool<TArgs, TResult> = {
      definition,
      handler,
      requiresConfirmation: options?.requiresConfirmation ?? false,
      estimatedDuration: options?.estimatedDuration,
      tags: options?.tags ?? [],
    }

    this.tools.set(name, registeredTool as RegisteredTool)
  }

  /**
   * Unregister a tool by name.
   *
   * @param name - The tool name to unregister
   * @returns true if the tool was found and removed
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Get a registered tool by name.
   *
   * @param name - The tool name to look up
   * @returns The registered tool or undefined if not found
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool is registered.
   *
   * @param name - The tool name to check
   * @returns true if the tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * List all registered tool definitions.
   * Useful for passing to LLM requests.
   *
   * @param options - Filter options for listing
   * @returns Array of tool definitions matching the filters
   */
  listDefinitions(options?: ToolListOptions): ToolDefinition[] {
    const definitions: ToolDefinition[] = []

    for (const tool of this.tools.values()) {
      // Apply tag filters
      if (options?.tags && options.tags.length > 0) {
        const toolTags = tool.tags ?? []
        const hasMatchingTag = options.tags.some((tag) =>
          toolTags.includes(tag),
        )
        if (!hasMatchingTag) continue
      }

      // Apply exclude tag filters
      if (options?.excludeTags && options.excludeTags.length > 0) {
        const toolTags = tool.tags ?? []
        const hasExcludedTag = options.excludeTags.some((tag) =>
          toolTags.includes(tag),
        )
        if (hasExcludedTag) continue
      }

      // Apply confirmation filter
      if (
        options?.includeConfirmationRequired === false &&
        tool.requiresConfirmation
      ) {
        continue
      }

      definitions.push(tool.definition)
    }

    return definitions
  }

  /**
   * List all registered tool names.
   *
   * @returns Array of tool names
   */
  listNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get count of registered tools.
   *
   * @returns Number of registered tools
   */
  count(): number {
    return this.tools.size
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear()
  }
}

// ============================================================================
// KnowledgeToolExecutor Implementation
// ============================================================================

/**
 * Executor for running tool calls using registered handlers.
 * Handles argument parsing, validation, timeout, and error handling.
 *
 * @example
 * ```typescript
 * const executor = new KnowledgeToolExecutor(registry)
 *
 * const result = await executor.execute(toolCall, {
 *   context: { conversationId: '123' },
 *   timeout: 10000
 * })
 *
 * if (result.success) {
 *   console.log(result.result)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export class KnowledgeToolExecutor implements ToolExecutor {
  /** The tool registry */
  readonly registry: ToolRegistry

  /** Event listeners for monitoring */
  private listeners: Set<ToolExecutionEventListener> = new Set()

  /**
   * Create a new executor with the given registry.
   *
   * @param registry - The tool registry to use for lookups
   */
  constructor(registry: ToolRegistry) {
    this.registry = registry
  }

  /**
   * Add an event listener for tool execution events.
   *
   * @param listener - The listener function
   * @returns A function to remove the listener
   */
  addEventListener(listener: ToolExecutionEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Remove an event listener.
   *
   * @param listener - The listener to remove
   */
  removeEventListener(listener: ToolExecutionEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Emit an event to all listeners.
   *
   * @param event - The event to emit
   */
  private emit(event: ToolExecutionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('[ToolExecutor] Event listener error:', error)
      }
    }
  }

  /**
   * Create a parsed tool call from a raw tool call.
   *
   * @param toolCall - The raw tool call
   * @param args - The parsed arguments
   * @returns A parsed tool call object
   */
  private createParsedToolCall<TArgs = Record<string, unknown>>(
    toolCall: ToolCall,
    args: TArgs,
  ): ParsedToolCall<TArgs> {
    return {
      id: toolCall.id,
      type: toolCall.type,
      name: toolCall.function.name,
      arguments: args,
    }
  }

  /**
   * Execute a handler with timeout support.
   *
   * @param handler - The handler function
   * @param args - The arguments to pass
   * @param context - The execution context
   * @param timeout - Timeout in milliseconds (0 = no timeout)
   * @returns The handler result
   * @throws Error if timeout or aborted
   */
  private async executeWithTimeout<TArgs, TResult>(
    handler: ToolHandler<TArgs, TResult>,
    args: TArgs,
    context: ToolExecutionContext,
    timeout: number,
  ): Promise<TResult> {
    // No timeout case
    if (timeout <= 0) {
      return handler(args, context)
    }

    // Create abort controller for timeout
    const timeoutController = new AbortController()

    // Merge with existing abort signal if present
    const mergedContext: ToolExecutionContext = {
      ...context,
      abortSignal: context.abortSignal
        ? this.mergeAbortSignals(context.abortSignal, timeoutController.signal)
        : timeoutController.signal,
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error('Tool execution timed out'))
    }, timeout)

    try {
      return await handler(args, mergedContext)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Merge multiple abort signals into one.
   *
   * @param signals - The abort signals to merge
   * @returns A merged abort signal
   */
  private mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController()

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason)
        return controller.signal
      }

      signal.addEventListener(
        'abort',
        () => {
          controller.abort(signal.reason)
        },
        { once: true },
      )
    }

    return controller.signal
  }

  /**
   * Execute a single tool call.
   *
   * @param toolCall - The tool call to execute
   * @param options - Execution options
   * @returns The execution result (success or error)
   */
  async execute(
    toolCall: ToolCall,
    options?: ExecuteToolOptions,
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now()
    const toolName = toolCall.function.name
    const context = options?.context ?? {}
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS
    const traceId = options?.traceId
    const parentSpanId = options?.parentSpanId

    // Parse arguments early for tracing input
    let parsedArgs: Record<string, unknown>
    try {
      const argsString = toolCall.function.arguments
      if (
        !argsString ||
        argsString.trim() === '' ||
        argsString.trim() === '{}'
      ) {
        parsedArgs = {}
      } else {
        const parsed = JSON.parse(argsString)
        // Validate that args are an object (not array, null, or primitive)
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error('Arguments must be a JSON object')
        }
        parsedArgs = parsed
      }
    } catch (error) {
      // Return parse error immediately
      const duration = performance.now() - startTime
      const result = createToolError(
        toolCall,
        'parse',
        `Failed to parse arguments: ${error instanceof Error ? error.message : String(error)}`,
        duration,
        error instanceof Error ? error : undefined,
      )

      this.emit({
        type: 'tool_execution_complete',
        result,
        timestamp: new Date(),
      })

      return result
    }

    // Start trace span if traceId is provided
    let span: ReturnType<typeof TraceService.startSpan> | null = null
    if (traceId) {
      span = TraceService.startSpan({
        traceId,
        parentSpanId,
        name: `Tool: ${toolName}`,
        type: 'tool',
        agentId: context.agentId,
        conversationId: context.conversationId,
        taskId: context.taskId,
        io: {
          input: {
            prompt: JSON.stringify(parsedArgs, null, 2),
          },
        },
        metadata: {
          toolCallId: toolCall.id,
          toolName,
          arguments: parsedArgs,
        },
      })
    }

    // Helper to end span with result
    const endSpanWithResult = async (result: ToolExecutionResult) => {
      if (span) {
        const isSuccess = result.success
        await TraceService.endSpan(span.id, {
          status: isSuccess ? 'completed' : 'error',
          statusMessage: isSuccess
            ? undefined
            : (result as ToolExecutionError).error,
          output: {
            response: isSuccess
              ? (result as ToolExecutionSuccess).result
              : (result as ToolExecutionError).error,
          },
        })
      }
    }

    // Emit start event
    this.emit({
      type: 'tool_execution_start',
      toolCall,
      toolName,
      timestamp: new Date(),
    })

    // Check if tool is registered
    const tool = this.registry.get(toolName)
    if (!tool) {
      const duration = performance.now() - startTime
      const result = createToolError(
        toolCall,
        'not_found',
        `Tool "${toolName}" is not registered`,
        duration,
      )

      await endSpanWithResult(result)

      this.emit({
        type: 'tool_execution_complete',
        result,
        timestamp: new Date(),
      })

      return result
    }

    // Validate arguments if validator is provided
    if (tool.validate) {
      try {
        parsedArgs = tool.validate(parsedArgs)
      } catch (error) {
        const duration = performance.now() - startTime
        const result = createToolError(
          toolCall,
          'validation',
          `Argument validation failed: ${error instanceof Error ? error.message : String(error)}`,
          duration,
          error instanceof Error ? error : undefined,
        )

        await endSpanWithResult(result)

        this.emit({
          type: 'tool_execution_complete',
          result,
          timestamp: new Date(),
        })

        return result
      }
    }

    // Handle confirmation if required
    if (tool.requiresConfirmation && options?.onConfirmation) {
      const parsedToolCall = this.createParsedToolCall(toolCall, parsedArgs)

      try {
        const confirmed = await options.onConfirmation(parsedToolCall, tool)
        if (!confirmed) {
          const duration = performance.now() - startTime
          const result = createToolError(
            toolCall,
            'permission',
            'User denied tool execution',
            duration,
          )

          await endSpanWithResult(result)

          this.emit({
            type: 'tool_execution_complete',
            result,
            timestamp: new Date(),
          })

          return result
        }
      } catch (error) {
        const duration = performance.now() - startTime
        const result = createToolError(
          toolCall,
          'permission',
          `Confirmation failed: ${error instanceof Error ? error.message : String(error)}`,
          duration,
          error instanceof Error ? error : undefined,
        )

        await endSpanWithResult(result)

        this.emit({
          type: 'tool_execution_complete',
          result,
          timestamp: new Date(),
        })

        return result
      }
    }

    // Create execution context with progress callback
    const executionContext: ToolExecutionContext = {
      ...context,
      onProgress: (progress, message) => {
        this.emit({
          type: 'tool_execution_progress',
          toolCall,
          progress,
          message,
          timestamp: new Date(),
        })

        // Call original progress callback if provided
        context.onProgress?.(progress, message)
      },
    }

    // Execute the handler
    try {
      const handlerResult = await this.executeWithTimeout(
        tool.handler,
        parsedArgs,
        executionContext,
        timeout,
      )

      const duration = performance.now() - startTime
      const result = createToolSuccess(toolCall, handlerResult, duration)

      await endSpanWithResult(result)

      this.emit({
        type: 'tool_execution_complete',
        result,
        timestamp: new Date(),
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      // Determine error type
      let errorType: 'execution' | 'timeout' | 'aborted' = 'execution'

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          errorType = context.abortSignal?.aborted ? 'aborted' : 'timeout'
        } else if (error.message.includes('timed out')) {
          errorType = 'timeout'
        }
      }

      const result = createToolError(
        toolCall,
        errorType,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        duration,
        error instanceof Error ? error : undefined,
      )

      await endSpanWithResult(result)

      this.emit({
        type: 'tool_execution_complete',
        result,
        timestamp: new Date(),
      })

      return result
    }
  }

  /**
   * Execute multiple tool calls.
   * Can execute in parallel or sequentially based on options.
   *
   * @param toolCalls - The tool calls to execute
   * @param options - Batch execution options
   * @returns Batch execution result with all individual results
   */
  async executeBatch(
    toolCalls: ToolCall[],
    options?: ExecuteBatchOptions,
  ): Promise<BatchToolExecutionResult> {
    const startTime = performance.now()
    const parallel = options?.parallel ?? true
    const continueOnError = options?.continueOnError ?? true
    const maxConcurrency = options?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY

    if (toolCalls.length === 0) {
      return {
        results: [],
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        parallel,
      }
    }

    let results: ToolExecutionResult[]

    if (parallel) {
      // Execute in parallel with concurrency limit
      results = await this.executeParallel(
        toolCalls,
        options,
        maxConcurrency,
        continueOnError,
      )
    } else {
      // Execute sequentially
      results = await this.executeSequential(
        toolCalls,
        options,
        continueOnError,
      )
    }

    const totalDuration = performance.now() - startTime
    const successCount = results.filter(isToolExecutionSuccess).length
    const failureCount = results.length - successCount

    return {
      results,
      successCount,
      failureCount,
      totalDuration,
      parallel,
    }
  }

  /**
   * Execute tool calls in parallel with concurrency limit.
   */
  private async executeParallel(
    toolCalls: ToolCall[],
    options: ExecuteBatchOptions | undefined,
    maxConcurrency: number,
    continueOnError: boolean,
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = []
    const pending: Promise<void>[] = []
    let aborted = false

    for (const toolCall of toolCalls) {
      if (aborted) break

      // Wait if at concurrency limit
      while (pending.length >= maxConcurrency) {
        await Promise.race(pending)
      }

      const promise = (async () => {
        if (aborted) return

        const result = await this.execute(toolCall, options)
        results.push(result)

        // Check if we should stop on error
        if (!result.success && !continueOnError) {
          aborted = true
        }
      })()

      // Track pending promise
      const trackedPromise = promise.finally(() => {
        const index = pending.indexOf(trackedPromise)
        if (index !== -1) pending.splice(index, 1)
      })
      pending.push(trackedPromise)
    }

    // Wait for all remaining
    await Promise.all(pending)

    return results
  }

  /**
   * Execute tool calls sequentially.
   */
  private async executeSequential(
    toolCalls: ToolCall[],
    options: ExecuteBatchOptions | undefined,
    continueOnError: boolean,
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = []

    for (const toolCall of toolCalls) {
      const result = await this.execute(toolCall, options)
      results.push(result)

      // Stop on error if configured
      if (!result.success && !continueOnError) {
        break
      }
    }

    return results
  }

  /**
   * Format a tool execution result as a message for the LLM.
   * Converts the result to a string suitable for a tool message.
   *
   * @param result - The execution result to format
   * @returns Formatted string for LLM consumption
   */
  formatResultForLLM(result: ToolExecutionResult): string {
    if (result.success) {
      // Format successful result
      const data = result.result

      // Handle primitive types
      if (typeof data === 'string') {
        return data
      }

      if (typeof data === 'number' || typeof data === 'boolean') {
        return String(data)
      }

      if (data === null || data === undefined) {
        return 'null'
      }

      // Handle objects/arrays - pretty print JSON
      try {
        return JSON.stringify(data, null, 2)
      } catch {
        return String(data)
      }
    } else {
      // Format error result
      return JSON.stringify({
        error: true,
        type: result.errorType,
        message: result.error,
      })
    }
  }
}

// ============================================================================
// Default Instances (Singletons)
// ============================================================================

/**
 * Default tool registry instance.
 * Use this for registering tools in the application.
 */
export const defaultRegistry = new KnowledgeToolRegistry()

/**
 * Default tool executor instance.
 * Use this for executing tools in the application.
 */
export const defaultExecutor = new KnowledgeToolExecutor(defaultRegistry)

// ============================================================================
// Knowledge Tools Registration
// ============================================================================

/**
 * Register all knowledge tools with the default registry.
 * Call this during application initialization to enable knowledge tools.
 *
 * @example
 * ```typescript
 * import { registerKnowledgeTools } from '@/lib/tool-executor/executor'
 *
 * // In app initialization
 * registerKnowledgeTools()
 * ```
 */
export function registerKnowledgeTools(): void {
  registerCategoryWithLegacy('knowledge', defaultRegistry)
}

/**
 * Check if knowledge tools are registered.
 *
 * @returns true if all knowledge tools are registered
 */
export function areKnowledgeToolsRegistered(): boolean {
  return isCategoryRegisteredInLegacy('knowledge', defaultRegistry)
}

/**
 * Unregister all knowledge tools from the default registry.
 * Useful for testing or when disabling knowledge features.
 */
export function unregisterKnowledgeTools(): void {
  unregisterCategoryFromLegacy('knowledge', defaultRegistry)
}

// ============================================================================
// Math Tools Registration
// ============================================================================

/**
 * Register all math tools with the default registry.
 * Call this during application initialization to enable math/calculation tools.
 *
 * @example
 * ```typescript
 * import { registerMathTools } from '@/lib/tool-executor/executor'
 *
 * // In app initialization
 * registerMathTools()
 * ```
 */
export function registerMathTools(): void {
  registerCategoryWithLegacy('math', defaultRegistry)
}

/**
 * Check if math tools are registered.
 *
 * @returns true if all math tools are registered
 */
export function areMathToolsRegistered(): boolean {
  return isCategoryRegisteredInLegacy('math', defaultRegistry)
}

/**
 * Unregister all math tools from the default registry.
 * Useful for testing or when disabling math features.
 */
export function unregisterMathTools(): void {
  unregisterCategoryFromLegacy('math', defaultRegistry)
}

// ============================================================================
// Code Tools Registration
// ============================================================================

/**
 * Register all code tools with the default registry.
 * Call this during application initialization to enable code execution tools.
 *
 * @example
 * ```typescript
 * import { registerCodeTools } from '@/lib/tool-executor/executor'
 *
 * // In app initialization
 * registerCodeTools()
 * ```
 */
export function registerCodeTools(): void {
  registerCategoryWithLegacy('code', defaultRegistry)
}

/**
 * Check if code tools are registered.
 *
 * @returns true if all code tools are registered
 */
export function areCodeToolsRegistered(): boolean {
  return isCategoryRegisteredInLegacy('code', defaultRegistry)
}

/**
 * Unregister all code tools from the default registry.
 * Useful for testing or when disabling code execution features.
 */
export function unregisterCodeTools(): void {
  unregisterCategoryFromLegacy('code', defaultRegistry)
}

// ============================================================================
// Connector Tools Registration
// ============================================================================

/**
 * Register all connector tools with the default registry.
 * Call this during application initialization to enable connector tools.
 * These tools allow agents to interact with connected external services
 * (Gmail, Google Drive, Calendar, Tasks, Notion).
 *
 * @example
 * ```typescript
 * import { registerConnectorTools } from '@/lib/tool-executor/executor'
 *
 * // In app initialization
 * registerConnectorTools()
 * ```
 */
export function registerConnectorTools(): void {
  registerCategoryWithLegacy('connector', defaultRegistry)
}

/**
 * Check if connector tools are registered.
 *
 * @returns true if all connector tools are registered
 */
export function areConnectorToolsRegistered(): boolean {
  return isCategoryRegisteredInLegacy('connector', defaultRegistry)
}

/**
 * Unregister all connector tools from the default registry.
 * Useful for testing or when disabling connector features.
 */
export function unregisterConnectorTools(): void {
  unregisterCategoryFromLegacy('connector', defaultRegistry)
}

// ============================================================================
// Presentation Tools Registration
// ============================================================================

/**
 * Register all presentation tools with the default registry.
 * Call this during application initialization to enable presentation generation tools.
 *
 * @example
 * ```typescript
 * import { registerPresentationTools } from '@/lib/tool-executor/executor'
 *
 * // In app initialization
 * registerPresentationTools()
 * ```
 */
export function registerPresentationTools(): void {
  registerCategoryWithLegacy('presentation', defaultRegistry)
}

/**
 * Check if presentation tools are registered.
 *
 * @returns true if all presentation tools are registered
 */
export function arePresentationToolsRegistered(): boolean {
  return isCategoryRegisteredInLegacy('presentation', defaultRegistry)
}

/**
 * Unregister all presentation tools from the default registry.
 * Useful for testing or when disabling presentation features.
 */
export function unregisterPresentationTools(): void {
  unregisterCategoryFromLegacy('presentation', defaultRegistry)
}
