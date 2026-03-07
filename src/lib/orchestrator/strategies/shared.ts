/**
 * Shared orchestration utilities used by all strategy implementations.
 *
 * Extracted from engine.ts to eliminate duplication across single-agent,
 * multi-agent, and agent-team strategies. Every strategy uses these
 * building blocks for conversation creation, event emission, artifact
 * creation, and task status management.
 *
 * @module lib/orchestrator/strategies/shared
 */

import { useConversationStore } from '@/stores/conversationStore'
import { useTaskStore, claimTask } from '@/stores/taskStore'
import { ArtifactManager } from '@/lib/artifact-manager'
import { emit } from '../events'
import { runAgent, type AgentRunnerResult } from '../agent-runner'
import type {
  Task,
  Agent,
  Artifact,
  AgentScope,
  IsolatedExecutionConfig,
  MessageStep,
} from '@/types'
import type { OrchestrationOptions } from '../engine'
import type { DecomposedTask } from '../task-decomposer'

// ============================================================================
// Tool calls → MessageStep conversion
// ============================================================================

/**
 * Convert an AgentRunnerResult's toolCallsLog into persisted MessageStep[] so
 * that the task page can display executed tools via ConversationStepTracker.
 */
export function toolCallsLogToMessageSteps(
  toolCallsLog: AgentRunnerResult['toolCallsLog'],
): MessageStep[] {
  if (!toolCallsLog || toolCallsLog.length === 0) return []

  return toolCallsLog.map((tc, idx) => ({
    id: `tool-${Date.now()}-${idx}`,
    icon: 'Settings',
    i18nKey: 'Using tool',
    vars: { tool: tc.tool },
    status: 'completed' as const,
    startedAt: Date.now(),
    completedAt: Date.now(),
    toolCalls: [{ name: tc.tool, input: tc.input, output: tc.output }],
  }))
}

// ============================================================================
// Conversation Helpers
// ============================================================================

/**
 * Create a conversation for a sub-task and add the initial user message.
 * Returns the conversation ID for subsequent message additions.
 */
export async function createSubTaskConversation(
  agentId: string,
  workflowId: string,
  userMessage: string,
): Promise<{
  conversationId: string
  addMessage: (id: string, msg: any) => Promise<void>
}> {
  const { createConversation, addMessage } = useConversationStore.getState()
  const conversation = await createConversation(agentId, workflowId)
  await addMessage(conversation.id, { role: 'user', content: userMessage })
  return { conversationId: conversation.id, addMessage }
}

/**
 * Save the final assistant message to a conversation.
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  agentId: string,
): Promise<void> {
  const { addMessage } = useConversationStore.getState()
  await addMessage(conversationId, {
    role: 'assistant',
    content,
    agentId,
  })
}

// ============================================================================
// Event Emission Helpers
// ============================================================================

/**
 * Emit the full lifecycle of agent events (start → streaming → complete).
 * Returns callbacks for streaming and completion.
 */
export function createAgentEventEmitters(
  taskId: string,
  agentId: string,
  agentName: string,
  workflowId: string,
) {
  return {
    emitStart() {
      emit({
        type: 'agent-start',
        taskId,
        agentId,
        agentName,
        workflowId,
      })
    },

    createStreamingHandler(): (content: string) => void {
      return (content: string) => {
        emit({
          type: 'agent-streaming',
          taskId,
          agentId,
          content,
          workflowId,
        })
      }
    },

    emitComplete(success: boolean) {
      emit({
        type: 'agent-complete',
        taskId,
        agentId,
        workflowId,
        success,
      })
    },
  }
}

// ============================================================================
// Artifact Helpers
// ============================================================================

/**
 * Create a standard artifact for a task output.
 */
export async function createTaskArtifact(
  taskId: string,
  agentId: string,
  taskTitle: string,
  agentName: string,
  content: string,
  requirementIds: string[],
  dependencies: string[] = [],
): Promise<void> {
  await ArtifactManager.createArtifact({
    taskId,
    agentId,
    title: taskTitle,
    description: `Output from ${agentName}`,
    type: inferArtifactType(content),
    format: 'markdown',
    content,
    version: 1,
    status: 'final',
    dependencies,
    validates: requirementIds,
    reviewedBy: [],
  })
}

/**
 * Create a synthesis artifact for the main task.
 */
