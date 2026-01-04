import { Avatar, AvatarGroup, Chip, Tooltip } from '@heroui/react'
import { twMerge } from 'tailwind-merge'
import { PresenceIndicator } from './PresenceIndicator'

export interface Collaborator {
  id: string
  name: string
  avatar?: string
  color: string
  status: 'online' | 'away' | 'offline'
  currentView?: string
}

export interface CollaboratorAvatarsProps {
  collaborators: Collaborator[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  onCollaboratorClick?: (collaborator: Collaborator) => void
  className?: string
}

const avatarSizeMap = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const

const presenceSizeMap = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
} as const

const presencePositionMap = {
  sm: '-bottom-0.5 -right-0.5',
  md: '-bottom-0.5 -right-0.5',
  lg: '-bottom-1 -right-1',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function sortByStatus(collaborators: Collaborator[]): Collaborator[] {
  const statusOrder = { online: 0, away: 1, offline: 2 }
  return [...collaborators].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status],
  )
}

interface CollaboratorAvatarProps {
  collaborator: Collaborator
  size: 'sm' | 'md' | 'lg'
  showTooltip: boolean
  onClick?: (collaborator: Collaborator) => void
}

function CollaboratorAvatar({
  collaborator,
  size,
  showTooltip,
  onClick,
}: CollaboratorAvatarProps) {
  const avatar = (
    <div className="relative">
      <Avatar
        src={collaborator.avatar}
        name={getInitials(collaborator.name)}
        size={avatarSizeMap[size]}
        style={{
          borderColor: collaborator.color,
          borderWidth: 2,
        }}
        className={twMerge(
          'ring-2 ring-background',
          onClick && 'cursor-pointer hover:scale-105 transition-transform',
        )}
        onClick={() => onClick?.(collaborator)}
      />
      <span className={twMerge('absolute z-10', presencePositionMap[size])}>
        <PresenceIndicator
          status={collaborator.status}
          size={presenceSizeMap[size]}
        />
      </span>
    </div>
  )

  if (!showTooltip) {
    return avatar
  }

  const tooltipContent = (
    <div className="px-1 py-1">
      <div className="font-medium" style={{ color: collaborator.color }}>
        {collaborator.name}
      </div>
      <div className="text-xs text-default-500 capitalize">
        {collaborator.status}
      </div>
      {collaborator.currentView && (
        <div className="text-xs text-default-400 mt-0.5">
          Viewing: {collaborator.currentView}
        </div>
      )}
    </div>
  )

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      {avatar}
    </Tooltip>
  )
}

export function CollaboratorAvatars({
  collaborators,
  maxDisplay = 4,
  size = 'md',
  showTooltip = true,
  onCollaboratorClick,
  className,
}: CollaboratorAvatarsProps) {
  if (collaborators.length === 0) {
    return null
  }

  const sorted = sortByStatus(collaborators)
  const displayed = sorted.slice(0, maxDisplay)
  const overflow = sorted.length - maxDisplay

  return (
    <div className={twMerge('flex items-center', className)}>
      <AvatarGroup
        max={maxDisplay}
        renderCount={(count) => (
          <Tooltip
            content={
              <div className="px-1 py-1">
                <div className="font-medium mb-1">+{count} more</div>
                {sorted.slice(maxDisplay).map((c) => (
                  <div key={c.id} className="text-xs text-default-400">
                    {c.name}
                  </div>
                ))}
              </div>
            }
            placement="bottom"
          >
            <Chip size={size} variant="flat" className="ml-1 cursor-default">
              +{count}
            </Chip>
          </Tooltip>
        )}
      >
        {displayed.map((collaborator) => (
          <CollaboratorAvatar
            key={collaborator.id}
            collaborator={collaborator}
            size={size}
            showTooltip={showTooltip}
            onClick={onCollaboratorClick}
          />
        ))}
      </AvatarGroup>
      {overflow > 0 && (
        <Tooltip
          content={
            <div className="px-1 py-1">
              <div className="font-medium mb-1">+{overflow} more</div>
              {sorted.slice(maxDisplay).map((c) => (
                <div key={c.id} className="text-xs text-default-400">
                  {c.name}
                </div>
              ))}
            </div>
          }
          placement="bottom"
        >
          <Chip size={size} variant="flat" className="ml-1 cursor-default">
            +{overflow}
          </Chip>
        </Tooltip>
      )}
    </div>
  )
}

export default CollaboratorAvatars
