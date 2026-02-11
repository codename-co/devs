/**
 * Connectors - External Services Integration Types
 *
 * This module defines all types related to external service connectors,
 * including OAuth-based app connectors, custom API connectors, and MCP connectors.
 *
 * ## Data Sensitivity Classification
 *
 * All fields that handle sensitive data are annotated with `@sensitivity` tags:
 * - **critical**: Must be encrypted at rest, never logged (tokens, secrets)
 * - **high**: Encrypt or restrict access, avoid logging (PII, encryption metadata)
 * - **medium**: Basic access control, audit logging (user content, sync cursors)
 * - **low**: Standard handling (display names, status, config metadata)
 */

// =============================================================================
// Data Sensitivity Classification
// =============================================================================

/**
 * Classification levels for sensitive data in the connector system.
 * Used to enforce appropriate protection for each data field.
 */
export type DataSensitivity = 'critical' | 'high' | 'medium' | 'low'

// =============================================================================
// Connector Categories & Providers
// =============================================================================

/**
 * Categories of connectors supported by the system
 * - app: OAuth 2.0 based services (Google, Notion, etc.)
 * - api: Custom REST/GraphQL endpoints
 * - mcp: Model Context Protocol servers
 */
export type ConnectorCategory = 'app' | 'api' | 'mcp'

/**
 * App connectors use OAuth 2.0 for authentication
 */
export type AppConnectorProvider =
  | 'google-drive'
  | 'gmail'
  | 'google-calendar'
  | 'google-chat'
  | 'google-meet'
  | 'google-tasks'
  | 'notion'
  | 'dropbox'
  | 'github'
  | 'qonto'
  | 'slack'
  | 'outlook-mail'
  | 'onedrive'
  | 'figma'

/**
 * API connectors use API keys or bearer tokens
 */
export type ApiConnectorProvider = 'custom-api'

/**
 * MCP connectors use the Model Context Protocol
 */
export type McpConnectorProvider = 'custom-mcp'

/**
 * Union of all connector provider types
 */
export type ConnectorProvider =
  | AppConnectorProvider
  | ApiConnectorProvider
  | McpConnectorProvider

/**
 * Status of a connector (persisted states only)
 * Note: 'syncing' is a transient state tracked by SyncEngine.jobs, not persisted
 */
export type ConnectorStatus = 'connected' | 'error' | 'expired'

// =============================================================================
// Connector Configuration
// =============================================================================

/**
 * OAuth configuration for app connectors
 */
export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  /** @sensitivity high - reveals granted permissions */
  scopes: string[]
  /** @sensitivity high - OAuth client identifier */
  clientId: string
  /** @sensitivity critical - must be kept server-side; empty on client */
  clientSecret?: string
  pkceRequired: boolean
  /** Use HTTP Basic Auth for token exchange instead of client_secret in body (required by Notion) */
  useBasicAuth?: boolean
}

/**
 * API configuration for custom API connectors
 */
export interface ApiConfig {
  baseUrl: string
  authType: 'bearer' | 'api-key' | 'basic' | 'none'
  /** @sensitivity critical - encrypted API credential */
  encryptedCredential?: string
  /** @sensitivity high - may contain auth headers */
  headers?: Record<string, string>
}

/**
 * MCP configuration for Model Context Protocol connectors
 */
export interface McpConfig {
  serverUrl: string
  transport: 'stdio' | 'sse' | 'websocket'
  capabilities?: string[]
  discoveredTools?: McpTool[]
  discoveredResources?: McpResource[]
}

/**
 * MCP Tool definition (discovered from server)
 */
export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/**
 * MCP Resource definition (discovered from server)
 */
export interface McpResource {
  uri: string
  name?: string
  description?: string
  mimeType?: string
}

/**
 * Rate limit configuration for providers
 */
export interface RateLimitConfig {
  requests: number
  windowSeconds: number
}

// =============================================================================
// Provider Metadata & Registration
// =============================================================================

