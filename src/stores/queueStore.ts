/**
 * Queue Store
 *
 * Yjs-backed store for persistent background task queue entries.
 * Replaces the in-memory TaskQueue for persistence across page reloads,
 * cross-tab awareness, and P2P sync.
 *
 * Follows the same pattern as workflowStore with Yjs as the source of truth,
 * Zustand for UI state, and reactive hooks for component subscriptions.
 *
 * @module stores/queueStore
 */

import { create } from 'zustand'
import { queuedTasks, whenReady, isReady } from '@/lib/yjs'
import type { QueuedTaskEntry, TaskPriority, TaskRunState } from '@/types'
import { errorToast } from '@/lib/toast'

// ============================================================================
// Date normalization (same pattern as workflowStore)
// ============================================================================

function normalizeYjsDate(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString()
  if (
    typeof value === 'string' &&
    value.length > 0 &&
    !isNaN(Date.parse(value))
  )
    return value
  if (typeof value === 'number') return new Date(value).toISOString()
  return new Date(0).toISOString()
}

// ============================================================================
// Priority values (lower = higher priority)
// ============================================================================

const PRIORITY_VALUES: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
}

// ============================================================================
// Terminal run states
// ============================================================================

const TERMINAL_RUN_STATES: TaskRunState[] = ['cancelled']
const COMPLETED_OR_FAILED = (entry: QueuedTaskEntry) =>
  !!entry.completedAt ||
  !!entry.error ||
  TERMINAL_RUN_STATES.includes(entry.runState)

// ============================================================================
// Helpers
// ============================================================================

function getAllEntries(): QueuedTaskEntry[] {
  return Array.from(queuedTasks.values()).map((entry) => {
    const e = entry as unknown as Record<string, unknown>
    return {
      ...e,
      createdAt: normalizeYjsDate(e.createdAt),
      ...(e.startedAt !== undefined && {
        startedAt: normalizeYjsDate(e.startedAt),
      }),
      ...(e.completedAt !== undefined && {
        completedAt: normalizeYjsDate(e.completedAt),
      }),
      ...(e.nextRunAt !== undefined && {
        nextRunAt: normalizeYjsDate(e.nextRunAt),
      }),
    } as unknown as QueuedTaskEntry
  })
}

