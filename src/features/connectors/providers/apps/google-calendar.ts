/**
 * Google Calendar Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Google Calendar.
 * Supports listing, reading, searching events, and delta sync via syncToken.
 */

import { BRIDGE_URL } from '@/config/bridge'

import { BaseAppConnectorProvider } from '../../connector-provider'
import type {
  Connector,
  ConnectorProviderConfig,
  OAuthResult,
  TokenRefreshResult,
  AccountInfo,
  ListOptions,
  ListResult,
  ContentResult,
  SearchResult,
  ChangesResult,
  ConnectorItem,
  ProviderMetadata,
} from '../../types'
import { registerProvider } from './registry'

// =============================================================================
// Provider Metadata
// =============================================================================

/** Self-contained metadata for Google Calendar provider */
export const metadata: ProviderMetadata = {
  id: 'google-calendar',
  name: 'Google Calendar',
  icon: 'GoogleCalendar',
  color: '#34a853',
  description: 'Sync calendar events',
  syncSupported: false,
  oauth: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: `${BRIDGE_URL}/api/google/token`,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    pkceRequired: true,
  },
  // Google providers share proxy routes - defined in google-drive
}

// Register the provider
registerProvider(metadata, () => import('./google-calendar'))

// =============================================================================
// Constants
// =============================================================================

/** Google Calendar API v3 base URL */
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

/** Google OAuth2 endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Use bridge URL for token operations - bridge injects client_secret server-side */
const GOOGLE_TOKEN_URL = `${BRIDGE_URL}/api/google/token`
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** Google Calendar API scope */
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

/** Default page size for event listing */
const DEFAULT_PAGE_SIZE = 50

/** Default calendar ID (primary calendar) */
const DEFAULT_CALENDAR_ID = 'primary'

// =============================================================================
// Types
// =============================================================================

/** Google Calendar event time */
interface EventDateTime {
  date?: string // All-day event (YYYY-MM-DD)
  dateTime?: string // Specific time (RFC3339)
  timeZone?: string
}

/** Google Calendar event attendee */
interface EventAttendee {
  email?: string
  displayName?: string
  organizer?: boolean
  self?: boolean
  resource?: boolean
  optional?: boolean
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  comment?: string
}

/** Google Calendar event reminder */
interface EventReminder {
  method: 'email' | 'popup'
  minutes: number
}

/** Google Calendar event */
interface CalendarEvent {
  id: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
  created?: string
  updated?: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  creator?: {
    email?: string
    displayName?: string
    self?: boolean
  }
  organizer?: {
    email?: string
    displayName?: string
    self?: boolean
  }
  start?: EventDateTime
  end?: EventDateTime
  endTimeUnspecified?: boolean
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: EventDateTime
  transparency?: 'opaque' | 'transparent'
  visibility?: 'default' | 'public' | 'private' | 'confidential'
  iCalUID?: string
  sequence?: number
  attendees?: EventAttendee[]
  attendeesOmitted?: boolean
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
  }
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
    conferenceSolution?: {
      name: string
      iconUri: string
    }
  }
  gadget?: unknown
  anyoneCanAddSelf?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanModify?: boolean
  guestsCanSeeOtherGuests?: boolean
  privateCopy?: boolean
  locked?: boolean
  reminders?: {
    useDefault: boolean
    overrides?: EventReminder[]
  }
  source?: {
    url: string
    title: string
  }
  attachments?: Array<{
    fileUrl: string
    title: string
    mimeType: string
    iconLink: string
    fileId: string
  }>
  eventType?: 'default' | 'outOfOffice' | 'focusTime' | 'workingLocation'
}

/** Response from events.list */
interface CalendarEventsListResponse {
  kind: string
  etag: string
  summary?: string
  description?: string
  updated?: string
  timeZone?: string
  accessRole?: string
  defaultReminders?: EventReminder[]
  nextPageToken?: string
  nextSyncToken?: string
  items?: CalendarEvent[]
}

/** Response from Google OAuth token endpoint */
interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope: string
  token_type: string
}

