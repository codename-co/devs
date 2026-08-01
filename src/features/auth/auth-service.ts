/**
 * @module features/auth/auth-service
 *
 * Teams Authentication Service
 *
 * Orchestrates the OAuth2 PKCE login flow, token lifecycle, and session
 * management. Only activated when `isTeams === true`.
 *
 * ## Design principles
 *
 * - Auth is a **thin gateway layer**, not deeply woven into the client.
 * - Auth only gates **network services** (proxy, sync, API).
 * - Local data is always accessible regardless of auth state.
 * - Tokens are kept in **memory only** (access) — never in localStorage.
 * - Token refresh is automatic and transparent.
 */

import { teamsConfig, isTeams } from '@/lib/teams/config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce'
import {
  discoverOIDC,
  exchangeCodeForTokens,
  refreshAccessToken,
  parseIdToken,
  type OIDCDiscoveryDocument,
} from './oidc'
import type { TeamsAuthState, TeamsTokenSet, TeamsUser } from './types'

// ============================================================================
// Session storage keys (for PKCE flow state across redirect)
// ============================================================================

const STORAGE_KEY_VERIFIER = 'devs_teams_pkce_verifier'
const STORAGE_KEY_STATE = 'devs_teams_pkce_state'
const STORAGE_KEY_REDIRECT = 'devs_teams_redirect_uri'
const STORAGE_KEY_SESSION = 'devs_teams_session'

// ============================================================================
// Token refresh buffer — refresh 5 minutes before expiry
// ============================================================================

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

// Minimum delay between refresh attempts to prevent tight loops when
// the IdP returns short-lived tokens (expires_in ≤ TOKEN_REFRESH_BUFFER_MS).
const MIN_REFRESH_INTERVAL_MS = 30 * 1000

// ============================================================================
// Auth Service
// ============================================================================

type AuthStateListener = (state: TeamsAuthState) => void

/**
 * Singleton authentication service for DEVS Teams.
 *
 * Manages the full OAuth2 PKCE lifecycle:
 * - Login (redirect to IdP)
 * - Callback (exchange code for tokens)
 * - Token refresh (automatic, transparent)
 * - Logout (clear session, revoke tokens)
 *
 * Exposes reactive state via `subscribe()` for UI integration.
 */
