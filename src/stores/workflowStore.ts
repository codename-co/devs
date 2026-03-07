/**
 * Workflow Store
 *
 * Yjs-backed store for OrchestrationWorkflow entities.
 * Tracks the lifecycle of orchestration runs from analysis to completion.
 *
 * Following the same pattern as taskStore with Yjs as the source of truth,
 * Zustand for UI state, and reactive hooks for component subscriptions.
 *
 * @module stores/workflowStore
 */

import { create } from 'zustand'
import { workflows, whenReady, isReady } from '@/lib/yjs'
import type { OrchestrationWorkflow } from '@/types'
import { errorToast } from '@/lib/toast'

// ============================================================================
// Date normalization (Yjs can corrupt Date objects during serialization)
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

function getAllWorkflows(): OrchestrationWorkflow[] {
  return Array.from(workflows.values())
    .filter((w): w is OrchestrationWorkflow => 'prompt' in w && 'tier' in w)
    .map((w) => {
      const wf = w as unknown as Record<string, unknown>
      return {
        ...wf,
        createdAt: normalizeYjsDate(wf.createdAt),
        updatedAt: normalizeYjsDate(wf.updatedAt),
        ...(wf.completedAt !== undefined && {
          completedAt: normalizeYjsDate(wf.completedAt),
        }),
      } as unknown as OrchestrationWorkflow
    })
}

// ============================================================================
// Terminal statuses for workflow completion checks
// ============================================================================

const TERMINAL_STATUSES: OrchestrationWorkflow['status'][] = [
  'completed',
  'failed',
  'interrupted',
]

// ============================================================================
// Store Interface
// ============================================================================

interface WorkflowStore {
  workflows: OrchestrationWorkflow[]
  isLoading: boolean

  loadWorkflows: () => Promise<void>
  createWorkflow: (
    data: Omit<OrchestrationWorkflow, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<OrchestrationWorkflow>
  updateWorkflow: (
    id: string,
    updates: Partial<OrchestrationWorkflow>,
  ) => Promise<void>
  getWorkflowById: (id: string) => OrchestrationWorkflow | null
  getActiveWorkflows: () => OrchestrationWorkflow[]
  getWorkflowsByStatus: (
    status: OrchestrationWorkflow['status'],
  ) => OrchestrationWorkflow[]
  deleteWorkflow: (id: string) => Promise<void>
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: [],
  isLoading: false,

  loadWorkflows: async () => {
    set({ isLoading: true })
    try {
      if (!isReady()) await whenReady
      set({ workflows: getAllWorkflows(), isLoading: false })
    } catch (error) {
      errorToast('Failed to load workflows', error)
      set({ isLoading: false })
    }
  },

  createWorkflow: async (data) => {
    try {
      if (!isReady()) await whenReady

      const now = new Date().toISOString()
      const workflow = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as unknown as OrchestrationWorkflow

      workflows.set(workflow.id, workflow)

      set({ workflows: [...get().workflows, workflow] })
      return workflow
    } catch (error) {
      errorToast('Failed to create workflow', error)
      throw error
    }
  },

  updateWorkflow: async (id, updates) => {
    try {
      if (!isReady()) await whenReady

      const existing = workflows.get(id)
      if (!existing) throw new Error(`Workflow ${id} not found`)

      const updated = {
        ...(existing as unknown as Record<string, unknown>),
        ...(updates as unknown as Record<string, unknown>),
        updatedAt: new Date().toISOString(),
      }

      workflows.set(id, updated as unknown as OrchestrationWorkflow)

      set({
        workflows: get().workflows.map((w) =>
          w.id === id ? (updated as unknown as OrchestrationWorkflow) : w,
        ),
      })
    } catch (error) {
      errorToast('Failed to update workflow', error)
      throw error
    }
  },

  getWorkflowById: (id) => {
    const w = workflows.get(id)
    if (!w || !('prompt' in w)) return null
    // Normalize dates that Yjs may have corrupted
    const wf = w as unknown as Record<string, unknown>
    return {
      ...wf,
      createdAt: normalizeYjsDate(wf.createdAt),
      updatedAt: normalizeYjsDate(wf.updatedAt),
      ...(wf.completedAt !== undefined && {
        completedAt: normalizeYjsDate(wf.completedAt),
      }),
    } as unknown as OrchestrationWorkflow
  },

  getActiveWorkflows: () => {
    return getAllWorkflows().filter(
      (w) => !TERMINAL_STATUSES.includes(w.status),
    )
  },

  getWorkflowsByStatus: (status) => {
    return getAllWorkflows().filter((w) => w.status === status)
  },

  deleteWorkflow: async (id) => {
    try {
      if (!isReady()) await whenReady
      workflows.delete(id)
      set({ workflows: get().workflows.filter((w) => w.id !== id) })
    } catch (error) {
      errorToast('Failed to delete workflow', error)
      throw error
    }
  },
}))

// ============================================================================
// Non-React Exports (for use in lib/ code)
// ============================================================================

export function createWorkflow(
  data: Omit<OrchestrationWorkflow, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<OrchestrationWorkflow> {
  return useWorkflowStore.getState().createWorkflow(data)
}

export function updateWorkflow(
  id: string,
  updates: Partial<OrchestrationWorkflow>,
): Promise<void> {
  return useWorkflowStore.getState().updateWorkflow(id, updates)
}

export function getWorkflowById(id: string): OrchestrationWorkflow | null {
  return useWorkflowStore.getState().getWorkflowById(id)
}

export function getActiveWorkflows(): OrchestrationWorkflow[] {
  return useWorkflowStore.getState().getActiveWorkflows()
}
