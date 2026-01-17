/**
 * App Connector Providers Index
 *
 * This module imports all provider modules to trigger their registration
 * and re-exports the registry API for consumers.
 *
 * Providers are self-contained and register themselves when imported.
 */

// =============================================================================
// Provider Imports (triggers registration)
// =============================================================================

// Import all providers to register them
// Each provider calls registerProvider() when imported
// The order matters for display purposes
import './google-drive'
import './dropbox'
import './onedrive'
import './gmail'
import './outlook-mail'
import './google-calendar'
import './slack'
import './google-chat'
import './google-meet'
import './google-tasks'
import './notion'
import './figma'
import './qonto'

// =============================================================================
// Registry Re-exports
// =============================================================================

export {
  registerProvider,
  getProviders,
  getProviderIds,
  getProvider,
  hasProvider,
  getProviderConfig,
  getProxyRoutes,
  loadProvider,
} from './registry'

// Re-export types
export type { ProviderMetadata } from '../../types'
