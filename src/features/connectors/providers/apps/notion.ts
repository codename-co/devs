/**
 * Notion Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Notion.
 * Supports listing, reading, searching pages and databases, and change detection.
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

/** Notion API base URL - use gateway proxy to avoid CORS issues and keep secrets safe */
const NOTION_API_BASE = `${BRIDGE_URL}/api/notion`

/** Notion OAuth endpoints */
const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize'
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'

/** Notion API version header */
const NOTION_VERSION = '2022-06-28'

/** Default page size for API requests */
const DEFAULT_PAGE_SIZE = 100

// =============================================================================
// Types
// =============================================================================

/** Rich text element from Notion API */
interface NotionRichText {
  type: 'text' | 'mention' | 'equation'
  text?: {
    content: string
    link?: { url: string } | null
  }
  mention?: {
    type: string
    [key: string]: unknown
  }
  equation?: {
    expression: string
  }
  annotations?: {
    bold?: boolean
    italic?: boolean
    strikethrough?: boolean
    underline?: boolean
    code?: boolean
    color?: string
  }
  plain_text: string
  href?: string | null
}

/** Block object from Notion API */
interface NotionBlock {
  id: string
  type: string
  has_children: boolean
  created_time: string
  last_edited_time: string
  // Block type specific content
  paragraph?: { rich_text: NotionRichText[] }
  heading_1?: { rich_text: NotionRichText[] }
  heading_2?: { rich_text: NotionRichText[] }
  heading_3?: { rich_text: NotionRichText[] }
  bulleted_list_item?: { rich_text: NotionRichText[] }
  numbered_list_item?: { rich_text: NotionRichText[] }
  to_do?: { rich_text: NotionRichText[]; checked: boolean }
  toggle?: { rich_text: NotionRichText[] }
  quote?: { rich_text: NotionRichText[] }
  callout?: { rich_text: NotionRichText[]; icon?: { emoji?: string } }
  code?: { rich_text: NotionRichText[]; language: string }
  divider?: Record<string, never>
  image?: {
    type: 'external' | 'file'
    external?: { url: string }
    file?: { url: string }
    caption?: NotionRichText[]
  }
  bookmark?: { url: string; caption?: NotionRichText[] }
  embed?: { url: string }
  table_of_contents?: Record<string, never>
  child_page?: { title: string }
  child_database?: { title: string }
}

/** Page object from Notion API */
interface NotionPage {
  id: string
  object: 'page'
  created_time: string
  last_edited_time: string
  archived: boolean
  url: string
  parent: {
    type: 'database_id' | 'page_id' | 'workspace' | 'block_id'
    database_id?: string
    page_id?: string
    workspace?: boolean
    block_id?: string
  }
  properties: Record<string, NotionProperty>
  icon?: { type: string; emoji?: string; external?: { url: string } }
  cover?: { type: string; external?: { url: string }; file?: { url: string } }
}

/** Database object from Notion API */
interface NotionDatabase {
  id: string
  object: 'database'
  created_time: string
  last_edited_time: string
  archived: boolean
  url: string
  parent: {
    type: 'database_id' | 'page_id' | 'workspace' | 'block_id'
    database_id?: string
    page_id?: string
    workspace?: boolean
    block_id?: string
  }
  title: NotionRichText[]
  description: NotionRichText[]
  icon?: { type: string; emoji?: string; external?: { url: string } }
  cover?: { type: string; external?: { url: string }; file?: { url: string } }
  properties: Record<string, NotionPropertySchema>
}

/** Property value from Notion API */
interface NotionProperty {
  id: string
  type: string
  title?: NotionRichText[]
  rich_text?: NotionRichText[]
  number?: number | null
  select?: { name: string; color: string } | null
  multi_select?: Array<{ name: string; color: string }>
  date?: { start: string; end?: string } | null
  checkbox?: boolean
  url?: string | null
  email?: string | null
  phone_number?: string | null
  // ... other property types
  [key: string]: unknown
}

/** Property schema from database */
interface NotionPropertySchema {
  id: string
  name: string
  type: string
  [key: string]: unknown
}

/** Search response from Notion API */
interface NotionSearchResponse {
  object: 'list'
  results: Array<NotionPage | NotionDatabase>
  next_cursor: string | null
  has_more: boolean
}

/** Blocks list response from Notion API */
interface NotionBlocksResponse {
  object: 'list'
  results: NotionBlock[]
  next_cursor: string | null
  has_more: boolean
}

