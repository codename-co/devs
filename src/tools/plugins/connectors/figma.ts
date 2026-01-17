/**
 * Figma Connector Plugins
 *
 * Tool plugins for Figma operations.
 *
 * @module tools/plugins/connectors/figma
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  figmaListFiles,
  figmaGetFile,
  figmaGetComments,
} from '@/features/connectors/tools/service'
import {
  FIGMA_TOOL_DEFINITIONS,
  type FigmaListFilesParams,
  type FigmaListFilesResult,
  type FigmaGetFileParams,
  type FigmaGetFileResult,
  type FigmaGetCommentsParams,
  type FigmaGetCommentsResult,
} from '@/features/connectors/tools/types'

/**
 * Figma list files plugin - List files in a Figma project.
 */
export const figmaListFilesPlugin: ToolPlugin<FigmaListFilesParams, FigmaListFilesResult> =
  createToolPlugin({
    metadata: {
      name: 'figma_list_files',
      displayName: 'Figma List Files',
      shortDescription: 'List files in a Figma project',
      category: 'connector',
      tags: ['connector', 'figma', 'design', 'files'],
      icon: 'Figma',
      estimatedDuration: 2000,
    },
    definition: FIGMA_TOOL_DEFINITIONS.figma_list_files,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return figmaListFiles(args)
    },
  })

/**
 * Figma get file plugin - Get a specific Figma file.
 */
export const figmaGetFilePlugin: ToolPlugin<FigmaGetFileParams, FigmaGetFileResult> =
  createToolPlugin({
    metadata: {
      name: 'figma_get_file',
      displayName: 'Figma Get File',
      shortDescription: 'Get a specific Figma file',
      category: 'connector',
      tags: ['connector', 'figma', 'design', 'file'],
      icon: 'Figma',
      estimatedDuration: 2500,
    },
    definition: FIGMA_TOOL_DEFINITIONS.figma_get_file,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return figmaGetFile(args)
    },
  })

/**
 * Figma get comments plugin - Get comments on a Figma file.
 */
export const figmaGetCommentsPlugin: ToolPlugin<
  FigmaGetCommentsParams,
  FigmaGetCommentsResult
> = createToolPlugin({
  metadata: {
    name: 'figma_get_comments',
    displayName: 'Figma Get Comments',
    shortDescription: 'Get comments on a Figma file',
    category: 'connector',
    tags: ['connector', 'figma', 'design', 'comments'],
    icon: 'Figma',
    estimatedDuration: 1500,
  },
  definition: FIGMA_TOOL_DEFINITIONS.figma_get_comments,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return figmaGetComments(args)
  },
})

/**
 * All Figma plugins.
 */
export const figmaPlugins = [
  figmaListFilesPlugin,
  figmaGetFilePlugin,
  figmaGetCommentsPlugin,
] as const

/**
 * Figma plugin names for registration checks.
 */
export const FIGMA_PLUGIN_NAMES = [
  'figma_list_files',
  'figma_get_file',
  'figma_get_comments',
] as const
