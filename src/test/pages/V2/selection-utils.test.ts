import { describe, it, expect } from 'vitest'
import {
  parseThreadIds,
  serializeThreadIds,
  encodeId,
  decodeId,
  selectItem,
  addItem,
  removeItem,
  togglePin,
  MAX_PREVIEWS,
  type SelectionState,
} from '@/pages/V2/lib/selection-utils'

describe('parseThreadIds', () => {
  it('returns empty state for undefined/empty input', () => {
    expect(parseThreadIds(undefined)).toEqual({
      allIds: [],
      pinnedIds: [],
      activeId: undefined,
    })
    expect(parseThreadIds('')).toEqual({
      allIds: [],
      pinnedIds: [],
      activeId: undefined,
    })
  })

  it('parses a single ID', () => {
    expect(parseThreadIds('abc123')).toEqual({
      allIds: ['abc123'],
      pinnedIds: [],
      activeId: 'abc123',
    })
  })

  it('parses comma-separated IDs', () => {
    expect(parseThreadIds('abc,def,ghi')).toEqual({
      allIds: ['abc', 'def', 'ghi'],
      pinnedIds: [],
      activeId: 'ghi',
    })
  })

  it('parses pinned IDs (! prefix)', () => {
    expect(parseThreadIds('!abc,def')).toEqual({
      allIds: ['abc', 'def'],
      pinnedIds: ['abc'],
      activeId: 'def',
    })
  })

  it('parses multiple pinned IDs', () => {
    expect(parseThreadIds('!abc,!def,ghi')).toEqual({
      allIds: ['abc', 'def', 'ghi'],
      pinnedIds: ['abc', 'def'],
      activeId: 'ghi',
    })
  })

  it('handles all pinned (last is still activeId)', () => {
    expect(parseThreadIds('!abc,!def')).toEqual({
      allIds: ['abc', 'def'],
      pinnedIds: ['abc', 'def'],
      activeId: 'def',
    })
  })

  it('filters out empty segments', () => {
    expect(parseThreadIds(',abc,,def,')).toEqual({
      allIds: ['abc', 'def'],
      pinnedIds: [],
      activeId: 'def',
    })
  })
})

describe('serializeThreadIds', () => {
  it('returns empty string for empty state', () => {
    expect(
      serializeThreadIds({ allIds: [], pinnedIds: [], activeId: undefined }),
    ).toBe('')
  })

  it('serializes a single ID', () => {
    expect(
      serializeThreadIds({
        allIds: ['abc'],
        pinnedIds: [],
        activeId: 'abc',
      }),
    ).toBe('abc')
  })

  it('serializes with pinned prefix', () => {
    expect(
      serializeThreadIds({
        allIds: ['abc', 'def'],
        pinnedIds: ['abc'],
        activeId: 'def',
      }),
    ).toBe('!abc,def')
  })

  it('serializes multiple pinned', () => {
    expect(
      serializeThreadIds({
        allIds: ['abc', 'def', 'ghi'],
        pinnedIds: ['abc', 'def'],
        activeId: 'ghi',
      }),
    ).toBe('!abc,!def,ghi')
  })

  it('round-trips with parseThreadIds', () => {
    const inputs = ['abc', '!abc,def', '!abc,!def,ghi', '!abc,!def']
    for (const input of inputs) {
      expect(serializeThreadIds(parseThreadIds(input))).toBe(input)
    }
  })
})

describe('selectItem', () => {
  it('replaces everything when no pinned IDs', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(selectItem(current, 'xyz')).toEqual({
      allIds: ['xyz'],
      pinnedIds: [],
      activeId: 'xyz',
    })
  })

  it('keeps pinned IDs and replaces active', () => {
    const current: SelectionState = {
      allIds: ['abc', 'def'],
      pinnedIds: ['abc'],
      activeId: 'def',
    }
    expect(selectItem(current, 'xyz')).toEqual({
      allIds: ['abc', 'xyz'],
      pinnedIds: ['abc'],
      activeId: 'xyz',
    })
  })

  it('does not duplicate if selecting an already-pinned ID', () => {
    const current: SelectionState = {
      allIds: ['abc', 'def'],
      pinnedIds: ['abc'],
      activeId: 'def',
    }
    expect(selectItem(current, 'abc')).toEqual({
      allIds: ['abc'],
      pinnedIds: ['abc'],
      activeId: 'abc',
    })
  })

  it('replaces active when selecting the same active ID (no-op effectively)', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(selectItem(current, 'abc')).toEqual({
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    })
  })

  it('sets first selection from empty state', () => {
    const current: SelectionState = {
      allIds: [],
      pinnedIds: [],
      activeId: undefined,
    }
    expect(selectItem(current, 'abc')).toEqual({
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    })
  })
})

