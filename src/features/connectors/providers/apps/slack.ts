/**
 * Slack Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Slack.
 * Supports listing, reading, and searching messages from channels.
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

/** Self-contained metadata for Slack provider */
export const metadata: ProviderMetadata = {
  id: 'slack',
  name: 'Slack',
  icon: 'Slack',
  color: '#4A154B',
  description: 'Sync messages and files from Slack channels',
  syncSupported: true,
  oauth: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: `${BRIDGE_URL}/api/slack/oauth.v2.access`,
    clientId: import.meta.env.VITE_SLACK_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'channels:history',
      'channels:read',
      'files:read',
      'users:read',
      'team:read',
    ],
    pkceRequired: false,
  },
  // Slack uses bridge proxy - no credential injection needed in dev server
}

// Register the provider
registerProvider(metadata, () => import('./slack'))

// =============================================================================
// Constants
// =============================================================================

/** Slack API base URL - use gateway proxy to avoid CORS issues and keep secrets safe */
const SLACK_API_BASE = `${BRIDGE_URL}/api/slack`

/** Slack OAuth endpoints */
const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize'
const SLACK_REVOKE_URL = 'https://slack.com/api/auth.revoke'

/** Default page size for API requests */
const DEFAULT_PAGE_SIZE = 100

/** Maximum messages to fetch per channel in history */
const MAX_MESSAGES_PER_CHANNEL = 1000

// =============================================================================
// Types
// =============================================================================

/** Slack user object */
interface SlackUser {
  id: string
  name: string
  real_name?: string
  profile?: {
    email?: string
    image_48?: string
    image_72?: string
    display_name?: string
  }
}

/** Slack channel object */
interface SlackChannel {
  id: string
  name: string
  is_channel: boolean
  is_private: boolean
  is_im: boolean
  is_mpim: boolean
  is_archived: boolean
  created: number
  updated?: number
  topic?: {
    value: string
    creator: string
  }
  purpose?: {
    value: string
    creator: string
  }
  num_members?: number
}

/** Slack message object */
interface SlackMessage {
  type: string
  user?: string
  text: string
  ts: string
  thread_ts?: string
  reply_count?: number
  reactions?: Array<{
    name: string
    count: number
    users: string[]
  }>
  files?: SlackFile[]
  attachments?: Array<{
    title?: string
    text?: string
    fallback?: string
  }>
}

/** Slack file object */
interface SlackFile {
  id: string
  name: string
  title: string
  mimetype: string
  filetype: string
  size: number
  url_private?: string
  url_private_download?: string
  permalink: string
  created: number
  updated?: number
  user: string
  channels?: string[]
}

/** Slack API response wrapper */
interface SlackApiResponse {
  ok: boolean
  error?: string
  warning?: string
  response_metadata?: {
    next_cursor?: string
  }
  [key: string]: unknown
}

/** Conversations list response */
interface ConversationsListResponse extends SlackApiResponse {
  channels?: SlackChannel[]
}

/** Conversations history response */
interface ConversationsHistoryResponse extends SlackApiResponse {
  messages?: SlackMessage[]
  has_more?: boolean
}

/** Search messages response */
interface SearchMessagesResponse extends SlackApiResponse {
  messages?: {
    matches?: Array<{
      channel: { id: string; name: string }
      ts: string
      text: string
      user?: string
      permalink: string
    }>
    total?: number
    paging?: {
      count: number
      page: number
      pages: number
    }
  }
}

/** User info response */
interface UserInfoResponse extends SlackApiResponse {
  user?: SlackUser
}

/** Auth test response */
interface AuthTestResponse extends SlackApiResponse {
  user_id?: string
  user?: string
  team_id?: string
  team?: string
  url?: string
}

