/**
 * Dropbox Connector Provider
 *
 * Implements OAuth 2.0 authentication with PKCE and API integration for Dropbox.
 * Supports listing, reading, searching files, and delta sync via Dropbox API v2.
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

/** Self-contained metadata for Dropbox provider */
export const metadata: ProviderMetadata = {
  id: 'dropbox',
  name: 'Dropbox',
  icon: 'Dropbox',
  color: '#0061FF',
  description: 'Sync files and folders from Dropbox',
  syncSupported: true,
  oauth: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: `${BRIDGE_URL}/api/dropbox/oauth2/token`,
    clientId: import.meta.env.VITE_DROPBOX_CLIENT_ID || '',
    clientSecret: '',
    scopes: [], // Dropbox doesn't use scopes in auth URL
    pkceRequired: true,
  },
  proxyRoutes: [
    {
      pathPrefix: '/api/dropbox',
      pathMatch: '/oauth2/token',
      target: 'https://api.dropboxapi.com',
      credentials: {
        type: 'body',
        clientIdEnvKey: 'VITE_DROPBOX_CLIENT_ID',
        clientSecretEnvKey: 'VITE_DROPBOX_CLIENT_SECRET',
      },
    },
  ],
}

// Register the provider
registerProvider(metadata, () => import('./dropbox'))

// =============================================================================
// Constants
// =============================================================================

/** Dropbox API v2 base URLs */
const DROPBOX_API_BASE = 'https://api.dropboxapi.com/2'
const DROPBOX_CONTENT_BASE = 'https://content.dropboxapi.com/2'

/** Dropbox OAuth2 endpoints */
const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize'
const DROPBOX_TOKEN_URL = `${BRIDGE_URL}/api/dropbox/oauth2/token`

/** Maximum file size for content download (10MB) */
const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024

// =============================================================================
// Types
// =============================================================================

/** User account from Dropbox API */
interface DropboxAccount {
  account_id: string
  name: {
    given_name: string
    surname: string
    familiar_name: string
    display_name: string
    abbreviated_name: string
  }
  email: string
  email_verified: boolean
  profile_photo_url?: string
  disabled: boolean
  country?: string
  locale: string
  referral_link: string
  is_paired: boolean
  account_type: {
    '.tag': 'basic' | 'pro' | 'business'
  }
  root_info: {
    '.tag': string
    root_namespace_id: string
    home_namespace_id: string
  }
}

/** File/folder metadata from Dropbox API */
interface DropboxEntry {
  '.tag': 'file' | 'folder' | 'deleted'
  id: string
  name: string
  path_lower?: string
  path_display?: string
  client_modified?: string
  server_modified?: string
  rev?: string
  size?: number
  content_hash?: string
  is_downloadable?: boolean
}

/** Response from list_folder endpoint */
interface DropboxListFolderResponse {
  entries: DropboxEntry[]
  cursor: string
  has_more: boolean
}

/** Response from search endpoint */
interface DropboxSearchResponse {
  matches: {
    match_type: { '.tag': string }
    metadata: {
      '.tag': string
      metadata: DropboxEntry
    }
  }[]
  has_more: boolean
  cursor?: string
}

/** Token response from Dropbox OAuth */
interface DropboxTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  uid: string
  account_id: string
}

/** Refresh token response */
interface DropboxRefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Dropbox connector provider.
 *
 * Provides OAuth authentication and API integration for Dropbox,
 * including file listing, content retrieval, search, and delta sync.
 */
export class DropboxProvider extends BaseAppConnectorProvider {
  readonly id = 'dropbox' as const

  readonly config: ConnectorProviderConfig = {
    id: 'dropbox',
    category: 'app',
    name: 'Dropbox',
    icon: 'dropbox',
    color: '#0061FF',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: MAX_DOWNLOAD_SIZE,
    rateLimit: { requests: 1000, windowSeconds: 300 },
  }

