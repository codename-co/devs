/**
 * Vertex AI Authentication Utilities
 *
 * Shared authentication logic for Google Cloud Vertex AI.
 * Used by both the main LLM provider and Studio image/video providers.
 *
 * Supports two authentication methods:
 * 1. JSON service account key (paste the entire JSON)
 * 2. Legacy format: LOCATION:PROJECT_ID:ACCESS_TOKEN
 */

/**
 * Google Cloud Service Account JSON key structure
 */
export interface ServiceAccountKey {
  type: 'service_account'
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
  universe_domain?: string
}

/**
 * Cache for access tokens to avoid regenerating on every request
 */
interface TokenCache {
  accessToken: string
  expiresAt: number
}

/**
 * Result of resolving Vertex AI auth info
 */
export interface VertexAIAuthInfo {
  /** Base endpoint URL (e.g. https://aiplatform.googleapis.com/v1/projects/{project}/locations/{location}) */
  endpoint: string
  /** OAuth2 access token */
  accessToken: string
  /** Project ID from the service account or legacy format */
  projectId: string
  /** Location / region */
  location: string
}

// Module-level token cache shared across all consumers
const tokenCache = new Map<string, TokenCache>()

/**
 * Detect if the API key is a JSON service account key
 */
export function isJsonKey(apiKey?: string): boolean {
  if (!apiKey) return false
  const trimmed = apiKey.trim()
  return trimmed.startsWith('{') && trimmed.includes('"type"')
}

/**
 * Parse JSON service account key
 */
export function parseServiceAccountKey(apiKey: string): ServiceAccountKey {
  try {
    const key = JSON.parse(apiKey.trim())
    if (key.type !== 'service_account') {
      throw new Error(
        'Invalid service account key: type must be "service_account"',
      )
    }
    if (!key.project_id || !key.private_key || !key.client_email) {
      throw new Error(
        'Invalid service account key: missing required fields (project_id, private_key, client_email)',
      )
    }
    return key as ServiceAccountKey
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format for service account key')
    }
    throw error
  }
}

/**
 * Base64URL encode a string
 */
function base64UrlEncode(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64URL encode a Uint8Array
 */
function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Sign data with RSA private key using Web Crypto API
 */
async function signWithPrivateKey(
  data: string,
  privateKeyPem: string,
): Promise<string> {
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )

  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(data),
  )

  return base64UrlEncodeBytes(new Uint8Array(signature))
}

/**
 * Create a JWT for Google OAuth 2.0
 */
async function createJwt(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = await signWithPrivateKey(
    signatureInput,
    serviceAccount.private_key,
  )

  return `${signatureInput}.${signature}`
}

/**
 * Exchange JWT for access token
 */
async function exchangeJwtForAccessToken(
  jwt: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  }
}

/**
 * Get access token from service account key (with caching)
 */
async function getAccessTokenFromServiceAccount(
  serviceAccount: ServiceAccountKey,
): Promise<string> {
  const cacheKey = serviceAccount.client_email

  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.accessToken
  }

  const jwt = await createJwt(serviceAccount)
  const { accessToken, expiresIn } = await exchangeJwtForAccessToken(jwt)

  tokenCache.set(cacheKey, {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  })

  return accessToken
}

/**
 * Resolve Vertex AI authentication info from an API key.
 *
 * @param apiKey - Either a JSON service account key or legacy "LOCATION:PROJECT_ID:TOKEN" format
 * @param location - Default location fallback (default: 'global')
 * @param baseUrl  - Optional base URL override
 */
export async function getVertexAIAuthInfo(
  apiKey: string,
  location = 'global',
  baseUrl?: string,
): Promise<VertexAIAuthInfo> {
  if (isJsonKey(apiKey)) {
    const serviceAccount = parseServiceAccountKey(apiKey)
    const accessToken = await getAccessTokenFromServiceAccount(serviceAccount)

    const hostname = 'aiplatform.googleapis.com'
    const endpoint =
      baseUrl ||
      `https://${hostname}/v1/projects/${serviceAccount.project_id}/locations/${location}`

    return {
      endpoint,
      accessToken,
      projectId: serviceAccount.project_id,
      location,
    }
  } else {
    // Legacy format: LOCATION:PROJECT_ID:ACCESS_TOKEN
    const parts = apiKey.split(':')
    if (parts.length < 3) {
      throw new Error(
        'Vertex AI requires either:\n' +
          '1. A JSON service account key (paste the entire JSON), or\n' +
          '2. Format: LOCATION:PROJECT_ID:ACCESS_TOKEN',
      )
    }

    const [loc, projectId, ...tokenParts] = parts
    const accessToken = tokenParts.join(':')

    const hostname = 'aiplatform.googleapis.com'
    const endpoint =
      baseUrl || `https://${hostname}/v1/projects/${projectId}/locations/${loc}`

    return {
      endpoint,
      accessToken,
      projectId,
      location: loc,
    }
  }
}
