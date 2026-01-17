/**
 * Tools Module
 *
 * Central module for DEVS tool system.
 * Tools are modular, self-registering components that provide
 * capabilities to LLM agents.
 *
 * @module tools
 *
 * @example
 * ```typescript
 * import { toolRegistry, createToolPlugin } from '@/tools'
 * import { calculatePlugin, registerAllPlugins } from '@/tools/plugins'
 *
 * // Register a single plugin
 * toolRegistry.register(calculatePlugin)
 *
 * // Or register all plugins at once
 * registerAllPlugins(toolRegistry)
 *
 * // Create a custom tool plugin
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
 *
 * toolRegistry.register(myTool)
 *
 * // List available tools
 * const tools = toolRegistry.list({ enabledOnly: true })
 * const metadata = toolRegistry.listMetadata({ category: 'utility' })
 * const definitions = toolRegistry.listDefinitions()
 * ```
 */

// Types
export type {
  ToolCategory,
  ToolMetadata,
  ToolPlugin,
  RegisteredToolPlugin,
  ToolPluginRegistrationOptions,
  ToolPluginListOptions,
  IToolPluginRegistry,
} from './types'

// Registry
export { ToolPluginRegistry, createToolPlugin, toolRegistry } from './registry'

// Plugins are exported from their own module
// import { calculatePlugin, allPlugins, registerAllPlugins } from '@/tools/plugins'
