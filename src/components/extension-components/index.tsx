/**
 * Standalone Extension Components
 *
 * Shared UI components for marketplace extensions.
 *
 * Usage in extensions:
 *   import { Section, Container, PromptArea } from '@devs/components'
 */

// Re-export HeroUI components
export * from '@heroui/react'

// Export custom components
export { Section } from '../Section'
export { Container } from '../Container'
export { PromptArea } from './PromptArea'
// and their types
export type { SectionProps } from '../Section'
export type { ContainerProps } from '../Container'
export type { PromptAreaProps } from './PromptArea'
