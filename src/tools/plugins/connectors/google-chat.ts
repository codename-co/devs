/**
 * Google Chat Connector Plugins
 *
 * Tool plugins for Google Chat operations.
 *
 * @module tools/plugins/connectors/google-chat
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  googleChatListSpaces,
  googleChatReadMessages,
} from '@/features/connectors/tools/service'
import {
  GOOGLE_CHAT_TOOL_DEFINITIONS,
  type GoogleChatListSpacesParams,
  type GoogleChatListSpacesResult,
  type GoogleChatReadMessagesParams,
  type GoogleChatReadMessagesResult,
} from '@/features/connectors/tools/types'

/**
 * Google Chat list spaces plugin - List Chat spaces.
 */
export const googleChatListSpacesPlugin: ToolPlugin<
  GoogleChatListSpacesParams,
  GoogleChatListSpacesResult
> = createToolPlugin({
  metadata: {
    name: 'google_chat_list_spaces',
    displayName: 'Google Chat List Spaces',
    shortDescription: 'List Google Chat spaces',
    category: 'connector',
    tags: ['connector', 'google-chat', 'chat', 'spaces'],
    icon: 'GoogleChat',
    estimatedDuration: 1500,
  },
  definition: GOOGLE_CHAT_TOOL_DEFINITIONS.google_chat_list_spaces,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return googleChatListSpaces(args)
  },
})

/**
 * Google Chat read messages plugin - Read messages from a Chat space.
 */
export const googleChatReadMessagesPlugin: ToolPlugin<
  GoogleChatReadMessagesParams,
  GoogleChatReadMessagesResult
> = createToolPlugin({
  metadata: {
    name: 'google_chat_read_messages',
    displayName: 'Google Chat Read Messages',
    shortDescription: 'Read messages from a Google Chat space',
    category: 'connector',
    tags: ['connector', 'google-chat', 'chat', 'messages'],
    icon: 'GoogleChat',
    estimatedDuration: 2000,
  },
  definition: GOOGLE_CHAT_TOOL_DEFINITIONS.google_chat_read_messages,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return googleChatReadMessages(args)
  },
})

/**
 * All Google Chat plugins.
 */
export const googleChatPlugins = [
  googleChatListSpacesPlugin,
  googleChatReadMessagesPlugin,
] as const

/**
 * Google Chat plugin names for registration checks.
 */
export const GOOGLE_CHAT_PLUGIN_NAMES = [
  'google_chat_list_spaces',
  'google_chat_read_messages',
] as const
