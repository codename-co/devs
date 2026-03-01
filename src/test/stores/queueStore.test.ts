import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueuedTaskEntry } from '@/types'
import { createMockToast } from '../stores/mocks'

// Create mocks
const mockToast = createMockToast()

// Mock Yjs queuedTasks map
const mockQueuedTasksMap = new Map<string, QueuedTaskEntry>()

vi.mock('@/lib/yjs', () => ({
  queuedTasks: {
    get: (id: string) => mockQueuedTasksMap.get(id),
    set: (id: string, value: QueuedTaskEntry) =>
      mockQueuedTasksMap.set(id, value),
    has: (id: string) => mockQueuedTasksMap.has(id),
    delete: (id: string) => mockQueuedTasksMap.delete(id),
    values: () => mockQueuedTasksMap.values(),
    keys: () => mockQueuedTasksMap.keys(),
    entries: () => mockQueuedTasksMap.entries(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  },
  whenReady: Promise.resolve(),
  isReady: () => true,
}))

vi.mock('@/lib/toast', () => mockToast)

let queueStore: typeof import('@/stores/queueStore')

function createTestEntry(
  overrides: Partial<QueuedTaskEntry> = {},
): QueuedTaskEntry {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `entry-${Date.now()}-${Math.random()}`,
    prompt: overrides.prompt ?? 'Test prompt',
    priority: overrides.priority ?? 'normal',
    runState: overrides.runState ?? 'queued',
    progress: overrides.progress ?? 0,
    createdAt: overrides.createdAt ?? now,
    ...overrides,
  }
}

