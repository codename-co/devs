/**
 * Figma Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Figma.
 * Supports listing, reading files and projects, and exporting design content.
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

/** Self-contained metadata for Figma provider */
export const metadata: ProviderMetadata = {
  id: 'figma',
  name: 'Figma',
  icon: 'Figma',
  color: '#F24E1E',
  description: 'Sync design files and components from Figma',
  syncSupported: true,
  folderPickerType: 'url-input',
  urlInputPlaceholder: 'https://www.figma.com/design/ABC123/...',
  urlInputHelp:
    'Paste Figma file URLs (one per line). You can also use team IDs to sync all files from a team.',
  oauth: {
    authUrl: 'https://www.figma.com/oauth',
    tokenUrl: `${BRIDGE_URL}/api/figma/oauth/token`,
    clientId: import.meta.env.VITE_FIGMA_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'current_user:read',
      'file_content:read',
      'file_metadata:read',
      'file_comments:read',
      'file_versions:read',
      'library_assets:read',
      'library_content:read',
      'team_library_content:read',
    ],
    pkceRequired: false,
  },
  proxyRoutes: [
    {
      pathPrefix: '/api/figma',
      pathMatch: '/oauth',
      target: 'https://api.figma.com',
      targetPathPrefix: '/v1',
      credentials: {
        type: 'basic-auth',
        clientIdEnvKey: 'VITE_FIGMA_CLIENT_ID',
        clientSecretEnvKey: 'VITE_FIGMA_CLIENT_SECRET',
      },
    },
  ],
}

// Register the provider
registerProvider(metadata, () => import('./figma'))

// =============================================================================
// Constants
// =============================================================================

/** Figma API base URL - use gateway proxy to avoid CORS issues and keep secrets safe */
const FIGMA_API_BASE = `${BRIDGE_URL}/api/figma`

/** Figma OAuth endpoints */
const FIGMA_AUTH_URL = 'https://www.figma.com/oauth'
const FIGMA_TOKEN_URL = `${BRIDGE_URL}/api/figma/oauth/token`
const FIGMA_REFRESH_URL = `${BRIDGE_URL}/api/figma/oauth/refresh`

// =============================================================================
// Types
// =============================================================================

/** User info from Figma API */
interface FigmaUser {
  id: string
  email: string
  handle: string
  img_url?: string
}

/** Project from Figma API */
interface FigmaProject {
  id: number
  name: string
}

/** File from Figma API */
interface FigmaFile {
  key: string
  name: string
  thumbnail_url?: string
  last_modified: string
}

/** File metadata from Figma API */
interface FigmaFileMeta {
  file: {
    name: string
    folder_name?: string
    last_touched_at: string
    creator: FigmaUser
    last_touched_by?: FigmaUser
    thumbnail_url?: string
    editor_type: string
    version: string
    role: string
    link_access: string
    url: string
  }
}

/** Token response from Figma OAuth */
interface FigmaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user_id_string: string
}

/** Refresh token response */
interface FigmaRefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/** Team projects response */
interface FigmaTeamProjectsResponse {
  name: string
  projects: FigmaProject[]
}

/** Project files response */
interface FigmaProjectFilesResponse {
  name: string
  files: FigmaFile[]
}

/** File document structure */
interface FigmaDocument {
  name: string
  role: string
  lastModified: string
  editorType: string
  thumbnailUrl?: string
  version: string
  document: FigmaNode
  components: Record<string, FigmaComponent>
  styles: Record<string, FigmaStyle>
}

/** Figma node */
interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  // Additional properties vary by node type
  [key: string]: unknown
}

/** Figma component */
interface FigmaComponent {
  key: string
  name: string
  description?: string
}

/** Figma style */
interface FigmaStyle {
  key: string
  name: string
  styleType: string
  description?: string
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Figma connector provider.
 *
 * Provides OAuth authentication and API integration for Figma,
 * including file/project listing, content retrieval, and image export.
 */
export class FigmaProvider extends BaseAppConnectorProvider {
  readonly id = 'figma' as const

  readonly scopes = [
    'current_user:read',
    'file_content:read',
    'file_metadata:read',
    'file_comments:read',
    'file_versions:read',
    'library_assets:read',
    'library_content:read',
    'team_library_content:read',
  ]

  readonly config: ConnectorProviderConfig = {
    id: 'figma',
    category: 'app',
    name: 'Figma',
    icon: 'figma',
    color: '#F24E1E',
    capabilities: ['read', 'search'],
    supportedTypes: ['file', 'project'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 100, windowSeconds: 60 },
  }