/** OAuth token response */
interface SlackTokenResponse {
  ok: boolean
  error?: string
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  authed_user?: {
    id: string
    access_token?: string
  }
  team?: {
    id: string
    name: string
  }
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Slack connector provider.
 *
 * Provides OAuth authentication and API integration for Slack,
 * including channel listing, message retrieval, search, and file access.
 */
export class SlackProvider extends BaseAppConnectorProvider {
  readonly id = 'slack' as const

  readonly config: ConnectorProviderConfig = {
    id: 'slack',
    category: 'app',
    name: 'Slack',
    icon: 'slack',
    color: '#4A154B',
    capabilities: ['read', 'search'],
    supportedTypes: ['message', 'channel', 'file'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 50, windowSeconds: 60 },
  }

  /** Get the Slack OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_SLACK_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // HTTP Helpers
  // ===========================================================================

  /**
   * Make an authenticated HTTP request to the Slack API.
   *
   * Automatically adds Bearer token authentication.
   *
   * @param connector - The connector to authenticate with
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns The fetch Response
   */
  protected override async fetchWithAuth(
    connector: Connector,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getDecryptedToken(connector)

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('Content-Type', 'application/json; charset=utf-8')

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      throw new Error(
        'Access token expired or invalid. Token refresh may be required.',
      )
    }

    return response
  }

  /**
   * Fetch JSON with automatic error handling for Slack API responses.
   *
   * @param connector - The connector to use
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns Parsed JSON response
   * @throws Error if the Slack API returns an error
   */
  private async fetchSlackApi<T extends SlackApiResponse>(
    connector: Connector,
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await this.fetchWithAuth(connector, url, options)
    const data: T = await response.json()

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
    }

