/**
 * LLM Tool Calling Types
 *
 * This module defines types for LLM function/tool calling support.
 * It follows OpenAI's function calling format as the canonical format,
 * with provider implementations normalizing to this format.
 *
 * @module lib/llm/types
 */

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * JSON Schema type subset used for tool parameter definitions.
 * Simplified version covering the most common use cases for LLM tools.
 */
export interface JSONSchemaProperty {
  /** The data type of the property */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'
  /** Human-readable description for the LLM to understand the parameter */
  description?: string
  /** Enumeration of allowed values (for string types) */
  enum?: string[]
  /** Default value for the property */
  default?: unknown
  /** Schema for array items (when type is 'array') */
  items?: JSONSchemaProperty
  /** Nested property definitions (when type is 'object') */
  properties?: Record<string, JSONSchemaProperty>
  /** Required property names (when type is 'object') */
  required?: string[]
  /** Additional properties allowed (when type is 'object') */
  additionalProperties?: boolean | JSONSchemaProperty
  /** Minimum value (for number/integer types) */
  minimum?: number
  /** Maximum value (for number/integer types) */
  maximum?: number
  /** Minimum length (for string/array types) */
  minLength?: number
  /** Maximum length (for string/array types) */
  maxLength?: number
  /** Minimum array items (for array types) */
  minItems?: number
  /** Maximum array items (for array types) */
  maxItems?: number
  /** Pattern for string validation */
  pattern?: string
}

/**
 * JSON Schema definition for tool parameters.
 * Always uses 'object' as the root type per OpenAI spec.
 */
export interface ToolParametersSchema {
  /** Root type is always 'object' for tool parameters */
  type: 'object'
  /** Parameter definitions */
  properties: Record<string, JSONSchemaProperty>
  /** List of required parameter names */
  required?: string[]
  /** Whether additional properties are allowed (defaults to false) */
  additionalProperties?: boolean
}

/**
 * Function definition within a tool.
 * Describes the function name, description, and parameters.
 */
export interface ToolFunction {
  /** Unique name of the function (a-z, A-Z, 0-9, underscores, max 64 chars) */
  name: string
  /** Human-readable description of what the function does */
  description: string
  /** JSON Schema object defining the function parameters */
  parameters: ToolParametersSchema
  /**
   * Whether to enable strict schema adherence.
   * When true, the model will follow the schema exactly.
   * @default false
   */
  strict?: boolean
}

/**
 * Tool definition following OpenAI's format.
 * Wraps a function definition with type metadata.
 */
export interface ToolDefinition {
  /** Tool type - currently only 'function' is supported */
  type: 'function'
  /** The function definition */
  function: ToolFunction
}

// ============================================================================
// Tool Call Types (Request/Response)
// ============================================================================

/**
 * A function call requested by the model.
 * Contains the function name and arguments to invoke.
 */
export interface ToolCallFunction {
  /** Name of the function to call */
  name: string
  /** JSON-encoded string of function arguments */
  arguments: string
}

/**
 * Tool call as returned by the model in a response.
 * Each tool call has a unique ID for correlation with results.
 */
export interface ToolCall {
  /** Unique identifier for this tool call (used to match with tool results) */
  id: string
  /** Type of tool call - currently only 'function' is supported */
  type: 'function'
  /** The function call details */
  function: ToolCallFunction
}

/**
 * Parsed tool call with typed arguments.
 * Use this after parsing the JSON arguments string.
 *
 * @template TArgs - The type of the parsed arguments object
 */
export interface ParsedToolCall<TArgs = Record<string, unknown>> {
  /** Unique identifier for this tool call */
  id: string
  /** Type of tool call */
  type: 'function'
  /** Name of the function */
  name: string
  /** Parsed arguments object */
  arguments: TArgs
}

// ============================================================================
// Tool Choice Types
// ============================================================================

/**
 * Simple tool choice options.
 * - 'none': Model will not call any tool
 * - 'auto': Model decides whether to call tools (default)
 * - 'required': Model must call at least one tool
 */
export type SimpleToolChoice = 'none' | 'auto' | 'required'

/**
 * Force the model to call a specific function.
 */
export interface ForcedToolChoice {
  /** Type must be 'function' */
  type: 'function'
  /** The specific function to call */
  function: {
    /** Name of the function to force */
    name: string
  }
}

/**
 * Tool choice configuration.
 * Controls how the model uses available tools.
 */
export type ToolChoice = SimpleToolChoice | ForcedToolChoice

// ============================================================================
// Extended LLM Message Types
// ============================================================================

/**
 * Message role including tool-related roles.
 * - 'system': System instructions
 * - 'user': User messages
 * - 'assistant': Model responses (may include tool_calls)
 * - 'tool': Tool execution results
 */
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * Extended LLM message with tool calling support.
 * Extends the base message format to support the tool calling workflow.
 */