export async function createSynthesisArtifact(
  taskId: string,
  taskTitle: string,
  content: string,
  subTaskIds: string[],
  requirementIds: string[],
  agentId: string = 'synthesis',
): Promise<void> {
  await ArtifactManager.createArtifact({
    taskId,
    agentId,
    title: taskTitle,
    description: 'Synthesized output from all sub-tasks',
    type: inferArtifactType(content),
    format: 'markdown',
    content,
    version: 1,
    status: 'final',
    dependencies: subTaskIds,
    validates: requirementIds,
    reviewedBy: [],
  })
}

// ============================================================================
// Task Status Helpers
// ============================================================================

/**
 * Update task status to in_progress with agent assignment.
 */
export async function markTaskInProgress(
  taskId: string,
  agentId: string,
): Promise<void> {
  const { updateTask } = useTaskStore.getState()
  await updateTask(taskId, {
    status: 'in_progress',
    assignedAgentId: agentId,
    assignedAt: new Date(),
  })
}

/**
 * Mark a task as completed with its execution metadata.
 */
export async function markTaskCompleted(
  taskId: string,
  turnsUsed: number,
  actualPasses: number = 1,
): Promise<void> {
  const { updateTask } = useTaskStore.getState()
  await updateTask(taskId, {
    status: 'completed',
    turnsUsed,
    actualPasses,
    completedAt: new Date(),
  })
}

/**
 * Mark a task as failed.
 */
export async function markTaskFailed(taskId: string): Promise<void> {
  const { updateTask } = useTaskStore.getState()
  await updateTask(taskId, {
    status: 'failed',
    completedAt: new Date(),
  })
}

// ============================================================================
// Main Task Get-or-Create
// ============================================================================

/**
 * Get an existing task or create a new one for orchestration.
 */
export async function getOrCreateMainTask(params: {
  existingTaskId?: string
  workflowId: string
  title: string
  description: string
  complexity: 'simple' | 'complex'
  requirements: Task['requirements']
  estimatedPasses: number
  executionMode: Task['executionMode']
  dueDate?: Date
  isSynthesis?: boolean
}): Promise<Task> {
  const { createTask, getTaskById, updateTask } = useTaskStore.getState()

  if (params.existingTaskId) {
    const existing = await getTaskById(params.existingTaskId)
    if (!existing)
      throw new Error(`Existing task ${params.existingTaskId} not found`)
    await updateTask(params.existingTaskId, {
      complexity: params.complexity,
      executionMode: params.executionMode,
      estimatedPasses: params.estimatedPasses,
      requirements: [...existing.requirements, ...params.requirements],
    })
    return (await getTaskById(params.existingTaskId))!
  }

  return await createTask({
    workflowId: params.workflowId,
    title: params.title,
    description: params.description,
    complexity: params.complexity,
    status: 'pending',
    dependencies: [],
    requirements: params.requirements,
    artifacts: [],
    steps: [],
    estimatedPasses: params.estimatedPasses,
    actualPasses: 0,
    executionMode: params.executionMode,
    isSynthesis: params.isSynthesis ?? false,
    dueDate: params.dueDate,
  })
}

// ============================================================================
// Sub-Task Creation
// ============================================================================

/**
 * Create sub-tasks in the store from decomposed tasks.
 * Returns a map of tempId → Task.
 */
export async function createSubTasks(
  decomposedTasks: DecomposedTask[],
  parentTaskId: string,
  workflowId: string,
): Promise<Map<string, Task>> {
  const { createTask } = useTaskStore.getState()
  const subTaskMap = new Map<string, Task>()

  for (const dt of decomposedTasks) {
    const subTask = await createTask({
      workflowId,
      title: dt.title,
      description: dt.description,
      complexity: dt.complexity,
      status: 'pending',
      parentTaskId,
      dependencies: [],
      requirements: dt.requirements.map((r) => ({
        id: crypto.randomUUID(),
        ...r,
        source: 'inferred' as const,
        status: 'pending' as const,
        validationCriteria: [],
        taskId: '',
        detectedAt: new Date(),
      })),
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      executionMode:
        dt.executionMode === 'iterative' ? 'iterative' : 'single-shot',
      parallelizable: dt.parallelizable,
      modelHint: dt.modelHint,
      ioContract: dt.ioContract,
    })
    subTaskMap.set(dt.tempId, subTask)
  }

  return subTaskMap
}

/**
 * Resolve sub-task dependencies from temp IDs to real task IDs.
 */
export async function resolveSubTaskDependencies(
  decomposedTasks: DecomposedTask[],
  subTaskMap: Map<string, Task>,
): Promise<void> {
  const { updateTask } = useTaskStore.getState()

  for (const dt of decomposedTasks) {
    const subTask = subTaskMap.get(dt.tempId)!
    const resolvedDeps = dt.dependsOn
      .map((tempId) => subTaskMap.get(tempId)?.id)
      .filter(Boolean) as string[]

    if (resolvedDeps.length > 0) {
      await updateTask(subTask.id, { dependencies: resolvedDeps })
    }
  }
}

