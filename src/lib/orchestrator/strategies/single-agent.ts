/**
 * Single Agent Strategy
 *
 * Handles simple tasks that require only one agent.
 * Flow: find agent → execute → validate → refine if needed → complete.
 *
 * @module lib/orchestrator/strategies/single-agent
 */

import { TaskAnalyzer, type TaskAnalysisResult } from '@/lib/task-analyzer'
import { ArtifactManager } from '@/lib/artifact-manager'
import { runAgent } from '../agent-runner'
import type { OrchestrationOptions, OrchestrationResult } from '../engine'
import {
  getOrCreateMainTask,
  findBestAgent,
  createSubTaskConversation,
  createAgentEventEmitters,
  createTaskArtifact,
  markTaskCompleted,
  validateAndRefine,
  buildFailureResult,
  toolCallsLogToMessageSteps,
} from './shared'

import { useTaskStore } from '@/stores/taskStore'
import { claimTask } from '@/stores/taskStore'
import { emit } from '../events'
import { requestHumanInput } from '@/lib/hitl'

export async function executeSingleAgent(
  prompt: string,
  analysis: TaskAnalysisResult,
  workflowId: string,
  existingTaskId?: string,
  options?: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { updateTask } = useTaskStore.getState()

  // Get or create task
  const mainTask = await getOrCreateMainTask({
    existingTaskId,
    workflowId,
    title: TaskAnalyzer.extractTaskTitle(prompt),
    description: prompt,
    complexity: 'simple',
    requirements: analysis.requirements.map((req) => ({
      ...req,
      detectedAt: req.detectedAt || new Date(),
    })),
    estimatedPasses: 1,
    executionMode: 'iterative',
    dueDate: new Date(Date.now() + analysis.estimatedDuration * 60 * 1000),
  })

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

    // Claim the task before execution (pending → claimed)
    claimTask(mainTask.id, agent.id)

    options?.onProgress?.({
      phase: 'executing',
      progress: 30,
      message: `Agent "${agent.name}" working on task...`,
    })

    // Create conversation
    const { conversationId, addMessage } = await createSubTaskConversation(
      agent.id,
      workflowId,
      prompt,
    )

    // Transition claimed → in_progress once agent starts producing output
    await updateTask(mainTask.id, {
      status: 'in_progress',
      assignedAgentId: agent.id,
      assignedAt: new Date(),
      conversationId,
    })

    // HITL checkpoint: ask for approval before agent execution
    const hitlResponse = await requestHumanInput({
      conversationId,
      agentId: agent.id,
      type: 'approval',
      question: `I'll handle this task: **${mainTask.title}**\n\nShould I proceed?`,
      quickReplies: [
        { label: 'Proceed', value: 'proceed', color: 'success' },
        { label: 'Cancel', value: 'cancel', color: 'danger' },
      ],
    })

    if (hitlResponse.value === 'cancel') {
      await updateTask(mainTask.id, { status: 'failed' })
      return buildFailureResult(
        workflowId,
        mainTask.id,
        new Error('Cancelled by user'),
      )
    }

    // Set up event emitters
    const events = createAgentEventEmitters(
      mainTask.id,
      agent.id,
      agent.name,
      workflowId,
    )
    events.emitStart()

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
      onContent: (content) => {
        emit({
          type: 'agent-streaming',
          taskId: mainTask.id,
          agentId: agent.id,
          content,
          workflowId,
        })
      },
    })

    events.emitComplete(result.success)

    options?.onProgress?.({
      phase: 'validating',
      progress: 85,
      message: 'Validating result...',
    })

    // Save final assistant message (including tool steps for UI display)
    const steps = toolCallsLogToMessageSteps(result.toolCallsLog)
    await addMessage(conversationId, {
      role: 'assistant',
      content: result.response,
      agentId: agent.id,
      ...(steps.length > 0 && { steps }),
    })

    // Create artifact
    await createTaskArtifact(
      mainTask.id,
      agent.id,
      mainTask.title,
      agent.name,
      result.response,
      mainTask.requirements.map((r) => r.id),
    )

    // Validate & refine (one pass)
    if (result.success) {
      await validateAndRefine(mainTask, agent, prompt, {
        signal: options?.signal,
        scope: agentSpec.scope,
      })
    }

    // Mark complete
    await markTaskCompleted(mainTask.id, result.turnsUsed, 1)

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
    return buildFailureResult(workflowId, mainTask.id, error)
  }
}
