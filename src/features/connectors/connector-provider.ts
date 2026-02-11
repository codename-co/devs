/**
 * Connector Provider - Base Classes and Helpers
 *
 * This module provides base classes and helper functions for implementing
 * connector providers. It handles common concerns like token management,
 * authenticated HTTP requests, and OAuth scope configuration.
 */

import { SecureStorage } from '@/lib/crypto'
import { sanitizeErrorMessage } from './sanitizer'
import type {
  Connector,
  ConnectorProviderConfig,
  AppConnectorProviderInterface,
  OAuthResult,
  TokenRefreshResult,
  AccountInfo,
  ListOptions,
  ListResult,
  ContentResult,
  SearchResult,
  ChangesResult,
  ConnectorItem,
  AppConnectorProvider,
} from './types'

/**
 * Lazy getter for the connector store to avoid circular dependency.
 * The store imports from this module, so we need to import it dynamically.
 */
const getConnectorStore = async () => {
  const { useConnectorStore } = await import('./stores/connectorStore')
  return useConnectorStore.getState()
}

/**
 * Lazy getter for notifyWarning to avoid circular dependency.
 * The notifications feature imports from db which imports connector types.
 */
const getNotifyWarning = async () => {
  const { notifyWarning } = await import('@/features/notifications')
  return notifyWarning
}

// =============================================================================
// Constants
// =============================================================================

/**
 * LocalStorage key prefix for connector encryption metadata
 */
export const CONNECTOR_STORAGE_PREFIX = 'connector'

/**
 * OAuth scopes for each app connector provider
 */
const PROVIDER_SCOPES: Record<AppConnectorProvider, string[]> = {
  'google-drive': ['https://www.googleapis.com/auth/drive.readonly'],
  gmail: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
  ],
  'google-calendar': ['https://www.googleapis.com/auth/calendar.readonly'],
  'google-chat': [
    'https://www.googleapis.com/auth/chat.spaces.readonly',
    'https://www.googleapis.com/auth/chat.messages.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  'google-meet': [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  'google-tasks': [
    'https://www.googleapis.com/auth/tasks.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  notion: [], // Notion handles scopes differently via their OAuth integration settings
  dropbox: ['files.content.read', 'files.metadata.read'],
  github: ['repo', 'read:user'],
  qonto: ['offline_access', 'organization.read'],
  slack: [
    'channels:history',
    'channels:read',
    'files:read',
    'groups:history',
    'groups:read',
    'im:history',
    'im:read',
    'mpim:history',
    'mpim:read',
    'search:read',
    'users:read',
    'users:read.email',
  ],
  'outlook-mail': ['Mail.Read', 'User.Read'],
  onedrive: ['Files.Read.All', 'User.Read'],
  figma: [
    'file_content:read',
    'file_metadata:read',
    'current_user:read',
    'projects:read',
  ],
}

/**
 * Groups of providers that share the same OAuth account
 * Providers in the same group can potentially reuse account information
 */
const SHARED_ACCOUNT_GROUPS: AppConnectorProvider[][] = [
  [
    'google-drive',
    'gmail',
    'google-calendar',
    'google-chat',
    'google-meet',
    'google-tasks',
  ], // Google services share account
]

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when token decryption fails
 */
export class TokenDecryptionError extends Error {
  constructor(connectorId: string, cause?: Error) {
    super(
      `Failed to decrypt token for connector '${connectorId}'${cause ? `: ${cause.message}` : ''}`,
    )
    this.name = 'TokenDecryptionError'
    this.cause = cause
  }
}

/**
 * Error thrown when a request fails due to authentication issues
 */
export class AuthenticationError extends Error {
  readonly status: number

  constructor(message: string, status: number = 401) {
    super(message)
    this.name = 'AuthenticationError'
    this.status = status
  }
}

/**
 * Error thrown when required encryption metadata is missing
 */
export class MissingEncryptionMetadataError extends Error {
  constructor(connectorId: string, missingKey: string) {
    super(
      `Missing encryption metadata '${missingKey}' for connector '${connectorId}'`,
    )
    this.name = 'MissingEncryptionMetadataError'
  }
}

// =============================================================================
// Base App Connector Provider
// =============================================================================

