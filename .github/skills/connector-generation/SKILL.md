---
name: connector-generation
description: Guide for creating new external service connectors in DEVS. Use this when asked to add a new OAuth app connector, API connector, or integration with external services like Slack, Trello, Linear, Asana, Dropbox, GitHub, etc.
---

# Connector Generation for DEVS

When creating new connectors for external services in DEVS, follow this comprehensive guide covering OAuth flow, provider implementation, registration, bridge proxy setup, and UI integration.

## Overview

DEVS connectors enable synchronizing content from external services into the Knowledge Base. The architecture consists of:

1. **Provider Implementation** - OAuth + API integration in `src/features/connectors/providers/apps/`
2. **Provider Registry** - Lazy loading registration in `provider-registry.ts`
3. **OAuth Gateway** - OAuth config for popup-based auth flow
4. **Bridge Server** - Server-side proxy for OAuth secrets and CORS (in `utils/devs-bridge/`)
5. **UI Configuration** - Icons and display metadata

## Step 1: Define Provider Type

Add the new provider to the type union in `src/features/connectors/types.ts`:

```typescript
// In types.ts
export type AppConnectorProvider =
  | 'google-drive'
  | 'gmail'
  | 'google-calendar'
  | 'google-meet'
  | 'google-tasks'
  | 'notion'
  | 'dropbox'
  | 'github'
  | 'qonto'
  | 'slack' // <-- Add new provider
```

Also add the config entry in `APP_CONNECTOR_CONFIGS`:

```typescript
// In types.ts - APP_CONNECTOR_CONFIGS
slack: {
  id: 'slack',
  category: 'app',
  name: 'Slack',
  icon: 'slack',
  color: '#4A154B',
  capabilities: ['read', 'search'],
  supportedTypes: ['message', 'channel', 'file'],
  maxFileSize: 10 * 1024 * 1024,
  rateLimit: { requests: 50, windowSeconds: 60 },
},
```

## Step 2: Create Provider Implementation

Create a new file `src/features/connectors/providers/apps/{provider}.ts`:

