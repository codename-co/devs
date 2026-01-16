/**
 * OneDrive Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Microsoft OneDrive.
 * Uses Microsoft Graph API for accessing files with delta sync support.
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
} from '../../types'

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

/** OneDrive API scopes */
const ONEDRIVE_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://graph.microsoft.com/Files.Read.All',
].join(' ')

/** Default page size for file listing */
const DEFAULT_PAGE_SIZE = 100

/** Maximum file size to sync (10MB) */
const MAX_SYNC_FILE_SIZE = 10 * 1024 * 1024

// =============================================================================
// Types
// =============================================================================

/** Microsoft Graph drive item */
interface GraphDriveItem {
  id: string
  name: string
  size?: number
  lastModifiedDateTime?: string
  webUrl?: string
  parentReference?: {
    id?: string
    path?: string
    driveId?: string
  }
  file?: {
    mimeType?: string
    hashes?: {
      quickXorHash?: string
      sha1Hash?: string
      sha256Hash?: string
    }
  }
  folder?: {
    childCount?: number
  }
  '@microsoft.graph.downloadUrl'?: string
}

/** Response from drive items list */
interface GraphDriveItemsResponse {
  value: GraphDriveItem[]
  '@odata.nextLink'?: string
}

/** Response from delta query */
interface GraphDeltaResponse {
  value: (GraphDriveItem & { deleted?: { state: string } })[]
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract file extension from filename.
 *
 * @param name - The filename
 * @returns Extension without dot, or empty string
 */
function getExtension(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : ''
}

/**
 * Determine if a MIME type represents text content.
 *
 * @param mimeType - The MIME type to check
 * @returns True if the content is text-based
 */
function isTextMimeType(mimeType?: string): boolean {
  if (!mimeType) return false
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType.includes('+xml') ||
    mimeType.includes('+json')
  )
}

/**
 * Determine file type from MIME type.
 *
 * @param mimeType - The MIME type
 * @returns File type classification
 */
function getFileType(
  mimeType?: string,
): 'document' | 'image' | 'text' | undefined {
  if (!mimeType) return undefined

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'text/plain') return 'text'
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType === 'application/pdf' ||
    mimeType === 'application/json'
  ) {
    return 'document'
  }

  return undefined
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * OneDrive connector provider.
 *
 * Provides OAuth authentication and API integration for Microsoft OneDrive,
 * including file listing, content retrieval, search, and delta sync.
 */
export class OneDriveProvider extends BaseAppConnectorProvider {
  readonly id = 'onedrive' as const

