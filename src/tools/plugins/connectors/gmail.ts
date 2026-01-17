/**
 * Gmail Connector Plugins
 *
 * Tool plugins for Gmail operations: search, read, list labels, and create drafts.
 *
 * @module tools/plugins/connectors/gmail
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  gmailSearch,
  gmailRead,
  gmailListLabels,
  gmailCreateDraft,
} from '@/features/connectors/tools/service'
import {
  GMAIL_TOOL_DEFINITIONS,
  type GmailSearchParams,
  type GmailSearchResult,
  type GmailReadParams,
  type GmailReadResult,
  type GmailListLabelsParams,
  type GmailListLabelsResult,
  type GmailCreateDraftParams,
  type GmailCreateDraftResult,
} from '@/features/connectors/tools/types'

/**
 * Gmail search plugin - Search emails using Gmail search syntax.
 */
export const gmailSearchPlugin: ToolPlugin<
  GmailSearchParams,
  GmailSearchResult
> = createToolPlugin({
  metadata: {
    name: 'gmail_search',
    displayName: 'Gmail Search',
    shortDescription: 'Search emails using Gmail search syntax',
    category: 'connector',
    tags: ['connector', 'gmail', 'search', 'email'],
    icon: 'Mail',
    estimatedDuration: 2000,
  },
  definition: GMAIL_TOOL_DEFINITIONS.gmail_search,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return gmailSearch(args)
  },
})

/**
 * Gmail read plugin - Read a specific email message.
 */
export const gmailReadPlugin: ToolPlugin<GmailReadParams, GmailReadResult> =
  createToolPlugin({
    metadata: {
      name: 'gmail_read',
      displayName: 'Gmail Read',
      shortDescription: 'Read a specific email message by ID',
      category: 'connector',
      tags: ['connector', 'gmail', 'read', 'email'],
      icon: 'Mail',
      estimatedDuration: 1500,
    },
    definition: GMAIL_TOOL_DEFINITIONS.gmail_read,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return gmailRead(args)
    },
  })

/**
 * Gmail list labels plugin - List available Gmail labels.
 */
export const gmailListLabelsPlugin: ToolPlugin<
  GmailListLabelsParams,
  GmailListLabelsResult
> = createToolPlugin({
  metadata: {
    name: 'gmail_list_labels',
    displayName: 'Gmail List Labels',
    shortDescription: 'List available Gmail labels for organizing emails',
    category: 'connector',
    tags: ['connector', 'gmail', 'labels', 'email'],
    icon: 'Mail',
    estimatedDuration: 1000,
  },
  definition: GMAIL_TOOL_DEFINITIONS.gmail_list_labels,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return gmailListLabels(args)
  },
})

/**
 * Gmail create draft plugin - Create an email draft for review.
 */
export const gmailCreateDraftPlugin: ToolPlugin<
  GmailCreateDraftParams,
  GmailCreateDraftResult
> = createToolPlugin({
  metadata: {
    name: 'gmail_create_draft',
    displayName: 'Gmail Create Draft',
    shortDescription: 'Create an email draft for the user to review and send',
    category: 'connector',
    tags: ['connector', 'gmail', 'draft', 'email', 'compose'],
    icon: 'Mail',
    estimatedDuration: 2000,
  },
  definition: GMAIL_TOOL_DEFINITIONS.gmail_create_draft,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return gmailCreateDraft(args)
  },
})

/**
 * All Gmail plugins.
 */
export const gmailPlugins = [
  gmailSearchPlugin,
  gmailReadPlugin,
  gmailListLabelsPlugin,
  gmailCreateDraftPlugin,
] as const

/**
 * Gmail plugin names for registration checks.
 */
export const GMAIL_PLUGIN_NAMES = [
  'gmail_search',
  'gmail_read',
  'gmail_list_labels',
  'gmail_create_draft',
] as const
