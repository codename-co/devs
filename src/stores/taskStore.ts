import { create } from 'zustand'
import { db } from '@/lib/db'
import { deleteFromYjs, syncToYjs } from '@/features/sync'
import type { Task, Requirement, TaskStep } from '@/types'
import { errorToast, successToast } from '@/lib/toast'
import {
  requirementValidator,
  ValidationResult,
} from '@/lib/requirement-validator'

interface TaskStore {
  tasks: Task[]
  currentTask: Task | null
  isLoading: boolean

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
      if (!db.isInitialized()) {
        await db.init()
      }
      const tasks = await db.getAll('tasks')
      set({ tasks, isLoading: false })
    } catch (error) {
      errorToast('Failed to load tasks', error)
      set({ isLoading: false })
    }
  },

  loadTask: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      const task = await db.get('tasks', id)
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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        steps: taskData.steps || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.add('tasks', task)
      syncToYjs('tasks', task)

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', id)
      if (!task) {
        throw new Error('Task not found')
      }

      const updatedTask: Task = {
        ...task,
        ...updates,
        id,
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)
      syncToYjs('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === id ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.delete('tasks', id)
      deleteFromYjs('tasks', id)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.filter((t) => t.id !== id)

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
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
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const updatedRequirements = task.requirements.map((req) =>
        req.id === requirementId ? { ...req, ...updates } : req,
      )

      const updatedTask: Task = {
        ...task,
        requirements: updatedRequirements,
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }

      // Ensure tasks are loaded
      const { tasks } = get()
      if (tasks.length === 0) {
        await get().loadTasks()
      }

      const currentTasks = get().tasks
      const task = currentTasks.find((t) => t.id === taskId)

      if (!task) {
        // Try loading from database
        const taskFromDb = await db.get('tasks', taskId)
        if (!taskFromDb) {
          throw new Error('Task not found')
        }
        return {
          task: taskFromDb,
          children: currentTasks.filter((t) => t.parentTaskId === taskId),
          parent: taskFromDb.parentTaskId
            ? currentTasks.find((t) => t.id === taskFromDb.parentTaskId) ||
              (await db.get('tasks', taskFromDb.parentTaskId!))
            : undefined,
          siblings: taskFromDb.parentTaskId
            ? currentTasks.filter(
                (t) =>
                  t.parentTaskId === taskFromDb.parentTaskId && t.id !== taskId,
              )
            : [],
        }
      }

      const children = currentTasks.filter((t) => t.parentTaskId === taskId)
      const parent = task.parentTaskId
        ? currentTasks.find((t) => t.id === task.parentTaskId) ||
          (await db.get('tasks', task.parentTaskId!))
        : undefined
      const siblings = task.parentTaskId
        ? currentTasks.filter(
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

      // If not in memory, load from database
      if (!db.isInitialized()) {
        await db.init()
      }

      const taskFromDb = await db.get('tasks', id)
      return taskFromDb || null
    } catch (error) {
      console.error('Error getting task by ID:', error)
      errorToast('Failed to load task', error)
      return null
    }
  },

  addStep: async (taskId: string, step: Omit<TaskStep, 'id'>) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
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
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const startTime = new Date()
      const updatedSteps = task.steps.map((step) =>
        step.id === stepId
          ? { ...step, status: 'in_progress' as const, startedAt: startTime }
          : step,
      )

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const endTime = new Date()
      const updatedSteps = task.steps.map((step) => {
        if (step.id === stepId) {
          const duration = step.startedAt
            ? endTime.getTime() - step.startedAt.getTime()
            : undefined
          return {
            ...step,
            status: 'completed' as const,
            completedAt: endTime,
            duration,
          }
        }
        return step
      })

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const updatedSteps = task.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step,
      )

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const artifacts = await db.query('artifacts', 'taskId', taskId)
      const results = await requirementValidator.validateAllRequirements(
        task,
        artifacts,
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
      if (!db.isInitialized()) {
        await db.init()
      }

      const task = await db.get('tasks', taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      const artifacts = await db.query('artifacts', 'taskId', taskId)
      const results = await requirementValidator.validateAllRequirements(
        task,
        artifacts,
      )

      // Update requirement statuses based on validation results
      const validationTimestamp = new Date()
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

      // Update the task in database
      const updatedTask = {
        ...task,
        requirements: updatedRequirements,
        updatedAt: new Date(),
      }

      await db.update('tasks', updatedTask)

      // Update in memory state
      const { tasks, currentTask } = get()
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

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
        satisfiedAt: new Date(),
      })
      successToast('Requirement marked as satisfied')
    } catch (error) {
      errorToast('Failed to mark requirement as satisfied', error)
    }
  },

  createTaskWithRequirements: async (taskData, userRequirement: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const taskId = crypto.randomUUID()

      // Extract requirements from the user requirement
      const extractedRequirements =
        await requirementValidator.extractAndCreateRequirements(
          taskId,
          taskData.description,
          userRequirement,
        )

      const task: Task = {
        ...taskData,
        id: taskId,
        requirements: extractedRequirements,
        steps: taskData.steps || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.add('tasks', task)

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