/** Token response from Notion OAuth */
interface NotionTokenResponse {
  access_token: string
  token_type: string
  bot_id: string
  workspace_name?: string
  workspace_icon?: string
  workspace_id: string
  owner: {
    type: 'user' | 'workspace'
    user?: {
      id: string
      name?: string
      avatar_url?: string
      type: string
      person?: { email?: string }
    }
  }
  duplicated_template_id?: string
}

/** User info from Notion API */
interface NotionUser {
  id: string
  object: 'user'
  type: 'person' | 'bot'
  name?: string
  avatar_url?: string
  person?: {
    email?: string
  }
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Notion connector provider.
 *
 * Provides OAuth authentication and API integration for Notion,
 * including page/database listing, content retrieval, search, and change detection.
 */
export class NotionProvider extends BaseAppConnectorProvider {
  readonly id = 'notion' as const

  readonly config: ConnectorProviderConfig = {
    id: 'notion',
    category: 'app',
    name: 'Notion',
    icon: 'notion',
    color: '#000000',
    capabilities: ['read', 'search'],
    supportedTypes: ['page', 'database'],
    maxFileSize: 5 * 1024 * 1024,
    rateLimit: { requests: 3, windowSeconds: 1 },
  }

  /** Get the Notion OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_NOTION_CLIENT_ID || ''
  }

  /** Get the Notion OAuth client secret from environment */
  private get clientSecret(): string {
    return import.meta.env.VITE_NOTION_CLIENT_SECRET || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // HTTP Helpers (Override for Notion-specific headers)
  // ===========================================================================

  /**
   * Make an authenticated HTTP request to the Notion API.
   *
   * Automatically adds:
   * - Bearer token authentication
   * - Notion-Version header
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
    headers.set('Notion-Version', NOTION_VERSION)
    headers.set('Content-Type', 'application/json')

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

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Notion OAuth authorization URL.
   *
   * Note: Notion doesn't use PKCE, but we accept the parameters for interface compatibility.
   *
   * @param state - State parameter for CSRF protection
   * @param _codeChallenge - Not used by Notion (no PKCE support)
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, _codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      owner: 'user', // Request user token (not workspace integration)
      state,
    })

    return `${NOTION_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access tokens.
   *
   * Note: Notion doesn't use PKCE and requires Basic auth with client credentials.
   *
   * @param code - The authorization code from OAuth callback
   * @param _codeVerifier - Not used by Notion (no PKCE support)
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(
    code: string,
    _codeVerifier: string,
  ): Promise<OAuthResult> {
    // Notion requires Basic auth with client_id:client_secret
    const basicAuth = btoa(`${this.clientId}:${this.clientSecret}`)

    const response = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: NotionTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      // Notion doesn't provide refresh tokens - tokens don't expire
      refreshToken: undefined,
      expiresIn: undefined, // Notion tokens don't expire
      scope: '', // Notion handles scopes through integration settings
      tokenType: data.token_type,
    }
  }

  /**
   * Refresh an expired access token.
   *
   * Note: Notion tokens don't expire and don't support refresh.
   * This method throws an error if called.
   *
   * @param _connector - The connector (unused)
   * @throws Error - Notion doesn't support token refresh
   */
  async refreshToken(_connector: Connector): Promise<TokenRefreshResult> {
    // Notion tokens don't expire and don't support refresh
    throw new Error(
      'Notion tokens do not expire and cannot be refreshed. Re-authenticate if needed.',
    )
  }

  /**
   * Validate that a token is still valid with Notion.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${NOTION_API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   *
   * Note: Notion doesn't have a revocation endpoint.
   * Users must revoke access through Notion settings.
   *
   * @param _connector - The connector (unused)
   */
  async revokeAccess(_connector: Connector): Promise<void> {
    // Notion doesn't have a revocation endpoint
    // Users must manually revoke access through their Notion settings
    // We just clear local tokens (handled by the connector manager)
  }

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and email
   * @throws Error if fetching account info fails
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(`${NOTION_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get account info: ${response.status} ${errorText}`,
      )
    }

    const data: NotionUser = await response.json()