// ============================================================================
// Agent Execution
// ============================================================================

/**
 * Execute a sub-task with an agent, handling both iterative and single-shot modes.
 * Emits events, creates conversation, saves messages, creates artifacts.
 *
 * This is the core "per-sub-task" execution block used by both multi-agent
 * and agent-team strategies.
 */
export async function executeSubTaskWithAgent(params: {
  subTask: Task
  agent: Agent
  decomposedTask: DecomposedTask
  workflowId: string
  dependencyOutputs: Array<{ taskTitle: string; content: string }>
  options?: OrchestrationOptions
  promptPrefix?: string
  progressBase?: number
  progressRange?: number
  completedCount?: number
  totalCount?: number
}): Promise<AgentRunnerResult> {
  const {
    subTask,
    agent,
    decomposedTask,
    workflowId,
    dependencyOutputs,
    options,
    promptPrefix = '',
    progressBase = 35,
    progressRange = 45,
    completedCount = 0,
    totalCount = 1,
  } = params

  // 1. Claim task (pending → claimed), then transition to in_progress
  claimTask(subTask.id, agent.id)
  await markTaskInProgress(subTask.id, agent.id)

  // 2. Create conversation
  const { conversationId, addMessage } = await createSubTaskConversation(
    agent.id,
    workflowId,
    decomposedTask.description,
  )

  // 3. Set up events
  const events = createAgentEventEmitters(
    subTask.id,
    agent.id,
    agent.name,
    workflowId,
  )
  events.emitStart()
  const handleContent = events.createStreamingHandler()

  // 4. Build execution config
  const fullPrompt = promptPrefix + decomposedTask.description

  const executionConfig: IsolatedExecutionConfig = {
    task: subTask,
    agent,
    prompt: fullPrompt,
    scope: decomposedTask.suggestedAgent.scope as AgentScope | undefined,
    dependencyOutputs,
    signal: options?.signal,
    onProgress: (update) => {
      const baseProgress =
        progressBase + (completedCount / totalCount) * progressRange
      options?.onProgress?.({
        phase: 'executing',
        progress: Math.min(80, baseProgress + update.turn),
        message: `[${subTask.title}] ${update.toolCall ? `Using ${update.toolCall}` : `Turn ${update.turn}`}`,
        subTasksCompleted: completedCount,
        subTasksTotal: totalCount,
      })
    },
    onContent: handleContent,
  }

  // 5. Execute — always use iterative runner so tools (wikipedia, math, etc.) are available
  const result = await runAgent(executionConfig)

  // 6. Emit completion
  events.emitComplete(result.success)

  // 7. Create artifact
  await createTaskArtifact(
    subTask.id,
    agent.id,
    subTask.title,
    agent.name,
    result.response,
    subTask.requirements.map((r) => r.id),
  )

  // 8. Save assistant message (including tool steps for UI display)
  const steps = toolCallsLogToMessageSteps(result.toolCallsLog)
  await addMessage(conversationId, {
    role: 'assistant',
    content: result.response,
    agentId: agent.id,
    ...(steps.length > 0 && { steps }),
  })

  // 9. Update task status
  const { updateTask } = useTaskStore.getState()
  await updateTask(subTask.id, {
    status: result.success ? 'completed' : 'failed',
    turnsUsed: result.turnsUsed,
    actualPasses: 1,
    completedAt: new Date(),
  })

  return result
}

// ============================================================================
// Synthesis
// ============================================================================

import { synthesizeResults } from '../synthesis-engine'
import type { DecomposedTask as _DecomposedTask } from '../task-decomposer'

/**
 * Run synthesis if needed and create synthesis artifact.
 * Returns the final response and whether synthesis was performed.
 */
