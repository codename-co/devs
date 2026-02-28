/**
 * Tests for the Orchestration Event Bus
 *
 * @module test/lib/orchestrator/events.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  on,
  onAny,
  emit,
  removeAllListeners,
  type OrchestrationEvent,
  type AgentStartEvent,
  type AgentStreamingEvent,
  type AgentCompleteEvent,
} from '@/lib/orchestrator/events'

describe('Orchestration Event Bus', () => {
  beforeEach(() => {
    removeAllListeners()
  })

  describe('on()', () => {
    it('should subscribe to a specific event type', () => {
      const handler = vi.fn()
      on('agent-start', handler)

      const event: AgentStartEvent = {
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        workflowId: 'wf-1',
      }

      emit(event)
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should not fire handler for a different event type', () => {
      const handler = vi.fn()
      on('agent-start', handler)

      emit({
        type: 'agent-complete',
        taskId: 'task-1',
        agentId: 'agent-1',
        workflowId: 'wf-1',
        success: true,
      })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should return an unsubscribe function', () => {
      const handler = vi.fn()
      const unsub = on('agent-start', handler)

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        workflowId: 'wf-1',
      })
      expect(handler).toHaveBeenCalledOnce()

      unsub()

      emit({
        type: 'agent-start',
        taskId: 'task-2',
        agentId: 'agent-2',
        agentName: 'Another Agent',
        workflowId: 'wf-2',
      })
      expect(handler).toHaveBeenCalledOnce() // still just once
    })

    it('should support multiple handlers on the same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      on('agent-streaming', handler1)
      on('agent-streaming', handler2)

      const event: AgentStreamingEvent = {
        type: 'agent-streaming',
        taskId: 'task-1',
        agentId: 'agent-1',
        content: 'Hello',
        workflowId: 'wf-1',
      }

      emit(event)
      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })
  })

  describe('onAny()', () => {
    it('should receive all event types', () => {
      const handler = vi.fn()
      onAny(handler)

      const startEvent: AgentStartEvent = {
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        workflowId: 'wf-1',
      }

      const completeEvent: AgentCompleteEvent = {
        type: 'agent-complete',
        taskId: 'task-1',
        agentId: 'agent-1',
        workflowId: 'wf-1',
        success: true,
      }

      emit(startEvent)
      emit(completeEvent)

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenNthCalledWith(1, startEvent)
      expect(handler).toHaveBeenNthCalledWith(2, completeEvent)
    })

    it('should return an unsubscribe function', () => {
      const handler = vi.fn()
      const unsub = onAny(handler)

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test',
        workflowId: 'wf-1',
      })
      expect(handler).toHaveBeenCalledOnce()

      unsub()

      emit({
        type: 'agent-complete',
        taskId: 'task-1',
        agentId: 'agent-1',
        workflowId: 'wf-1',
        success: true,
      })
      expect(handler).toHaveBeenCalledOnce() // still just once
    })
  })

  describe('emit()', () => {
    it('should deliver to both typed and wildcard listeners', () => {
      const typedHandler = vi.fn()
      const wildcardHandler = vi.fn()

      on('agent-streaming', typedHandler)
      onAny(wildcardHandler)

      const event: AgentStreamingEvent = {
        type: 'agent-streaming',
        taskId: 'task-1',
        agentId: 'agent-1',
        content: 'chunk',
        workflowId: 'wf-1',
      }

      emit(event)

      expect(typedHandler).toHaveBeenCalledOnce()
      expect(wildcardHandler).toHaveBeenCalledOnce()
    })
  })

  describe('removeAllListeners()', () => {
    it('should clear all subscriptions', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      const h3 = vi.fn()

      on('agent-start', h1)
      on('agent-complete', h2)
      onAny(h3)

      removeAllListeners()

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test',
        workflowId: 'wf-1',
      })

      expect(h1).not.toHaveBeenCalled()
      expect(h2).not.toHaveBeenCalled()
      expect(h3).not.toHaveBeenCalled()
    })
  })

  describe('streaming flow', () => {
    it('should track a full agent lifecycle: start → streaming → complete', () => {
      const events: OrchestrationEvent[] = []
      onAny((e) => events.push(e))

      emit({
        type: 'agent-start',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Writer',
        workflowId: 'wf-1',
      })

      emit({
        type: 'agent-streaming',
        taskId: 'task-1',
        agentId: 'agent-1',
        content: 'Hello',
        workflowId: 'wf-1',
      })

      emit({
        type: 'agent-streaming',
        taskId: 'task-1',
        agentId: 'agent-1',
        content: 'Hello world',
        workflowId: 'wf-1',
      })

      emit({
        type: 'agent-complete',
        taskId: 'task-1',
        agentId: 'agent-1',
        workflowId: 'wf-1',
        success: true,
      })

      expect(events).toHaveLength(4)
      expect(events.map((e) => e.type)).toEqual([
        'agent-start',
        'agent-streaming',
        'agent-streaming',
        'agent-complete',
      ])
    })
  })
})
