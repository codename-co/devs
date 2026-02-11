import { describe, it, expect } from 'vitest'
import {
  sanitizeErrorMessage,
  sanitizeError,
} from '@/features/connectors/sanitizer'

describe('sanitizeErrorMessage', () => {
  // =========================================================================
  // Basic behavior
  // =========================================================================

  it('should return empty string for null/undefined', () => {
    expect(sanitizeErrorMessage(null)).toBe('')
    expect(sanitizeErrorMessage(undefined)).toBe('')
    expect(sanitizeErrorMessage('')).toBe('')
  })

  it('should pass through safe messages unchanged', () => {
    expect(sanitizeErrorMessage('Connection timed out')).toBe(
      'Connection timed out',
    )
    expect(sanitizeErrorMessage('HTTP 500: Internal Server Error')).toBe(
      'HTTP 500: Internal Server Error',
    )
  })

  // =========================================================================
  // Bearer tokens
  // =========================================================================

  it('should redact Bearer tokens', () => {
    const input = 'HTTP 401: Bearer ya29.a0AfH6SMBxyz123456789 is invalid'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('ya29')
    expect(result).toContain('[REDACTED')
  })

  it('should redact multiple Bearer tokens in same message', () => {
    const input =
      'Old: Bearer abc123def456ghi789jkl012mno345pqr, New: Bearer xyz789abc123def456ghi789jkl012mno345pqr'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('abc123')
    expect(result).not.toContain('xyz789')
  })

  // =========================================================================
  // Google OAuth tokens
  // =========================================================================

  it('should redact Google access tokens (ya29.*)', () => {
    const input =
      'Token ya29.a0ARrdaM-something-very-long-here_abc123 has expired'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('ya29')
    expect(result).toContain('[REDACTED_GOOGLE_TOKEN]')
  })

  // =========================================================================
  // GitHub tokens
  // =========================================================================

  it('should redact GitHub personal access tokens (ghp_)', () => {
    const input =
      'Auth failed with token ghp_ABCDEFghijklmnopqrstuvwxyz1234567890AB'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('ghp_')
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]')
  })

  it('should redact GitHub OAuth tokens (gho_)', () => {
    const input = 'Invalid gho_ABCDEFghijklmnopqrstuvwxyz1234567890AB'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('gho_')
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]')
  })

  // =========================================================================
  // Slack tokens
  // =========================================================================

  it('should redact Slack tokens (xoxb-, xoxp-)', () => {
    const input = 'Slack error: xoxb-123456789-abcdefghij token revoked'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('xoxb-')
    expect(result).toContain('[REDACTED_SLACK_TOKEN]')
  })

  // =========================================================================
  // Notion tokens
  // =========================================================================

  it('should redact Notion integration tokens (secret_)', () => {
    const input = 'Notion: secret_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh is invalid'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('secret_ABCDEF')
    expect(result).toContain('[REDACTED_NOTION_TOKEN]')
  })

  // =========================================================================
  // JWT tokens
  // =========================================================================

  it('should redact JWT tokens', () => {
    const input =
      'Invalid token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature-here'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('eyJhbGci')
    expect(result).toContain('[REDACTED_JWT]')
  })

  // =========================================================================
  // URL query parameters
  // =========================================================================

  it('should redact access_token in URLs', () => {
    const input =
      'Request to https://api.example.com/data?access_token=abc123secret456&format=json failed'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('abc123secret456')
    expect(result).toContain('access_token=[REDACTED]')
    expect(result).toContain('format=json')
  })

  it('should redact client_secret in URLs', () => {
    const input =
      'Request to https://oauth.example.com/token?client_secret=mysecret&client_id=123 failed'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('mysecret')
    expect(result).toContain('client_secret=[REDACTED]')
  })

  // =========================================================================
  // Stringified JSON responses
  // =========================================================================

  it('should redact access_token in stringified JSON', () => {
    const input =
      '{"access_token": "ya29.some-long-token","token_type": "Bearer"}'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('ya29.some-long-token')
    expect(result).toContain('"access_token": "[REDACTED]"')
  })

  it('should redact refresh_token in stringified JSON', () => {
    const input = '{"refresh_token": "1//0abc123refresh","expires_in": 3600}'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('1//0abc123refresh')
    expect(result).toContain('"refresh_token": "[REDACTED]"')
  })

  it('should redact Authorization header in stringified JSON', () => {
    const input = '{"Authorization": "Bearer some-secret-token"}'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('some-secret-token')
    expect(result).toContain('"Authorization": "[REDACTED]"')
  })

  // =========================================================================
  // Truncation
  // =========================================================================

  it('should truncate messages exceeding maxLength', () => {
    const input = 'A'.repeat(600)
    const result = sanitizeErrorMessage(input, 500)
    expect(result.length).toBeLessThanOrEqual(520) // 500 + '… [truncated]'
    expect(result).toContain('… [truncated]')
  })

  it('should not truncate short messages', () => {
    const input = 'Short error'
    const result = sanitizeErrorMessage(input, 500)
    expect(result).toBe('Short error')
  })

  // =========================================================================
  // Combined patterns
  // =========================================================================

  it('should handle messages with multiple sensitive patterns', () => {
    const input =
      'Auth failed: Bearer ya29.abc123def456 for xoxb-slack-token-here. ' +
      'Response: {"access_token": "new-token", "refresh_token": "ref-token"}'
    const result = sanitizeErrorMessage(input)
    expect(result).not.toContain('ya29')
    expect(result).not.toContain('xoxb-')
    expect(result).not.toContain('new-token')
    expect(result).not.toContain('ref-token')
  })
})

describe('sanitizeError', () => {
  it('should sanitize string errors', () => {
    const result = sanitizeError('Bearer ya29.secret-token-value expired')
    expect(result).not.toContain('ya29')
  })

  it('should sanitize Error objects', () => {
    const error = new Error(
      'ghp_ABCDEFghijklmnopqrstuvwxyz1234567890AB is invalid',
    )
    const result = sanitizeError(error)
    expect(result).not.toContain('ghp_')
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]')
  })

  it('should handle unknown error types', () => {
    const result = sanitizeError(42)
    expect(result).toBe('42')
  })

  it('should handle null/undefined', () => {
    expect(sanitizeError(null)).toBe('null')
    expect(sanitizeError(undefined)).toBe('undefined')
  })
})
