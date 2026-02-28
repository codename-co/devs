import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Task, Requirement } from '@/types'
import { createMockToast, createMockYMap } from './mocks'

// Create mocks
const mockToast = createMockToast()

// Mock Yjs tasks map
const mockTasksMap = new Map<string, Task>()
const mockArtifactsMap = new Map<string, any>()

vi.mock('@/lib/yjs', () => ({
  tasks: {
    get: (id: string) => mockTasksMap.get(id),
    set: (id: string, value: Task) => mockTasksMap.set(id, value),
    has: (id: string) => mockTasksMap.has(id),
    delete: (id: string) => mockTasksMap.delete(id),
    values: () => mockTasksMap.values(),
    keys: () => mockTasksMap.keys(),
    entries: () => mockTasksMap.entries(),
    forEach: (fn: (v: Task, k: string) => void) => mockTasksMap.forEach(fn),
    [Symbol.iterator]: () => mockTasksMap[Symbol.iterator](),
    observe: vi.fn(),
    unobserve: vi.fn(),
  },
  artifacts: {
    get: (id: string) => mockArtifactsMap.get(id),
    set: (id: string, value: any) => mockArtifactsMap.set(id, value),
    has: (id: string) => mockArtifactsMap.has(id),
    delete: (id: string) => mockArtifactsMap.delete(id),
    values: () => mockArtifactsMap.values(),
    keys: () => mockArtifactsMap.keys(),
    entries: () => mockArtifactsMap.entries(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  },
  preferences: createMockYMap(),
  whenReady: Promise.resolve(),
  isReady: () => true,
  transact: <T>(fn: () => T): T => fn(),
  useLiveMap: vi.fn(() => Array.from(mockTasksMap.values())),
  useLiveValue: vi.fn((_map: unknown, id: string) => mockTasksMap.get(id)),
  useSyncReady: vi.fn(() => true),
}))

vi.mock('@/lib/toast', () => mockToast)

vi.mock('@/lib/requirement-validator', () => ({
  requirementValidator: {
    validateAllRequirements: vi.fn().mockResolvedValue([]),
    extractAndCreateRequirements: vi.fn().mockResolvedValue([]),
    validateRequirement: vi.fn().mockResolvedValue({ status: 'pending' }),
    areAllRequirementsSatisfied: vi.fn().mockReturnValue(false),
    getRequirementSatisfactionRate: vi.fn().mockReturnValue(0),
  },
  ValidationResult: {},
}))

let taskStore: typeof import('@/stores/taskStore')

function createTestTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `task-${Date.now()}`,
    workflowId: overrides.workflowId ?? `wf-${Date.now()}`,
    title: overrides.title ?? 'Test Task',
    description: overrides.description ?? 'Test description',
    complexity: overrides.complexity ?? 'simple',
    status: overrides.status ?? 'in_progress',
    dependencies: overrides.dependencies ?? [],
    requirements: overrides.requirements ?? [],
    artifacts: overrides.artifacts ?? [],
    steps: overrides.steps ?? [],
    estimatedPasses: overrides.estimatedPasses ?? 1,
    actualPasses: overrides.actualPasses ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  } as Task
}

function createTestRequirement(
  overrides: Partial<Requirement> = {},
): Requirement {
  return {
    id: overrides.id ?? `req-${Date.now()}-${Math.random()}`,
    type: overrides.type ?? 'functional',
    description: overrides.description ?? 'Test requirement',
    priority: overrides.priority ?? 'must',
    source: overrides.source ?? 'explicit',
    status: overrides.status ?? 'pending',
    validationCriteria: overrides.validationCriteria ?? [],
    taskId: overrides.taskId ?? 'task-1',
    ...overrides,
  }
}

