/**
 * Agent Team Strategy
 *
 * Handles team-based task execution where agents collaborate through
 * a shared task list and inter-agent messaging (mailbox).
 *
 * Unlike multi-agent (where the orchestrator dictates assignments), agent teams
 * feature a shared task list that teammates claim from, plus direct inter-agent
 * messaging for communication.
 *
 * Flow: decompose → recruit team → populate shared task list →
 *       team execution loop (claim, execute, communicate) → synthesize → complete.
 *
 * @module lib/orchestrator/strategies/agent-team
 */

import type { TaskAnalysisResult } from '@/lib/task-analyzer'
import { useTaskStore } from '@/stores/taskStore'
import { getDefaultAgent, loadAllAgents } from '@/stores/agentStore'
import { decomposeTask } from '../task-decomposer'
import { runAgentWithRetry, type AgentRunnerResult } from '../agent-runner'
import { TeamCoordinator, type TeamDetectionResult } from '../team-coordinator'
import type { Agent, AgentScope, IsolatedExecutionConfig } from '@/types'
import type { OrchestrationOptions, OrchestrationResult } from '../engine'

import {
  getOrCreateMainTask,
  createSubTasks,
  createAgentEventEmitters,
  createSubTaskConversation,
  createTaskArtifact,
  runSynthesisPhase,
  buildSuccessResult,
  buildFailureResult,
  markTaskCompleted,
  markTaskFailed,
  markTaskInProgress,
  validateAndRefine,
  toolCallsLogToMessageSteps,
} from './shared'
import { claimTask } from '@/stores/taskStore'
import { useMailboxStore } from '@/stores/mailboxStore'