    return data
  }

  /**
   * Fetch JSON with a raw token (for wizard flow).
   *
   * @param token - The raw access token
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns Parsed JSON response
   */
  private async fetchSlackApiWithToken<T extends SlackApiResponse>(
    token: string,
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('Content-Type', 'application/json; charset=utf-8')

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data: T = await response.json()

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
    }

    return data
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Slack OAuth authorization URL.
   *
   * Note: Slack uses OAuth 2.0 but doesn't require PKCE.
   *
   * @param state - State parameter for CSRF protection
   * @param _codeChallenge - Not used by Slack (no PKCE support)
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, _codeChallenge: string): string {
    // User token scopes for reading messages and channels
    const userScopes = [
      'channels:history',
      'channels:read',
      'files:read',
      'groups:history',
      'groups:read',
      'im:history',
      'im:read',
      'mpim:history',
      'mpim:read',
      'search:read',
      'users:read',
      'users:read.email',
    ].join(',')

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: '', // Bot scopes (empty for user token flow)
      user_scope: userScopes, // User scopes for accessing messages
      state,
    })

    return `${SLACK_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access tokens.
   *
   * @param code - The authorization code from OAuth callback
   * @param _codeVerifier - Not used by Slack (no PKCE support)
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(
    code: string,
    _codeVerifier: string,
  ): Promise<OAuthResult> {
    const response = await fetch(`${BRIDGE_URL}/api/slack/oauth.v2.access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUri,
        // client_id and client_secret injected by bridge server
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: SlackTokenResponse = await response.json()

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error || 'Unknown error'}`)
    }

    // For user token flow, the access token is in authed_user
    const accessToken =
      data.authed_user?.access_token || data.access_token || ''

    return {
      accessToken,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope || '',
      tokenType: data.token_type || 'Bearer',
    }
  }

  /**
   * Refresh an expired access token.
   *
   * Note: Slack tokens for user token flow typically don't expire
   * unless using token rotation. This method is here for compatibility.
   *
   * @param connector - The connector
   * @returns Refreshed token result
   * @throws Error if refresh fails
   */
  async refreshToken(connector: Connector): Promise<TokenRefreshResult> {
    const refreshToken = await this.getDecryptedRefreshToken(connector)

    if (!refreshToken) {
      throw new Error(
        'No refresh token available. Slack user tokens typically do not expire.',
      )
    }

    const response = await fetch(`${BRIDGE_URL}/api/slack/oauth.v2.access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        // client_id and client_secret injected by bridge server
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: SlackTokenResponse = await response.json()

    if (!data.ok) {
      throw new Error(`Slack token refresh error: ${data.error}`)
    }

    return {
      accessToken: data.access_token || '',
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Slack.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data: AuthTestResponse = await response.json()
      return data.ok === true
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   *
   * @param connector - The connector to revoke
   */
  async revokeAccess(connector: Connector): Promise<void> {
    const token = await this.getDecryptedToken(connector)

    const response = await fetch(SLACK_REVOKE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data: SlackApiResponse = await response.json()

    if (!data.ok) {
      throw new Error(`Token revocation failed: ${data.error}`)
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
    // First, get the user ID from auth.test
    const authResponse = await fetch(`${SLACK_API_BASE}/auth.test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const authData: AuthTestResponse = await authResponse.json()

    if (!authData.ok || !authData.user_id) {
      throw new Error(
        `Failed to get auth info: ${authData.error || 'Unknown error'}`,
      )
    }

    // Then get user details
    const userResponse = await fetch(
      `${SLACK_API_BASE}/users.info?user=${authData.user_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    const userData: UserInfoResponse = await userResponse.json()

    if (!userData.ok || !userData.user) {
      throw new Error(
        `Failed to get user info: ${userData.error || 'Unknown error'}`,
      )
    }

    const user = userData.user

    return {
      id: user.id,
      email: user.profile?.email,
      name: user.real_name || user.name,
      picture: user.profile?.image_72 || user.profile?.image_48,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List channels from Slack using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of channels with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = new URLSearchParams({
      limit: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
    })

    if (options?.cursor) {
      params.set('cursor', options.cursor)
    }

    const data = await this.fetchSlackApiWithToken<ConversationsListResponse>(
      token,
      `${SLACK_API_BASE}/conversations.list?${params.toString()}`,
    )

    const channels = data.channels || []

    return {
      items: channels.map((channel) => this.normalizeChannel(channel)),
      nextCursor: data.response_metadata?.next_cursor,
      hasMore: !!data.response_metadata?.next_cursor,
    }
  }

  /**
   * List channels from Slack.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of channels with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams({
      limit: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
    })

    if (options?.cursor) {
      params.set('cursor', options.cursor)
    }

    const data = await this.fetchSlackApi<ConversationsListResponse>(
      connector,
      `${SLACK_API_BASE}/conversations.list?${params.toString()}`,
    )

    const channels = data.channels || []

    return {
      items: channels.map((channel) => this.normalizeChannel(channel)),
      nextCursor: data.response_metadata?.next_cursor,
      hasMore: !!data.response_metadata?.next_cursor,
    }
  }

  /**
   * Read the content of a channel (message history) from Slack.
   *
   * Fetches recent messages from the channel and formats them as markdown.
   *
   * @param connector - The connector to read from
   * @param externalId - The Slack channel ID
   * @returns The channel messages as markdown
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // Fetch channel info
    const infoParams = new URLSearchParams({ channel: externalId })
    const infoResponse = await this.fetchWithAuth(
      connector,
      `${SLACK_API_BASE}/conversations.info?${infoParams.toString()}`,
    )
    const infoData = await infoResponse.json()

    const channelName = infoData.channel?.name || 'Unknown Channel'
    const channelPurpose = infoData.channel?.purpose?.value || ''

    // Fetch message history
    const historyParams = new URLSearchParams({
      channel: externalId,
      limit: String(MAX_MESSAGES_PER_CHANNEL),
    })

    const historyData = await this.fetchSlackApi<ConversationsHistoryResponse>(
      connector,
      `${SLACK_API_BASE}/conversations.history?${historyParams.toString()}`,
    )

    const messages = historyData.messages || []

    // Convert messages to markdown
    const content = this.messagesToMarkdown(
      channelName,
      channelPurpose,
      messages,
    )

    return {
      content,
      mimeType: 'text/markdown',
      metadata: {
        channelId: externalId,
        channelName,
        messageCount: messages.length,
      },
    }
  }

  /**
   * Search for messages matching a query.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Matching messages
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const params = new URLSearchParams({
      query,
      count: '50',
      sort: 'timestamp',
      sort_dir: 'desc',
    })

    const data = await this.fetchSlackApi<SearchMessagesResponse>(
      connector,
      `${SLACK_API_BASE}/search.messages?${params.toString()}`,
    )

    const matches = data.messages?.matches || []

    const items: ConnectorItem[] = matches.map((match) => ({
      externalId: `${match.channel.id}:${match.ts}`,
      name: `Message in #${match.channel.name}`,
      type: 'file' as const,
      fileType: 'text' as const,
      mimeType: 'text/plain',
      path: `/slack/${match.channel.name}/${match.ts}`,
      lastModified: new Date(parseFloat(match.ts) * 1000),
      externalUrl: match.permalink,
      content: match.text,
      description: match.text.substring(0, 100),
    }))

    return {
      items,
      totalCount: data.messages?.total,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Note: Slack doesn't have a true delta API like Google Drive.
   * We simulate it by fetching channels and recent messages.
   *
   * @param connector - The connector to get changes from
   * @param cursor - Timestamp from the last sync, or null for initial sync
   * @returns Modified items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const now = new Date()

    // For initial sync, get all channels
    if (!cursor) {
      const result = await this.list(connector)

      return {
        added: result.items,
        modified: [],
        deleted: [],
        newCursor: now.toISOString(),
        hasMore: result.hasMore,
      }
    }

    // Parse cursor as timestamp
    const lastSyncTime = new Date(cursor)
    const lastSyncTs = (lastSyncTime.getTime() / 1000).toString()

    // Get channels and check for new messages since last sync
    const channelsResult = await this.list(connector)
    const modified: ConnectorItem[] = []

    // Check each channel for new messages (limited to avoid rate limits)
    const channelsToCheck = channelsResult.items.slice(0, 10)

    for (const channel of channelsToCheck) {
      try {
        const historyParams = new URLSearchParams({
          channel: channel.externalId,
          oldest: lastSyncTs,
          limit: '1',
        })

        const historyData =
          await this.fetchSlackApi<ConversationsHistoryResponse>(
            connector,
            `${SLACK_API_BASE}/conversations.history?${historyParams.toString()}`,
          )

        if (historyData.messages && historyData.messages.length > 0) {
          modified.push(channel)
        }
      } catch {
        // Skip channels we can't access
      }
    }

    return {
      added: [],
      modified,
      deleted: [],
      newCursor: now.toISOString(),
      hasMore: false,
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a Slack channel to a ConnectorItem.
   *
   * @param channel - The raw Slack channel object
   * @returns Normalized ConnectorItem
   */
  private normalizeChannel(channel: SlackChannel): ConnectorItem {
    const prefix = channel.is_private ? '🔒' : '#'
    const name = `${prefix}${channel.name}`

    return {
      externalId: channel.id,
      name,
      type: 'folder' as const,
      fileType: 'document',
      mimeType: 'text/markdown',
      path: `/slack/${channel.name}`,
      lastModified: new Date((channel.updated || channel.created) * 1000),
      description: channel.purpose?.value || channel.topic?.value,
      metadata: {
        isPrivate: channel.is_private,
        isArchived: channel.is_archived,
        numMembers: channel.num_members,
      },
    }
  }

  /**
   * Normalize raw item to ConnectorItem.
   *
   * @param rawItem - The raw Slack item
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as SlackChannel | SlackMessage | SlackFile

    // Handle channel
    if ('is_channel' in item || 'is_private' in item) {
      return this.normalizeChannel(item as SlackChannel)
    }

    // Handle file
    if ('filetype' in item && 'permalink' in item) {
      const file = item as SlackFile
      return {
        externalId: file.id,
        name: file.name || file.title,
        type: 'file' as const,
        fileType: this.getFileType(file.mimetype),
        mimeType: file.mimetype,
        size: file.size,
        path: `/slack/files/${file.name}`,
        lastModified: new Date((file.updated || file.created) * 1000),
        externalUrl: file.permalink,
      }
    }

    // Handle message (fallback)
    const message = item as SlackMessage
    return {
      externalId: message.ts,
      name: `Message ${message.ts}`,
      type: 'file' as const,
      fileType: 'text',
      mimeType: 'text/plain',
      path: `/slack/messages/${message.ts}`,
      lastModified: new Date(parseFloat(message.ts) * 1000),
      content: message.text,
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Determine file type from MIME type.
   *
   * @param mimeType - The MIME type
   * @returns File type category
   */
  private getFileType(mimeType: string): 'document' | 'image' | 'text' {
    if (mimeType.startsWith('image/')) {
      return 'image'
    }
    if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/javascript'
    ) {
      return 'text'
    }
    return 'document'
  }

  /**
   * Convert Slack messages to markdown format.
   *
   * @param channelName - The channel name
   * @param purpose - The channel purpose/description
   * @param messages - Array of Slack messages
   * @returns Markdown formatted string
   */
  private messagesToMarkdown(
    channelName: string,
    purpose: string,
    messages: SlackMessage[],
  ): string {
    const lines: string[] = []

    // Header
    lines.push(`# #${channelName}`)
    if (purpose) {
      lines.push(``)
      lines.push(`> ${purpose}`)
    }
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    // Messages (reverse to show oldest first)
    const sortedMessages = [...messages].reverse()

    for (const message of sortedMessages) {
      if (message.type !== 'message' || !message.text) {
        continue
      }

      const timestamp = new Date(parseFloat(message.ts) * 1000)
      const dateStr = timestamp.toLocaleString()
      const userId = message.user || 'Unknown'

      // Format message
      lines.push(`**[${dateStr}]** <@${userId}>`)
      lines.push(``)
      lines.push(this.formatSlackText(message.text))

      // Add reactions if present
      if (message.reactions && message.reactions.length > 0) {
        const reactionsStr = message.reactions
          .map((r) => `:${r.name}: (${r.count})`)
          .join(' ')
        lines.push(``)
        lines.push(`Reactions: ${reactionsStr}`)
      }

      // Add thread indicator
      if (message.reply_count && message.reply_count > 0) {
        lines.push(``)
        lines.push(`_${message.reply_count} replies in thread_`)
      }

      lines.push(``)
      lines.push(`---`)
      lines.push(``)
    }

    return lines.join('\n').trim()
  }

  /**
   * Format Slack message text to markdown.
   *
   * Converts Slack-specific formatting to standard markdown.
   *
   * @param text - The Slack message text
   * @returns Markdown formatted text
   */
  private formatSlackText(text: string): string {
    return (
      text
        // Convert Slack bold (*text*) - already matches markdown
        // Convert Slack italic (_text_) - already matches markdown
        // Convert Slack strikethrough (~text~) to markdown (~~text~~)
        .replace(/~([^~]+)~/g, '~~$1~~')
        // Convert Slack code (`text`) - already matches markdown
        // Convert Slack code blocks (```text```) - already matches markdown
        // Convert Slack links (<url|text>) to markdown [text](url)
        .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '[$2]($1)')
        // Convert bare Slack links (<url>) to markdown
        .replace(/<(https?:\/\/[^>]+)>/g, '$1')
        // Convert user mentions <@U123> (keep as is for now)
        // Convert channel mentions <#C123|channel-name>
        .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    )
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new SlackProvider()
