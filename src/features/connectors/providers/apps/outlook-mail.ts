/**
 * Outlook Mail Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Microsoft Outlook Mail.
 * Uses Microsoft Graph API for accessing emails with delta sync support.
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

/** Self-contained metadata for Outlook Mail provider */
export const metadata: ProviderMetadata = {
  id: 'outlook-mail',
  name: 'Outlook Mail',
  icon: 'MicrosoftOutlook',
  color: '#0078D4',
  description: 'Sync emails from Microsoft Outlook',
  syncSupported: true,
  active: false, // Not ready for production
  oauth: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: `${BRIDGE_URL}/api/microsoft/oauth2/v2.0/token`,
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'https://graph.microsoft.com/Mail.Read',
    ],
    pkceRequired: true,
  },
  proxyRoutes: [
    {
      pathPrefix: '/api/microsoft',
      pathMatch: '/oauth2/v2.0/token',
      target: 'https://login.microsoftonline.com',
      targetPathPrefix: '/common',
      credentials: {
        type: 'body',
        clientIdEnvKey: 'VITE_MICROSOFT_CLIENT_ID',
        clientSecretEnvKey: 'VITE_MICROSOFT_CLIENT_SECRET',
      },
    },
  ],
}

// Register the provider
registerProvider(metadata, () => import('./outlook-mail'))

// =============================================================================
// Constants
// =============================================================================

/** Microsoft Graph API base URL */
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

/** Microsoft OAuth2 endpoints */
const MS_AUTH_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const MS_TOKEN_URL = `${BRIDGE_URL}/api/microsoft/oauth2/v2.0/token`
const MS_USERINFO_URL = `${GRAPH_API_BASE}/me`

/** Outlook Mail API scopes */
const OUTLOOK_MAIL_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://graph.microsoft.com/Mail.Read',
].join(' ')

/** Default page size for message listing */
const DEFAULT_PAGE_SIZE = 50

/** Maximum messages to batch fetch at once */
const BATCH_SIZE = 20

// =============================================================================
// Types
// =============================================================================

/** Microsoft Graph email address */
interface GraphEmailAddress {
  emailAddress: {
    name?: string
    address: string
  }
}

/** Microsoft Graph item body */
interface GraphItemBody {
  contentType: 'text' | 'html'
  content: string
}

/** Microsoft Graph message */
interface GraphMessage {
  id: string
  conversationId?: string
  subject?: string
  bodyPreview?: string
  body?: GraphItemBody
  from?: GraphEmailAddress
  toRecipients?: GraphEmailAddress[]
  ccRecipients?: GraphEmailAddress[]
  receivedDateTime?: string
  sentDateTime?: string
  isRead?: boolean
  isDraft?: boolean
  importance?: 'low' | 'normal' | 'high'
  hasAttachments?: boolean
  parentFolderId?: string
  webLink?: string
  categories?: string[]
}

