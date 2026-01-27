/**
 * Tests for useHashRoute hook
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useHashRoute } from '@/hooks/useHashRoute'

describe('useHashRoute', () => {
  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = ''
  })

  afterEach(() => {
    window.location.hash = ''
  })

  describe('initial state', () => {
    it('should parse empty hash', () => {
      window.location.hash = ''
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.hash).toBe('')
      expect(result.current.segments).toEqual([])
    })

    it('should parse single segment hash', () => {
      window.location.hash = '#category'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.hash).toBe('category')
      expect(result.current.segments).toEqual(['category'])
    })

    it('should parse multi-segment hash', () => {
      window.location.hash = '#category/section/id'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.hash).toBe('category/section/id')
      expect(result.current.segments).toEqual(['category', 'section', 'id'])
    })

    it('should handle leading slash in hash', () => {
      window.location.hash = '#/category/section'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.segments).toEqual(['category', 'section'])
    })

    it('should handle trailing slash in hash', () => {
      window.location.hash = '#category/section/'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.segments).toEqual(['category', 'section'])
    })
  })

  describe('getSegment', () => {
    it('should return segment at valid index', () => {
      window.location.hash = '#category/section/id'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.getSegment(0)).toBe('category')
      expect(result.current.getSegment(1)).toBe('section')
      expect(result.current.getSegment(2)).toBe('id')
    })

    it('should return undefined for invalid index', () => {
      window.location.hash = '#category/section'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.getSegment(5)).toBeUndefined()
      expect(result.current.getSegment(-1)).toBeUndefined()
    })
  })

  describe('hasSegment', () => {
    it('should return true for existing segments', () => {
      window.location.hash = '#category/section'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.hasSegment(0)).toBe(true)
      expect(result.current.hasSegment(1)).toBe(true)
    })

    it('should return false for non-existing segments', () => {
      window.location.hash = '#category/section'
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.hasSegment(2)).toBe(false)
      expect(result.current.hasSegment(-1)).toBe(false)
    })
  })

  describe('setHash', () => {
    it('should update the hash', () => {
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.setHash('new/path/here')
      })

      expect(window.location.hash).toBe('#new/path/here')
    })

    it('should handle hash with leading #', () => {
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.setHash('#with/hash/prefix')
      })

      expect(window.location.hash).toBe('#with/hash/prefix')
    })
  })

  describe('updateSegment', () => {
    it('should update existing segment', () => {
      window.location.hash = '#category/section/id'
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.updateSegment(1, 'newSection')
      })

      expect(window.location.hash).toBe('#category/newSection/id')
    })

    it('should extend segments if index is beyond current length', () => {
      window.location.hash = '#category'
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.updateSegment(2, 'deep')
      })

      expect(window.location.hash).toBe('#category/deep')
    })
  })

  describe('pushSegment', () => {
    it('should add segment to the end', () => {
      window.location.hash = '#category/section'
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.pushSegment('newItem')
      })

      expect(window.location.hash).toBe('#category/section/newItem')
    })

    it('should work with empty hash', () => {
      window.location.hash = ''
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.pushSegment('first')
      })

      expect(window.location.hash).toBe('#first')
    })
  })

  describe('popSegment', () => {
    it('should remove the last segment', () => {
      window.location.hash = '#category/section/id'
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.popSegment()
      })

      expect(window.location.hash).toBe('#category/section')
    })

    it('should handle single segment', () => {
      window.location.hash = '#only'
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.popSegment()
      })

      expect(window.location.hash).toBe('')
    })

    it('should do nothing with empty hash', () => {
      window.location.hash = ''
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.popSegment()
      })

      expect(window.location.hash).toBe('')
    })
  })

  describe('clearHash', () => {
    it('should clear the hash', () => {
      window.location.hash = '#category/section/id'
      const { result } = renderHook(() => useHashRoute())

      act(() => {
        result.current.clearHash()
      })

      expect(window.location.hash).toBe('')
    })
  })

  describe('hashchange event', () => {
    it('should update state when hash changes externally', () => {
      const { result } = renderHook(() => useHashRoute())

      expect(result.current.segments).toEqual([])

      act(() => {
        window.location.hash = '#external/change'
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })

      expect(result.current.hash).toBe('external/change')
      expect(result.current.segments).toEqual(['external', 'change'])
    })
  })
})
