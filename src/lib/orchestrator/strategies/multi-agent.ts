/**
 * Multi-Agent Strategy
 *
 * Handles complex tasks that require decomposition into sub-tasks
 * executed by multiple agents with dependency resolution.
 *
 * Flow: decompose → create sub-tasks → recruit agents →
 *       execute with dependency resolution → synthesize → complete.
 *
 * @module lib/orchestrator/strategies/multi-agent
 */

import type { TaskAnalysisResult } from '@/lib/task-analyzer'
import { useTaskStore } from '@/stores/taskStore'
import { decomposeTask } from '../task-decomposer'
import type { AgentRunnerResult } from '../agent-runner'
import type { OrchestrationOptions, OrchestrationResult } from '../engine'

import {
  getOrCreateMainTask,
  findBestAgent,
  createSubTasks,
  resolveSubTaskDependencies,
  executeSubTaskWithAgent,
  runSynthesisPhase,
  buildSuccessResult,
  buildFailureResult,
  markTaskCompleted,
} from './shared'

export async function executeMultiAgent(
  prompt: string,
  analysis: TaskAnalysisResult,
  workflowId: string,
  existingTaskId?: string,
  options?: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { updateTask } = useTaskStore.getState()

  try {
    // Phase 1: LLM-driven decomposition
    options?.onProgress?.({
      phase: 'decomposing',
      progress: 10,
      message: 'Breaking down task into sub-tasks...',
    })

    const decomposition = await decomposeTask(prompt, analysis)

    // Phase 2: Create main task
    const mainTask = await getOrCreateMainTask({
      existingTaskId,
      workflowId,
      title: decomposition.mainTaskTitle,
      description: prompt,
      complexity: 'complex',
      requirements: analysis.requirements.map((r) => ({
        ...r,
        detectedAt: r.detectedAt || new Date(),
      })),
      estimatedPasses: analysis.estimatedPasses,
      executionMode:
        decomposition.strategy === 'parallel_isolated'
          ? 'parallel-isolated'
          : 'iterative',
      dueDate: new Date(
        Date.now() + (decomposition.estimatedDuration || 60) * 60 * 1000,
      ),
    })

    await updateTask(mainTask.id, { status: 'in_progress' })

    // Phase 3: Create sub-tasks
    options?.onProgress?.({
      phase: 'preparing',
      progress: 20,
      message: `Creating ${decomposition.subTasks.length} sub-tasks...`,
    })

    const subTaskMap = await createSubTasks(
      decomposition.subTasks,
      mainTask.id,
      workflowId,
    )

    await resolveSubTaskDependencies(decomposition.subTasks, subTaskMap)

    // Phase 4: Recruit agents
    options?.onProgress?.({
      phase: 'recruiting',
      progress: 30,
      message: 'Recruiting agents...',
    })

    const agentMap = new Map<
      string,
      Awaited<ReturnType<typeof findBestAgent>>
    >()
    for (const dt of decomposition.subTasks) {
      const agent = await findBestAgent(
        { ...dt.suggestedAgent, estimatedExperience: 'Mid' },
        mainTask.assignedAgentId,
      )
      agentMap.set(dt.tempId, agent)
    }

    // Phase 5: Execute with dependency resolution
    options?.onProgress?.({
      phase: 'executing',
      progress: 35,
      message: 'Executing sub-tasks...',
    })

    const executedResults = new Map<string, AgentRunnerResult>()
    const executedSet = new Set<string>()
    let totalTurnsUsed = 0

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

        // Gather dependency outputs
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

        const result = await executeSubTaskWithAgent({
          subTask,
          agent,
          decomposedTask,
          workflowId,
          dependencyOutputs,
          options,
          completedCount: executedSet.size,
          totalCount: decomposition.subTasks.length,
        })

        executedResults.set(decomposedTask.tempId, result)
        totalTurnsUsed += result.turnsUsed

        return { tempId: decomposedTask.tempId, result }
      })

      await Promise.all(batchPromises)
      readyTasks.forEach((dt) => executedSet.add(dt.tempId))
    }

    // Phase 6: Synthesis
    options?.onProgress?.({
      phase: 'synthesizing',
      progress: 85,
      message: 'Synthesizing results...',
    })

    const allSubTasks = Array.from(subTaskMap.values())

    const { synthesizedResponse, wasSynthesized } = await runSynthesisPhase({
      requiresSynthesis: decomposition.requiresSynthesis,
      decomposedTasks: decomposition.subTasks,
      executedResults,
      tempIdToResultKey: (tempId) => tempId,
      agentNameResolver: (tempId) => agentMap.get(tempId)?.name || 'Agent',
      originalPrompt: prompt,
      mainTask,
      allSubTaskIds: allSubTasks.map((t) => t.id),
      signal: options?.signal,
    })

    // Phase 7: Complete
    await markTaskCompleted(
      mainTask.id,
      totalTurnsUsed,
      decomposition.subTasks.length,
    )

    options?.onProgress?.({
      phase: 'completed',
      progress: 100,
      message: 'Task completed',
      subTasksCompleted: decomposition.subTasks.length,
      subTasksTotal: decomposition.subTasks.length,
    })

    return await buildSuccessResult({
      workflowId,
      mainTaskId: mainTask.id,
      allSubTasks,
      synthesizedResponse,
      totalTurnsUsed,
      wasSynthesized,
    })
  } catch (error) {
    console.error('❌ Multi-agent execution failed:', error)
    return buildFailureResult(workflowId, existingTaskId || '', error)
  }
}