    return {
      id: data.id,
      email: data.person?.email,
      name: data.name,
      picture: data.avatar_url,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List pages and databases from Notion using a raw access token.
   *
   * Note: Notion doesn't have a folder selection workflow in the wizard,
   * so this is primarily for API consistency.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of pages/databases with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const body: Record<string, unknown> = {
      page_size: options?.pageSize ?? DEFAULT_PAGE_SIZE,
    }

    // Add cursor for pagination
    if (options?.cursor) {
      body.start_cursor = options.cursor
    }

    // Filter by object type if specified
    if (options?.filter?.type) {
      body.filter = {
        value: options.filter.type,
        property: 'object',
      }
    }

    const response = await fetch(`${NOTION_API_BASE}/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list items: ${response.status} ${errorText}`)
    }

    const data: NotionSearchResponse = await response.json()

    return {
      items: data.results.map((item) => this.normalizeItem(item)),
      nextCursor: data.next_cursor ?? undefined,
      hasMore: data.has_more,
    }
  }

  /**
   * List pages and databases from Notion.
   *
   * Uses the search API to list all accessible pages and databases.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of pages/databases with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const body: Record<string, unknown> = {
      page_size: options?.pageSize ?? DEFAULT_PAGE_SIZE,
    }

    // Add cursor for pagination
    if (options?.cursor) {
      body.start_cursor = options.cursor
    }

    // Filter by object type if specified
    if (options?.filter?.type) {
      body.filter = {
        value: options.filter.type,
        property: 'object',
      }
    }

    const response = await this.fetchWithAuth(
      connector,
      `${NOTION_API_BASE}/search`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list items: ${response.status} ${errorText}`)
    }

    const data: NotionSearchResponse = await response.json()

    return {
      items: data.results.map((item) => this.normalizeItem(item)),
      nextCursor: data.next_cursor ?? undefined,
      hasMore: data.has_more,
    }
  }

  /**
   * Read the content of a page from Notion.
   *
   * Fetches all blocks from the page and converts them to markdown.
   *
   * @param connector - The connector to read from
   * @param externalId - The Notion page ID
   * @returns The page content as markdown
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // First, get page metadata
    const pageResponse = await this.fetchWithAuth(
      connector,
      `${NOTION_API_BASE}/pages/${externalId}`,
    )

    if (!pageResponse.ok) {
      const errorText = await pageResponse.text()
      throw new Error(`Failed to get page: ${pageResponse.status} ${errorText}`)
    }

    const page: NotionPage = await pageResponse.json()

    // Fetch all blocks recursively
    const blocks = await this.fetchAllBlocks(connector, externalId)

    // Convert blocks to markdown
    const content = this.blocksToMarkdown(blocks)

    // Get page title
    const title = this.extractPageTitle(page)

    // Combine title and content
    const fullContent = title ? `# ${title}\n\n${content}` : content

    return {
      content: fullContent,
      mimeType: 'text/markdown',
      metadata: {
        id: page.id,
        title,
        url: page.url,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
        archived: page.archived,
      },
    }
  }

  /**
   * Search for pages and databases matching a query.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Matching items
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const body = {
      query,
      page_size: 50,
    }

    const response = await this.fetchWithAuth(
      connector,
      `${NOTION_API_BASE}/search`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Search failed: ${response.status} ${errorText}`)
    }

    const data: NotionSearchResponse = await response.json()

    return {
      items: data.results.map((item) => this.normalizeItem(item)),
      totalCount: data.results.length,
      nextCursor: data.next_cursor ?? undefined,
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Note: Notion doesn't have a true delta/changes API like Google Drive.
   * We simulate it by searching for items modified since the cursor timestamp.
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

    // For initial sync, get all items
    if (!cursor) {
      const result = await this.list(connector)

      return {
        added: result.items,
        modified: [],
        deleted: [], // Notion doesn't provide deletion info without tracking
        newCursor: now.toISOString(),
        hasMore: result.hasMore,
      }
    }

    // Parse the cursor as a timestamp
    const lastSyncTime = new Date(cursor)

    // Search for all items and filter by last_edited_time
    // Unfortunately, Notion search doesn't support filtering by date directly
    // We need to fetch all and filter client-side
    const body = {
      page_size: DEFAULT_PAGE_SIZE,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    }

    const response = await this.fetchWithAuth(
      connector,
      `${NOTION_API_BASE}/search`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get changes: ${response.status} ${errorText}`)
    }

    const data: NotionSearchResponse = await response.json()

    // Filter items modified since last sync
    const modified: ConnectorItem[] = []
    let hasMoreChanges = false

    for (const item of data.results) {
      const lastEdited = new Date(item.last_edited_time)
      if (lastEdited > lastSyncTime) {
        modified.push(this.normalizeItem(item))
      } else {
        // Items are sorted by last_edited_time desc,
        // so once we hit an older item, we can stop
        break
      }
    }

    // If all items in this page were modified, there might be more
    if (modified.length === data.results.length && data.has_more) {
      hasMoreChanges = true
    }

    return {
      added: [],
      modified,
      deleted: [], // Notion doesn't provide deletion tracking
      newCursor: now.toISOString(),
      hasMore: hasMoreChanges,
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a Notion page or database to a ConnectorItem.
   *
   * @param rawItem - The raw Notion page or database object
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as NotionPage | NotionDatabase

    const isDatabase = item.object === 'database'

    // Extract title
    let name: string
    if (isDatabase) {
      const db = item as NotionDatabase
      name = this.richTextToPlainText(db.title) || 'Untitled Database'
    } else {
      const page = item as NotionPage
      name = this.extractPageTitle(page) || 'Untitled'
    }

    // Build path based on parent
    let path: string
    if (item.parent.database_id) {
      path = `/notion/${item.parent.database_id}`
    } else if (item.parent.page_id) {
      path = `/notion/${item.parent.page_id}`
    } else {
      path = '/notion/pages'
    }

    // Determine file type
    const fileType = isDatabase ? 'document' : 'document'

    // Extract description for databases
    let description: string | undefined
    if (isDatabase) {
      const db = item as NotionDatabase
      description = this.richTextToPlainText(db.description) || undefined
    }

    return {
      externalId: item.id,
      name,
      type: 'file', // Notion pages/databases are treated as files
      fileType,
      mimeType: 'text/markdown',
      path: `${path}/${name}`,
      parentExternalId: item.parent.database_id || item.parent.page_id,
      lastModified: new Date(item.last_edited_time),
      externalUrl: item.url,
      description,
      metadata: {
        object: item.object,
        archived: item.archived,
        parentType: item.parent.type,
        createdTime: item.created_time,
      },
    }
  }

  // ===========================================================================
  // Block Fetching and Conversion
  // ===========================================================================

  /**
   * Fetch all blocks from a page recursively.
   *
   * @param connector - The connector to use
   * @param blockId - The block/page ID to fetch children from
   * @returns Array of all blocks (including nested children)
   */
  private async fetchAllBlocks(
    connector: Connector,
    blockId: string,
  ): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = []
    let cursor: string | null = null

