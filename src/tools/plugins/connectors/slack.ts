/**
 * Slack Connector Plugins
 *
 * Tool plugins for Slack operations.
 *
 * @module tools/plugins/connectors/slack
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  slackSearch,
  slackListChannels,
  slackReadChannel,
} from '@/features/connectors/tools/service'
import {
  SLACK_TOOL_DEFINITIONS,
  type SlackSearchParams,
  type SlackSearchResult,
  type SlackListChannelsParams,
  type SlackListChannelsResult,
  type SlackReadChannelParams,
  type SlackReadChannelResult,
} from '@/features/connectors/tools/types'

/**
 * Slack search plugin - Search messages in Slack.
 */
export const slackSearchPlugin: ToolPlugin<
  SlackSearchParams,
  SlackSearchResult
> = createToolPlugin({
  metadata: {
    name: 'slack_search',
    displayName: 'Slack Search',
    shortDescription: 'Search messages in Slack',
    category: 'connector',
    tags: ['connector', 'slack', 'messages', 'search'],
    icon: 'Slack',
    estimatedDuration: 2000,
  },
  definition: SLACK_TOOL_DEFINITIONS.slack_search,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return slackSearch(args)
  },
})

/**
 * Slack list channels plugin - List Slack channels.
 */
export const slackListChannelsPlugin: ToolPlugin<
  SlackListChannelsParams,
  SlackListChannelsResult
> = createToolPlugin({
  metadata: {
    name: 'slack_list_channels',
    displayName: 'Slack List Channels',
    shortDescription: 'List Slack channels',
    category: 'connector',
    tags: ['connector', 'slack', 'channels', 'list'],
    icon: 'Slack',
    estimatedDuration: 1500,
  },
  definition: SLACK_TOOL_DEFINITIONS.slack_list_channels,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return slackListChannels(args)
  },
})

/**
 * Slack read channel plugin - Read messages from a Slack channel.
 */
export const slackReadChannelPlugin: ToolPlugin<
  SlackReadChannelParams,
  SlackReadChannelResult
> = createToolPlugin({
  metadata: {
    name: 'slack_read_channel',
    displayName: 'Slack Read Channel',
    shortDescription: 'Read messages from a Slack channel',
    category: 'connector',
    tags: ['connector', 'slack', 'channel', 'messages'],
    icon: 'Slack',
    estimatedDuration: 2000,
  },
  definition: SLACK_TOOL_DEFINITIONS.slack_read_channel,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return slackReadChannel(args)
  },
})

/**
 * All Slack plugins.
 */
export const slackPlugins = [
  slackSearchPlugin,
  slackListChannelsPlugin,
  slackReadChannelPlugin,
] as const

/**
 * Slack plugin names for registration checks.
 */
export const SLACK_PLUGIN_NAMES = [
  'slack_search',
  'slack_list_channels',
  'slack_read_channel',
] as const