/** Response from Google userinfo endpoint */
interface GoogleUserInfoResponse {
  id: string
  email?: string
  name?: string
  picture?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format an event date/time for display.
 *
 * @param eventDateTime - The event date/time object
 * @returns Formatted date/time string
 */
function formatDateTime(eventDateTime: EventDateTime | undefined): string {
  if (!eventDateTime) return 'Not specified'

  // All-day event
  if (eventDateTime.date) {
    const date = new Date(eventDateTime.date + 'T00:00:00')
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Specific time
  if (eventDateTime.dateTime) {
    const date = new Date(eventDateTime.dateTime)
    return date.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  }

  return 'Not specified'
}

/**
 * Format a calendar event as markdown.
 *
 * @param event - The calendar event to format
 * @returns Markdown-formatted event content
 */
function formatEventAsMarkdown(event: CalendarEvent): string {
  const sections: string[] = []

  // Title
  sections.push(`# ${event.summary || 'Untitled Event'}`)
  sections.push('')

  // When
  const startStr = formatDateTime(event.start)
  const endStr = formatDateTime(event.end)
  if (event.start?.date && event.end?.date) {
    // All-day event - check if single day or multi-day
    const startDate = new Date(event.start.date)
    const endDate = new Date(event.end.date)
    endDate.setDate(endDate.getDate() - 1) // End date is exclusive for all-day events
    if (startDate.getTime() === endDate.getTime()) {
      sections.push(`**When:** ${startStr} (All day)`)
    } else {
      sections.push(
        `**When:** ${startStr} - ${formatDateTime({ date: event.end.date })}`,
      )
    }
  } else {
    sections.push(`**When:** ${startStr} - ${endStr}`)
  }

  // Where
  sections.push(`**Where:** ${event.location || 'Not specified'}`)

  // Status
  if (event.status && event.status !== 'confirmed') {
    sections.push(`**Status:** ${event.status}`)
  }

  // Conference link
  if (event.hangoutLink) {
    sections.push(`**Video Call:** [Join Google Meet](${event.hangoutLink})`)
  } else if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (e) => e.entryPointType === 'video',
    )
    if (videoEntry) {
      sections.push(`**Video Call:** [Join](${videoEntry.uri})`)
    }
  }

  sections.push('')

  // Description
  sections.push('## Description')
  sections.push(event.description || 'No description')
  sections.push('')

  // Attendees
  if (event.attendees && event.attendees.length > 0) {
    sections.push('## Attendees')
    for (const attendee of event.attendees) {
      const name = attendee.displayName || attendee.email || 'Unknown'
      const status = attendee.responseStatus || 'unknown'
      const role = attendee.organizer
        ? ' (Organizer)'
        : attendee.optional
          ? ' (Optional)'
          : ''
      sections.push(`- ${name}${role} - ${status}`)
    }
    sections.push('')
  }

  // Organizer
  if (event.organizer && !event.organizer.self) {
    sections.push('## Organizer')
    sections.push(
      event.organizer.displayName || event.organizer.email || 'Unknown',
    )
    sections.push('')
  }

  // Recurrence
  if (event.recurrence && event.recurrence.length > 0) {
    sections.push('## Recurrence')
    sections.push('This is a recurring event.')
    sections.push('')
  }