export async function runSynthesisPhase(params: {
  requiresSynthesis: boolean
  decomposedTasks: DecomposedTask[]
  executedResults: Map<string, AgentRunnerResult | { response: string }>
  tempIdToResultKey: (tempId: string) => string
  agentNameResolver: (tempId: string) => string
  originalPrompt: string
  mainTask: Task
  allSubTaskIds: string[]
  signal?: AbortSignal
  synthesisAgentId?: string
}): Promise<{ synthesizedResponse: string; wasSynthesized: boolean }> {
  const {
    requiresSynthesis,
    decomposedTasks,
    executedResults,
    tempIdToResultKey,
    agentNameResolver,
    originalPrompt,
    mainTask,
    allSubTaskIds,
    signal,
    synthesisAgentId = 'synthesis',
  } = params

  let synthesizedResponse: string
  let wasSynthesized = false

  if (requiresSynthesis && executedResults.size > 1) {
    const synthesisResult = await synthesizeResults({
      originalPrompt,
      results: decomposedTasks
        .map((dt) => {
          const key = tempIdToResultKey(dt.tempId)
          const result = executedResults.get(key)
          return {
            taskTitle: dt.title,
            taskDescription: dt.description,
            agentName: agentNameResolver(dt.tempId),
            content: result?.response || '',
          }
        })
        .filter((r) => r.content.length > 0),
      signal,
      taskId: mainTask.id,
      workflowId: mainTask.workflowId,
    })
    synthesizedResponse = synthesisResult.content
    wasSynthesized = true
  } else {
    const lastTask = decomposedTasks[decomposedTasks.length - 1]
    const key = tempIdToResultKey(lastTask.tempId)
    synthesizedResponse = executedResults.get(key)?.response || ''
  }

  if (wasSynthesized) {
    await createSynthesisArtifact(
      mainTask.id,
      mainTask.title,
      synthesizedResponse,
      allSubTaskIds,
      mainTask.requirements.map((r) => r.id),
      synthesisAgentId,
    )
  }

  return { synthesizedResponse, wasSynthesized }
}

// ============================================================================
// Result Building
// ============================================================================

/**
 * Build the standard OrchestrationResult from execution data.
 */
export async function buildSuccessResult(params: {
  workflowId: string
  mainTaskId: string
  allSubTasks: Task[]
  synthesizedResponse: string
  totalTurnsUsed: number
  wasSynthesized: boolean
}): Promise<{
  success: true
  workflowId: string
  mainTaskId: string
  subTaskIds: string[]
  artifacts: Artifact[]
  synthesizedResponse: string
  totalTurnsUsed: number
  wasSynthesized: boolean
}> {
  const allArtifacts = await Promise.all(
    [{ id: params.mainTaskId } as Task, ...params.allSubTasks].map((t) =>
      ArtifactManager.getArtifactsByTask(t.id),
    ),
  )

  return {
    success: true,
    workflowId: params.workflowId,
    mainTaskId: params.mainTaskId,
    subTaskIds: params.allSubTasks.map((t) => t.id),
    artifacts: allArtifacts.flat(),
    synthesizedResponse: params.synthesizedResponse,
    totalTurnsUsed: params.totalTurnsUsed,
    wasSynthesized: params.wasSynthesized,
  }
}

/**
 * Build a failure OrchestrationResult.
 */
export function buildFailureResult(
  workflowId: string,
  mainTaskId: string,
  error: unknown,
): {
  success: false
  workflowId: string
  mainTaskId: string
  subTaskIds: string[]
  artifacts: Artifact[]
  errors: string[]
} {
  return {
    success: false,
    workflowId,
    mainTaskId,
    subTaskIds: [],
    artifacts: [],
    errors: [error instanceof Error ? error.message : 'Unknown error'],
  }
}

// ============================================================================
// Agent Selection
// ============================================================================

import {
  getAgentById,
  getDefaultAgent,
  loadAllAgents,
} from '@/stores/agentStore'

const DEFAULT_AGENT_ID = 'devs'

/**
 * Find the best existing agent for a task spec by scoring skill matches.
 * Never creates new agents — falls back to the assigned agent or the default "devs" agent.
 */
