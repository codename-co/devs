/**
 * Gmail Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Gmail.
 * Supports listing, reading, searching emails, and delta sync via History API.
 */

import PostalMime from 'postal-mime'

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

/** Self-contained metadata for Gmail provider */
export const metadata: ProviderMetadata = {
  id: 'gmail',
  name: 'Gmail',
  icon: 'Gmail',
  color: '#ea4335',
  description: 'Sync emails from Gmail',
  syncSupported: true,
  oauth: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: `${BRIDGE_URL}/api/google/token`,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
    ],
    pkceRequired: true,
  },
  // Google providers share proxy routes - defined in google-drive
}

// Register the provider
registerProvider(metadata, () => import('./gmail'))

// =============================================================================
// Constants
// =============================================================================

/** Gmail API v1 base URL */
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

/** Google OAuth2 endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Use bridge URL for token operations - bridge injects client_secret server-side */
const GOOGLE_TOKEN_URL = `${BRIDGE_URL}/api/google/token`
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** Gmail API scopes - readonly for reading, compose for draft creation */
const GMAIL_SCOPE = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
].join(' ')

/** Default page size for message listing */
const DEFAULT_PAGE_SIZE = 50

/** Maximum messages to batch fetch at once */
const BATCH_SIZE = 10

// =============================================================================
// Types
// =============================================================================

/** Gmail message header */
interface GmailHeader {
  name: string
  value: string
}

/** Gmail message part (for multipart MIME) */
interface GmailMessagePart {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: {
    attachmentId?: string
    size?: number
    data?: string
  }
  parts?: GmailMessagePart[]
}

/** Raw Gmail message from API */
interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  historyId?: string
  internalDate?: string
  payload?: GmailMessagePart
  sizeEstimate?: number
  raw?: string
}

/** Response from messages.list */
interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

/** Response from profile.get */
interface GmailProfileResponse {
  emailAddress: string
  messagesTotal: number
  threadsTotal: number
  historyId: string
}

/** Response from history.list */
interface GmailHistoryResponse {
  history?: GmailHistoryEntry[]
  nextPageToken?: string
  historyId?: string
}

/** History entry from history.list */
interface GmailHistoryEntry {
  id: string
  messages?: GmailMessage[]
  messagesAdded?: Array<{ message: GmailMessage }>
  messagesDeleted?: Array<{ message: GmailMessage }>
  labelsAdded?: Array<{ message: GmailMessage; labelIds: string[] }>
  labelsRemoved?: Array<{ message: GmailMessage; labelIds: string[] }>
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

/** Gmail label for categorization */
interface GmailLabel {
  id: string
  name: string
  type?: 'system' | 'user'
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Decode URL-safe Base64 string (used by Gmail API).
 *
 * Gmail uses URL-safe Base64 encoding where:
 * - '+' is replaced with '-'
 * - '/' is replaced with '_'
 * - Padding '=' may be omitted
 *
 * @param str - URL-safe Base64 encoded string
 * @returns Decoded UTF-8 string
 */
function decodeBase64Url(str: string): string {
  // Replace URL-safe characters with standard Base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')

  // Add padding if necessary
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }

  try {
    // Decode Base64 to binary string
    const binaryString = atob(base64)

    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Decode as UTF-8
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    // Return empty string if decoding fails
    return ''
  }
}

/**
 * Decode MIME encoded-word syntax (RFC 2047).
 *
 * Handles formats like:
 * - `=?UTF-8?Q?Hello_World?=` (Quoted-Printable)
 * - `=?UTF-8?B?SGVsbG8gV29ybGQ=?=` (Base64)
 *
 * @param text - Text potentially containing encoded-word sequences
 * @returns Decoded text
 */
function decodeMimeEncodedWord(text: string): string {
  // RFC 2047 section 6.2: Remove whitespace between adjacent encoded words
  // This must happen BEFORE decoding so that split words are joined correctly
  const normalizedText = text.replace(/\?=\s+=\?/g, '?==?')

  // Pattern matches: =?charset?encoding?encoded_text?=
  const encodedWordPattern = /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi

  return normalizedText.replace(
    encodedWordPattern,
    (match, charset, encoding, encodedText) => {
      try {
        const upperEncoding = encoding.toUpperCase()

        let decoded: Uint8Array

        if (upperEncoding === 'B') {
          // Base64 encoding
          const binaryString = atob(encodedText)
          decoded = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            decoded[i] = binaryString.charCodeAt(i)
          }
        } else if (upperEncoding === 'Q') {
          // Quoted-Printable encoding
          // In Q encoding, underscores represent spaces
          const qpText = encodedText.replace(/_/g, ' ')
          // Decode =XX hex sequences
          const bytes: number[] = []
          let i = 0
          while (i < qpText.length) {
            if (qpText[i] === '=' && i + 2 < qpText.length) {
              const hex = qpText.substring(i + 1, i + 3)
              const byte = parseInt(hex, 16)
              if (!isNaN(byte)) {
                bytes.push(byte)
                i += 3
                continue
              }
            }
            bytes.push(qpText.charCodeAt(i))
            i++
          }
          decoded = new Uint8Array(bytes)
        } else {
          return match // Unknown encoding, return as-is
        }

        // Decode using the specified charset
        const decoder = new TextDecoder(charset.toLowerCase())
        return decoder.decode(decoded)
      } catch {
        // If decoding fails, return original text
        return match
      }
    },
  )
}

