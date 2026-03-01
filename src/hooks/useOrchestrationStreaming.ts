/**
 * useOrchestrationStreaming
 *
 * React hook that subscribes to orchestration-engine events and exposes
 * per-sub-task streaming state plus workflow-level progress.  The task
 * page uses this to show live agent output, tool calls, and phase
 * progress in real time.
 *
 * @module hooks/useOrchestrationStreaming
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  on as onEvent,
  type AgentStartEvent,
  type AgentStreamingEvent,
  type AgentToolCallEvent,
  type AgentCompleteEvent,
  type PhaseChangeEvent,
} from '@/lib/orchestrator/events'

// ============================================================================
// Types
// ============================================================================

/** Tool call recorded for a sub-task. */
export interface StreamingToolCall {
  toolName: string
  input: Record<string, unknown>
  status: 'running' | 'completed'
}

/** Streaming state for a single sub-task. */
export interface SubTaskStreamingState {
  /** The sub-task (store) ID. */
  taskId: string
  /** The agent currently working on it. */
  agentId: string
  /** Agent display name. */
  agentName: string
  /** Accumulated content so far. */
  content: string
  /** Whether the agent is still producing output. */
  isStreaming: boolean
  /** Thinking / reasoning content (populated when agent-thinking events exist). */
  thinkingContent?: string
  /** Whether the agent is currently in a thinking phase. */
  isThinking?: boolean
  /** Tool calls made during this streaming session. */
  toolCalls?: StreamingToolCall[]
}

/** Workflow-level progress derived from phase-change events. */
export interface WorkflowProgressState {
  phase: string
  phaseMessage: string
  progress: number
  activeAgents: Array<{ agentId: string; agentName: string; taskId: string }>
}

/** Return type of the useOrchestrationStreaming hook. */
export interface OrchestrationStreamingResult {
  streamingMap: Map<string, SubTaskStreamingState>
  workflowProgress: WorkflowProgressState | null
}

const INITIAL_PROGRESS: WorkflowProgressState = {
  phase: '',
  phaseMessage: '',
  progress: 0,
  activeAgents: [],
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Subscribes to orchestration events for the given `workflowId` and returns:
 * - `streamingMap`: taskId → SubTaskStreamingState for live sub-task output
 * - `workflowProgress`: current phase, message, progress bar, active agents
 *
 * Streaming entries are cleared once the agent completes, so consumers
 * should fall back to the persisted conversation data for completed tasks.
 */
export function useOrchestrationStreaming(
  workflowId: string | undefined,
): OrchestrationStreamingResult {
  const [streamingMap, setStreamingMap] = useState<
    Map<string, SubTaskStreamingState>
  >(new Map())

  const [workflowProgress, setWorkflowProgress] =
    useState<WorkflowProgressState | null>(null)

  // Keep a ref to the latest map so event handlers always see the up-to-date
  // version without stale closures.
  const mapRef = useRef(streamingMap)
  mapRef.current = streamingMap

  // ----- agent-start --------------------------------------------------------
  const handleStart = useCallback(
    (event: AgentStartEvent) => {
      if (workflowId && event.workflowId !== workflowId) return
      setStreamingMap((prev) => {
        const next = new Map(prev)
        next.set(event.taskId, {
          taskId: event.taskId,
          agentId: event.agentId,
          agentName: event.agentName,
          content: '',
          isStreaming: true,
          toolCalls: [],
        })
        return next
      })
      // Add to active agents
      setWorkflowProgress((prev) => {
        const base = prev ?? INITIAL_PROGRESS
        const already = base.activeAgents.some(
          (a) => a.agentId === event.agentId && a.taskId === event.taskId,
        )
        if (already) return prev
        return {
          ...base,
          activeAgents: [
            ...base.activeAgents,
            {
              agentId: event.agentId,
              agentName: event.agentName,
              taskId: event.taskId,
            },
          ],
        }
      })
    },
    [workflowId],
  )

  // ----- agent-streaming ----------------------------------------------------
  const handleStreaming = useCallback(
    (event: AgentStreamingEvent) => {
      if (workflowId && event.workflowId !== workflowId) return
      setStreamingMap((prev) => {
        const existing = prev.get(event.taskId)
        if (!existing) {
          // We may have missed the start event — create entry on the fly.
          const next = new Map(prev)
          next.set(event.taskId, {
            taskId: event.taskId,
            agentId: event.agentId,
            agentName: '',
            content: event.content,
            isStreaming: true,
            toolCalls: [],
          })
          return next
        }
        // Only update if content actually changed (avoids unnecessary re-renders).
        if (existing.content === event.content) return prev
        const next = new Map(prev)
        next.set(event.taskId, { ...existing, content: event.content })
        return next
      })
    },
    [workflowId],
  )

  // ----- agent-tool-call ----------------------------------------------------
  const handleToolCall = useCallback(
    (event: AgentToolCallEvent) => {
      if (workflowId && event.workflowId !== workflowId) return
      setStreamingMap((prev) => {
        const existing = prev.get(event.taskId)
        if (!existing) return prev
        const next = new Map(prev)
        const toolCalls = [...(existing.toolCalls ?? [])]
        // Mark any previously running call for the same tool as completed
        for (let i = 0; i < toolCalls.length; i++) {
          if (toolCalls[i].status === 'running') {
            toolCalls[i] = { ...toolCalls[i], status: 'completed' }
          }
        }
        toolCalls.push({
          toolName: event.toolName,
          input: event.toolInput,
          status: 'running',
        })
        next.set(event.taskId, { ...existing, toolCalls })
        return next
      })
    },
    [workflowId],
  )

  // ----- agent-complete -----------------------------------------------------
  const handleComplete = useCallback(
    (event: AgentCompleteEvent) => {
      if (workflowId && event.workflowId !== workflowId) return
      setStreamingMap((prev) => {
        if (!prev.has(event.taskId)) return prev
        const next = new Map(prev)
        next.delete(event.taskId)
        return next
      })
      // Remove from active agents
      setWorkflowProgress((prev) => {
        if (!prev) return prev
        const filtered = prev.activeAgents.filter(
          (a) => !(a.agentId === event.agentId && a.taskId === event.taskId),
        )
        if (filtered.length === prev.activeAgents.length) return prev
        return { ...prev, activeAgents: filtered }
      })
    },
    [workflowId],
  )

  // ----- phase-change -------------------------------------------------------
  const handlePhaseChange = useCallback(
    (event: PhaseChangeEvent) => {
      if (workflowId && event.workflowId !== workflowId) return
      setWorkflowProgress((prev) => ({
        ...(prev ?? INITIAL_PROGRESS),
        phase: event.phase,
        phaseMessage: event.message,
        progress: event.progress,
      }))
    },
    [workflowId],
  )

  // Subscribe / unsubscribe
  useEffect(() => {
    const unsubs = [
      onEvent('agent-start', handleStart),
      onEvent('agent-streaming', handleStreaming),
      onEvent('agent-tool-call', handleToolCall),
      onEvent('agent-complete', handleComplete),
      onEvent('phase-change', handlePhaseChange),
    ]
    return () => unsubs.forEach((u) => u())
  }, [
    handleStart,
    handleStreaming,
    handleToolCall,
    handleComplete,
    handlePhaseChange,
  ])

  return { streamingMap, workflowProgress }
}
