/**
 * Tests for admin dashboard API layer.
 */
import { describe, it, expect } from 'vitest'
import { timeRangeToSince } from '@/lib/teams/admin-dashboard'

describe('Admin Dashboard', () => {
  describe('timeRangeToSince', () => {
    it('returns ISO string for 7d range', () => {
      const since = timeRangeToSince('7d')
      expect(since).toBeDefined()

      const date = new Date(since!)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeCloseTo(7, 0)
    })

    it('returns ISO string for 30d range', () => {
      const since = timeRangeToSince('30d')
      expect(since).toBeDefined()

      const date = new Date(since!)
      const now = new Date()
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeCloseTo(30, 0)
    })

    it('returns ISO string for 90d range', () => {
      const since = timeRangeToSince('90d')
      expect(since).toBeDefined()

      const date = new Date(since!)
      const now = new Date()
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeCloseTo(90, 0)
    })

    it('returns Jan 1 of current year for ytd range', () => {
      const since = timeRangeToSince('ytd')
      expect(since).toBeDefined()

      const date = new Date(since!)
      const now = new Date()

      expect(date.getFullYear()).toBe(now.getFullYear())
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(1)
    })

    it('returns undefined for all range', () => {
      const since = timeRangeToSince('all')
      expect(since).toBeUndefined()
    })
  })
})
