/**
 * Service Recovery
 *
 * Detects orphaned orchestration workflows (interrupted by browser close,
 * crash, or navigation) and provides mechanisms to resume or discard them.
 *
 * @module lib/orchestrator/recovery
 */

import { useWorkflowStore } from '@/stores/workflowStore'
import { useTaskStore } from '@/stores/taskStore'
import type { OrchestrationWorkflow, Task } from '@/types'
import { runningOrchestrations } from './engine'

// ============================================================================
// Types
// ============================================================================

export type OrphanClassification =
  /** No sub-tasks exist — safe to restart from scratch */
  | 'restart'
  /** Some sub-tasks are complete — can resume remaining */
  | 'partial-resume'
  /** All sub-tasks done, just needs re-validation/synthesis */
  | 're-validate'

export interface OrphanedWorkflow {
  workflow: OrchestrationWorkflow
  classification: OrphanClassification
  completedSubTasks: number
  totalSubTasks: number
  subTaskIds: string[]
}

// ============================================================================
// Orphan Detection
// ============================================================================

/**
 * Detect orchestration workflows that are no longer running in-memory
 * but are not in a terminal status. These "orphans" were likely
 * interrupted by browser close, crash, or navigation.
 */
export async function detectOrphanedWorkflows(): Promise<OrphanedWorkflow[]> {
  const { getActiveWorkflows, updateWorkflow } = useWorkflowStore.getState()
  const activeWorkflows = getActiveWorkflows()

  const orphans: OrphanedWorkflow[] = []

  for (const workflow of activeWorkflows) {
    // If the workflow is still running in-memory, it's not an orphan
    if (runningOrchestrations.has(workflow.id)) continue
    // Also check the root task ID — engine uses task ID as orchestration key
    if (workflow.rootTaskId && runningOrchestrations.has(workflow.rootTaskId))
      continue

    // This workflow is orphaned — classify it
    const classification = classifyOrphan(workflow)

    // Gather sub-task info
    const subTaskInfo = await getSubTaskInfo(workflow.rootTaskId)

    // Reset stuck sub-tasks (claimed/in_progress → pending)
    await resetStuckSubTasks(subTaskInfo.subTasks)

    // Mark workflow as interrupted
    try {
      await updateWorkflow(workflow.id, {
        status: 'interrupted',
        phase: 'Interrupted — awaiting recovery',
      })
    } catch {
      // Non-fatal
    }

    orphans.push({
      workflow: { ...workflow, status: 'interrupted' },
      classification,
      completedSubTasks: subTaskInfo.completedCount,
      totalSubTasks: subTaskInfo.subTasks.length,
      subTaskIds: subTaskInfo.subTasks.map((t) => t.id),
    })
  }

  return orphans
}

/**
 * Detect orphans for a specific workflow ID.
 * Used by individual task pages to check their own workflow.
 */
export async function detectOrphanForWorkflow(
  workflowId: string,
): Promise<OrphanedWorkflow | null> {
  const { getWorkflowById } = useWorkflowStore.getState()
  const workflow = getWorkflowById(workflowId)

  if (!workflow) return null

  // Terminal statuses are not orphans
  const terminalStatuses = ['completed', 'failed', 'interrupted']
  if (terminalStatuses.includes(workflow.status)) {
    // Already interrupted — return it for display without re-processing
    if (workflow.status === 'interrupted') {
      const subTaskInfo = await getSubTaskInfo(workflow.rootTaskId)
      return {
        workflow,
        classification: classifyOrphan(workflow),
        completedSubTasks: subTaskInfo.completedCount,
        totalSubTasks: subTaskInfo.subTasks.length,
        subTaskIds: subTaskInfo.subTasks.map((t) => t.id),
      }
    }
    return null
  }

  // If it's still running, it's not orphaned
  if (
    runningOrchestrations.has(workflowId) ||
    (workflow.rootTaskId && runningOrchestrations.has(workflow.rootTaskId))
  ) {
    return null
  }

  // It's orphaned
  const orphans = await detectOrphanedWorkflows()
  return orphans.find((o) => o.workflow.id === workflowId) || null
}

