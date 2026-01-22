/**
 * Tool Plugin Types
 *
 * Defines the common interface for all tools in DEVS.
 * Tools are modular, self-registering components that provide
 * capabilities to LLM agents.
 *
 * @module tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'
import type { IconName } from '@/lib/types'
import type {
  ToolHandler,
  ToolRegistrationOptions,
} from '@/lib/tool-executor/types'

// ============================================================================
// Tool Categories
// ============================================================================

/**
 * Categories for organizing tools in the UI.
 * Each category groups related tools together.
 */
export type ToolCategory =
  | 'knowledge' // Knowledge base operations
  | 'math' // Mathematical calculations
  | 'code' // Code execution
  | 'presentation' // Presentation generation
  | 'web' // Web search and internet tools
  | 'research' // Research tools (Wikipedia, arXiv, etc.)
  | 'connector' // External service integrations
  | 'utility' // General utility tools
  | 'custom' // User-defined tools

// ============================================================================
// Tool Metadata
// ============================================================================

/**
 * Human-readable metadata for displaying tools in the UI.
 * Used by AgentToolsPicker and other components.
 */
export interface ToolMetadata {
  /** Unique identifier for the tool (matches function name) */
  name: string
  /** Human-readable display name */
  displayName: string
  /** Short description for UI display */
  shortDescription: string
  /** Icon to display in the UI */
  icon: IconName
  /** Category for grouping tools */
  category: ToolCategory
  /** Tags for filtering and searching */
  tags?: string[]
  /** Whether this tool is enabled by default for new agents */
  enabledByDefault?: boolean
  /** Estimated execution time in milliseconds (for progress estimation) */
  estimatedDuration?: number
  /** Whether this tool requires user confirmation before execution */
  requiresConfirmation?: boolean
}

// ============================================================================
// Tool Plugin Interface
// ============================================================================

/**
 * A tool plugin that can be registered with the tool system.
 * Tools implement this interface to provide capabilities to LLM agents.
 *
 * @template TArgs - Type of the tool's arguments
 * @template TResult - Type of the tool's result
 *
 * @example
 * ```typescript
 * const myTool: ToolPlugin<MyArgs, MyResult> = {
 *   metadata: {
 *     name: 'my_tool',
 *     displayName: 'My Tool',
 *     shortDescription: 'Does something useful',
 *     icon: 'Puzzle',
 *     category: 'utility',
 *   },
 *   definition: {
 *     type: 'function',
 *     function: {
 *       name: 'my_tool',
 *       description: 'Does something useful for the agent',
 *       parameters: { ... }
 *     }
 *   },
 *   handler: async (args, context) => {
 *     // Implementation
 *     return result
 *   }
 * }
 * ```
 */
export interface ToolPlugin<
  TArgs = Record<string, unknown>,
  TResult = unknown,
> {
  /** Human-readable metadata for UI display */
  metadata: ToolMetadata
  /** LLM tool definition (OpenAI function calling format) */
  definition: ToolDefinition
  /** Handler function that executes the tool */
  handler: ToolHandler<TArgs, TResult>
  /**
   * Optional validator for arguments.
   * Called before handler to validate/transform arguments.
   * Should throw an error if validation fails.
   */
  validate?: (args: unknown) => TArgs | never
  /**
   * Optional initialization function.
   * Called when the tool is registered.
   * Can be used to set up resources.
   */
  initialize?: () => Promise<void>
  /**
   * Optional cleanup function.
   * Called when the tool is unregistered.
   * Can be used to release resources.
   */
  cleanup?: () => Promise<void>
}

// ============================================================================
// Registered Tool
// ============================================================================

/**
 * A tool that has been registered with the registry.
 * Includes the plugin and registration metadata.
 */
export interface RegisteredToolPlugin<
  TArgs = Record<string, unknown>,
  TResult = unknown,
> extends ToolPlugin<TArgs, TResult> {
  /** When the tool was registered */
  registeredAt: Date
  /** Whether the tool is currently enabled */
  enabled: boolean
}

// ============================================================================
// Tool Registry Interface
// ============================================================================

/**
 * Options for registering a tool plugin.
 */
export interface ToolPluginRegistrationOptions extends ToolRegistrationOptions {
  /** Whether to enable the tool immediately */
  enabled?: boolean
}

/**
 * Options for listing tools.
 */
export interface ToolPluginListOptions {
  /** Filter by category */
  category?: ToolCategory
  /** Filter by tags (tools must have at least one matching tag) */
  tags?: string[]
  /** Only return enabled tools */
  enabledOnly?: boolean
}

/**
 * Interface for the tool plugin registry.
 * Manages registered tool plugins and their lifecycle.
 */
export interface IToolPluginRegistry {
  /**
   * Register a tool plugin.
   * The tool will be available for agents to use.
   *
   * @param plugin - The tool plugin to register
   * @param options - Registration options
   * @throws Error if a tool with the same name already exists
   */
  register<TArgs = Record<string, unknown>, TResult = unknown>(
    plugin: ToolPlugin<TArgs, TResult>,
    options?: ToolPluginRegistrationOptions,
  ): void

  /**
   * Unregister a tool by name.
   * Calls the plugin's cleanup function if available.
   *
   * @param name - The tool name to unregister
   * @returns true if the tool was found and removed
   */
  unregister(name: string): Promise<boolean>

  /**
   * Get a registered tool by name.
   *
   * @param name - The tool name to look up
   * @returns The registered tool or undefined if not found
   */
  get(name: string): RegisteredToolPlugin | undefined

  /**
   * Check if a tool is registered.
   *
   * @param name - The tool name to check
   * @returns true if the tool is registered
   */
  has(name: string): boolean

  /**
   * List all registered tools.
   *
   * @param options - Filter options
   * @returns Array of registered tools matching the filters
   */
  list(options?: ToolPluginListOptions): RegisteredToolPlugin[]

  /**
   * List all registered tool names.
   *
   * @returns Array of tool names
   */
  listNames(): string[]

  /**
   * Get tool metadata for UI display.
   *
   * @param options - Filter options
   * @returns Array of tool metadata
   */
  listMetadata(options?: ToolPluginListOptions): ToolMetadata[]

  /**
   * Get tool definitions for LLM requests.
   *
   * @param options - Filter options
   * @returns Array of tool definitions
   */
  listDefinitions(options?: ToolPluginListOptions): ToolDefinition[]

  /**
   * Enable or disable a tool.
   *
   * @param name - The tool name
   * @param enabled - Whether to enable the tool
   * @returns true if the tool was found and updated
   */
  setEnabled(name: string, enabled: boolean): boolean

  /**
   * Get count of registered tools.
   *
   * @returns Number of registered tools
   */
  count(): number

  /**
   * Clear all registered tools.
   * Calls cleanup on all tools before removing.
   */
  clear(): Promise<void>
}
