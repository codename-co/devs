/**
 * @module features/auth/components/PresenceBar
 *
 * Presence Bar — shows online teammates in an Enterprise space.
 *
 * Renders an avatar group of peers currently present in the space,
 * with status indicators (active/idle) and tooltips showing names.
 *
 * Only visible in Teams mode when viewing an Enterprise space.
 */

import { memo } from 'react'
import { Avatar, AvatarGroup, Badge, Tooltip } from '@heroui/react'
import { useSpacePresence } from '@/lib/teams/presence-hooks'
import { isTeams } from '@/lib/teams/config'
import type { PresencePeer } from '@/lib/teams/presence'

// ============================================================================
// Sub-components
// ============================================================================

function PeerAvatar({ peer }: { peer: PresencePeer }) {
  const statusColor = peer.status === 'active' ? 'success' : 'default'
  const initials = peer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const tooltipContent = (
    <div className="flex flex-col gap-0.5 py-1">
      <span className="font-medium text-sm">
        {peer.name}
        {peer.isLocal ? ' (You)' : ''}
      </span>
      <span className="text-xs text-default-400">{peer.email}</span>
      <div className="flex gap-1 items-center mt-0.5">
        <span
          className={`w-2 h-2 rounded-full ${
            peer.status === 'active' ? 'bg-success' : 'bg-default-300'
          }`}
        />
        <span className="text-xs text-default-500 capitalize">
          {peer.status}
        </span>
        {peer.role === 'admin' && (
          <span className="text-xs text-warning-500 ml-1">Admin</span>
        )}
      </div>
    </div>
  )

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <Badge
        content=""
        color={statusColor}
        shape="circle"
        size="sm"
        placement="bottom-right"
        isInvisible={peer.status !== 'active'}
      >
        <Avatar
          name={initials}
          src={peer.avatar}
          size="sm"
          classNames={{
            base: `w-7 h-7 text-xs ${
              peer.isLocal ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
            } ${peer.status === 'idle' ? 'opacity-50' : ''}`,
          }}
        />
      </Badge>
    </Tooltip>
  )
}

// ============================================================================
// Main component
// ============================================================================

interface PresenceBarProps {
  /** Enterprise space ID to show presence for */
  spaceId: string | undefined
  /** Maximum avatars to show before "+N" overflow */
  maxVisible?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Horizontal bar showing online teammates in an Enterprise space.
 *
 * Features:
 * - Avatar group with status indicators (green dot = active)
 * - Tooltips with name, email, role, and activity status
 * - "+N" overflow for large teams
 * - Local user highlighted with a ring
 * - Idle users shown with reduced opacity
 *
 * Returns `null` when not in Teams mode or no peers are present.
 */
export const PresenceBar = memo(function PresenceBar({
  spaceId,
  maxVisible = 8,
  className = '',
}: PresenceBarProps) {
  if (!isTeams) return null

  const peers = useSpacePresence(spaceId)

  // Don't show if alone or no peers
  if (peers.length <= 1) return null

  const remotePeerCount = peers.filter((p) => !p.isLocal).length

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 ${className}`}
      role="status"
      aria-label={`${remotePeerCount} online`}
    >
      <AvatarGroup
        max={maxVisible}
        size="sm"
        className="justify-start"
        renderCount={(count) => (
          <Tooltip content={`+${count} more`}>
            <Avatar
              name={`+${count}`}
              size="sm"
              classNames={{
                base: 'w-7 h-7 text-xs bg-default-100 text-default-500',
              }}
            />
          </Tooltip>
        )}
      >
        {peers.map((peer) => (
          <PeerAvatar key={peer.clientId} peer={peer} />
        ))}
      </AvatarGroup>

      <span className="text-xs text-default-400 whitespace-nowrap">
        {remotePeerCount} online
      </span>
    </div>
  )
})