/**
 * Proxy route configuration for OAuth credential injection
 */
export interface ProviderProxyRoute {
  /** URL path prefix to match (e.g., '/api/google') */
  pathPrefix: string
  /** Additional path pattern to match for credential injection (e.g., '/token') */
  pathMatch?: string
  /** Target base URL to proxy to */
  target: string
  /** Path to prepend to the rewritten URL (e.g., '/v1' for Notion) */
  targetPathPrefix?: string
  /** How to inject credentials */
  credentials:
    | { type: 'body'; clientIdEnvKey: string; clientSecretEnvKey: string }
    | { type: 'basic-auth'; clientIdEnvKey: string; clientSecretEnvKey: string }
    | { type: 'none' }
}

/**
 * Self-contained metadata for an app connector provider.
 * Each provider defines its own metadata, making it fully self-contained.
 */
export interface ProviderMetadata {
  /** Unique provider identifier */
  id: AppConnectorProvider
  /** Display name */
  name: string
  /** Icon name from the Icon component */
  icon: string
  /** Brand color (hex or 'currentColor') */
  color: string
  /** Short description for UI display */
  description: string
  /** Whether this provider supports syncing content to the Knowledge Base */
  syncSupported: boolean
  /** Whether this provider is currently active (false = coming soon) */
  active?: boolean
  /**
   * Type of folder picker UI to show during setup:
   * - 'tree' (default): Standard folder tree browser
   * - 'url-input': Text input for URLs/IDs (for providers like Figma)
   */
  folderPickerType?: 'tree' | 'url-input'
  /** Placeholder text for url-input mode */
  urlInputPlaceholder?: string
  /** Help text for url-input mode */
  urlInputHelp?: string
  /** OAuth configuration */
  oauth: OAuthConfig
  /** Proxy routes for dev server (credential injection) */
  proxyRoutes?: ProviderProxyRoute[]
}

/**
 * Provider configuration - defines how to interact with a connector type
 */
export interface ConnectorProviderConfig {
  id: ConnectorProvider
  category: ConnectorCategory
  name: string
  icon: string
  color: string

  // OAuth config (for app connectors)
  oauth?: OAuthConfig

  // Capabilities
  capabilities: ('read' | 'write' | 'search' | 'watch')[]
  supportedTypes: string[] // File extensions or content types
  maxFileSize: number // Bytes

  // Rate limits
  rateLimit?: RateLimitConfig
}

// =============================================================================
// Connector Entity
// =============================================================================

/**
 * Main connector entity stored in IndexedDB
 */
export interface Connector {
  id: string
  category: ConnectorCategory
  provider: ConnectorProvider
  name: string // User-defined display name

  // App connectors (OAuth)
  /** @sensitivity critical - AES-GCM encrypted OAuth access token */
  encryptedToken?: string
  /** @sensitivity critical - AES-GCM encrypted OAuth refresh token */
  encryptedRefreshToken?: string
  /** @sensitivity high - initialization vector for token decryption */
  tokenIv?: string
  /** @sensitivity high - initialization vector for refresh token decryption */
  refreshTokenIv?: string
  tokenExpiresAt?: Date
  /** @sensitivity high - reveals granted OAuth permissions */
  scopes?: string[]
  /** @sensitivity high - external account identifier (PII) */
  accountId?: string
  /** @sensitivity high - user email address (PII, synced via P2P) */
  accountEmail?: string
  /** @sensitivity medium - user avatar URL (indirect PII) */
  accountPicture?: string

  // API connectors
  apiConfig?: ApiConfig

  // MCP connectors
  mcpConfig?: McpConfig

  // Sync configuration
  syncEnabled: boolean
  /** @sensitivity medium - reveals user's selected external folders */
  syncFolders?: string[]
  syncInterval?: number // Minutes between syncs (default: 30)

