/**
 * Awareness System for Real-time Collaboration
 *
 * Provides presence and awareness functionality using Yjs awareness protocol.
 * Handles user presence, cursor tracking, typing indicators, and activity detection.
 */

import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { AwarenessState, PresenceState, PresenceStatus } from '@/types'

// ============================================================================
// Color Palette for User Identification
// ============================================================================

/**
 * Curated palette of 16 distinct colors for user identification.
 * Colors are chosen to be visually distinct and accessible.
 */
const USER_COLORS = [
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#03A9F4', // Light Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
] as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a deterministic color from a user ID using a hash function.
 * The same user ID will always produce the same color.
 *
 * @param userId - The unique user identifier
 * @returns A hex color code from the palette
 */
export function generateUserColor(userId: string): string {
  // Simple hash function for consistent color assignment
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Use absolute value and modulo to pick from palette
  const index = Math.abs(hash) % USER_COLORS.length
  return USER_COLORS[index]
}

/**
 * Format presence status to human-readable string.
 *
 * @param state - The presence state to format
 * @returns Human-readable status string
 */
export function formatPresenceStatus(state: PresenceState): string {
  const statusLabels: Record<PresenceStatus, string> = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  }

  const baseStatus = statusLabels[state.status]

  if (state.status === 'away' && state.lastActive) {
    const now = new Date()
    const diffMs = now.getTime() - state.lastActive.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) {
      return `${baseStatus} (just now)`
    } else if (diffMins < 60) {
      return `${baseStatus} (${diffMins}m ago)`
    } else {
      const diffHours = Math.floor(diffMins / 60)
      return `${baseStatus} (${diffHours}h ago)`
    }
  }

  if (state.currentView) {
    return `${baseStatus} • ${state.currentView}`
  }

  return baseStatus
}

// ============================================================================
// Local State Interface
// ============================================================================

/**
 * Extended local state that includes both awareness and presence.
 */
interface LocalAwarenessState {
  user?: {
    id: string
    name: string
    color: string
  }
  cursor?: AwarenessState['cursor']
  typing?: boolean
  viewingAgent?: string
  presence?: PresenceState
}

// ============================================================================
// AwarenessManager Class
// ============================================================================

/**
 * Manages presence and awareness state for real-time collaboration.
 *
 * Uses Yjs awareness protocol to share user state across connected peers.
 * Includes automatic away detection based on user activity.
 *
 * @example
 * ```typescript
 * const doc = new Y.Doc()
 * const awareness = new AwarenessManager(doc)
 *
 * awareness.setLocalUser({ id: 'user-1', name: 'Alice' })
 * awareness.setPresenceStatus('online')
 *
 * // Subscribe to remote changes
 * const unsubscribe = awareness.onRemoteChange((states) => {
 *   console.log('Remote users:', states)
 * })
 *
 * // Cleanup when done
 * awareness.destroy()
 * ```
 */
export class AwarenessManager {
  private awareness: Awareness
  private localUser: { id: string; name: string; color: string } | null = null
  private localState: LocalAwarenessState = {}
  private changeCallbacks: Set<(states: Map<number, AwarenessState>) => void> =
    new Set()
  private activityTimeout: ReturnType<typeof setTimeout> | null = null
  private visibilityHandler: (() => void) | null = null
  private activityHandler: (() => void) | null = null

  /** Duration of inactivity before setting status to 'away' (5 minutes) */
  private static readonly AWAY_TIMEOUT_MS = 5 * 60 * 1000

  /**
   * Create a new AwarenessManager.
   *
   * @param doc - The Yjs document to attach awareness to
   */
  constructor(doc: Y.Doc) {
    this.awareness = new Awareness(doc)

    // Set up awareness change handler
    this.awareness.on('change', this.handleAwarenessChange)

    // Set up auto-away detection
    this.setupAutoAwayDetection()
  }

  /**
   * Set the local user information.
   * This will be broadcast to all connected peers.
   *
   * @param user - User information (color is auto-generated if not provided)
   */
  setLocalUser(user: { id: string; name: string; color?: string }): void {
    this.localUser = {
      id: user.id,
      name: user.name,
      color: user.color ?? generateUserColor(user.id),
    }

    this.localState.user = this.localUser
    this.updateLocalAwareness()
  }

  /**
   * Update the local cursor position.
   *
   * @param cursor - Cursor position information
   */
  updateCursor(cursor: AwarenessState['cursor']): void {
    this.localState.cursor = cursor
    this.updateLocalAwareness()
    this.resetActivityTimer()
  }

  /**
   * Update the local text selection.
   *
   * @param selection - Selection range information
   */
  updateSelection(selection: { start: number; end: number } | undefined): void {
    // Store selection in the cursor object or as a separate field if needed
    // The AwarenessState type doesn't have selection at top level,
    // so we store it within cursor context
    if (selection && this.localState.cursor) {
      this.localState.cursor = {
        ...this.localState.cursor,
        position: selection.start,
      }
    }
    this.updateLocalAwareness()
    this.resetActivityTimer()
  }

  /**
   * Set the typing indicator status.
   *
   * @param typing - Whether the user is currently typing
   */
  setTyping(typing: boolean): void {
    this.localState.typing = typing
    this.updateLocalAwareness()
    this.resetActivityTimer()
  }

