/**
 * Google Chat Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Google Chat.
 * Supports listing spaces, reading messages, and delta sync.
 */

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
} from '../../types'

// =============================================================================
// Constants
// =============================================================================

/** Google Chat API v1 base URL */
const CHAT_API_BASE = 'https://chat.googleapis.com/v1'

/** Google OAuth2 endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** Google Chat API scopes */
const CHAT_SCOPES = [
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
].join(' ')

/** Default page size for message listing */
const DEFAULT_PAGE_SIZE = 50

// =============================================================================
// Types
// =============================================================================

/** Google Chat space */
interface ChatSpace {
  name: string
  type: 'ROOM' | 'DM' | 'SPACE'
  displayName?: string
  singleUserBotDm?: boolean
  threaded?: boolean
  spaceDetails?: {
    description?: string
    guidelines?: string
  }
  createTime?: string
}

/** Google Chat message */
interface ChatMessage {
  name: string
  sender?: {
    name: string
    displayName?: string
    domainId?: string
    type: 'HUMAN' | 'BOT'
  }
  createTime: string
  lastUpdateTime?: string
  text?: string
  formattedText?: string
  cards?: unknown[]
  cardsV2?: unknown[]
  annotations?: unknown[]
  thread?: {
    name: string
    threadKey?: string
  }
  space?: {
    name: string
    type?: string
    displayName?: string
  }
  argumentText?: string
  attachment?: unknown[]
  matchedUrl?: {
    url: string
  }
}

/** Response from spaces.list */
interface SpacesListResponse {
  spaces?: ChatSpace[]
  nextPageToken?: string
}