```typescript
/**
 * {Provider} Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for {Provider}.
 * Supports listing, reading, searching content, and delta sync.
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

/** API base URL - use gateway proxy to avoid CORS and keep secrets safe */
const API_BASE = `${BRIDGE_URL}/api/{provider}`

/** OAuth endpoints */
const AUTH_URL = 'https://{provider}.com/oauth/authorize'
const TOKEN_URL = 'https://{provider}.com/oauth/token'
const REVOKE_URL = 'https://{provider}.com/oauth/revoke'
const USERINFO_URL = 'https://{provider}.com/api/users/me'

// =============================================================================
// Types
// =============================================================================

// Define types for API responses (raw JSON from the provider's API)
interface RawItem {
  id: string
  name: string
  // ... provider-specific fields
}

interface ListResponse {
  items: RawItem[]
  next_cursor?: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope: string
  token_type: string
}

interface UserInfoResponse {
  id: string
  email?: string
  name?: string
  avatar?: string
}

// =============================================================================
// Provider Implementation
// =============================================================================

export class {Provider}Provider extends BaseAppConnectorProvider {
  readonly id = '{provider-id}' as const

  readonly config: ConnectorProviderConfig = {
    id: '{provider-id}',
    category: 'app',
    name: '{Provider Name}',
    icon: '{provider-icon}',
    color: '#HEXCOLOR',
    capabilities: ['read', 'search'],
    supportedTypes: ['*'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 100, windowSeconds: 60 },
  }

  /** Get the OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_{PROVIDER}_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the OAuth authorization URL.
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
      scope: 'read:user read:content', // Provider-specific scopes
      state,
      // Include PKCE if provider supports it
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `${AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * NOTE: Token exchange should go through BRIDGE_URL to inject client_secret
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult> {
    const response = await fetch(`${BRIDGE_URL}/api/{provider}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        // client_id and client_secret injected by bridge server
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: TokenResponse = await response.json()

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
   */
  async refreshToken(connector: Connector): Promise<TokenRefreshResult> {
    const refreshToken = await this.getDecryptedRefreshToken(connector)
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${BRIDGE_URL}/api/{provider}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        // client_id and client_secret injected by bridge server
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: TokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid.
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   */
  async revokeAccess(connector: Connector): Promise<void> {
    const token = await this.getDecryptedToken(connector)

    const response = await fetch(REVOKE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token revocation failed: ${response.status} ${errorText}`)
    }
  }

  /**
   * Get account information for the authenticated user.
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get account info: ${response.status} ${errorText}`)
    }

    const data: UserInfoResponse = await response.json()

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.avatar,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List items from the provider.
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams({
      limit: String(options?.pageSize ?? 100),
    })
    if (options?.cursor) {
      params.set('cursor', options.cursor)
    }

    const url = `${API_BASE}/items?${params.toString()}`
    const data = await this.fetchJson<ListResponse>(connector, url)

    return {
      items: data.items.map((item) => this.normalizeItem(item)),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    }
  }

  /**
   * List items using a raw access token (wizard flow).
   */
  async listWithToken(token: string, options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams({
      limit: String(options?.pageSize ?? 100),
    })
    if (options?.cursor) {
      params.set('cursor', options.cursor)
    }

    const url = `${API_BASE}/items?${params.toString()}`
    const data = await this.fetchJsonWithRawToken<ListResponse>(token, url)

    return {
      items: data.items.map((item) => this.normalizeItem(item)),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    }
  }

  /**
   * Read the content of a specific item.
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    const url = `${API_BASE}/items/${encodeURIComponent(externalId)}/content`
    const response = await this.fetchWithAuth(connector, url)

    const content = await response.text()
    const mimeType = response.headers.get('content-type') || 'text/plain'

    return { content, mimeType }
  }

  /**
   * Search for items.
   */
  async search(connector: Connector, query: string): Promise<SearchResult> {
    const url = `${API_BASE}/search?q=${encodeURIComponent(query)}`
    const data = await this.fetchJson<ListResponse>(connector, url)

    return {
      items: data.items.map((item) => this.normalizeItem(item)),
      totalCount: data.items.length,
    }
  }

  /**
   * Get changes since last sync (delta sync).
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const params = new URLSearchParams()
    if (cursor) {
      params.set('cursor', cursor)
    }

    const url = `${API_BASE}/changes?${params.toString()}`
    const response = await this.fetchWithAuth(connector, url)

    if (!response.ok) {
      // If delta sync not supported, fallback to full list
      const list = await this.list(connector)
      return {
        added: list.items,
        modified: [],
        deleted: [],
        newCursor: '',
        hasMore: list.hasMore,
      }
    }

    const data = await response.json()
    return {
      added: (data.added || []).map((item: RawItem) => this.normalizeItem(item)),
      modified: (data.modified || []).map((item: RawItem) => this.normalizeItem(item)),
      deleted: data.deleted || [],
      newCursor: data.cursor || '',
      hasMore: data.has_more || false,
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a raw API item to ConnectorItem format.
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as RawItem

    return {
      externalId: item.id,
      name: item.name,
      type: 'file', // or 'folder'
      mimeType: 'text/plain',
      path: `/${item.name}`,
      lastModified: new Date(),
      // Add provider-specific fields
    }
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new {Provider}Provider()
```

## Step 3: Register Provider

### 3a. Add to Provider Registry

In `src/features/connectors/provider-registry.ts`, add the lazy loader:

```typescript
// In initializeDefaults()
static initializeDefaults(): void {
  // ... existing providers
  this.register('{provider-id}', () => import('./providers/apps/{provider}'))
}

// Update APP_PROVIDERS list
const APP_PROVIDERS: readonly AppConnectorProvider[] = [
  'google-drive',
  'gmail',
  'google-calendar',
  'google-tasks',
  'notion',
  'qonto',
  '{provider-id}',  // <-- Add here
] as const
```

### 3b. Add to Provider Index

In `src/features/connectors/providers/apps/index.ts`:

```typescript
// Add to PROVIDER_CONFIG
'{provider-id}': {
  name: '{Provider Name}',
  icon: '{IconName}', // Must exist in Icon component
  color: '#HEXCOLOR',
  description: 'Sync content from {Provider}',
  syncSupported: true,
},

// Add to AVAILABLE_PROVIDERS
export const AVAILABLE_PROVIDERS: AppConnectorProvider[] = [
  // ... existing
  '{provider-id}',
]

// Add lazy export
export const {provider} = () => import('./{provider}')
```

## Step 4: Configure OAuth Gateway

In `src/features/connectors/oauth-gateway.ts`, add OAuth config:

```typescript
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  // ... existing configs

  '{provider-id}': {
    authUrl: 'https://{provider}.com/oauth/authorize',
    tokenUrl: `${BRIDGE_URL}/api/{provider}/oauth/token`,
    clientId: import.meta.env.VITE_{PROVIDER}_CLIENT_ID || '',
    clientSecret: '', // Handled server-side by bridge
    scopes: [
      'read:user',
      'read:content',
      // ... provider-specific scopes
    ],
    pkceRequired: true, // Set to false if provider doesn't support PKCE
    useBasicAuth: false, // Set to true if provider requires Basic auth for token exchange
  },
}
```

## Step 5: Add Provider Scopes

In `src/features/connectors/connector-provider.ts`, add scopes:

```typescript
const PROVIDER_SCOPES: Record<AppConnectorProvider, string[]> = {
  // ... existing
  '{provider-id}': ['read:user', 'read:content'],
}
```

## Step 6: Configure Bridge Server (Production)

Add proxy route to `utils/devs-bridge/server.mjs`:

```javascript
// Add environment variables at top
const {PROVIDER}_CLIENT_ID = process.env.{PROVIDER}_CLIENT_ID || ''
const {PROVIDER}_CLIENT_SECRET = process.env.{PROVIDER}_CLIENT_SECRET || ''

// Add route handler in handleHttpRequest()
if (path.startsWith('/api/{provider}/')) {
  const {provider}Path = path.replace('/api/{provider}/', '')

  // OAuth token endpoint - inject credentials
  if ({provider}Path.startsWith('oauth/token')) {
    logger.info('{Provider} OAuth token request (injecting credentials)')

    // Read request body
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const originalBody = Buffer.concat(chunks).toString()
    const params = new URLSearchParams(originalBody)

    // Inject client credentials
    params.set('client_id', {PROVIDER}_CLIENT_ID)
    params.set('client_secret', {PROVIDER}_CLIENT_SECRET)

    try {
      const response = await fetch('https://{provider}.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const responseBody = await response.text()
      res.writeHead(response.status, {
        ...CORS_HEADERS,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      })
      res.end(responseBody)
      return
    } catch (err) {
      logger.error(`{Provider} proxy error: ${err.message}`)
      res.writeHead(502, CORS_HEADERS)
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
      return
    }
  }

  // API endpoints - pass through with auth header
  const targetUrl = `https://api.{provider}.com/v1/${{provider}Path}${url.search}`
  return proxyRequest(req, res, targetUrl)
}
```

Update `utils/devs-bridge/.env.example`:

```env
# {Provider} OAuth
{PROVIDER}_CLIENT_ID=
{PROVIDER}_CLIENT_SECRET=
```

## Step 7: Configure Vite Dev Proxy (Development)

In `vite.config.ts`, add dev proxy:

```typescript
server: {
  proxy: {
    // ... existing proxies

    // Proxy {Provider} OAuth token requests
    '/api/{provider}/oauth': {
      target: 'https://{provider}.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/{provider}\/oauth/, '/oauth'),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          // For OAuth token endpoint, inject credentials
          if (req.url?.includes('/token')) {
            const clientId = env.VITE_{PROVIDER}_CLIENT_ID || ''
            const clientSecret = env.VITE_{PROVIDER}_CLIENT_SECRET || ''
            // Inject into body or headers as needed by provider
          }
        })
      },
    },
    // Proxy {Provider} API requests
    '/api/{provider}': {
      target: 'https://api.{provider}.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/{provider}/, '/v1'),
    },
  },
}
```

## Step 8: Add Icon

Add the provider icon to `src/components/Icon.tsx`:

```typescript
// Import or define SVG
import { {Provider}Icon } from './icons/{provider}'

// Add to ICONS map
export const ICONS: Record<IconName, ComponentType<IconProps>> = {
  // ... existing
  {Provider}: {Provider}Icon,
}

// Add to IconName type (if not auto-derived)
export type IconName =
  | // ... existing
  | '{Provider}'
```

## Step 9: Add Environment Variables

Create or update `.env.local`:

```env
VITE_{PROVIDER}_CLIENT_ID=your_client_id_here
VITE_{PROVIDER}_CLIENT_SECRET=your_client_secret_here
```

## Step 10: Add Normalizer Mappings (if needed)

If the provider has custom MIME types, add to `src/features/connectors/normalizer.ts`:

```typescript
export const PROVIDER_FILE_TYPES: Record<
  AppConnectorProvider,
  Record<string, 'document' | 'image' | 'text'>
> = {
  // ... existing
  '{provider-id}': {
    'application/vnd.{provider}.document': 'document',
    'application/vnd.{provider}.message': 'text',
  },
}
```

## Provider-Specific Considerations

### No PKCE Support

If the provider doesn't support PKCE (like Notion):

```typescript
getAuthUrl(state: string, _codeChallenge: string): string {
  // Don't include code_challenge params
  const params = new URLSearchParams({
    client_id: this.clientId,
    redirect_uri: this.redirectUri,
    response_type: 'code',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}
```

### Basic Auth for Token Exchange (like Notion)

If the provider requires Basic auth:

```typescript
async exchangeCode(code: string, _codeVerifier: string): Promise<OAuthResult> {
  const basicAuth = btoa(`${this.clientId}:${this.clientSecret}`)

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    }),
  })
  // ...
}
```

### Non-Expiring Tokens (like Notion)

If tokens don't expire:

```typescript
async refreshToken(_connector: Connector): Promise<TokenRefreshResult> {
  throw new Error('{Provider} tokens do not expire. Re-authenticate if needed.')
}
```

### Custom Headers

If the provider requires custom headers (like Notion-Version):

```typescript
protected override async fetchWithAuth(
  connector: Connector,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await this.getDecryptedToken(connector)

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('{Provider}-Version', '2024-01-01') // API version header

  return fetch(url, { ...options, headers })
}
```

## File Checklist

When adding a new connector, ensure you've modified:

- [ ] `src/features/connectors/types.ts` - Add provider type and config
- [ ] `src/features/connectors/providers/apps/{provider}.ts` - Create provider class
- [ ] `src/features/connectors/providers/apps/index.ts` - Add UI config and export
- [ ] `src/features/connectors/provider-registry.ts` - Register lazy loader
- [ ] `src/features/connectors/oauth-gateway.ts` - Add OAuth config
- [ ] `src/features/connectors/connector-provider.ts` - Add scopes
- [ ] `src/features/connectors/normalizer.ts` - Add file type mappings (if needed)
- [ ] `utils/devs-bridge/server.mjs` - Add proxy route (production)
- [ ] `utils/devs-bridge/.env.example` - Document env vars
- [ ] `vite.config.ts` - Add dev proxy (development)
- [ ] `src/components/Icon.tsx` - Add provider icon
- [ ] `.env.local` - Add OAuth credentials (local dev)

## Testing

Test the new connector:

1. Start dev server: `npm run dev`
2. Go to Connectors page: `/connectors`
3. Click "Add Connector" and select the new provider
4. Complete OAuth flow
5. Verify content listing works
6. Test sync functionality

## Common Issues

1. **CORS errors**: Ensure bridge proxy is configured correctly
2. **OAuth callback fails**: Verify redirect_uri matches exactly in provider's OAuth app settings
3. **Token exchange fails**: Check client credentials are correctly injected
4. **API requests fail**: Verify API base URL and authentication header format
