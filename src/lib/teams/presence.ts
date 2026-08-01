/**
 * @module lib/teams/presence
 *
 * Teams Presence Awareness
 *
 * Uses the Yjs awareness protocol to broadcast and subscribe to
 * real-time user presence within Enterprise spaces. Each Enterprise
 * Y.Doc (one per space) has its own WebSocket connection and therefore
 * its own awareness group.
 *
 * ## How it works
 *
 * 1. When a user navigates to an Enterprise space, their presence is
 *    set on that space's awareness instance.
 * 2. Other team members receive the awareness update via the Yjs sync
 *    protocol and can see who is online.
 * 3. An idle timer marks users as `idle` after inactivity.
 * 4. When the user leaves the space or logs out, awareness is cleared.
 *
 * ## Data shape
 *
 * Each awareness state contains a {@link TeamsPresenceState} object:
 * - `userId`, `name`, `email`, `avatar` — identity (from auth)
 * - `role` — admin or member
 * - `status` — active or idle
 * - `activeSpaceId` — which space they're in
 * - `activeThreadId` — which conversation thread they're viewing
 * - `lastSeen` — timestamp for staleness checks
 */

import type { TeamsUser } from '@/features/auth/types'

// ============================================================================
// Types
// ============================================================================

/**
 * Awareness state broadcast to all peers in an Enterprise space.
 */
export interface TeamsPresenceState {
  /** User's sub claim from JWT */
  userId: string
  /** Display name */
  name: string
  /** Email address */
  email: string
  /** Profile picture URL */
  avatar?: string
  /** Admin or member role */
  role: 'admin' | 'member'
  /** Current activity status */
  status: 'active' | 'idle'
  /** The Enterprise space being viewed */
  activeSpaceId: string
  /** The conversation thread being viewed (if any) */
  activeThreadId?: string
  /** Timestamp of last activity (ms since epoch) */
  lastSeen: number
}

/**
 * A peer's presence info, augmented with the Yjs client ID.
 */
export interface PresencePeer extends TeamsPresenceState {
  /** Yjs awareness client ID */
  clientId: number
  /** Whether this is the local user */
  isLocal: boolean
}

// ============================================================================
// Constants
// ============================================================================

/** Time (ms) after which a user is considered idle */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/** Time (ms) after which a stale awareness entry is ignored */
export const STALE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

/** Interval (ms) for heartbeat updates */
export const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds

// ============================================================================
// Presence manager per space
// ============================================================================

interface PresenceManager {
  /** Awareness instance (from Yjs WebSocket provider) */
  awareness: AwarenessProtocol
  /** Idle timer handle */
  idleTimer: ReturnType<typeof setTimeout> | null
  /** Heartbeat interval handle */
  heartbeatInterval: ReturnType<typeof setInterval> | null
  /** Activity event listeners to clean up */
  activityListeners: Array<() => void>
  /** Change listeners */
  changeListeners: Set<PresenceChangeListener>
}

/** Minimal awareness protocol interface (from y-protocols) */
export interface AwarenessProtocol {
  clientID: number
  getLocalState: () => Record<string, unknown> | null
  setLocalState: (state: Record<string, unknown> | null) => void
  setLocalStateField: (field: string, value: unknown) => void
  getStates: () => Map<number, Record<string, unknown>>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler: (...args: unknown[]) => void) => void
}

type PresenceChangeListener = (peers: PresencePeer[]) => void

/** Active presence managers per space */
const managers = new Map<string, PresenceManager>()

// ============================================================================
// Core API
// ============================================================================

/**
 * Build a presence state object from the authenticated user.
 */
export function buildPresenceState(
  user: TeamsUser,
  spaceId: string,
  activeThreadId?: string,
): TeamsPresenceState {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    status: 'active',
    activeSpaceId: spaceId,
    activeThreadId,
    lastSeen: Date.now(),
  }
}

/**
 * Start broadcasting presence on an Enterprise space's awareness instance.
 *
 * Sets the local awareness state and begins heartbeat + idle detection.
 *
 * @param spaceId - Enterprise space ID
 * @param awareness - Yjs awareness protocol instance for the space
 * @param user - Authenticated user from the auth module
 * @param activeThreadId - Optional thread being viewed
 */
