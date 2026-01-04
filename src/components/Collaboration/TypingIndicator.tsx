import { motion, AnimatePresence } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

export interface TypingUser {
  id: string
  name: string
  color: string
}

export interface TypingIndicatorProps {
  users: TypingUser[]
  className?: string
}

function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="w-1 h-1 rounded-full bg-default-400"
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  )
}

function formatTypingText(users: TypingUser[]): React.ReactNode {
  if (users.length === 0) {
    return null
  }

  if (users.length === 1) {
    return (
      <>
        <span style={{ color: users[0].color }} className="font-medium">
          {users[0].name}
        </span>
        <span className="text-default-500"> is typing</span>
      </>
    )
  }

  if (users.length === 2) {
    return (
      <>
        <span style={{ color: users[0].color }} className="font-medium">
          {users[0].name}
        </span>
        <span className="text-default-500"> and </span>
        <span style={{ color: users[1].color }} className="font-medium">
          {users[1].name}
        </span>
        <span className="text-default-500"> are typing</span>
      </>
    )
  }

  return (
    <span className="text-default-500">{users.length} people are typing</span>
  )
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        className={twMerge('flex items-center text-sm', className)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        {formatTypingText(users)}
        <BouncingDots />
      </motion.div>
    </AnimatePresence>
  )
}

export default TypingIndicator
