/**
 * Connectors Feature
 *
 * External services integration for the DEVS Knowledge Base.
 * Supports OAuth-based apps, custom APIs, and MCP servers.
 */

// Types
export * from './types'

// Core modules
export { OAuthGateway } from './oauth-gateway'
export { ProviderRegistry, ProviderNotFoundError, ProviderLoadError } from './provider-registry'
export {
  BaseAppConnectorProvider,
  TokenDecryptionError,
  AuthenticationError,
  MissingEncryptionMetadataError,
  getProviderScopes,
  sharesSameAccount,
  getRelatedProviders,
  buildConnectorStorageKey,
  storeEncryptionMetadata,
  clearEncryptionMetadata,
} from './connector-provider'
export { SyncEngine, handleBackgroundSync } from './sync-engine'
export {
  normalizeToKnowledgeItem,
  mergeWithExisting,
  generateContentHash,
  hasContentChanged,
  detectFileType,
  detectFileTypeForProvider,
} from './normalizer'

// Components
export {
  ConnectorCard,
  ConnectorWizard,
  ConnectorSyncStatus,
  GlobalSyncIndicator,
  ConnectorIcon,
} from './components'

// Hooks
export { useConnectorSync, useGlobalSyncStatus } from './hooks/useConnectorSync'

// Pages
export { ConnectorsPage } from './pages'

// Initialize default providers on module load
import { ProviderRegistry } from './provider-registry'
ProviderRegistry.initializeDefaults()

// Providers
export { PROVIDER_CONFIG, AVAILABLE_PROVIDERS } from './providers/apps'
