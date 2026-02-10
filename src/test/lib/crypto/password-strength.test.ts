import { describe, it, expect } from 'vitest'
import {
  evaluatePasswordStrength,
  estimateEntropy,
  MIN_PASSWORD_LENGTH,
  MIN_SYNC_SCORE,
} from '@/lib/crypto/password-strength'

describe('evaluatePasswordStrength', () => {
  describe('empty / missing passwords', () => {
    it('should return score 0 for empty string', () => {
      const result = evaluatePasswordStrength('')
      expect(result.score).toBe(0)
      expect(result.level).toBe('weak')
      expect(result.meetsMinimum).toBe(false)
      expect(result.entropy).toBe(0)
    })
  })

  describe('short passwords', () => {
    it('should penalise passwords shorter than MIN_PASSWORD_LENGTH', () => {
      const result = evaluatePasswordStrength('short')
      expect(result.meetsMinimum).toBe(false)
      expect(result.feedback).toContain('password_min_length')
    })
  })

  describe('long but homogeneous passwords', () => {
    it('should flag all-lowercase passwords', () => {
      const result = evaluatePasswordStrength('abcdefghijklmnop')
      expect(result.feedback).toContain('password_mix_case')
      expect(result.feedback).toContain('password_add_digits')
      expect(result.feedback).toContain('password_add_symbols')
    })
  })

  describe('strong passwords', () => {
    it('should score a diverse 16-char password highly', () => {
      const result = evaluatePasswordStrength('C0mpl3x!Pass#99')
      expect(result.score).toBeGreaterThanOrEqual(3)
      expect(result.meetsMinimum).toBe(true)
      expect(result.level).toMatch(/strong|very-strong/)
    })

    it('should consider a very long passphrase strong', () => {
      const result = evaluatePasswordStrength('My super Secret passphrase 42!')
      expect(result.score).toBeGreaterThanOrEqual(3)
      expect(result.meetsMinimum).toBe(true)
    })
  })

  describe('pattern detection', () => {
    it('should detect repeated characters', () => {
      const result = evaluatePasswordStrength('AAAbbbb1234567!')
      expect(result.feedback).toContain('password_no_repeated_chars')
    })

    it('should detect sequential characters', () => {
      const result = evaluatePasswordStrength('Abcdefghijkl1!')
      expect(result.feedback).toContain('password_no_sequences')
    })
  })

  describe('meetsMinimum threshold', () => {
    it(`should require at least score ${MIN_SYNC_SCORE}`, () => {
      // Score 0 – too short, no diversity
      expect(evaluatePasswordStrength('a').meetsMinimum).toBe(false)

      // Score should be >= MIN_SYNC_SCORE for a well-formed password
      const good = evaluatePasswordStrength('MyPassword12!@xy')
      expect(good.meetsMinimum).toBe(true)
    })
  })

  describe('score clamping', () => {
    it('should never return a score above 4', () => {
      const result = evaluatePasswordStrength(
        'Ex7r3m3ly$ecur3P@ssw0rd!!2025__XZ',
      )
      expect(result.score).toBeLessThanOrEqual(4)
    })

    it('should never return a score below 0', () => {
      const result = evaluatePasswordStrength('aaa')
      expect(result.score).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('estimateEntropy', () => {
  it('should return 0 for empty string', () => {
    expect(estimateEntropy('')).toBe(0)
  })

  it('should increase with password length', () => {
    const short = estimateEntropy('abc')
    const long = estimateEntropy('abcdefghijklmnop')
    expect(long).toBeGreaterThan(short)
  })

  it('should increase with character diversity', () => {
    const lower = estimateEntropy('abcdefgh')
    const mixed = estimateEntropy('aBcDeFgH')
    expect(mixed).toBeGreaterThan(lower)
  })

  it('should include symbols in pool size', () => {
    const noSymbols = estimateEntropy('Abcdefgh1')
    const withSymbols = estimateEntropy('Abcdefg1!')
    expect(withSymbols).toBeGreaterThan(noSymbols)
  })
})

describe('constants', () => {
  it('MIN_PASSWORD_LENGTH should be 12', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12)
  })

  it('MIN_SYNC_SCORE should be 2', () => {
    expect(MIN_SYNC_SCORE).toBe(2)
  })
})
