/**
 * @module lib/teams/presence-hooks
 *
 * React hooks for Teams presence awareness.
 *
 * These hooks subscribe to the presence system and trigger re-renders
 * when peers join, leave, or change status in an Enterprise space.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  getPresencePeers,
  getActivePeerCount,
  onPresenceChange,
  updatePresenceThread,
  type PresencePeer,
} from './presence'

/**
 * Subscribe to the list of peers present in an Enterprise space.
 *
 * Returns a live-updating array of {@link PresencePeer} objects sorted
 * by: local first → active before idle → alphabetical by name.
 *
 * @param spaceId - Enterprise space ID to observe
 * @returns Array of presence peers (empty if not in Teams mode or no presence)
 *
 * @example
 * ```tsx
 * function SpaceHeader({ spaceId }: { spaceId: string }) {
 *   const peers = useSpacePresence(spaceId)
 *
 *   return (
 *     <div className="flex gap-1">
 *       {peers.map(peer => (
 *         <Avatar key={peer.clientId} src={peer.avatar} name={peer.name} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSpacePresence(spaceId: string | undefined): PresencePeer[] {
  const [peers, setPeers] = useState<PresencePeer[]>([])

  useEffect(() => {
    if (!spaceId) {
      setPeers([])
      return
    }

    // Get initial peers
    setPeers(getPresencePeers(spaceId))

    // Subscribe to changes
    const unsubscribe = onPresenceChange(spaceId, (updatedPeers) => {
      setPeers(updatedPeers)
    })

    return unsubscribe
  }, [spaceId])

  return peers
}

/**
 * Subscribe to the count of other (non-local) peers in an Enterprise space.
 *
 * @param spaceId - Enterprise space ID to observe
 * @returns Number of remote peers currently present
 */
export function usePresencePeerCount(spaceId: string | undefined): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!spaceId) {
      setCount(0)
      return
    }

    setCount(getActivePeerCount(spaceId))

    const unsubscribe = onPresenceChange(spaceId, (peers) => {
      setCount(peers.filter((p) => !p.isLocal).length)
    })

    return unsubscribe
  }, [spaceId])

  return count
}

/**
 * Returns a callback to update the active thread for presence.
 *
 * Useful when the user navigates between threads within a space.
 *
 * @param spaceId - Enterprise space ID
 */
export function useUpdatePresenceThread(
  spaceId: string | undefined,
): (threadId: string | undefined) => void {
  return useCallback(
    (threadId: string | undefined) => {
      if (spaceId) {
        updatePresenceThread(spaceId, threadId)
      }
    },
    [spaceId],
  )
}