    do {
      const url = new URL(`${NOTION_API_BASE}/blocks/${blockId}/children`)
      url.searchParams.set('page_size', '100')
      if (cursor) {
        url.searchParams.set('start_cursor', cursor)
      }

      const response = await this.fetchWithAuth(connector, url.toString())

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to fetch blocks: ${response.status} ${errorText}`,
        )
      }

      const data: NotionBlocksResponse = await response.json()

      // Process each block, recursively fetching children if needed
      for (const block of data.results) {
        blocks.push(block)

        // Recursively fetch children for blocks that have them
        if (
          block.has_children &&
          !['child_page', 'child_database'].includes(block.type)
        ) {
          const children = await this.fetchAllBlocks(connector, block.id)
          // Indent children (we'll handle this in markdown conversion)
          blocks.push(
            ...children.map(
              (child) => ({ ...child, _parent: block.id }) as NotionBlock,
            ),
          )
        }
      }

      cursor = data.next_cursor
    } while (cursor)

    return blocks
  }

  /**
   * Convert Notion blocks to markdown.
   *
   * @param blocks - Array of Notion blocks
   * @returns Markdown string
   */
  private blocksToMarkdown(blocks: NotionBlock[]): string {
    const lines: string[] = []
    let numberedListIndex = 0

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const nextBlock = blocks[i + 1]

      // Reset numbered list index when we exit a numbered list
      if (block.type !== 'numbered_list_item') {
        numberedListIndex = 0
      }

      const markdown = this.blockToMarkdown(block, numberedListIndex)

      if (markdown !== null) {
        lines.push(markdown)

        // Increment numbered list counter
        if (block.type === 'numbered_list_item') {
          numberedListIndex++
        }

        // Add extra newline after certain block types for better readability
        if (
          [
            'heading_1',
            'heading_2',
            'heading_3',
            'paragraph',
            'quote',
            'code',
            'divider',
          ].includes(block.type) &&
          nextBlock &&
          !['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(
            nextBlock.type,
          )
        ) {
          lines.push('')
        }
      }
    }

    return lines.join('\n').trim()
  }

  /**
   * Convert a single Notion block to markdown.
   *
   * @param block - The Notion block
   * @param listIndex - Current index for numbered lists
   * @returns Markdown string or null if block should be skipped
   */
  private blockToMarkdown(
    block: NotionBlock,
    listIndex: number,
  ): string | null {
    switch (block.type) {
      case 'paragraph':
        return this.richTextToMarkdown(block.paragraph?.rich_text || [])

      case 'heading_1':
        return `# ${this.richTextToMarkdown(block.heading_1?.rich_text || [])}`

      case 'heading_2':
        return `## ${this.richTextToMarkdown(block.heading_2?.rich_text || [])}`

      case 'heading_3':
        return `### ${this.richTextToMarkdown(block.heading_3?.rich_text || [])}`

      case 'bulleted_list_item':
        return `- ${this.richTextToMarkdown(block.bulleted_list_item?.rich_text || [])}`

      case 'numbered_list_item':
        return `${listIndex + 1}. ${this.richTextToMarkdown(block.numbered_list_item?.rich_text || [])}`

      case 'to_do': {
        const checked = block.to_do?.checked ? 'x' : ' '
        return `- [${checked}] ${this.richTextToMarkdown(block.to_do?.rich_text || [])}`
      }

      case 'toggle':
        // Toggle blocks are represented as details/summary in markdown
        return `<details>\n<summary>${this.richTextToMarkdown(block.toggle?.rich_text || [])}</summary>\n</details>`

      case 'quote':
        return `> ${this.richTextToMarkdown(block.quote?.rich_text || [])}`

      case 'callout': {
        const icon = block.callout?.icon?.emoji || '💡'
        const text = this.richTextToMarkdown(block.callout?.rich_text || [])
        return `> ${icon} ${text}`
      }

      case 'code': {
        const language = block.code?.language || ''
        const code = this.richTextToPlainText(block.code?.rich_text || [])
        return `\`\`\`${language}\n${code}\n\`\`\``
      }

      case 'divider':
        return '---'

      case 'image': {
        const url = block.image?.external?.url || block.image?.file?.url || ''
        const caption = this.richTextToPlainText(block.image?.caption || [])
        return caption ? `![${caption}](${url})` : `![image](${url})`
      }

      case 'bookmark': {
        const url = block.bookmark?.url || ''
        const caption = this.richTextToPlainText(block.bookmark?.caption || [])
        return caption ? `[${caption}](${url})` : `<${url}>`
      }

      case 'embed':
        return `[Embed](${block.embed?.url || ''})`

      case 'table_of_contents':
        return '[TOC]'

      case 'child_page':
        return `📄 [${block.child_page?.title || 'Untitled'}]`

      case 'child_database':
        return `🗄️ [${block.child_database?.title || 'Untitled Database'}]`

      default:
        // Unknown block type, skip it
        return null
    }
  }

  /**
   * Convert Notion rich text array to markdown.
   *
   * @param richText - Array of rich text elements
   * @returns Markdown string with formatting
   */
  private richTextToMarkdown(richText: NotionRichText[]): string {
    return richText
      .map((element) => {
        let text = element.plain_text

        // Apply annotations
        const annotations = element.annotations || {}

        if (annotations.code) {
          text = `\`${text}\``
        }

        if (annotations.bold) {
          text = `**${text}**`
        }

        if (annotations.italic) {
          text = `*${text}*`
        }

        if (annotations.strikethrough) {
          text = `~~${text}~~`
        }

        // Handle links
        if (element.href) {
          text = `[${text}](${element.href})`
        }

        return text
      })
      .join('')
  }

  /**
   * Convert Notion rich text array to plain text.
   *
   * @param richText - Array of rich text elements
   * @returns Plain text string without formatting
   */
  private richTextToPlainText(richText: NotionRichText[]): string {
    return richText.map((element) => element.plain_text).join('')
  }

  /**
   * Extract the title from a Notion page.
   *
   * @param page - The Notion page object
   * @returns The page title or undefined
   */
  private extractPageTitle(page: NotionPage): string | undefined {
    // Look for a title property
    for (const property of Object.values(page.properties)) {
      if (property.type === 'title' && property.title) {
        return this.richTextToPlainText(property.title)
      }
    }

    return undefined
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new NotionProvider()
