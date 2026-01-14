/**
 * Tool Executor Types
 *
 * This module defines types for the tool execution system.
 * The tool executor is responsible for:
 * - Registering tool handlers
 * - Executing tool calls from LLM responses
 * - Managing tool execution results and errors
 *
 * @module lib/tool-executor
 */

import type { ToolCall, ToolDefinition, ParsedToolCall } from '@/lib/llm/types'

// ============================================================================
// Tool Handler Types
// ============================================================================

/**
 * Context provided to tool handlers during execution.
 * Contains information about the current execution environment.
 */
export interface ToolExecutionContext {
  /** ID of the agent executing the tool (if applicable) */
  agentId?: string
  /** ID of the current conversation */
  conversationId?: string
  /** ID of the current task (if in task context) */
  taskId?: string
  /** Session ID for tracking related operations */
  sessionId?: string
  /** Abort signal for cancellation support */
  abortSignal?: AbortSignal
  /**
   * Callback for progress updates during long-running operations.
   * @param progress - Progress value from 0 to 1
   * @param message - Optional status message
   */
  onProgress?: (progress: number, message?: string) => void
}

/**
 * Function type for tool handlers.
 * Handlers receive parsed arguments and return a result or throw an error.
 *
 * @template TArgs - Type of the tool's arguments
 * @template TResult - Type of the tool's result
 */
export type ToolHandler<
  TArgs = Record<string, unknown>,
  TResult = unknown
> = (
  args: TArgs,
  context: ToolExecutionContext
) => Promise<TResult>

/**
 * Registered tool with its handler and definition.
 *
 * @template TArgs - Type of the tool's arguments
 * @template TResult - Type of the tool's result
 */
export interface RegisteredTool<
  TArgs = Record<string, unknown>,
  TResult = unknown
> {
  /** The tool definition (for LLM) */
  definition: ToolDefinition
  /** The handler function */
  handler: ToolHandler<TArgs, TResult>
  /**
   * Optional validator for arguments.
   * Called before handler to validate/transform arguments.
   */
  validate?: (args: unknown) => TArgs | never
  /**
   * Whether this tool requires user confirmation before execution.
   * @default false
   */
  requiresConfirmation?: boolean
  /**
   * Estimated execution time in milliseconds.
   * Used for progress estimation and timeout configuration.
   */
  estimatedDuration?: number
  /**
   * Tags for categorizing tools.
   * Useful for enabling/disabling tool groups.
   */
  tags?: string[]
}

// ============================================================================
// Tool Execution Result Types
// ============================================================================

/**
 * Successful tool execution result.
 *
 * @template TResult - Type of the result data
 */
export interface ToolExecutionSuccess<TResult = unknown> {
  /** Indicates successful execution */
  success: true
  /** The tool call that was executed */
  toolCall: ToolCall
  /** The result data */
  result: TResult
  /** Execution duration in milliseconds */
  duration: number
}

/**
 * Error types that can occur during tool execution.
 */
export type ToolExecutionErrorType =
  | 'not_found' // Tool not registered
  | 'validation' // Argument validation failed
  | 'execution' // Handler threw an error
  | 'timeout' // Execution timed out
  | 'aborted' // Execution was cancelled
  | 'permission' // User denied confirmation
  | 'parse' // Failed to parse arguments JSON

/**
 * Failed tool execution result.
 */
export interface ToolExecutionError {
  /** Indicates failed execution */
  success: false
  /** The tool call that failed */
  toolCall: ToolCall
  /** Type of error that occurred */
  errorType: ToolExecutionErrorType
  /** Human-readable error message */
  error: string
  /** Original error object (if available) */
  cause?: Error
  /** Execution duration until failure in milliseconds */
  duration: number
}

/**
 * Result of a tool execution attempt.
 * Either success or failure.
 *
 * @template TResult - Type of the successful result data
 */
export type ToolExecutionResult<TResult = unknown> =
  | ToolExecutionSuccess<TResult>
  | ToolExecutionError

/**
 * Result of executing multiple tool calls.
 * Used when processing parallel tool calls from an LLM response.
 */
export interface BatchToolExecutionResult {
  /** All execution results (success and failure) */
  results: ToolExecutionResult[]
  /** Count of successful executions */
  successCount: number
  /** Count of failed executions */
  failureCount: number
  /** Total execution duration in milliseconds */
  totalDuration: number
  /** Whether all executions were parallel */
  parallel: boolean
}

// ============================================================================
// Tool Registry Types
// ============================================================================

/**
 * Options for registering a tool.
 */
export interface ToolRegistrationOptions {
  /**
   * Whether to replace an existing tool with the same name.
   * @default false
   */
  replace?: boolean
  /**
   * Tags to associate with the tool.
   */
  tags?: string[]
  /**
   * Whether the tool requires user confirmation.
   * @default false
   */
  requiresConfirmation?: boolean
  /**
   * Estimated execution duration in milliseconds.
   */
  estimatedDuration?: number
}

/**
 * Options for listing registered tools.
 */
export interface ToolListOptions {
  /**
   * Filter by tags (tools must have at least one matching tag).
   */
  tags?: string[]
  /**
   * Exclude tools with these tags.
   */
  excludeTags?: string[]
  /**
   * Whether to include tools that require confirmation.
   * @default true
   */
  includeConfirmationRequired?: boolean
}

/**
 * Interface for the tool registry.
 * Manages registered tools and their handlers.
 */
