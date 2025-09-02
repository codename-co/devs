import { describe, it, expect } from 'vitest'
import { encodeSetupData, decodeSetupData } from '@/lib/easy-setup'

describe('Easy Setup System', () => {
  // Note: Encryption tests are skipped in Node.js environment
  // as Web Crypto API is not available. These would work in browser.

  it('should encode and decode setup data correctly', () => {
    const setupData = {
      v: '1',
      d: 'encrypted-string',
      p: {
        a: [],
        n: 'Test Team 🚀',
      },
    }

    const encoded = encodeSetupData(setupData)
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)

    const decoded = decodeSetupData(encoded)
    expect(decoded).toEqual(setupData)
  })

  it('should handle URL-safe encoding correctly', () => {
    const setupData = {
      v: '1',
      d: 'data-with-special-chars+/=',
      p: {
        a: [],
        n: 'Team with Unicode: 你好 🌟',
      },
    }

    const encoded = encodeSetupData(setupData)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')

    const decoded = decodeSetupData(encoded)
    expect(decoded).toEqual(setupData)
  })

  it('should reject invalid setup data', () => {
    expect(() => decodeSetupData('invalid-data')).toThrow(
      'Invalid setup data format',
    )

    // Missing required fields
    const invalidData = { v: '1' }
    const encoded = btoa(JSON.stringify(invalidData))
    expect(() => decodeSetupData(encoded)).toThrow(
      'Invalid setup data structure',
    )
  })

  it('should handle large data without stack overflow', () => {
    // Create a large setup data object
    const largeAgents = Array.from({ length: 100 }, (_, i) => ({
      n: `Agent ${i} with Unicode 🤖`,
      r: `Role ${i}`,
      i: `This is a very long instruction set ${'x'.repeat(1000)} for agent ${i}`,
    }))

    const largeSetupData = {
      v: '1',
      d: 'encrypted-data',
      p: {
        a: largeAgents,
        n: 'Large Team Test 🚀'.repeat(100),
      },
    }

    // This should not throw a stack overflow error
    expect(() => {
      const encoded = encodeSetupData(largeSetupData)
      const decoded = decodeSetupData(encoded)
      expect(decoded.p.a).toHaveLength(100)
      expect(decoded.p.n).toContain('🚀')
    }).not.toThrow()
  })
})
