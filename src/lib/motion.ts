export const SPRING_CONFIG = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 120,
}

// Reusable transition factory
export const createTransition = (delay = 0, overrides = {}) => ({
  delay,
  duration: 0.6,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
  ...overrides,
})

// Reusable animation states
export const fadeInUp = (distance = 20) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
})

export const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
}

export const scaleOut = {
  initial: { scale: 1.1, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
}
