/**
 * @module features/auth
 *
 * DEVS Teams Authentication — Public API
 *
 * Provides OAuth2 PKCE authentication for Teams mode.
 * Only activated when `window.__DEVS_TEAMS__` is present.
 *
 * ## Components should use the hooks:
 *
 * ```tsx
 * import { useTeamsAuth, useTeamsUser } from '@/features/auth'
 *
 * function Header() {
 *   const { isAuthenticated, login, logout } = useTeamsAuth()
 *   const user = useTeamsUser()
 *
 *   if (!isAuthenticated) return <button onClick={login}>Login</button>
 *   return <span>{user?.name}</span>
 * }
 * ```
 *
 * ## Non-React code should use the service directly:
 *
 * ```ts
 * import { authService } from '@/features/auth'
 *
 * const token = await authService.getAccessToken()
 * ```
 */

// Service
export { authService } from './auth-service'

// Types
export type {
  TeamsUser,
  TeamsTokenSet,
  TeamsAuthState,
} from './types'

// PKCE utilities (exported for testing)
export {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  base64UrlEncode,
} from './pkce'

// OIDC utilities
export {
  discoverOIDC,
  exchangeCodeForTokens,
  refreshAccessToken,
  parseIdToken,
  clearDiscoveryCache,
} from './oidc'
export type { OIDCDiscoveryDocument } from './oidc'

// React hooks
export { useTeamsAuth, useTeamsUser, useIsAdmin } from './hooks'

// Components
export { PresenceBar } from './components/PresenceBar'
export { SharedRunStatus } from './components/SharedRunStatus'
export { ApprovalGatePanel } from './components/ApprovalGatePanel'

// Admin dashboard (lazy-loaded)
export const AdminDashboardPage = () =>
  import('./pages/AdminDashboardPage').then((m) => m.AdminDashboardPage)
