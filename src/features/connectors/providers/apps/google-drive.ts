/**
 * Google Drive Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Google Drive.
 * Supports listing, reading, searching files, and delta sync via Changes API.
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

/** Self-contained metadata for Google Drive provider */
export const metadata: ProviderMetadata = {
  id: 'google-drive',
  name: 'Google Drive',
  icon: 'GoogleDrive',
  color: '#4285f4',
  description: 'Sync files and folders from Google Drive',
  syncSupported: true,
  oauth: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: `${BRIDGE_URL}/api/google/token`,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    pkceRequired: true,
  },
  proxyRoutes: [
    {
      pathPrefix: '/api/google',
      pathMatch: '/token',
      target: 'https://oauth2.googleapis.com',
      credentials: {
        type: 'body',
        clientIdEnvKey: 'VITE_GOOGLE_CLIENT_ID',
        clientSecretEnvKey: 'VITE_GOOGLE_CLIENT_SECRET',
      },
    },
  ],
}

// Register the provider
registerProvider(metadata, () => import('./google-drive'))

// =============================================================================
// Constants
// =============================================================================

/** Google Drive API v3 base URL */
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'

/** Google OAuth2 endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Use bridge URL for token operations - bridge injects client_secret server-side */
const GOOGLE_TOKEN_URL = `${BRIDGE_URL}/api/google/token`
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** Fields to request from Drive API */
const FILE_FIELDS =
  'id, name, mimeType, size, modifiedTime, md5Checksum, webViewLink, parents'
const LIST_FIELDS = `nextPageToken, files(${FILE_FIELDS})`
const CHANGES_FIELDS = `newStartPageToken, nextPageToken, changes(removed, fileId, file(${FILE_FIELDS}))`

/** Google Docs MIME types that need export */
const GOOGLE_DOCS_MIME_TYPES: Record<
  string,
  { exportMimeType: string; extension: string }
> = {
  'application/vnd.google-apps.document': {
    exportMimeType: 'text/plain',
    extension: 'txt',
  },
  'application/vnd.google-apps.spreadsheet': {
    exportMimeType: 'text/csv',
    extension: 'csv',
  },
  'application/vnd.google-apps.presentation': {
    exportMimeType: 'text/plain',
    extension: 'txt',
  },
  'application/vnd.google-apps.drawing': {
    exportMimeType: 'image/png',
    extension: 'png',
  },
}

/** MIME types that indicate a folder */
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

// =============================================================================
// Types
// =============================================================================

/** Raw file object from Google Drive API */
interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  md5Checksum?: string
  webViewLink?: string
  parents?: string[]
}

/** Response from Drive files.list */
interface DriveListResponse {
  files: DriveFile[]
  nextPageToken?: string
}

/** Response from Drive changes.list */
interface DriveChangesResponse {
  changes: DriveChange[]
  newStartPageToken?: string
  nextPageToken?: string
}

/** Change item from Drive changes.list */
interface DriveChange {
  removed?: boolean
  fileId: string
  file?: DriveFile
}

/** Response from Drive changes.getStartPageToken */
interface DriveStartPageTokenResponse {
  startPageToken: string
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
// Provider Implementation
// =============================================================================

/**
 * Google Drive connector provider.
 *
 * Provides OAuth authentication and API integration for Google Drive,
 * including file listing, content retrieval, search, and delta sync.
 */
export class GoogleDriveProvider extends BaseAppConnectorProvider {
  readonly id = 'google-drive' as const