  // Reminders
  if (
    event.reminders &&
    !event.reminders.useDefault &&
    event.reminders.overrides
  ) {
    sections.push('## Reminders')
    for (const reminder of event.reminders.overrides) {
      sections.push(`- ${reminder.method}: ${reminder.minutes} minutes before`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Parse a Date from event date/time.
 *
 * @param eventDateTime - The event date/time object
 * @returns Date object or current date if parsing fails
 */
function parseEventDateTime(eventDateTime: EventDateTime | undefined): Date {
  if (!eventDateTime) return new Date()

  if (eventDateTime.dateTime) {
    return new Date(eventDateTime.dateTime)
  }

  if (eventDateTime.date) {
    return new Date(eventDateTime.date + 'T00:00:00')
  }

  return new Date()
}

/**
 * Create a short description for an event.
 *
 * @param event - The calendar event
 * @returns Short description string
 */
function createEventDescription(event: CalendarEvent): string {
  const parts: string[] = []

  // Date/time
  const start = event.start
  if (start?.date) {
    parts.push(new Date(start.date + 'T00:00:00').toLocaleDateString())
  } else if (start?.dateTime) {
    const date = new Date(start.dateTime)
    parts.push(
      date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }),
    )
  }

  // Location
  if (event.location) {
    parts.push(event.location)
  }

  return parts.join(' • ')
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Google Calendar connector provider.
 *
 * Provides OAuth authentication and API integration for Google Calendar,
 * including event listing, content retrieval, search, and delta sync.
 */
export class GoogleCalendarProvider extends BaseAppConnectorProvider {
  readonly id = 'google-calendar' as const

  readonly config: ConnectorProviderConfig = {
    id: 'google-calendar',
    category: 'app',
    name: 'Google Calendar',
    icon: 'google-calendar',
    color: '#4285F4',
    capabilities: ['read', 'search'],
    supportedTypes: ['event'],
    maxFileSize: 1024 * 1024,
    rateLimit: { requests: 500, windowSeconds: 100 },
  }

  /** Get the Google OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Google OAuth authorization URL for Calendar.
   *
   * Builds a URL with PKCE support for secure browser-based OAuth.
   *
   * @param state - State parameter for CSRF protection
   * @param codeChallenge - PKCE code challenge (S256)
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param code - The authorization code from OAuth callback
   * @param codeVerifier - The PKCE code verifier
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: GoogleTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    }
  }

  /**
   * Refresh an expired access token using the refresh token.
   *
   * @param connector - The connector with the refresh token
   * @returns New access token and expiration
   * @throws Error if refresh fails or no refresh token available
   */
  async refreshToken(connector: Connector): Promise<TokenRefreshResult> {
    const refreshToken = await this.getDecryptedRefreshToken(connector)

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: GoogleTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Google.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`,
      )
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   *
   * @param connector - The connector to revoke access for
   * @throws Error if revocation fails
   */
  async revokeAccess(connector: Connector): Promise<void> {
    const token = await this.getDecryptedToken(connector)

    const response = await fetch(
      `${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Token revocation failed: ${response.status} ${errorText}`,
      )
    }
  }

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and email
   * @throws Error if fetching account info fails
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get account info: ${response.status} ${errorText}`,
      )
    }

    const data: GoogleUserInfoResponse = await response.json()

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List events from Google Calendar using a raw access token.
   *
   * Note: Calendar uses calendar selection, not folder selection,
   * so this is primarily for API consistency.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of events with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const calendarId =
      (options?.filter?.calendarId as string) || DEFAULT_CALENDAR_ID

    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    // Default to upcoming events (from now)
    const timeMin =
      (options?.filter?.timeMin as string) || new Date().toISOString()
    params.set('timeMin', timeMin)

    const listUrl = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
    const listData =
      await this.fetchJsonWithRawToken<CalendarEventsListResponse>(
        token,
        listUrl,
      )

    if (!listData.items || listData.items.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    // Filter out cancelled events
    const activeEvents = listData.items.filter(
      (event) => event.status !== 'cancelled',
    )

    return {
      items: activeEvents.map((event) => this.normalizeItem(event, calendarId)),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * List events from Google Calendar.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   *   - filter.calendarId: Calendar ID (default: 'primary')
   *   - filter.timeMin: Start of date range (ISO string)
   *   - filter.timeMax: End of date range (ISO string)
   *   - filter.singleEvents: Expand recurring events (default: true)
   * @returns List of events with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const calendarId =
      (options?.filter?.calendarId as string) || DEFAULT_CALENDAR_ID

    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      singleEvents: String(options?.filter?.singleEvents ?? true),
      orderBy: 'startTime',
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    // Default to upcoming events (from now)
    const timeMin =
      (options?.filter?.timeMin as string) || new Date().toISOString()
    params.set('timeMin', timeMin)

    // Optional end of date range
    if (options?.filter?.timeMax) {
      params.set('timeMax', options.filter.timeMax as string)
    }

    const listUrl = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`

    try {
      const listData = await this.fetchJson<CalendarEventsListResponse>(
        connector,
        listUrl,
      )

      if (!listData.items || listData.items.length === 0) {
        return {
          items: [],
          hasMore: false,
        }
      }

      // Filter out cancelled events
      const activeEvents = listData.items.filter(
        (event) => event.status !== 'cancelled',
      )

      return {
        items: activeEvents.map((event) =>
          this.normalizeItem(event, calendarId),
        ),
        nextCursor: listData.nextPageToken,
        hasMore: !!listData.nextPageToken,
      }
    } catch (error) {
      // Handle specific API errors
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(`Calendar '${calendarId}' not found`)
        }
        if (error.message.includes('403')) {
          throw new Error(`Access denied to calendar '${calendarId}'`)
        }
      }
      throw error
    }
  }

  /**
   * Read the content of a specific event from Google Calendar.
   *
   * @param connector - The connector to read from
   * @param externalId - The event ID (may include calendar ID as prefix: "calendarId:eventId")
   * @returns The event content and metadata
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // Parse externalId - may be "calendarId:eventId" or just "eventId"
    let calendarId = DEFAULT_CALENDAR_ID
    let eventId = externalId

    if (externalId.includes(':')) {
      const parts = externalId.split(':')
      calendarId = parts[0]
      eventId = parts.slice(1).join(':')
    }

    const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`

    try {
      const event = await this.fetchJson<CalendarEvent>(connector, url)

      // Format the content as markdown
      const content = formatEventAsMarkdown(event)

      return {
        content,
        mimeType: 'text/markdown',
        metadata: {
          id: event.id,
          calendarId,
          status: event.status,
          created: event.created,
          updated: event.updated,
          summary: event.summary,
          location: event.location,
          start: event.start,
          end: event.end,
          htmlLink: event.htmlLink,
          hangoutLink: event.hangoutLink,
          attendeeCount: event.attendees?.length || 0,
          isRecurring:
            !!event.recurringEventId ||
            (event.recurrence && event.recurrence.length > 0),
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(
            `Event '${eventId}' not found in calendar '${calendarId}'`,
          )
        }
        if (error.message.includes('403')) {
          throw new Error(`Access denied to event '${eventId}'`)
        }
      }
      throw error
    }
  }

  /**
   * Search for events matching a query.
   *
   * Uses Google Calendar's 'q' parameter for free-text search.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Matching events
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(DEFAULT_PAGE_SIZE),
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: new Date().toISOString(),
    })

    const searchUrl = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events?${params.toString()}`

    try {
      const listData = await this.fetchJson<CalendarEventsListResponse>(
        connector,
        searchUrl,
      )

      if (!listData.items || listData.items.length === 0) {
        return {
          items: [],
          totalCount: 0,
        }
      }

      // Filter out cancelled events
      const activeEvents = listData.items.filter(
        (event) => event.status !== 'cancelled',
      )

      return {
        items: activeEvents.map((event) =>
          this.normalizeItem(event, DEFAULT_CALENDAR_ID),
        ),
        totalCount: activeEvents.length,
        nextCursor: listData.nextPageToken,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return {
          items: [],
          totalCount: 0,
        }
      }
      throw error
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Uses Google Calendar's syncToken mechanism for efficient incremental sync.
   * - Initial sync: No syncToken, fetches all events
   * - Delta sync: Uses syncToken to get only changed events
   * - On 410 GONE: Token is invalid, triggers full resync
   *
   * @param connector - The connector to get changes from
   * @param cursor - The syncToken from the last sync, or null for initial sync
   * @returns Added, modified, and deleted items with new cursor (syncToken)
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const calendarId = DEFAULT_CALENDAR_ID

    const params = new URLSearchParams({
      maxResults: '250', // Higher limit for sync operations
      singleEvents: 'true',
    })

    // If we have a cursor (syncToken), use it for delta sync
    if (cursor) {
      params.set('syncToken', cursor)
    } else {
      // Initial sync - get events from a reasonable time range
      // Default to past 30 days and future 365 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      params.set('timeMin', thirtyDaysAgo.toISOString())
    }

    const syncUrl = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`

    try {
      const response = await this.fetchWithAuth(connector, syncUrl)

      // Handle 410 GONE - syncToken is invalid, need full resync
      if (response.status === 410) {
        // Return signal to trigger full resync
        return {
          added: [],
          modified: [],
          deleted: [],
          newCursor: '', // Empty cursor signals need for full resync
          hasMore: false,
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Calendar sync failed: ${response.status} ${errorText}`)
      }

      const listData: CalendarEventsListResponse = await response.json()

      const added: ConnectorItem[] = []
      const modified: ConnectorItem[] = []
      const deleted: string[] = []

      if (listData.items) {
        for (const event of listData.items) {
          if (event.status === 'cancelled') {
            // Event was deleted or cancelled
            deleted.push(event.id)
          } else if (cursor) {
            // During delta sync, treat all non-cancelled as modified
            // The consuming code can determine if it's truly new or updated
            modified.push(this.normalizeItem(event, calendarId))
          } else {
            // Initial sync - all events are "added"
            added.push(this.normalizeItem(event, calendarId))
          }
        }
      }

      // The syncToken for the next delta sync
      const newCursor = listData.nextSyncToken || ''

      return {
        added,
        modified,
        deleted,
        newCursor,
        hasMore: !!listData.nextPageToken,
      }
    } catch (error) {
      // Handle 410 GONE that may come as a thrown error
      if (error instanceof Error && error.message.includes('410')) {
        return {
          added: [],
          modified: [],
          deleted: [],
          newCursor: '', // Empty cursor signals need for full resync
          hasMore: false,
        }
      }
      throw error
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a Google Calendar event to a ConnectorItem.
   *
   * @param rawItem - The raw calendar event object
   * @param calendarId - The calendar ID (used for path construction)
   * @returns Normalized ConnectorItem
   */
  normalizeItem(
    rawItem: unknown,
    calendarId: string = DEFAULT_CALENDAR_ID,
  ): ConnectorItem {
    const event = rawItem as CalendarEvent

    // Determine last modified date
    const lastModified = event.updated
      ? new Date(event.updated)
      : event.created
        ? new Date(event.created)
        : new Date()

    // Get the event start for description
    const startDate = parseEventDateTime(event.start)

    // Build the external ID (include calendar ID for non-primary calendars)
    const externalId =
      calendarId === DEFAULT_CALENDAR_ID
        ? event.id
        : `${calendarId}:${event.id}`

    // Format content as markdown
    const content = formatEventAsMarkdown(event)

    // Build tags from event properties
    const tags: string[] = ['event']
    if (event.status === 'tentative') tags.push('tentative')
    if (
      event.recurringEventId ||
      (event.recurrence && event.recurrence.length > 0)
    ) {
      tags.push('recurring')
    }
    if (event.hangoutLink || event.conferenceData) tags.push('video-call')
    if (event.attendees && event.attendees.length > 0)
      tags.push('has-attendees')

    return {
      externalId,
      name: event.summary || 'Untitled Event',
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'text/calendar',
      path: `/calendar/${calendarId}`,
      lastModified,
      externalUrl: event.htmlLink,
      content,
      description: createEventDescription(event),
      tags,
      metadata: {
        calendarId,
        eventId: event.id,
        status: event.status,
        location: event.location,
        start: event.start,
        end: event.end,
        startTimestamp: startDate.getTime(),
        created: event.created,
        updated: event.updated,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        attendeeCount: event.attendees?.length || 0,
        isRecurring:
          !!event.recurringEventId ||
          (event.recurrence && event.recurrence.length > 0),
        organizer: event.organizer,
        creator: event.creator,
      },
    }
  }

  // ===========================================================================
  // Additional Methods
  // ===========================================================================

  /**
   * Get list of calendars for the authenticated user.
   *
   * @param connector - The connector to use
   * @returns Array of calendar objects with ID and name
   */
  async getCalendars(
    connector: Connector,
  ): Promise<Array<{ id: string; name: string; primary?: boolean }>> {
    interface CalendarListEntry {
      id: string
      summary: string
      primary?: boolean
      accessRole?: string
    }

    interface CalendarListResponse {
      items?: CalendarListEntry[]
    }

    const url = `${CALENDAR_API_BASE}/users/me/calendarList`
    const response = await this.fetchJson<CalendarListResponse>(connector, url)

    return (response.items || []).map((cal) => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary,
    }))
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new GoogleCalendarProvider()
