/**
 * Tests for Teams presence awareness.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  buildPresenceState,
  startPresence,
  stopPresence,
  stopAllPresence,
  getPresencePeers,
  updatePresenceThread,
  isPresenceActive,
  getActivePeerCount,
  onPresenceChange,
  STALE_TIMEOUT_MS,
  type AwarenessProtocol,
  type TeamsPresenceState,
} from '@/lib/teams/presence'
import type { TeamsUser } from '@/features/auth/types'

// ============================================================================
// Test helpers
// ============================================================================

function createMockUser(overrides?: Partial<TeamsUser>): TeamsUser {
  return {
    id: 'user-1',
    email: 'alice@acme.com',
    name: 'Alice',
    role: 'member',
    avatar: 'https://example.com/alice.jpg',
    ...overrides,
  }
}

function createMockAwareness(
  clientID = 1,
): AwarenessProtocol & { _states: Map<number, Record<string, unknown>> } {
  const states = new Map<number, Record<string, unknown>>()
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  let localState: Record<string, unknown> | null = null

  return {
    clientID,
    _states: states,
    getLocalState: () => localState,
    setLocalState: (state) => {
      if (state === null) {
        states.delete(clientID)
      } else {
        states.set(clientID, state)
      }
      localState = state
      // Trigger change event
      const changeHandlers = listeners.get('change')
      if (changeHandlers) {
        changeHandlers.forEach((h) => h())
      }
    },
    setLocalStateField: (field, value) => {
      if (!localState) localState = {}
      localState[field] = value
      states.set(clientID, { ...localState })
      const changeHandlers = listeners.get('change')
      if (changeHandlers) {
        changeHandlers.forEach((h) => h())
      }
    },
    getStates: () => states,
    on: (event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },
    off: (event, handler) => {
      listeners.get(event)?.delete(handler)
    },
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Teams Presence', () => {
  afterEach(() => {
    stopAllPresence()
    vi.restoreAllMocks()
  })

  describe('buildPresenceState', () => {
    it('creates a presence state from user and space', () => {
      const user = createMockUser()
      const state = buildPresenceState(user, 'space-1')

      expect(state.userId).toBe('user-1')
      expect(state.name).toBe('Alice')
      expect(state.email).toBe('alice@acme.com')
      expect(state.avatar).toBe('https://example.com/alice.jpg')
      expect(state.role).toBe('member')
      expect(state.status).toBe('active')
      expect(state.activeSpaceId).toBe('space-1')
      expect(state.activeThreadId).toBeUndefined()
      expect(state.lastSeen).toBeGreaterThan(0)
    })

    it('includes activeThreadId when provided', () => {
      const user = createMockUser()
      const state = buildPresenceState(user, 'space-1', 'thread-42')

      expect(state.activeThreadId).toBe('thread-42')
    })

    it('uses admin role from user', () => {
      const user = createMockUser({ role: 'admin' })
      const state = buildPresenceState(user, 'space-1')

      expect(state.role).toBe('admin')
    })
  })

  describe('startPresence / stopPresence', () => {
    it('sets local awareness state on start', () => {
      const awareness = createMockAwareness()
      const user = createMockUser()

      startPresence('space-1', awareness, user)

      const state = awareness.getLocalState()
      expect(state).toBeDefined()
      expect((state?.presence as TeamsPresenceState).userId).toBe('user-1')
      expect((state?.presence as TeamsPresenceState).status).toBe('active')
    })

    it('marks presence as active after start', () => {
      const awareness = createMockAwareness()
      const user = createMockUser()

      startPresence('space-1', awareness, user)

      expect(isPresenceActive('space-1')).toBe(true)
    })

    it('clears awareness state on stop', () => {
      const awareness = createMockAwareness()
      const user = createMockUser()

      startPresence('space-1', awareness, user)
      stopPresence('space-1')

      expect(awareness.getLocalState()).toBeNull()
      expect(isPresenceActive('space-1')).toBe(false)
    })

    it('stopPresence is a no-op for unknown spaces', () => {
      expect(() => stopPresence('unknown')).not.toThrow()
    })

    it('stops previous presence when restarting', () => {
      const awareness = createMockAwareness()
      const user = createMockUser()

      startPresence('space-1', awareness, user)
      const user2 = createMockUser({ id: 'user-2', name: 'Bob' })
      startPresence('space-1', awareness, user2)

      const state = awareness.getLocalState()
      expect((state?.presence as TeamsPresenceState).userId).toBe('user-2')
    })
  })

  describe('stopAllPresence', () => {
    it('stops all active presence managers', () => {
      const awareness1 = createMockAwareness(1)
      const awareness2 = createMockAwareness(2)
      const user = createMockUser()

      startPresence('space-1', awareness1, user)
      startPresence('space-2', awareness2, user)

      expect(isPresenceActive('space-1')).toBe(true)
      expect(isPresenceActive('space-2')).toBe(true)

      stopAllPresence()

      expect(isPresenceActive('space-1')).toBe(false)
      expect(isPresenceActive('space-2')).toBe(false)
    })
  })

  describe('getPresencePeers', () => {
    it('returns empty array for unknown spaces', () => {
      expect(getPresencePeers('unknown')).toEqual([])
    })

    it('returns local peer after startPresence', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      startPresence('space-1', awareness, user)

      const peers = getPresencePeers('space-1')
      expect(peers).toHaveLength(1)
      expect(peers[0].userId).toBe('user-1')
      expect(peers[0].isLocal).toBe(true)
      expect(peers[0].clientId).toBe(1)
    })

    it('includes remote peers with presence state', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      // Add remote peer
      awareness._states.set(2, {
        presence: {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@acme.com',
          role: 'member',
          status: 'active',
          activeSpaceId: 'space-1',
          lastSeen: Date.now(),
        },
      })

      startPresence('space-1', awareness, user)

      const peers = getPresencePeers('space-1')
      expect(peers).toHaveLength(2)

      const bob = peers.find((p) => p.userId === 'user-2')
      expect(bob).toBeDefined()
      expect(bob!.isLocal).toBe(false)
    })

    it('filters out peers from other spaces', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      // Peer in different space
      awareness._states.set(2, {
        presence: {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@acme.com',
          role: 'member',
          status: 'active',
          activeSpaceId: 'space-2', // different space
          lastSeen: Date.now(),
        },
      })

      startPresence('space-1', awareness, user)

      const peers = getPresencePeers('space-1')
      expect(peers).toHaveLength(1) // only local
    })

    it('filters out stale peers', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      // Stale peer
      awareness._states.set(2, {
        presence: {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@acme.com',
          role: 'member',
          status: 'idle',
          activeSpaceId: 'space-1',
          lastSeen: Date.now() - STALE_TIMEOUT_MS - 1000,
        },
      })

      startPresence('space-1', awareness, user)

      const peers = getPresencePeers('space-1')
      expect(peers).toHaveLength(1) // only local, stale one filtered
    })

    it('sorts local first, then active before idle', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      awareness._states.set(2, {
        presence: {
          userId: 'user-2',
          name: 'Charlie',
          email: 'charlie@acme.com',
          role: 'member',
          status: 'idle',
          activeSpaceId: 'space-1',
          lastSeen: Date.now(),
        },
      })

      awareness._states.set(3, {
        presence: {
          userId: 'user-3',
          name: 'Bob',
          email: 'bob@acme.com',
          role: 'member',
          status: 'active',
          activeSpaceId: 'space-1',
          lastSeen: Date.now(),
        },
      })

      startPresence('space-1', awareness, user)

      const peers = getPresencePeers('space-1')
      expect(peers[0].isLocal).toBe(true) // local first
      expect(peers[1].status).toBe('active') // active before idle
      expect(peers[2].status).toBe('idle')
    })
  })

  describe('updatePresenceThread', () => {
    it('updates the active thread in presence state', () => {
      const awareness = createMockAwareness()
      const user = createMockUser()

      startPresence('space-1', awareness, user)
      updatePresenceThread('space-1', 'thread-99')

      const state = awareness.getLocalState()
      const presence = state?.presence as TeamsPresenceState
      expect(presence.activeThreadId).toBe('thread-99')
    })

    it('clears thread when undefined is passed', () => {
      const awareness = createMockAwareness()
      const user = createMockUser()

      startPresence('space-1', awareness, user, 'thread-1')
      updatePresenceThread('space-1', undefined)

      const state = awareness.getLocalState()
      const presence = state?.presence as TeamsPresenceState
      expect(presence.activeThreadId).toBeUndefined()
    })

    it('is a no-op for unknown spaces', () => {
      expect(() => updatePresenceThread('unknown', 'thread-1')).not.toThrow()
    })
  })

  describe('getActivePeerCount', () => {
    it('returns 0 for unknown spaces', () => {
      expect(getActivePeerCount('unknown')).toBe(0)
    })

    it('excludes local peer from count', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      startPresence('space-1', awareness, user)

      expect(getActivePeerCount('space-1')).toBe(0) // local excluded
    })

    it('counts remote peers', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      awareness._states.set(2, {
        presence: {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@acme.com',
          role: 'member',
          status: 'active',
          activeSpaceId: 'space-1',
          lastSeen: Date.now(),
        },
      })

      startPresence('space-1', awareness, user)

      expect(getActivePeerCount('space-1')).toBe(1)
    })
  })

  describe('onPresenceChange', () => {
    it('notifies listeners when awareness changes', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      startPresence('space-1', awareness, user)

      const listener = vi.fn()
      onPresenceChange('space-1', listener)

      // Trigger awareness change by adding a remote peer
      awareness._states.set(2, {
        presence: {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@acme.com',
          role: 'member',
          status: 'active',
          activeSpaceId: 'space-1',
          lastSeen: Date.now(),
        },
      })

      // Simulate awareness change event
      awareness.setLocalStateField('presence', {
        ...(awareness.getLocalState()?.presence as TeamsPresenceState),
        lastSeen: Date.now(),
      })

      expect(listener).toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const awareness = createMockAwareness(1)
      const user = createMockUser()

      startPresence('space-1', awareness, user)

      const listener = vi.fn()
      const unsubscribe = onPresenceChange('space-1', listener)

      unsubscribe()

      // Trigger change
      awareness.setLocalStateField('presence', {
        ...(awareness.getLocalState()?.presence as TeamsPresenceState),
        lastSeen: Date.now(),
      })

      expect(listener).not.toHaveBeenCalled()
    })

    it('returns no-op for unknown spaces', () => {
      const unsub = onPresenceChange('unknown', vi.fn())
      expect(() => unsub()).not.toThrow()
    })
  })
})