  /** Get the Figma OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_FIGMA_CLIENT_ID || ''
  }

  // Note: clientSecret is not needed here as it's handled by the bridge server

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Figma OAuth authorization URL.
   *
   * Figma supports PKCE (S256 method) for enhanced security.
   *
   * @param state - State parameter for CSRF protection
   * @param codeChallenge - PKCE code challenge
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(','),
      state,
      code_challenge: codeChallenge,
    })

    return `${FIGMA_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access tokens.
   *
   * Figma uses Basic auth with client credentials and supports PKCE.
   *
   * @param code - The authorization code from OAuth callback
   * @param codeVerifier - PKCE code verifier
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult> {
    // Bridge server adds Basic auth with client credentials
    const body = new URLSearchParams({
      redirect_uri: this.redirectUri,
      code,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    })

    const response = await fetch(FIGMA_TOKEN_URL, {
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

    const data: FigmaTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: this.scopes.join(','),
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

    // Bridge server adds Basic auth with client credentials
    const body = new URLSearchParams({
      refresh_token: refreshToken,
    })

    const response = await fetch(FIGMA_REFRESH_URL, {
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

    const data: FigmaRefreshResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Figma.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${FIGMA_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke access for a connector.
   *
   * Note: Figma doesn't have a revocation endpoint.
   * Users must revoke access through Figma settings.
   *
   * @param _connector - The connector (unused)
   */
  async revokeAccess(_connector: Connector): Promise<void> {
    // Figma doesn't have a revocation endpoint
    // Users must manually revoke access through their Figma settings
  }

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and email
   * @throws Error if fetching account info fails
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(`${FIGMA_API_BASE}/me`, {
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

    const data: FigmaUser = await response.json()

    return {
      id: data.id,
      email: data.email,
      name: data.handle,
      picture: data.img_url,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List files using a raw access token.
   *
   * Note: Figma requires a team ID to list projects/files.
   * This method returns an empty list - use search instead.
   *
   * @param _token - The raw access token
   * @param _options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async listWithToken(
    _token: string,
    _options?: ListOptions,
  ): Promise<ListResult> {
    // Figma requires a team ID to list projects
    // Users need to configure this through the connector settings
    return {
      items: [],
      hasMore: false,
    }
  }

  /**
   * List files from Figma.
   *
   * Supports two types of identifiers in syncFolders:
   * - Team IDs (numeric): Lists all files from all projects in the team
   * - File keys (alphanumeric): Fetches metadata for specific files
   *
   * File keys can be extracted from Figma URLs:
   * - https://www.figma.com/file/ABC123xyz/Design-Name
   * - https://www.figma.com/design/ABC123xyz/Design-Name
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of files with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const items: ConnectorItem[] = []
    const syncEntries = connector.syncFolders || []

    if (syncEntries.length === 0) {
      console.warn(
        '[Figma] No syncFolders configured. Add team IDs or file keys to sync.',
      )
      return {
        items: [],
        hasMore: false,
      }
    }

    for (const entry of syncEntries) {
      try {
        // Determine if entry is a team ID (numeric) or file key (alphanumeric)
        const isTeamId = /^\d+$/.test(entry)

        if (isTeamId) {
          // Entry is a team ID - list all projects and files
          const projectsResponse = await this.fetchWithAuth(
            connector,
            `${FIGMA_API_BASE}/teams/${entry}/projects`,
          )

          if (projectsResponse.ok) {
            const projectsData: FigmaTeamProjectsResponse =
              await projectsResponse.json()

            for (const project of projectsData.projects) {
              // Get files in each project
              const filesResponse = await this.fetchWithAuth(
                connector,
                `${FIGMA_API_BASE}/projects/${project.id}/files`,
              )

              if (filesResponse.ok) {
                const filesData: FigmaProjectFilesResponse =
                  await filesResponse.json()

                for (const file of filesData.files) {
                  items.push(this.normalizeFile(file, project.name))
                }
              }
            }
          } else {
            console.error(
              `[Figma] Failed to list projects for team ${entry}: ${projectsResponse.status}`,
            )
          }
        } else {
          // Entry is a file key - fetch file metadata directly
          const fileKey = this.extractFileKey(entry)
          const metaResponse = await this.fetchWithAuth(
            connector,
            `${FIGMA_API_BASE}/files/${fileKey}/meta`,
          )

          if (metaResponse.ok) {
            const meta: FigmaFileMeta = await metaResponse.json()
            items.push(this.normalizeFileMeta(fileKey, meta))
          } else {
            console.error(
              `[Figma] Failed to get metadata for file ${fileKey}: ${metaResponse.status}`,
            )
          }
        }
      } catch (error) {
        console.error(`[Figma] Failed to process entry ${entry}:`, error)
      }
    }

    // Apply pagination
    const startIndex = options?.cursor ? parseInt(options.cursor, 10) : 0
    const pageSize = options?.pageSize || 50
    const paginatedItems = items.slice(startIndex, startIndex + pageSize)

    return {
      items: paginatedItems,
      nextCursor:
        startIndex + pageSize < items.length
          ? String(startIndex + pageSize)
          : undefined,
      hasMore: startIndex + pageSize < items.length,
    }
  }

  /**
   * Extract file key from a Figma URL or return as-is if already a key.
   *
   * Supports URLs like:
   * - https://www.figma.com/file/ABC123xyz/Design-Name
   * - https://www.figma.com/design/ABC123xyz/Design-Name
   * - ABC123xyz (raw file key)
   *
   * @param input - URL or file key
   * @returns The extracted file key
   */
  private extractFileKey(input: string): string {
    // Check if it's a URL
    const urlMatch = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }
    // Already a file key
    return input
  }

  /**
   * Normalize file metadata to a ConnectorItem.
   *
   * @param fileKey - The Figma file key
   * @param meta - The file metadata from the API
   * @returns Normalized ConnectorItem
   */
  private normalizeFileMeta(
    fileKey: string,
    meta: FigmaFileMeta,
  ): ConnectorItem {
    return {
      externalId: fileKey,
      name: meta.file.name,
      type: 'file',
      fileType: 'document',
      mimeType: 'application/figma',
      path: `/figma/${meta.file.folder_name || 'files'}/${meta.file.name}`,
      lastModified: new Date(meta.file.last_touched_at),
      externalUrl: meta.file.url,
      metadata: {
        thumbnailUrl: meta.file.thumbnail_url,
        folderName: meta.file.folder_name,
        editorType: meta.file.editor_type,
        version: meta.file.version,
      },
    }
  }

  /**
   * Read the content of a Figma file.
   *
   * Exports the file structure as markdown with component information.
   *
   * @param connector - The connector to read from
   * @param externalId - The Figma file key
   * @returns The file content as markdown
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // Get file metadata
    const metaResponse = await this.fetchWithAuth(
      connector,
      `${FIGMA_API_BASE}/files/${externalId}/meta`,
    )

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text()
      throw new Error(
        `Failed to get file metadata: ${metaResponse.status} ${errorText}`,
      )
    }

    const meta: FigmaFileMeta = await metaResponse.json()

    // Get file structure (limited depth to avoid huge responses)
    const fileResponse = await this.fetchWithAuth(
      connector,
      `${FIGMA_API_BASE}/files/${externalId}?depth=3`,
    )

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text()
      throw new Error(`Failed to get file: ${fileResponse.status} ${errorText}`)
    }

    const fileData: FigmaDocument = await fileResponse.json()

    // Convert to markdown
    const content = this.documentToMarkdown(fileData, meta)

    return {
      content,
      mimeType: 'text/markdown',
      metadata: {
        key: externalId,
        name: fileData.name,
        url: meta.file.url,
        lastModified: fileData.lastModified,
        version: fileData.version,
        editorType: fileData.editorType,
        role: fileData.role,
      },
    }
  }

  /**
   * Search is not directly supported by Figma API.
   * Returns empty results.
   *
   * @param _connector - The connector to search
   * @param _query - The search query
   * @returns Empty search results
   */
  async search(_connector: Connector, _query: string): Promise<SearchResult> {
    // Figma doesn't have a search API
    // Users would need to list all files and filter client-side
    return {
      items: [],
      totalCount: 0,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Figma doesn't have a changes API, so we compare last_modified timestamps.
   *
   * @param connector - The connector to get changes from
   * @param cursor - ISO timestamp from the last sync, or null for initial sync
   * @returns Modified items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const now = new Date()

    // Get all files
    const result = await this.list(connector)

    if (!cursor) {
      // Initial sync
      return {
        added: result.items,
        modified: [],
        deleted: [],
        newCursor: now.toISOString(),
        hasMore: result.hasMore,
      }
    }

    const lastSyncTime = new Date(cursor)

    // Filter items modified since last sync
    const modified = result.items.filter(
      (item) => item.lastModified && item.lastModified > lastSyncTime,
    )

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
   * Normalize a raw Figma item to a ConnectorItem.
   *
   * @param rawItem - The raw Figma item object
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as FigmaFile & { projectName?: string }

    return {
      externalId: item.key,
      name: item.name,
      type: 'file',
      fileType: 'document',
      mimeType: 'application/figma',
      path: `/figma/${item.projectName || 'files'}/${item.name}`,
      lastModified: new Date(item.last_modified),
      externalUrl: `https://www.figma.com/file/${item.key}`,
      metadata: {
        thumbnailUrl: item.thumbnail_url,
        projectName: item.projectName,
      },
    }
  }

  /**
   * Normalize a Figma file to a ConnectorItem.
   *
   * @param file - The raw Figma file object
   * @param projectName - The project name for path construction
   * @returns Normalized ConnectorItem
   */
  private normalizeFile(file: FigmaFile, projectName: string): ConnectorItem {
    return {
      externalId: file.key,
      name: file.name,
      type: 'file',
      fileType: 'document',
      mimeType: 'application/figma',
      path: `/figma/${projectName}/${file.name}`,
      lastModified: new Date(file.last_modified),
      externalUrl: `https://www.figma.com/file/${file.key}`,
      metadata: {
        thumbnailUrl: file.thumbnail_url,
        projectName,
      },
    }
  }

  /**
   * Convert Figma document to markdown.
   *
   * @param doc - The Figma document
   * @param meta - The file metadata
   * @returns Markdown representation
   */
  private documentToMarkdown(doc: FigmaDocument, meta: FigmaFileMeta): string {
    const lines: string[] = []

    // Header
    lines.push(`# ${doc.name}`)
    lines.push('')
    lines.push(`**Type:** ${doc.editorType}`)
    lines.push(`**Last Modified:** ${doc.lastModified}`)
    lines.push(`**Version:** ${doc.version}`)
    if (meta.file.folder_name) {
      lines.push(`**Folder:** ${meta.file.folder_name}`)
    }
    lines.push(`**URL:** ${meta.file.url}`)
    lines.push('')

    // Components
    const componentKeys = Object.keys(doc.components)
    if (componentKeys.length > 0) {
      lines.push('## Components')
      lines.push('')
      for (const key of componentKeys) {
        const component = doc.components[key]
        lines.push(`### ${component.name}`)
        if (component.description) {
          lines.push(component.description)
        }
        lines.push('')
      }
    }

    // Styles
    const styleKeys = Object.keys(doc.styles)
    if (styleKeys.length > 0) {
      lines.push('## Styles')
      lines.push('')
      for (const key of styleKeys) {
        const style = doc.styles[key]
        lines.push(`- **${style.name}** (${style.styleType})`)
        if (style.description) {
          lines.push(`  ${style.description}`)
        }
      }
      lines.push('')
    }

    // Document structure
    lines.push('## Document Structure')
    lines.push('')
    this.nodeToMarkdown(doc.document, lines, 0)

    return lines.join('\n')
  }

  /**
   * Convert a Figma node tree to markdown.
   *
   * @param node - The Figma node
   * @param lines - Output lines array
   * @param depth - Current indentation depth
   */
  private nodeToMarkdown(
    node: FigmaNode,
    lines: string[],
    depth: number,
  ): void {
    const indent = '  '.repeat(depth)
    const typeIcon = this.getNodeTypeIcon(node.type)

    lines.push(`${indent}- ${typeIcon} **${node.name}** (${node.type})`)

    if (node.children && depth < 3) {
      for (const child of node.children) {
        this.nodeToMarkdown(child, lines, depth + 1)
      }
    }
  }

  /**
   * Get an icon for a Figma node type.
   *
   * @param type - The node type
   * @returns An emoji icon
   */
  private getNodeTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      DOCUMENT: '📄',
      CANVAS: '🎨',
      FRAME: '🖼️',
      GROUP: '📁',
      VECTOR: '✏️',
      BOOLEAN_OPERATION: '⚙️',
      STAR: '⭐',
      LINE: '➖',
      ELLIPSE: '⚪',
      REGULAR_POLYGON: '🔷',
      RECTANGLE: '⬜',
      TEXT: '📝',
      SLICE: '✂️',
      COMPONENT: '🧩',
      COMPONENT_SET: '📦',
      INSTANCE: '🔗',
      STICKY: '📌',
      SHAPE_WITH_TEXT: '💬',
      CONNECTOR: '🔀',
      SECTION: '📑',
    }

    return icons[type] || '•'
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new FigmaProvider()