export async function executeAgentTeam(
  prompt: string,
  analysis: TaskAnalysisResult,
  workflowId: string,
  teamDetection?: TeamDetectionResult,
  existingTaskId?: string,
  options?: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { updateTask } = useTaskStore.getState()
  const coordinator = new TeamCoordinator()

  // Default detection for non-team requests routed here (merged multi-agent path)
  const detection: TeamDetectionResult = teamDetection || {
    isTeamRequest: false,
    suggestedRoles: [],
    requestedAgentIdentifiers: [],
  }

  try {
    // Phase 1: Decompose task
    options?.onProgress?.({
      phase: 'decomposing',
      progress: 10,
      message: 'Breaking down task for team execution...',
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
      executionMode: 'iterative',
      dueDate: new Date(
        Date.now() + (decomposition.estimatedDuration || 60) * 60 * 1000,
      ),
    })

    await updateTask(mainTask.id, { status: 'in_progress' })

    // Phase 3: Recruit team
    options?.onProgress?.({
      phase: 'recruiting',
      progress: 25,
      message: `Forming agent team (${detection.suggestedRoles.length || decomposition.subTasks.length} roles)...`,
    })

    const allAgents = await loadAllAgents()
    const activeAgents = allAgents.filter((a: any) => !a.deletedAt)

    // Merge agent identifiers from @mentions (syntactic) and LLM extraction (semantic)
    const requestedIdentifiers = [
      ...(detection.requestedAgentIdentifiers || []),
      ...(analysis.requestedAgentIdentifiers || []),
    ]
    const uniqueIdentifiers = [...new Set(requestedIdentifiers)]
    const requestedCapabilities = analysis.requestedCapabilities || []

    // Resolve explicitly requested agents by slug/name match
    const requestedAgents: Agent[] = []
    for (const identifier of uniqueIdentifiers) {
      const found = activeAgents.find(
        (a) =>
          a.slug === identifier ||
          a.name.toLowerCase() === identifier ||
          a.slug === identifier.replace(/\s+/g, '-'),
      )
      if (found) {
        requestedAgents.push(found)
      }
    }

    // Pick team lead — prefer an explicitly requested agent, otherwise fall back to default
    let leadAgent =
      requestedAgents.length > 0 ? requestedAgents[0] : getDefaultAgent()
    if (!leadAgent && activeAgents.length > 0) {
      leadAgent = activeAgents[0]
    }
    if (!leadAgent) {
      throw new Error('No agents available to form team lead')
    }

    // Recruit teammates
    const teammateAgents: Agent[] = []
    const usedAgentIds = new Set<string>([leadAgent.id])

    // First, add any remaining explicitly requested agents as teammates
    for (const agent of requestedAgents) {
      if (!usedAgentIds.has(agent.id)) {
        teammateAgents.push(agent)
        usedAgentIds.add(agent.id)
      }
    }

    // Then fill remaining slots from decomposed subtasks with skill+capability scoring
    for (const decomposedTask of decomposition.subTasks) {
      const spec = decomposedTask.suggestedAgent
      const bestMatch = activeAgents
        .filter((a) => !usedAgentIds.has(a.id))
        .map((agent) => {
          let score = 0
          // Score by subtask skill requirements
          for (const skill of spec.requiredSkills) {
            const lower = skill.toLowerCase()
            if (agent.tags?.some((t: string) => t.toLowerCase() === lower))
              score += 3
            if (agent.role.toLowerCase().includes(lower)) score += 2
            if (agent.name.toLowerCase().includes(lower)) score += 2
            if (agent.instructions.toLowerCase().includes(lower)) score += 1
          }
          // Boost score for agents matching user-requested capabilities (LLM-extracted)
          for (const cap of requestedCapabilities) {
            const lower = cap.toLowerCase()
            if (
              agent.tags?.some((t: string) => t.toLowerCase().includes(lower))
            )
              score += 4
            if (agent.role.toLowerCase().includes(lower)) score += 3
            if (agent.instructions.toLowerCase().includes(lower)) score += 2
          }
          return { agent, score }
        })
        .sort((a, b) => b.score - a.score)

      if (bestMatch.length > 0 && bestMatch[0].score > 0) {
        const agent = bestMatch[0].agent
        if (!usedAgentIds.has(agent.id)) {
          teammateAgents.push(agent)
          usedAgentIds.add(agent.id)
        }
      } else {
        const available = activeAgents.find((a) => !usedAgentIds.has(a.id))
        if (available) {
          teammateAgents.push(available)
          usedAgentIds.add(available.id)
        }
      }
    }

    if (teammateAgents.length === 0) {
      teammateAgents.push(leadAgent)
    }

    // Create team
    coordinator.createTeam({
      name: decomposition.mainTaskTitle,
      lead: leadAgent,
      teammates: teammateAgents,
      goal: prompt,
    })

    // Phase 4: Populate shared task list
    options?.onProgress?.({
      phase: 'preparing',
      progress: 35,
      message: `Populating shared task list (${decomposition.subTasks.length} tasks)...`,
    })

    const subTaskMap = await createSubTasks(
      decomposition.subTasks,
      mainTask.id,
      workflowId,
    )

    // Resolve dependencies and add to shared task list
    const teamTaskMap = new Map<string, string>() // tempId → teamTaskId

    for (const decomposedTask of decomposition.subTasks) {
      const subTask = subTaskMap.get(decomposedTask.tempId)!

      const resolvedTeamDeps = decomposedTask.dependsOn
        .map((depTempId) => teamTaskMap.get(depTempId))
        .filter(Boolean) as string[]

      const resolvedStoreDeps = decomposedTask.dependsOn
        .map((tempId) => subTaskMap.get(tempId)?.id)
        .filter(Boolean) as string[]

      if (resolvedStoreDeps.length > 0) {
        await updateTask(subTask.id, { dependencies: resolvedStoreDeps })
      }

      const teamTask = coordinator.addTasks([
        {
          title: decomposedTask.title,
          description: decomposedTask.description,
          dependencies: resolvedTeamDeps,
          agentSpec: {
            name: decomposedTask.suggestedAgent.name,
            role: decomposedTask.suggestedAgent.role,
            requiredSkills: decomposedTask.suggestedAgent.requiredSkills,
            specialization: decomposedTask.suggestedAgent.specialization,
            estimatedExperience: 'Mid',
          },
        },
      ])[0]

      teamTaskMap.set(decomposedTask.tempId, teamTask.id)
    }

    // Phase 5: Team execution loop
    options?.onProgress?.({
      phase: 'executing',
      progress: 40,
      message: 'Team is working on tasks...',
    })

    const taskList = coordinator.getTaskList()!
    const executedResults = new Map<string, AgentRunnerResult>()
    const tempIdByTeamTaskId = new Map<string, string>()
    for (const [tempId, teamTaskId] of teamTaskMap.entries()) {
      tempIdByTeamTaskId.set(teamTaskId, tempId)
    }
    let totalTurnsUsed = 0

    while (!taskList.isComplete()) {
      const readyTasks = taskList.getReadyTasks()
      if (readyTasks.length === 0) {
        const allTeamTasks = taskList.getAllTasks()
        const failedTasks = allTeamTasks.filter((t) => t.status === 'failed')
        if (failedTasks.length > 0) {
          throw new Error(
            `Team execution stalled: ${failedTasks.length} task(s) failed, blocking remaining work`,
          )
        }
        throw new Error(
          'Team execution deadlocked: no tasks ready and none failed',
        )
      }

      const batchPromises = readyTasks.map(async (teamTask) => {
        const tempId = tempIdByTeamTaskId.get(teamTask.id)!
        const decomposedTask = decomposition.subTasks.find(
          (dt) => dt.tempId === tempId,
        )!
        const subTask = subTaskMap.get(tempId)!

        // Find best teammate
        const teammate =
          coordinator.getBestTeammateForTask({
            title: teamTask.title,
            description: teamTask.description,
            dependencies: teamTask.dependencies,
            agentSpec: teamTask.agentSpec,
          }) ||
          teammateAgents[0] ||
          leadAgent

        // Claim the task in the coordinator's shared list
        if (!taskList.claimTask(teamTask.id, teammate.id)) {
          return
        }

        // Also claim in the store (pending → claimed)
        claimTask(subTask.id, teammate.id)

        // Gather dependency outputs + mailbox messages (in-memory + persisted)
        const dependencyOutputs = taskList.getDependencyOutputs(teamTask.id)

        const mailbox = coordinator.getMailbox()!
        const unreadMessages = mailbox.getUnreadMessages(teammate.id)
        const messageContext = unreadMessages
          .map((m) => {
            const sender = coordinator.getAgent(m.from)
            mailbox.markRead(teammate.id, m.id)
            return `[Message from ${sender?.name || m.from}]: ${m.content}`
          })
          .join('\n')

        // Also read persisted messages from mailboxStore (for cross-session recovery)
        let persistedContext = ''
        try {
          const persistedMessages = useMailboxStore
            .getState()
            .getUnreadMessages(teammate.id, workflowId)
          if (persistedMessages.length > 0) {
            persistedContext = persistedMessages
              .map((m) => {
                const sender = coordinator.getAgent(m.from)
                useMailboxStore.getState().markRead(m.id)
                return `[Message from ${sender?.name || m.from}]: ${m.content}`
              })
              .join('\n')
          }
        } catch {
          // Non-fatal — persisted mailbox read failure shouldn't block execution
        }

        const allMessageContext = [messageContext, persistedContext]
          .filter(Boolean)
          .join('\n')

        const contextPrefix = allMessageContext
          ? `\n\n--- Team Messages ---\n${allMessageContext}\n--- End Messages ---\n\n`
          : ''

        // Update store task status
        await markTaskInProgress(subTask.id, teammate.id)

        // Create conversation
        const { conversationId, addMessage } = await createSubTaskConversation(
          teammate.id,
          workflowId,
          decomposedTask.description,
        )

        // Set up events
        const events = createAgentEventEmitters(
          subTask.id,
          teammate.id,
          teammate.name,
          workflowId,
        )
        events.emitStart()

        const completedCount = executedResults.size
        const totalCount = decomposition.subTasks.length

        const handleContent = events.createStreamingHandler()

        // Execute the task
        const executionConfig: IsolatedExecutionConfig = {
          task: subTask,
          agent: teammate,
          prompt: contextPrefix + decomposedTask.description,
          scope: decomposedTask.suggestedAgent.scope as AgentScope | undefined,
          dependencyOutputs,
          signal: options?.signal,
          onProgress: (update) => {
            const baseProgress = 40 + (completedCount / totalCount) * 40
            options?.onProgress?.({
              phase: 'executing',
              progress: Math.min(85, baseProgress + update.turn),
              message: `[${teammate.name} → ${subTask.title}] ${update.toolCall ? `Using ${update.toolCall}` : `Turn ${update.turn}`}`,
              subTasksCompleted: completedCount,
              subTasksTotal: totalCount,
            })
          },
          onContent: handleContent,
        }

        let result: AgentRunnerResult
        try {
          // Always use iterative runner so tools (wikipedia, math, etc.) are available
          result = await runAgentWithRetry(
            executionConfig,
            (attempt, error) => {
              // Send 'status' message to lead agent on retry
              try {
                const leadId = teammateAgents[0]?.id
                if (leadId && leadId !== teammate.id) {
                  useMailboxStore.getState().sendMessage({
                    workflowId,
                    from: teammate.id,
                    to: leadId,
                    type: 'status',
                    content: `Retrying "${subTask.title}" (attempt ${attempt}): ${error instanceof Error ? error.message : 'Unknown error'}`,
                    referencedTaskIds: [subTask.id],
                  })
                }
              } catch {
                // Non-fatal
              }
            },
          )
        } catch (err) {
          events.emitComplete(false)
          taskList.failTask(
            teamTask.id,
            err instanceof Error ? err.message : 'Unknown error',
          )
          await markTaskFailed(subTask.id)

          // Send 'status' message to lead on failure
          try {
            const leadId = teammateAgents[0]?.id
            if (leadId && leadId !== teammate.id) {
              await useMailboxStore.getState().sendMessage({
                workflowId,
                from: teammate.id,
                to: leadId,
                type: 'status',
                content: `Failed "${subTask.title}": ${err instanceof Error ? err.message : 'Unknown error'}`,
                referencedTaskIds: [subTask.id],
              })
            }
          } catch {
            // Non-fatal
          }

          return
        }

        events.emitComplete(result.success)
        executedResults.set(teamTask.id, result)
        totalTurnsUsed += result.turnsUsed

        // Complete in shared task list
        taskList.completeTask(teamTask.id, result.response)

        // Broadcast findings to teammates
        const allTeamTasks = taskList.getAllTasks()
        const pending = allTeamTasks.filter((t) => t.status === 'pending')
        if (pending.length > 0 && result.response.length > 0) {
          const summary =
            result.response.length > 500
              ? result.response.slice(0, 500) + '...'
              : result.response
          coordinator.broadcast(
            teammate.id,
            `Completed "${teamTask.title}": ${summary}`,
          )

          // Persist to mailboxStore for cross-session recovery
          try {
            const recipientIds = teammateAgents
              .filter((a) => a.id !== teammate.id)
              .map((a) => a.id)
            for (const recipientId of recipientIds) {
              await useMailboxStore.getState().sendMessage({
                workflowId,
                from: teammate.id,
                to: recipientId,
                type: 'finding',
                content: `Completed "${teamTask.title}": ${summary}`,
                referencedTaskIds: [subTask.id],
              })
            }
          } catch {
            // Non-fatal — persistence failure shouldn't stop execution
          }
        }

        // Create artifact
        await createTaskArtifact(
          subTask.id,
          teammate.id,
          subTask.title,
          teammate.name,
          result.response,
          subTask.requirements.map((r) => r.id),
        )

        // Save assistant message (including tool steps for UI display)
        const steps = toolCallsLogToMessageSteps(result.toolCallsLog)
        await addMessage(conversationId, {
          role: 'assistant',
          content: result.response,
          agentId: teammate.id,
          ...(steps.length > 0 && { steps }),
        })

        // Update task status
        await updateTask(subTask.id, {
          status: result.success ? 'completed' : 'failed',
          turnsUsed: result.turnsUsed,
          actualPasses: 1,
          completedAt: new Date(),
        })
      })

      await Promise.all(batchPromises)
    }

    // Phase 6: Synthesis
    options?.onProgress?.({
      phase: 'synthesizing',
      progress: 85,
      message: 'Synthesizing team results...',
    })

    const allSubTasks = Array.from(subTaskMap.values())

    const { synthesizedResponse, wasSynthesized } = await runSynthesisPhase({
      requiresSynthesis: decomposition.requiresSynthesis,
      decomposedTasks: decomposition.subTasks,
      executedResults,
      tempIdToResultKey: (tempId) => teamTaskMap.get(tempId) || tempId,
      agentNameResolver: (tempId) =>
        subTaskMap.get(tempId)?.assignedAgentId || 'Teammate',
      originalPrompt: prompt,
      mainTask,
      allSubTaskIds: allSubTasks.map((t) => t.id),
      signal: options?.signal,
      synthesisAgentId: 'team-synthesis',
    })

    // Phase 6.5: Validate & Refine
    // Use the lead agent (first teammate) for any refinement pass
    if (teammateAgents.length > 0) {
      const leadForValidation = teammateAgents[0]
      await validateAndRefine(mainTask, leadForValidation, prompt, {
        signal: options?.signal,
      })
    }

    // Phase 7: Complete
    await markTaskCompleted(
      mainTask.id,
      totalTurnsUsed,
      decomposition.subTasks.length,
    )

    options?.onProgress?.({
      phase: 'completed',
      progress: 100,
      message: `Team completed ${executedResults.size} tasks`,
      subTasksCompleted: executedResults.size,
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
    console.error('❌ Agent team execution failed:', error)
    return buildFailureResult(workflowId, existingTaskId || '', error)
  } finally {
    coordinator.cleanup()
  }
}
