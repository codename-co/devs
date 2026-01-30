/**
 * Tool Plugin Bridge
 *
 * Bridges the new ToolPluginRegistry with the legacy KnowledgeToolRegistry.
 * This allows the new plugin system to work with existing tool execution code.
 *
 * @module tools/bridge
 */

import type { ToolPlugin, ToolCategory } from './types'
import { toolRegistry } from './registry'
import { allPlugins } from './plugins'
import type {
  ToolRegistry,
  ToolRegistrationOptions,
} from '@/lib/tool-executor/types'

// ============================================================================
// Bridge Functions
// ============================================================================

/**
 * Register a plugin with both the new toolRegistry and a legacy registry.
 *
 * @param plugin - The plugin to register
 * @param legacyRegistry - The legacy registry to also register with
 * @param options - Registration options for the legacy registry
 */
export function registerPluginWithLegacy(
  plugin: ToolPlugin<any, any>,
  legacyRegistry: ToolRegistry,
  options?: ToolRegistrationOptions,
): void {
  // Register with new plugin registry (if not already)
  if (!toolRegistry.has(plugin.metadata.name)) {
    toolRegistry.register(plugin)
  }

  // Register with legacy registry
  if (!legacyRegistry.has(plugin.metadata.name)) {
    legacyRegistry.register(plugin.definition, plugin.handler, {
      replace: options?.replace,
      tags: plugin.metadata.tags,
      estimatedDuration: plugin.metadata.estimatedDuration,
      requiresConfirmation: plugin.metadata.requiresConfirmation,
    })
  }
}

/**
 * Register all plugins in a category with a legacy registry.
 *
 * @param category - The category of plugins to register
 * @param legacyRegistry - The legacy registry to register with
 */
export function registerCategoryWithLegacy(
  category: ToolCategory,
  legacyRegistry: ToolRegistry,
): void {
  const plugins = allPlugins.filter((p) => p.metadata.category === category)
  for (const plugin of plugins) {
    registerPluginWithLegacy(plugin, legacyRegistry)
  }
}

/**
 * Unregister all plugins in a category from a legacy registry.
 *
 * @param category - The category of plugins to unregister
 * @param legacyRegistry - The legacy registry to unregister from
 */
export function unregisterCategoryFromLegacy(
  category: ToolCategory,
  legacyRegistry: ToolRegistry,
): void {
  const plugins = allPlugins.filter((p) => p.metadata.category === category)
  for (const plugin of plugins) {
    legacyRegistry.unregister(plugin.metadata.name)
  }
}

/**
 * Check if all plugins in a category are registered in a legacy registry.
 *
 * @param category - The category to check
 * @param legacyRegistry - The legacy registry to check
 * @returns true if all plugins in the category are registered
 */
export function isCategoryRegisteredInLegacy(
  category: ToolCategory,
  legacyRegistry: ToolRegistry,
): boolean {
  const plugins = allPlugins.filter((p) => p.metadata.category === category)
  return plugins.every((p) => legacyRegistry.has(p.metadata.name))
}

/**
 * Sync all plugins from toolRegistry to a legacy registry.
 * Useful for initial setup or after adding new plugins.
 *
 * @param legacyRegistry - The legacy registry to sync with
 */
export function syncAllPluginsToLegacy(legacyRegistry: ToolRegistry): void {
  for (const plugin of allPlugins) {
    registerPluginWithLegacy(plugin, legacyRegistry)
  }
}

/**
 * Get plugin names by category.
 *
 * @param category - The category to get names for
 * @returns Array of plugin names in the category
 */
export function getPluginNamesByCategory(category: ToolCategory): string[] {
  return allPlugins
    .filter((p) => p.metadata.category === category)
    .map((p) => p.metadata.name)
}

// ============================================================================
// Category-specific helpers (for backward compatibility)
// ============================================================================

/** Names of knowledge tools */
export const KNOWLEDGE_TOOL_NAMES = getPluginNamesByCategory('knowledge')

/** Names of math tools */
export const MATH_TOOL_NAMES = getPluginNamesByCategory('math')

/** Names of code tools */
export const CODE_TOOL_NAMES = getPluginNamesByCategory('code')

/** Names of presentation tools */
export const PRESENTATION_TOOL_NAMES = getPluginNamesByCategory('presentation')

/** Names of utility tools */
export const UTILITY_TOOL_NAMES = getPluginNamesByCategory('utility')

/** Names of connector tools */
export const CONNECTOR_TOOL_NAMES = getPluginNamesByCategory('connector')