  // Status
  status: ConnectorStatus
  /** @sensitivity medium - may contain provider error details; must be sanitized */
  errorMessage?: string
  lastSyncAt?: Date

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// Sync State
// =============================================================================

/**
 * Sync state for a connector - tracks delta sync progress
 */
export interface ConnectorSyncState {
  id: string
  connectorId: string
  /** @sensitivity medium - provider-specific delta token; may reveal sync position */
  cursor: string | null
  lastSyncAt: Date
  itemsSynced: number
  syncType: 'full' | 'delta'
  status: 'idle' | 'syncing' | 'error'
  /** @sensitivity medium - must be sanitized before storage */
  errorMessage?: string
}

// =============================================================================
// OAuth Types
// =============================================================================

/**
 * Result from OAuth authentication flow
 *
 * Contains plaintext tokens — must be encrypted via SecureStorage
 * immediately after receipt. Never persist or log this object directly.
 */
export interface OAuthResult {
  /** @sensitivity critical - plaintext access token; encrypt immediately */
  accessToken: string
  /** @sensitivity critical - plaintext refresh token; encrypt immediately */
  refreshToken?: string
  expiresIn?: number
  /** @sensitivity high - reveals granted permissions */
  scope: string
  tokenType: string
}

/**
 * Result from token refresh
 *
 * Contains a plaintext token — must be encrypted via SecureStorage
 * immediately after receipt. Never persist or log.
 */
export interface TokenRefreshResult {
  /** @sensitivity critical - plaintext access token; encrypt immediately */
  accessToken: string
  expiresIn?: number
}

/**
 * Account information from OAuth provider
 */
export interface AccountInfo {
  /** @sensitivity high - external account identifier */
  id: string
  /** @sensitivity high - user email (PII) */
  email?: string
  /** @sensitivity high - user display name (PII) */
  name?: string
  /** @sensitivity medium - user avatar URL (indirect PII) */
  picture?: string
}

/**
 * Pending OAuth state during authentication
 *
 * Transient in-memory state — cleaned up after OAuth flow completes or times out.
 */
export interface PendingOAuthState {
  provider: AppConnectorProvider
  /** @sensitivity critical - PKCE code verifier; must never be logged or persisted */
  codeVerifier: string
  timestamp: number
}

// =============================================================================
// Provider Operation Types
// =============================================================================

/**
 * Options for listing items from a provider
 */
export interface ListOptions {
  path?: string
  cursor?: string
  pageSize?: number
  filter?: Record<string, unknown>
}

/**
 * Result from listing items
 */
export interface ListResult {
  items: ConnectorItem[]
  nextCursor?: string
  hasMore: boolean
}

/**
 * Result from reading content
 */
export interface ContentResult {
  content: string | ArrayBuffer
  mimeType: string
  metadata?: Record<string, unknown>
}

/**
 * Result from searching
 */
export interface SearchResult {
  items: ConnectorItem[]
  totalCount?: number
  nextCursor?: string
}

/**
 * Result from fetching changes (delta sync)
 */
export interface ChangesResult {
  added: ConnectorItem[]
  modified: ConnectorItem[]
  deleted: string[] // External IDs
  newCursor: string
  hasMore: boolean
}

/**
 * Normalized item from connector before conversion to KnowledgeItem
 */
export interface ConnectorItem {
  externalId: string
  name: string
  type: 'file' | 'folder'
  fileType?: 'document' | 'image' | 'text'
  mimeType?: string
  size?: number
  path: string
  parentExternalId?: string
  lastModified: Date
  externalUrl?: string
  contentHash?: string
  content?: string
  transcript?: string // Extracted plain text content (e.g., from email body)
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

// =============================================================================
// Sync Engine Types
// =============================================================================

/**
 * Sync job for queue management
 */
export interface SyncJob {
  id: string
  connectorId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  itemsProcessed: number
  error?: string
}

/**
 * Result from sync operation
 */
export interface SyncResult {
  success: boolean
  itemsSynced: number
  itemsDeleted: number
  errors: string[]
  duration: number // milliseconds
}

// =============================================================================
// Provider Registration
// =============================================================================

/**
 * Provider loader function for lazy loading
 */
export type ProviderLoader = () => Promise<{
  default: ConnectorProviderInterface
}>

/**
 * Base interface that all connector providers must implement
 */
export interface ConnectorProviderInterface {
  readonly id: ConnectorProvider
  readonly config: ConnectorProviderConfig

