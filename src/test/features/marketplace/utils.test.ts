import { describe, it, expect } from 'vitest'
import { compareVersions, isNewerVersion } from '@/features/marketplace/utils'

describe('compareVersions', () => {
  describe('basic version comparison', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(compareVersions('2.5.3', '2.5.3')).toBe(0)
      expect(compareVersions('0.0.1', '0.0.1')).toBe(0)
    })

    it('should return 1 when first version is greater', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    })

    it('should return -1 when first version is lesser', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    })
  })

  describe('different version lengths', () => {
    it('should handle versions with different number of parts', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
      expect(compareVersions('1', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0', '1')).toBe(0)
    })

    it('should correctly compare versions with different lengths', () => {
      expect(compareVersions('1.1', '1.0.5')).toBe(1)
      expect(compareVersions('1.0.5', '1.1')).toBe(-1)
      expect(compareVersions('2', '1.9.9')).toBe(1)
    })
  })

  describe('pre-release versions', () => {
    it('should treat release version as greater than pre-release', () => {
      expect(compareVersions('1.0.0', '1.0.0-beta.1')).toBe(1)
      expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1)
    })

    it('should compare pre-release versions lexicographically', () => {
      expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.1')).toBe(1)
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1)
    })

    it('should compare equal pre-release versions', () => {
      expect(compareVersions('1.0.0-beta.1', '1.0.0-beta.1')).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(compareVersions('', '')).toBe(0)
      expect(compareVersions('1.0.0', '')).toBe(1)
      expect(compareVersions('', '1.0.0')).toBe(-1)
    })

    it('should handle identical strings', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
    })

    it('should handle versions with leading zeros in parts', () => {
      expect(compareVersions('1.02.3', '1.2.3')).toBe(0)
      expect(compareVersions('1.2.03', '1.2.3')).toBe(0)
    })
  })

  describe('real-world version examples', () => {
    it('should handle typical marketplace extension versions', () => {
      expect(compareVersions('0.1.0', '0.2.0')).toBe(-1)
      expect(compareVersions('1.0.0', '0.9.9')).toBe(1)
      expect(compareVersions('2.0.0', '1.99.99')).toBe(1)
    })
  })
})

describe('isNewerVersion', () => {
  it('should return true when version2 is newer', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true)
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true)
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(true)
  })

  it('should return false when version2 is older', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false)
    expect(isNewerVersion('2.0.0', '1.0.0')).toBe(false)
  })

  it('should return false when versions are equal', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('2.5.3', '2.5.3')).toBe(false)
  })

  it('should handle pre-release versions', () => {
    expect(isNewerVersion('1.0.0-beta', '1.0.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.0.0-beta')).toBe(false)
  })
})