describe('taskStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockTasksMap.clear()
    mockArtifactsMap.clear()
    vi.resetModules()

    vi.doMock('@/lib/yjs', () => ({
      tasks: {
        get: (id: string) => mockTasksMap.get(id),
        set: (id: string, value: Task) => mockTasksMap.set(id, value),
        has: (id: string) => mockTasksMap.has(id),
        delete: (id: string) => mockTasksMap.delete(id),
        values: () => mockTasksMap.values(),
        keys: () => mockTasksMap.keys(),
        entries: () => mockTasksMap.entries(),
        forEach: (fn: (v: Task, k: string) => void) => mockTasksMap.forEach(fn),
        [Symbol.iterator]: () => mockTasksMap[Symbol.iterator](),
        observe: vi.fn(),
        unobserve: vi.fn(),
      },
      artifacts: {
        get: (id: string) => mockArtifactsMap.get(id),
        set: (id: string, value: any) => mockArtifactsMap.set(id, value),
        has: (id: string) => mockArtifactsMap.has(id),
        delete: (id: string) => mockArtifactsMap.delete(id),
        values: () => mockArtifactsMap.values(),
        keys: () => mockArtifactsMap.keys(),
        entries: () => mockArtifactsMap.entries(),
        observe: vi.fn(),
        unobserve: vi.fn(),
      },
      preferences: createMockYMap(),
      whenReady: Promise.resolve(),
      isReady: () => true,
      transact: <T>(fn: () => T): T => fn(),
      useLiveMap: vi.fn(() => Array.from(mockTasksMap.values())),
      useLiveValue: vi.fn((_map: unknown, id: string) => mockTasksMap.get(id)),
      useSyncReady: vi.fn(() => true),
    }))

    vi.doMock('@/lib/toast', () => mockToast)
    vi.doMock('@/lib/requirement-validator', () => ({
      requirementValidator: {
        validateAllRequirements: vi.fn().mockResolvedValue([]),
        extractAndCreateRequirements: vi.fn().mockResolvedValue([]),
        validateRequirement: vi.fn().mockResolvedValue({ status: 'pending' }),
        areAllRequirementsSatisfied: vi.fn().mockReturnValue(false),
        getRequirementSatisfactionRate: vi.fn().mockReturnValue(0),
      },
      ValidationResult: {},
    }))

    taskStore = await import('@/stores/taskStore')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('updateTask - requirement auto-satisfaction', () => {
    it('should mark pending requirements as satisfied when task is completed', async () => {
      const req1 = createTestRequirement({
        id: 'req-1',
        status: 'pending',
        description: 'Must do X',
      })
      const req2 = createTestRequirement({
        id: 'req-2',
        status: 'pending',
        description: 'Must do Y',
      })
      const task = createTestTask({
        id: 'task-1',
        status: 'in_progress',
        requirements: [req1, req2],
      })
      mockTasksMap.set(task.id, task)

      await taskStore.useTaskStore.getState().updateTask('task-1', {
        status: 'completed',
        completedAt: new Date(),
      })

      const updated = mockTasksMap.get('task-1')!
      expect(updated.status).toBe('completed')
      expect(updated.requirements[0].status).toBe('satisfied')
      expect(updated.requirements[0].satisfiedAt).toBeDefined()
      expect(updated.requirements[1].status).toBe('satisfied')
      expect(updated.requirements[1].satisfiedAt).toBeDefined()
    })

    it('should not overwrite already-satisfied requirements', async () => {
      const existingSatisfiedAt = '2025-01-01T00:00:00.000Z'
      const req1 = createTestRequirement({
        id: 'req-1',
        status: 'satisfied',
        satisfiedAt: existingSatisfiedAt,
        description: 'Already done',
      })
      const req2 = createTestRequirement({
        id: 'req-2',
        status: 'pending',
        description: 'Still pending',
      })
      const task = createTestTask({
        id: 'task-2',
        status: 'in_progress',
        requirements: [req1, req2],
      })
      mockTasksMap.set(task.id, task)

      await taskStore.useTaskStore.getState().updateTask('task-2', {
        status: 'completed',
      })

      const updated = mockTasksMap.get('task-2')!
      // Already-satisfied requirement keeps its original satisfiedAt
      expect(updated.requirements[0].status).toBe('satisfied')
      expect(updated.requirements[0].satisfiedAt).toBe(existingSatisfiedAt)
      // Pending requirement gets auto-satisfied
      expect(updated.requirements[1].status).toBe('satisfied')
      expect(updated.requirements[1].satisfiedAt).toBeDefined()
      expect(updated.requirements[1].satisfiedAt).not.toBe(existingSatisfiedAt)
    })

    it('should not modify requirements when task status is not changing to completed', async () => {
      const req = createTestRequirement({
        id: 'req-1',
        status: 'pending',
        description: 'Pending req',
      })
      const task = createTestTask({
        id: 'task-3',
        status: 'pending',
        requirements: [req],
      })
      mockTasksMap.set(task.id, task)

      await taskStore.useTaskStore.getState().updateTask('task-3', {
        status: 'in_progress',
      })

      const updated = mockTasksMap.get('task-3')!
      expect(updated.requirements[0].status).toBe('pending')
      expect(updated.requirements[0].satisfiedAt).toBeUndefined()
    })

    it('should handle task with no requirements gracefully', async () => {
      const task = createTestTask({
        id: 'task-4',
        status: 'in_progress',
        requirements: [],
      })
      mockTasksMap.set(task.id, task)

      await taskStore.useTaskStore.getState().updateTask('task-4', {
        status: 'completed',
      })

      const updated = mockTasksMap.get('task-4')!
      expect(updated.status).toBe('completed')
      expect(updated.requirements).toEqual([])
    })

    it('should mark failed requirements as satisfied when task completes', async () => {
      const req = createTestRequirement({
        id: 'req-1',
        status: 'failed',
        description: 'Previously failed',
      })
      const task = createTestTask({
        id: 'task-5',
        status: 'in_progress',
        requirements: [req],
      })
      mockTasksMap.set(task.id, task)

      await taskStore.useTaskStore.getState().updateTask('task-5', {
        status: 'completed',
      })

      const updated = mockTasksMap.get('task-5')!
      expect(updated.requirements[0].status).toBe('satisfied')
      expect(updated.requirements[0].satisfiedAt).toBeDefined()
    })

    it('should not re-satisfy requirements if task is already completed', async () => {
      const req = createTestRequirement({
        id: 'req-1',
        status: 'pending',
        description: 'Still pending on completed task',
      })
      const task = createTestTask({
        id: 'task-6',
        status: 'completed',
        requirements: [req],
      })
      mockTasksMap.set(task.id, task)

      // Updating an already-completed task with status:completed should not re-trigger
      await taskStore.useTaskStore.getState().updateTask('task-6', {
        status: 'completed',
        title: 'Updated title',
      })

      const updated = mockTasksMap.get('task-6')!
      expect(updated.requirements[0].status).toBe('pending')
    })
  })
})
