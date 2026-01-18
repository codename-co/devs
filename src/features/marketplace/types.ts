/**
 * Marketplace Feature Types
 *
 * Type definitions for the DEVS Marketplace - a standardized, schema-driven
 * platform enabling users to create, share, and publish Apps, Agents,
 * Connectors, and Tools.
 *
 * @see /public/schemas/extension.schema.json
 */

import type { IconName } from '@/lib/types'

// =============================================================================
// EXTENSION BASE TYPES
// =============================================================================

/**
 * Extension type categories available in the marketplace
 */
export type ExtensionType = 'app' | 'agent' | 'connector' | 'tool'

/**
 * Extension installation status
 */
export type ExtensionStatus = 'available' | 'installed' | 'updating' | 'error'

// =============================================================================
// AUTHOR & METADATA
// =============================================================================

/**
 * Extension author information
 */
export interface ExtensionAuthor {
  /** Author display name */
  name?: string
  /** Author email */
  email?: string
  /** Author website URL */
  url?: string
}

/**
 * Internationalization for extension metadata
 */
export interface ExtensionI18n {
  /** Localized name */
  name?: string
  /** Localized description */
  description?: string
  /** Key-value pairs for UI label translations */
  messages?: Record<string, string>
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Extension configuration schema
 */
export interface ExtensionConfiguration {
  /** JSON Schema for configuration options */
  schema?: Record<string, unknown>
  /** Default configuration values */
  defaults?: Record<string, unknown>
}

/**
 * Extension color options (matches Tailwind color names)
 */
export type ExtensionColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'gray'

// =============================================================================
// EXTENSION DEFINITION (matches extension.schema.json)
// =============================================================================

/**
 * Extension definition as defined in the schema.
 * This represents the structure of extension files.
 */
export interface ExtensionDefinition {
  /** Unique extension identifier (lowercase alphanumeric with hyphens) */
  id: string
  /** Extension type */
  type: ExtensionType
  /** Display name */
  name: string
  /** Semantic version (x.y.z format) */
  version: string
  /** License (default: MIT) */
  license: string
  /** Icon name (Iconoir) */
  icon?: IconName
  /** Extension color (Tailwind color name) */
  color?: ExtensionColor
  /** Description */
  description?: string
  /** Author information */
  author?: ExtensionAuthor
  /** Featured status */
  featured?: boolean
  /** Privacy policy URL */
  privacyPolicy?: string
  /** Source repository URL */
  source?: string
  /** Localized metadata (keyed by locale, e.g., 'en', 'fr', 'en-US') */
  i18n?: Record<string, ExtensionI18n>
  /** Additional extension pages (keyed by page name, value is inline React code) */
  pages?: Record<string, string>
  /** Configuration options */
  configuration?: ExtensionConfiguration
  /** Base64-encoded screenshots of the extension */
  screenshots?: string[]
}

/**
 * Complete marketplace extension with runtime metadata
 */
export interface MarketplaceExtension extends ExtensionDefinition {
  // Marketplace metadata (not part of schema, added at runtime)
  /** Number of downloads */
  downloads?: number
  /** Average rating (0-5) */
  rating?: number
  /** Number of reviews */
  reviewCount?: number
  /** Publication date */
  publishedAt?: Date
  /** Last update date */
  updatedAt?: Date
  /** Whether this is a custom (AI-generated) extension */
  isCustom?: boolean
}

// =============================================================================
// INSTALLED EXTENSION
// =============================================================================

/**
 * Installed extension with runtime state
 */
export interface InstalledExtension {
  /** Extension ID (same as extension.id, used as DB key) */
  id: string
  /** Extension definition */
  extension: MarketplaceExtension
  /** Installation status */
  status: ExtensionStatus
  /** Whether the extension is enabled */
  enabled: boolean
  /** User configuration overrides */
  userConfig?: Record<string, unknown>
  /** Installation date */
  installedAt: Date
  /** Last used date */
  lastUsedAt?: Date
}

// =============================================================================
// MANIFEST TYPES
// =============================================================================

/**
 * Minimal extension metadata from the manifest registry.
 * Full details are loaded on-demand from individual extension files.
 * Matches the required fields from extension.schema.json.
 */
export interface ManifestExtension {
  /** Unique extension identifier */
  id: string
  /** Display name */
  name: string
  /** Semantic version */
  version: string
  /** Extension type */
  type: ExtensionType
  /** License (default: MIT) */
  license: string
  /** Icon name (Iconoir) */
  icon?: IconName
  /** Extension color (Tailwind color name) */
  color?: ExtensionColor
  /** Short description for listing */
  description?: string
  /** Featured status */
  featured?: boolean
  /** Localized metadata (keyed by locale) */
  i18n?: Record<string, ExtensionI18n>
}

/**
 * Extensions manifest file structure
 */
export interface ExtensionsManifest {
  extensions: ManifestExtension[]
}

// =============================================================================
// CUSTOM EXTENSION (AI-GENERATED)
// =============================================================================

/**
 * Custom extension created via AI generation.
 * Extends ExtensionDefinition with metadata about creation.
 */
export interface CustomExtension extends ExtensionDefinition {
  /** The prompt used to generate this extension */
  generationPrompt: string
  /** When the extension was created */
  createdAt: Date
  /** When the extension was last updated */
  updatedAt?: Date
  /** Whether the extension is currently enabled */
  enabled: boolean
}

// =============================================================================
// STORE STATE
// =============================================================================

/**
 * Marketplace store state
 */
export interface MarketplaceState {
  /** All available extensions from the registry */
  extensions: MarketplaceExtension[]
  /** Installed extensions (keyed by extension ID) */
  installed: Map<string, InstalledExtension>
  /** Currently loading state */
  isLoading: boolean
  /** Current error message */
  error: string | null
  /** Search query */
  searchQuery: string
  /** Active type filter */
  typeFilter: ExtensionType | null
  /** Filter for featured extensions only */
  featuredOnly: boolean
}
