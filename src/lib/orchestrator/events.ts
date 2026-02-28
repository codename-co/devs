/**
 * Orchestration Event Bus
 *
 * A typed, global event emitter that allows the orchestration engine to
 * broadcast real-time streaming events.  The task page (and any other
 * consumer) subscribes to these events so that sub-conversations appear
 * live as agents produce output.
 *
 * @module lib/orchestrator/events
 */

// ============================================================================
// Event Types
// ============================================================================

/** An agent has started working on a sub-task. */
export interface AgentStartEvent {
  type: 'agent-start'
  taskId: string
  agentId: string
  agentName: string
  workflowId: string
}

/** Streaming content chunk from an agent. */
export interface AgentStreamingEvent {
  type: 'agent-streaming'
  taskId: string
  agentId: string
  /** Full accumulated content so far (not just the delta). */
  content: string
  workflowId: string
}

/** Agent is calling a tool. */
export interface AgentToolCallEvent {
  type: 'agent-tool-call'
  taskId: string
  agentId: string
  toolName: string
  toolInput: Record<string, unknown>
  workflowId: string
}

/** Agent completed its work on a sub-task. */
export interface AgentCompleteEvent {
  type: 'agent-complete'
  taskId: string
  agentId: string
  workflowId: string
  success: boolean
}

/** Orchestration phase changed (analyzing, decomposing, executing, etc.). */
export interface PhaseChangeEvent {
  type: 'phase-change'
  workflowId: string
  phase: string
  message: string
  progress: number
}

export type OrchestrationEvent =
  | AgentStartEvent
  | AgentStreamingEvent
  | AgentToolCallEvent
  | AgentCompleteEvent
  | PhaseChangeEvent

type EventType = OrchestrationEvent['type']

// ============================================================================
// Listener Map
// ============================================================================

type ListenerFn<T extends OrchestrationEvent = OrchestrationEvent> = (
  event: T,
) => void

// Use a discriminated-union map so consumers get typed events.
type ListenerMap = {
  'agent-start': ListenerFn<AgentStartEvent>[]
  'agent-streaming': ListenerFn<AgentStreamingEvent>[]
  'agent-tool-call': ListenerFn<AgentToolCallEvent>[]
  'agent-complete': ListenerFn<AgentCompleteEvent>[]
  'phase-change': ListenerFn<PhaseChangeEvent>[]
  /** Wildcard — receives every event. */
  '*': ListenerFn<OrchestrationEvent>[]
}

const listeners: ListenerMap = {
  'agent-start': [],
  'agent-streaming': [],
  'agent-tool-call': [],
  'agent-complete': [],
  'phase-change': [],
  '*': [],
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Subscribe to a specific event type.
 * Returns an unsubscribe function.
 */
export function on<T extends EventType>(
  type: T,
  handler: ListenerFn<Extract<OrchestrationEvent, { type: T }>>,
): () => void {
  const list = listeners[type] as ListenerFn<any>[]
  list.push(handler)
  return () => {
    const idx = list.indexOf(handler)
    if (idx >= 0) list.splice(idx, 1)
  }
}

/**
 * Subscribe to ALL events (wildcard).
 * Returns an unsubscribe function.
 */
export function onAny(handler: ListenerFn<OrchestrationEvent>): () => void {
  listeners['*'].push(handler)
  return () => {
    const idx = listeners['*'].indexOf(handler)
    if (idx >= 0) listeners['*'].splice(idx, 1)
  }
}

/**
 * Emit an event to all listeners.
 */
export function emit(event: OrchestrationEvent): void {
  const typed = listeners[event.type] as ListenerFn<any>[] | undefined
  if (typed) {
    for (const fn of typed) fn(event)
  }
  for (const fn of listeners['*']) fn(event)
}

/**
 * Remove all listeners (useful for cleanup / tests).
 */
export function removeAllListeners(): void {
  for (const key of Object.keys(listeners) as (EventType | '*')[]) {
    listeners[key] = []
  }
}
