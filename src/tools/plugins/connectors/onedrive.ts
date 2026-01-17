/**
 * OneDrive Connector Plugins
 *
 * Tool plugins for OneDrive operations.
 *
 * @module tools/plugins/connectors/onedrive
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  onedriveSearch,
  onedriveRead,
  onedriveList,
} from '@/features/connectors/tools/service'
import {
  ONEDRIVE_TOOL_DEFINITIONS,
  type OneDriveSearchParams,
  type OneDriveSearchResult,
  type OneDriveReadParams,
  type OneDriveReadResult,
  type OneDriveListParams,
  type OneDriveListResult,
} from '@/features/connectors/tools/types'

/**
 * OneDrive search plugin - Search files in OneDrive.
 */
export const onedriveSearchPlugin: ToolPlugin<
  OneDriveSearchParams,
  OneDriveSearchResult
> = createToolPlugin({
  metadata: {
    name: 'onedrive_search',
    displayName: 'OneDrive Search',
    shortDescription: 'Search files in OneDrive',
    category: 'connector',
    tags: ['connector', 'onedrive', 'files', 'search'],
    icon: 'OneDrive',
    estimatedDuration: 2000,
  },
  definition: ONEDRIVE_TOOL_DEFINITIONS.onedrive_search,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return onedriveSearch(args)
  },
})

/**
 * OneDrive read plugin - Read a specific file from OneDrive.
 */
export const onedriveReadPlugin: ToolPlugin<
  OneDriveReadParams,
  OneDriveReadResult
> = createToolPlugin({
  metadata: {
    name: 'onedrive_read',
    displayName: 'OneDrive Read',
    shortDescription: 'Read a specific file from OneDrive',
    category: 'connector',
    tags: ['connector', 'onedrive', 'files', 'read'],
    icon: 'OneDrive',
    estimatedDuration: 2000,
  },
  definition: ONEDRIVE_TOOL_DEFINITIONS.onedrive_read,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return onedriveRead(args)
  },
})

/**
 * OneDrive list plugin - List files in a OneDrive folder.
 */
export const onedriveListPlugin: ToolPlugin<
  OneDriveListParams,
  OneDriveListResult
> = createToolPlugin({
  metadata: {
    name: 'onedrive_list',
    displayName: 'OneDrive List',
    shortDescription: 'List files in a OneDrive folder',
    category: 'connector',
    tags: ['connector', 'onedrive', 'files', 'list'],
    icon: 'OneDrive',
    estimatedDuration: 1500,
  },
  definition: ONEDRIVE_TOOL_DEFINITIONS.onedrive_list,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return onedriveList(args)
  },
})

/**
 * All OneDrive plugins.
 */
export const onedrivePlugins = [
  onedriveSearchPlugin,
  onedriveReadPlugin,
  onedriveListPlugin,
] as const

/**
 * OneDrive plugin names for registration checks.
 */
export const ONEDRIVE_PLUGIN_NAMES = [
  'onedrive_search',
  'onedrive_read',
  'onedrive_list',
] as const