export interface ToolRegistry {
  /**
   * Register a new tool with its handler.
   *
   * @template TArgs - Type of the tool's arguments
   * @template TResult - Type of the tool's result
   * @throws Error if tool already exists and replace is false
   */
  register<TArgs = Record<string, unknown>, TResult = unknown>(
    definition: ToolDefinition,
    handler: ToolHandler<TArgs, TResult>,
    options?: ToolRegistrationOptions
  ): void

  /**
   * Unregister a tool by name.
   *
   * @returns true if the tool was found and removed
   */
  unregister(name: string): boolean

  /**
   * Get a registered tool by name.
   *
   * @returns The registered tool or undefined if not found
   */
  get(name: string): RegisteredTool | undefined

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean

  /**
   * List all registered tool definitions.
   * Useful for passing to LLM requests.
   */
  listDefinitions(options?: ToolListOptions): ToolDefinition[]

  /**
   * List all registered tool names.
   */
  listNames(): string[]

  /**
   * Get count of registered tools.
   */
  count(): number

  /**
   * Clear all registered tools.
   */
  clear(): void
}

// ============================================================================
// Tool Executor Types
// ============================================================================

/**
 * Options for executing a single tool call.
 */
export interface ExecuteToolOptions {
  /** Execution context */
  context?: ToolExecutionContext
  /** Timeout in milliseconds (0 = no timeout) */
  timeout?: number
  /**
   * Trace ID for observability.
   * Tool execution will create a span within this trace.
   */
  traceId?: string
  /**
   * Parent span ID for nested spans.
   */
  parentSpanId?: string
  /**
   * Callback for user confirmation.
   * Called for tools that require confirmation.
   * Should return true to proceed, false to abort.
   */
  onConfirmation?: (
    toolCall: ParsedToolCall,
    tool: RegisteredTool
  ) => Promise<boolean>
}

/**
 * Options for executing multiple tool calls.
 */
export interface ExecuteBatchOptions extends ExecuteToolOptions {
  /**
   * Whether to execute tool calls in parallel.
   * @default true
   */
  parallel?: boolean
  /**
   * Whether to continue execution if a tool fails.
   * @default true
   */
  continueOnError?: boolean
  /**
   * Maximum concurrent executions (when parallel is true).
   * @default 5
   */
  maxConcurrency?: number
}

/**
 * Interface for the tool executor.
 * Executes tool calls using registered handlers.
 */
export interface ToolExecutor {
  /** The tool registry */
  readonly registry: ToolRegistry

  /**
   * Execute a single tool call.
   *
   * @returns The execution result (success or error)
   */
  execute(
    toolCall: ToolCall,
    options?: ExecuteToolOptions
  ): Promise<ToolExecutionResult>

  /**
   * Execute multiple tool calls.
   *
   * @returns Batch execution result with all individual results
   */
  executeBatch(
    toolCalls: ToolCall[],
    options?: ExecuteBatchOptions
  ): Promise<BatchToolExecutionResult>

  /**
   * Format a tool execution result as a message for the LLM.
   * Converts the result to a string suitable for a tool message.
   */
  formatResultForLLM(result: ToolExecutionResult): string
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event emitted when a tool execution starts.
 */
export interface ToolExecutionStartEvent {
  type: 'tool_execution_start'
  toolCall: ToolCall
  toolName: string
  timestamp: Date
}

/**
 * Event emitted when a tool execution completes.
 */
export interface ToolExecutionCompleteEvent {
  type: 'tool_execution_complete'
  result: ToolExecutionResult
  timestamp: Date
}

/**
 * Event emitted during tool execution progress.
 */
export interface ToolExecutionProgressEvent {
  type: 'tool_execution_progress'
  toolCall: ToolCall
  progress: number
  message?: string
  timestamp: Date
}

/**
 * Union type for all tool execution events.
 */
export type ToolExecutionEvent =
  | ToolExecutionStartEvent
  | ToolExecutionCompleteEvent
  | ToolExecutionProgressEvent

/**
 * Listener function for tool execution events.
 */
export type ToolExecutionEventListener = (event: ToolExecutionEvent) => void

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type to create a strongly-typed tool registration.
 *
 * @example
 * ```typescript
 * const searchTool: TypedTool<SearchKnowledgeParams, SearchKnowledgeResult> = {
 *   definition: KNOWLEDGE_TOOL_DEFINITIONS.search_knowledge,
 *   handler: async (args) => { ... }
 * }
 * ```
 */
export interface TypedTool<TArgs, TResult> {
  definition: ToolDefinition
  handler: ToolHandler<TArgs, TResult>
  validate?: (args: unknown) => TArgs
}

/**
 * Type guard to check if a result is successful.
 */
export function isToolExecutionSuccess<TResult>(
  result: ToolExecutionResult<TResult>
): result is ToolExecutionSuccess<TResult> {
  return result.success === true
}

/**
 * Type guard to check if a result is an error.
 */
export function isToolExecutionError(
  result: ToolExecutionResult
): result is ToolExecutionError {
  return result.success === false
}

/**
 * Create a successful tool execution result.
 */
export function createToolSuccess<TResult>(
  toolCall: ToolCall,
  result: TResult,
  duration: number
): ToolExecutionSuccess<TResult> {
  return {
    success: true,
    toolCall,
    result,
    duration,
  }
}

/**
 * Create a failed tool execution result.
 */
export function createToolError(
  toolCall: ToolCall,
  errorType: ToolExecutionErrorType,
  error: string,
  duration: number,
  cause?: Error
): ToolExecutionError {
  return {
    success: false,
    toolCall,
    errorType,
    error,
    duration,
    cause,
  }
}
