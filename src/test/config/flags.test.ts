import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_FLAGS,
  configureFlags,
  getFlags,
  getFlagSource,
  isManaged,
  resetFlags,
  resolveFlags,
  TIER_PRECEDENCE,
} from '@/config/flags'

describe('config/flags — seam defaults', () => {
  beforeEach(() => resetFlags())

  it('defaults every flag to the legacy/off path', () => {
    expect(DEFAULT_FLAGS).toEqual({
      engine: { llm: 'legacy' },
      orchestrator: { mode: 'legacy' },
      tools: { transport: 'builtin' },
      harness: { workspace: 'memory', compaction: 'off' },
      governance: { budget: 'off' },
    })
  })

  it('getFlags() returns defaults before any policy is configured', () => {
    expect(getFlags()).toEqual(DEFAULT_FLAGS)
    expect(getFlagSource('engine.llm')).toBe('default')
    expect(isManaged('engine.llm')).toBe(false)
  })

  it('does not leak mutations between the default and the live snapshot', () => {
    getFlags().engine.llm = 'ai-sdk'
    expect(DEFAULT_FLAGS.engine.llm).toBe('legacy')
    resetFlags()
    expect(getFlags().engine.llm).toBe('legacy')
  })
})

describe('config/flags — tier resolution', () => {
  it('a higher-precedence tier wins per-leaf', () => {
    const { flags, sources } = resolveFlags({
      user: { engine: { llm: 'ai-sdk' } },
      project: { engine: { llm: 'fetch' } },
    })
    expect(flags.engine.llm).toBe('fetch')
    expect(sources['engine.llm']).toBe('project')
  })

  it('lists Managed as the highest precedence tier', () => {
    expect(TIER_PRECEDENCE[0]).toBe('managed')
  })

  it('Managed cannot be overridden by any lower tier', () => {
    const { flags, sources } = resolveFlags({
      managed: { engine: { llm: 'ai-sdk' } },
      override: { engine: { llm: 'fetch' } },
      user: { engine: { llm: 'legacy' } },
    })
    expect(flags.engine.llm).toBe('ai-sdk')
    expect(sources['engine.llm']).toBe('managed')
  })

  it('falls back to default for unset leaves', () => {
    const { flags, sources } = resolveFlags({
      managed: { governance: { budget: 'hard-cap' } },
    })
    expect(flags.governance.budget).toBe('hard-cap')
    expect(sources['governance.budget']).toBe('managed')
    expect(flags.engine.llm).toBe('legacy')
    expect(sources['engine.llm']).toBe('default')
  })

  it('resolves partial nested layers without dropping siblings', () => {
    const { flags } = resolveFlags({
      managed: { harness: { compaction: 'on' } },
    })
    expect(flags.harness.compaction).toBe('on')
    expect(flags.harness.workspace).toBe('memory')
  })
})

describe('config/flags — app-wide accessor', () => {
  beforeEach(() => resetFlags())

  it('configureFlags installs a resolved snapshot readable app-wide', () => {
    configureFlags(
      resolveFlags({ managed: { engine: { llm: 'fetch' } } }),
    )
    expect(getFlags().engine.llm).toBe('fetch')
    expect(isManaged('engine.llm')).toBe(true)
    expect(getFlagSource('engine.llm')).toBe('managed')
  })
})
