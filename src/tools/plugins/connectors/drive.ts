/**
 * Google Drive Connector Plugins
 *
 * Tool plugins for Google Drive operations: search, read, and list.
 *
 * @module tools/plugins/connectors/drive
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  driveSearch,
  driveRead,
  driveList,
} from '@/features/connectors/tools/service'
import {
  DRIVE_TOOL_DEFINITIONS,
  type DriveSearchParams,
  type DriveSearchResult,
  type DriveReadParams,
  type DriveReadResult,
  type DriveListParams,
  type DriveListResult,
} from '@/features/connectors/tools/types'

/**
 * Drive search plugin - Search files in Google Drive.
 */
export const driveSearchPlugin: ToolPlugin<DriveSearchParams, DriveSearchResult> =
  createToolPlugin({
    metadata: {
      name: 'drive_search',
      displayName: 'Drive Search',
      shortDescription: 'Search files in Google Drive',
      category: 'connector',
      tags: ['connector', 'drive', 'search', 'files'],
      icon: 'GoogleDrive',
      estimatedDuration: 2000,
    },
    definition: DRIVE_TOOL_DEFINITIONS.drive_search,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return driveSearch(args)
    },
  })

/**
 * Drive read plugin - Read a specific file from Google Drive.
 */
export const driveReadPlugin: ToolPlugin<DriveReadParams, DriveReadResult> =
  createToolPlugin({
    metadata: {
      name: 'drive_read',
      displayName: 'Drive Read',
      shortDescription: 'Read a specific file from Google Drive',
      category: 'connector',
      tags: ['connector', 'drive', 'read', 'files'],
      icon: 'GoogleDrive',
      estimatedDuration: 2000,
    },
    definition: DRIVE_TOOL_DEFINITIONS.drive_read,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return driveRead(args)
    },
  })

/**
 * Drive list plugin - List files in a Google Drive folder.
 */
export const driveListPlugin: ToolPlugin<DriveListParams, DriveListResult> =
  createToolPlugin({
    metadata: {
      name: 'drive_list',
      displayName: 'Drive List',
      shortDescription: 'List files in a Google Drive folder',
      category: 'connector',
      tags: ['connector', 'drive', 'list', 'files'],
      icon: 'GoogleDrive',
      estimatedDuration: 1500,
    },
    definition: DRIVE_TOOL_DEFINITIONS.drive_list,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return driveList(args)
    },
  })

/**
 * All Drive plugins.
 */
export const drivePlugins = [
  driveSearchPlugin,
  driveReadPlugin,
  driveListPlugin,
] as const

/**
 * Drive plugin names for registration checks.
 */
export const DRIVE_PLUGIN_NAMES = [
  'drive_search',
  'drive_read',
  'drive_list',
] as const