export function startPresence(
  spaceId: string,
  awareness: AwarenessProtocol,
  user: TeamsUser,
  activeThreadId?: string,
): void {
  // Stop any existing presence for this space
  stopPresence(spaceId)

  const state = buildPresenceState(user, spaceId, activeThreadId)

  // Set local awareness state
  awareness.setLocalState({ presence: state })

  const changeListeners = new Set<PresenceChangeListener>()

  // Listen for awareness changes and notify subscribers
  const awarenessChangeHandler = () => {
    const peers = getPresencePeers(spaceId)
    changeListeners.forEach((listener) => listener(peers))
  }
  awareness.on('change', awarenessChangeHandler)

  // Idle detection — listen for user activity
  const activityListeners: Array<() => void> = []

  if (typeof window !== 'undefined') {
    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const resetIdleTimer = () => {
      const manager = managers.get(spaceId)
      if (!manager) return

      // Mark as active if was idle
      const currentState = awareness.getLocalState()
      const presence = currentState?.presence as TeamsPresenceState | undefined
      if (presence?.status === 'idle') {
        awareness.setLocalStateField('presence', {
          ...presence,
          status: 'active',
          lastSeen: Date.now(),
        })
      }

      // Reset timer
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        const mgr = managers.get(spaceId)
        if (!mgr) return
        const localState = awareness.getLocalState()
        const p = localState?.presence as TeamsPresenceState | undefined
        if (p) {
          awareness.setLocalStateField('presence', {
            ...p,
            status: 'idle',
            lastSeen: Date.now(),
          })
        }
      }, IDLE_TIMEOUT_MS)

      if (manager) manager.idleTimer = idleTimer
    }

    for (const event of activityEvents) {
      const handler = () => resetIdleTimer()
      window.addEventListener(event, handler, { passive: true })
      activityListeners.push(() => window.removeEventListener(event, handler))
    }

    // Start initial idle timer
    resetIdleTimer()
  }

  // Heartbeat — periodically update lastSeen
  const heartbeatInterval = setInterval(() => {
    const localState = awareness.getLocalState()
    const presence = localState?.presence as TeamsPresenceState | undefined
    if (presence) {
      awareness.setLocalStateField('presence', {
        ...presence,
        lastSeen: Date.now(),
      })
    }
  }, HEARTBEAT_INTERVAL_MS)

  const manager: PresenceManager = {
    awareness,
    idleTimer: null,
    heartbeatInterval,
    activityListeners,
    changeListeners,
  }

  managers.set(spaceId, manager)
}

/**
 * Stop broadcasting presence on an Enterprise space.
 *
 * Clears the local awareness state and stops heartbeat + idle detection.
 */
export function stopPresence(spaceId: string): void {
  const manager = managers.get(spaceId)
  if (!manager) return

  // Clear idle timer
  if (manager.idleTimer) {
    clearTimeout(manager.idleTimer)
  }

  // Clear heartbeat
  if (manager.heartbeatInterval) {
    clearInterval(manager.heartbeatInterval)
  }

  // Remove activity listeners
  for (const cleanup of manager.activityListeners) {
    cleanup()
  }

  // Clear awareness state
  manager.awareness.setLocalState(null)

  // Clear change listeners
  manager.changeListeners.clear()

  managers.delete(spaceId)
}

/**
 * Stop all presence (e.g. on logout).
 */
export function stopAllPresence(): void {
  for (const spaceId of Array.from(managers.keys())) {
    stopPresence(spaceId)
  }
}

/**
 * Update the active thread ID for a space's presence.
 */
export function updatePresenceThread(
  spaceId: string,
  activeThreadId: string | undefined,
): void {
  const manager = managers.get(spaceId)
  if (!manager) return

  const localState = manager.awareness.getLocalState()
  const presence = localState?.presence as TeamsPresenceState | undefined
  if (presence) {
    manager.awareness.setLocalStateField('presence', {
      ...presence,
      activeThreadId,
      lastSeen: Date.now(),
    })
  }
}

/**
 * Get all peers with presence in a space.
 *
 * Filters out stale entries (older than {@link STALE_TIMEOUT_MS}).
 */
export function getPresencePeers(spaceId: string): PresencePeer[] {
  const manager = managers.get(spaceId)
  if (!manager) return []

  const now = Date.now()
  const peers: PresencePeer[] = []

  for (const [clientId, state] of manager.awareness.getStates()) {
    const presence = state?.presence as TeamsPresenceState | undefined
    if (!presence) continue
    if (presence.activeSpaceId !== spaceId) continue

    // Skip stale entries
    if (now - presence.lastSeen > STALE_TIMEOUT_MS) continue

    peers.push({
      ...presence,
      clientId,
      isLocal: clientId === manager.awareness.clientID,
    })
  }

  // Sort: local first, then active before idle, then by name
  return peers.sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * Subscribe to presence changes in a space.
 *
 * @returns Unsubscribe function
 */
export function onPresenceChange(
  spaceId: string,
  listener: PresenceChangeListener,
): () => void {
  const manager = managers.get(spaceId)
  if (!manager) return () => {}

  manager.changeListeners.add(listener)
  return () => manager.changeListeners.delete(listener)
}

/**
 * Check if presence is active for a space.
 */
export function isPresenceActive(spaceId: string): boolean {
  return managers.has(spaceId)
}

/**
 * Get the count of active peers in a space (excluding stale/self).
 */
export function getActivePeerCount(spaceId: string): number {
  return getPresencePeers(spaceId).filter((p) => !p.isLocal).length
}
