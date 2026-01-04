/**
 * useCollaboration Hook
 * 
 * Provides comprehensive collaboration context for real-time collaboration features.
 * Initializes and manages the awareness system for presence tracking, cursor sharing,
 * typing indicators, and activity detection.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { AwarenessState } from '@/types'
import type { AwarenessManager } from '@/lib/sync'
import { createAwarenessManager, generateUserColor } from '@/lib/sync/awareness'
import type { Collaborator, TypingUser } from '@/components/Collaboration'
import { useIdentityStore } from '@/stores/identityStore'
import { useActiveWorkspace } from '@/stores/workspaceStore'
import { useSyncStore } from '@/stores/syncStore'
import * as Y from 'yjs'

// ============================================================================
// Types
// ============================================================================

export interface UseCollaborationOptions {
  /** The workspace ID to collaborate in (uses active workspace if not provided) */
  workspaceId?: string
  /** The conversation ID for context-specific collaboration */
  conversationId?: string
}

export interface UseCollaborationReturn {
  // State
  /** Whether collaboration is currently active */
  isCollaborating: boolean
  /** List of collaborators in the current workspace/conversation */
  collaborators: Collaborator[]
  /** List of users currently typing */
  typingUsers: TypingUser[]
  
  // Actions
  /** Set the local user's typing state */
  setTyping: (typing: boolean) => void
  /** Update the local user's cursor position */
  setCursor: (messageId?: string, position?: number) => void
  /** Set which agent the local user is viewing */
  setViewingAgent: (agentId?: string) => void
  
