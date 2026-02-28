/**
 * useOrchestrationStreaming
 *
 * React hook that subscribes to orchestration-engine events and exposes
 * per-sub-task streaming state.  The task page uses this to show live
 * agent output in SubTaskConversation components.
 *
 * @module hooks/useOrchestrationStreaming
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  on as onEvent,
  type AgentStartEvent,
  type AgentStreamingEvent,
  type AgentCompleteEvent,
} from '@/lib/orchestrator/events'

// ============================================================================
// Types
// ============================================================================

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
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Subscribes to orchestration events for the given `workflowId` and returns
 * a map of  taskId → SubTaskStreamingState  for every sub-task that is
 * currently (or was recently) streaming.
 *
 * The entries are cleared once the agent completes, so consumers should
 * fall back to the persisted conversation data for completed tasks.
 */
export function useOrchestrationStreaming(
  workflowId: string | undefined,
): Map<string, SubTaskStreamingState> {
  const [streamingMap, setStreamingMap] = useState<
    Map<string, SubTaskStreamingState>
  >(new Map())

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
        })
        return next
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
    },
    [workflowId],
  )

  // Subscribe / unsubscribe
  useEffect(() => {
    const unsubs = [
      onEvent('agent-start', handleStart),
      onEvent('agent-streaming', handleStreaming),
      onEvent('agent-complete', handleComplete),
    ]
    return () => unsubs.forEach((u) => u())
  }, [handleStart, handleStreaming, handleComplete])

  return streamingMap
}
