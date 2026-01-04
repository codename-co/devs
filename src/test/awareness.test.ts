/**
 * Awareness System Tests
 *
 * Tests for the AwarenessManager class and utility functions
 * that handle real-time presence and cursor tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Y from 'yjs'
import {
  AwarenessManager,
  generateUserColor,
  formatPresenceStatus,
  createAwarenessManager,
} from '@/lib/sync/awareness'
import type { PresenceState } from '@/types'

describe('Awareness System', () => {
  // ============================================================================
  // generateUserColor Tests
  // ============================================================================

  describe('generateUserColor', () => {
    it('returns consistent color for same user ID', () => {
      const userId = 'user-123'
      const color1 = generateUserColor(userId)
      const color2 = generateUserColor(userId)
      const color3 = generateUserColor(userId)

      expect(color1).toBe(color2)
      expect(color2).toBe(color3)
    })

    it('returns different colors for different IDs', () => {
      const color1 = generateUserColor('alice')
      const color2 = generateUserColor('bob')
      const color3 = generateUserColor('charlie')

      // These should be different (though technically could collide)
      // Using distinct enough names to avoid hash collisions
      expect(color1).not.toBe(color2)
      expect(color2).not.toBe(color3)
    })

    it('returns a valid hex color code', () => {
      const color = generateUserColor('test-user')
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('handles empty string', () => {
      const color = generateUserColor('')
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('handles unicode characters', () => {
      const color = generateUserColor('用户🎉')
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })

  // ============================================================================
  // formatPresenceStatus Tests
  // ============================================================================

  describe('formatPresenceStatus', () => {
    it('formats online status correctly', () => {
      const state: PresenceState = {
        status: 'online',
        lastActive: new Date(),
      }
      expect(formatPresenceStatus(state)).toBe('Online')
    })

    it('formats away status correctly', () => {
      const state: PresenceState = {
        status: 'away',
        lastActive: new Date(),
      }
      // Without a time difference, it shows "Away (just now)"
      expect(formatPresenceStatus(state)).toBe('Away (just now)')
    })

    it('formats offline status correctly', () => {
      const state: PresenceState = {
        status: 'offline',
        lastActive: new Date(),
      }
      expect(formatPresenceStatus(state)).toBe('Offline')
    })

    it('includes current view when present', () => {
      const state: PresenceState = {
        status: 'online',
        lastActive: new Date(),
        currentView: 'Agent Editor',
      }
      expect(formatPresenceStatus(state)).toBe('Online • Agent Editor')
    })

    it('formats away with time difference in minutes', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const state: PresenceState = {
        status: 'away',
        lastActive: fiveMinutesAgo,
      }
      expect(formatPresenceStatus(state)).toBe('Away (5m ago)')
    })

    it('formats away with time difference in hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const state: PresenceState = {
        status: 'away',
        lastActive: twoHoursAgo,
      }
      expect(formatPresenceStatus(state)).toBe('Away (2h ago)')
    })
  })

  // ============================================================================
  // AwarenessManager Tests
  // ============================================================================

  describe('AwarenessManager', () => {
    let doc: Y.Doc
    let manager: AwarenessManager

    beforeEach(() => {
      doc = new Y.Doc()
      manager = new AwarenessManager(doc)
    })

    afterEach(() => {
      manager.destroy()
    })

    describe('setLocalUser', () => {
      it('sets local user correctly', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState).toBeDefined()
        expect(localState?.user.id).toBe('user-1')
        expect(localState?.user.name).toBe('Alice')
      })

      it('generates color automatically if not provided', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.user.color).toBe(generateUserColor('user-1'))
      })

      it('uses provided color when given', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice', color: '#FF0000' })

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.user.color).toBe('#FF0000')
      })
    })

    describe('updateCursor', () => {
      it('updates cursor position', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.updateCursor({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          position: 42,
        })

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.cursor).toEqual({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          position: 42,
        })
      })

      it('clears cursor when set to undefined', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.updateCursor({ conversationId: 'conv-1' })
        manager.updateCursor(undefined)

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.cursor).toBeUndefined()
      })
    })

    describe('updateSelection', () => {
      it('updates selection', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.updateCursor({ conversationId: 'conv-1', position: 0 })
        manager.updateSelection({ start: 10, end: 20 })

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        // Selection is stored in cursor.position
        expect(localState?.cursor?.position).toBe(10)
      })
    })

    describe('setTyping', () => {
      it('sets typing status to true', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setTyping(true)

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.typing).toBe(true)
      })

      it('sets typing status to false', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setTyping(true)
        manager.setTyping(false)

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.typing).toBe(false)
      })
    })

    describe('setViewingAgent', () => {
      it('sets viewing agent', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setViewingAgent('agent-123')

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.viewingAgent).toBe('agent-123')
      })

      it('clears viewing agent when set to undefined', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setViewingAgent('agent-123')
        manager.setViewingAgent(undefined)

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.viewingAgent).toBeUndefined()
      })
    })

    describe('setPresenceStatus', () => {
      it('sets presence status to online', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setPresenceStatus('online')

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.presence?.status).toBe('online')
      })

      it('sets presence status to away', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setPresenceStatus('away')

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.presence?.status).toBe('away')
      })

      it('sets presence status to offline', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setPresenceStatus('offline')

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.presence?.status).toBe('offline')
      })

      it('updates lastActive timestamp', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        const before = new Date()
        manager.setPresenceStatus('online')
        const after = new Date()

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.presence?.lastActive).toBeDefined()
        expect(
          new Date(localState!.presence!.lastActive).getTime(),
        ).toBeGreaterThanOrEqual(before.getTime())
        expect(
          new Date(localState!.presence!.lastActive).getTime(),
        ).toBeLessThanOrEqual(after.getTime())
      })
    })

    describe('setCurrentView', () => {
      it('sets current view', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })
        manager.setCurrentView('Agent Editor')

        const states = manager.getAllStates()
        const localClientId = manager.getLocalClientId()
        const localState = states.get(localClientId)

        expect(localState?.presence?.currentView).toBe('Agent Editor')
      })
    })

    describe('onRemoteChange', () => {
      it('notifies on remote changes', async () => {
        const callback = vi.fn()
        manager.onRemoteChange(callback)

        // Set local user to trigger awareness change
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })

        // The callback fires on any awareness change (including local changes
        // that result in remote state updates). The callback receives a Map
        // of remote states (excluding local).
        // In a single-client setup, the remote states Map is empty.
        expect(callback).toHaveBeenCalled()
        const lastCall = callback.mock.calls[callback.mock.calls.length - 1]
        expect(lastCall[0]).toBeInstanceOf(Map)
      })

      it('returns unsubscribe function', () => {
        const callback = vi.fn()
        const unsubscribe = manager.onRemoteChange(callback)

        expect(typeof unsubscribe).toBe('function')

        // Unsubscribe should not throw
        unsubscribe()
      })
    })

    describe('getRemoteStates', () => {
      it('excludes local state', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })

        const remoteStates = manager.getRemoteStates()
        const localClientId = manager.getLocalClientId()

        expect(remoteStates.has(localClientId)).toBe(false)
      })
    })

    describe('getAllStates', () => {
      it('includes local state', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })

        const allStates = manager.getAllStates()
        const localClientId = manager.getLocalClientId()

        expect(allStates.has(localClientId)).toBe(true)
      })
    })

    describe('getAwareness', () => {
      it('returns the underlying Awareness instance', () => {
        const awareness = manager.getAwareness()
        expect(awareness).toBeDefined()
        expect(awareness.clientID).toBe(manager.getLocalClientId())
      })
    })

    describe('destroy', () => {
      it('clears local state on destroy', () => {
        manager.setLocalUser({ id: 'user-1', name: 'Alice' })

        const statesBefore = manager.getAllStates()
        expect(statesBefore.size).toBe(1)

        manager.destroy()

        // After destroy, local state should be cleared
        const awareness = manager.getAwareness()
        expect(awareness.getLocalState()).toBeNull()
      })

      it('clears change callbacks', () => {
        const callback = vi.fn()
        manager.onRemoteChange(callback)

        manager.destroy()

        // The internal callback set should be cleared
        // We verify this by checking no errors occur
        expect(() => manager.destroy()).not.toThrow()
      })
    })
  })

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createAwarenessManager', () => {
    it('creates an AwarenessManager instance', () => {
      const doc = new Y.Doc()
      const manager = createAwarenessManager(doc)

      expect(manager).toBeInstanceOf(AwarenessManager)

      manager.destroy()
    })
  })
})