class AuthService {
  private state: TeamsAuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    tokens: null,
    error: null,
  }

  private listeners = new Set<AuthStateListener>()
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private discoveryDoc: OIDCDiscoveryDocument | null = null

  constructor() {
    // Restore session from sessionStorage (survives MPA page navigations)
    this.restoreSession()
  }

  /**
   * Restore a previously saved session from sessionStorage.
   * This is needed because the MPA setup serves different HTML files
   * for different language paths, causing full page reloads that
   * re-instantiate all JS modules.
   */
  private restoreSession(): void {
    if (!isTeams) return
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_SESSION)
      if (!raw) return
      const saved = JSON.parse(raw) as { tokens: TeamsTokenSet; user: TeamsUser }
      if (!saved.tokens || !saved.user) return

      // Check if the access token is still valid (not expired)
      if (saved.tokens.expiresAt <= Date.now()) {
        sessionStorage.removeItem(STORAGE_KEY_SESSION)
        return
      }

      this.state = {
        isAuthenticated: true,
        isLoading: false,
        user: saved.user,
        tokens: saved.tokens,
        error: null,
      }

      // Schedule token refresh
      this.scheduleRefresh(saved.tokens.expiresAt)
    } catch {
      sessionStorage.removeItem(STORAGE_KEY_SESSION)
    }
  }

  // --------------------------------------------------------------------------
  // State management
  // --------------------------------------------------------------------------

  /** Get current auth state snapshot (must be referentially stable for useSyncExternalStore) */
  getState(): TeamsAuthState {
    return this.state
  }

  /** Subscribe to auth state changes. Returns unsubscribe function. */
  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(partial: Partial<TeamsAuthState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach((l) => l(this.state))
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** User's sub claim from JWT */
  getUserId(): string | null {
    return this.state.user?.id ?? null
  }

  /** Email from ID token */
  getUserEmail(): string | null {
    return this.state.user?.email ?? null
  }

  /** Display name from ID token */
  getUserName(): string | null {
    return this.state.user?.name ?? null
  }

  /** 'admin' | 'member' — from IdP group claim */
  getUserRole(): 'admin' | 'member' | null {
    return this.state.user?.role ?? null
  }

  /** Profile picture URL from ID token */
  getUserAvatar(): string | null {
    return this.state.user?.avatar ?? null
  }

  /** Current valid access token (auto-refreshes if needed) */
  async getAccessToken(): Promise<string | null> {
    if (!this.state.tokens) return null

    // If token is about to expire, refresh proactively
    if (this.state.tokens.expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS) {
      await this.refresh()
    }

    return this.state.tokens?.accessToken ?? null
  }

  /** Whether the user has a valid session */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  // --------------------------------------------------------------------------
  // Login flow
  // --------------------------------------------------------------------------

  /**
   * Initiate the OAuth2 PKCE authorization flow.
   *
   * Redirects the user to the IdP's authorization endpoint. After
   * authentication, the IdP redirects back to the app where
   * `handleCallback()` completes the flow.
   */
  async login(): Promise<void> {
    if (!isTeams || !teamsConfig) {
      throw new Error('Teams mode is not active')
    }

    this.setState({ isLoading: true, error: null })

    try {
      // Discover OIDC endpoints
      this.discoveryDoc = await discoverOIDC(teamsConfig.auth.issuer)

      // Generate PKCE values
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const state = generateState()

      // Store PKCE verifier and state for callback verification
      const redirectUri = `${window.location.origin}/auth/callback`
      sessionStorage.setItem(STORAGE_KEY_VERIFIER, codeVerifier)
      sessionStorage.setItem(STORAGE_KEY_STATE, state)
      sessionStorage.setItem(STORAGE_KEY_REDIRECT, redirectUri)

      // Build authorization URL
      const scopes = teamsConfig.auth.scopes ?? ['openid', 'profile', 'email']
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: teamsConfig.auth.clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      })

      const authUrl = `${this.discoveryDoc.authorization_endpoint}?${params}`

      // Redirect to IdP
      window.location.href = authUrl
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      })
    }
  }

  /**
   * Handle the OAuth2 callback after the user authenticates with the IdP.
   *
   * Called on the `/auth/callback` route. Exchanges the authorization code
   * for tokens and establishes the session.
   *
   * @param searchParams - The URL search params from the callback redirect
   */
  async handleCallback(searchParams: URLSearchParams): Promise<void> {
    if (!isTeams || !teamsConfig) {
      throw new Error('Teams mode is not active')
    }

    this.setState({ isLoading: true, error: null })

    try {
      // Verify state parameter (CSRF protection)
      const returnedState = searchParams.get('state')
      const storedState = sessionStorage.getItem(STORAGE_KEY_STATE)

      if (!returnedState || returnedState !== storedState) {
        throw new Error('Invalid state parameter — possible CSRF attack')
      }

      // Check for error response from IdP
      const errorParam = searchParams.get('error')
      if (errorParam) {
        const errorDesc =
          searchParams.get('error_description') ?? 'Unknown error'
        throw new Error(`IdP error: ${errorParam} — ${errorDesc}`)
      }

      // Get authorization code
      const code = searchParams.get('code')
      if (!code) {
        throw new Error('No authorization code in callback')
      }

      // Get stored PKCE verifier
      const codeVerifier = sessionStorage.getItem(STORAGE_KEY_VERIFIER)
      if (!codeVerifier) {
        throw new Error('No PKCE verifier found — session may have expired')
      }

      const redirectUri =
        sessionStorage.getItem(STORAGE_KEY_REDIRECT) ??
        `${window.location.origin}/auth/callback`

      // Discover OIDC endpoints if not cached
      if (!this.discoveryDoc) {
        this.discoveryDoc = await discoverOIDC(teamsConfig.auth.issuer)
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(
        this.discoveryDoc.token_endpoint,
        code,
        codeVerifier,
        teamsConfig.auth.clientId,
        redirectUri,
      )

      // Parse user from ID token
      const user = parseIdToken(tokens.idToken)

      // Clean up PKCE storage
      sessionStorage.removeItem(STORAGE_KEY_VERIFIER)
      sessionStorage.removeItem(STORAGE_KEY_STATE)
      sessionStorage.removeItem(STORAGE_KEY_REDIRECT)

      // Establish session
      this.setSession(tokens, user)
    } catch (error) {
      this.setState({
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Callback failed',
      })
    }
  }

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------

  /**
   * Clear the session and disconnect sync.
   *
   * Optionally performs RP-initiated logout if the IdP supports it.
   */
  async logout(): Promise<void> {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    const idToken = this.state.tokens?.idToken

    // Reset state
    this.setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    })

    // Clear persisted session
    sessionStorage.removeItem(STORAGE_KEY_SESSION)

    // RP-initiated logout (if supported by IdP)
    if (
      isTeams &&
      teamsConfig &&
      this.discoveryDoc?.end_session_endpoint &&
      idToken
    ) {
      const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: window.location.origin,
      })
      window.location.href = `${this.discoveryDoc.end_session_endpoint}?${params}`
    }
  }

  // --------------------------------------------------------------------------
  // Token refresh
  // --------------------------------------------------------------------------

  /**
   * Refresh the access token using the refresh token.
   * Called automatically before token expiry.
   */
  private async refresh(): Promise<void> {
    if (!isTeams || !teamsConfig || !this.state.tokens?.refreshToken) return

    try {
      if (!this.discoveryDoc) {
        this.discoveryDoc = await discoverOIDC(teamsConfig.auth.issuer)
      }

      const newTokens = await refreshAccessToken(
        this.discoveryDoc.token_endpoint,
        this.state.tokens.refreshToken,
        teamsConfig.auth.clientId,
      )

      const user = parseIdToken(newTokens.idToken)
      this.setSession(newTokens, user)
    } catch (error) {
      // Token refresh failed — session expired
      console.warn('[auth] Token refresh failed:', error)
      sessionStorage.removeItem(STORAGE_KEY_SESSION)
      this.setState({
        isAuthenticated: false,
        tokens: null,
        error: 'Session expired. Please log in again.',
      })
    }
  }

  // --------------------------------------------------------------------------
  // Session management
  // --------------------------------------------------------------------------

  private setSession(tokens: TeamsTokenSet, user: TeamsUser): void {
    this.setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      tokens,
      error: null,
    })

    // Persist to sessionStorage (survives MPA page navigations)
    try {
      sessionStorage.setItem(
        STORAGE_KEY_SESSION,
        JSON.stringify({ tokens, user }),
      )
    } catch {
      // Non-critical — session just won't survive page reloads
    }

    // Schedule token refresh
    this.scheduleRefresh(tokens.expiresAt)
  }

  private scheduleRefresh(expiresAt: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    const timeUntilExpiry = expiresAt - Date.now()

    // Use the full buffer when the token lifetime is long enough;
    // otherwise refresh at 75% of the remaining lifetime, but never
    // sooner than MIN_REFRESH_INTERVAL_MS to avoid hot-looping when
    // the IdP returns very short-lived tokens.
    const buffer =
      timeUntilExpiry > TOKEN_REFRESH_BUFFER_MS
        ? TOKEN_REFRESH_BUFFER_MS
        : Math.floor(timeUntilExpiry * 0.25)

    const refreshIn = Math.max(timeUntilExpiry - buffer, MIN_REFRESH_INTERVAL_MS)

    this.refreshTimer = setTimeout(() => {
      this.refresh()
    }, refreshIn)
  }
}

/**
 * Singleton auth service instance.
 *
 * Only meaningful when `isTeams === true`. In Free tier mode,
 * all methods are safe to call but will be no-ops or return null.
 */
export const authService = new AuthService()
