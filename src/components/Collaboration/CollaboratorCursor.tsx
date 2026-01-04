import { useEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

// ============================================================================
// Types
// ============================================================================

export interface CursorPosition {
  conversationId: string
  messageId?: string
  position?: number
}

export interface RemoteCursor {
  userId: string
  userName: string
  color: string
  cursor: CursorPosition
  selection?: {
    start: number
    end: number
  }
  lastActive: Date
}

export interface CollaboratorCursorProps {
  cursors: RemoteCursor[]
  currentConversationId: string
  messageRefs?: Map<string, HTMLElement>
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const INDICATOR_WIDTH = 3
const INDICATOR_OFFSET = 4
const MAX_VISIBLE_INDICATORS = 3
const RECENT_ACTIVITY_MS = 2000
const CLEANUP_TIMEOUT_MS = 5000

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a cursor was recently active (within threshold)
 */
function isRecentlyActive(
  lastActive: Date,
  thresholdMs: number = RECENT_ACTIVITY_MS,
): boolean {
  return Date.now() - lastActive.getTime() < thresholdMs
}

/**
 * Group cursors by message ID
 */
function groupCursorsByMessage(
  cursors: RemoteCursor[],
): Map<string, RemoteCursor[]> {
  const grouped = new Map<string, RemoteCursor[]>()

  for (const cursor of cursors) {
    if (cursor.cursor.messageId) {
      const messageId = cursor.cursor.messageId
      const existing = grouped.get(messageId) || []
      existing.push(cursor)
      grouped.set(messageId, existing)
    }
  }

  return grouped
}

// ============================================================================
// Sub-components
// ============================================================================

interface CursorLabelProps {
  userName: string
  color: string
  offsetIndex: number
}

function CursorLabel({ userName, color, offsetIndex }: CursorLabelProps) {
  return (
    <motion.div
      className="absolute -top-6 flex items-center whitespace-nowrap pointer-events-none"
      style={{
        left: offsetIndex * INDICATOR_OFFSET,
        zIndex: 1000 - offsetIndex,
      }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
    >
      <span
        className={twMerge(
          'px-1.5 py-0.5 text-xs font-medium rounded-full',
          'text-white shadow-sm',
        )}
        style={{
          backgroundColor: `${color}e6`, // Semi-transparent
        }}
      >
        {userName}
      </span>
    </motion.div>
  )
}

interface CursorIndicatorProps {
  cursor: RemoteCursor
  offsetIndex: number
  messageElement: HTMLElement
}

function CursorIndicator({
  cursor,
  offsetIndex,
  messageElement,
}: CursorIndicatorProps) {
  const [position, setPosition] = useState<{
    top: number
    left: number
    height: number
  } | null>(null)
  const isRecent = isRecentlyActive(cursor.lastActive)

  // Calculate position based on message element
  const updatePosition = useCallback(() => {
    if (!messageElement) return

    const rect = messageElement.getBoundingClientRect()
    setPosition({
      top: rect.top + window.scrollY,
      left:
        rect.left +
        window.scrollX -
        INDICATOR_WIDTH -
        4 +
        offsetIndex * INDICATOR_OFFSET,
      height: rect.height,
    })
  }, [messageElement, offsetIndex])

  useEffect(() => {
    updatePosition()

    // Listen for scroll and resize events
    const handleUpdate = () => updatePosition()
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    // Use ResizeObserver for message element changes
    const resizeObserver = new ResizeObserver(handleUpdate)
    resizeObserver.observe(messageElement)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
      resizeObserver.disconnect()
    }
  }, [updatePosition, messageElement])

  if (!position) return null

  return (
    <motion.div
      className="fixed pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 1000 - offsetIndex,
      }}
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* User name label */}
      <CursorLabel
        userName={cursor.userName}
        color={cursor.color}
        offsetIndex={0}
      />

      {/* Vertical indicator line */}
      <motion.div
        className="rounded-full"
        style={{
          width: INDICATOR_WIDTH,
          height: position.height,
          backgroundColor: cursor.color,
        }}
        animate={
          isRecent
            ? {
                opacity: [1, 0.6, 1],
              }
            : { opacity: 1 }
        }
        transition={
          isRecent
            ? {
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : {}
        }
      />
    </motion.div>
  )
}

interface MessageCursorsProps {
  cursors: RemoteCursor[]
  messageElement: HTMLElement
}

function MessageCursors({ cursors, messageElement }: MessageCursorsProps) {
  const visibleCursors = cursors.slice(0, MAX_VISIBLE_INDICATORS)
  const hiddenCount = cursors.length - MAX_VISIBLE_INDICATORS
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  // Calculate position for overflow indicator
  const updatePosition = useCallback(() => {
    if (!messageElement) return

    const rect = messageElement.getBoundingClientRect()
    setPosition({
      top: rect.top + window.scrollY - 24,
      left:
        rect.left +
        window.scrollX -
        INDICATOR_WIDTH -
        4 +
        MAX_VISIBLE_INDICATORS * INDICATOR_OFFSET,
    })
  }, [messageElement])

  useEffect(() => {
    if (hiddenCount <= 0) return

    updatePosition()

    const handleUpdate = () => updatePosition()
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [updatePosition, hiddenCount])

  return (
    <>
      <AnimatePresence mode="popLayout">
        {visibleCursors.map((cursor, index) => (
          <CursorIndicator
            key={cursor.userId}
            cursor={cursor}
            offsetIndex={index}
            messageElement={messageElement}
          />
        ))}
      </AnimatePresence>

      {/* Overflow indicator for hidden cursors */}
      {hiddenCount > 0 && position && (
        <motion.div
          className="fixed pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            zIndex: 999,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-default-200 text-default-600 shadow-sm">
            +{hiddenCount}
          </span>
        </motion.div>
      )}
    </>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CollaboratorCursor({
  cursors,
  currentConversationId,
  messageRefs,
  className,
}: CollaboratorCursorProps) {
  const [activeCursors, setActiveCursors] = useState<RemoteCursor[]>([])

  // Filter cursors to current conversation only
  const filteredCursors = useMemo(() => {
    return cursors.filter(
      (cursor) => cursor.cursor.conversationId === currentConversationId,
    )
  }, [cursors, currentConversationId])

  // Clean up stale cursors (inactive for more than 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setActiveCursors((prev) =>
        prev.filter(
          (cursor) => now - cursor.lastActive.getTime() < CLEANUP_TIMEOUT_MS,
        ),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Update active cursors when filtered cursors change
  useEffect(() => {
    setActiveCursors(filteredCursors)
  }, [filteredCursors])

  // Group cursors by message
  const cursorsByMessage = useMemo(() => {
    return groupCursorsByMessage(activeCursors)
  }, [activeCursors])

  // Don't render if no message refs or no active cursors
  if (!messageRefs || cursorsByMessage.size === 0) {
    return null
  }

  // Render cursors as portal overlay
  const portalContent = (
    <div className={twMerge('collaborator-cursors', className)}>
      {Array.from(cursorsByMessage.entries()).map(
        ([messageId, messageCursors]) => {
          const messageElement = messageRefs.get(messageId)
          if (!messageElement) return null

          return (
            <MessageCursors
              key={messageId}
              cursors={messageCursors}
              messageElement={messageElement}
            />
          )
        },
      )}
    </div>
  )

  return createPortal(portalContent, document.body)
}

export default CollaboratorCursor