/** Response from spaces.messages.list */
interface MessagesListResponse {
  messages?: ChatMessage[]
  nextPageToken?: string
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
 * Extract the message ID from the full resource name.
 * Format: spaces/{space}/messages/{message}
 */
function extractMessageId(name: string): string {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

/**
 * Extract the space ID from the full resource name.
 * Format: spaces/{space} or spaces/{space}/messages/{message}
 */
function extractSpaceId(name: string): string {
  const parts = name.split('/')
  return parts[1] || name
}

/**
 * Format a space display name, handling DMs and unnamed spaces.
 */
function formatSpaceDisplayName(space: ChatSpace): string {
  if (space.displayName) {
    return space.displayName
  }
  if (space.type === 'DM') {
    return 'Direct Message'
  }
  return extractSpaceId(space.name)
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Google Chat connector provider.
 *
 * Provides OAuth authentication and API integration for Google Chat,
 * including space listing, message retrieval, and search.
 */
export class GoogleChatProvider extends BaseAppConnectorProvider {
  readonly id = 'google-chat' as const

  readonly config: ConnectorProviderConfig = {
    id: 'google-chat',
    category: 'app',
    name: 'Google Chat',
    icon: 'google-chat',
    color: '#00AC47',
    capabilities: ['read', 'search'],
    supportedTypes: ['message', 'space'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 60, windowSeconds: 60 },
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
   * Generate the Google OAuth authorization URL for Chat.
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
      scope: CHAT_SCOPES,
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
   * List spaces from Google Chat using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of spaces with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = new URLSearchParams({
      pageSize: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const listUrl = `${CHAT_API_BASE}/spaces?${params.toString()}`
    const listData = await this.fetchJsonWithRawToken<SpacesListResponse>(
      token,
      listUrl,
    )

    if (!listData.spaces || listData.spaces.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    return {
      items: listData.spaces.map((space) => this.normalizeSpace(space)),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * List spaces and their messages from Google Chat.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of messages with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    // If a specific space is provided in path, list messages from that space
    if (options?.path && options.path.startsWith('spaces/')) {
      return this.listMessagesInSpace(connector, options.path, options)
    }

    // Otherwise, list all spaces
    const params = new URLSearchParams({
      pageSize: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const listUrl = `${CHAT_API_BASE}/spaces?${params.toString()}`
    const listData = await this.fetchJson<SpacesListResponse>(
      connector,
      listUrl,
    )

    if (!listData.spaces || listData.spaces.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    return {
      items: listData.spaces.map((space) => this.normalizeSpace(space)),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * List messages in a specific space.
   *
   * @param connector - The connector to use
   * @param spaceName - The full space resource name (spaces/{space})
   * @param options - Pagination options
   * @returns List of messages with pagination info
   */
  private async listMessagesInSpace(
    connector: Connector,
    spaceName: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = new URLSearchParams({
      pageSize: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const messagesUrl = `${CHAT_API_BASE}/${spaceName}/messages?${params.toString()}`
    const messagesData = await this.fetchJson<MessagesListResponse>(
      connector,
      messagesUrl,
    )

    if (!messagesData.messages || messagesData.messages.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    return {
      items: await Promise.all(
        messagesData.messages.map((msg) => this.normalizeMessage(msg)),
      ),
      nextCursor: messagesData.nextPageToken,
      hasMore: !!messagesData.nextPageToken,
    }
  }

  /**
   * Read the content of a specific message from Google Chat.
   *
   * @param connector - The connector to read from
   * @param externalId - The full message resource name (spaces/{space}/messages/{message})
   * @returns The message content and metadata
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    const url = `${CHAT_API_BASE}/${externalId}`
    const message = await this.fetchJson<ChatMessage>(connector, url)

    // Format message as readable text
    const content = this.formatMessageContent(message)

    return {
      content,
      mimeType: 'text/plain',
      metadata: {
        name: message.name,
        sender: message.sender?.displayName,
        createTime: message.createTime,
        thread: message.thread?.name,
        space: message.space?.displayName,
      },
    }
  }

  /**
   * Search for messages matching a query.
   *
   * Note: Google Chat API has limited search capabilities.
   * This implementation lists recent messages and filters client-side.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Matching messages
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    // Get all spaces first
    const spacesData = await this.fetchJson<SpacesListResponse>(
      connector,
      `${CHAT_API_BASE}/spaces?pageSize=50`,
    )

    if (!spacesData.spaces || spacesData.spaces.length === 0) {
      return {
        items: [],
        totalCount: 0,
      }
    }

    const queryLower = query.toLowerCase()
    const matchingItems: ConnectorItem[] = []

    // Search through recent messages in each space
    for (const space of spacesData.spaces.slice(0, 10)) {
      // Limit to first 10 spaces for performance
      try {
        const messagesData = await this.fetchJson<MessagesListResponse>(
          connector,
          `${CHAT_API_BASE}/${space.name}/messages?pageSize=50`,
        )

        if (messagesData.messages) {
          for (const message of messagesData.messages) {
            const text = message.text || message.formattedText || ''
            if (text.toLowerCase().includes(queryLower)) {
              matchingItems.push(await this.normalizeMessage(message))
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to search space ${space.name}:`, error)
      }
    }

    return {
      items: matchingItems,
      totalCount: matchingItems.length,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since last sync.
   *
   * Google Chat API doesn't have a native delta sync mechanism,
   * so this fetches recent messages and uses timestamps for comparison.
   *
   * @param connector - The connector to get changes from
   * @param cursor - The timestamp from the last sync, or null for initial sync
   * @returns Added, modified, and deleted items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const allItems: ConnectorItem[] = []
    let latestTimestamp = cursor || ''

    // Get all spaces
    const spacesData = await this.fetchJson<SpacesListResponse>(
      connector,
      `${CHAT_API_BASE}/spaces?pageSize=100`,
    )

    if (!spacesData.spaces || spacesData.spaces.length === 0) {
      return {
        added: [],
        modified: [],
        deleted: [],
        newCursor: new Date().toISOString(),
        hasMore: false,
      }
    }

    // Fetch recent messages from each space
    for (const space of spacesData.spaces) {
      try {
        const messagesData = await this.fetchJson<MessagesListResponse>(
          connector,
          `${CHAT_API_BASE}/${space.name}/messages?pageSize=${DEFAULT_PAGE_SIZE}`,
        )

        if (messagesData.messages) {
          for (const message of messagesData.messages) {
            // If we have a cursor, only include messages newer than the cursor
            if (!cursor || message.createTime > cursor) {
              allItems.push(await this.normalizeMessage(message))
            }

            // Track the latest timestamp
            if (message.createTime > latestTimestamp) {
              latestTimestamp = message.createTime
            }
          }
        }
      } catch (error) {
        console.warn(
          `Failed to fetch messages from space ${space.name}:`,
          error,
        )
      }
    }

    return {
      added: cursor ? allItems : allItems, // All items are "added" relative to initial or last sync
      modified: [],
      deleted: [],
      newCursor: latestTimestamp || new Date().toISOString(),
      hasMore: false,
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a raw item from the API to a ConnectorItem.
   * Handles both spaces and messages.
   *
   * @param rawItem - The raw item from the API
   * @returns Normalized ConnectorItem
   */
  async normalizeItem(rawItem: unknown): Promise<ConnectorItem> {
    const item = rawItem as ChatMessage | ChatSpace

    // Check if this is a space (has 'type' property like 'ROOM', 'DM', 'SPACE')
    if (
      'type' in item &&
      ['ROOM', 'DM', 'SPACE'].includes(item.type as string)
    ) {
      return this.normalizeSpace(item as ChatSpace)
    }

    // Otherwise treat as a message
    return this.normalizeMessage(item as ChatMessage)
  }

  /**
   * Normalize a Google Chat space to a ConnectorItem.
   *
   * @param space - The raw space object
   * @returns Normalized ConnectorItem
   */
  private normalizeSpace(space: ChatSpace): ConnectorItem {
    const displayName = formatSpaceDisplayName(space)
    const spaceId = extractSpaceId(space.name)

    return {
      externalId: space.name,
      name: displayName,
      type: 'folder' as const,
      mimeType: 'application/vnd.google.chat.space',
      path: `/google-chat`,
      lastModified: space.createTime ? new Date(space.createTime) : new Date(),
      externalUrl: `https://chat.google.com/room/${spaceId}`,
      description: space.spaceDetails?.description,
      metadata: {
        type: space.type,
        threaded: space.threaded,
        singleUserBotDm: space.singleUserBotDm,
      },
    }
  }

  /**
   * Normalize a Google Chat message to a ConnectorItem.
   *
   * @param message - The raw message object
   * @returns Normalized ConnectorItem
   */
  private async normalizeMessage(message: ChatMessage): Promise<ConnectorItem> {
    const messageId = extractMessageId(message.name)
    const spaceId = extractSpaceId(message.name)
    const senderName = message.sender?.displayName || 'Unknown'
    const text = message.text || message.formattedText || ''
    const preview = text.substring(0, 100) + (text.length > 100 ? '...' : '')

    // Create a title from sender and preview
    const title = `${senderName}: ${preview || '(attachment)'}`

    return {
      externalId: message.name,
      name: title,
      type: 'file' as const,
      fileType: 'text' as const,
      mimeType: 'text/plain',
      path: `/google-chat/${spaceId}`,
      lastModified: new Date(message.createTime),
      externalUrl: `https://chat.google.com/room/${spaceId}/${messageId}`,
      content: this.formatMessageContent(message),
      description: `From ${senderName} in ${message.space?.displayName || spaceId}`,
      tags: message.thread?.name ? ['threaded'] : undefined,
      metadata: {
        sender: message.sender,
        thread: message.thread?.name,
        space: message.space,
        hasAttachments: !!message.attachment?.length,
      },
    }
  }

  /**
   * Format a message for display.
   *
   * @param message - The message to format
   * @returns Formatted message content
   */
  private formatMessageContent(message: ChatMessage): string {
    const lines: string[] = []

    // Header
    const senderName = message.sender?.displayName || 'Unknown'
    const timestamp = new Date(message.createTime).toLocaleString()
    lines.push(`From: ${senderName}`)
    lines.push(`Date: ${timestamp}`)

    if (message.space?.displayName) {
      lines.push(`Space: ${message.space.displayName}`)
    }

    if (message.thread?.name) {
      lines.push(`Thread: ${message.thread.name}`)
    }

    lines.push('')
    lines.push('---')
    lines.push('')

    // Message body
    const text = message.text || message.formattedText || '(No text content)'
    lines.push(text)

    // Attachments info
    if (message.attachment && message.attachment.length > 0) {
      lines.push('')
      lines.push(`[${message.attachment.length} attachment(s)]`)
    }

    // Matched URL
    if (message.matchedUrl?.url) {
      lines.push('')
      lines.push(`Link: ${message.matchedUrl.url}`)
    }

    return lines.join('\n')
  }

  /**
   * Get available spaces for the account.
   *
   * @param connector - The connector to use
   * @returns Array of available spaces
   */
  async getSpaces(connector: Connector): Promise<ChatSpace[]> {
    const allSpaces: ChatSpace[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({ pageSize: '100' })
      if (pageToken) {
        params.set('pageToken', pageToken)
      }

      const response = await this.fetchJson<SpacesListResponse>(
        connector,
        `${CHAT_API_BASE}/spaces?${params.toString()}`,
      )

      if (response.spaces) {
        allSpaces.push(...response.spaces)
      }

      pageToken = response.nextPageToken
    } while (pageToken)

    return allSpaces
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new GoogleChatProvider()