/**
 * Extract a header value from raw RFC 822 email content.
 *
 * Handles multi-line (folded) headers per RFC 5322 and
 * decodes MIME encoded-word syntax per RFC 2047.
 *
 * @param headerSection - The header section of the email (before the blank line)
 * @param name - Header name to find (case-insensitive)
 * @returns Header value or undefined if not found
 */
function extractRawHeader(
  headerSection: string,
  name: string,
): string | undefined {
  // Unfold headers (RFC 5322: lines starting with whitespace are continuations)
  const unfoldedHeaders = headerSection.replace(/\r?\n[ \t]+/g, ' ')

  // Find the header (case-insensitive)
  const regex = new RegExp(`^${name}:\\s*(.*)$`, 'im')
  const match = unfoldedHeaders.match(regex)

  if (!match) return undefined

  // Decode MIME encoded-word syntax (RFC 2047)
  return decodeMimeEncodedWord(match[1].trim())
}

/**
 * Get the primary label for path construction.
 *
 * @param labelIds - Array of label IDs from message
 * @returns Primary label name for path
 */
function getPrimaryLabel(labelIds: string[] | undefined): string {
  if (!labelIds || labelIds.length === 0) return 'all'

  // Priority order for label display
  const labelPriority = [
    'INBOX',
    'SENT',
    'DRAFT',
    'STARRED',
    'IMPORTANT',
    'SPAM',
    'TRASH',
  ]

  for (const priority of labelPriority) {
    if (labelIds.includes(priority)) {
      return priority.toLowerCase()
    }
  }

  // Use first non-category label
  const nonCategoryLabel = labelIds.find((l) => !l.startsWith('CATEGORY_'))
  return nonCategoryLabel?.toLowerCase() ?? 'all'
}

/**
 * Extract the plain text body from RFC 822 email content using postal-mime.
 *
 * The library handles:
 * - Simple text/plain and text/html emails
 * - Multipart emails (extracts text/plain part, with nested multipart support)
 * - Quoted-printable and base64 content transfer encodings
 * - Character set decoding
 *
 * @param rawEmail - The raw RFC 822 email content
 * @returns The extracted plain text body, or undefined if not found
 */
async function extractEmailTextBody(
  rawEmail: string,
): Promise<string | undefined> {
  try {
    const email = await PostalMime.parse(rawEmail)

    // Prefer plain text if available
    if (email.text) {
      return cleanEmailText(email.text)
    }

    // Fall back to HTML with tags stripped
    if (email.html) {
      return cleanEmailText(stripHtmlTags(email.html))
    }

    return undefined
  } catch (error) {
    console.error('Failed to parse email:', error)
    return undefined
  }
}

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
 * Removes excessive whitespace, normalizes line breaks,
 * and trims the result.
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
      // Remove leading whitespace on each line (but preserve indentation for quotes)
      .replace(/^[ \t]+(?=[^\s>])/gm, '')
      // Trim overall
      .trim()
  )
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Gmail connector provider.
 *
 * Provides OAuth authentication and API integration for Gmail,
 * including message listing, content retrieval, search, and delta sync.
 */
export class GmailProvider extends BaseAppConnectorProvider {
  readonly id = 'gmail' as const