describe('queueStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockQueuedTasksMap.clear()
    vi.resetModules()

    // Re-mock after resetModules
    vi.doMock('@/lib/yjs', () => ({
      queuedTasks: {
        get: (id: string) => mockQueuedTasksMap.get(id),
        set: (id: string, value: QueuedTaskEntry) =>
          mockQueuedTasksMap.set(id, value),
        has: (id: string) => mockQueuedTasksMap.has(id),
        delete: (id: string) => mockQueuedTasksMap.delete(id),
        values: () => mockQueuedTasksMap.values(),
        keys: () => mockQueuedTasksMap.keys(),
        entries: () => mockQueuedTasksMap.entries(),
        observe: vi.fn(),
        unobserve: vi.fn(),
      },
      whenReady: Promise.resolve(),
      isReady: () => true,
    }))
    vi.doMock('@/lib/toast', () => mockToast)

    queueStore = await import('@/stores/queueStore')
  })

  describe('enqueue', () => {
    it('should add a task to the queue', async () => {
      const entry = await queueStore.enqueueTask({
        prompt: 'Build me a website',
      })

      expect(entry).toBeDefined()
      expect(entry.prompt).toBe('Build me a website')
      expect(entry.priority).toBe('normal')
      expect(entry.runState).toBe('queued')
      expect(entry.progress).toBe(0)
      expect(entry.createdAt).toBeDefined()
      expect(mockQueuedTasksMap.has(entry.id)).toBe(true)
    })

    it('should respect custom priority', async () => {
      const entry = await queueStore.enqueueTask({
        prompt: 'Urgent task',
        priority: 'critical',
      })

      expect(entry.priority).toBe('critical')
    })

    it('should set runState to scheduled when schedule is provided', async () => {
      const entry = await queueStore.enqueueTask({
        prompt: 'Scheduled task',
        schedule: { intervalMs: 3600000 },
      })

      expect(entry.runState).toBe('scheduled')
    })

    it('should store approval gates', async () => {
      const gates = [
        {
          id: 'gate-1',
          trigger: 'before-execution' as const,
          status: 'pending' as const,
          autoApprovePolicy: 'never' as const,
        },
      ]

      const entry = await queueStore.enqueueTask({
        prompt: 'Gated task',
        approvalGates: gates,
      })

      expect(entry.approvalGates).toHaveLength(1)
      expect(entry.approvalGates![0].trigger).toBe('before-execution')
    })

    it('should preserve activated skills', async () => {
      const skills = [{ name: 'test-skill', skillMdContent: '# Test' }]
      const entry = await queueStore.enqueueTask({
        prompt: 'Skilled task',
        activatedSkills: skills,
      })

      expect(entry.activatedSkills).toHaveLength(1)
      expect(entry.activatedSkills![0].name).toBe('test-skill')
    })
  })

  describe('getReadyEntries', () => {
    it('should return only queued entries without errors', async () => {
      const entry1 = createTestEntry({ id: 'e1', runState: 'queued' })
      const entry2 = createTestEntry({ id: 'e2', runState: 'running' })
      const entry3 = createTestEntry({ id: 'e3', runState: 'queued' })
      const entry4 = createTestEntry({
        id: 'e4',
        runState: 'queued',
        completedAt: new Date().toISOString(),
      })

      mockQueuedTasksMap.set('e1', entry1)
      mockQueuedTasksMap.set('e2', entry2)
      mockQueuedTasksMap.set('e3', entry3)
      mockQueuedTasksMap.set('e4', entry4)

      const ready = queueStore.getReadyEntries()

      expect(ready).toHaveLength(2)
      expect(ready.map((e) => e.id)).toContain('e1')
      expect(ready.map((e) => e.id)).toContain('e3')
    })

    it('should exclude entries with pending before-execution gates', async () => {
      const entry = createTestEntry({
        id: 'gated',
        runState: 'queued',
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })
      mockQueuedTasksMap.set('gated', entry)

      const ready = queueStore.getReadyEntries()
      expect(ready).toHaveLength(0)
    })

    it('should sort by priority (critical first)', async () => {
      const low = createTestEntry({
        id: 'low',
        priority: 'low',
        runState: 'queued',
      })
      const crit = createTestEntry({
        id: 'crit',
        priority: 'critical',
        runState: 'queued',
      })
      const normal = createTestEntry({
        id: 'normal',
        priority: 'normal',
        runState: 'queued',
      })

      mockQueuedTasksMap.set('low', low)
      mockQueuedTasksMap.set('crit', crit)
      mockQueuedTasksMap.set('normal', normal)

      const ready = queueStore.getReadyEntries()

      expect(ready[0].id).toBe('crit')
      expect(ready[1].id).toBe('normal')
      expect(ready[2].id).toBe('low')
    })
  })

  describe('markStarted', () => {
    it('should set runState to running and set startedAt', async () => {
      const entry = createTestEntry({ id: 'start-me' })
      mockQueuedTasksMap.set('start-me', entry)

      await queueStore.markQueueStarted('start-me', 'client-1')

      const updated = mockQueuedTasksMap.get('start-me')!
      expect(updated.runState).toBe('running')
      expect(updated.startedAt).toBeDefined()
      expect(updated.ownerClientId).toBe('client-1')
    })
  })

  describe('updateProgress', () => {
    it('should update progress and status message', async () => {
      const entry = createTestEntry({ id: 'progress-me', runState: 'running' })
      mockQueuedTasksMap.set('progress-me', entry)

      await queueStore.updateQueueProgress(
        'progress-me',
        50,
        'Halfway done',
        2,
        4,
      )

      const updated = mockQueuedTasksMap.get('progress-me')!
      expect(updated.progress).toBe(50)
      expect(updated.statusMessage).toBe('Halfway done')
      expect(updated.subTasksCompleted).toBe(2)
      expect(updated.subTasksTotal).toBe(4)
    })

    it('should clamp progress to 0-100', async () => {
      const entry = createTestEntry({ id: 'clamp-me', runState: 'running' })
      mockQueuedTasksMap.set('clamp-me', entry)

      await queueStore.updateQueueProgress('clamp-me', 150)

      const updated = mockQueuedTasksMap.get('clamp-me')!
      expect(updated.progress).toBe(100)
    })
  })

  describe('markCompleted', () => {
    it('should set completedAt and progress to 100', async () => {
      const entry = createTestEntry({ id: 'complete-me', runState: 'running' })
      mockQueuedTasksMap.set('complete-me', entry)

      await queueStore.markQueueCompleted('complete-me', 'wf-123')

      const updated = mockQueuedTasksMap.get('complete-me')!
      expect(updated.completedAt).toBeDefined()
      expect(updated.progress).toBe(100)
      expect(updated.workflowId).toBe('wf-123')
    })
  })

  describe('markFailed', () => {
    it('should set error and completedAt', async () => {
      const entry = createTestEntry({ id: 'fail-me', runState: 'running' })
      mockQueuedTasksMap.set('fail-me', entry)

      await queueStore.markQueueFailed('fail-me', 'Token limit exceeded')

      const updated = mockQueuedTasksMap.get('fail-me')!
      expect(updated.error).toBe('Token limit exceeded')
      expect(updated.completedAt).toBeDefined()
    })
  })

  describe('cancel', () => {
    it('should set runState to cancelled', async () => {
      const entry = createTestEntry({ id: 'cancel-me', runState: 'queued' })
      mockQueuedTasksMap.set('cancel-me', entry)

      const result = await queueStore.cancelQueueEntry('cancel-me')

      expect(result).toBe(true)
      const updated = mockQueuedTasksMap.get('cancel-me')!
      expect(updated.runState).toBe('cancelled')
    })

    it('should return false for non-existent entry', async () => {
      const result = await queueStore.cancelQueueEntry('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('pause and resume', () => {
    it('should pause a running entry', async () => {
      const entry = createTestEntry({ id: 'pause-me', runState: 'running' })
      mockQueuedTasksMap.set('pause-me', entry)

      const store = queueStore.useQueueStore.getState()
      const result = await store.pause('pause-me')

      expect(result).toBe(true)
      const updated = mockQueuedTasksMap.get('pause-me')!
      expect(updated.runState).toBe('paused')
    })

    it('should resume a paused entry', async () => {
      const entry = createTestEntry({
        id: 'resume-me',
        runState: 'paused' as any,
      })
      mockQueuedTasksMap.set('resume-me', entry)

      const store = queueStore.useQueueStore.getState()
      const result = await store.resume('resume-me')

      expect(result).toBe(true)
      const updated = mockQueuedTasksMap.get('resume-me')!
      expect(updated.runState).toBe('running')
    })

    it('should not pause a non-running entry', async () => {
      const entry = createTestEntry({ id: 'no-pause', runState: 'queued' })
      mockQueuedTasksMap.set('no-pause', entry)

      const store = queueStore.useQueueStore.getState()
      const result = await store.pause('no-pause')

      expect(result).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      mockQueuedTasksMap.set(
        'q1',
        createTestEntry({ id: 'q1', runState: 'queued' }),
      )
      mockQueuedTasksMap.set(
        'r1',
        createTestEntry({ id: 'r1', runState: 'running' }),
      )
      mockQueuedTasksMap.set(
        's1',
        createTestEntry({ id: 's1', runState: 'scheduled' }),
      )
      mockQueuedTasksMap.set(
        'c1',
        createTestEntry({
          id: 'c1',
          runState: 'queued',
          completedAt: new Date().toISOString(),
        }),
      )
      mockQueuedTasksMap.set(
        'f1',
        createTestEntry({ id: 'f1', runState: 'queued', error: 'Failed' }),
      )
      mockQueuedTasksMap.set(
        'x1',
        createTestEntry({ id: 'x1', runState: 'cancelled' }),
      )

      const stats = queueStore.getQueueStats()

      expect(stats.total).toBe(6)
      expect(stats.queued).toBe(1)
      expect(stats.running).toBe(1)
      expect(stats.scheduled).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.cancelled).toBe(1)
    })
  })

  describe('prune', () => {
    it('should remove old completed entries', async () => {
      const oldDate = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString()
      mockQueuedTasksMap.set(
        'old1',
        createTestEntry({
          id: 'old1',
          completedAt: oldDate,
          runState: 'queued',
        }),
      )
      mockQueuedTasksMap.set(
        'new1',
        createTestEntry({ id: 'new1', runState: 'queued' }),
      )

      const pruned = await queueStore.pruneQueue(7 * 24 * 60 * 60 * 1000)

      expect(pruned).toBe(1)
      expect(mockQueuedTasksMap.has('old1')).toBe(false)
      expect(mockQueuedTasksMap.has('new1')).toBe(true)
    })
  })

  describe('getDueScheduledEntries', () => {
    it('should return scheduled entries whose nextRunAt has passed', async () => {
      const past = new Date(Date.now() - 60000).toISOString()
      const future = new Date(Date.now() + 600000).toISOString()

      mockQueuedTasksMap.set(
        'due',
        createTestEntry({
          id: 'due',
          runState: 'scheduled',
          nextRunAt: past,
        }),
      )
      mockQueuedTasksMap.set(
        'not-due',
        createTestEntry({
          id: 'not-due',
          runState: 'scheduled',
          nextRunAt: future,
        }),
      )

      const due = queueStore.getDueScheduledEntries()
      expect(due).toHaveLength(1)
      expect(due[0].id).toBe('due')
    })
  })

  describe('deleteEntry', () => {
    it('should remove entry from Yjs map', async () => {
      const entry = createTestEntry({ id: 'delete-me' })
      mockQueuedTasksMap.set('delete-me', entry)

      const store = queueStore.useQueueStore.getState()
      await store.deleteEntry('delete-me')

      expect(mockQueuedTasksMap.has('delete-me')).toBe(false)
    })
  })
})

