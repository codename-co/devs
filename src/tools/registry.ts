/**
 * Tool Plugin Registry
 *
 * Central registry for tool plugins in DEVS.
 * Tools register themselves to be available for agents.
 *
 * @module tools/registry
 *
 * @example
 * ```typescript
 * import { toolRegistry, createToolPlugin } from '@/tools'
 *
 * // Create and register a tool
 * const myTool = createToolPlugin({
 *   metadata: { name: 'my_tool', ... },
 *   definition: { ... },
 *   handler: async (args, context) => { ... }
 * })
 *
 * toolRegistry.register(myTool)
 *
 * // List available tools
 * const tools = toolRegistry.list({ category: 'utility' })
 * ```
 */

import type { ToolDefinition } from '@/lib/llm/types'
import type {
  ToolPlugin,
  RegisteredToolPlugin,
  ToolPluginRegistrationOptions,
  ToolPluginListOptions,
  IToolPluginRegistry,
  ToolMetadata,
} from './types'

// ============================================================================
// Tool Plugin Registry Implementation
// ============================================================================

/**
 * Registry for managing tool plugins.
 * Provides a central place for tools to register themselves
 * and for agents to discover available tools.
 */
export class ToolPluginRegistry implements IToolPluginRegistry {
  /** Internal storage for registered tools */
  private tools: Map<string, RegisteredToolPlugin> = new Map()

  /**
   * Register a tool plugin.
   * The tool will be available for agents to use.
   *
   * @param plugin - The tool plugin to register
   * @param options - Registration options
   * @throws Error if a tool with the same name already exists and replace is false
   */
  register<TArgs = Record<string, unknown>, TResult = unknown>(
    plugin: ToolPlugin<TArgs, TResult>,
    options?: ToolPluginRegistrationOptions,
  ): void {
    const name = plugin.metadata.name

    // Check for existing tool
    if (this.tools.has(name) && !options?.replace) {
      throw new Error(
        `Tool "${name}" is already registered. Use { replace: true } to override.`,
      )
    }

    // Create registered tool with metadata
    const registeredTool: RegisteredToolPlugin<TArgs, TResult> = {
      ...plugin,
      registeredAt: new Date(),
      enabled: options?.enabled ?? true,
    }

    // Store the tool
    this.tools.set(name, registeredTool as RegisteredToolPlugin)

    // Call initialize if available
    if (plugin.initialize) {
      plugin.initialize().catch((error) => {
        console.error(
          `[ToolPluginRegistry] Failed to initialize tool "${name}":`,
          error,
        )
      })
    }
  }

  /**
   * Unregister a tool by name.
   * Calls the plugin's cleanup function if available.
   *
   * @param name - The tool name to unregister
   * @returns true if the tool was found and removed
   */
  async unregister(name: string): Promise<boolean> {
    const tool = this.tools.get(name)
    if (!tool) {
      return false
    }

    // Call cleanup if available
    if (tool.cleanup) {
      try {
        await tool.cleanup()
      } catch (error) {
        console.error(
          `[ToolPluginRegistry] Failed to cleanup tool "${name}":`,
          error,
        )
      }
    }

    return this.tools.delete(name)
  }

