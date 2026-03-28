import {
  createTransition,
  fadeInUp,
  scaleIn,
  SPRING_CONFIG,
} from '@/lib/motion'

export const motionVariants: Record<string, Record<string, unknown>> = {
  container: {
    ...fadeInUp(20),
    transition: createTransition(0, { ...SPRING_CONFIG, duration: 0.8 }),
  },

  chip: {
    ...scaleIn,
    transition: createTransition(0.05, {
      type: 'spring',
      damping: 20,
      stiffness: 100,
    }),
  },

  title: {
    ...fadeInUp(10),
    transition: createTransition(0.1),
  },

  subtitle: {
    ...fadeInUp(10),
    transition: createTransition(0.2),
  },

  cta: {
    ...fadeInUp(20),
    transition: createTransition(0.3, { duration: 0.5 }),
  },

  card: {
    ...fadeInUp(30),
    transition: createTransition(0.2, { duration: 0.6 }),
  },

  table: {
    ...fadeInUp(20),
    transition: createTransition(0.15, { duration: 0.7 }),
  },
}
