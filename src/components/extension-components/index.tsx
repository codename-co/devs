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
export { Container, type ContainerProps } from '../Container'
export { PromptArea, type PromptAreaProps } from './PromptArea'
export { Section, type SectionProps } from '../Section'
export { Widget, type CodeBlockType } from '../Widget'
