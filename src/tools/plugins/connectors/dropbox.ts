/**
 * Dropbox Connector Plugins
 *
 * Tool plugins for Dropbox operations.
 *
 * @module tools/plugins/connectors/dropbox
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  dropboxSearch,
  dropboxRead,
  dropboxList,
} from '@/features/connectors/tools/service'
import {
  DROPBOX_TOOL_DEFINITIONS,
  type DropboxSearchParams,
  type DropboxSearchResult,
  type DropboxReadParams,
  type DropboxReadResult,
  type DropboxListParams,
  type DropboxListResult,
} from '@/features/connectors/tools/types'

/**
 * Dropbox search plugin - Search files in Dropbox.
 */
export const dropboxSearchPlugin: ToolPlugin<DropboxSearchParams, DropboxSearchResult> =
  createToolPlugin({
    metadata: {
      name: 'dropbox_search',
      displayName: 'Dropbox Search',
      shortDescription: 'Search files in Dropbox',
      category: 'connector',
      tags: ['connector', 'dropbox', 'files', 'search'],
      icon: 'Dropbox',
      estimatedDuration: 2000,
    },
    definition: DROPBOX_TOOL_DEFINITIONS.dropbox_search,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return dropboxSearch(args)
    },
  })

/**
 * Dropbox read plugin - Read a specific file from Dropbox.
 */
export const dropboxReadPlugin: ToolPlugin<DropboxReadParams, DropboxReadResult> =
  createToolPlugin({
    metadata: {
      name: 'dropbox_read',
      displayName: 'Dropbox Read',
      shortDescription: 'Read a specific file from Dropbox',
      category: 'connector',
      tags: ['connector', 'dropbox', 'files', 'read'],
      icon: 'Dropbox',
      estimatedDuration: 2000,
    },
    definition: DROPBOX_TOOL_DEFINITIONS.dropbox_read,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return dropboxRead(args)
    },
  })

/**
 * Dropbox list plugin - List files in a Dropbox folder.
 */
export const dropboxListPlugin: ToolPlugin<DropboxListParams, DropboxListResult> =
  createToolPlugin({
    metadata: {
      name: 'dropbox_list',
      displayName: 'Dropbox List',
      shortDescription: 'List files in a Dropbox folder',
      category: 'connector',
      tags: ['connector', 'dropbox', 'files', 'list'],
      icon: 'Dropbox',
      estimatedDuration: 1500,
    },
    definition: DROPBOX_TOOL_DEFINITIONS.dropbox_list,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return dropboxList(args)
    },
  })

/**
 * All Dropbox plugins.
 */
export const dropboxPlugins = [
  dropboxSearchPlugin,
  dropboxReadPlugin,
  dropboxListPlugin,
] as const

/**
 * Dropbox plugin names for registration checks.
 */
export const DROPBOX_PLUGIN_NAMES = [
  'dropbox_search',
  'dropbox_read',
  'dropbox_list',
] as const
