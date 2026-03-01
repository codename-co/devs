/**
 * Orchestration Engine v2
 *
 * Central routing layer for the task orchestration system.
 * Analyzes user prompts and delegates to the appropriate strategy:
 *
 * - **Single Agent** — Simple tasks handled by one agent
 * - **Multi-Agent** — Complex tasks decomposed across multiple agents
 * - **Agent Team** — Team-based execution with shared task list and mailbox
 *
 * Strategy implementations live in `./strategies/` to keep this file
 * focused on routing, deduplication, and the public API.
 *
 * @module lib/orchestrator/engine
 */

import { TaskAnalyzer } from '@/lib/task-analyzer'
import { useTaskStore } from '@/stores/taskStore'
import { useWorkflowStore } from '@/stores/workflowStore'
import { emit } from './events'
import type { Artifact } from '@/types'

import { detectTeamFromPrompt } from './team-coordinator'
import { TaskQueue } from './task-queue'
import { enqueueTask } from '@/stores/queueStore'
import type { ApprovalGate, ScheduleConfig } from '@/types'
import { executeSingleAgent } from './strategies/single-agent'
import { executeAgentTeam } from './strategies/agent-team'

// ============================================================================
// Public Types
// ============================================================================

export interface OrchestrationResult {
  success: boolean
  workflowId: string
  mainTaskId: string
  subTaskIds: string[]
  artifacts: Artifact[]
  errors?: string[]
  /** The synthesized final response */
  synthesizedResponse?: string
  /** Total turns consumed across all agents */
  totalTurnsUsed?: number
  /** Whether the result was synthesized from multiple agents */
  wasSynthesized?: boolean
}

export interface OrchestrationOptions {
  /** Run in background (fire-and-forget) */
  background?: boolean
  /** Priority for the task queue */
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'background'
  /** Abort signal for cancellation */
  signal?: AbortSignal
  /** Skills explicitly activated by the user via /mention */
  activatedSkills?: Array<{ name: string; skillMdContent: string }>
  /** Callback for progress updates */
  onProgress?: (update: {
    phase: string
    progress: number
    message: string
    subTasksCompleted?: number
    subTasksTotal?: number
  }) => void
}

// ============================================================================
// Deduplication
// ============================================================================

export const runningOrchestrations = new Set<string>()

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Orchestrate a task from user prompt to final deliverable.
 *
 * This is the primary entry point for the v2 orchestration engine.
 * It replaces `WorkflowOrchestrator.orchestrateTask()`.
 */