function sortByPriority(entries: QueuedTaskEntry[]): QueuedTaskEntry[] {
  return entries.sort((a, b) => {
    const priDiff = PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority]
    if (priDiff !== 0) return priDiff
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

// ============================================================================
// Store Interface
// ============================================================================

interface QueueStore {
  entries: QueuedTaskEntry[]
  isLoading: boolean

  loadEntries: () => Promise<void>

  /** Add a new task to the persistent queue */
  enqueue: (data: {
    prompt: string
    priority?: TaskPriority
    existingTaskId?: string
    activatedSkills?: Array<{ name: string; skillMdContent: string }>
    schedule?: QueuedTaskEntry['schedule']
    approvalGates?: QueuedTaskEntry['approvalGates']
  }) => Promise<QueuedTaskEntry>

  /** Update an existing queue entry */
  updateEntry: (id: string, updates: Partial<QueuedTaskEntry>) => Promise<void>

  /** Get a single entry by ID */
  getEntryById: (id: string) => QueuedTaskEntry | null

  /** Get entries ready for execution (queued, not completed, not owned by another tab) */
  getReadyEntries: () => QueuedTaskEntry[]

  /** Get currently running entries */
  getRunningEntries: () => QueuedTaskEntry[]

  /** Get scheduled entries that are due */
  getDueScheduledEntries: () => QueuedTaskEntry[]

  /** Get queue statistics */
  getStats: () => {
    total: number
    queued: number
    running: number
    scheduled: number
    completed: number
    failed: number
    cancelled: number
    pendingApproval: number
  }

  /** Mark entry as started */
  markStarted: (id: string, ownerClientId?: string) => Promise<void>

  /** Update progress on an entry */
  updateProgress: (
    id: string,
    progress: number,
    statusMessage?: string,
    subTasksCompleted?: number,
    subTasksTotal?: number,
  ) => Promise<void>

  /** Mark entry as completed */
  markCompleted: (id: string, workflowId?: string) => Promise<void>

  /** Mark entry as failed */
  markFailed: (id: string, error: string) => Promise<void>

  /** Pause a running entry */
  pause: (id: string) => Promise<boolean>

  /** Resume a paused entry */
  resume: (id: string) => Promise<boolean>

  /** Cancel an entry */
  cancel: (id: string) => Promise<boolean>

  /** Remove completed/failed/cancelled entries older than given milliseconds */
  prune: (maxAgeMs?: number) => Promise<number>

  /** Delete a single entry */
  deleteEntry: (id: string) => Promise<void>
}

// ============================================================================
// Max concurrent background tasks
// ============================================================================

const MAX_CONCURRENT = 3

// ============================================================================
// Store Implementation
// ============================================================================

export const useQueueStore = create<QueueStore>((set, get) => ({
  entries: [],
  isLoading: false,

  loadEntries: async () => {
    set({ isLoading: true })
    try {
      if (!isReady()) await whenReady
      set({ entries: sortByPriority(getAllEntries()), isLoading: false })
    } catch (error) {
      errorToast('Failed to load queue', error)
      set({ isLoading: false })
    }
  },

  enqueue: async (data) => {
    try {
      if (!isReady()) await whenReady

      const now = new Date().toISOString()
      const entry: QueuedTaskEntry = {
        id: crypto.randomUUID(),
        prompt: data.prompt,
        existingTaskId: data.existingTaskId,
        priority: data.priority || 'normal',
        runState: data.schedule ? 'scheduled' : 'queued',
        activatedSkills: data.activatedSkills,
        progress: 0,
        schedule: data.schedule,
        approvalGates: data.approvalGates,
        createdAt: now,
        ...(data.schedule?.cron || data.schedule?.intervalMs
          ? { nextRunAt: computeNextRun(data.schedule, now) }
          : {}),
      }

      queuedTasks.set(entry.id, entry)
      set({ entries: sortByPriority([...get().entries, entry]) })
      return entry
    } catch (error) {
      errorToast('Failed to enqueue task', error)
      throw error
    }
  },

  updateEntry: async (id, updates) => {
    try {
      if (!isReady()) await whenReady
      const existing = queuedTasks.get(id)
      if (!existing) throw new Error(`Queue entry ${id} not found`)

      const updated = {
        ...(existing as unknown as Record<string, unknown>),
        ...(updates as unknown as Record<string, unknown>),
      }

      queuedTasks.set(id, updated as unknown as QueuedTaskEntry)

      set({
        entries: sortByPriority(
          get().entries.map((e) =>
            e.id === id ? (updated as unknown as QueuedTaskEntry) : e,
          ),
        ),
      })
    } catch {
      // Silent — progress updates are non-fatal
    }
  },

  getEntryById: (id) => {
    const e = queuedTasks.get(id)
    return e ? (e as unknown as QueuedTaskEntry) : null
  },

  getReadyEntries: () => {
    return sortByPriority(
      getAllEntries().filter(
        (e) =>
          e.runState === 'queued' &&
          !e.completedAt &&
          !e.error &&
          !hasPendingApproval(e, 'before-execution'),
      ),
    )
  },

  getRunningEntries: () => {
    return getAllEntries().filter((e) => e.runState === 'running')
  },

  getDueScheduledEntries: () => {
    const now = Date.now()
    return getAllEntries().filter(
      (e) =>
        e.runState === 'scheduled' &&
        !e.completedAt &&
        !e.error &&
        e.nextRunAt &&
        new Date(e.nextRunAt).getTime() <= now,
    )
  },

  getStats: () => {
    const all = getAllEntries()
    return {
      total: all.length,
      queued: all.filter(
        (e) => e.runState === 'queued' && !e.completedAt && !e.error,
      ).length,
      running: all.filter((e) => e.runState === 'running').length,
      scheduled: all.filter((e) => e.runState === 'scheduled' && !e.completedAt)
        .length,
      completed: all.filter((e) => !!e.completedAt && !e.error).length,
      failed: all.filter((e) => !!e.error).length,
      cancelled: all.filter((e) => e.runState === 'cancelled').length,
      pendingApproval: all.filter((e) =>
        e.approvalGates?.some((g) => g.status === 'pending'),
      ).length,
    }
  },

  markStarted: async (id, ownerClientId) => {
    const entry = queuedTasks.get(id)
    if (!entry) return

    await get().updateEntry(id, {
      runState: 'running',
      startedAt: new Date().toISOString(),
      ownerClientId,
    } as Partial<QueuedTaskEntry>)
  },

  updateProgress: async (
    id,
    progress,
    statusMessage,
    subTasksCompleted,
    subTasksTotal,
  ) => {
    await get().updateEntry(id, {
      progress: Math.min(100, Math.max(0, progress)),
      ...(statusMessage !== undefined && { statusMessage }),
      ...(subTasksCompleted !== undefined && { subTasksCompleted }),
      ...(subTasksTotal !== undefined && { subTasksTotal }),
    })
  },

  markCompleted: async (id, workflowId) => {
    await get().updateEntry(id, {
      runState: 'queued', // Reset for potential re-run
      completedAt: new Date().toISOString(),
      progress: 100,
      statusMessage: 'Completed',
      ...(workflowId && { workflowId }),
    })

    // Handle recurring tasks
    const entry = queuedTasks.get(id)
    if (entry?.schedule && (entry.schedule.cron || entry.schedule.intervalMs)) {
      await handleRecurrenceCompletion(get, id, entry)
    }
  },

  markFailed: async (id, error) => {
    await get().updateEntry(id, {
      runState: 'queued',
      completedAt: new Date().toISOString(),
      error,
      statusMessage: `Failed: ${error}`,
    })
  },

  pause: async (id) => {
    const entry = queuedTasks.get(id)
    if (entry && entry.runState === 'running') {
      await get().updateEntry(id, { runState: 'paused' })
      return true
    }
    return false
  },

  resume: async (id) => {
    const entry = queuedTasks.get(id)
    if (entry && entry.runState === 'paused') {
      await get().updateEntry(id, { runState: 'running' })
      return true
    }
    return false
  },

  cancel: async (id) => {
    const entry = queuedTasks.get(id)
    if (!entry) return false
    await get().updateEntry(id, {
      runState: 'cancelled',
      statusMessage: 'Cancelled',
    })
    return true
  },

  prune: async (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => {
    if (!isReady()) await whenReady
    const cutoff = Date.now() - maxAgeMs
    let pruned = 0

    for (const entry of getAllEntries()) {
      if (COMPLETED_OR_FAILED(entry)) {
        const completedTime = entry.completedAt
          ? new Date(entry.completedAt).getTime()
          : 0
        if (completedTime < cutoff || completedTime === 0) {
          queuedTasks.delete(entry.id)
          pruned++
        }
      }
    }

    if (pruned > 0) {
      set({ entries: sortByPriority(getAllEntries()) })
    }
    return pruned
  },

  deleteEntry: async (id) => {
    try {
      if (!isReady()) await whenReady
      queuedTasks.delete(id)
      set({ entries: get().entries.filter((e) => e.id !== id) })
    } catch (error) {
      errorToast('Failed to delete queue entry', error)
      throw error
    }
  },
}))

// ============================================================================
// Recurrence Helpers
// ============================================================================

/**
 * Compute when the next recurring execution should happen.
 */
function computeNextRun(
  schedule: QueuedTaskEntry['schedule'],
  fromIso: string,
): string {
  if (!schedule) return fromIso

  const from = new Date(fromIso)

  if (schedule.intervalMs) {
    return new Date(from.getTime() + schedule.intervalMs).toISOString()
  }

  if (schedule.cron) {
    // Simple cron parser for common patterns:
    // "0 9 * * 1" = Monday 9am, "*/30 * * * *" = every 30 min
    return parseCronNextRun(schedule.cron, from).toISOString()
  }

  return from.toISOString()
}

/**
 * Minimal cron parser supporting common patterns.
 * For production, a library like cron-parser would be ideal,
 * but this keeps bundle size down for the browser-native constraint.
 *
 * Supports: minute hour day-of-month month day-of-week
 *   - exact values: "0 9 * * 1"
 *   - intervals: "*​/30 * * * *"  (every 30 min)
 *   - wildcards: "*"
 */
export function parseCronNextRun(cron: string, from: Date): Date {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) {
    // Fallback: 1 hour from now if cron is unparseable
    return new Date(from.getTime() + 3600_000)
  }

  const [minPart, hourPart, , , dowPart] = parts

  // Handle interval patterns like */30
  const intervalMatch = minPart.match(/^\*\/(\d+)$/)
  if (intervalMatch) {
    const intervalMin = parseInt(intervalMatch[1], 10)
    const next = new Date(from)
    next.setMinutes(next.getMinutes() + intervalMin)
    next.setSeconds(0)
    next.setMilliseconds(0)
    return next
  }

  // Handle specific time patterns like "0 9 * * 1" (Monday 9am)
  const targetMin = minPart === '*' ? 0 : parseInt(minPart, 10)
  const targetHour = hourPart === '*' ? from.getHours() : parseInt(hourPart, 10)
  const targetDow = dowPart === '*' ? -1 : parseInt(dowPart, 10)

  const next = new Date(from)
  next.setHours(targetHour, targetMin, 0, 0)

  // If the target time is in the past today, move to next occurrence
  if (next.getTime() <= from.getTime()) {
    if (targetDow >= 0) {
      // Move to next matching day of week
      const currentDow = next.getDay()
      let daysUntil = targetDow - currentDow
      if (daysUntil <= 0) daysUntil += 7
      next.setDate(next.getDate() + daysUntil)
    } else {
      next.setDate(next.getDate() + 1)
    }
  } else if (targetDow >= 0 && next.getDay() !== targetDow) {
    // Right time but wrong day of week
    const currentDow = next.getDay()
    let daysUntil = targetDow - currentDow
    if (daysUntil <= 0) daysUntil += 7
    next.setDate(next.getDate() + daysUntil)
  }

  return next
}

/**
 * Handle recurrence after a task completes.
 * Creates a new queue entry for the next occurrence.
 */
async function handleRecurrenceCompletion(
  getState: () => QueueStore,
  completedId: string,
  entry: QueuedTaskEntry,
): Promise<void> {
  const schedule = entry.schedule
  if (!schedule) return

  const executionsCompleted = (schedule.executionsCompleted || 0) + 1

  // Check termination conditions
  if (schedule.maxExecutions && executionsCompleted >= schedule.maxExecutions) {
    return // Max executions reached
  }

  if (schedule.endsAt && new Date(schedule.endsAt).getTime() <= Date.now()) {
    return // End date passed
  }

  const now = new Date().toISOString()
  const nextRun = computeNextRun(schedule, now)

  // Update the schedule counter on the completed entry
  await getState().updateEntry(completedId, {
    schedule: { ...schedule, executionsCompleted },
  })

  // Enqueue next occurrence
  await getState().enqueue({
    prompt: entry.prompt,
    priority: entry.priority,
    existingTaskId: undefined, // New execution each time
    activatedSkills: entry.activatedSkills,
    schedule: {
      ...schedule,
      executionsCompleted,
    },
    approvalGates: entry.approvalGates?.map((g) => ({
      ...g,
      status:
        g.autoApprovePolicy === 'always'
          ? ('auto-approved' as const)
          : ('pending' as const),
      reviewedBy: undefined,
      reviewedAt: undefined,
      note: undefined,
    })),
  })

  // Set the nextRunAt on the new entry (the last one added)
  const entries = getState().entries
  const latest = entries[entries.length - 1]
  if (
    latest &&
    latest.runState === 'queued' &&
    latest.prompt === entry.prompt
  ) {
    await getState().updateEntry(latest.id, {
      runState: 'scheduled',
      nextRunAt: nextRun,
    })
  }
}

// ============================================================================
// Approval Helpers
// ============================================================================

/**
 * Check if a queue entry has a pending approval gate for a given trigger.
 */
function hasPendingApproval(entry: QueuedTaskEntry, trigger: string): boolean {
  return (
    entry.approvalGates?.some(
      (g) => g.trigger === trigger && g.status === 'pending',
    ) ?? false
  )
}

// ============================================================================
// Non-React Exports (for use in lib/ code)
// ============================================================================

export function enqueueTask(data: Parameters<QueueStore['enqueue']>[0]) {
  return useQueueStore.getState().enqueue(data)
}

export function getReadyEntries() {
  return useQueueStore.getState().getReadyEntries()
}

export function getRunningEntries() {
  return useQueueStore.getState().getRunningEntries()
}

export function getDueScheduledEntries() {
  return useQueueStore.getState().getDueScheduledEntries()
}

export function getQueueStats() {
  return useQueueStore.getState().getStats()
}

export function getQueueEntryById(id: string) {
  return useQueueStore.getState().getEntryById(id)
}

export function markQueueStarted(id: string, ownerClientId?: string) {
  return useQueueStore.getState().markStarted(id, ownerClientId)
}

export function updateQueueProgress(
  id: string,
  progress: number,
  statusMessage?: string,
  subTasksCompleted?: number,
  subTasksTotal?: number,
) {
  return useQueueStore
    .getState()
    .updateProgress(
      id,
      progress,
      statusMessage,
      subTasksCompleted,
      subTasksTotal,
    )
}

export function markQueueCompleted(id: string, workflowId?: string) {
  return useQueueStore.getState().markCompleted(id, workflowId)
}

export function markQueueFailed(id: string, error: string) {
  return useQueueStore.getState().markFailed(id, error)
}

export function cancelQueueEntry(id: string) {
  return useQueueStore.getState().cancel(id)
}

export function pruneQueue(maxAgeMs?: number) {
  return useQueueStore.getState().prune(maxAgeMs)
}

export { MAX_CONCURRENT }