// ============================================================================
// Resume Logic
// ============================================================================

/**
 * Resume an interrupted workflow.
 *
 * Loads completed sub-task artifacts for dependency context,
 * filters to only pending sub-tasks, and re-runs the orchestration
 * with resume mode.
 */
export async function resumeWorkflow(workflowId: string): Promise<void> {
  const { getWorkflowById, updateWorkflow } = useWorkflowStore.getState()
  const workflow = getWorkflowById(workflowId)

  if (!workflow) throw new Error(`Workflow ${workflowId} not found`)
  if (workflow.status !== 'interrupted') {
    throw new Error(
      `Workflow ${workflowId} is not interrupted (status: ${workflow.status})`,
    )
  }

  // Mark as resuming
  await updateWorkflow(workflowId, {
    status: 'executing',
    phase: 'Resuming...',
    progress: 10,
  })

  // Import dynamically to avoid circular dependency
  const { orchestrate } = await import('./engine')

  try {
    await orchestrate(workflow.prompt, workflow.rootTaskId || undefined, {
      onProgress: async (update) => {
        try {
          await updateWorkflow(workflowId, {
            phase: update.message,
            progress: update.progress,
          })
        } catch {
          // Non-fatal
        }
      },
    })
  } catch (error) {
    // Mark as failed on unrecoverable error
    await updateWorkflow(workflowId, {
      status: 'failed',
      phase: 'Resume failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    } as any)
    throw error
  }
}

/**
 * Discard an interrupted workflow.
 * Marks the workflow and all non-completed sub-tasks as failed.
 */
export async function discardWorkflow(workflowId: string): Promise<void> {
  const { getWorkflowById, updateWorkflow } = useWorkflowStore.getState()
  const workflow = getWorkflowById(workflowId)

  if (!workflow) return

  // Mark all non-completed sub-tasks as failed
  const { updateTask } = useTaskStore.getState()
  const subTaskInfo = await getSubTaskInfo(workflow.rootTaskId)

  for (const task of subTaskInfo.subTasks) {
    if (task.status !== 'completed') {
      await updateTask(task.id, {
        status: 'failed',
        completedAt: new Date(),
      })
    }
  }

  // Also mark the root task
  if (workflow.rootTaskId) {
    try {
      await updateTask(workflow.rootTaskId, {
        status: 'failed',
        completedAt: new Date(),
      })
    } catch {
      // Non-fatal — root task may not exist
    }
  }

  await updateWorkflow(workflowId, {
    status: 'failed',
    phase: 'Discarded by user',
    completedAt: new Date(),
  } as any)
}

// ============================================================================
// Classification Helpers
// ============================================================================

function classifyOrphan(workflow: OrchestrationWorkflow): OrphanClassification {
  const status = workflow.status

  if (status === 'analyzing' || status === 'decomposing') {
    return 'restart'
  }

  if (status === 'validating' || status === 'synthesizing') {
    return 're-validate'
  }

  // recruiting, executing, or any other non-terminal status
  return 'partial-resume'
}

async function getSubTaskInfo(rootTaskId: string): Promise<{
  subTasks: Task[]
  completedCount: number
}> {
  if (!rootTaskId) {
    return { subTasks: [], completedCount: 0 }
  }

  const { getTaskById } = useTaskStore.getState()
  const rootTask = await getTaskById(rootTaskId)

  if (!rootTask) {
    return { subTasks: [], completedCount: 0 }
  }

  // Find all sub-tasks via the store
  // Sub-tasks have parentTaskId === rootTaskId
  const allTasks = useTaskStore.getState().tasks
  const subTasks = allTasks.filter((t) => t.parentTaskId === rootTaskId)

  const completedCount = subTasks.filter((t) => t.status === 'completed').length

  return { subTasks, completedCount }
}

async function resetStuckSubTasks(subTasks: Task[]): Promise<void> {
  const { updateTask } = useTaskStore.getState()

  for (const task of subTasks) {
    if (task.status === 'claimed' || task.status === 'in_progress') {
      await updateTask(task.id, {
        status: 'pending',
        assignedAgentId: undefined,
      })
    }
  }
}