export interface LLMMessageWithTools {
  /** Role of the message sender */
  role: LLMMessageRole
  /** Text content of the message (may be null for pure tool_calls) */
  content: string | null
  /**
   * Tool calls requested by the assistant.
   * Only present when role is 'assistant' and the model wants to use tools.
   */
  tool_calls?: ToolCall[]
  /**
   * ID of the tool call this message is responding to.
   * Required when role is 'tool'.
   */
  tool_call_id?: string
  /**
   * Name of the function that generated this tool result.
   * Some providers require this when role is 'tool'.
   */
  name?: string
  /** Optional file attachments (images, documents) */
  attachments?: LLMMessageAttachment[]
}

/**
 * Attachment type for multimodal messages.
 * Re-exported here for convenience.
 */
export interface LLMMessageAttachment {
  /** Type classification for processing */
  type: 'image' | 'document' | 'text'
  /** Original filename */
  name: string
  /** Base64-encoded file content or plain text */
  data: string
  /** MIME type of the file */
  mimeType: string
}

// ============================================================================
// Extended LLM Config Types
// ============================================================================

/**
 * Configuration options for tool-enabled LLM requests.
 * Extends the base LLMConfig with tool-specific settings.
 */
export interface LLMConfigWithTools {
  /** Available tools for the model to use */
  tools?: ToolDefinition[]
  /**
   * Controls how the model uses tools.
   * @default 'auto'
   */
  tool_choice?: ToolChoice
  /**
   * Maximum number of tool call iterations before stopping.
   * Prevents infinite loops in agentic workflows.
   * @default 10
   */
  max_tool_iterations?: number
  /**
   * Whether to run tool calls in parallel when multiple are returned.
   * @default true
   */
  parallel_tool_calls?: boolean
}

// ============================================================================
// Extended LLM Response Types
// ============================================================================

/**
 * Reason why the model stopped generating.
 * - 'stop': Normal completion
 * - 'length': Hit max tokens limit
 * - 'tool_calls': Model wants to call tools
 * - 'content_filter': Content was filtered
 */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter'

/**
 * Token usage information for the request.
 */
export interface TokenUsage {
  /** Tokens used in the prompt/input */
  promptTokens: number
  /** Tokens generated in the completion/output */
  completionTokens: number
  /** Total tokens used */
  totalTokens: number
}

/**
 * Extended LLM response with tool calling support.
 */
export interface LLMResponseWithTools {
  /** Text content of the response (may be empty if only tool_calls) */
  content: string
  /**
   * Tool calls requested by the model.
   * Present when the model wants to invoke tools.
   */
  tool_calls?: ToolCall[]
  /** Reason why the model stopped generating */
  finish_reason?: FinishReason
  /** Token usage statistics */
  usage?: TokenUsage
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Delta update for a tool call during streaming.
 * Tool calls are built incrementally from these deltas.
 */
export interface ToolCallDelta {
  /** Index of the tool call being updated */
  index: number
  /** Tool call ID (only in first delta for this index) */
  id?: string
  /** Type (only in first delta) */
  type?: 'function'
  /** Function delta */
  function?: {
    /** Function name (may be partial or complete) */
    name?: string
    /** Arguments chunk (appended to previous chunks) */
    arguments?: string
  }
}

/**
 * Streaming chunk with tool call support.
 */
export interface LLMStreamChunk {
  /** Content delta (text chunk) */
  content?: string
  /** Tool call deltas (incremental updates) */
  tool_calls?: ToolCallDelta[]
  /** Finish reason (only in final chunk) */
  finish_reason?: FinishReason
  /** Usage stats (only in final chunk, if supported) */
  usage?: TokenUsage
}

/**
 * Accumulated state for building tool calls from streaming deltas.
 * Used internally by the streaming processor.
 */
export interface StreamingToolCallAccumulator {
  /** Tool calls being built from deltas, keyed by index */
  toolCalls: Map<number, Partial<ToolCall>>
  /** Whether all tool calls are complete */
  isComplete: boolean
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type to extract parsed arguments type from a tool definition.
 * Useful for type-safe tool handlers.
 *
 * @example
 * ```typescript
 * const searchTool: ToolDefinition = { ... }
 * type SearchArgs = InferToolArgs<typeof searchTool>
 * ```
 */
export type InferToolArgs<T extends ToolDefinition> =
  T['function']['parameters'] extends ToolParametersSchema
    ? Record<string, unknown>
    : never

/**
 * Type guard to check if a message contains tool calls.
 */
export function hasToolCalls(
  message: LLMMessageWithTools
): message is LLMMessageWithTools & { tool_calls: ToolCall[] } {
  return (
    message.role === 'assistant' &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  )
}

/**
 * Type guard to check if a message is a tool result.
 */
export function isToolResultMessage(
  message: LLMMessageWithTools
): message is LLMMessageWithTools & { role: 'tool'; tool_call_id: string } {
  return message.role === 'tool' && typeof message.tool_call_id === 'string'
}

/**
 * Parse tool call arguments from JSON string.
 * Returns null if parsing fails.
 *
 * @template TArgs - Expected argument type
 */
export function parseToolArguments<TArgs = Record<string, unknown>>(
  toolCall: ToolCall
): ParsedToolCall<TArgs> | null {
  try {
    const args = JSON.parse(toolCall.function.arguments) as TArgs
    return {
      id: toolCall.id,
      type: toolCall.type,
      name: toolCall.function.name,
      arguments: args,
    }
  } catch {
    return null
  }
}
