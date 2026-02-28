import { create } from 'zustand'
import { tasks, artifacts, whenReady, isReady } from '@/lib/yjs'
import type { Task, Requirement, TaskStep } from '@/types'
import { errorToast, successToast } from '@/lib/toast'
import {
  requirementValidator,
  ValidationResult,
} from '@/lib/requirement-validator'

// ============================================================================
// Helper: Normalize a date value that may have been corrupted by Yjs binary
// serialization (Date objects have no enumerable properties, so Yjs encodes
// them as empty plain objects {} which survive as {} after page reload).
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

/**
 * Helper to get all tasks from Yjs map, normalizing date fields
 * that Yjs may have corrupted during serialization.
 */
function getAllTasks(): Task[] {
  return Array.from(tasks.values()).map((task) => ({
    ...task,
    createdAt: normalizeYjsDate(task.createdAt),
    updatedAt: normalizeYjsDate(task.updatedAt),
    ...(task.completedAt !== undefined && {
      completedAt: normalizeYjsDate(task.completedAt),
    }),
    ...(task.dueDate !== undefined && {
      dueDate: normalizeYjsDate(task.dueDate),
    }),
    ...(task.assignedAt !== undefined && {
      assignedAt: normalizeYjsDate(task.assignedAt),
    }),
  })) as Task[]
}

/**
 * Helper to get artifacts by task ID from Yjs
 */
function getArtifactsByTaskId(taskId: string) {
  return Array.from(artifacts.values()).filter((a) => a.taskId === taskId)
}

interface TaskStore {
  // UI-only state (Zustand manages these)
  currentTask: Task | null
  isLoading: boolean

  // Derived from Yjs - kept for API compatibility
  tasks: Task[]

