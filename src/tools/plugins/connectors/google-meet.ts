/**
 * Google Meet Connector Plugins
 *
 * Tool plugins for Google Meet operations.
 *
 * @module tools/plugins/connectors/google-meet
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import { googleMeetListMeetings } from '@/features/connectors/tools/service'
import {
  GOOGLE_MEET_TOOL_DEFINITIONS,
  type GoogleMeetListMeetingsParams,
  type GoogleMeetListMeetingsResult,
} from '@/features/connectors/tools/types'

/**
 * Google Meet list meetings plugin - List Meet meetings.
 */
export const googleMeetListMeetingsPlugin: ToolPlugin<
  GoogleMeetListMeetingsParams,
  GoogleMeetListMeetingsResult
> = createToolPlugin({
  metadata: {
    name: 'google_meet_list_meetings',
    displayName: 'Google Meet List Meetings',
    shortDescription: 'List Google Meet meetings',
    category: 'connector',
    tags: ['connector', 'google-meet', 'meetings', 'video'],
    icon: 'GoogleMeet',
    estimatedDuration: 1500,
  },
  definition: GOOGLE_MEET_TOOL_DEFINITIONS.google_meet_list_meetings,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return googleMeetListMeetings(args)
  },
})

/**
 * All Google Meet plugins.
 */
export const googleMeetPlugins = [googleMeetListMeetingsPlugin] as const

/**
 * Google Meet plugin names for registration checks.
 */
export const GOOGLE_MEET_PLUGIN_NAMES = ['google_meet_list_meetings'] as const