  // Lifecycle
  initialize?(): Promise<void>
  dispose?(): Promise<void>

  // Content Operations
  list(connector: Connector, options?: ListOptions): Promise<ListResult>
  read(connector: Connector, externalId: string): Promise<ContentResult>
  search?(connector: Connector, query: string): Promise<SearchResult>

  // Delta Sync
  getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult>

  // Normalization (can be async for providers that need to parse content)
  normalizeItem(rawItem: unknown): ConnectorItem | Promise<ConnectorItem>
}

/**
 * Extended interface for OAuth-based app connectors
 */
export interface AppConnectorProviderInterface
  extends ConnectorProviderInterface {
  // Authentication
  getAuthUrl(state: string, codeChallenge: string): string
  exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult>
  refreshToken(connector: Connector): Promise<TokenRefreshResult>
  validateToken(token: string): Promise<boolean>
  revokeAccess(connector: Connector): Promise<void>

  // Account info
  getAccountInfo(token: string): Promise<AccountInfo>

  // Raw token operations (for wizard flow before token is encrypted)
  listWithToken(token: string, options?: ListOptions): Promise<ListResult>
}

/**
 * Extended interface for custom API connectors
 */
export interface ApiConnectorProviderInterface
  extends ConnectorProviderInterface {
  // Request building
  buildRequest(
    connector: Connector,
    endpoint: string,
    options?: RequestInit,
  ): Promise<Request>

  // Schema inference
  inferSchema?(response: unknown): Record<string, unknown>
}

/**
 * Extended interface for MCP connectors
 */
export interface McpConnectorProviderInterface
  extends ConnectorProviderInterface {
  // Connection
  connect(connector: Connector): Promise<void>
  disconnect(connector: Connector): Promise<void>

  // Discovery
  discoverTools(connector: Connector): Promise<McpTool[]>
  discoverResources(connector: Connector): Promise<McpResource[]>

  // Tool execution
  executeTool(
    connector: Connector,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown>
}

// =============================================================================
// KnowledgeItem Extension
// =============================================================================

/**
 * Extended fields for KnowledgeItem when sourced from a connector
 */
export interface ConnectorKnowledgeFields {
  connectorId?: string // Source connector ID
  externalId?: string // ID in external system
  externalUrl?: string // Direct link to source
  syncedAt?: Date // Last sync timestamp
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Events emitted by the connector system
 */
export type ConnectorEventType =
  | 'connector:connected'
  | 'connector:disconnected'
  | 'connector:error'
  | 'connector:sync:start'
  | 'connector:sync:progress'
  | 'connector:sync:complete'
  | 'connector:sync:error'

export interface ConnectorEvent {
  type: ConnectorEventType
  connectorId: string
  data?: Record<string, unknown>
  timestamp: Date
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default sync interval in minutes
 */
export const DEFAULT_SYNC_INTERVAL = 30

/**
 * Maximum file size for sync (10MB)
 */
export const MAX_SYNC_FILE_SIZE = 10 * 1024 * 1024

/**
 * Supported app connector providers with their configurations
 */
export const APP_CONNECTOR_CONFIGS: Record<
  AppConnectorProvider,
  Omit<ConnectorProviderConfig, 'oauth'>
> = {
  'google-drive': {
    id: 'google-drive',
    category: 'app',
    name: 'Google Drive',
    icon: 'google-drive',
    color: '#4285F4',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 1000, windowSeconds: 100 },
  },
  gmail: {
    id: 'gmail',
    category: 'app',
    name: 'Gmail',
    icon: 'gmail',
    color: '#EA4335',
    capabilities: ['read', 'search'],
    supportedTypes: ['email'],
    maxFileSize: 25 * 1024 * 1024,
    rateLimit: { requests: 250, windowSeconds: 1 },
  },
  'google-calendar': {
    id: 'google-calendar',
    category: 'app',
    name: 'Google Calendar',
    icon: 'google-calendar',
    color: '#4285F4',
    capabilities: ['read', 'search'],
    supportedTypes: ['event'],
    maxFileSize: 1024 * 1024,
    rateLimit: { requests: 500, windowSeconds: 100 },
  },
  'google-chat': {
    id: 'google-chat',
    category: 'app',
    name: 'Google Chat',
    icon: 'google-chat',
    color: '#00AC47',
    capabilities: ['read', 'search'],
    supportedTypes: ['message', 'space'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 60, windowSeconds: 60 },
  },
  'google-meet': {
    id: 'google-meet',
    category: 'app',
    name: 'Google Meet',
    icon: 'google-meet',
    color: '#00897B',
    capabilities: ['read'],
    supportedTypes: ['meeting'],
    maxFileSize: 0,
    rateLimit: { requests: 100, windowSeconds: 60 },
  },
  'google-tasks': {
    id: 'google-tasks',
    category: 'app',
    name: 'Google Tasks',
    icon: 'google-tasks',
    color: '#4285F4',
    capabilities: ['read'],
    supportedTypes: ['task', 'tasklist'],
    maxFileSize: 1024 * 1024,
    rateLimit: { requests: 500, windowSeconds: 100 },
  },
  notion: {
    id: 'notion',
    category: 'app',
    name: 'Notion',
    icon: 'notion',
    color: '#000000',
    capabilities: ['read', 'search'],
    supportedTypes: ['page', 'database'],
    maxFileSize: 5 * 1024 * 1024,
    rateLimit: { requests: 3, windowSeconds: 1 },
  },
  dropbox: {
    id: 'dropbox',
    category: 'app',
    name: 'Dropbox',
    icon: 'dropbox',
    color: '#0061FF',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 1000, windowSeconds: 300 },
  },
  github: {
    id: 'github',
    category: 'app',
    name: 'GitHub',
    icon: 'github',
    color: '#181717',
    capabilities: ['read', 'search'],
    supportedTypes: ['repository', 'file'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 5000, windowSeconds: 3600 },
  },
  qonto: {
    id: 'qonto',
    category: 'app',
    name: 'Qonto',
    icon: 'qonto',
    color: '#000',
    capabilities: ['read'],
    supportedTypes: ['account', 'transaction', 'statement'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 10, windowSeconds: 1 },
  },
  slack: {
    id: 'slack',
    category: 'app',
    name: 'Slack',
    icon: 'slack',
    color: '#4A154B',
    capabilities: ['read', 'search'],
    supportedTypes: ['message', 'channel', 'file'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 50, windowSeconds: 60 },
  },
  'outlook-mail': {
    id: 'outlook-mail',
    category: 'app',
    name: 'Outlook Mail',
    icon: 'outlook',
    color: '#0078D4',
    capabilities: ['read', 'search'],
    supportedTypes: ['email'],
    maxFileSize: 25 * 1024 * 1024,
    rateLimit: { requests: 100, windowSeconds: 60 },
  },
  onedrive: {
    id: 'onedrive',
    category: 'app',
    name: 'OneDrive',
    icon: 'onedrive',
    color: '#0078D4',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 100, windowSeconds: 60 },
  },
  figma: {
    id: 'figma',
    category: 'app',
    name: 'Figma',
    icon: 'figma',
    color: '#F24E1E',
    capabilities: ['read', 'search'],
    supportedTypes: ['file', 'project'],
    maxFileSize: MAX_SYNC_FILE_SIZE,
    rateLimit: { requests: 100, windowSeconds: 60 },
  },
}