export async function findBestAgent(
  spec: AgentSpec,
  fallbackAgentId?: string,
): Promise<Agent> {
  const allAgents = await loadAllAgents()

  const scored = allAgents
    .filter((a) => !(a as any).deletedAt)
    .map((agent) => {
      let score = 0
      for (const skill of spec.requiredSkills) {
        const lower = skill.toLowerCase()
        if (agent.tags?.some((t) => t.toLowerCase() === lower)) score += 3
        if (agent.role.toLowerCase().includes(lower)) score += 2
        if (agent.instructions.toLowerCase().includes(lower)) score += 1
      }
      return { agent, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length > 0) return scored[0].agent

  if (fallbackAgentId) {
    const fallback = await getAgentById(fallbackAgentId)
    if (fallback) return fallback
  }

  const defaultAgent =
    (await getAgentById(DEFAULT_AGENT_ID)) || getDefaultAgent()
  if (defaultAgent) return defaultAgent

  throw new Error('No suitable agent found and no default agent available')
}

// ============================================================================
// Validation
// ============================================================================

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { AgentSpec } from '@/types'

const VALIDATOR_AGENT_ID = 'validator-agent'

/**
 * Validate whether a task's deliverables satisfy its requirements.
 */
export async function validateTaskCompletion(
  task: Task,
): Promise<{ validation_passed: boolean; reason: string }> {
  try {
    const validator = await getAgentById(VALIDATOR_AGENT_ID)
    if (!validator) {
      return { validation_passed: true, reason: 'Validator not available' }
    }

    const artifacts = await ArtifactManager.getArtifactsByTask(task.id)
    const config = await CredentialService.getActiveConfig()
    if (!config) throw new Error('No AI provider configured')

    const validationPrompt = `
Task: ${task.title}
Description: ${task.description}
Requirements: ${task.requirements.map((r) => `${r.type}: ${r.description} (Priority: ${r.priority})`).join('\n')}

Deliverables:
${artifacts.map((a) => `- ${a.title}: ${a.content.substring(0, 500)}...`).join('\n')}

Please validate if all requirements are met. Respond with JSON: {"validation_passed": boolean, "reason": "string"}`

    const messages: LLMMessage[] = [
      { role: 'system', content: validator.instructions },
      { role: 'user', content: validationPrompt },
    ]

    let response = ''
    for await (const chunk of LLMService.streamChat(messages, config, {
      agentId: validator.id,
      taskId: task.id,
    })) {
      response += chunk
    }

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      validation_passed:
        response.toLowerCase().includes('true') ||
        response.toLowerCase().includes('passed'),
      reason: response,
    }
  } catch (error) {
    console.error('Validation failed:', error)
    return {
      validation_passed: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    }
  }
}

/**
 * Create a refinement task for addressing validation failures.
 */
export async function createRefinementTask(
  originalTask: Task,
  failureReason: string,
): Promise<Task> {
  const { createTask } = useTaskStore.getState()
  return await createTask({
    workflowId: originalTask.workflowId,
    title: `Refinement: ${originalTask.title}`,
    description: `Address validation issues: ${failureReason}`,
    complexity: 'simple',
    status: 'pending',
    assignedAgentId: originalTask.assignedAgentId,
    parentTaskId: originalTask.id,
    dependencies: [originalTask.id],
    requirements: originalTask.requirements.filter(
      (r) => r.status !== 'satisfied',
    ),
    artifacts: [],
    steps: [],
    estimatedPasses: 1,
    actualPasses: 0,
    executionMode: 'iterative',
    dueDate: new Date(Date.now() + 60 * 60 * 1000),
  })
}

// ============================================================================
// Artifact Type Inference
// ============================================================================

/**
 * Infer artifact type from response content using keyword heuristics.
 */
export function inferArtifactType(response: string): Artifact['type'] {
  const lower = response.toLowerCase()
  if (
    lower.includes('```') ||
    lower.includes('function') ||
    lower.includes('class')
  )
    return 'code'
  if (lower.includes('analysis') || lower.includes('findings'))
    return 'analysis'
  if (lower.includes('design') || lower.includes('architecture'))
    return 'design'
  if (lower.includes('plan') || lower.includes('roadmap')) return 'plan'
  if (lower.includes('report') || lower.includes('summary')) return 'report'
  return 'document'
}

// ============================================================================
// Validate & Refine Convenience
// ============================================================================

/**
 * Validates a completed task and, if validation fails, creates a refinement
 * task and runs one correction pass with the given agent.
 *
 * Returns `true` if the original output passed validation (or got refined).
 */
export async function validateAndRefine(
  task: Task,
  agent: Agent,
  prompt: string,
  options?: { signal?: AbortSignal; scope?: AgentSpec['scope'] },
): Promise<boolean> {
  try {
    const validationResult = await validateTaskCompletion(task)

    if (validationResult.validation_passed) {
      return true
    }

    // Create refinement task
    const refinementTask = await createRefinementTask(
      task,
      validationResult.reason,
    )

    // Claim + execute refinement
    claimTask(refinementTask.id, agent.id)
    await markTaskInProgress(refinementTask.id, agent.id)

    await runAgent({
      task: refinementTask,
      agent,
      prompt: `Please address these issues with your previous output: ${validationResult.reason}\n\nOriginal task: ${prompt}`,
      scope: options?.scope,
      signal: options?.signal,
    })

    await markTaskCompleted(refinementTask.id, 1, 1)

    return true // Refinement attempted
  } catch (error) {
    console.warn('⚠️ Validation/refinement failed, continuing:', error)
    return false
  }
}
