import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { AwarenessManager } from '@/lib/sync'
import type { AwarenessState } from '@/types'
import type { RemoteCursor } from '@/components/Collaboration/CollaboratorCursor'

// ============================================================================
// Types
// ============================================================================

export interface UseCollaboratorCursorsOptions {
  conversationId: string
  awarenessManager: AwarenessManager | null
}

export interface UseCollaboratorCursorsReturn {
  cursors: RemoteCursor[]
  updateMyCursor: (messageId?: string, position?: number) => void
  updateMySelection: (start: number, end: number) => void
  clearMyCursor: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert an AwarenessState to a RemoteCursor
 */
function awarenessStateToRemoteCursor(
  state: AwarenessState,
  conversationId: string,
): RemoteCursor | null {
  // Skip if no user or cursor info
  if (!state.user || !state.cursor) {
    return null
  }

  // Skip if cursor is for a different conversation
  if (state.cursor.conversationId !== conversationId) {
    return null
  }

  return {
    userId: state.user.id,
    userName: state.user.name,
    color: state.user.color,
    cursor: {
      conversationId: state.cursor.conversationId,
      messageId: state.cursor.messageId,
      position: state.cursor.position,
    },
    // Selection is stored within cursor position in our AwarenessState
    selection: undefined,
    lastActive: new Date(),
  }
}

/**
 * Process raw awareness states into RemoteCursor array
 */
function processAwarenessStates(
  states: Map<number, AwarenessState>,
  conversationId: string,
): RemoteCursor[] {
  const cursors: RemoteCursor[] = []

  states.forEach((state) => {
    const cursor = awarenessStateToRemoteCursor(state, conversationId)
    if (cursor) {
      cursors.push(cursor)
    }
  })

  return cursors
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to manage collaborator cursors in a conversation.
 *
 * Subscribes to awareness changes from other users and provides
 * methods to update the local user's cursor position.
 *
 * @example
 * ```tsx
 * const { cursors, updateMyCursor, clearMyCursor } = useCollaboratorCursors({
 *   conversationId: 'conv-123',
 *   awarenessManager,
 * })
 *
 * // Update cursor when user focuses a message
 * const handleMessageFocus = (messageId: string) => {
 *   updateMyCursor(messageId)
 * }
 *
 * // Clear cursor when user leaves conversation
 * useEffect(() => {
 *   return () => clearMyCursor()
 * }, [clearMyCursor])
 * ```
 */
export function useCollaboratorCursors({
  conversationId,
  awarenessManager,
}: UseCollaboratorCursorsOptions): UseCollaboratorCursorsReturn {
  const [cursors, setCursors] = useState<RemoteCursor[]>([])
  const lastActivityMap = useRef<Map<string, Date>>(new Map())

  // Subscribe to awareness changes
  useEffect(() => {
    if (!awarenessManager) {
      setCursors([])
      return
    }

    // Get initial state
    const initialStates = awarenessManager.getRemoteStates()
    setCursors(processAwarenessStates(initialStates, conversationId))

    // Subscribe to changes
    const unsubscribe = awarenessManager.onRemoteChange((states) => {
      const now = new Date()
      const newCursors: RemoteCursor[] = []

      states.forEach((state) => {
        const cursor = awarenessStateToRemoteCursor(state, conversationId)
        if (cursor) {
          // Track last activity time
          const existingActivity = lastActivityMap.current.get(cursor.userId)

          // Update activity time if cursor position changed
          if (!existingActivity) {
            lastActivityMap.current.set(cursor.userId, now)
            cursor.lastActive = now
          } else {
            cursor.lastActive = existingActivity
          }

          newCursors.push(cursor)
        }
      })

      // Update activity timestamps for cursors that changed
      setCursors((prevCursors) => {
        return newCursors.map((newCursor) => {
          const prevCursor = prevCursors.find(
            (c) => c.userId === newCursor.userId,
          )

          // Check if cursor position changed
          const positionChanged =
            !prevCursor ||
            prevCursor.cursor.messageId !== newCursor.cursor.messageId ||
            prevCursor.cursor.position !== newCursor.cursor.position

          if (positionChanged) {
            lastActivityMap.current.set(newCursor.userId, now)
            return { ...newCursor, lastActive: now }
          }

          // Keep existing lastActive if position didn't change
          return {
            ...newCursor,
            lastActive: prevCursor?.lastActive || now,
          }
        })
      })
    })

    return () => {
      unsubscribe()
      lastActivityMap.current.clear()
    }
  }, [awarenessManager, conversationId])

  // Update local cursor position
  const updateMyCursor = useCallback(
    (messageId?: string, position?: number) => {
      if (!awarenessManager) return

      awarenessManager.updateCursor({
        conversationId,
        messageId,
        position,
      })
    },
    [awarenessManager, conversationId],
  )

  // Update local selection
  const updateMySelection = useCallback(
    (start: number, end: number) => {
      if (!awarenessManager) return

      awarenessManager.updateSelection({ start, end })
    },
    [awarenessManager],
  )

  // Clear local cursor
  const clearMyCursor = useCallback(() => {
    if (!awarenessManager) return

    awarenessManager.updateCursor(undefined)
  }, [awarenessManager])

  // Filter cursors to current conversation
  const filteredCursors = useMemo(() => {
    return cursors.filter(
      (cursor) => cursor.cursor.conversationId === conversationId,
    )
  }, [cursors, conversationId])

  return {
    cursors: filteredCursors,
    updateMyCursor,
    updateMySelection,
    clearMyCursor,
  }
}

export default useCollaboratorCursors
