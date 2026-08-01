/**
 * @module features/auth/types
 *
 * Type definitions for the Teams authentication module.
 */

/**
 * User identity extracted from the OIDC ID token.
 */
export interface TeamsUser {
  /** Subject claim — unique user identifier from the IdP */
  id: string
  /** User's email address */
  email: string
  /** Display name */
  name: string
  /** Role within the org: admin or member */
  role: 'admin' | 'member'
  /** Profile picture URL (optional) */
  avatar?: string
}

/**
 * Token set returned from the OAuth2 PKCE flow.
 */
export interface TeamsTokenSet {
  /** OAuth2 access token — attached to all server requests */
  accessToken: string
  /** OIDC ID token — contains user claims */
  idToken: string
  /** OAuth2 refresh token — used to silently renew access token */
  refreshToken?: string
  /** Access token expiry timestamp (ms since epoch) */
  expiresAt: number
}

/**
 * Auth state exposed by the auth store.
 */
export interface TeamsAuthState {
  /** Whether the user has a valid authenticated session */
  isAuthenticated: boolean
  /** Whether an auth operation is in progress */
  isLoading: boolean
  /** The authenticated user, or null if not logged in */
  user: TeamsUser | null
  /** Current token set (kept in memory — never persisted to storage) */
  tokens: TeamsTokenSet | null
  /** Error from the last auth operation */
  error: string | null
}
