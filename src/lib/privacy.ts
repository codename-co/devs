/**
 * Privacy Mode — Network isolation for spaces.
 *
 * When privacy mode is enabled on a space, absolutely NO outgoing network
 * calls are allowed. Only local LLM providers are trusted.
 *
 * Trust levels:
 * - **Full trust**: Provider runs entirely on-device (e.g. Local/WebGPU).
 * - **Conditional trust**: Provider *can* be local (e.g. OpenAI Compatible
 *   pointing at LM Studio) but may also point at a remote API. Trust depends
 *   on the configured base URL.
 * - **Untrusted**: Provider always sends data to a remote cloud API.
 *
 * @module lib/privacy
 */

import type { LLMProvider, Credential } from '@/types'
import { getActiveSpaceId } from '@/stores/spaceStore'
import { getEffectiveSettings } from '@/stores/userStore'

// ============================================================================
// Trust classification
// ============================================================================

/** Providers that NEVER make network calls — always trusted. */
export const FULLY_TRUSTED_PROVIDERS: readonly LLMProvider[] = [
  'local', // WebGPU in-browser inference
] as const

/**
 * Providers that CAN be local (and therefore trusted) depending on their
 * base URL configuration. If the base URL points to localhost / 127.0.0.1 /
 * a private-network address, they are trusted; otherwise they are not.
 */
export const CONDITIONALLY_TRUSTED_PROVIDERS: readonly LLMProvider[] = [
  'ollama', // Typically runs on localhost:11434
  'openai-compatible', // LM Studio, vLLM, LocalAI, etc.
  'custom', // User-managed endpoint
  'claude-code', // Local Claude Code API server
] as const

/** Every other provider is untrusted in privacy mode. */
export const UNTRUSTED_PROVIDERS: readonly LLMProvider[] = [
  'openai',
  'anthropic',
  'google',
  'vertex-ai',
  'mistral',
  'openrouter',
  'huggingface',
  'chatjimmy',
  'github-copilot',
  'stability',
  'replicate',
  'together',
  'fal',
] as const

// ============================================================================
// Trust helpers
// ============================================================================

/**
 * Check whether a URL points to a local / private-network address.
 */
export function isLocalUrl(url: string | undefined): boolean {
  if (!url) return true // No URL means default (usually localhost)
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    // URL parser wraps IPv6 in brackets — strip them
    const cleanHost = hostname.replace(/^\[|\]$/g, '')
    return (
      cleanHost === 'localhost' ||
      cleanHost === '127.0.0.1' ||
      cleanHost === '::1' ||
      cleanHost === '0.0.0.0' ||
      cleanHost.endsWith('.local') ||
      // Private IPv4 ranges
      cleanHost.startsWith('10.') ||
      cleanHost.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(cleanHost)
    )
  } catch {
    return false
  }
}

export type TrustLevel = 'full' | 'conditional' | 'untrusted'

/**
 * Get the trust level of an LLM provider.
 */
export function getProviderTrustLevel(provider: LLMProvider): TrustLevel {
  if ((FULLY_TRUSTED_PROVIDERS as readonly string[]).includes(provider))
    return 'full'
  if ((CONDITIONALLY_TRUSTED_PROVIDERS as readonly string[]).includes(provider))
    return 'conditional'
  return 'untrusted'
}

/**
 * Determine whether a specific credential is trusted in privacy mode.
 *
 * - Fully trusted providers → always true.
 * - Conditionally trusted → true only if baseUrl is local.
 * - Untrusted providers → always false.
 */
export function isCredentialTrusted(credential: Credential): boolean {
  const level = getProviderTrustLevel(credential.provider)
  if (level === 'full') return true
  if (level === 'untrusted') return false
  // Conditional — check the configured URL
  return isLocalUrl(credential.baseUrl)
}

/**
 * Check whether a provider type is allowed in privacy mode.
 * For the "add provider" grid, we show fully trusted + conditionally trusted.
 */
export function isProviderAllowedInPrivacyMode(
  provider: LLMProvider,
): boolean {
  return getProviderTrustLevel(provider) !== 'untrusted'
}

// ============================================================================
// Privacy mode state access
// ============================================================================

/**
 * Check whether privacy mode is active for the current space.
 * Reads from space settings overrides (non-reactive — for use outside React).
 */
export function isPrivacyModeActive(spaceId?: string): boolean {
  const id = spaceId ?? getActiveSpaceId()
  const settings = getEffectiveSettings(id)
  return settings.privacyMode === true
}

/**
 * Validate that the given provider + credential is allowed under the
 * current space's privacy mode. Throws if not.
 */
export function assertProviderAllowed(
  provider: LLMProvider,
  credential?: Credential | null,
): void {
  if (!isPrivacyModeActive()) return

  const trustLevel = getProviderTrustLevel(provider)

  if (trustLevel === 'untrusted') {
    throw new PrivacyModeError(
      `Provider "${provider}" is not allowed in privacy mode. Only local providers are trusted.`,
    )
  }

  if (trustLevel === 'conditional' && credential) {
    if (!isLocalUrl(credential.baseUrl)) {
      throw new PrivacyModeError(
        `Provider "${provider}" points to a remote URL and is not allowed in privacy mode. ` +
          `Only local endpoints (localhost, private network) are trusted.`,
      )
    }
  }
}

/**
 * Custom error for privacy mode violations.
 */
export class PrivacyModeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrivacyModeError'
  }
}

// ============================================================================
// Allowed origins for service worker
// ============================================================================

/**
 * Get the set of hostnames that are allowed in privacy mode.
 * Used by the service worker to block all other outgoing requests.
 */
export const PRIVACY_MODE_ALLOWED_HOSTS: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
] as const
