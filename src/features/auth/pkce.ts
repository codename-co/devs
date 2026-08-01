/**
 * @module features/auth/pkce
 *
 * OAuth2 PKCE (Proof Key for Code Exchange) utilities.
 *
 * Implements the cryptographic primitives needed for the OAuth2
 * Authorization Code flow with PKCE, which is the recommended
 * flow for public clients (SPAs) that cannot keep a client secret.
 *
 * ## Flow overview
 *
 * 1. Generate a random `code_verifier` (high-entropy string)
 * 2. Derive a `code_challenge` by SHA-256 hashing + base64url encoding
 * 3. Send the `code_challenge` in the authorization request
 * 4. Send the `code_verifier` when exchanging the authorization code
 * 5. The IdP verifies `SHA256(code_verifier) === code_challenge`
 *
 * This ensures that even if the authorization code is intercepted,
 * it cannot be exchanged without the original verifier.
 */

/**
 * Generate a cryptographically random code verifier string.
 *
 * Per RFC 7636, the verifier must be 43–128 characters from the
 * unreserved character set [A-Z, a-z, 0-9, "-", ".", "_", "~"].
 *
 * @returns A 128-character random string suitable as a PKCE code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(96) // 96 bytes → 128 base64url chars
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Derive a code challenge from a code verifier using SHA-256.
 *
 * @param verifier - The code verifier string
 * @returns Base64url-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(
  verifier: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Generate a cryptographically random state parameter.
 *
 * Used to prevent CSRF attacks in the OAuth2 flow. The state is
 * stored in sessionStorage before the redirect and verified when
 * the user returns with the authorization code.
 *
 * @returns A random 32-character string
 */
export function generateState(): string {
  const array = new Uint8Array(24) // 24 bytes → 32 base64url chars
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Base64url encode a byte array (no padding, URL-safe).
 *
 * Per RFC 4648 §5, this uses `-` and `_` instead of `+` and `/`,
 * and strips trailing `=` padding.
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