  /**
   * Set which agent the user is currently viewing.
   *
   * @param agentId - ID of the agent being viewed, or undefined if none
   */
  setViewingAgent(agentId: string | undefined): void {
    this.localState.viewingAgent = agentId
    this.updateLocalAwareness()
    this.resetActivityTimer()
  }

  /**
   * Set the user's presence status.
   *
   * @param status - The new presence status
   */
  setPresenceStatus(status: PresenceStatus): void {
    this.localState.presence = {
      status,
      lastActive: new Date(),
      currentView: this.localState.presence?.currentView,
    }
    this.updateLocalAwareness()
  }

  /**
   * Set the current view/page the user is on.
   *
   * @param view - Name or identifier of the current view
   */
  setCurrentView(view: string | undefined): void {
    this.localState.presence = {
      ...this.localState.presence,
      status: this.localState.presence?.status ?? 'online',
      lastActive: new Date(),
      currentView: view,
    }
    this.updateLocalAwareness()
    this.resetActivityTimer()
  }

  /**
   * Get all remote user awareness states.
   * Excludes the local user's state.
   *
   * @returns Map of client IDs to awareness states
   */
  getRemoteStates(): Map<number, AwarenessState> {
    const states = new Map<number, AwarenessState>()
    const localClientId = this.awareness.clientID

    this.awareness.getStates().forEach((state, clientId) => {
      if (clientId !== localClientId && state.user) {
        states.set(clientId, state as AwarenessState)
      }
    })

    return states
  }

  /**
   * Get all awareness states including local.
   *
   * @returns Map of client IDs to awareness states
   */
  getAllStates(): Map<number, AwarenessState> {
    const states = new Map<number, AwarenessState>()

    this.awareness.getStates().forEach((state, clientId) => {
      if (state.user) {
        states.set(clientId, state as AwarenessState)
      }
    })

    return states
  }

  /**
   * Get the local client ID.
   *
   * @returns The local Yjs client ID
   */
  getLocalClientId(): number {
    return this.awareness.clientID
  }

  /**
   * Subscribe to remote awareness state changes.
   *
   * @param callback - Function called when remote states change
   * @returns Unsubscribe function
   */
  onRemoteChange(
    callback: (states: Map<number, AwarenessState>) => void,
  ): () => void {
    this.changeCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.changeCallbacks.delete(callback)
    }
  }

  /**
   * Get the underlying Yjs Awareness instance.
   * Useful for connecting to sync providers.
   *
   * @returns The Yjs Awareness instance
   */
  getAwareness(): Awareness {
    return this.awareness
  }

  /**
   * Clean up resources and disconnect.
   * Should be called when the manager is no longer needed.
   */
  destroy(): void {
    // Remove awareness listener
    this.awareness.off('change', this.handleAwarenessChange)

    // Clear activity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout)
      this.activityTimeout = null
    }

    // Remove visibility change listener
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }

    // Remove activity listeners
    if (this.activityHandler && typeof window !== 'undefined') {
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
      events.forEach((event) => {
        window.removeEventListener(event, this.activityHandler!)
      })
      this.activityHandler = null
    }

    // Clear local state
    this.awareness.setLocalState(null)
    this.changeCallbacks.clear()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Handle awareness changes from Yjs.
   */
  private handleAwarenessChange = (): void => {
    const remoteStates = this.getRemoteStates()
    this.changeCallbacks.forEach((callback) => {
      callback(remoteStates)
    })
  }

  /**
   * Update the local awareness state in Yjs.
   */
  private updateLocalAwareness(): void {
    if (!this.localUser) {
      return
    }

    this.awareness.setLocalState({
      user: this.localUser,
      cursor: this.localState.cursor,
      typing: this.localState.typing,
      viewingAgent: this.localState.viewingAgent,
      presence: this.localState.presence,
    })
  }

  /**
   * Set up automatic away detection based on document visibility
   * and user activity.
   */
  private setupAutoAwayDetection(): void {
    // Skip in non-browser environments
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return
    }

    // Handle visibility change
    this.visibilityHandler = () => {
      if (document.hidden) {
        // User switched away from tab
        this.setPresenceStatus('away')
      } else {
        // User came back to tab
        this.setPresenceStatus('online')
        this.resetActivityTimer()
      }
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)

    // Handle user activity to reset away timer
    this.activityHandler = () => {
      if (this.localState.presence?.status === 'away') {
        this.setPresenceStatus('online')
      }
      this.resetActivityTimer()
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((event) => {
      window.addEventListener(event, this.activityHandler!, { passive: true })
    })

    // Start the initial activity timer
    this.resetActivityTimer()
  }

  /**
   * Reset the activity timer.
   * After AWAY_TIMEOUT_MS of inactivity, status is set to 'away'.
   */
  private resetActivityTimer(): void {
    if (typeof window === 'undefined') {
      return
    }

    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout)
    }

    this.activityTimeout = setTimeout(() => {
      if (this.localState.presence?.status === 'online') {
        this.setPresenceStatus('away')
      }
    }, AwarenessManager.AWAY_TIMEOUT_MS)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AwarenessManager for a Yjs document.
 *
 * @param doc - The Yjs document
 * @returns A new AwarenessManager instance
 */
export function createAwarenessManager(doc: Y.Doc): AwarenessManager {
  return new AwarenessManager(doc)
}
