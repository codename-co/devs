/**
 * Tool Types for LLM Tool Calling
 *
 * Defines the schema for tool definitions and tool call responses
 * following the OpenAI/Anthropic function calling conventions.
 */

/**
 * JSON Schema definition for tool parameters
 */
export interface ToolParameterSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  properties?: Record<string, ToolParameterProperty>
  required?: string[]
  items?: ToolParameterProperty // For array types
  description?: string
}

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: string[]
  items?: ToolParameterProperty // For nested arrays
  properties?: Record<string, ToolParameterProperty> // For nested objects
  required?: string[]
  default?: unknown
}

/**
 * Tool definition following OpenAI/Anthropic function schema
 */
export interface ToolDefinition {
  /** Unique identifier for the tool */
  name: string
  /** Human-readable description of what the tool does */
  description: string
  /** JSON Schema for the tool's input parameters */
  inputSchema: ToolParameterSchema
  /** Optional: Categories/tags for the tool */
  tags?: string[]
  /** Optional: Whether this tool requires confirmation before execution */
  requiresConfirmation?: boolean
  /** Optional: Estimated execution time in ms */
  estimatedDuration?: number
}

/**
 * A tool call requested by the LLM
 */
export interface ToolCall {
  /** Unique ID for this tool call (for tracking responses) */
  id: string
  /** The name of the tool to invoke */
  name: string
  /** The arguments to pass to the tool, parsed as JSON */
  arguments: Record<string, unknown>
}

/**
 * Result from executing a tool
 */
export interface ToolResult {
  /** The tool call ID this result corresponds to */
  toolCallId: string
  /** The name of the tool that was called */
  toolName: string
  /** Whether the tool execution was successful */
  success: boolean
  /** The result content (can be string, JSON, or error message) */
  content: string | Record<string, unknown>
  /** Optional error details if success is false */
  error?: {
    code: string
    message: string
    details?: unknown
  }
  /** Execution metadata */
  metadata?: {
    duration?: number
    cached?: boolean
    source?: string
  }
}

/**
 * Extended LLM response that includes tool calls
 */
export interface LLMResponseWithTools {
  /** Text content from the LLM (may be empty if only tool calls) */
  content: string
  /** Tool calls requested by the LLM */
  toolCalls?: ToolCall[]
  /** Reason for stopping (content, tool_calls, length, etc.) */
  stopReason?: 'content' | 'tool_calls' | 'length' | 'stop'
  /** Token usage statistics */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Options for chat requests that support tools
 */
export interface ToolChatOptions {
  /** Available tools for the LLM to call */
  tools?: ToolDefinition[]
  /** How to handle tool calls: 'auto' lets LLM decide, 'required' forces tool use, 'none' disables */
  toolChoice?: 'auto' | 'required' | 'none' | { type: 'tool'; name: string }
  /** Maximum number of tool calls allowed in a single response */
  maxToolCalls?: number
  /** Whether to include tool execution in a loop or return for external handling */
  autoExecuteTools?: boolean
}

/**
 * Message types for tool-aware conversations
 */
export interface ToolMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  /** For assistant messages that include tool calls */
  toolCalls?: ToolCall[]
  /** For tool result messages */
  toolCallId?: string
  toolName?: string
}

/**
 * Converts ToolDefinition to provider-specific format
 */
export function toOpenAIToolFormat(tool: ToolDefinition): object {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }
}

/**
 * Converts ToolDefinition to Anthropic's tool format
 */
export function toAnthropicToolFormat(tool: ToolDefinition): object {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }
}

/**
 * Parses OpenAI tool calls from response
 * Includes error handling for malformed function calls (e.g., from Gemini API)
 */
export function parseOpenAIToolCalls(
  toolCalls: Array<{
    id: string
    type: string
    function: { name: string; arguments: string }
  }>,
): ToolCall[] {
  return toolCalls
    .filter((tc) => tc.type === 'function')
    .map((tc) => {
      let parsedArgs: Record<string, unknown> = {}

      try {
        // Handle empty or whitespace-only arguments
        const argsStr = tc.function.arguments?.trim()
        if (argsStr) {
          parsedArgs = JSON.parse(argsStr)
        }
      } catch (error) {
        console.warn(
          `[TOOL-TYPES] Failed to parse tool call arguments for "${tc.function.name}":`,
          tc.function.arguments,
          error,
        )
        // Return empty args rather than failing - let the tool executor handle validation
      }

      return {
        id: tc.id,
        name: tc.function.name,
        arguments: parsedArgs,
      }
    })
}

/**
 * Parses Anthropic tool use blocks from response
 */
export function parseAnthropicToolCalls(
  contentBlocks: Array<{
    type: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }>,
): ToolCall[] {
  return contentBlocks
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({
      id: block.id || crypto.randomUUID(),
      name: block.name || '',
      arguments: block.input || {},
    }))
}
