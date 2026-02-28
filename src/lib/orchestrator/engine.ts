/**
 * Orchestration Engine v2
 *
 * A ground-up rewrite of the task orchestration system, addressing all six
 * cross-cutting patterns identified in the competitive analysis:
 *
 * 1. **Fresh Context Per Agent**  — Each agent executes with isolated context
 * 2. **Iterative Execution**      — Agents loop with tool support (reason→act→observe)
 * 3. **Modular Skills**           — Skills activated on-demand during iteration
 * 4. **Scoped Permissions**       — Per-agent tool/model/turn budgets
 * 5. **Async/Background**         — Task queue with fire-and-forget execution
 * 6. **Result Synthesis**         — Dedicated synthesis step after parallel work
 *
 * Architecture:
 * ```
 * User Prompt
 *   → TaskAnalyzer.analyzePrompt()          [LLM: determine complexity]
 *   → decomposeTask()                        [LLM: produce dependency graph]
 *   → For each sub-task:
 *       → runAgent() with fresh context       [Agentic loop with tools]
 *   → synthesizeResults()                     [Merge into unified output]
 *   → Return OrchestrationResult
 * ```
 *
 * @module lib/orchestrator/engine
 */

import { TaskAnalyzer, type TaskAnalysisResult } from '@/lib/task-analyzer'
import { ArtifactManager } from '@/lib/artifact-manager'
import { useTaskStore } from '@/stores/taskStore'
import { useConversationStore } from '@/stores/conversationStore'
import {
  getAgentById,
  getDefaultAgent,
  loadAllAgents,
} from '@/stores/agentStore'
import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type {
  Task,
  Agent,
  AgentSpec,
  Artifact,
  AgentScope,
  IsolatedExecutionConfig,
} from '@/types'

import {
  runAgent,
  runAgentSingleShot,
  type AgentRunnerResult,
} from './agent-runner'
import { decomposeTask } from './task-decomposer'
import { synthesizeResults } from './synthesis-engine'
import { TaskQueue } from './task-queue'

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
// Constants
// ============================================================================

const DEFAULT_AGENT_ID = 'devs'
const VALIDATOR_AGENT_ID = 'validator-agent'

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

  try {
    // Phase 1: Analyze
    options?.onProgress?.({
      phase: 'analyzing',
      progress: 5,
      message: 'Analyzing task...',
    })

    const analysis = await TaskAnalyzer.analyzePrompt(prompt)

    // Phase 2: Create workflow
    const workflowId = crypto.randomUUID()

    // Phase 3: Route to strategy
    if (analysis.complexity === 'simple') {
      return await executeSingleAgent(
        prompt,
        analysis,
        workflowId,
        existingTaskId,
        options,
      )
    } else {
      return await executeMultiAgent(
        prompt,
        analysis,
        workflowId,
        existingTaskId,
        options,
      )
    }
  } catch (error) {
    console.error('❌ Orchestration failed:', error)
    throw error
  } finally {
    runningOrchestrations.delete(orchestrationKey)
  }
}

// ============================================================================
// Single Agent Strategy
// ============================================================================

