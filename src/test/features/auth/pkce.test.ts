/**
 * Tests for OAuth2 PKCE utilities.
 */
import { describe, it, expect } from 'vitest'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  base64UrlEncode,
} from '@/features/auth/pkce'

describe('PKCE utilities', () => {
  describe('generateCodeVerifier', () => {
    it('generates a string of expected length', () => {
      const verifier = generateCodeVerifier()
      // 96 bytes → 128 base64url chars
      expect(verifier.length).toBe(128)
    })

    it('generates unique values', () => {
      const v1 = generateCodeVerifier()
      const v2 = generateCodeVerifier()
      expect(v1).not.toBe(v2)
    })

    it('uses only URL-safe characters', () => {
      const verifier = generateCodeVerifier()
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('does not contain padding characters', () => {
      const verifier = generateCodeVerifier()
      expect(verifier).not.toContain('=')
    })
  })

  describe('generateCodeChallenge', () => {
    it('produces a base64url-encoded SHA-256 hash', async () => {
      const verifier = 'test-verifier-string'
      const challenge = await generateCodeChallenge(verifier)

      // SHA-256 → 32 bytes → ~43 base64url chars
      expect(challenge.length).toBe(43)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('produces deterministic output for the same input', async () => {
      const verifier = 'deterministic-test'
      const c1 = await generateCodeChallenge(verifier)
      const c2 = await generateCodeChallenge(verifier)
      expect(c1).toBe(c2)
    })

    it('produces different output for different inputs', async () => {
      const c1 = await generateCodeChallenge('input-1')
      const c2 = await generateCodeChallenge('input-2')
      expect(c1).not.toBe(c2)
    })
  })

  describe('generateState', () => {
    it('generates a string of expected length', () => {
      const state = generateState()
      // 24 bytes → 32 base64url chars
      expect(state.length).toBe(32)
    })

    it('generates unique values', () => {
      const s1 = generateState()
      const s2 = generateState()
      expect(s1).not.toBe(s2)
    })

    it('uses only URL-safe characters', () => {
      const state = generateState()
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })

  describe('base64UrlEncode', () => {
    it('encodes empty array', () => {
      expect(base64UrlEncode(new Uint8Array([]))).toBe('')
    })

    it('replaces + with -', () => {
      // Byte 62 in standard base64 is +
      // We need bytes that produce + in standard base64
      const result = base64UrlEncode(new Uint8Array([0x3e]))
      expect(result).not.toContain('+')
    })

    it('replaces / with _', () => {
      // Byte 63 in standard base64 is /
      const result = base64UrlEncode(new Uint8Array([0x3f]))
      expect(result).not.toContain('/')
    })

    it('strips padding', () => {
      const result = base64UrlEncode(new Uint8Array([1]))
      expect(result).not.toContain('=')
    })
  })
})
