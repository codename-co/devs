/**
 * Google Meet Connector Provider
 *
 * Implements OAuth 2.0 authentication for Google Meet.
 * This connector enables DEVS agents to join meetings as participants.
 *
 * Unlike other connectors that sync content, this connector provides
 * real-time meeting participation capabilities via the devs-meet service.
 */

import { BRIDGE_URL } from '@/config/bridge'

import { BaseAppConnectorProvider } from '../../connector-provider'
import type {
  Connector,
  ConnectorProviderConfig,
  ConnectorItem,
  OAuthResult,
  TokenRefreshResult,
  AccountInfo,
  ListOptions,
  ListResult,
  ContentResult,
  ChangesResult,
  ProviderMetadata,
} from '../../types'
import { registerProvider } from './registry'

// =============================================================================
// Provider Metadata
// =============================================================================

/** Self-contained metadata for Google Meet provider */
export const metadata: ProviderMetadata = {
  id: 'google-meet',
  name: 'Google Meet',
  icon: 'GoogleMeet',
  color: '#00897B',
  description: 'Join meetings with AI agents',
  syncSupported: false,
  active: false, // Not ready for production
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
registerProvider(metadata, () => import('./google-meet'))

// =============================================================================
// Constants
// =============================================================================

/** Google OAuth2 endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Use bridge URL for token operations - bridge injects client_secret server-side */
const GOOGLE_TOKEN_URL = `${BRIDGE_URL}/api/google/token`
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** Google Calendar API for listing scheduled meetings */
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

/** Default devs-meet WebSocket server URL */
const DEFAULT_MEET_SERVER = 'ws://localhost:4445'

// =============================================================================
// Types
// =============================================================================

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

/** Calendar event from Google Calendar API */
interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: {
    dateTime?: string
    date?: string
  }
  end?: {
    dateTime?: string
    date?: string
  }
  hangoutLink?: string
  conferenceData?: {
    conferenceId?: string
    entryPoints?: Array<{
      entryPointType: string
      uri: string
    }>
  }
}

/** Google Meet meeting info extracted from calendar events */
export interface MeetMeetingInfo {
  id: string
  title: string
  startTime?: Date
  endTime?: Date
  meetUrl: string
  calendarEventId?: string
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Google Meet connector provider.
 *
 * Provides OAuth authentication for Google Meet and enables
 * DEVS agents to join meetings as real participants.
 *
 * Key differences from other connectors:
 * - Does not sync content to Knowledge Base
 * - Provides real-time meeting participation
 * - Requires the devs-meet server to be running
 */
export class GoogleMeetProvider extends BaseAppConnectorProvider {
  readonly id = 'google-meet' as const

  readonly config: ConnectorProviderConfig = {
    id: 'google-meet',
    category: 'app',
    name: 'Google Meet',
    icon: 'google-meet',
    color: '#00897B',
    capabilities: ['read'], // Read meeting transcripts
    supportedTypes: ['*'],
    maxFileSize: 0, // N/A for meetings
    rateLimit: { requests: 100, windowSeconds: 60 },
  }

  private meetServerUrl: string = DEFAULT_MEET_SERVER

  /** Get the Google OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  /**
   * Set the devs-meet server URL
   */
  setMeetServerUrl(url: string): void {
    this.meetServerUrl = url
  }

  /**
   * Get the devs-meet server URL
   */
  getMeetServerUrl(): string {
    return this.meetServerUrl
  }

  // ===========================================================================
  // Abstract Methods Implementation (Required by BaseAppConnectorProvider)
  // ===========================================================================

  /**
   * Generate the Google OAuth authorization URL.
   *
   * @param state - State parameter for CSRF protection
   * @param codeChallenge - PKCE code challenge (S256)
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, codeChallenge: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ')

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes,
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

  /**
   * List items - returns empty for Meet connector (no content sync).
   */
  async list(
    _connector: Connector,
    _options?: ListOptions,
  ): Promise<ListResult> {
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false,
    }
  }

  /**
   * List items with raw token - returns empty for Meet connector.
   */
  async listWithToken(
    _token: string,
    _options?: ListOptions,
  ): Promise<ListResult> {
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false,
    }
  }

  /**
   * Read content - not supported for Meet connector.
   */
  async read(
    _connector: Connector,
    _externalId: string,
  ): Promise<ContentResult> {
    throw new Error('Content retrieval not supported for Google Meet connector')
  }

  /**
   * Get changes - returns empty for Meet connector (no delta sync).
   */
  async getChanges(
    _connector: Connector,
    _cursor: string | null,
  ): Promise<ChangesResult> {
    return {
      added: [],
      modified: [],
      deleted: [],
      newCursor: '',
      hasMore: false,
    }
  }

  /**
   * Normalize a raw item - not used for Meet connector.
   */
  normalizeItem(_rawItem: unknown): ConnectorItem {
    // Meet connector doesn't sync items, but we need to implement this
    throw new Error(
      'Item normalization not supported for Google Meet connector',
    )
  }

  // ===========================================================================
  // Meeting-Specific Methods
  // ===========================================================================

  /**
   * List upcoming Google Meet meetings from calendar.
   */
  async listUpcomingMeetings(
    connector: Connector,
    maxResults: number = 10,
  ): Promise<MeetMeetingInfo[]> {
    const now = new Date().toISOString()
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: now,
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    interface CalendarListResponse {
      items?: CalendarEvent[]
    }

    const data = await this.fetchJson<CalendarListResponse>(
      connector,
      `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
    )

    const events: CalendarEvent[] = data.items || []

    // Filter events with Google Meet links
    const meetings: MeetMeetingInfo[] = []

    for (const event of events) {
      const meetUrl = this.extractMeetUrl(event)
      if (meetUrl) {
        meetings.push({
          id: event.id,
          title: event.summary || 'Untitled Meeting',
          startTime: event.start?.dateTime
            ? new Date(event.start.dateTime)
            : event.start?.date
              ? new Date(event.start.date)
              : undefined,
          endTime: event.end?.dateTime
            ? new Date(event.end.dateTime)
            : event.end?.date
              ? new Date(event.end.date)
              : undefined,
          meetUrl,
          calendarEventId: event.id,
        })
      }
    }

    return meetings
  }

  /**
   * Extract Google Meet URL from a calendar event.
   */
  private extractMeetUrl(event: CalendarEvent): string | null {
    // Check hangoutLink (legacy but still common)
    if (event.hangoutLink) {
      return event.hangoutLink
    }

    // Check conferenceData entry points
    if (event.conferenceData?.entryPoints) {
      for (const entry of event.conferenceData.entryPoints) {
        if (entry.entryPointType === 'video' && entry.uri) {
          return entry.uri
        }
      }
    }

    return null
  }

  /**
   * Get authentication data for the meeting bot.
   * This extracts the necessary tokens for the bot to authenticate.
   */
  async getMeetAuthData(connector: Connector): Promise<{
    accessToken: string
    accountEmail?: string
    accountName?: string
  }> {
    const accessToken = await this.getDecryptedToken(connector)
    const accountInfo = await this.getAccountInfo(accessToken)

    return {
      accessToken,
      accountEmail: accountInfo.email,
      accountName: accountInfo.name,
    }
  }
}

// =============================================================================
// Export
// =============================================================================

export const googleMeetProvider = new GoogleMeetProvider()
export default googleMeetProvider