async function executeSingleAgent(
  prompt: string,
  analysis: TaskAnalysisResult,
  workflowId: string,
  existingTaskId?: string,
  options?: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { createTask, getTaskById, updateTask } = useTaskStore.getState()

  // Get or create task
  let mainTask: Task
  if (existingTaskId) {
    const existing = await getTaskById(existingTaskId)
    if (!existing) throw new Error(`Existing task ${existingTaskId} not found`)
    await updateTask(existingTaskId, {
      complexity: 'simple',
      estimatedPasses: 1,
      executionMode: 'iterative',
      requirements: [
        ...existing.requirements,
        ...analysis.requirements.map((req) => ({
          ...req,
          detectedAt: req.detectedAt || new Date(),
        })),
      ],
    })
    mainTask = (await getTaskById(existingTaskId))!
  } else {
    mainTask = await createTask({
      workflowId,
      title: TaskAnalyzer.extractTaskTitle(prompt),
      description: prompt,
      complexity: 'simple',
      status: 'pending',
      dependencies: [],
      requirements: analysis.requirements.map((req) => ({
        ...req,
        detectedAt: req.detectedAt || new Date(),
      })),
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      executionMode: 'iterative',
      dueDate: new Date(Date.now() + analysis.estimatedDuration * 60 * 1000),
    })
  }

  try {
    options?.onProgress?.({
      phase: 'executing',
      progress: 20,
      message: 'Finding best agent...',
    })

    // Find the best existing agent for this task
    const agentSpec = analysis.suggestedAgents[0] || {
      name: 'Task Executor',
      role: 'General Task Executor',
      requiredSkills: analysis.requiredSkills,
      estimatedExperience: 'Mid',
      specialization: 'General problem solving',
    }

    const agent = await findBestAgent(agentSpec, mainTask.assignedAgentId)

    // Update task with agent assignment
    await updateTask(mainTask.id, {
      status: 'in_progress',
      assignedAgentId: agent.id,
      assignedAt: new Date(),
    })

    options?.onProgress?.({
      phase: 'executing',
      progress: 30,
      message: `Agent "${agent.name}" working on task...`,
    })

    // Execute with iterative runner (FRESH CONTEXT + TOOL SUPPORT)
    const result = await runAgent({
      task: mainTask,
      agent,
      prompt,
      scope: agentSpec.scope,
      signal: options?.signal,
      onProgress: (update) => {
        options?.onProgress?.({
          phase: 'executing',
          progress: 30 + Math.min(50, update.turn * 5),
          message: update.toolCall
            ? `Using tool: ${update.toolCall}`
            : `Agent thinking (turn ${update.turn})...`,
        })
      },
    })

    options?.onProgress?.({
      phase: 'validating',
      progress: 85,
      message: 'Validating result...',
    })

    // Create conversation and save messages
    const { createConversation, addMessage } = useConversationStore.getState()
    const conversation = await createConversation(agent.id, workflowId)
    await addMessage(conversation.id, { role: 'user', content: prompt })
    await addMessage(conversation.id, {
      role: 'assistant',
      content: result.response,
      agentId: agent.id,
    })

    // Create artifact
    await ArtifactManager.createArtifact({
      taskId: mainTask.id,
      agentId: agent.id,
      title: `${mainTask.title} - Deliverable`,
      description: `Output from ${agent.name}`,
      type: inferArtifactType(result.response),
      format: 'markdown',
      content: result.response,
      version: 1,
      status: 'final',
      dependencies: [],
      validates: mainTask.requirements.map((r) => r.id),
      reviewedBy: [],
    })

    // Validate
    const isValid = await validateTaskCompletion(mainTask)
    if (!isValid.validation_passed && result.success) {
      // Create refinement task and re-execute
      const refinementTask = await createRefinementTask(
        mainTask,
        isValid.reason,
      )
      await runAgent({
        task: refinementTask,
        agent,
        prompt: `Please address these issues with your previous output: ${isValid.reason}\n\nOriginal task: ${prompt}`,
        scope: agentSpec.scope,
        signal: options?.signal,
      })
    }

    // Mark complete
    await updateTask(mainTask.id, {
      status: 'completed',
      actualPasses: 1,
      turnsUsed: result.turnsUsed,
      completedAt: new Date(),
    })

    options?.onProgress?.({
      phase: 'completed',
      progress: 100,
      message: 'Task completed',
    })

    const artifacts = await ArtifactManager.getArtifactsByTask(mainTask.id)

    return {
      success: true,
      workflowId,
      mainTaskId: mainTask.id,
      subTaskIds: [],
      artifacts,
      synthesizedResponse: result.response,
      totalTurnsUsed: result.turnsUsed,
      wasSynthesized: false,
    }
  } catch (error) {
    console.error('❌ Single agent execution failed:', error)
    await updateTask(mainTask.id, { status: 'failed' })
    return {
      success: false,
      workflowId,
      mainTaskId: mainTask.id,
      subTaskIds: [],
      artifacts: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

// ============================================================================
// Multi-Agent Strategy
// ============================================================================

async function executeMultiAgent(
  prompt: string,
  analysis: TaskAnalysisResult,
  workflowId: string,
  existingTaskId?: string,
  options?: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { createTask, getTaskById, updateTask } = useTaskStore.getState()

  try {
    // Phase 2: LLM-driven decomposition
    options?.onProgress?.({
      phase: 'decomposing',
      progress: 10,
      message: 'Breaking down task into sub-tasks...',
    })

    const decomposition = await decomposeTask(prompt, analysis)

    // Phase 3: Create main task
    let mainTask: Task
    if (existingTaskId) {
      const existing = await getTaskById(existingTaskId)
      if (!existing)
        throw new Error(`Existing task ${existingTaskId} not found`)
      await updateTask(existingTaskId, {
        complexity: 'complex',
        executionMode:
          decomposition.strategy === 'parallel_isolated'
            ? 'parallel-isolated'
            : 'iterative',
        requirements: [
          ...existing.requirements,
          ...analysis.requirements.map((r) => ({
            ...r,
            detectedAt: r.detectedAt || new Date(),
          })),
        ],
      })
      mainTask = (await getTaskById(existingTaskId))!
    } else {
      mainTask = await createTask({
        workflowId,
        title: decomposition.mainTaskTitle,
        description: prompt,
        complexity: 'complex',
        status: 'pending',
        dependencies: [],
        requirements: analysis.requirements.map((r) => ({
          ...r,
          detectedAt: r.detectedAt || new Date(),
        })),
        artifacts: [],
        steps: [],
        estimatedPasses: analysis.estimatedPasses,
        actualPasses: 0,
        executionMode:
          decomposition.strategy === 'parallel_isolated'
            ? 'parallel-isolated'
            : 'iterative',
        isSynthesis: false,
        dueDate: new Date(
          Date.now() + (decomposition.estimatedDuration || 60) * 60 * 1000,
        ),
      })
    }

    await updateTask(mainTask.id, {
      status: 'in_progress',
    })

    // Phase 4: Create sub-tasks in store
    options?.onProgress?.({
      phase: 'preparing',
      progress: 20,
      message: `Creating ${decomposition.subTasks.length} sub-tasks...`,
    })

    const subTaskMap = new Map<string, Task>() // tempId → Task
    for (const decomposedTask of decomposition.subTasks) {
      const subTask = await createTask({
        workflowId,
        title: decomposedTask.title,
        description: decomposedTask.description,
        complexity: decomposedTask.complexity,
        status: 'pending',
        parentTaskId: mainTask.id,
        dependencies: [], // Will be resolved by tempId mapping
        requirements: decomposedTask.requirements.map((r) => ({
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
          decomposedTask.executionMode === 'iterative'
            ? 'iterative'
            : 'single-shot',
        parallelizable: decomposedTask.parallelizable,
        modelHint: decomposedTask.modelHint,
        ioContract: decomposedTask.ioContract,
      })
      subTaskMap.set(decomposedTask.tempId, subTask)
    }

    // Resolve dependencies (tempId → real task ID)
    for (const decomposedTask of decomposition.subTasks) {
      const subTask = subTaskMap.get(decomposedTask.tempId)!
      const resolvedDeps = decomposedTask.dependsOn
        .map((tempId) => subTaskMap.get(tempId)?.id)
        .filter(Boolean) as string[]

      if (resolvedDeps.length > 0) {
        await updateTask(subTask.id, { dependencies: resolvedDeps })
      }
    }

    // Phase 5: Build agent team
    options?.onProgress?.({
      phase: 'recruiting',
      progress: 30,
      message: 'Recruiting agents...',
    })

    const agentMap = new Map<string, Agent>() // tempId → Agent
    for (const decomposedTask of decomposition.subTasks) {
      const agent = await findBestAgent(
        { ...decomposedTask.suggestedAgent, estimatedExperience: 'Mid' },
        mainTask.assignedAgentId,
      )
      agentMap.set(decomposedTask.tempId, agent)
    }

    // Phase 6: Execute with dependency resolution
    options?.onProgress?.({
      phase: 'executing',
      progress: 35,
      message: 'Executing sub-tasks...',
    })

    const executedResults = new Map<string, AgentRunnerResult>() // tempId → result
    const executedSet = new Set<string>()
    let totalTurnsUsed = 0
    const allSubTasks = Array.from(subTaskMap.values())

    while (executedSet.size < decomposition.subTasks.length) {
      // Find tasks whose dependencies are all satisfied
      const readyTasks = decomposition.subTasks.filter(
        (dt) =>
          !executedSet.has(dt.tempId) &&
          dt.dependsOn.every((dep) => executedSet.has(dep)),
      )

      if (readyTasks.length === 0) {
        throw new Error('Circular dependency detected or no tasks ready')
      }

      // Execute ready tasks in parallel
      const batchPromises = readyTasks.map(async (decomposedTask) => {
        const subTask = subTaskMap.get(decomposedTask.tempId)!
        const agent = agentMap.get(decomposedTask.tempId)!

        // Gather dependency outputs (CONTEXT ISOLATION: only inject explicit deps)
        const dependencyOutputs: Array<{ taskTitle: string; content: string }> =
          []
        for (const depTempId of decomposedTask.dependsOn) {
          const depResult = executedResults.get(depTempId)
          const depTask = subTaskMap.get(depTempId)
          if (depResult && depTask) {
            dependencyOutputs.push({
              taskTitle: depTask.title,
              content: depResult.response,
            })
          }
        }

        // Update sub-task status
        await updateTask(subTask.id, {
          status: 'in_progress',
          assignedAgentId: agent.id,
          assignedAt: new Date(),
        })

        // Execute with fresh, isolated context
        const executionConfig: IsolatedExecutionConfig = {
          task: subTask,
          agent,
          prompt: decomposedTask.description,
          scope: decomposedTask.suggestedAgent.scope as AgentScope | undefined,
          dependencyOutputs,
          signal: options?.signal,
          onProgress: (update) => {
            const completedCount = executedSet.size
            const totalCount = decomposition.subTasks.length
            const baseProgress = 35 + (completedCount / totalCount) * 45
            options?.onProgress?.({
              phase: 'executing',
              progress: Math.min(80, baseProgress + update.turn),
              message: `[${subTask.title}] ${update.toolCall ? `Using ${update.toolCall}` : `Turn ${update.turn}`}`,
              subTasksCompleted: completedCount,
              subTasksTotal: totalCount,
            })
          },
        }

        // Choose execution mode
        let result: AgentRunnerResult
        if (decomposedTask.executionMode === 'iterative') {
          result = await runAgent(executionConfig)
        } else {
          result = await runAgentSingleShot(
            agent,
            subTask,
            decomposedTask.description,
            decomposedTask.suggestedAgent.scope as AgentScope | undefined,
            dependencyOutputs,
            options?.signal,
          )
        }

        // Store result and update task
        executedResults.set(decomposedTask.tempId, result)
        totalTurnsUsed += result.turnsUsed

        // Create artifact for sub-task
        await ArtifactManager.createArtifact({
          taskId: subTask.id,
          agentId: agent.id,
          title: `${subTask.title} - Output`,
          description: `Output from ${agent.name}`,
          type: inferArtifactType(result.response),
          format: 'markdown',
          content: result.response,
          version: 1,
          status: 'final',
          dependencies: [],
          validates: subTask.requirements.map((r) => r.id),
          reviewedBy: [],
        })

        // Create conversation record
        const { createConversation, addMessage } =
          useConversationStore.getState()
        const conv = await createConversation(agent.id, workflowId)
        await addMessage(conv.id, {
          role: 'user',
          content: decomposedTask.description,
        })
        await addMessage(conv.id, {
          role: 'assistant',
          content: result.response,
          agentId: agent.id,
        })

        await updateTask(subTask.id, {
          status: result.success ? 'completed' : 'failed',
          turnsUsed: result.turnsUsed,
          actualPasses: 1,
          completedAt: new Date(),
        })

        return { tempId: decomposedTask.tempId, result }
      })

      await Promise.all(batchPromises)

      // Mark batch as executed
      readyTasks.forEach((dt) => executedSet.add(dt.tempId))
    }

    // Phase 7: Synthesis
    options?.onProgress?.({
      phase: 'synthesizing',
      progress: 85,
      message: 'Synthesizing results...',
    })

    let synthesizedResponse: string
    let wasSynthesized = false

    if (decomposition.requiresSynthesis && executedResults.size > 1) {
      const synthesisResult = await synthesizeResults({
        originalPrompt: prompt,
        results: decomposition.subTasks.map((dt) => ({
          taskTitle: dt.title,
          taskDescription: dt.description,
          agentName: agentMap.get(dt.tempId)?.name || 'Agent',
          content: executedResults.get(dt.tempId)?.response || '',
        })),
        signal: options?.signal,
      })
      synthesizedResponse = synthesisResult.content
      wasSynthesized = true
    } else {
      // Use the last task's response (usually the synthesis/final task in sequential pipelines)
      const lastTask = decomposition.subTasks[decomposition.subTasks.length - 1]
      synthesizedResponse = executedResults.get(lastTask.tempId)?.response || ''
    }

    // Create synthesis artifact
    if (wasSynthesized) {
      await ArtifactManager.createArtifact({
        taskId: mainTask.id,
        agentId: 'synthesis',
        title: `${mainTask.title} - Synthesized Result`,
        description: 'Synthesized output from all sub-tasks',
        type: inferArtifactType(synthesizedResponse),
        format: 'markdown',
        content: synthesizedResponse,
        version: 1,
        status: 'final',
        dependencies: allSubTasks.map((t) => t.id),
        validates: mainTask.requirements.map((r) => r.id),
        reviewedBy: [],
      })
    }

    // Phase 8: Complete
    await updateTask(mainTask.id, {
      status: 'completed',
      actualPasses: decomposition.subTasks.length,
      turnsUsed: totalTurnsUsed,
      completedAt: new Date(),
    })

    options?.onProgress?.({
      phase: 'completed',
      progress: 100,
      message: 'Task completed',
      subTasksCompleted: decomposition.subTasks.length,
      subTasksTotal: decomposition.subTasks.length,
    })

    const allArtifacts = await Promise.all(
      [mainTask, ...allSubTasks].map((t) =>
        ArtifactManager.getArtifactsByTask(t.id),
      ),
    )

    return {
      success: true,
      workflowId,
      mainTaskId: mainTask.id,
      subTaskIds: allSubTasks.map((t) => t.id),
      artifacts: allArtifacts.flat(),
      synthesizedResponse,
      totalTurnsUsed,
      wasSynthesized,
    }
  } catch (error) {
    console.error('❌ Multi-agent execution failed:', error)
    return {
      success: false,
      workflowId,
      mainTaskId: existingTaskId || '',
      subTaskIds: [],
      artifacts: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

// ============================================================================
// Agent Management
// ============================================================================

/**
 * Find the best existing agent for a task spec by scoring skill matches.
 * Never creates new agents — falls back to the assigned agent or the default "devs" agent.
 */
async function findBestAgent(
  spec: AgentSpec,
  fallbackAgentId?: string,
): Promise<Agent> {
  const allAgents = await loadAllAgents()

  // Score agents by skill match
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

  // Fallback to the task's assigned agent
  if (fallbackAgentId) {
    const fallback = await getAgentById(fallbackAgentId)
    if (fallback) return fallback
  }

  // Ultimate fallback: the default "devs" agent
  const defaultAgent =
    (await getAgentById(DEFAULT_AGENT_ID)) || getDefaultAgent()
  if (defaultAgent) return defaultAgent

  throw new Error('No suitable agent found and no default agent available')
}

// ============================================================================
// Validation
// ============================================================================

async function validateTaskCompletion(
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

async function createRefinementTask(
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
// Helpers
// ============================================================================

function inferArtifactType(response: string): Artifact['type'] {
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
// Background Execution
// ============================================================================

/**
 * Submit a task for background execution.
 * Returns immediately with the task ID.
 * Use TaskQueue events to monitor progress.
 */
export function submitBackground(
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
