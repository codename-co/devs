/**
 * Outlook Mail Connector Plugins
 *
 * Tool plugins for Outlook Mail operations.
 *
 * @module tools/plugins/connectors/outlook
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  outlookSearch,
  outlookRead,
  outlookListFolders,
} from '@/features/connectors/tools/service'
import {
  OUTLOOK_TOOL_DEFINITIONS,
  type OutlookSearchParams,
  type OutlookSearchResult,
  type OutlookReadParams,
  type OutlookReadResult,
  type OutlookListFoldersParams,
  type OutlookListFoldersResult,
} from '@/features/connectors/tools/types'

/**
 * Outlook search plugin - Search emails in Outlook.
 */
export const outlookSearchPlugin: ToolPlugin<
  OutlookSearchParams,
  OutlookSearchResult
> = createToolPlugin({
  metadata: {
    name: 'outlook_search',
    displayName: 'Outlook Search',
    shortDescription: 'Search emails in Outlook',
    category: 'connector',
    tags: ['connector', 'outlook', 'email', 'search'],
    icon: 'MicrosoftOutlook',
    estimatedDuration: 2000,
  },
  definition: OUTLOOK_TOOL_DEFINITIONS.outlook_search,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return outlookSearch(args)
  },
})

/**
 * Outlook read plugin - Read a specific email from Outlook.
 */
export const outlookReadPlugin: ToolPlugin<
  OutlookReadParams,
  OutlookReadResult
> = createToolPlugin({
  metadata: {
    name: 'outlook_read',
    displayName: 'Outlook Read',
    shortDescription: 'Read a specific email from Outlook',
    category: 'connector',
    tags: ['connector', 'outlook', 'email', 'read'],
    icon: 'MicrosoftOutlook',
    estimatedDuration: 1500,
  },
  definition: OUTLOOK_TOOL_DEFINITIONS.outlook_read,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return outlookRead(args)
  },
})

/**
 * Outlook list folders plugin - List email folders in Outlook.
 */
export const outlookListFoldersPlugin: ToolPlugin<
  OutlookListFoldersParams,
  OutlookListFoldersResult
> = createToolPlugin({
  metadata: {
    name: 'outlook_list_folders',
    displayName: 'Outlook List Folders',
    shortDescription: 'List email folders in Outlook',
    category: 'connector',
    tags: ['connector', 'outlook', 'email', 'folders'],
    icon: 'MicrosoftOutlook',
    estimatedDuration: 1000,
  },
  definition: OUTLOOK_TOOL_DEFINITIONS.outlook_list_folders,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return outlookListFolders(args)
  },
})

/**
 * All Outlook plugins.
 */
export const outlookPlugins = [
  outlookSearchPlugin,
  outlookReadPlugin,
  outlookListFoldersPlugin,
] as const

/**
 * Outlook plugin names for registration checks.
 */
export const OUTLOOK_PLUGIN_NAMES = [
  'outlook_search',
  'outlook_read',
  'outlook_list_folders',
] as const