describe('parseCronNextRun', () => {
  let parseCronNextRun: typeof import('@/stores/queueStore').parseCronNextRun

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    vi.doMock('@/lib/yjs', () => ({
      queuedTasks: {
        get: (id: string) => mockQueuedTasksMap.get(id),
        set: (id: string, value: QueuedTaskEntry) =>
          mockQueuedTasksMap.set(id, value),
        has: (id: string) => mockQueuedTasksMap.has(id),
        delete: (id: string) => mockQueuedTasksMap.delete(id),
        values: () => mockQueuedTasksMap.values(),
        keys: () => mockQueuedTasksMap.keys(),
        entries: () => mockQueuedTasksMap.entries(),
        observe: vi.fn(),
        unobserve: vi.fn(),
      },
      whenReady: Promise.resolve(),
      isReady: () => true,
    }))
    vi.doMock('@/lib/toast', () => mockToast)

    const mod = await import('@/stores/queueStore')
    parseCronNextRun = mod.parseCronNextRun
  })

  it('should handle interval patterns like */30', () => {
    const from = new Date('2026-03-01T10:00:00Z')
    const next = parseCronNextRun('*/30 * * * *', from)

    // */30 means "every 30 minutes" — should add 30 minutes to from
    expect(next.getTime() - from.getTime()).toBe(30 * 60 * 1000)
  })

  it('should handle specific time patterns', () => {
    const from = new Date('2026-03-01T08:00:00Z') // Before 9am
    const next = parseCronNextRun('0 9 * * *', from)

    expect(next.getHours()).toBe(9)
    expect(next.getMinutes()).toBe(0)
  })

  it('should fall back to 1h for invalid cron', () => {
    const from = new Date('2026-03-01T10:00:00Z')
    const next = parseCronNextRun('invalid', from)

    expect(next.getTime()).toBe(from.getTime() + 3600_000)
  })
})