  loadTasks: () => Promise<void>
  loadTask: (id: string) => Promise<void>
  createTask: (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  addRequirement: (
    taskId: string,
    requirement: Omit<Requirement, 'id' | 'taskId'>,
  ) => Promise<void>
  updateRequirement: (
    taskId: string,
    requirementId: string,
    updates: Partial<Requirement>,
  ) => Promise<void>
  addStep: (taskId: string, step: Omit<TaskStep, 'id'>) => Promise<void>
  startStep: (taskId: string, stepId: string) => Promise<void>
  completeStep: (taskId: string, stepId: string) => Promise<void>
  updateStep: (
    taskId: string,
    stepId: string,
    updates: Partial<TaskStep>,
  ) => Promise<void>
  getTaskById: (id: string) => Promise<Task | null>
  getTasksByWorkflow: (workflowId: string) => Task[]
  getTasksByStatus: (status: Task['status']) => Task[]
  getTasksByAgent: (agentId: string) => Task[]
  getSubTasks: (parentTaskId: string) => Task[]
  getTaskHierarchy: (taskId: string) => Promise<{
    task: Task
    children: Task[]
    parent?: Task
    siblings: Task[]
  }>
  clearCurrentTask: () => void
  validateRequirements: (taskId: string) => Promise<ValidationResult[]>
  validateAndUpdateRequirements: (taskId: string) => Promise<{
    allSatisfied: boolean
    results: ValidationResult[]
    satisfactionRate: number
  }>
  markRequirementSatisfied: (
    taskId: string,
    requirementId: string,
    evidence?: string[],
  ) => Promise<void>
  createTaskWithRequirements: (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'requirements'>,
    userRequirement: string,
  ) => Promise<Task>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,

  loadTasks: async () => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }
      const allTasks = getAllTasks()
      set({ tasks: allTasks, isLoading: false })
    } catch (error) {
      errorToast('Failed to load tasks', error)
      set({ isLoading: false })
    }
  },

  loadTask: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }
      const task = tasks.get(id)
      if (task) {
        set({ currentTask: task, isLoading: false })
      } else {
        errorToast('Task not found', 'The requested task could not be found')
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to load task', error)
      set({ isLoading: false })
    }
  },

  createTask: async (taskData) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const now = new Date().toISOString()
      const task: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        steps: taskData.steps || [],
        createdAt: now,
        updatedAt: now,
      } as Task

      tasks.set(task.id, task)

      const updatedTasks = [...get().tasks, task]
      set({
        tasks: updatedTasks,
        currentTask: task,
        isLoading: false,
      })

      return task
    } catch (error) {
      errorToast('Failed to create task', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(id)
      if (!task) {
        throw new Error('Task not found')
      }

      const updatedTask: Task = {
        ...task,
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(id, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === id ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === id ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to update task', error)
      set({ isLoading: false })
    }
  },

  deleteTask: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }
      tasks.delete(id)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.filter((t) => t.id !== id)

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === id ? null : currentTask,
        isLoading: false,
      })

      successToast('Task deleted successfully')
    } catch (error) {
      errorToast('Failed to delete task', error)
      set({ isLoading: false })
    }
  },

  addRequirement: async (
    taskId: string,
    requirement: Omit<Requirement, 'id' | 'taskId'>,
  ) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const newRequirement: Requirement = {
        ...requirement,
        id: crypto.randomUUID(),
        taskId,
      }

      const updatedTask: Task = {
        ...task,
        requirements: [...task.requirements, newRequirement],
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(taskId, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to add requirement', error)
      set({ isLoading: false })
    }
  },

  updateRequirement: async (
    taskId: string,
    requirementId: string,
    updates: Partial<Requirement>,
  ) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const updatedRequirements = task.requirements.map((req) =>
        req.id === requirementId ? { ...req, ...updates } : req,
      )

      const updatedTask: Task = {
        ...task,
        requirements: updatedRequirements,
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(taskId, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to update requirement', error)
      set({ isLoading: false })
    }
  },

  getTasksByWorkflow: (workflowId: string) => {
    return get().tasks.filter((task) => task.workflowId === workflowId)
  },

  getTasksByStatus: (status: Task['status']) => {
    return get().tasks.filter((task) => task.status === status)
  },

  getTasksByAgent: (agentId: string) => {
    return get().tasks.filter((task) => task.assignedAgentId === agentId)
  },

  getSubTasks: (parentTaskId: string) => {
    return get().tasks.filter((task) => task.parentTaskId === parentTaskId)
  },

  getTaskHierarchy: async (taskId: string) => {
    try {
      if (!isReady()) {
        await whenReady
      }

      // Ensure tasks are loaded
      const { tasks: currentTasks } = get()
      if (currentTasks.length === 0) {
        await get().loadTasks()
      }

      const allTasks = get().tasks
      const task = allTasks.find((t) => t.id === taskId)

      if (!task) {
        // Try loading from Yjs directly
        const taskFromYjs = tasks.get(taskId)
        if (!taskFromYjs) {
          throw new Error('Task not found')
        }
        return {
          task: taskFromYjs,
          children: allTasks.filter((t) => t.parentTaskId === taskId),
          parent: taskFromYjs.parentTaskId
            ? allTasks.find((t) => t.id === taskFromYjs.parentTaskId) ||
              tasks.get(taskFromYjs.parentTaskId!)
            : undefined,
          siblings: taskFromYjs.parentTaskId
            ? allTasks.filter(
                (t) =>
                  t.parentTaskId === taskFromYjs.parentTaskId &&
                  t.id !== taskId,
              )
            : [],
        }
      }

      const children = allTasks.filter((t) => t.parentTaskId === taskId)
      const parent = task.parentTaskId
        ? allTasks.find((t) => t.id === task.parentTaskId) ||
          tasks.get(task.parentTaskId!)
        : undefined
      const siblings = task.parentTaskId
        ? allTasks.filter(
            (t) => t.parentTaskId === task.parentTaskId && t.id !== taskId,
          )
        : []

      return {
        task,
        children,
        parent,
        siblings,
      }
    } catch (error) {
      console.error('Error getting task hierarchy:', error)
      errorToast('Failed to load task hierarchy', error)
      throw error
    }
  },

  getTaskById: async (id: string): Promise<Task | null> => {
    try {
      // First check if task is in memory
      const task = get().tasks.find((t) => t.id === id)
      if (task) {
        return task
      }

      // If not in memory, load from Yjs
      if (!isReady()) {
        await whenReady
      }

      const taskFromYjs = tasks.get(id)
      return taskFromYjs || null
    } catch (error) {
      console.error('Error getting task by ID:', error)
      errorToast('Failed to load task', error)
      return null
    }
  },

  addStep: async (taskId: string, step: Omit<TaskStep, 'id'>) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const newStep: TaskStep = {
        ...step,
        id: crypto.randomUUID(),
      }

      const updatedTask: Task = {
        ...task,
        steps: [...task.steps, newStep],
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(taskId, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to add step', error)
      set({ isLoading: false })
    }
  },

  startStep: async (taskId: string, stepId: string) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const startTime = new Date().toISOString()
      const updatedSteps = task.steps.map((step) =>
        step.id === stepId
          ? { ...step, status: 'in_progress' as const, startedAt: startTime }
          : step,
      )

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(taskId, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to start step', error)
      set({ isLoading: false })
    }
  },

  completeStep: async (taskId: string, stepId: string) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const endTime = new Date()
      const updatedSteps = task.steps.map((step) => {
        if (step.id === stepId) {
          const duration = step.startedAt
            ? endTime.getTime() - new Date(step.startedAt).getTime()
            : undefined
          return {
            ...step,
            status: 'completed' as const,
            completedAt: endTime.toISOString(),
            duration,
          }
        }
        return step
      })

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(taskId, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to complete step', error)
      set({ isLoading: false })
    }
  },

  updateStep: async (
    taskId: string,
    stepId: string,
    updates: Partial<TaskStep>,
  ) => {
    set({ isLoading: true })
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const updatedSteps = task.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step,
      )

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
        updatedAt: new Date().toISOString(),
      } as Task

      tasks.set(taskId, updatedTask)

      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to update step', error)
      set({ isLoading: false })
    }
  },

  clearCurrentTask: () => {
    set({ currentTask: null })
  },

  validateRequirements: async (taskId: string): Promise<ValidationResult[]> => {
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const taskArtifacts = getArtifactsByTaskId(taskId)
      const results = await requirementValidator.validateAllRequirements(
        task,
        taskArtifacts,
      )

      return results
    } catch (error) {
      console.error('Error validating requirements:', error)
      errorToast('Failed to validate requirements', error)
      return []
    }
  },

  validateAndUpdateRequirements: async (taskId: string) => {
    try {
      if (!isReady()) {
        await whenReady
      }

      const task = tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const taskArtifacts = getArtifactsByTaskId(taskId)
      const results = await requirementValidator.validateAllRequirements(
        task,
        taskArtifacts,
      )

      // Update requirement statuses based on validation results
      const validationTimestamp = new Date().toISOString()
      const updatedRequirements = task.requirements.map((req) => {
        const result = results.find((r) => r.requirementId === req.id)
        if (result) {
          return {
            ...req,
            status: result.status,
            validationCriteria: result.evidence || req.validationCriteria,
            validatedAt: validationTimestamp,
            validationResult: result.message || 'Validation completed',
            ...(result.status === 'satisfied' && {
              satisfiedAt: validationTimestamp,
            }),
          }
        }
        return req
      })

      // Update the task in Yjs
      const updatedTask = {
        ...task,
        requirements: updatedRequirements,
        updatedAt: new Date().toISOString(),
      }

      tasks.set(taskId, updatedTask)

      // Update in memory state
      const { tasks: currentTasks, currentTask } = get()
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t,
      )

      set({
        tasks: updatedTasks,
        currentTask: currentTask?.id === taskId ? updatedTask : currentTask,
      })

      const allSatisfied =
        requirementValidator.areAllRequirementsSatisfied(updatedTask)
      const satisfactionRate =
        requirementValidator.getRequirementSatisfactionRate(updatedTask)

      return {
        allSatisfied,
        results,
        satisfactionRate,
      }
    } catch (error) {
      console.error('Error validating and updating requirements:', error)
      errorToast('Failed to validate requirements', error)
      return {
        allSatisfied: false,
        results: [],
        satisfactionRate: 0,
      }
    }
  },

  markRequirementSatisfied: async (
    taskId: string,
    requirementId: string,
    evidence?: string[],
  ) => {
    try {
      await get().updateRequirement(taskId, requirementId, {
        status: 'satisfied',
        validationCriteria: evidence || [],
        satisfiedAt: new Date().toISOString(),
      } as any)
      successToast('Requirement marked as satisfied')
    } catch (error) {
      errorToast('Failed to mark requirement as satisfied', error)
    }
  },

  createTaskWithRequirements: async (taskData, userRequirement: string) => {
    try {
      if (!isReady()) {
        await whenReady
      }

      const taskId = crypto.randomUUID()

      // Extract requirements from the user requirement
      const extractedRequirements =
        await requirementValidator.extractAndCreateRequirements(
          taskId,
          taskData.description,
          userRequirement,
        )

      const now = new Date().toISOString()
      const task: Task = {
        ...taskData,
        id: taskId,
        requirements: extractedRequirements,
        steps: taskData.steps || [],
        createdAt: now,
        updatedAt: now,
      } as Task

      tasks.set(task.id, task)

      const updatedTasks = [...get().tasks, task]
      set({
        tasks: updatedTasks,
        currentTask: task,
        isLoading: false,
      })

      return task
    } catch (error) {
      errorToast('Failed to create task with requirements', error)
      throw error
    }
  },
}))

// =========================================================================
// Yjs Observers for P2P sync
// =========================================================================

/**
 * Initialize Yjs observers for real-time sync.
 * When tasks/artifacts are modified on another device,
 * this ensures the Zustand store stays in sync.
 */
function initYjsObservers(): void {
  // Observe tasks map for remote changes
  tasks.observe(() => {
    const allTasks = getAllTasks()
    useTaskStore.setState({ tasks: allTasks })
  })

  // Observe artifacts map for remote changes
  artifacts.observe(() => {
    // Artifacts are accessed via getArtifactsByTaskId, no separate state needed
    // But we can trigger a re-render for current task if needed
    const currentTask = useTaskStore.getState().currentTask
    if (currentTask) {
      const task = tasks.get(currentTask.id)
      if (task) {
        useTaskStore.setState({ currentTask: task })
      }
    }
  })
}

// Initialize observers when module loads
initYjsObservers()