  readonly config: ConnectorProviderConfig = {
    id: 'gmail',
    category: 'app',
    name: 'Gmail',
    icon: 'gmail',
    color: '#EA4335',
    capabilities: ['read', 'search', 'write'],
    supportedTypes: ['email'],
    maxFileSize: 25 * 1024 * 1024,
    rateLimit: { requests: 250, windowSeconds: 1 },
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
   * Generate the Google OAuth authorization URL for Gmail.
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
      scope: GMAIL_SCOPE,
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
   * List messages from Gmail using a raw access token.
   *
   * Note: Gmail doesn't have a folder selection workflow in the wizard,
   * so this is primarily for API consistency.
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
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    // Add label filter if specified in path or filter
    const labelId = options?.path || (options?.filter?.labelId as string)
    if (labelId) {
      params.set('labelIds', labelId)
    }

    const listUrl = `${GMAIL_API_BASE}/messages?${params.toString()}`
    const listData = await this.fetchJsonWithRawToken<GmailListResponse>(
      token,
      listUrl,
    )

    if (!listData.messages || listData.messages.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    // For listWithToken, we return minimal message info without fetching full details
    // This is sufficient for wizard-like flows
    return {
      items: listData.messages.map((msg) => ({
        externalId: msg.id,
        name: msg.id,
        type: 'file' as const,
        mimeType: 'message/rfc822',
        path: '/',
        lastModified: new Date(),
      })),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * List messages from Gmail.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of messages with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    // Add label filter if specified in path or filter
    const labelId = options?.path || (options?.filter?.labelId as string)
    if (labelId) {
      params.set('labelIds', labelId)
    }

    // Add query filter if specified
    if (options?.filter?.q) {
      params.set('q', options.filter.q as string)
    }

    const listUrl = `${GMAIL_API_BASE}/messages?${params.toString()}`
    const listData = await this.fetchJson<GmailListResponse>(connector, listUrl)

    if (!listData.messages || listData.messages.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    // Batch fetch full message details
    const messages = await this.batchFetchMessages(
      connector,
      listData.messages.map((m) => m.id),
    )

    return {
      items: await Promise.all(messages.map((msg) => this.normalizeItem(msg))),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * Batch fetch full message details.
   *
   * @param connector - The connector to use
   * @param messageIds - Array of message IDs to fetch
   * @returns Array of full message objects
   */
  private async batchFetchMessages(
    connector: Connector,
    messageIds: string[],
  ): Promise<GmailMessage[]> {
    const messages: GmailMessage[] = []

    // Process in batches
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batchIds = messageIds.slice(i, i + BATCH_SIZE)

      // Fetch messages in parallel using raw format to get original RFC 822 content
      const batchPromises = batchIds.map((id) =>
        this.fetchJson<GmailMessage>(
          connector,
          `${GMAIL_API_BASE}/messages/${encodeURIComponent(id)}?format=raw`,
        ).catch((error) => {
          console.warn(`Failed to fetch message ${id}:`, error)
          return null
        }),
      )

      const results = await Promise.all(batchPromises)
      messages.push(...results.filter((m): m is GmailMessage => m !== null))
    }

    return messages
  }

  /**
   * Read the content of a specific message from Gmail.
   *
   * Returns the raw RFC 822 formatted email content.
   *
   * @param connector - The connector to read from
   * @param externalId - The Gmail message ID
   * @returns The message content and metadata
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    const url = `${GMAIL_API_BASE}/messages/${encodeURIComponent(externalId)}?format=raw`
    const message = await this.fetchJson<GmailMessage>(connector, url)

    // Decode the raw RFC 822 email content
    const rawContent = message.raw ? decodeBase64Url(message.raw) : ''

    return {
      content: rawContent,
      mimeType: 'message/rfc822',
      metadata: {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds,
        snippet: message.snippet,
        historyId: message.historyId,
        internalDate: message.internalDate,
        sizeEstimate: message.sizeEstimate,
      },
    }
  }

  /**
   * Search for messages matching a query.
   *
   * Uses Gmail's search syntax (same as the Gmail web interface).
   *
   * @param connector - The connector to search
   * @param query - The search query (supports Gmail search operators)
   * @returns Matching messages
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(DEFAULT_PAGE_SIZE),
    })

    const listUrl = `${GMAIL_API_BASE}/messages?${params.toString()}`
    const listData = await this.fetchJson<GmailListResponse>(connector, listUrl)

    if (!listData.messages || listData.messages.length === 0) {
      return {
        items: [],
        totalCount: 0,
      }
    }

    // Batch fetch full message details
    const messages = await this.batchFetchMessages(
      connector,
      listData.messages.map((m) => m.id),
    )

    return {
      items: await Promise.all(messages.map((msg) => this.normalizeItem(msg))),
      totalCount: listData.resultSizeEstimate,
      nextCursor: listData.nextPageToken,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Uses the Gmail History API to efficiently sync only modified messages.
   * If no cursor is provided, performs initial full sync by fetching existing
   * messages and returns the current historyId as the cursor.
   *
   * @param connector - The connector to get changes from
   * @param cursor - The historyId from the last sync, or null for initial sync
   * @returns Added, modified, and deleted items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    // If no cursor, perform initial full sync
    if (!cursor) {
      // Get current historyId from profile first
      const profileUrl = `${GMAIL_API_BASE}/profile`
      const profile = await this.fetchJson<GmailProfileResponse>(
        connector,
        profileUrl,
      )

      // Fetch initial batch of messages for full sync
      const listResult = await this.list(connector, {
        pageSize: DEFAULT_PAGE_SIZE,
      })

      return {
        added: listResult.items,
        modified: [],
        deleted: [],
        // Store both the historyId and the nextCursor (if any) in a compound cursor
        // Format: "historyId:pageToken" or just "historyId" if no more pages
        newCursor: listResult.nextCursor
          ? `${profile.historyId}:initial:${listResult.nextCursor}`
          : profile.historyId,
        hasMore: listResult.hasMore,
      }
    }

    // Check if we're continuing an initial sync (compound cursor with 'initial' marker)
    if (cursor.includes(':initial:')) {
      const [historyId, pageToken] = cursor.split(':initial:')

      // Continue fetching messages for initial sync
      const listResult = await this.list(connector, {
        pageSize: DEFAULT_PAGE_SIZE,
        cursor: pageToken,
      })

      return {
        added: listResult.items,
        modified: [],
        deleted: [],
        newCursor: listResult.nextCursor
          ? `${historyId}:initial:${listResult.nextCursor}`
          : historyId, // Initial sync complete, switch to historyId for delta sync
        hasMore: listResult.hasMore,
      }
    }

    const params = new URLSearchParams()
    params.append('startHistoryId', cursor)
    params.append('historyTypes', 'messageAdded')
    params.append('historyTypes', 'messageDeleted')
    params.append('maxResults', '100')

    const historyUrl = `${GMAIL_API_BASE}/history?${params.toString()}`

    try {
      const historyData = await this.fetchJson<GmailHistoryResponse>(
        connector,
        historyUrl,
      )

      const addedIds = new Set<string>()
      const deletedIds = new Set<string>()

      if (historyData.history) {
        for (const entry of historyData.history) {
          // Process added messages
          if (entry.messagesAdded) {
            for (const { message } of entry.messagesAdded) {
              addedIds.add(message.id)
              deletedIds.delete(message.id) // In case it was marked deleted then re-added
            }
          }

          // Process deleted messages
          if (entry.messagesDeleted) {
            for (const { message } of entry.messagesDeleted) {
              deletedIds.add(message.id)
              addedIds.delete(message.id) // No need to add if deleted
            }
          }
        }
      }

      // Fetch full details for added messages
      const addedMessages =
        addedIds.size > 0
          ? await this.batchFetchMessages(connector, Array.from(addedIds))
          : []

      // Determine the new cursor
      const newCursor = historyData.historyId || cursor

      return {
        added: await Promise.all(
          addedMessages.map((msg) => this.normalizeItem(msg)),
        ),
        modified: [], // Gmail History API treats modifications as add+delete
        deleted: Array.from(deletedIds),
        newCursor,
        hasMore: !!historyData.nextPageToken,
      }
    } catch (error) {
      // Handle case where historyId is too old (404 error)
      if (error instanceof Error && error.message.includes('404')) {
        // Get fresh historyId from profile
        const profileUrl = `${GMAIL_API_BASE}/profile`
        const profile = await this.fetchJson<GmailProfileResponse>(
          connector,
          profileUrl,
        )

        return {
          added: [],
          modified: [],
          deleted: [],
          newCursor: profile.historyId,
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
   * Normalize a Gmail message to a ConnectorItem.
   *
   * @param rawItem - The raw Gmail message object
   * @returns Normalized ConnectorItem
   */
  async normalizeItem(rawItem: unknown): Promise<ConnectorItem> {
    const message = rawItem as GmailMessage

    // Decode the raw RFC 822 email content
    const rawContent = message.raw ? decodeBase64Url(message.raw) : ''

    // Extract headers from the raw content for metadata
    const headerSection = rawContent.split(/\r?\n\r?\n/)[0] || ''
    const subject = extractRawHeader(headerSection, 'Subject') || '(No Subject)'
    const from = extractRawHeader(headerSection, 'From') || ''
    const date = extractRawHeader(headerSection, 'Date')

    // Extract plain text body for transcript (async with postal-mime)
    const textBody = await extractEmailTextBody(rawContent)

    // Parse the internal date (Unix timestamp in milliseconds)
    const lastModified = message.internalDate
      ? new Date(parseInt(message.internalDate, 10))
      : date
        ? new Date(date)
        : new Date()

    // Get primary label for path
    const primaryLabel = getPrimaryLabel(message.labelIds)

    // Build external URL
    const externalUrl = `https://mail.google.com/mail/u/0/#inbox/${message.id}`

    return {
      externalId: message.id,
      name: subject,
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'message/rfc822',
      size: message.sizeEstimate,
      path: `/gmail/${primaryLabel}`,
      lastModified,
      externalUrl,
      content: rawContent,
      transcript: textBody,
      description: `From: ${from}`,
      tags: message.labelIds?.map((l) => l.toLowerCase()),
      metadata: {
        threadId: message.threadId,
        labelIds: message.labelIds,
        snippet: message.snippet,
        historyId: message.historyId,
        from,
        subject,
      },
    }
  }

  // ===========================================================================
  // Additional Methods
  // ===========================================================================

  /**
   * Get available labels for the Gmail account.
   *
   * @param connector - The connector to use
   * @returns Array of available labels
   */
  async getLabels(connector: Connector): Promise<GmailLabel[]> {
    const url = `${GMAIL_API_BASE}/labels`
    const response = await this.fetchJson<{ labels: GmailLabel[] }>(
      connector,
      url,
    )
    return response.labels || []
  }

  /**
   * Create an email draft.
   *
   * The draft will appear in the user's Drafts folder for review and sending.
   *
   * @param connector - The connector to use
   * @param options - Draft creation options
   * @returns The created draft details
   */
  async createDraft(
    connector: Connector,
    options: {
      to: string
      subject: string
      body: string
      isHtml?: boolean
      cc?: string
      bcc?: string
      replyToMessageId?: string
    },
  ): Promise<GmailDraftResult> {
    const { to, subject, body, isHtml, cc, bcc, replyToMessageId } = options

    // Build the RFC 2822 formatted email
    const headers: string[] = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
    ]

    if (cc) {
      headers.push(`Cc: ${cc}`)
    }

    if (bcc) {
      headers.push(`Bcc: ${bcc}`)
    }

    // Get the user's email for the From header
    const token = await this.getDecryptedToken(connector)
    const accountInfo = await this.getAccountInfo(token)
    if (accountInfo?.email) {
      headers.push(`From: ${accountInfo.email}`)
    }

    // Add In-Reply-To and References headers for replies
    let threadId: string | undefined
    if (replyToMessageId) {
      // Fetch the original message to get its Message-ID header and thread ID
      try {
        const originalMessage = await this.fetchJson<GmailMessage>(
          connector,
          `${GMAIL_API_BASE}/messages/${replyToMessageId}?format=metadata&metadataHeaders=Message-ID`,
        )

        threadId = originalMessage.threadId

        const messageIdHeader = originalMessage.payload?.headers?.find(
          (h) => h.name.toLowerCase() === 'message-id',
        )
        if (messageIdHeader?.value) {
          headers.push(`In-Reply-To: ${messageIdHeader.value}`)
          headers.push(`References: ${messageIdHeader.value}`)
        }
      } catch (error) {
        // Continue without reply headers if original message can't be fetched
        console.warn('Could not fetch original message for reply:', error)
      }
    }

    // Combine headers and body
    const rawEmail = headers.join('\r\n') + '\r\n\r\n' + body

    // Base64url encode the email (RFC 4648)
    const base64Email = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Create the draft
    const url = `${GMAIL_API_BASE}/drafts`
    const requestBody: { message: { raw: string; threadId?: string } } = {
      message: {
        raw: base64Email,
      },
    }

    // Include threadId to keep the draft in the same thread
    if (threadId) {
      requestBody.message.threadId = threadId
    }

    const response = await this.fetchJson<GmailDraftResponse>(connector, url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    return {
      id: response.id,
      messageId: response.message.id,
      threadId: response.message.threadId,
      subject,
      to,
      cc,
      bcc,
      webLink: `https://mail.google.com/mail/u/0/#drafts/${response.id}`,
    }
  }
}

/** Response from Gmail drafts.create API */
interface GmailDraftResponse {
  id: string
  message: {
    id: string
    threadId: string
    labelIds: string[]
  }
}

/** Result from createDraft method */
export interface GmailDraftResult {
  id: string
  messageId: string
  threadId?: string
  subject: string
  to: string
  cc?: string
  bcc?: string
  webLink: string
}

// =============================================================================
// Default Export
// =============================================================================

export default new GmailProvider()