  /**
   * Get a registered tool by name.
   *
   * @param name - The tool name to look up
   * @returns The registered tool or undefined if not found
   */
  get(name: string): RegisteredToolPlugin | undefined {
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
   * Apply filters to tools collection.
   */
  private applyFilters(
    tools: IterableIterator<RegisteredToolPlugin>,
    options?: ToolPluginListOptions,
  ): RegisteredToolPlugin[] {
    const result: RegisteredToolPlugin[] = []

    for (const tool of tools) {
      // Filter by enabled status
      if (options?.enabledOnly && !tool.enabled) {
        continue
      }

      // Filter by category
      if (options?.category && tool.metadata.category !== options.category) {
        continue
      }

      // Filter by tags
      if (options?.tags && options.tags.length > 0) {
        const toolTags = tool.metadata.tags ?? []
        const hasMatchingTag = options.tags.some((tag) =>
          toolTags.includes(tag),
        )
        if (!hasMatchingTag) {
          continue
        }
      }

      result.push(tool)
    }

    return result
  }

  /**
   * List all registered tools.
   *
   * @param options - Filter options
   * @returns Array of registered tools matching the filters
   */
  list(options?: ToolPluginListOptions): RegisteredToolPlugin[] {
    return this.applyFilters(this.tools.values(), options)
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
   * Get tool metadata for UI display.
   *
   * @param options - Filter options
   * @returns Array of tool metadata
   */
  listMetadata(options?: ToolPluginListOptions): ToolMetadata[] {
    return this.applyFilters(this.tools.values(), options).map(
      (tool) => tool.metadata,
    )
  }

  /**
   * Get tool definitions for LLM requests.
   *
   * @param options - Filter options
   * @returns Array of tool definitions
   */
  listDefinitions(options?: ToolPluginListOptions): ToolDefinition[] {
    return this.applyFilters(this.tools.values(), options).map(
      (tool) => tool.definition,
    )
  }

  /**
   * Enable or disable a tool.
   *
   * @param name - The tool name
   * @param enabled - Whether to enable the tool
   * @returns true if the tool was found and updated
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const tool = this.tools.get(name)
    if (!tool) {
      return false
    }
    tool.enabled = enabled
    return true
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
   * Calls cleanup on all tools before removing.
   */
  async clear(): Promise<void> {
    // Cleanup all tools
    const cleanupPromises: Promise<void>[] = []
    for (const tool of this.tools.values()) {
      if (tool.cleanup) {
        cleanupPromises.push(
          tool.cleanup().catch((error) => {
            console.error(
              `[ToolPluginRegistry] Failed to cleanup tool "${tool.metadata.name}":`,
              error,
            )
          }),
        )
      }
    }
    await Promise.all(cleanupPromises)

    this.tools.clear()
  }

  /**
   * Get tools by category.
   * Convenience method for UI grouping.
   *
   * @param category - The category to filter by
   * @returns Array of registered tools in the category
   */
  getByCategory(category: string): RegisteredToolPlugin[] {
    return this.list({
      category: category as RegisteredToolPlugin['metadata']['category'],
    })
  }

  /**
   * Get all unique categories.
   *
   * @returns Array of unique category names
   */
  getCategories(): string[] {
    const categories = new Set<string>()
    for (const tool of this.tools.values()) {
      categories.add(tool.metadata.category)
    }
    return Array.from(categories).sort()
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a tool plugin with type safety.
 * This is a helper function to ensure type correctness when creating plugins.
 *
 * @param plugin - The tool plugin definition
 * @returns The same plugin with proper types
 *
 * @example
 * ```typescript
 * const myTool = createToolPlugin({
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
 *       description: 'Does something useful',
 *       parameters: {
 *         type: 'object',
 *         properties: { input: { type: 'string' } },
 *         required: ['input']
 *       }
 *     }
 *   },
 *   handler: async (args) => {
 *     return { output: args.input.toUpperCase() }
 *   }
 * })
 * ```
 */
export function createToolPlugin<
  TArgs = Record<string, unknown>,
  TResult = unknown,
>(plugin: ToolPlugin<TArgs, TResult>): ToolPlugin<TArgs, TResult> {
  return plugin
}

// ============================================================================
// Default Registry Instance (Singleton)
// ============================================================================

/**
 * Default tool plugin registry instance.
 * Use this for registering tools in the application.
 *
 * @example
 * ```typescript
 * import { toolRegistry } from '@/tools'
 *
 * // Register a tool
 * toolRegistry.register(myToolPlugin)
 *
 * // Get available tools for an agent
 * const tools = toolRegistry.list({ enabledOnly: true })
 * ```
 */
export const toolRegistry = new ToolPluginRegistry()
