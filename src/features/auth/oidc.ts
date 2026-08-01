/**
 * @module features/auth/oidc
 *
 * OIDC Discovery and Token Exchange
 *
 * Handles the OpenID Connect discovery and token endpoint interactions
 * for the Teams OAuth2 PKCE flow. Supports any OIDC-compliant provider
 * (Okta, Entra ID, Auth0, Keycloak, etc.).
 */

import type { TeamsTokenSet, TeamsUser } from './types'

/**
 * OIDC Discovery document (subset of fields we use).
 * @see https://openid.net/specs/openid-connect-discovery-1_0.html
 */
export interface OIDCDiscoveryDocument {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  end_session_endpoint?: string
  jwks_uri: string
}

/** Cache for discovery documents by issuer URL */
const discoveryCache = new Map<string, OIDCDiscoveryDocument>()

/**
 * Fetch the OIDC discovery document from the issuer's well-known endpoint.
 *
 * Results are cached in memory for the lifetime of the page.
 *
 * @param issuer - The OIDC issuer URL (e.g. "https://acme.okta.com")
 * @returns The discovery document
 * @throws If the discovery endpoint is unreachable or returns an error
 */
export async function discoverOIDC(
  issuer: string,
): Promise<OIDCDiscoveryDocument> {
  const cached = discoveryCache.get(issuer)
  if (cached) return cached

  const url = `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `OIDC discovery failed for ${issuer}: ${response.status} ${response.statusText}`,
    )
  }

  const doc: OIDCDiscoveryDocument = await response.json()
  discoveryCache.set(issuer, doc)
  return doc
}

/**
 * Exchange an authorization code for tokens.
 *
 * @param tokenEndpoint - The OIDC token endpoint URL
 * @param code - The authorization code received from the redirect
 * @param codeVerifier - The PKCE code verifier used in the authorization request
 * @param clientId - The OAuth2 client ID
 * @param redirectUri - The redirect URI used in the authorization request
 * @returns The token set (access token, ID token, refresh token, expiry)
 */
export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string,
): Promise<TeamsTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    redirect_uri: redirectUri,
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Token exchange failed: ${response.status} — ${errorBody}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

/**
 * Refresh the access token using a refresh token.
 *
 * @param tokenEndpoint - The OIDC token endpoint URL
 * @param refreshToken - The refresh token
 * @param clientId - The OAuth2 client ID
 * @returns A new token set with refreshed access token
 */
export async function refreshAccessToken(
  tokenEndpoint: string,
  refreshToken: string,
  clientId: string,
): Promise<TeamsTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token ?? refreshToken, // Some providers don't rotate
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

/**
 * Parse user claims from a JWT ID token.
 *
 * Note: This does NOT validate the token signature — that's the server's
 * job. The client trusts the token because it came from a TLS-secured
 * token endpoint. We only decode the payload for display purposes.
 *
 * @param idToken - The JWT ID token string
 * @param adminClaim - The claim key to check for admin role (default: "groups")
 * @param adminValue - The value that indicates admin (default: "devs-admin")
 * @returns Parsed user identity
 */
export function parseIdToken(
  idToken: string,
  adminClaim: string = 'groups',
  adminValue: string = 'devs-admin',
): TeamsUser {
  const payload = JSON.parse(
    atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
  )

  // Determine admin role from configurable claim
  const claimValue = payload[adminClaim]
  const isAdmin = Array.isArray(claimValue)
    ? claimValue.includes(adminValue)
    : claimValue === adminValue

  return {
    id: payload.sub,
    email: payload.email ?? '',
    name: payload.name ?? payload.preferred_username ?? payload.email ?? '',
    role: isAdmin ? 'admin' : 'member',
    avatar: payload.picture ?? undefined,
  }
}

/**
 * Clear the discovery cache (useful for testing).
 */
export function clearDiscoveryCache(): void {
  discoveryCache.clear()
}
