/**
 * Privacy Mode — Unit tests
 *
 * Tests for trust classification, URL detection, and provider guards.
 */

import { describe, it, expect } from 'vitest'
import {
  isLocalUrl,
  getProviderTrustLevel,
  isCredentialTrusted,
  isProviderAllowedInPrivacyMode,
  PrivacyModeError,
  FULLY_TRUSTED_PROVIDERS,
  CONDITIONALLY_TRUSTED_PROVIDERS,
  UNTRUSTED_PROVIDERS,
} from '@/lib/privacy'
import type { Credential, LLMProvider } from '@/types'

// ============================================================================
// isLocalUrl
// ============================================================================

describe('isLocalUrl', () => {
  it('returns true for localhost', () => {
    expect(isLocalUrl('http://localhost:11434')).toBe(true)
    expect(isLocalUrl('http://localhost')).toBe(true)
  })

  it('returns true for 127.0.0.1', () => {
    expect(isLocalUrl('http://127.0.0.1:8080')).toBe(true)
  })

  it('returns true for ::1 (IPv6 loopback)', () => {
    expect(isLocalUrl('http://[::1]:3000')).toBe(true)
  })

  it('returns true for 0.0.0.0', () => {
    expect(isLocalUrl('http://0.0.0.0:5000')).toBe(true)
  })

  it('returns true for .local domains', () => {
    expect(isLocalUrl('http://myserver.local:8080')).toBe(true)
  })

  it('returns true for private IPv4 ranges', () => {
    expect(isLocalUrl('http://10.0.0.1:8080')).toBe(true)
    expect(isLocalUrl('http://192.168.1.100:8080')).toBe(true)
    expect(isLocalUrl('http://172.16.0.1:8080')).toBe(true)
    expect(isLocalUrl('http://172.31.255.255:8080')).toBe(true)
  })

  it('returns false for public URLs', () => {
    expect(isLocalUrl('https://api.openai.com/v1/chat')).toBe(false)
    expect(isLocalUrl('https://api.anthropic.com/v1/messages')).toBe(false)
    expect(isLocalUrl('https://some-server.com:8080')).toBe(false)
  })

  it('returns true for undefined/empty (default = localhost)', () => {
    expect(isLocalUrl(undefined)).toBe(true)
    expect(isLocalUrl('')).toBe(true)
  })

  it('returns false for non-private 172.x addresses', () => {
    expect(isLocalUrl('http://172.32.0.1:8080')).toBe(false)
    expect(isLocalUrl('http://172.15.0.1:8080')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isLocalUrl('not-a-url')).toBe(false)
  })
})

// ============================================================================
// getProviderTrustLevel
// ============================================================================

describe('getProviderTrustLevel', () => {
  it('returns "full" for fully trusted providers', () => {
    expect(getProviderTrustLevel('local')).toBe('full')
  })

  it('returns "conditional" for conditionally trusted providers', () => {
    expect(getProviderTrustLevel('ollama')).toBe('conditional')
    expect(getProviderTrustLevel('openai-compatible')).toBe('conditional')
    expect(getProviderTrustLevel('custom')).toBe('conditional')
    expect(getProviderTrustLevel('claude-code')).toBe('conditional')
  })

  it('returns "untrusted" for cloud providers', () => {
    expect(getProviderTrustLevel('openai')).toBe('untrusted')
    expect(getProviderTrustLevel('anthropic')).toBe('untrusted')
    expect(getProviderTrustLevel('google')).toBe('untrusted')
    expect(getProviderTrustLevel('mistral')).toBe('untrusted')
    expect(getProviderTrustLevel('openrouter')).toBe('untrusted')
    expect(getProviderTrustLevel('huggingface')).toBe('untrusted')
    expect(getProviderTrustLevel('vertex-ai')).toBe('untrusted')
    expect(getProviderTrustLevel('github-copilot')).toBe('untrusted')
  })
})

