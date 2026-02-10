/**
 * Password strength evaluator for sync passwords (GAP-6).
 *
 * Provides entropy-based strength scoring with user-friendly feedback.
 * Used by SyncPanel and SyncPasswordModal to enforce minimum password quality
 * before sharing sync rooms.
 */

export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'

export interface PasswordStrengthResult {
  /** Numeric score 0-4 where 0=weak, 4=very-strong */
  score: 0 | 1 | 2 | 3 | 4
  /** Human-readable label */
  level: StrengthLevel
  /** Whether the password meets minimum requirements for sync */
  meetsMinimum: boolean
  /** Actionable feedback messages (i18n keys) */
  feedback: string[]
  /** Estimated entropy in bits */
  entropy: number
}

const SCORE_TO_LEVEL: Record<number, StrengthLevel> = {
  0: 'weak',
  1: 'fair',
  2: 'good',
  3: 'strong',
  4: 'very-strong',
}

/** Minimum password length for sync passwords */
export const MIN_PASSWORD_LENGTH = 12

/** Minimum score required to enable sync sharing */
export const MIN_SYNC_SCORE = 2

/**
 * Estimate the Shannon entropy of a password in bits.
 *
 * Calculates based on character pool size (lowercase, uppercase, digits,
 * symbols) and length.  This is a simplified model that doesn't account
 * for dictionary words or patterns, but provides a reasonable baseline.
 */
export function estimateEntropy(password: string): number {
  if (!password) return 0

  let poolSize = 0
  if (/[a-z]/.test(password)) poolSize += 26
  if (/[A-Z]/.test(password)) poolSize += 26
  if (/[0-9]/.test(password)) poolSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32

  if (poolSize === 0) return 0

  return Math.floor(password.length * Math.log2(poolSize))
}

/**
 * Check for common patterns that weaken a password.
 */
function detectPatterns(password: string): string[] {
  const feedback: string[] = []

  // Repeated characters (aaa, 111)
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('password_no_repeated_chars')
  }

  // Sequential runs (abc, 123, cba)
  const lower = password.toLowerCase()
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i)
    const b = lower.charCodeAt(i + 1)
    const c = lower.charCodeAt(i + 2)
    if (b - a === 1 && c - b === 1) {
      feedback.push('password_no_sequences')
      break
    }
    if (a - b === 1 && b - c === 1) {
      feedback.push('password_no_sequences')
      break
    }
  }

  return feedback
}

/**
 * Evaluate the strength of a password.
 *
 * Scoring criteria:
 *  - Length ≥ 12 chars: +1
 *  - Mixed case (upper + lower): +1
 *  - Contains digits: +0.5
 *  - Contains symbols: +0.5
 *  - Entropy ≥ 50 bits: +1
 *  - Pattern penalties: -1 per pattern detected
 *
 * @returns A {@link PasswordStrengthResult} with score, level, and feedback.
 */
export function evaluatePasswordStrength(
  password: string,
): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      level: 'weak',
      meetsMinimum: false,
      feedback: [],
      entropy: 0,
    }
  }

  const feedback: string[] = []
  let rawScore = 0

  // --- Length check ---
  if (password.length < MIN_PASSWORD_LENGTH) {
    feedback.push('password_min_length')
  } else {
    rawScore += 1
  }

  // --- Character diversity ---
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)

  if (hasLower && hasUpper) {
    rawScore += 1
  } else {
    feedback.push('password_mix_case')
  }

  if (hasDigit) rawScore += 0.5
  else feedback.push('password_add_digits')

  if (hasSymbol) rawScore += 0.5
  else feedback.push('password_add_symbols')

  // --- Entropy check ---
  const entropy = estimateEntropy(password)
  if (entropy >= 50) {
    rawScore += 1
  }

  // --- Pattern detection ---
  const patternFeedback = detectPatterns(password)
  feedback.push(...patternFeedback)
  rawScore -= patternFeedback.length

  // Clamp score to valid range
  const score = Math.max(0, Math.min(4, Math.round(rawScore))) as
    | 0
    | 1
    | 2
    | 3
    | 4

  return {
    score,
    level: SCORE_TO_LEVEL[score],
    meetsMinimum: score >= MIN_SYNC_SCORE,
    feedback,
    entropy,
  }
}
