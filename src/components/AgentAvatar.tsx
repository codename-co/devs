import { Avatar, type AvatarProps } from '@heroui/react'

import { Icon } from './Icon'

import { type Agent, type AgentColor } from '@/types'
import { type Lang } from '@/i18n'

/**
 * Map agent color to HeroUI Avatar color
 */
const getAvatarColor = (
  color?: AgentColor,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
  return color || 'default'
}

/**
 * Get Tailwind classes for agent color theme (used for custom styling)
 */
export const getAgentColorClasses = (color?: AgentColor): string => {
  const colorMap: Record<AgentColor, string> = {
    default: 'bg-default-100 text-default-600',
    primary: 'bg-primary-100 text-primary-600',
    secondary: 'bg-secondary-100 text-secondary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    danger: 'bg-danger-100 text-danger-600',
  }
  return colorMap[color || 'default'] || colorMap.default
}

export interface AgentAvatarProps {
  agent: Agent
  /** Language for i18n name display */
  lang?: Lang
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the agent name next to the avatar */
  showName?: boolean
  /** Additional class name for the container */
  className?: string
  /** Additional class name for the avatar */
  avatarClassName?: string
  /** Additional class name for the name text */
  nameClassName?: string
  /** HeroUI Avatar radius */
  radius?: AvatarProps['radius']
}

/**
 * Reusable component for displaying an agent's avatar with optional name.
 * Shows the agent's portrait if available, otherwise falls back to icon with color.
 */
export function AgentAvatar({
  agent,
  lang,
  size = 'sm',
  showName = false,
  className = '',
  avatarClassName = '',
  nameClassName = '',
  radius = 'full',
}: AgentAvatarProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-16 h-16',
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-8 h-8',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-medium',
  }

  const displayName = lang
    ? (agent.i18n?.[lang]?.name ?? agent.name)
    : agent.name

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar
        className={`bg-default-200 ${sizeClasses[size]} ${avatarClassName}`}
        radius={radius}
        color={getAvatarColor(agent.color)}
        src={
          agent.portrait ? `data:image/png;base64,${agent.portrait}` : undefined
        }
        name={displayName}
        showFallback
        fallback={
          <Icon
            name={agent.icon || 'User'}
            className={`${iconSizeClasses[size]} text-inherit`}
          />
        }
        classNames={{
          base: 'flex-shrink-0',
          fallback: 'flex items-center justify-center',
        }}
      />
      {showName && (
        <span className={`${textSizeClasses[size]} ${nameClassName}`}>
          {displayName}
        </span>
      )}
    </div>
  )
}