// ============================================================================
// isCredentialTrusted
// ============================================================================

describe('isCredentialTrusted', () => {
  const makeCredential = (
    provider: LLMProvider,
    baseUrl?: string,
  ): Credential => ({
    id: `test-${provider}`,
    provider,
    encryptedApiKey: 'encrypted',
    timestamp: new Date(),
    baseUrl,
  })

  it('trusts local provider regardless of URL', () => {
    expect(isCredentialTrusted(makeCredential('local'))).toBe(true)
    expect(isCredentialTrusted(makeCredential('local', 'http://anything.com'))).toBe(true)
  })

  it('trusts ollama pointing to localhost', () => {
    expect(isCredentialTrusted(makeCredential('ollama', 'http://localhost:11434'))).toBe(true)
    expect(isCredentialTrusted(makeCredential('ollama'))).toBe(true) // default = localhost
  })

  it('does not trust ollama pointing to remote URL', () => {
    expect(
      isCredentialTrusted(makeCredential('ollama', 'https://my-cloud-ollama.com')),
    ).toBe(false)
  })

  it('trusts openai-compatible pointing to LM Studio (localhost)', () => {
    expect(
      isCredentialTrusted(makeCredential('openai-compatible', 'http://localhost:1234')),
    ).toBe(true)
  })

  it('does not trust openai-compatible pointing to remote API', () => {
    expect(
      isCredentialTrusted(
        makeCredential('openai-compatible', 'https://api.together.xyz'),
      ),
    ).toBe(false)
  })

  it('never trusts cloud providers', () => {
    expect(isCredentialTrusted(makeCredential('openai'))).toBe(false)
    expect(isCredentialTrusted(makeCredential('anthropic'))).toBe(false)
    expect(isCredentialTrusted(makeCredential('google'))).toBe(false)
  })
})

// ============================================================================
// isProviderAllowedInPrivacyMode
// ============================================================================

describe('isProviderAllowedInPrivacyMode', () => {
  it('allows fully trusted providers', () => {
    for (const p of FULLY_TRUSTED_PROVIDERS) {
      expect(isProviderAllowedInPrivacyMode(p)).toBe(true)
    }
  })

  it('allows conditionally trusted providers', () => {
    for (const p of CONDITIONALLY_TRUSTED_PROVIDERS) {
      expect(isProviderAllowedInPrivacyMode(p)).toBe(true)
    }
  })

  it('blocks untrusted providers', () => {
    for (const p of UNTRUSTED_PROVIDERS) {
      expect(isProviderAllowedInPrivacyMode(p)).toBe(false)
    }
  })
})

// ============================================================================
// Provider lists are exhaustive
// ============================================================================

describe('provider trust lists', () => {
  it('cover all known providers (no gaps)', () => {
    const all = [
      ...FULLY_TRUSTED_PROVIDERS,
      ...CONDITIONALLY_TRUSTED_PROVIDERS,
      ...UNTRUSTED_PROVIDERS,
    ]
    // Every known LLM provider should appear in exactly one list
    const knownProviders: LLMProvider[] = [
      'local',
      'ollama',
      'openai',
      'anthropic',
      'google',
      'vertex-ai',
      'mistral',
      'openrouter',
      'huggingface',
      'openai-compatible',
      'claude-code',
      'chatjimmy',
      'github-copilot',
      'custom',
      'stability',
      'replicate',
      'together',
      'fal',
    ]

    for (const p of knownProviders) {
      expect(all).toContain(p)
    }

    // No duplicates
    const unique = new Set(all)
    expect(unique.size).toBe(all.length)
  })
})

// ============================================================================
// PrivacyModeError
// ============================================================================

describe('PrivacyModeError', () => {
  it('has correct name', () => {
    const err = new PrivacyModeError('test')
    expect(err.name).toBe('PrivacyModeError')
    expect(err.message).toBe('test')
    expect(err).toBeInstanceOf(Error)
  })
})