/**
 * Base class for OAuth-based app connector providers.
 *
 * Provides common functionality for:
 * - Token management (encryption/decryption)
 * - Authenticated HTTP requests
 * - Error handling for auth failures
 *
 * Providers extending this class must implement all abstract methods
 * for their specific OAuth flow and API interactions.
 *
 * @example
 * ```typescript
 * export class GoogleDriveProvider extends BaseAppConnectorProvider {
 *   readonly id = 'google-drive' as const
 *   readonly config = GOOGLE_DRIVE_CONFIG
 *
 *   getAuthUrl(state: string, codeChallenge: string): string {
 *     // Build Google OAuth URL
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseAppConnectorProvider
  implements AppConnectorProviderInterface
{
  /**
   * Unique identifier for this provider
   */
  abstract readonly id: AppConnectorProvider

  /**
   * Provider configuration including OAuth settings, capabilities, and limits
   */
  abstract readonly config: ConnectorProviderConfig

  // ===========================================================================
  // Token Management Helpers
  // ===========================================================================

  /**
   * Get the decrypted access token for a connector.
   *
   * Retrieves the encrypted token and its encryption metadata (IV, salt)
   * from storage and decrypts it using SecureStorage.
   *
   * @param connector - The connector to get the token for
   * @returns The decrypted access token
   * @throws TokenDecryptionError if decryption fails
   * @throws MissingEncryptionMetadataError if IV or salt is missing
   */
  protected async getDecryptedToken(connector: Connector): Promise<string> {
    if (!connector.encryptedToken) {
      throw new TokenDecryptionError(
        connector.id,
        new Error('No encrypted token found'),
      )
    }

    // Prefer IV from Yjs (synced across devices), fall back to localStorage
    const iv =
      connector.tokenIv ??
      localStorage.getItem(`${CONNECTOR_STORAGE_PREFIX}-${connector.id}-iv`)
    // Salt is empty after migration to non-extractable keys
    const salt =
      localStorage.getItem(
        `${CONNECTOR_STORAGE_PREFIX}-${connector.id}-salt`,
      ) ?? ''

    if (!iv) {
      throw new MissingEncryptionMetadataError(connector.id, 'iv')
    }

    try {
      return await SecureStorage.decryptCredential(
        connector.encryptedToken,
        iv,
        salt,
      )
    } catch (error) {
      throw new TokenDecryptionError(
        connector.id,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  /**
   * Get the decrypted refresh token for a connector.
   *
   * Similar to getDecryptedToken but returns null if no refresh token exists.
   * Uses separate storage keys for refresh token encryption metadata.
   *
   * @param connector - The connector to get the refresh token for
   * @returns The decrypted refresh token, or null if not available
   * @throws TokenDecryptionError if decryption fails (but token exists)
   */
  protected async getDecryptedRefreshToken(
    connector: Connector,
  ): Promise<string | null> {
    if (!connector.encryptedRefreshToken) {
      return null
    }

    // Prefer IV from Yjs, then localStorage with refresh-iv, then shared iv
    const iv =
      connector.refreshTokenIv ??
      localStorage.getItem(
        `${CONNECTOR_STORAGE_PREFIX}-${connector.id}-refresh-iv`,
      ) ??
      connector.tokenIv ??
      localStorage.getItem(`${CONNECTOR_STORAGE_PREFIX}-${connector.id}-iv`)
    // Salt is empty after migration to non-extractable keys
    const salt =
      localStorage.getItem(
        `${CONNECTOR_STORAGE_PREFIX}-${connector.id}-refresh-salt`,
      ) ??
      localStorage.getItem(
        `${CONNECTOR_STORAGE_PREFIX}-${connector.id}-salt`,
      ) ??
      ''

    if (!iv) {
      // If metadata is missing for refresh token, treat it as unavailable
      // rather than throwing an error (refresh tokens are optional)
      return null
    }

    try {
      return await SecureStorage.decryptCredential(
        connector.encryptedRefreshToken,
        iv,
        salt,
      )
    } catch (error) {
      // Treat decryption failure as "no refresh token available" rather than
      // throwing — this allows the caller to fall back gracefully (e.g. ask
      // the user to reconnect) instead of surfacing a cryptic error.
      // This can happen when the CryptoKey was regenerated, the DB was
      // restored from backup, or the token came from another device.
      if (import.meta.env.DEV) {
        console.warn(
          `[ConnectorProvider] Failed to decrypt refresh token for ${connector.id}, treating as unavailable:`,
          error instanceof Error ? error.message : error,
        )
      }
      return null
    }
  }

  // ===========================================================================
  // HTTP Helpers
  // ===========================================================================

  /**
   * Make an authenticated HTTP request to the provider's API.
   *
   * Automatically:
   * - Decrypts and attaches the access token as a Bearer token
   * - Handles 401 errors by attempting token refresh
   * - Retries the request with a refreshed token if refresh succeeds
   * - Shows a warning notification if refresh fails
   *
   * @param connector - The connector to authenticate with
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns The fetch Response
   * @throws AuthenticationError if the request returns 401 and token refresh fails
   * @throws TokenDecryptionError if token decryption fails
   */
  protected async fetchWithAuth(
    connector: Connector,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getDecryptedToken(connector)

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Attempt to refresh the token automatically
      const refreshedConnector = await this.tryRefreshToken(connector)

      if (refreshedConnector) {
        // Retry the request with the new token
        const newToken = await this.getDecryptedToken(refreshedConnector)
        const retryHeaders = new Headers(options.headers)
        retryHeaders.set('Authorization', `Bearer ${newToken}`)

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        })

        if (retryResponse.status === 401) {
          throw new AuthenticationError(
            'Access token expired or invalid even after refresh.',
            401,
          )
        }

        return retryResponse
      }

      // Token refresh failed
      throw new AuthenticationError(
        'Access token expired or invalid. Token refresh failed.',
        401,
      )
    }

    return response
  }

  /**
   * Attempt to refresh an expired access token.
   *
   * If the connector has a refresh token, this will:
   * 1. Call the provider's refreshToken method
   * 2. Encrypt and store the new access token
   * 3. Update the connector in the store
   *
   * If refresh fails, a warning notification is shown.
   *
   * @param connector - The connector with the expired token
   * @returns Updated connector with new token, or null if refresh failed
   */
  private async tryRefreshToken(
    connector: Connector,
  ): Promise<Connector | null> {
    // Check if refresh token is available
    if (!connector.encryptedRefreshToken) {
      console.warn(
        `[ConnectorProvider] No refresh token available for ${connector.provider}`,
      )
      const notifyWarning = await getNotifyWarning()
      notifyWarning({
        title: `${connector.provider}: Token expired`,
        description: 'Your access token has expired. Please reconnect.',
        actionUrl: `/knowledge/connectors#connector/${connector.id}`,
      })
      return null
    }

    try {
      if (import.meta.env.DEV) {
        console.log(
          `[ConnectorProvider] Attempting token refresh for ${connector.provider}`,
        )
      }

      // Refresh the token using the provider's implementation
      const refreshResult = await this.refreshToken(connector)

      // Encrypt the new access token
      await SecureStorage.init()
      const {
        encrypted: encryptedToken,
        iv,
        salt,
      } = await SecureStorage.encryptCredential(refreshResult.accessToken)

      // Calculate new expiry time
      const tokenExpiresAt = refreshResult.expiresIn
        ? new Date(Date.now() + refreshResult.expiresIn * 1000)
        : undefined

      // Build updated connector
      const updatedConnector: Connector = {
        ...connector,
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
        errorMessage: undefined,
      }

      // Store encryption metadata
      storeEncryptionMetadata(connector.id, iv, salt, false)

      // Update the connector in the store
      const store = await getConnectorStore()
      await store.updateConnector(connector.id, {
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
        errorMessage: undefined,
      })

      if (import.meta.env.DEV) {
        console.log(
          `[ConnectorProvider] Token refreshed successfully for ${connector.provider}`,
        )
      }

      return updatedConnector
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(
          `[ConnectorProvider] Failed to refresh token for ${connector.provider}:`,
          error,
        )
      }

      const notifyWarning = await getNotifyWarning()
      notifyWarning({
        title: `${connector.provider}: Token refresh failed`,
        description:
          'Could not refresh your access token. Please reconnect to continue.',
        actionUrl: `/knowledge/connectors#connector/${connector.id}`,
      })

      // Update connector status to expired
      const store = await getConnectorStore()
      await store.updateConnector(connector.id, {
        status: 'expired',
        errorMessage:
          'Access token expired and refresh failed. Please reconnect.',
      })

      return null
    }
  }

  /**
   * Make an authenticated HTTP request and parse the JSON response.
   *
   * Convenience wrapper around fetchWithAuth that handles JSON parsing.
   *
   * @param connector - The connector to authenticate with
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns The parsed JSON response
   * @throws AuthenticationError if the request returns 401
   * @throws Error if JSON parsing fails
   */
  protected async fetchJson<T>(
    connector: Connector,
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')

    const response = await this.fetchWithAuth(connector, url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(
        `HTTP ${response.status}: ${sanitizeErrorMessage(errorText)}`,
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Make an HTTP request with a raw (unencrypted) access token.
   *
   * This is used during the wizard flow when we have a fresh OAuth token
   * that hasn't been stored/encrypted yet.
   *
   * @param token - The raw access token
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns The fetch Response
   * @throws AuthenticationError if the request returns 401
   */
  protected async fetchWithRawToken(
    token: string,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      throw new AuthenticationError('Access token expired or invalid.', 401)
    }

    return response
  }

  /**
   * Make an HTTP request with a raw token and parse the JSON response.
   *
   * @param token - The raw access token
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns The parsed JSON response
   * @throws AuthenticationError if the request returns 401
   * @throws Error if JSON parsing fails
   */
  protected async fetchJsonWithRawToken<T>(
    token: string,
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')

    const response = await this.fetchWithRawToken(token, url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(
        `HTTP ${response.status}: ${sanitizeErrorMessage(errorText)}`,
      )
    }

    return response.json() as Promise<T>
  }

  // ===========================================================================
  // Abstract Methods - Must be implemented by providers
  // ===========================================================================

  /**
   * Generate the OAuth authorization URL for the user to authenticate.
   *
   * @param state - State parameter for CSRF protection
   * @param codeChallenge - PKCE code challenge
   * @returns The full authorization URL to redirect the user to
   */
  abstract getAuthUrl(state: string, codeChallenge: string): string

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param code - The authorization code from the OAuth callback
   * @param codeVerifier - The PKCE code verifier
   * @returns OAuth result containing tokens
   */
  abstract exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<OAuthResult>

  /**
   * Refresh an expired access token using the refresh token.
   *
   * @param connector - The connector with the refresh token
   * @returns New access token and optional expiration
   */
  abstract refreshToken(connector: Connector): Promise<TokenRefreshResult>

  /**
   * Validate that a token is still valid with the provider.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  abstract validateToken(token: string): Promise<boolean>

  /**
   * Revoke all access for a connector (logout/disconnect).
   *
   * @param connector - The connector to revoke access for
   */
  abstract revokeAccess(connector: Connector): Promise<void>

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and email
   */
  abstract getAccountInfo(token: string): Promise<AccountInfo>

  /**
   * List items (files, documents, etc.) from the provider.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   * @returns List of items with pagination info
   */
  abstract list(
    connector: Connector,
    options?: ListOptions,
  ): Promise<ListResult>

  /**
   * List items using a raw (unencrypted) access token.
   *
   * This is used during the wizard flow when we have a fresh OAuth token
   * that hasn't been stored/encrypted yet.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of items with pagination info
   */
  abstract listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult>

  /**
   * Read the content of a specific item.
   *
   * @param connector - The connector to read from
   * @param externalId - The provider's ID for the item
   * @returns The item content and metadata
   */
  abstract read(
    connector: Connector,
    externalId: string,
  ): Promise<ContentResult>

  /**
   * Get changes since a cursor for delta sync.
   *
   * @param connector - The connector to get changes from
   * @param cursor - The cursor from the last sync, or null for initial sync
   * @returns Added, modified, and deleted items with new cursor
   */
  abstract getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult>

  /**
   * Normalize a raw item from the provider's API to a ConnectorItem.
   * Can be async for providers that need to parse content (e.g., email parsing).
   *
   * @param rawItem - The raw item from the provider's API
   * @returns Normalized ConnectorItem (or Promise for async providers)
   */
  abstract normalizeItem(
    rawItem: unknown,
  ): ConnectorItem | Promise<ConnectorItem>

  // ===========================================================================
  // Optional Methods - Can be overridden by providers
  // ===========================================================================

  /**
   * Search for items matching a query.
   * Optional - not all providers support search.
   *
   * @param connector - The connector to search
   * @param query - The search query
   * @returns Matching items
   */
  search?(connector: Connector, query: string): Promise<SearchResult>

  /**
   * Initialize the provider.
   * Called when the provider is first loaded.
   */
  initialize?(): Promise<void>

  /**
   * Dispose of the provider.
   * Called when the provider is being unloaded.
   */
  dispose?(): Promise<void>
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the OAuth scopes required for a provider.
 *
 * Returns the appropriate OAuth scopes needed to authenticate with
 * the specified provider. Different providers have different scope
 * requirements and formats.
 *
 * @param provider - The app connector provider
 * @returns Array of OAuth scope strings
 *
 * @example
 * ```typescript
 * const scopes = getProviderScopes('google-drive')
 * // ['https://www.googleapis.com/auth/drive.readonly']
 *
 * const notionScopes = getProviderScopes('notion')
 * // [] - Notion handles scopes through their OAuth app settings
 * ```
 */
export function getProviderScopes(provider: AppConnectorProvider): string[] {
  return PROVIDER_SCOPES[provider] ?? []
}

/**
 * Check if two providers share the same OAuth account type.
 *
 * Some providers (like Google services) share the same OAuth account,
 * meaning a user authenticated with one service can potentially reuse
 * that authentication for related services.
 *
 * This is useful for:
 * - Linking related connectors to the same account
 * - Suggesting additional services when one is connected
 * - Reducing OAuth prompts for the user
 *
 * @param provider1 - First provider to compare
 * @param provider2 - Second provider to compare
 * @returns True if the providers share the same OAuth account type
 *
 * @example
 * ```typescript
 * sharesSameAccount('google-drive', 'gmail') // true
 * sharesSameAccount('google-drive', 'google-calendar') // true
 * sharesSameAccount('google-drive', 'notion') // false
 * sharesSameAccount('notion', 'dropbox') // false
 * ```
 */
export function sharesSameAccount(
  provider1: AppConnectorProvider,
  provider2: AppConnectorProvider,
): boolean {
  // Same provider trivially shares the same account
  if (provider1 === provider2) {
    return true
  }

  // Check if both providers are in the same shared account group
  return SHARED_ACCOUNT_GROUPS.some(
    (group) => group.includes(provider1) && group.includes(provider2),
  )
}

/**
 * Get all providers that share an account with the given provider.
 *
 * @param provider - The provider to find related providers for
 * @returns Array of providers that share the same OAuth account
 *
 * @example
 * ```typescript
 * getRelatedProviders('google-drive')
 * // ['google-drive', 'gmail', 'google-calendar']
 *
 * getRelatedProviders('notion')
 * // ['notion'] - Notion doesn't share with other providers
 * ```
 */
export function getRelatedProviders(
  provider: AppConnectorProvider,
): AppConnectorProvider[] {
  const group = SHARED_ACCOUNT_GROUPS.find((g) => g.includes(provider))
  return group ? [...group] : [provider]
}

/**
 * Build the localStorage key for connector encryption metadata.
 *
 * @param connectorId - The connector ID
 * @param type - The metadata type ('iv' | 'salt' | 'refresh-iv' | 'refresh-salt')
 * @returns The localStorage key
 */
export function buildConnectorStorageKey(
  connectorId: string,
  type: 'iv' | 'salt' | 'refresh-iv' | 'refresh-salt',
): string {
  return `${CONNECTOR_STORAGE_PREFIX}-${connectorId}-${type}`
}

/**
 * Store encryption metadata for a connector's token.
 * Writes IVs to both the Yjs connector object (for cross-device sync)
 * and localStorage (for backward compatibility).
 *
 * @param connectorId - The connector ID
 * @param iv - The initialization vector (base64)
 * @param salt - The salt (base64)
 * @param isRefreshToken - Whether this is for the refresh token
 */
export function storeEncryptionMetadata(
  connectorId: string,
  iv: string,
  salt: string,
  isRefreshToken = false,
): void {
  const prefix = isRefreshToken ? 'refresh-' : ''

  // Write to localStorage (backward compat)
  localStorage.setItem(
    buildConnectorStorageKey(connectorId, `${prefix}iv` as 'iv' | 'refresh-iv'),
    iv,
  )
  localStorage.setItem(
    buildConnectorStorageKey(
      connectorId,
      `${prefix}salt` as 'salt' | 'refresh-salt',
    ),
    salt,
  )

  // Also write IV to the Yjs connector object for cross-device sync (GAP-4)
  try {
    // Lazy import to avoid circular dependency
    import('@/lib/yjs/maps')
      .then(({ connectors: connectorsYjsMap }) => {
        const existing = connectorsYjsMap.get(connectorId)
        if (existing) {
          const ivField = isRefreshToken ? 'refreshTokenIv' : 'tokenIv'
          connectorsYjsMap.set(connectorId, {
            ...existing,
            [ivField]: iv,
          })
        }
      })
      .catch(() => {
        // Yjs map might not be initialized yet during migration
      })
  } catch {
    // Non-critical — localStorage still has the IV
  }
}

/**
 * Clear all encryption metadata for a connector.
 *
 * @param connectorId - The connector ID
 */
export function clearEncryptionMetadata(connectorId: string): void {
  localStorage.removeItem(buildConnectorStorageKey(connectorId, 'iv'))
  localStorage.removeItem(buildConnectorStorageKey(connectorId, 'salt'))
  localStorage.removeItem(buildConnectorStorageKey(connectorId, 'refresh-iv'))
  localStorage.removeItem(buildConnectorStorageKey(connectorId, 'refresh-salt'))
}
