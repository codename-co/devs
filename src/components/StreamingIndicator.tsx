/**
 * StreamingIndicator
 *
 * A simple animated indicator showing that an AI agent is "thinking" or processing.
 * Used when streaming responses without the full agent loop timeline.
 */

import { memo } from 'react'
import { motion } from 'framer-motion'

import { Icon } from './Icon'
import type { IconName } from '@/lib/types'

interface StreamingIndicatorProps {
  agentIcon?: IconName
  agentName?: string
  message?: string
  className?: string
}

const ThinkingDots = memo(() => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 bg-primary rounded-full"
        animate={{
          y: [-2, 2, -2],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
))
ThinkingDots.displayName = 'ThinkingDots'

export const StreamingIndicator = memo(
  ({
    agentIcon = 'Sparks',
    agentName = 'Agent',
    message = 'Thinking',
    className = '',
  }: StreamingIndicatorProps) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center gap-3 py-3 ${className}`}
      >
        {/* Agent icon with pulse effect */}
        <motion.div
          className="relative flex-none"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="border-1 border-primary/30 bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
            <Icon name={agentIcon} className="w-4 h-4 text-primary" />
          </div>
          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{
              scale: [1, 1.8],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        </motion.div>

        {/* Text with dots */}
        <div className="flex items-center gap-2">
          <span className="text-small text-default-600 font-medium">
            {agentName} · {message}
          </span>
          <ThinkingDots />
        </div>
      </motion.div>
    )
  },
)
StreamingIndicator.displayName = 'StreamingIndicator'