describe('addItem', () => {
  it('appends a new item', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(addItem(current, 'def')).toEqual({
      allIds: ['abc', 'def'],
      pinnedIds: [],
      activeId: 'def',
    })
  })

  it('does not add duplicate IDs', () => {
    const current: SelectionState = {
      allIds: ['abc', 'def'],
      pinnedIds: [],
      activeId: 'def',
    }
    expect(addItem(current, 'abc')).toEqual(current)
  })

  it('caps at MAX_PREVIEWS by replacing the active item', () => {
    const current: SelectionState = {
      allIds: ['a', 'b', 'c'],
      pinnedIds: ['a'],
      activeId: 'c',
    }
    // Adding 'd' when already at max: replace last non-pinned active
    const result = addItem(current, 'd')
    expect(result.allIds.length).toBeLessThanOrEqual(MAX_PREVIEWS)
    expect(result.allIds).toContain('a') // pinned stays
    expect(result.allIds).toContain('d') // new item added
    expect(result.activeId).toBe('d')
  })

  it('adds from empty state', () => {
    const current: SelectionState = {
      allIds: [],
      pinnedIds: [],
      activeId: undefined,
    }
    expect(addItem(current, 'abc')).toEqual({
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    })
  })
})

describe('removeItem', () => {
  it('removes the only item', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(removeItem(current, 'abc')).toEqual({
      allIds: [],
      pinnedIds: [],
      activeId: undefined,
    })
  })

  it('removes a pinned item', () => {
    const current: SelectionState = {
      allIds: ['abc', 'def'],
      pinnedIds: ['abc'],
      activeId: 'def',
    }
    expect(removeItem(current, 'abc')).toEqual({
      allIds: ['def'],
      pinnedIds: [],
      activeId: 'def',
    })
  })

  it('removes the active item, promoting previous to active', () => {
    const current: SelectionState = {
      allIds: ['abc', 'def'],
      pinnedIds: ['abc'],
      activeId: 'def',
    }
    expect(removeItem(current, 'def')).toEqual({
      allIds: ['abc'],
      pinnedIds: ['abc'],
      activeId: 'abc',
    })
  })

  it('does nothing for non-existent ID', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(removeItem(current, 'xyz')).toEqual(current)
  })
})

describe('togglePin', () => {
  it('pins an unpinned item', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(togglePin(current, 'abc')).toEqual({
      allIds: ['abc'],
      pinnedIds: ['abc'],
      activeId: 'abc',
    })
  })

  it('unpins a pinned item', () => {
    const current: SelectionState = {
      allIds: ['abc', 'def'],
      pinnedIds: ['abc'],
      activeId: 'def',
    }
    expect(togglePin(current, 'abc')).toEqual({
      allIds: ['abc', 'def'],
      pinnedIds: [],
      activeId: 'def',
    })
  })

  it('does nothing for non-existent ID', () => {
    const current: SelectionState = {
      allIds: ['abc'],
      pinnedIds: [],
      activeId: 'abc',
    }
    expect(togglePin(current, 'xyz')).toEqual(current)
  })
})

describe('encodeId / decodeId', () => {
  const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'

  it('encodes a UUID to a shorter base64url string', () => {
    const encoded = encodeId(TEST_UUID)
    expect(encoded).not.toBe(TEST_UUID)
    expect(encoded.length).toBe(22) // 16 bytes → 22 base64url chars
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('=')
  })

  it('decodes a base64url string back to the original UUID', () => {
    const encoded = encodeId(TEST_UUID)
    expect(decodeId(encoded)).toBe(TEST_UUID)
  })

  it('passes non-UUID IDs through unchanged', () => {
    expect(encodeId('devs')).toBe('devs')
    expect(encodeId('custom-1712345678901-k3m8v2nxq')).toBe(
      'custom-1712345678901-k3m8v2nxq',
    )
    expect(encodeId('abc')).toBe('abc')
  })

  it('passes non-encoded IDs through decodeId unchanged', () => {
    expect(decodeId('devs')).toBe('devs')
    expect(decodeId('abc')).toBe('abc')
    expect(decodeId(TEST_UUID)).toBe(TEST_UUID)
  })
})

describe('parseThreadIds / serializeThreadIds with UUIDs', () => {
  const UUID_A = '550e8400-e29b-41d4-a716-446655440000'
  const UUID_B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

  it('round-trips a single UUID through serialize → parse', () => {
    const state: SelectionState = {
      allIds: [UUID_A],
      pinnedIds: [],
      activeId: UUID_A,
    }
    const serialized = serializeThreadIds(state)
    expect(serialized).not.toContain(UUID_A) // should be encoded
    const parsed = parseThreadIds(serialized)
    expect(parsed.allIds).toEqual([UUID_A])
    expect(parsed.activeId).toBe(UUID_A)
  })

  it('round-trips multiple UUIDs with pinning', () => {
    const state: SelectionState = {
      allIds: [UUID_A, UUID_B],
      pinnedIds: [UUID_A],
      activeId: UUID_B,
    }
    const serialized = serializeThreadIds(state)
    expect(serialized).toContain('!')
    const parsed = parseThreadIds(serialized)
    expect(parsed.allIds).toEqual([UUID_A, UUID_B])
    expect(parsed.pinnedIds).toEqual([UUID_A])
    expect(parsed.activeId).toBe(UUID_B)
  })

  it('handles mixed UUIDs and non-UUID IDs', () => {
    const state: SelectionState = {
      allIds: [UUID_A, 'devs'],
      pinnedIds: [UUID_A],
      activeId: 'devs',
    }
    const serialized = serializeThreadIds(state)
    expect(serialized).toContain('devs')
    const parsed = parseThreadIds(serialized)
    expect(parsed.allIds).toEqual([UUID_A, 'devs'])
    expect(parsed.pinnedIds).toEqual([UUID_A])
    expect(parsed.activeId).toBe('devs')
  })
})
