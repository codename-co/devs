import { useState, useEffect } from 'react'
import type { AwarenessState } from '@/types'
import type { TypingUser } from '@/components/Collaboration'
import { useSyncStore } from '@/stores/syncStore'
import { useActiveWorkspace } from '@/stores/workspaceStore'

// ============================================================================
// Types
// ============================================================================

export interface UseTypingUsersOptions {
  /** The conversation ID to filter typing users for */
  conversationId: string | undefined
}

export interface UseTypingUsersReturn {
  /** Array of users currently typing in the conversation */
  typingUsers: TypingUser[]
  /** Set the local user's typing state */
  setTyping: (isTyping: boolean) => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to track users who are currently typing in a specific conversation.
 * 
 * Uses the awareness system to broadcast and receive typing states
 * from other collaborators in real-time.
 * 
 * @example
 * ```tsx
 * const { typingUsers, setTyping } = useTypingUsers({
 *   conversationId: 'conv-123',
 * })
 * 
 * // Show typing indicator
 * <TypingIndicator users={typingUsers} />
 * 
 * // Set typing when user is composing
 * const handleInput = () => {
 *   setTyping(true)
 *   // Clear typing after delay
 * }
 * ```
 */
export function useTypingUsers({
  conversationId,
}: UseTypingUsersOptions): UseTypingUsersReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const activeWorkspace = useActiveWorkspace()
  const syncStore = useSyncStore()

  useEffect(() => {
    if (!conversationId || !activeWorkspace || !syncStore.isEnabled) {
      setTypingUsers([])
      return
    }

    // Get awareness from P2P provider if available
    const p2pProvider = syncStore.getProvider('p2p')
    if (!p2pProvider) {
      setTypingUsers([])
      return
    }

    // Try to get awareness from the provider
    const getAwareness = (p2pProvider as any).getAwareness
    if (typeof getAwareness !== 'function') {
      setTypingUsers([])
      return
    }

    const awareness = getAwareness.call(p2pProvider, activeWorkspace.id)
    if (!awareness) {
      setTypingUsers([])
      return
    }

    // Process awareness states to find typing users in this conversation
    const updateTypingUsers = () => {
      const states = awareness.getStates() as Map<number, AwarenessState>
      const localClientId = awareness.clientID
      const users: TypingUser[] = []

      states.forEach((state, clientId) => {
        // Skip local user
        if (clientId === localClientId) return

        // Check if user is typing in this specific conversation
        const isTypingInThisConversation =
          state.typing === true &&
          (state.cursor?.conversationId === conversationId ||
            state.viewingAgent === conversationId)

        if (state.user && isTypingInThisConversation) {
          users.push({
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
          })
        }
      })

      setTypingUsers(users)
    }

    // Initial update
    updateTypingUsers()

    // Subscribe to awareness changes
    const handleChange = () => updateTypingUsers()
    awareness.on('change', handleChange)

    return () => {
      awareness.off('change', handleChange)
    }
  }, [conversationId, activeWorkspace, syncStore.isEnabled, syncStore])

  // Set local typing state
  const setTyping = (isTyping: boolean) => {
    if (!activeWorkspace || !syncStore.isEnabled) return

    const p2pProvider = syncStore.getProvider('p2p')
    if (!p2pProvider) return

    const getAwareness = (p2pProvider as any).getAwareness
    if (typeof getAwareness !== 'function') return

    const awareness = getAwareness.call(p2pProvider, activeWorkspace.id)
    if (!awareness) return

    // Update local awareness state with typing status
    const currentState = awareness.getLocalState() || {}
    awareness.setLocalStateField('typing', isTyping)
    
    // Also update cursor to include current conversation context
    if (isTyping && conversationId) {
      awareness.setLocalStateField('cursor', {
        ...currentState.cursor,
        conversationId,
      })
    }
  }

  return {
    typingUsers,
    setTyping,
  }
}

export default useTypingUsers