  readonly config: ConnectorProviderConfig = {
    id: 'google-drive',
    category: 'app',
    name: 'Google Drive',
    icon: 'google-drive',
    color: '#4285F4',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 1000, windowSeconds: 100 },
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
   * Generate the Google OAuth authorization URL.
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
      scope: 'https://www.googleapis.com/auth/drive.readonly',
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
   * Build URL parameters for listing files.
   *
   * @param options - Pagination and filtering options
   * @returns URLSearchParams for the Drive API
   */
  private buildListParams(options?: ListOptions): URLSearchParams {
    const params = new URLSearchParams({
      fields: LIST_FIELDS,
      pageSize: String(options?.pageSize ?? 100),
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    // Build query for folder filtering
    const queryParts: string[] = ['trashed = false']

    if (options?.path) {
      // If path is provided, filter by parent folder ID
      queryParts.push(`'${options.path}' in parents`)
    }

    if (options?.filter?.mimeType) {
      queryParts.push(`mimeType = '${options.filter.mimeType}'`)
    }

    params.set('q', queryParts.join(' and '))

    // Include files from Shared Drives (formerly Team Drives)
    params.set('supportsAllDrives', 'true')
    params.set('includeItemsFromAllDrives', 'true')

    return params
  }

  /**
   * List files from Google Drive.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const params = this.buildListParams(options)
    const url = `${DRIVE_API_BASE}/files?${params.toString()}`
    const data = await this.fetchJson<DriveListResponse>(connector, url)

    return {
      items: data.files.map((file) => this.normalizeItem(file)),
      nextCursor: data.nextPageToken,
      hasMore: !!data.nextPageToken,
    }
  }

  /**
   * List files from Google Drive using a raw access token.
   *
   * This is used during the wizard flow when we have a fresh OAuth token
   * that hasn't been stored/encrypted yet.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = this.buildListParams(options)
    const url = `${DRIVE_API_BASE}/files?${params.toString()}`
    const data = await this.fetchJsonWithRawToken<DriveListResponse>(token, url)

    return {
      items: data.files.map((file) => this.normalizeItem(file)),
      nextCursor: data.nextPageToken,
      hasMore: !!data.nextPageToken,
    }
  }

  /**
   * Read the content of a file from Google Drive.
   *
   * Handles both regular files (direct download) and Google Docs
   * (export to plain text or CSV).
   *
   * @param connector - The connector to read from
   * @param externalId - The Drive file ID
   * @returns The file content and metadata
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // First, get file metadata to determine the type
    const metadataUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(externalId)}?fields=${encodeURIComponent(FILE_FIELDS)}&supportsAllDrives=true`
    const metadata = await this.fetchJson<DriveFile>(connector, metadataUrl)

    // Check if this is a Google Docs format that needs export
    const exportConfig = GOOGLE_DOCS_MIME_TYPES[metadata.mimeType]

    let content: string | ArrayBuffer
    let mimeType: string

    if (exportConfig) {
      // Export Google Docs to a downloadable format
      const exportUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(externalId)}/export?mimeType=${encodeURIComponent(exportConfig.exportMimeType)}&supportsAllDrives=true`
      const response = await this.fetchWithAuth(connector, exportUrl)

      if (!response.ok) {
        throw new Error(`Failed to export file: ${response.status}`)
      }

      content = await response.text()
      mimeType = exportConfig.exportMimeType
    } else {
      // Download regular file content
      const downloadUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(externalId)}?alt=media&supportsAllDrives=true`
      const response = await this.fetchWithAuth(connector, downloadUrl)

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`)
      }

      // Determine if content is text or binary based on MIME type
      const isText =
        metadata.mimeType.startsWith('text/') ||
        metadata.mimeType === 'application/json' ||
        metadata.mimeType === 'application/xml' ||
        metadata.mimeType.includes('+xml') ||
        metadata.mimeType.includes('+json')

      content = isText ? await response.text() : await response.arrayBuffer()
      mimeType = metadata.mimeType
    }

    return {
      content,
      mimeType,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        size: metadata.size ? parseInt(metadata.size, 10) : undefined,
        modifiedTime: metadata.modifiedTime,
        md5Checksum: metadata.md5Checksum,
        webViewLink: metadata.webViewLink,
      },
    }
  }

  /**
   * Search for files matching a query.
   *
   * @param connector - The connector to search
   * @param query - The search query (supports Drive query syntax)
   * @returns Matching files
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    // Build search query - search in name and fullText
    const searchQuery = `(name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}') and trashed = false`

    const params = new URLSearchParams({
      fields: LIST_FIELDS,
      pageSize: '50',
      q: searchQuery,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })

    const url = `${DRIVE_API_BASE}/files?${params.toString()}`
    const data = await this.fetchJson<DriveListResponse>(connector, url)

    return {
      items: data.files.map((file) => this.normalizeItem(file)),
      totalCount: data.files.length,
      nextCursor: data.nextPageToken,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Uses the Drive Changes API to efficiently sync only modified files.
   * If no cursor is provided, fetches the initial start page token.
   *
   * @param connector - The connector to get changes from
   * @param cursor - The cursor from the last sync, or null for initial sync
   * @returns Added, modified, and deleted items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    let pageToken: string

    if (!cursor) {
      // Get the initial start page token
      const startTokenUrl = `${DRIVE_API_BASE}/changes/startPageToken?supportsAllDrives=true`
      const startTokenData = await this.fetchJson<DriveStartPageTokenResponse>(
        connector,
        startTokenUrl,
      )
      pageToken = startTokenData.startPageToken
    } else {
      pageToken = cursor
    }

    const params = new URLSearchParams({
      pageToken,
      fields: CHANGES_FIELDS,
      pageSize: '100',
      includeRemoved: 'true',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })

    const url = `${DRIVE_API_BASE}/changes?${params.toString()}`
    const data = await this.fetchJson<DriveChangesResponse>(connector, url)

    const added: ConnectorItem[] = []
    const modified: ConnectorItem[] = []
    const deleted: string[] = []

    for (const change of data.changes) {
      if (change.removed || !change.file) {
        deleted.push(change.fileId)
      } else {
        // Normalize the file and add to appropriate list
        // Note: Drive Changes API doesn't distinguish between add/modify
        // We treat all non-removed files as modified (upsert behavior)
        modified.push(this.normalizeItem(change.file))
      }
    }

    // Determine the new cursor
    const newCursor = data.newStartPageToken || data.nextPageToken || pageToken

    return {
      added,
      modified,
      deleted,
      newCursor,
      hasMore: !!data.nextPageToken,
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a Drive file to a ConnectorItem.
   *
   * @param rawItem - The raw Drive file object
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const file = rawItem as DriveFile

    const isFolder = file.mimeType === FOLDER_MIME_TYPE
    const exportConfig = GOOGLE_DOCS_MIME_TYPES[file.mimeType]

    // Determine the file type
    let fileType: 'document' | 'image' | 'text' | undefined
    if (!isFolder) {
      if (file.mimeType.startsWith('image/')) {
        fileType = 'image'
      } else if (
        file.mimeType.startsWith('text/') ||
        file.mimeType === 'application/json' ||
        file.mimeType.includes('document') ||
        file.mimeType.includes('sheet') ||
        file.mimeType.includes('presentation') ||
        exportConfig
      ) {
        fileType = 'document'
      } else if (file.mimeType === 'text/plain') {
        fileType = 'text'
      }
    }

    // Build path from parents (simplified - just use first parent if available)
    const path = file.parents?.length
      ? `/${file.parents[0]}/${file.name}`
      : `/${file.name}`

    return {
      externalId: file.id,
      name: file.name,
      type: isFolder ? 'folder' : 'file',
      fileType,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size, 10) : undefined,
      path,
      parentExternalId: file.parents?.[0],
      lastModified: file.modifiedTime
        ? new Date(file.modifiedTime)
        : new Date(),
      externalUrl: file.webViewLink,
      contentHash: file.md5Checksum,
      metadata: {
        driveId: file.id,
        webViewLink: file.webViewLink,
        parents: file.parents,
      },
    }
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new GoogleDriveProvider()
