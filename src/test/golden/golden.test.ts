import { describe, it, expect, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import {
  GOLDEN_ROOT,
  assertMatchesGolden,
  collect,
  isRecording,
  loadGolden,
  recordGolden,
  stableStringify,
} from '@/test/golden'

const SELFTEST_DIR = path.join(GOLDEN_ROOT, '_selftest')

afterAll(async () => {
  // Keep the fixtures tree clean; remove anything this test recorded.
  await fs.rm(SELFTEST_DIR, { recursive: true, force: true })
})

describe('golden harness — serialisation', () => {
  it('stableStringify is key-order independent', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
  })

  it('stableStringify preserves array order', () => {
    expect(stableStringify([3, 1, 2])).toContain('[\n  3,\n  1,\n  2\n]')
  })
})

describe('golden harness — record/replay', () => {
  it('refuses to record without UPDATE_GOLDEN=1', async () => {
    if (isRecording()) return // recording mode: this guard is intentionally off
    await expect(recordGolden('_selftest/nope', { x: 1 })).rejects.toThrow(
      /UPDATE_GOLDEN/,
    )
  })

  it('reports a missing fixture as undefined', async () => {
    expect(await loadGolden('_selftest/does-not-exist')).toBeUndefined()
  })

  it('collect() drains an async iterable in order', async () => {
    async function* gen() {
      yield 'a'
      yield 'b'
      yield 'c'
    }
    expect(await collect(gen())).toEqual(['a', 'b', 'c'])
  })

  it('assertMatchesGolden round-trips a recorded fixture', async () => {
    const parts = [
      { type: 'text-delta', delta: 'Hello' },
      { type: 'tool-call', toolName: 'calculate', args: { a: 1, b: 2 } },
      { type: 'finish', finishReason: 'stop' },
    ]
    // Force-record via the low-level API regardless of ambient env.
    const prev = process.env.UPDATE_GOLDEN
    process.env.UPDATE_GOLDEN = '1'
    try {
      await recordGolden('_selftest/stream', parts)
    } finally {
      if (prev === undefined) delete process.env.UPDATE_GOLDEN
      else process.env.UPDATE_GOLDEN = prev
    }

    // In replay mode this asserts equivalence; key order must not matter.
    if (!isRecording()) {
      await assertMatchesGolden('_selftest/stream', [
        { delta: 'Hello', type: 'text-delta' },
        { args: { b: 2, a: 1 }, toolName: 'calculate', type: 'tool-call' },
        { finishReason: 'stop', type: 'finish' },
      ])
    }
  })
})
