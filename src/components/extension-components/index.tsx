/**
 * Standalone Extension Components
 *
 * Shared UI components for marketplace extensions.
 * These components are self-contained and do not require any providers.
 *
 * Usage in extensions:
 *   import { Section, Container, PromptArea, translate } from '@devs/components'
 */

// Re-export HeroUI components
export * from '@heroui/react'

// Export custom components
export { Container, type ContainerProps } from '../Container'
export { Icon, type IconProps } from '../Icon'
export {
  PromptArea,
  type PromptAreaProps,
  type LanguageCode,
  translate,
  createTranslator,
} from './PromptArea'
export { Section, type SectionProps } from '../Section'