  /** Get the Dropbox OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_DROPBOX_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Dropbox OAuth authorization URL.
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
      token_access_type: 'offline',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `${DROPBOX_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * Uses the bridge proxy for token exchange to keep client_secret server-side.
   *
   * @param code - The authorization code from OAuth callback
   * @param codeVerifier - The PKCE code verifier
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult> {
    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
      client_id: this.clientId,
    })

    const response = await fetch(DROPBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: DropboxTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope || 'files.content.read files.metadata.read',
      tokenType: data.token_type,
    }
  }

  /**
   * Refresh an expired access token.
   *
   * @param connector - The connector with refresh token
   * @returns New access token
   * @throws Error if refresh fails
   */
  async refreshToken(connector: Connector): Promise<TokenRefreshResult> {
    const refreshToken = await this.getDecryptedRefreshToken(connector)

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
    })

    const response = await fetch(DROPBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: DropboxRefreshResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Dropbox.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${DROPBOX_API_BASE}/users/get_current_account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke access for a connector.
   *
   * @param connector - The connector to revoke
   */
  async revokeAccess(connector: Connector): Promise<void> {
    try {
      const token = await this.getDecryptedToken(connector)
      await fetch(`${DROPBOX_API_BASE}/auth/token/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.warn('Failed to revoke Dropbox token:', error)
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
    const response = await fetch(
      `${DROPBOX_API_BASE}/users/get_current_account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get account info: ${response.status} ${errorText}`,
      )
    }

    const data: DropboxAccount = await response.json()

    return {
      id: data.account_id,
      email: data.email,
      name: data.name.display_name,
      picture: data.profile_photo_url,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List files using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const path = options?.path || ''
    const cursor = options?.cursor
    const limit = options?.pageSize || 100

    let response: Response

    if (cursor) {
      // Continue from cursor
      response = await fetch(`${DROPBOX_API_BASE}/files/list_folder/continue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursor }),
      })
    } else {
      // Start new listing
      response = await fetch(`${DROPBOX_API_BASE}/files/list_folder`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          recursive: false,
          include_deleted: false,
          include_has_explicit_shared_members: false,
          include_mounted_folders: true,
          include_non_downloadable_files: false,
          limit,
        }),
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list files: ${response.status} ${errorText}`)
    }

    const data: DropboxListFolderResponse = await response.json()

    const items = data.entries
      .filter((entry) => entry['.tag'] !== 'deleted')
      .map((entry) => this.normalizeEntry(entry))

    return {
      items,
      nextCursor: data.has_more ? data.cursor : undefined,
      hasMore: data.has_more,
    }
  }

  /**
   * List files from Dropbox.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const token = await this.getDecryptedToken(connector)
    return this.listWithToken(token, options)
  }

  /**
   * Read the content of a file from Dropbox.
   *
   * @param connector - The connector to read from
   * @param externalId - The Dropbox file ID or path
   * @returns The file content
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    const token = await this.getDecryptedToken(connector)

    // Use the file ID directly if it starts with 'id:', otherwise use as path
    const path = externalId.startsWith('id:') ? externalId : `/${externalId}`

    const response = await fetch(`${DROPBOX_CONTENT_BASE}/files/download`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to download file: ${response.status} ${errorText}`,
      )
    }

    // Parse metadata from header
    const metadataHeader = response.headers.get('Dropbox-API-Result')
    const metadata = metadataHeader ? JSON.parse(metadataHeader) : {}

    // Get content type from metadata or response
    const mimeType = this.getMimeType(metadata.name || externalId)

    // Read content based on type
    let content: string | ArrayBuffer
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      content = await response.text()
    } else {
      content = await response.arrayBuffer()
    }

    return {
      content,
      mimeType,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        path: metadata.path_display,
        size: metadata.size,
        contentHash: metadata.content_hash,
        serverModified: metadata.server_modified,
      },
    }
  }

  /**
   * Search for files in Dropbox.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Search results
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const token = await this.getDecryptedToken(connector)

    const response = await fetch(`${DROPBOX_API_BASE}/files/search_v2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        options: {
          max_results: 100,
          file_status: 'active',
          filename_only: false,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Search failed: ${response.status} ${errorText}`)
    }

    const data: DropboxSearchResponse = await response.json()

    const items = data.matches
      .filter((match) => match.metadata['.tag'] === 'metadata')
      .map((match) => this.normalizeEntry(match.metadata.metadata))

    return {
      items,
      totalCount: items.length,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * @param connector - The connector to get changes from
   * @param cursor - The cursor from the last sync, or null for initial sync
   * @returns Modified items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const token = await this.getDecryptedToken(connector)

    if (!cursor) {
      // Get initial cursor
      const cursorResponse = await fetch(
        `${DROPBOX_API_BASE}/files/list_folder/get_latest_cursor`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: '',
            recursive: true,
            include_deleted: true,
            include_has_explicit_shared_members: false,
            include_mounted_folders: true,
            include_non_downloadable_files: false,
          }),
        },
      )

      if (!cursorResponse.ok) {
        throw new Error('Failed to get initial cursor')
      }

      const cursorData = await cursorResponse.json()

      // Get all files for initial sync
      const listResult = await this.listWithToken(token, { path: '' })

      return {
        added: listResult.items,
        modified: [],
        deleted: [],
        newCursor: cursorData.cursor,
        hasMore: listResult.hasMore,
      }
    }

    // Get changes since cursor
    const response = await fetch(
      `${DROPBOX_API_BASE}/files/list_folder/continue`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursor }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get changes: ${response.status} ${errorText}`)
    }

    const data: DropboxListFolderResponse = await response.json()

    const added: ConnectorItem[] = []
    const modified: ConnectorItem[] = []
    const deleted: string[] = []

    for (const entry of data.entries) {
      if (entry['.tag'] === 'deleted') {
        deleted.push(entry.id || entry.path_lower || entry.name)
      } else {
        // For simplicity, treat all non-deleted as modified
        // In a real implementation, you'd track which files are new vs updated
        modified.push(this.normalizeEntry(entry))
      }
    }

    return {
      added,
      modified,
      deleted,
      newCursor: data.cursor,
      hasMore: data.has_more,
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a raw Dropbox item to a ConnectorItem.
   *
   * @param rawItem - The raw Dropbox item object
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    return this.normalizeEntry(rawItem as DropboxEntry)
  }

  /**
   * Normalize a Dropbox entry to a ConnectorItem.
   *
   * @param entry - The Dropbox entry object
   * @returns Normalized ConnectorItem
   */
  private normalizeEntry(entry: DropboxEntry): ConnectorItem {
    const isFolder = entry['.tag'] === 'folder'

    return {
      externalId: entry.id || entry.path_lower || entry.name,
      name: entry.name,
      type: isFolder ? 'folder' : 'file',
      fileType: isFolder ? undefined : this.getFileType(entry.name),
      mimeType: isFolder ? undefined : this.getMimeType(entry.name),
      size: entry.size,
      path: entry.path_display || `/${entry.name}`,
      lastModified: entry.server_modified
        ? new Date(entry.server_modified)
        : new Date(),
      externalUrl: entry.path_display
        ? `https://www.dropbox.com/home${entry.path_display}`
        : undefined,
      contentHash: entry.content_hash,
      metadata: {
        rev: entry.rev,
        clientModified: entry.client_modified,
        isDownloadable: entry.is_downloadable,
      },
    }
  }

  /**
   * Get file type from filename.
   *
   * @param filename - The filename
   * @returns File type category
   */
  private getFileType(
    filename: string,
  ): 'document' | 'image' | 'text' | undefined {
    const ext = filename.split('.').pop()?.toLowerCase()

    const textExtensions = [
      'txt',
      'md',
      'js',
      'ts',
      'jsx',
      'tsx',
      'css',
      'html',
      'xml',
      'json',
      'yaml',
      'yml',
      'csv',
      'log',
      'py',
      'rb',
      'go',
      'rs',
      'java',
      'c',
      'cpp',
      'h',
      'hpp',
      'sh',
      'bash',
      'zsh',
    ]
    const imageExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'webp',
      'svg',
      'ico',
      'tiff',
      'tif',
    ]
    const documentExtensions = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'rtf',
      'epub',
    ]

    if (ext && textExtensions.includes(ext)) return 'text'
    if (ext && imageExtensions.includes(ext)) return 'image'
    if (ext && documentExtensions.includes(ext)) return 'document'

    return undefined
  }

  /**
   * Get MIME type from filename.
   *
   * @param filename - The filename
   * @returns MIME type
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      ts: 'text/typescript',
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      ico: 'image/x-icon',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      webm: 'video/webm',
      zip: 'application/zip',
      tar: 'application/x-tar',
      gz: 'application/gzip',
    }

    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new DropboxProvider()
