/**
 * @module lib/teams/config
 *
 * DEVS Teams Configuration
 *
 * Reads the Teams configuration injected by the Cloudflare Edge Worker
 * at `window.__DEVS_TEAMS__`. When present, it indicates the user is
 * accessing DEVS through an Enterprise subdomain (e.g. `acme.devs.new`).
 *
 * The config is synchronously available at boot — no fetch needed.
 *
 * ## What's in the config
 *
 * - **org**: Organization identity (id, name, logo)
 * - **auth**: OIDC provider settings for SSO login
 * - **server**: URL of the customer's `devs-teams` server node
 * - **llm**: LLM proxy URL and allowlists for Enterprise spaces
 *
 * ## Nothing secret here
 *
 * The OIDC client ID is public by design (PKCE flow). Server and proxy
 * URLs are internal — they won't resolve outside the corporate network.
 *
 * @example
 * ```ts
 * import { teamsConfig, isTeams } from '@/lib/teams/config'
 *
 * if (isTeams) {
 *   console.log(`Welcome to ${teamsConfig!.org.name}`)
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Organization identity injected by the Edge Worker.
 */
export interface TeamsOrgConfig {
  /** Unique org slug (e.g. "acme") — matches the subdomain */
  id: string
  /** Display name (e.g. "Acme Corporation") */
  name: string
  /** Optional logo URL for branding */
  logo?: string
}

/**
 * OIDC provider configuration for SSO authentication.
 * Used with the OAuth2 PKCE flow — no client secret needed.
 */
export interface TeamsAuthConfig {
  /** OIDC issuer URL (e.g. "https://acme.okta.com") */
  issuer: string
  /** OAuth2 client ID (public, registered in the IdP) */
  clientId: string
  /** OAuth2 scopes to request (defaults to ["openid", "profile", "email"]) */
  scopes?: string[]
}

/**
 * Server connection settings for the customer's `devs-teams` node.
 * All server paths are derived from this base URL.
 */
export interface TeamsServerConfig {
  /** Base URL of the devs-teams server (e.g. "https://devs.internal.acme.com:4444") */
  url: string
}

/**
 * LLM proxy settings for Enterprise spaces.
 * The proxy holds real API keys — the client never sees them.
 */
export interface TeamsLLMConfig {
  /** URL of the customer's LLM proxy (e.g. LiteLLM, Azure API Mgmt) */
  proxyUrl: string
  /** Strict allowlist of providers shown in Enterprise spaces */
  allowedProviders: string[]
  /** Optional strict allowlist of model IDs shown in Enterprise spaces */
  allowedModels?: string[]
  /** Default provider for Enterprise spaces */
  defaultProvider: string
  /** Default model for Enterprise spaces */
  defaultModel: string
}

/**
 * Full Teams configuration injected at `window.__DEVS_TEAMS__`.
 */
export interface DevsTeamsConfig {
  org: TeamsOrgConfig
  auth: TeamsAuthConfig
  server: TeamsServerConfig
  llm: TeamsLLMConfig
}

// ============================================================================
// Global augmentation
// ============================================================================

declare global {
  interface Window {
    __DEVS_TEAMS__?: DevsTeamsConfig
  }
}

// ============================================================================
// Runtime reader
// ============================================================================

/**
 * The Teams configuration, or `null` if running in Free tier (no injection).
 *
 * Read synchronously at module load — the Edge Worker injects a `<script>`
 * tag before the app bundle, so it's always available by the time this runs.
 */
export const teamsConfig: DevsTeamsConfig | null =
  typeof window !== 'undefined' ? (window.__DEVS_TEAMS__ ?? null) : null

/**
 * Whether this DEVS instance is running in Teams mode.
 *
 * `true` when `window.__DEVS_TEAMS__` was injected (i.e. user is on
 * `acme.devs.new`), `false` when running vanilla `devs.new`.
 */
export const isTeams: boolean = teamsConfig !== null

// ============================================================================
// Derived URLs
// ============================================================================

/**
 * Build a full URL to the devs-teams server for a given path.
 *
 * @param path - The path segment (e.g. "/api/spaces", "/sync/room")
 * @returns Full URL or `null` if not in Teams mode
 *
 * @example
 * ```ts
 * const url = getServerUrl('/api/spaces')
 * // => "https://devs.internal.acme.com:4444/api/spaces"
 * ```
 */
export function getServerUrl(path: string): string | null {
  if (!teamsConfig) return null
  const base = teamsConfig.server.url.replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

/**
 * Build the Auth endpoint URL.
 *
 * @param path - Auth sub-path (e.g. "/callback", "/logout")
 */
export function getAuthUrl(path: string): string | null {
  return getServerUrl(`/auth${path.startsWith('/') ? path : `/${path}`}`)
}

/**
 * Build the API endpoint URL.
 *
 * @param path - API sub-path (e.g. "/spaces", "/spaces/123/agents")
 */
export function getApiUrl(path: string): string | null {
  return getServerUrl(`/api${path.startsWith('/') ? path : `/${path}`}`)
}

/**
 * Build the Sync (WebSocket) endpoint URL.
 *
 * @param path - Sync sub-path (e.g. "/room-name")
 */
export function getSyncUrl(path: string): string | null {
  const url = getServerUrl(`/sync${path.startsWith('/') ? path : `/${path}`}`)
  if (!url) return null
  // Convert http(s) to ws(s)
  return url.replace(/^http/, 'ws')
}
