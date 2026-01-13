/**
 * Connectors - External Services Integration Types
 *
 * This module defines all types related to external service connectors,
 * including OAuth-based app connectors, custom API connectors, and MCP connectors.
 */

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
  | 'google-meet'
  | 'google-tasks'
  | 'notion'
  | 'dropbox'
  | 'github'

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
 * Status of a connector
 */
export type ConnectorStatus = 'connected' | 'error' | 'expired' | 'syncing'

// =============================================================================
// Connector Configuration
// =============================================================================

/**
 * OAuth configuration for app connectors
 */
export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientId: string
  clientSecret?: string // Required for some providers (Google) even in SPA
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
  encryptedCredential?: string
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
  encryptedToken?: string
  encryptedRefreshToken?: string
  tokenExpiresAt?: Date
  scopes?: string[]
  accountId?: string // For linking related services (e.g., Google)
  accountEmail?: string // Display purposes

  // API connectors
  apiConfig?: ApiConfig

  // MCP connectors
  mcpConfig?: McpConfig

  // Sync configuration
  syncEnabled: boolean
  syncFolders?: string[] // Selected folders/databases to sync
  syncInterval?: number // Minutes between syncs (default: 30)

  // Status
  status: ConnectorStatus
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
  cursor: string | null // Provider-specific delta token
  lastSyncAt: Date
  itemsSynced: number
  syncType: 'full' | 'delta'
  status: 'idle' | 'syncing' | 'error'
  errorMessage?: string
}

// =============================================================================
// OAuth Types
// =============================================================================

/**
 * Result from OAuth authentication flow
 */
export interface OAuthResult {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope: string
  tokenType: string
}

/**
 * Result from token refresh
 */
export interface TokenRefreshResult {
  accessToken: string
  expiresIn?: number
}

/**
 * Account information from OAuth provider
 */
export interface AccountInfo {
  id: string
  email?: string
  name?: string
  picture?: string
}

/**
 * Pending OAuth state during authentication
 */
export interface PendingOAuthState {
  provider: AppConnectorProvider
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

  // Normalization
  normalizeItem(rawItem: unknown): ConnectorItem
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
}
