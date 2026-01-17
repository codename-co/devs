/**
 * Notion Connector Plugins
 *
 * Tool plugins for Notion operations: search, read page, and query database.
 *
 * @module tools/plugins/connectors/notion
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  notionSearch,
  notionReadPage,
  notionQueryDatabase,
} from '@/features/connectors/tools/service'
import {
  NOTION_TOOL_DEFINITIONS,
  type NotionSearchParams,
  type NotionSearchResult,
  type NotionReadPageParams,
  type NotionReadPageResult,
  type NotionQueryDatabaseParams,
  type NotionQueryDatabaseResult,
} from '@/features/connectors/tools/types'

/**
 * Notion search plugin - Search pages and databases in Notion.
 */
export const notionSearchPlugin: ToolPlugin<
  NotionSearchParams,
  NotionSearchResult
> = createToolPlugin({
  metadata: {
    name: 'notion_search',
    displayName: 'Notion Search',
    shortDescription: 'Search pages and databases in Notion',
    category: 'connector',
    tags: ['connector', 'notion', 'search'],
    icon: 'Notion',
    estimatedDuration: 2000,
  },
  definition: NOTION_TOOL_DEFINITIONS.notion_search,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return notionSearch(args)
  },
})

/**
 * Notion read page plugin - Read a specific page from Notion.
 */
export const notionReadPagePlugin: ToolPlugin<
  NotionReadPageParams,
  NotionReadPageResult
> = createToolPlugin({
  metadata: {
    name: 'notion_read_page',
    displayName: 'Notion Read Page',
    shortDescription: 'Read a specific page from Notion',
    category: 'connector',
    tags: ['connector', 'notion', 'read', 'page'],
    icon: 'Notion',
    estimatedDuration: 1500,
  },
  definition: NOTION_TOOL_DEFINITIONS.notion_read_page,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return notionReadPage(args)
  },
})

/**
 * Notion query database plugin - Query a Notion database.
 */
export const notionQueryDatabasePlugin: ToolPlugin<
  NotionQueryDatabaseParams,
  NotionQueryDatabaseResult
> = createToolPlugin({
  metadata: {
    name: 'notion_query_database',
    displayName: 'Notion Query Database',
    shortDescription: 'Query a Notion database with filters',
    category: 'connector',
    tags: ['connector', 'notion', 'database', 'query'],
    icon: 'Notion',
    estimatedDuration: 2000,
  },
  definition: NOTION_TOOL_DEFINITIONS.notion_query_database,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return notionQueryDatabase(args)
  },
})

/**
 * All Notion plugins.
 */
export const notionPlugins = [
  notionSearchPlugin,
  notionReadPagePlugin,
  notionQueryDatabasePlugin,
] as const

/**
 * Notion plugin names for registration checks.
 */
export const NOTION_PLUGIN_NAMES = [
  'notion_search',
  'notion_read_page',
  'notion_query_database',
] as const
