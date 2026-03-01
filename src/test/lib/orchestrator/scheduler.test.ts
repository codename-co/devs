import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { QueuedTaskEntry } from '@/types'

// Mock BroadcastChannel (not available in jsdom)
const mockBroadcastChannel = {
  postMessage: vi.fn(),
  close: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
}
vi.stubGlobal(
  'BroadcastChannel',
  vi.fn(() => mockBroadcastChannel),
)

// Mock queueStore functions
const mockGetReadyEntries = vi.fn((): QueuedTaskEntry[] => [])
const mockGetRunningEntries = vi.fn((): QueuedTaskEntry[] => [])
const mockGetDueScheduledEntries = vi.fn((): QueuedTaskEntry[] => [])
const mockMarkQueueStarted = vi.fn()
const mockUpdateQueueProgress = vi.fn()
const mockMarkQueueCompleted = vi.fn()
const mockMarkQueueFailed = vi.fn()
const mockUpdateEntry = vi.fn()

vi.mock('@/stores/queueStore', () => ({
  useQueueStore: {
    getState: () => ({
      updateEntry: mockUpdateEntry,
    }),
  },
  getReadyEntries: () => mockGetReadyEntries(),
  getRunningEntries: () => mockGetRunningEntries(),
  getDueScheduledEntries: () => mockGetDueScheduledEntries(),
  markQueueStarted: (...args: unknown[]) => mockMarkQueueStarted(...args),
  updateQueueProgress: (...args: unknown[]) => mockUpdateQueueProgress(...args),
  markQueueCompleted: (...args: unknown[]) => mockMarkQueueCompleted(...args),
  markQueueFailed: (...args: unknown[]) => mockMarkQueueFailed(...args),
  MAX_CONCURRENT: 3,
}))

// Mock engine.orchestrate
vi.mock('@/lib/orchestrator/engine', () => ({
  orchestrate: vi.fn().mockResolvedValue({
    success: true,
    workflowId: 'wf-test-123',
    mainTaskId: 'task-test-123',
    subTaskIds: [],
    artifacts: [],
  }),
}))

let scheduler: typeof import('@/lib/orchestrator/scheduler')

describe('scheduler', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockBroadcastChannel.postMessage.mockClear()
    mockBroadcastChannel.close.mockClear()
    mockBroadcastChannel.onmessage = null

    vi.resetModules()
    vi.doMock('@/stores/queueStore', () => ({
      useQueueStore: {
        getState: () => ({
          updateEntry: mockUpdateEntry,
        }),
      },
      getReadyEntries: (): QueuedTaskEntry[] => mockGetReadyEntries(),
      getRunningEntries: (): QueuedTaskEntry[] => mockGetRunningEntries(),
      getDueScheduledEntries: (): QueuedTaskEntry[] =>
        mockGetDueScheduledEntries(),
      markQueueStarted: (...args: unknown[]) => mockMarkQueueStarted(...args),
      updateQueueProgress: (...args: unknown[]) =>
        mockUpdateQueueProgress(...args),
      markQueueCompleted: (...args: unknown[]) =>
        mockMarkQueueCompleted(...args),
      markQueueFailed: (...args: unknown[]) => mockMarkQueueFailed(...args),
      MAX_CONCURRENT: 3,
    }))

    scheduler = await import('@/lib/orchestrator/scheduler')
  })

  afterEach(() => {
    scheduler.stopScheduler()
    vi.useRealTimers()
  })

  describe('startScheduler / stopScheduler', () => {
    it('should start and stop without errors', () => {
      expect(() => scheduler.startScheduler()).not.toThrow()
      expect(() => scheduler.stopScheduler()).not.toThrow()
    })

    it('should not start twice', () => {
      scheduler.startScheduler()
      scheduler.startScheduler() // Second call should be no-op
      scheduler.stopScheduler()
    })
  })

  describe('isSchedulerLeader', () => {
    it('should return a boolean', () => {
      expect(typeof scheduler.isSchedulerLeader()).toBe('boolean')
    })
  })

  describe('getSchedulerClientId', () => {
    it('should return a string', () => {
      scheduler.startScheduler()
      const clientId = scheduler.getSchedulerClientId()
      expect(typeof clientId).toBe('string')
      expect(clientId.length).toBeGreaterThan(0)
    })
  })

  describe('forceTick', () => {
    it('should promote due scheduled entries', async () => {
      const dueEntry: QueuedTaskEntry = {
        id: 'due-1',
        prompt: 'Due task',
        priority: 'normal' as const,
        runState: 'scheduled' as const,
        progress: 0,
        createdAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() - 60000).toISOString(),
      }
      mockGetDueScheduledEntries.mockReturnValueOnce([dueEntry])
      mockGetRunningEntries.mockReturnValueOnce([])
      mockGetReadyEntries.mockReturnValueOnce([])

      await scheduler.forceTick()

      expect(mockUpdateEntry).toHaveBeenCalledWith('due-1', {
        runState: 'queued',
      })
    })

    it('should not dispatch if all slots are full', async () => {
      mockGetDueScheduledEntries.mockReturnValueOnce([])
      mockGetRunningEntries.mockReturnValueOnce([
        {
          id: '1',
          prompt: 'a',
          priority: 'normal',
          runState: 'running',
          progress: 0,
          createdAt: '',
        },
        {
          id: '2',
          prompt: 'b',
          priority: 'normal',
          runState: 'running',
          progress: 0,
          createdAt: '',
        },
        {
          id: '3',
          prompt: 'c',
          priority: 'normal',
          runState: 'running',
          progress: 0,
          createdAt: '',
        },
      ] as QueuedTaskEntry[])
      mockGetReadyEntries.mockReturnValueOnce([
        {
          id: 'ready-1',
          prompt: 'Ready',
          priority: 'normal',
          runState: 'queued',
          progress: 0,
          createdAt: '',
        },
      ] as QueuedTaskEntry[])

      await scheduler.forceTick()

      // Should not call markQueueStarted since all 3 slots are full
      expect(mockMarkQueueStarted).not.toHaveBeenCalled()
    })

    it('should dispatch ready entries when slots are available', async () => {
      const readyEntry: QueuedTaskEntry = {
        id: 'ready-1',
        prompt: 'Ready task',
        priority: 'normal',
        runState: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
      }

      mockGetDueScheduledEntries.mockReturnValueOnce([])
      mockGetRunningEntries.mockReturnValueOnce([])
      mockGetReadyEntries.mockReturnValueOnce([readyEntry])

      await scheduler.forceTick()

      // The dispatch is fire-and-forget, so markQueueStarted may be called async
      // We give it a moment to resolve
      await vi.advanceTimersByTimeAsync(100)

      expect(mockMarkQueueStarted).toHaveBeenCalledWith(
        'ready-1',
        expect.any(String),
      )
    })
  })

  describe('cancelScheduledTask', () => {
    it('should return false for unknown entry', () => {
      const result = scheduler.cancelScheduledTask('nonexistent')
      expect(result).toBe(false)
    })
  })
})
