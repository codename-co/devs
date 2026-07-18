/**
 * Tests for the Frames-view (transcript) model-load-event overlap logic.
 *
 * Regression: very old, never-completed model download/init events were leaking
 * into unrelated tasks' Frames view because an incomplete event's end defaulted
 * to Date.now(), making it overlap every later session.
 */

import { describe, it, expect } from 'vitest'
import {
  loadEventEnd,
  loadEventOverlapsSession,
  INCOMPLETE_LOAD_MAX_MS,
} from '@/pages/Workspace/components/TranscriptView'

const NOW = 1_700_000_000_000
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('loadEventEnd', () => {
  it('uses completedAt when present', () => {
    expect(
      loadEventEnd({ startedAt: NOW - HOUR, completedAt: NOW - 30 * MIN }, NOW),
    ).toBe(NOW - 30 * MIN)
  })

  it('treats a recent incomplete event as running until now', () => {
    const startedAt = NOW - 2 * MIN
    expect(loadEventEnd({ startedAt }, NOW)).toBe(NOW)
  })

  it('treats a stale incomplete event as ending at its start (not now)', () => {
    const startedAt = NOW - 3 * DAY
    expect(loadEventEnd({ startedAt }, NOW)).toBe(startedAt)
  })

  it('uses the cap boundary to decide recency', () => {
    const justWithin = NOW - (INCOMPLETE_LOAD_MAX_MS - 1)
    const justOutside = NOW - (INCOMPLETE_LOAD_MAX_MS + 1)
    expect(loadEventEnd({ startedAt: justWithin }, NOW)).toBe(NOW)
    expect(loadEventEnd({ startedAt: justOutside }, NOW)).toBe(justOutside)
  })
})

describe('loadEventOverlapsSession', () => {
  // A recent session that ran for ~5 minutes.
  const sessionStart = NOW - 10 * MIN
  const sessionEnd = NOW - 5 * MIN

  it('excludes a very old, never-completed event (the reported bug)', () => {
    const stale = { startedAt: NOW - 5 * DAY } // no completedAt
    expect(
      loadEventOverlapsSession(stale, sessionStart, sessionEnd, NOW),
    ).toBe(false)
  })

  it('excludes an old completed event that finished before the session', () => {
    const old = { startedAt: NOW - 5 * DAY, completedAt: NOW - 5 * DAY + MIN }
    expect(loadEventOverlapsSession(old, sessionStart, sessionEnd, NOW)).toBe(
      false,
    )
  })

  it('includes a completed event that overlaps the session window', () => {
    const during = {
      startedAt: sessionStart - MIN,
      completedAt: sessionStart + MIN,
    }
    expect(
      loadEventOverlapsSession(during, sessionStart, sessionEnd, NOW),
    ).toBe(true)
  })

  it('includes a genuinely in-flight load during an ongoing session', () => {
    const ongoingSessionEnd = NOW // session not completed → end = now
    const running = { startedAt: NOW - 2 * MIN } // recent, no completedAt
    expect(
      loadEventOverlapsSession(running, NOW - 3 * MIN, ongoingSessionEnd, NOW),
    ).toBe(true)
  })
})