  // Advanced usage
  /** The underlying awareness manager (for custom integrations) */
  awarenessManager: AwarenessManager | null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert an AwarenessState to a Collaborator
 */
function awarenessStateToCollaborator(
  state: AwarenessState
): Collaborator | null {
  if (!state.user) {
    return null
  }

  return {
    id: state.user.id,
    name: state.user.name,
    color: state.user.color,
    status: state.presence?.status ?? 'online',
    currentView: state.viewingAgent ?? state.presence?.currentView,
  }
}

/**
 * Convert an AwarenessState to a TypingUser (if typing)
 */
function awarenessStateToTypingUser(
  state: AwarenessState,
  conversationId?: string
): TypingUser | null {
  if (!state.user || !state.typing) {
    return null
  }

  // If conversationId is provided, only include users typing in that conversation
  if (conversationId) {
    const isTypingInConversation =
      state.cursor?.conversationId === conversationId ||
      state.viewingAgent === conversationId

    if (!isTypingInConversation) {
      return null
    }
  }

  return {
    id: state.user.id,
    name: state.user.name,
    color: state.user.color,
  }
}

/**
 * Process awareness states into collaborator and typing user lists
 */
function processAwarenessStates(
  states: Map<number, AwarenessState>,
  conversationId?: string
): { collaborators: Collaborator[]; typingUsers: TypingUser[] } {
  const collaborators: Collaborator[] = []
  const typingUsers: TypingUser[] = []

  states.forEach((state) => {
    const collaborator = awarenessStateToCollaborator(state)
    if (collaborator) {
      collaborators.push(collaborator)
    }

    const typingUser = awarenessStateToTypingUser(state, conversationId)
    if (typingUser) {
      typingUsers.push(typingUser)
    }
  })

  return { collaborators, typingUsers }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing real-time collaboration features.
 * 
 * Initializes the awareness system, tracks collaborator presence,
 * and provides methods for updating local user state.
 * 
 * @example
 * ```tsx
 * const {
 *   isCollaborating,
 *   collaborators,
 *   typingUsers,
 *   setTyping,
 *   setCursor,
 *   setViewingAgent,
 * } = useCollaboration({
 *   conversationId: 'conv-123',
 * })
 * 
 * // Show collaborator avatars
 * <CollaboratorAvatars collaborators={collaborators} />
 * 
 * // Show typing indicator
 * <TypingIndicator users={typingUsers} />
 * 
 * // Update typing state
 * const handleInput = () => {
 *   setTyping(true)
 *   // Clear typing after delay...
 * }
 * ```
 */
export function useCollaboration(
  options: UseCollaborationOptions = {}
): UseCollaborationReturn {
  const { conversationId } = options

  // Store connections
  const userIdentity = useIdentityStore((state) => state.user)
  const activeWorkspace = useActiveWorkspace()
  const syncStore = useSyncStore()

  // Use provided workspaceId or fall back to active workspace
  const effectiveWorkspaceId = options.workspaceId ?? activeWorkspace?.id

  // Local state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [awarenessManager, setAwarenessManager] = useState<AwarenessManager | null>(null)

  // Refs for cleanup and tracking
  const awarenessManagerRef = useRef<AwarenessManager | null>(null)
  const docRef = useRef<Y.Doc | null>(null)

  // Determine if collaboration is active
  const isCollaborating = useMemo(() => {
    return !!(
      effectiveWorkspaceId &&
      syncStore.isEnabled &&
      awarenessManager &&
      userIdentity
    )
  }, [effectiveWorkspaceId, syncStore.isEnabled, awarenessManager, userIdentity])

  // Initialize awareness manager when workspace/sync changes
  useEffect(() => {
    // Skip if not in collaborative mode
    if (!effectiveWorkspaceId || !syncStore.isEnabled) {
      // Clean up existing manager
      if (awarenessManagerRef.current) {
        awarenessManagerRef.current.destroy()
        awarenessManagerRef.current = null
        setAwarenessManager(null)
      }
      if (docRef.current) {
        docRef.current.destroy()
        docRef.current = null
      }
      setCollaborators([])
      setTypingUsers([])
      return
    }

    // Try to get awareness from P2P provider if available
    const p2pProvider = syncStore.getProvider('p2p')
    
    if (p2pProvider) {
      // Provider-based awareness
      const getAwareness = (p2pProvider as any).getAwareness
      
      if (typeof getAwareness === 'function') {
        const awareness = getAwareness.call(p2pProvider, effectiveWorkspaceId)
        
        if (awareness) {
          // Wrap the provider's awareness in our manager
          // For now, we'll create our own manager with a shared doc
          const doc = new Y.Doc()
          docRef.current = doc
          
          const manager = createAwarenessManager(doc)
          awarenessManagerRef.current = manager
          setAwarenessManager(manager)

          // Set up local user if we have identity
          if (userIdentity) {
            manager.setLocalUser({
              id: userIdentity.id,
              name: userIdentity.displayName || 'Anonymous',
              color: generateUserColor(userIdentity.id),
            })
            manager.setPresenceStatus('online')
          }

          return () => {
            manager.destroy()
            doc.destroy()
            awarenessManagerRef.current = null
            docRef.current = null
          }
        }
      }
    }

    // Fallback: Create standalone awareness manager
    const doc = new Y.Doc()
    docRef.current = doc
    
    const manager = createAwarenessManager(doc)
    awarenessManagerRef.current = manager
    setAwarenessManager(manager)

    // Set up local user if we have identity
    if (userIdentity) {
      manager.setLocalUser({
        id: userIdentity.id,
        name: userIdentity.displayName || 'Anonymous',
        color: generateUserColor(userIdentity.id),
      })
      manager.setPresenceStatus('online')
    }

    return () => {
      manager.destroy()
      doc.destroy()
      awarenessManagerRef.current = null
      docRef.current = null
    }
  }, [effectiveWorkspaceId, syncStore.isEnabled, syncStore, userIdentity])

  // Update local user when identity changes
  useEffect(() => {
    if (!awarenessManager || !userIdentity) return

    awarenessManager.setLocalUser({
      id: userIdentity.id,
      name: userIdentity.displayName || 'Anonymous',
      color: generateUserColor(userIdentity.id),
    })
  }, [awarenessManager, userIdentity])

  // Subscribe to awareness changes
  useEffect(() => {
    if (!awarenessManager) {
      setCollaborators([])
      setTypingUsers([])
      return
    }

    // Get initial state
    const initialStates = awarenessManager.getRemoteStates()
    const { collaborators: initialCollabs, typingUsers: initialTyping } =
      processAwarenessStates(initialStates, conversationId)
    setCollaborators(initialCollabs)
    setTypingUsers(initialTyping)

    // Subscribe to changes
    const unsubscribe = awarenessManager.onRemoteChange((states) => {
      const { collaborators: newCollabs, typingUsers: newTyping } =
        processAwarenessStates(states, conversationId)
      setCollaborators(newCollabs)
      setTypingUsers(newTyping)
    })

    return () => {
      unsubscribe()
    }
  }, [awarenessManager, conversationId])

  // Handle document visibility changes for presence
  useEffect(() => {
    if (!awarenessManager) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        awarenessManager.setPresenceStatus('away')
      } else {
        awarenessManager.setPresenceStatus('online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [awarenessManager])

  // Clean up awareness on unmount
  useEffect(() => {
    return () => {
      if (awarenessManagerRef.current) {
        awarenessManagerRef.current.setPresenceStatus('offline')
        awarenessManagerRef.current.destroy()
        awarenessManagerRef.current = null
      }
      if (docRef.current) {
        docRef.current.destroy()
        docRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Set the local user's typing state
   */
  const setTyping = useCallback(
    (typing: boolean) => {
      if (!awarenessManager) return

      awarenessManager.setTyping(typing)

      // If starting to type, also update cursor context
      if (typing && conversationId) {
        awarenessManager.updateCursor({
          conversationId,
          messageId: undefined,
          position: undefined,
        })
      }
    },
    [awarenessManager, conversationId]
  )

  /**
   * Update the local user's cursor position
   */
  const setCursor = useCallback(
    (messageId?: string, position?: number) => {
      if (!awarenessManager) return

      awarenessManager.updateCursor({
        conversationId,
        messageId,
        position,
      })
    },
    [awarenessManager, conversationId]
  )

  /**
   * Set which agent the local user is viewing
   */
  const setViewingAgent = useCallback(
    (agentId?: string) => {
      if (!awarenessManager) return

      awarenessManager.setViewingAgent(agentId)
    },
    [awarenessManager]
  )

  return {
    // State
    isCollaborating,
    collaborators,
    typingUsers,

    // Actions
    setTyping,
    setCursor,
    setViewingAgent,

    // Advanced usage
    awarenessManager,
  }
}

export default useCollaboration