  readonly config: ConnectorProviderConfig = {
    id: 'onedrive',
    category: 'app',
    name: 'OneDrive',
    icon: 'onedrive',
    color: '#0078D4',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
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
   * Generate the Microsoft OAuth authorization URL for OneDrive.
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
      scope: ONEDRIVE_SCOPES,
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
        scope: ONEDRIVE_SCOPES,
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
        scope: ONEDRIVE_SCOPES,
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
    console.info(
      'OneDrive tokens cleared locally. User should revoke access at https://account.live.com/consent/Manage',
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
   * List files from OneDrive using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    let url: string

    if (options?.cursor) {
      // Use the next link for pagination
      url = options.cursor
    } else if (options?.path) {
      // List items in a specific folder
      url = `${GRAPH_API_BASE}/me/drive/items/${encodeURIComponent(options.path)}/children?$top=${options?.pageSize ?? DEFAULT_PAGE_SIZE}`
    } else {
      // List items in root
      url = `${GRAPH_API_BASE}/me/drive/root/children?$top=${options?.pageSize ?? DEFAULT_PAGE_SIZE}`
    }

    const data = await this.fetchJsonWithRawToken<GraphDriveItemsResponse>(
      token,
      url,
    )

    return {
      items: data.value.map((item) => this.normalizeItem(item)),
      nextCursor: data['@odata.nextLink'],
      hasMore: !!data['@odata.nextLink'],
    }
  }

  /**
   * List files from OneDrive.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    let url: string

    if (options?.cursor) {
      // Use the next link for pagination
      url = options.cursor
    } else if (options?.path) {
      // List items in a specific folder
      url = `${GRAPH_API_BASE}/me/drive/items/${encodeURIComponent(options.path)}/children?$top=${options?.pageSize ?? DEFAULT_PAGE_SIZE}`
    } else {
      // List items in root
      url = `${GRAPH_API_BASE}/me/drive/root/children?$top=${options?.pageSize ?? DEFAULT_PAGE_SIZE}`
    }

    const data = await this.fetchJson<GraphDriveItemsResponse>(connector, url)

    return {
      items: data.value.map((item) => this.normalizeItem(item)),
      nextCursor: data['@odata.nextLink'],
      hasMore: !!data['@odata.nextLink'],
    }
  }

  /**
   * Read the content of a file from OneDrive.
   *
   * @param connector - The connector to read from
   * @param externalId - The OneDrive item ID
   * @returns The file content and metadata
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // First, get file metadata
    const metadataUrl = `${GRAPH_API_BASE}/me/drive/items/${encodeURIComponent(externalId)}`
    const metadata = await this.fetchJson<GraphDriveItem>(
      connector,
      metadataUrl,
    )

    // Check file size
    if (metadata.size && metadata.size > MAX_SYNC_FILE_SIZE) {
      throw new Error(
        `File too large: ${metadata.size} bytes (max: ${MAX_SYNC_FILE_SIZE})`,
      )
    }

    // Download file content
    const downloadUrl = `${GRAPH_API_BASE}/me/drive/items/${encodeURIComponent(externalId)}/content`
    const response = await this.fetchWithAuth(connector, downloadUrl)

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`)
    }

    const mimeType = metadata.file?.mimeType || 'application/octet-stream'

    // Determine if content is text or binary based on MIME type
    const content = isTextMimeType(mimeType)
      ? await response.text()
      : await response.arrayBuffer()

    return {
      content,
      mimeType,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        size: metadata.size,
        modifiedTime: metadata.lastModifiedDateTime,
        webUrl: metadata.webUrl,
      },
    }
  }

  /**
   * Search for files in OneDrive.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Matching files
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const url = `${GRAPH_API_BASE}/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=${DEFAULT_PAGE_SIZE}`
    const data = await this.fetchJson<GraphDriveItemsResponse>(connector, url)

    return {
      items: data.value.map((item) => this.normalizeItem(item)),
      totalCount: data.value.length,
      nextCursor: data['@odata.nextLink'],
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

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
      // Initial sync - get delta from root
      url = `${GRAPH_API_BASE}/me/drive/root/delta?$top=${DEFAULT_PAGE_SIZE}`
    }

    try {
      const data = await this.fetchJson<GraphDeltaResponse>(connector, url)

      const added: ConnectorItem[] = []
      const modified: ConnectorItem[] = []
      const deleted: string[] = []

      for (const item of data.value) {
        if (item.deleted) {
          deleted.push(item.id)
        } else if (cursor) {
          // If we have a cursor, treat updates as modifications
          modified.push(this.normalizeItem(item))
        } else {
          // Initial sync - all items are "added"
          added.push(this.normalizeItem(item))
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
      // If delta sync fails with resync required, fall back to full list
      if (
        error instanceof Error &&
        (error.message.includes('resyncRequired') ||
          error.message.includes('invalidRequest'))
      ) {
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
   * Normalize a Graph drive item to a ConnectorItem.
   *
   * @param rawItem - The raw Graph drive item object
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as GraphDriveItem

    const isFolder = !!item.folder
    const mimeType = item.file?.mimeType
    const fileType = isFolder ? undefined : getFileType(mimeType)

    // Build path from parent reference
    let path = '/'
    if (item.parentReference?.path) {
      // Path format: /drive/root:/folder/subfolder
      const drivePath = item.parentReference.path
      const rootIndex = drivePath.indexOf('root:')
      if (rootIndex !== -1) {
        path = drivePath.slice(rootIndex + 5) || '/'
      }
    }
    path = `${path}/${item.name}`.replace('//', '/')

    // Get content hash if available
    const contentHash =
      item.file?.hashes?.sha256Hash ||
      item.file?.hashes?.sha1Hash ||
      item.file?.hashes?.quickXorHash

    return {
      externalId: item.id,
      name: item.name,
      type: isFolder ? 'folder' : 'file',
      fileType,
      mimeType,
      size: item.size,
      path,
      parentExternalId: item.parentReference?.id,
      lastModified: item.lastModifiedDateTime
        ? new Date(item.lastModifiedDateTime)
        : new Date(),
      externalUrl: item.webUrl,
      contentHash,
      metadata: {
        driveId: item.parentReference?.driveId,
        webUrl: item.webUrl,
        extension: getExtension(item.name),
      },
    }
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new OneDriveProvider()
