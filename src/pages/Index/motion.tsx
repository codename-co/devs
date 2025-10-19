import type { MotionProps } from 'framer-motion'
import {
  createTransition,
  fadeInUp,
  scaleIn,
  // scaleOut,
  SPRING_CONFIG,
} from '@/lib/motion'
export const motionVariants: Record<string, MotionProps> = {
  container: {
    ...fadeInUp(20),
    transition: createTransition(0, { ...SPRING_CONFIG, duration: 0.8 }),
  },

  icon: {
    ...scaleIn,
    transition: createTransition(0.1, {
      type: 'spring',
      damping: 20,
      stiffness: 100,
    }),
    whileHover: { scale: 1.05, transition: { duration: 0.2 } },
  },

  title: {
    ...fadeInUp(10),
    transition: createTransition(0.2),
  },

  promptArea: {
    ...fadeInUp(30),
    transition: createTransition(0.3, { duration: 0.7 }),
  },

  agentSection: {
    ...fadeInUp(30),
    transition: createTransition(0.35, { duration: 0.7 }),
  },

  usecase: {
    ...fadeInUp(30),
    transition: createTransition(0.7, { duration: 0.3 }),
  },
}
