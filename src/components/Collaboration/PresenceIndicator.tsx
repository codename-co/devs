import { Tooltip } from '@heroui/react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

export interface PresenceIndicatorProps {
  status: 'online' | 'away' | 'offline'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const statusColors = {
  online: '#22c55e',
  away: '#eab308',
  offline: '#6b7280',
}

const statusLabels = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
}

const sizeMap = {
  sm: 8,
  md: 12,
  lg: 16,
}

const labelSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

export function PresenceIndicator({
  status,
  size = 'md',
  showLabel = false,
  className,
}: PresenceIndicatorProps) {
  const dotSize = sizeMap[size]
  const color = statusColors[status]
  const label = statusLabels[status]

  const dot = (
    <motion.span
      className="relative inline-block rounded-full"
      style={{
        width: dotSize,
        height: dotSize,
        backgroundColor: color,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {status === 'online' && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.span>
  )

  if (showLabel) {
    return (
      <span
        className={twMerge(
          'inline-flex items-center gap-1.5',
          labelSizeClasses[size],
          className
        )}
      >
        {dot}
        <span className="text-default-600">{label}</span>
      </span>
    )
  }

  return (
    <Tooltip content={label} placement="top" size="sm">
      <span className={twMerge('inline-flex', className)}>{dot}</span>
    </Tooltip>
  )
}

export default PresenceIndicator
