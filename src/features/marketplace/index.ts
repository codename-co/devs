/**
 * Marketplace Feature
 *
 * A standardized, schema-driven marketplace enabling users to create,
 * share, and publish Apps, Agents, Connectors, and Tools.
 */

// Types
export * from './types'

// Store
export {
  useMarketplaceStore,
  getExtensions,
  getExtensionById,
  isExtensionInstalled,
  hasExtensionUpdate,
  getMarketplaceVersion,
  getInstalledApps,
  loadExtensionDetails,
  clearExtensionCache,
} from './store'

// Utils
export { compareVersions, isNewerVersion } from './utils'

// Components
export { ExtensionDetailModal } from './components'

// Pages
export { MarketplacePage } from './pages'
export { PublishPage } from './pages'