export async function orchestrate(
  prompt: string,
  existingTaskId?: string,
  options?: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const orchestrationKey =
    existingTaskId || btoa(encodeURIComponent(prompt)).substring(0, 32)

  if (runningOrchestrations.has(orchestrationKey)) {
    throw new Error('Orchestration already in progress for this task')
  }

  runningOrchestrations.add(orchestrationKey)

  // Workflow entity will be created after we know the root task & lead agent
  let orchestrationWorkflowId: string | undefined

  // Helper to update workflow status at each phase transition
  const updatePhase = async (
    status: string,
    phase: string,
    progress: number,
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    options?.onProgress?.({ phase, progress, message })
    emit({
      type: 'phase-change',
      phase,
      workflowId: orchestrationWorkflowId || '',
      message,
      progress,
    })

    if (orchestrationWorkflowId) {
      try {
        await useWorkflowStore
          .getState()
          .updateWorkflow(orchestrationWorkflowId, {
            status: status as any,
            phase: message,
            progress,
            ...extra,
          })
      } catch {
        // Non-fatal — workflow update failure shouldn't abort orchestration
      }
    }
  }

  try {
    // Phase 1: Analyze
    await updatePhase('analyzing', 'analyzing', 5, 'Analyzing task...')

    const analysis = await TaskAnalyzer.analyzePrompt(prompt)

    // Detect team request
    const teamDetection = detectTeamFromPrompt(prompt)

    // Determine strategy and tier
    const isTeam = teamDetection.isTeamRequest
    // Use LLM-determined tier, but always promote to tier 1 for explicit team requests
    const tier = isTeam ? (Math.max(1, analysis.tier) as 0 | 1) : analysis.tier
    const strategy = tier >= 1 ? 'flat-team' : 'direct'

    // Create the OrchestrationWorkflow record FIRST so its ID is the single workflowId
    // used by tasks, conversations, events, and the UI.
    let workflowId: string
    try {
      const wf = await useWorkflowStore.getState().createWorkflow({
        prompt,
        strategy: strategy as any,
        tier: tier as any,
        leadAgentId: '', // will be updated by the strategy once an agent is assigned
        participatingAgentIds: [],
        rootTaskId: existingTaskId || '',
        status: 'analyzing',
        phase: 'Analyzing task...',
        progress: 5,
        totalTurnsUsed: 0,
      })
      orchestrationWorkflowId = wf.id
      workflowId = wf.id
    } catch {
      // Fallback: orchestration continues without workflow tracking
      workflowId = crypto.randomUUID()
    }

    // If reusing an existing task, stamp the workflowId onto it
    if (existingTaskId) {
      try {
        await useTaskStore.getState().updateTask(existingTaskId, { workflowId })
      } catch {
        // Non-fatal
      }
    }

    // Phase 3: Route to strategy
    await updatePhase('executing', 'executing', 15, 'Executing strategy...')

    let result: OrchestrationResult

    if (tier === 0) {
      // Tier 0: simple tasks → single agent
      result = await executeSingleAgent(
        prompt,
        analysis,
        workflowId,
        existingTaskId,
        options,
      )
    } else {
      // Tier 1: complex tasks OR explicit team requests → agent-team
      // (multi-agent is merged into agent-team with lead-assigned strategy)
      result = await executeAgentTeam(
        prompt,
        analysis,
        workflowId,
        isTeam ? teamDetection : undefined,
        existingTaskId,
        options,
      )
    }

    // Mark workflow as completed
    if (orchestrationWorkflowId) {
      try {
        await useWorkflowStore
          .getState()
          .updateWorkflow(orchestrationWorkflowId, {
            status: result.success ? 'completed' : 'failed',
            phase: result.success ? 'Completed' : 'Failed',
            progress: 100,
            totalTurnsUsed: result.totalTurnsUsed || 0,
            completedAt: new Date(),
            ...(result.errors?.length
              ? { error: result.errors.join('; ') }
              : {}),
          } as any)
      } catch {
        // Non-fatal
      }
    }

    return result
  } catch (error) {
    console.error('❌ Orchestration failed:', error)

    // Mark workflow as failed
    if (orchestrationWorkflowId) {
      try {
        await useWorkflowStore
          .getState()
          .updateWorkflow(orchestrationWorkflowId, {
            status: 'failed',
            phase: 'Failed',
            progress: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          } as any)
      } catch {
        // Non-fatal
      }
    }

    throw error
  } finally {
    runningOrchestrations.delete(orchestrationKey)
  }
}

// ============================================================================
// Background Execution (Yjs-Backed)
// ============================================================================

/**
 * Submit a task for background execution.
 * Returns immediately with the queue entry ID.
 *
 * The task is persisted to the Yjs-backed queue store, which means:
 * - It survives page reloads (recovery picks it up)
 * - It is visible across tabs (leader election prevents duplicates)
 * - The scheduler automatically drains the queue
 *
 * Use `queueStore` hooks/functions to monitor progress.
 */
export async function submitBackground(
  prompt: string,
  existingTaskId?: string,
  priority: 'critical' | 'high' | 'normal' | 'low' | 'background' = 'normal',
  options?: {
    schedule?: ScheduleConfig
    approvalGates?: ApprovalGate[]
    activatedSkills?: Array<{ name: string; skillMdContent: string }>
  },
): Promise<{ entryId: string }> {
  const entry = await enqueueTask({
    prompt,
    existingTaskId,
    priority,
    activatedSkills: options?.activatedSkills,
    schedule: options?.schedule,
    approvalGates: options?.approvalGates,
  })

  // The scheduler's tick loop will pick up this entry automatically.
  // No need to fire-and-forget here — the scheduler handles execution.

  return { entryId: entry.id }
}

/**
 * Legacy in-memory background submission (kept for backward compatibility).
 * Prefer `submitBackground` for new code — it uses the persistent Yjs queue.
 */
export function submitBackgroundLegacy(
  prompt: string,
  existingTaskId?: string,
  priority: 'critical' | 'high' | 'normal' | 'low' | 'background' = 'normal',
): { taskId: string; workflowId: string } {
  const workflowId = crypto.randomUUID()
  const taskId = existingTaskId || crypto.randomUUID()

  const queue = TaskQueue.getInstance()
  queue.enqueue(taskId, workflowId, prompt, priority)

  // Fire and forget — execute asynchronously
  ;(async () => {
    queue.markStarted(taskId)
    try {
      const result = await orchestrate(prompt, existingTaskId, {
        signal: queue.getSignal(taskId),
        priority,
        onProgress: (update) => {
          queue.updateProgress(
            taskId,
            update.progress,
            update.message,
            update.subTasksCompleted,
            update.subTasksTotal,
          )
        },
      })
      queue.markCompleted(taskId, result)
    } catch (error) {
      queue.markFailed(
        taskId,
        error instanceof Error ? error.message : 'Unknown error',
      )
    }
  })()

  return { taskId, workflowId }
}
