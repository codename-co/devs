import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock userStore before importing hitl
vi.mock('@/stores/userStore', () => {
  const state = {
    yoloMode: false,
  }
  return {
    userSettings: {
      getState: () => state,
      setState: (partial: Record<string, unknown>) =>
        Object.assign(state, partial),
      subscribe: vi.fn(),
    },
    getEffectiveSettings: () => state,
  }
})

import {
  requestHumanInput,
  resolveHitlRequest,
  dismissHitlRequest,
  getPendingRequestsForConversation,
  getAllPendingRequests,
  onHitlRequest,
  dismissAllForConversation,
  isYoloMode,
} from '@/lib/hitl'
import { userSettings } from '@/stores/userStore'
import type { HitlRequestOptions } from '@/types'

describe('HITL Service', () => {
  beforeEach(() => {
    // Reset YOLO mode
    ;(userSettings as any).setState({ yoloMode: false })
    // Dismiss all pending requests
    for (const req of getAllPendingRequests()) {
      dismissHitlRequest(req.id)
    }
  })

  describe('requestHumanInput', () => {
    it('should create a pending request and return a promise', () => {
      const options: HitlRequestOptions = {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Should I proceed?',
        quickReplies: [
          { label: 'Yes', value: 'yes', color: 'success' },
          { label: 'No', value: 'no', color: 'danger' },
        ],
      }

      const promise = requestHumanInput(options)
      expect(promise).toBeInstanceOf(Promise)

      // Should be pending
      const pending = getPendingRequestsForConversation('conv-1')
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('pending')
      expect(pending[0].question).toBe('Should I proceed?')
      expect(pending[0].type).toBe('approval')

      // Cleanup
      dismissHitlRequest(pending[0].id)
    })

    it('should resolve when user responds via resolveHitlRequest', async () => {
      const options: HitlRequestOptions = {
        conversationId: 'conv-2',
        agentId: 'agent-1',
        type: 'clarification',
        question: 'Which framework?',
      }

      const promise = requestHumanInput(options)
      const pending = getPendingRequestsForConversation('conv-2')
      expect(pending).toHaveLength(1)

      resolveHitlRequest(pending[0].id, 'React')

      const response = await promise
      expect(response.status).toBe('answered')
      expect(response.value).toBe('React')
    })

    it('should resolve with dismissed status when dismissed', async () => {
      const options: HitlRequestOptions = {
        conversationId: 'conv-3',
        agentId: 'agent-1',
        type: 'feedback',
        question: 'How does this look?',
      }

      const promise = requestHumanInput(options)
      const pending = getPendingRequestsForConversation('conv-3')

      dismissHitlRequest(pending[0].id)

      const response = await promise
      expect(response.status).toBe('dismissed')
      expect(response.value).toBe('')
    })
  })

  describe('YOLO mode', () => {
    it('should auto-resolve immediately when YOLO mode is enabled', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-4',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Proceed?',
        quickReplies: [
          { label: 'Yes', value: 'yes', color: 'success' },
          { label: 'No', value: 'no', color: 'danger' },
        ],
      })

      expect(response.status).toBe('auto-resolved')
      // Should pick the success-colored reply
      expect(response.value).toBe('yes')
    })

    it('should auto-resolve clarification with default message', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-5',
        agentId: 'agent-1',
        type: 'clarification',
        question: 'Which approach?',
      })

      expect(response.status).toBe('auto-resolved')
      expect(response.value).toBe('Proceed with your best judgment')
    })

    it('should auto-resolve confirmation with confirmed', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-6',
        agentId: 'agent-1',
        type: 'confirmation',
        question: 'Is this correct?',
      })

      expect(response.status).toBe('auto-resolved')
      expect(response.value).toBe('confirmed')
    })

    it('should auto-resolve feedback with looks good', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-7',
        agentId: 'agent-1',
        type: 'feedback',
        question: 'Review this draft',
      })

      expect(response.status).toBe('auto-resolved')
      expect(response.value).toBe('Looks good, proceed')
    })

    it('should auto-resolve choice with first option', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-8',
        agentId: 'agent-1',
        type: 'choice',
        question: 'Pick one',
        quickReplies: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
      })

      expect(response.status).toBe('auto-resolved')
      expect(response.value).toBe('a')
    })

    it('should report isYoloMode correctly', () => {
      expect(isYoloMode()).toBe(false)
      ;(userSettings as any).setState({ yoloMode: true })
      expect(isYoloMode()).toBe(true)
    })

    it('should not leave pending requests when in YOLO mode', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      await requestHumanInput({
        conversationId: 'conv-9',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Proceed?',
      })

      expect(getAllPendingRequests()).toHaveLength(0)
    })
  })

  describe('event system', () => {
    it('should notify listeners when a request is created', () => {
      const listener = vi.fn()
      const unsubscribe = onHitlRequest(listener)

      requestHumanInput({
        conversationId: 'conv-10',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Test?',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          question: 'Test?',
        }),
      )

      // Cleanup
      const pending = getPendingRequestsForConversation('conv-10')
      dismissHitlRequest(pending[0].id)
      unsubscribe()
    })

    it('should notify listeners when a request is resolved', () => {
      const listener = vi.fn()
      const unsubscribe = onHitlRequest(listener)

      requestHumanInput({
        conversationId: 'conv-11',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Test?',
      })

      const pending = getPendingRequestsForConversation('conv-11')
      resolveHitlRequest(pending[0].id, 'ok')

      expect(listener).toHaveBeenCalledTimes(2) // create + resolve
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'answered',
          response: 'ok',
        }),
      )

      unsubscribe()
    })

    it('should unsubscribe correctly', () => {
      const listener = vi.fn()
      const unsubscribe = onHitlRequest(listener)
      unsubscribe()

      requestHumanInput({
        conversationId: 'conv-12',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Test?',
      })

      expect(listener).not.toHaveBeenCalled()

      // Cleanup
      const pending = getPendingRequestsForConversation('conv-12')
      dismissHitlRequest(pending[0].id)
    })
  })

  describe('dismissAllForConversation', () => {
    it('should dismiss all pending requests for a conversation', async () => {
      const promise1 = requestHumanInput({
        conversationId: 'conv-13',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Q1?',
      })
      const promise2 = requestHumanInput({
        conversationId: 'conv-13',
        agentId: 'agent-2',
        type: 'clarification',
        question: 'Q2?',
      })
      // Different conversation — should NOT be dismissed
      requestHumanInput({
        conversationId: 'conv-14',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Q3?',
      })

      expect(getPendingRequestsForConversation('conv-13')).toHaveLength(2)
      expect(getPendingRequestsForConversation('conv-14')).toHaveLength(1)

      dismissAllForConversation('conv-13')

      const [r1, r2] = await Promise.all([promise1, promise2])
      expect(r1.status).toBe('dismissed')
      expect(r2.status).toBe('dismissed')

      // conv-14 should still have a pending request
      expect(getPendingRequestsForConversation('conv-14')).toHaveLength(1)

      // Cleanup
      const pending14 = getPendingRequestsForConversation('conv-14')
      dismissHitlRequest(pending14[0].id)
    })
  })

  describe('edge cases', () => {
    it('should handle resolving a non-existent request gracefully', () => {
      expect(() => resolveHitlRequest('non-existent', 'value')).not.toThrow()
    })

    it('should handle dismissing a non-existent request gracefully', () => {
      expect(() => dismissHitlRequest('non-existent')).not.toThrow()
    })

    it('should pick first quickReply when no success color in approval YOLO', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-15',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Proceed?',
        quickReplies: [
          { label: 'Continue', value: 'continue' },
          { label: 'Stop', value: 'stop' },
        ],
      })

      expect(response.value).toBe('continue')
    })

    it('should default to "approved" for approval with no quickReplies in YOLO', async () => {
      ;(userSettings as any).setState({ yoloMode: true })

      const response = await requestHumanInput({
        conversationId: 'conv-16',
        agentId: 'agent-1',
        type: 'approval',
        question: 'Proceed?',
      })

      expect(response.value).toBe('approved')
    })
  })
})
