/**
 * Google Calendar Connector Plugins
 *
 * Tool plugins for Google Calendar operations: list events, get event, and search.
 *
 * @module tools/plugins/connectors/calendar
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  calendarListEvents,
  calendarGetEvent,
  calendarSearch,
} from '@/features/connectors/tools/service'
import {
  CALENDAR_TOOL_DEFINITIONS,
  type CalendarListEventsParams,
  type CalendarListEventsResult,
  type CalendarGetEventParams,
  type CalendarGetEventResult,
  type CalendarSearchParams,
  type CalendarSearchResult,
} from '@/features/connectors/tools/types'

/**
 * Calendar list events plugin - List events from Google Calendar.
 */
export const calendarListEventsPlugin: ToolPlugin<
  CalendarListEventsParams,
  CalendarListEventsResult
> = createToolPlugin({
  metadata: {
    name: 'calendar_list_events',
    displayName: 'Calendar List Events',
    shortDescription: 'List events from Google Calendar',
    category: 'connector',
    tags: ['connector', 'calendar', 'events', 'google'],
    icon: 'GoogleCalendar',
    estimatedDuration: 2000,
  },
  definition: CALENDAR_TOOL_DEFINITIONS.calendar_list_events,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return calendarListEvents(args)
  },
})

/**
 * Calendar get event plugin - Get a specific event from Google Calendar.
 */
export const calendarGetEventPlugin: ToolPlugin<
  CalendarGetEventParams,
  CalendarGetEventResult
> = createToolPlugin({
  metadata: {
    name: 'calendar_get_event',
    displayName: 'Calendar Get Event',
    shortDescription: 'Get a specific event from Google Calendar',
    category: 'connector',
    tags: ['connector', 'calendar', 'event', 'google'],
    icon: 'GoogleCalendar',
    estimatedDuration: 1500,
  },
  definition: CALENDAR_TOOL_DEFINITIONS.calendar_get_event,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return calendarGetEvent(args)
  },
})

/**
 * Calendar search plugin - Search events in Google Calendar.
 */
export const calendarSearchPlugin: ToolPlugin<
  CalendarSearchParams,
  CalendarSearchResult
> = createToolPlugin({
  metadata: {
    name: 'calendar_search',
    displayName: 'Calendar Search',
    shortDescription: 'Search events in Google Calendar',
    category: 'connector',
    tags: ['connector', 'calendar', 'search', 'google'],
    icon: 'GoogleCalendar',
    estimatedDuration: 2000,
  },
  definition: CALENDAR_TOOL_DEFINITIONS.calendar_search,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return calendarSearch(args)
  },
})

/**
 * All Calendar plugins.
 */
export const calendarPlugins = [
  calendarListEventsPlugin,
  calendarGetEventPlugin,
  calendarSearchPlugin,
] as const

/**
 * Calendar plugin names for registration checks.
 */
export const CALENDAR_PLUGIN_NAMES = [
  'calendar_list_events',
  'calendar_get_event',
  'calendar_search',
] as const