/** Response from messages list */
interface GraphMessagesResponse {
  value: GraphMessage[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

/** Response from delta query */
interface GraphDeltaResponse {
  value: (GraphMessage & { '@removed'?: { reason: string } })[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

/** Response from Microsoft OAuth token endpoint */
interface MicrosoftTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope: string
  token_type: string
}

/** Response from Microsoft userinfo endpoint */
interface MicrosoftUserInfoResponse {
  id: string
  mail?: string
  userPrincipalName?: string
  displayName?: string
}

/** Mail folder info */
interface GraphMailFolder {
  id: string
  displayName: string
  parentFolderId?: string
  childFolderCount?: number
  unreadItemCount?: number
  totalItemCount?: number
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Strip HTML tags and decode HTML entities to get plain text.
 *
 * @param html - HTML content
 * @returns Plain text with HTML removed
 */
function stripHtmlTags(html: string): string {
  return (
    html
      // Remove style and script blocks entirely
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Replace block-level elements with newlines
      .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      // Decode numeric HTML entities
      .replace(/&#(\d+);/g, (_, code) =>
        String.fromCharCode(parseInt(code, 10)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
        String.fromCharCode(parseInt(code, 16)),
      )
  )
}

/**
 * Clean up extracted email text.
 *
 * @param text - Raw extracted text
 * @returns Cleaned text
 */
function cleanEmailText(text: string): string {
  return (
    text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Remove trailing whitespace on each line
      .replace(/[ \t]+$/gm, '')
      // Trim overall
      .trim()
  )
}

/**
 * Extract plain text from message body.
 *
 * @param body - The message body object
 * @returns Plain text content
 */
function extractTextBody(body?: GraphItemBody): string {
  if (!body) return ''

  if (body.contentType === 'text') {
    return cleanEmailText(body.content)
  }

  // HTML content - strip tags
  return cleanEmailText(stripHtmlTags(body.content))
}

/**
 * Format email address for display.
 *
 * @param addr - Email address object
 * @returns Formatted string
 */
function formatEmailAddress(addr?: GraphEmailAddress): string {
  if (!addr?.emailAddress) return ''
  const { name, address } = addr.emailAddress
  return name ? `${name} <${address}>` : address
}

/**
 * Get folder name for path construction.
 *
 * @param folderId - Parent folder ID
 * @returns Folder name for path
 */
function getFolderName(folderId?: string): string {
  // Microsoft Graph uses well-known folder names
  const folderMap: Record<string, string> = {
    inbox: 'inbox',
    sentitems: 'sent',
    drafts: 'drafts',
    deleteditems: 'trash',
    junkemail: 'spam',
    archive: 'archive',
  }

  if (!folderId) return 'inbox'

  // Check for well-known folder names in the ID
  const lowerFolderId = folderId.toLowerCase()
  for (const [key, name] of Object.entries(folderMap)) {
    if (lowerFolderId.includes(key)) {
      return name
    }
  }

  return 'inbox'
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Outlook Mail connector provider.
 *
 * Provides OAuth authentication and API integration for Microsoft Outlook,
 * including message listing, content retrieval, search, and delta sync.
 */
export class OutlookMailProvider extends BaseAppConnectorProvider {
  readonly id = 'outlook-mail' as const

  readonly config: ConnectorProviderConfig = {
    id: 'outlook-mail',
    category: 'app',
    name: 'Outlook Mail',
    icon: 'outlook',
    color: '#0078D4',
    capabilities: ['read', 'search'],
    supportedTypes: ['email'],
    maxFileSize: 25 * 1024 * 1024,
    rateLimit: { requests: 100, windowSeconds: 60 },
  }

  /** Get the Microsoft OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_MICROSOFT_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Microsoft OAuth authorization URL for Outlook Mail.
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
      scope: OUTLOOK_MAIL_SCOPES,
      response_mode: 'query',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      // Request offline access for refresh tokens
      prompt: 'consent',
    })

    return `${MS_AUTH_URL}?${params.toString()}`
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
    const response = await fetch(MS_TOKEN_URL, {
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
        scope: OUTLOOK_MAIL_SCOPES,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: MicrosoftTokenResponse = await response.json()

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

    const response = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: OUTLOOK_MAIL_SCOPES,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: MicrosoftTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Microsoft.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(MS_USERINFO_URL, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   *
   * Note: Microsoft doesn't have a standard token revocation endpoint.
   * The user should revoke access through their Microsoft account settings.
   *
   * @param _connector - The connector to revoke access for
   */
  async revokeAccess(_connector: Connector): Promise<void> {
    // Microsoft Graph API doesn't have a token revocation endpoint
    // Users need to revoke access via https://account.live.com/consent/Manage
    // We just clear the local tokens by not throwing an error
    console.info(
      'Outlook tokens cleared locally. User should revoke access at https://account.live.com/consent/Manage',
    )
  }

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and email
   * @throws Error if fetching account info fails
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(MS_USERINFO_URL, {
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

    const data: MicrosoftUserInfoResponse = await response.json()

    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      picture: undefined, // Microsoft Graph requires additional call for photo
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List messages from Outlook using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of messages with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = new URLSearchParams({
      $top: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      $select:
        'id,subject,receivedDateTime,from,isRead,hasAttachments,parentFolderId',
      $orderby: 'receivedDateTime desc',
    })

    // Use cursor for pagination if provided
    let url: string
    if (options?.cursor) {
      // The cursor is the full nextLink URL
      url = options.cursor
    } else {
      url = `${GRAPH_API_BASE}/me/messages?${params.toString()}`
    }

    const data = await this.fetchJsonWithRawToken<GraphMessagesResponse>(
      token,
      url,
    )

    return {
      items: data.value.map((msg) => this.normalizeItemSync(msg)),
      nextCursor: data['@odata.nextLink'],
      hasMore: !!data['@odata.nextLink'],
    }
  }

  /**
   * List messages from Outlook.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of messages with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams({
      $top: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      $select:
        'id,subject,receivedDateTime,from,isRead,hasAttachments,parentFolderId,body,bodyPreview,webLink,categories,toRecipients',
      $orderby: 'receivedDateTime desc',
    })

    // Filter by folder if specified
    if (options?.path) {
      params.set('$filter', `parentFolderId eq '${options.path}'`)
    }

    // Use cursor for pagination if provided
    let url: string
    if (options?.cursor) {
      url = options.cursor
    } else {
      url = `${GRAPH_API_BASE}/me/messages?${params.toString()}`
    }

    const data = await this.fetchJson<GraphMessagesResponse>(connector, url)

    return {
      items: await Promise.all(
        data.value.map((msg) => this.normalizeItem(msg)),
      ),
      nextCursor: data['@odata.nextLink'],
      hasMore: !!data['@odata.nextLink'],
    }
  }

  /**
   * Read the content of a specific message.
   *
   * @param connector - The connector to use
   * @param externalId - The message ID
   * @returns Message content
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    const url = `${GRAPH_API_BASE}/me/messages/${encodeURIComponent(externalId)}?$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,importance,hasAttachments,webLink,categories`

    const message = await this.fetchJson<GraphMessage>(connector, url)

    // Build RFC 822-like content
    const content = this.buildMessageContent(message)

    return {
      content,
      mimeType: 'text/plain',
      metadata: {
        subject: message.subject,
        from: formatEmailAddress(message.from),
        to: message.toRecipients?.map(formatEmailAddress).join(', '),
        receivedDateTime: message.receivedDateTime,
        isRead: message.isRead,
        importance: message.importance,
        hasAttachments: message.hasAttachments,
        webLink: message.webLink,
      },
    }
  }

  /**
   * Search for messages.
   *
   * @param connector - The connector to use
   * @param query - Search query
   * @returns Search results
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const params = new URLSearchParams({
      $search: `"${query}"`,
      $top: String(DEFAULT_PAGE_SIZE),
      $select:
        'id,subject,receivedDateTime,from,isRead,hasAttachments,parentFolderId,bodyPreview',
    })

    const url = `${GRAPH_API_BASE}/me/messages?${params.toString()}`
    const data = await this.fetchJson<GraphMessagesResponse>(connector, url)

    return {
      items: data.value.map((msg) => this.normalizeItemSync(msg)),
      totalCount: data.value.length,
    }
  }

  /**
   * Get changes since last sync using Microsoft Graph delta query.
   *
   * @param connector - The connector to use
   * @param cursor - Delta token from previous sync
   * @returns Changes result with added, modified, and deleted items
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    let url: string

    if (cursor) {
      // Use the delta link from previous sync
      url = cursor
    } else {
      // Initial sync - get all messages with delta
      const params = new URLSearchParams({
        $select:
          'id,subject,receivedDateTime,from,isRead,hasAttachments,parentFolderId,body,bodyPreview,webLink,categories,toRecipients',
        $top: String(BATCH_SIZE),
      })
      url = `${GRAPH_API_BASE}/me/messages/delta?${params.toString()}`
    }

    try {
      const data = await this.fetchJson<GraphDeltaResponse>(connector, url)

      const added: ConnectorItem[] = []
      const modified: ConnectorItem[] = []
      const deleted: string[] = []

      for (const item of data.value) {
        if (item['@removed']) {
          deleted.push(item.id)
        } else if (cursor) {
          // If we have a cursor, treat updates as modifications
          modified.push(await this.normalizeItem(item))
        } else {
          // Initial sync - all items are "added"
          added.push(await this.normalizeItem(item))
        }
      }

      // Determine the new cursor
      const newCursor =
        data['@odata.deltaLink'] || data['@odata.nextLink'] || ''

      return {
        added,
        modified,
        deleted,
        newCursor,
        hasMore: !!data['@odata.nextLink'],
      }
    } catch (error) {
      // If delta sync fails, fall back to a full list
      if (error instanceof Error && error.message.includes('resyncRequired')) {
        const list = await this.list(connector)
        return {
          added: list.items,
          modified: [],
          deleted: [],
          newCursor: '',
          hasMore: list.hasMore,
        }
      }
      throw error
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a Graph message to a ConnectorItem (sync version for simple mapping).
   *
   * @param message - The Graph message object
   * @returns Normalized ConnectorItem
   */
  private normalizeItemSync(message: GraphMessage): ConnectorItem {
    const subject = message.subject || '(No Subject)'
    const from = formatEmailAddress(message.from)
    const lastModified = message.receivedDateTime
      ? new Date(message.receivedDateTime)
      : new Date()
    const folderName = getFolderName(message.parentFolderId)

    return {
      externalId: message.id,
      name: subject,
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'message/rfc822',
      path: `/outlook/${folderName}`,
      lastModified,
      externalUrl: message.webLink,
      description: `From: ${from}`,
      tags: message.categories?.map((c) => c.toLowerCase()),
      metadata: {
        conversationId: message.conversationId,
        isRead: message.isRead,
        isDraft: message.isDraft,
        importance: message.importance,
        hasAttachments: message.hasAttachments,
        from,
        subject,
      },
    }
  }

  /**
   * Normalize a Graph message to a ConnectorItem (async version with body extraction).
   *
   * @param rawItem - The raw Graph message object
   * @returns Normalized ConnectorItem
   */
  async normalizeItem(rawItem: unknown): Promise<ConnectorItem> {
    const message = rawItem as GraphMessage

    const subject = message.subject || '(No Subject)'
    const from = formatEmailAddress(message.from)
    const lastModified = message.receivedDateTime
      ? new Date(message.receivedDateTime)
      : new Date()
    const folderName = getFolderName(message.parentFolderId)

    // Extract plain text body for transcript
    const textBody = extractTextBody(message.body)

    // Build raw content for storage
    const content = this.buildMessageContent(message)

    return {
      externalId: message.id,
      name: subject,
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'message/rfc822',
      path: `/outlook/${folderName}`,
      lastModified,
      externalUrl: message.webLink,
      content,
      transcript: textBody || message.bodyPreview,
      description: `From: ${from}`,
      tags: message.categories?.map((c) => c.toLowerCase()),
      metadata: {
        conversationId: message.conversationId,
        isRead: message.isRead,
        isDraft: message.isDraft,
        importance: message.importance,
        hasAttachments: message.hasAttachments,
        from,
        subject,
        bodyPreview: message.bodyPreview,
      },
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Build a text representation of the message.
   *
   * @param message - The Graph message
   * @returns Formatted message content
   */
  private buildMessageContent(message: GraphMessage): string {
    const lines: string[] = []

    lines.push(`Subject: ${message.subject || '(No Subject)'}`)
    lines.push(`From: ${formatEmailAddress(message.from)}`)

    if (message.toRecipients?.length) {
      lines.push(
        `To: ${message.toRecipients.map(formatEmailAddress).join(', ')}`,
      )
    }

    if (message.ccRecipients?.length) {
      lines.push(
        `Cc: ${message.ccRecipients.map(formatEmailAddress).join(', ')}`,
      )
    }

    if (message.receivedDateTime) {
      lines.push(`Date: ${new Date(message.receivedDateTime).toUTCString()}`)
    }

    if (message.importance && message.importance !== 'normal') {
      lines.push(`Importance: ${message.importance}`)
    }

    if (message.categories?.length) {
      lines.push(`Categories: ${message.categories.join(', ')}`)
    }

    lines.push('')
    lines.push(extractTextBody(message.body) || message.bodyPreview || '')

    return lines.join('\n')
  }

  /**
   * Get available mail folders for the account.
   *
   * @param connector - The connector to use
   * @returns Array of mail folders
   */
  async getFolders(connector: Connector): Promise<GraphMailFolder[]> {
    const url = `${GRAPH_API_BASE}/me/mailFolders?$select=id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount`
    const response = await this.fetchJson<{ value: GraphMailFolder[] }>(
      connector,
      url,
    )
    return response.value || []
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new OutlookMailProvider()
