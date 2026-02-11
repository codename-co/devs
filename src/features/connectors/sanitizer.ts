/**
 * Error Message Sanitizer for Connectors
 *
 * Strips sensitive data (tokens, keys, credentials, URLs with auth params)
 * from error messages before they are persisted or displayed.
 *
 * This prevents accidental leakage of secrets through:
 * - Connector `errorMessage` fields stored in Yjs/IndexedDB
 * - Toast notifications shown to the user
 * - Console log statements
 * - Sync state error messages
 */

// =============================================================================
// Patterns
// =============================================================================

/**
 * Patterns that match sensitive data in error messages.
 * Each entry has a regex and a replacement label.
 */
const SENSITIVE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Bearer tokens in headers or error text
  {
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [REDACTED]',
  },
  // Generic JWT tokens (three dot-separated base64 segments)
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[REDACTED_JWT]',
  },
  // Google OAuth access tokens (ya29.*)
  {
    pattern: /ya29\.[A-Za-z0-9\-._~+/]+/g,
    replacement: '[REDACTED_GOOGLE_TOKEN]',
  },
  // GitHub tokens (ghp_, gho_, ghs_, ghr_)
  {
    pattern: /gh[posr]_[A-Za-z0-9_]{36,}/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  // Slack tokens (xoxb-, xoxp-, xoxa-, xoxs-)
  {
    pattern: /xox[bpas]-[A-Za-z0-9\-]+/g,
    replacement: '[REDACTED_SLACK_TOKEN]',
  },
  // Notion integration tokens (secret_*)
  {
    pattern: /secret_[A-Za-z0-9]{32,}/g,
    replacement: '[REDACTED_NOTION_TOKEN]',
  },
  // API keys / tokens that look like long hex or base64 strings (32+ chars)
  // Only match when preceded by common key-like prefixes
  {
    pattern:
      /(api[_-]?key|token|secret|password|credential|authorization)[=:"\s]+[A-Za-z0-9\-._~+/]{32,}/gi,
    replacement: '$1=[REDACTED]',
  },
  // URLs with access_token, token, key, or secret query parameters
  {
    pattern:
      /([?&])(access_token|token|key|secret|client_secret|api_key|apikey)=[^&\s]+/gi,
    replacement: '$1$2=[REDACTED]',
  },
  // Authorization headers in stringified objects
  {
    pattern: /"?[Aa]uthorization"?\s*:\s*"[^"]*"/g,
    replacement: '"Authorization": "[REDACTED]"',
  },
  // Refresh tokens in stringified responses
  {
    pattern: /"?refresh_token"?\s*:\s*"[^"]*"/g,
    replacement: '"refresh_token": "[REDACTED]"',
  },
  // Access tokens in stringified responses
  {
    pattern: /"?access_token"?\s*:\s*"[^"]*"/g,
    replacement: '"access_token": "[REDACTED]"',
  },
]

// =============================================================================
// Public API
// =============================================================================

/**
 * Sanitize an error message by removing sensitive data.
 *
 * Strips tokens, API keys, secrets, and other credentials from the
 * message to make it safe for persistence and display.
 *
 * @param message - The raw error message (may contain sensitive data)
 * @param maxLength - Maximum length of the sanitized message (default: 500)
 * @returns Sanitized error message safe for storage and display
 *
 * @example
 * ```typescript
 * const raw = 'HTTP 401: Bearer ya29.a0AfH6SMB... invalid token'
 * const safe = sanitizeErrorMessage(raw)
 * // 'HTTP 401: Bearer [REDACTED] invalid token'
 * ```
 */
export function sanitizeErrorMessage(
  message: string | undefined | null,
  maxLength: number = 500,
): string {
  if (!message) return ''

  let sanitized = message

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0
    sanitized = sanitized.replace(pattern, replacement)
  }

  // Truncate to maxLength to prevent oversized error messages
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '… [truncated]'
  }

  return sanitized
}

/**
 * Sanitize an Error object, returning just the safe message string.
 *
 * @param error - The error to sanitize (string, Error, or unknown)
 * @returns Sanitized error message
 */
export function sanitizeError(error: unknown): string {
  if (typeof error === 'string') {
    return sanitizeErrorMessage(error)
  }
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message)
  }
  return sanitizeErrorMessage(String(error))
}
