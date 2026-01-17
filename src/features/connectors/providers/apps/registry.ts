/**
 * App Connector Provider Registry
 *
 * A centralized registry for app connector providers.
 * Providers register themselves by calling `registerProvider()`.
 *
 * This pattern allows each provider to be self-contained with its own
 * metadata, OAuth config, and proxy routes while still being discoverable.
 */

import type { ProxyRoute } from '@/lib/oauth-proxy-plugin'
import type { AppConnectorProvider, ProviderMetadata } from '../../types'

// =============================================================================
// Registry State
// =============================================================================

/** Map of registered providers by ID */
const providers = new Map<AppConnectorProvider, ProviderMetadata>()

/** Lazy-loaded provider implementations */
const providerLoaders = new Map<
  AppConnectorProvider,
  () => Promise<{ default: unknown }>
>()

// =============================================================================
// Registration API
// =============================================================================

/**
 * Register a provider with its metadata.
 * Called by each provider module when imported.
 *
 * @param metadata - The provider's self-contained metadata
 * @param loader - Optional lazy loader for the provider implementation
 */
export function registerProvider(
  metadata: ProviderMetadata,
  loader?: () => Promise<{ default: unknown }>,
): void {
  providers.set(metadata.id, metadata)
  if (loader) {
    providerLoaders.set(metadata.id, loader)
  }
}

// =============================================================================
// Query API
// =============================================================================

/**
 * Get all registered providers
 */
export function getProviders(): ProviderMetadata[] {
  return Array.from(providers.values())
}

/**
 * Get all registered provider IDs
 */
export function getProviderIds(): AppConnectorProvider[] {
  return Array.from(providers.keys())
}

/**
 * Get a specific provider's metadata by ID
 */
export function getProvider(
  id: AppConnectorProvider,
): ProviderMetadata | undefined {
  return providers.get(id)
}

/**
 * Check if a provider is registered
 */
export function hasProvider(id: AppConnectorProvider): boolean {
  return providers.has(id)
}

/**
 * Get provider metadata as a record (for backward compatibility)
 */
export function getProviderConfig(): Record<
  AppConnectorProvider,
  ProviderMetadata
> {
  const config: Partial<Record<AppConnectorProvider, ProviderMetadata>> = {}
  for (const [id, metadata] of providers) {
    config[id] = metadata
  }
  return config as Record<AppConnectorProvider, ProviderMetadata>
}

// =============================================================================
// Proxy Routes
// =============================================================================

/**
 * Get proxy routes for all registered providers.
 * Used by vite.config.ts to configure the dev server proxy.
 *
 * @param env - Environment variables containing client IDs and secrets
 */
export function getProxyRoutes(env: Record<string, string>): ProxyRoute[] {
  const routes: ProxyRoute[] = []

  for (const metadata of providers.values()) {
    if (!metadata.proxyRoutes) continue

    for (const route of metadata.proxyRoutes) {
      // Resolve environment variable keys to actual values
      let credentials: ProxyRoute['credentials']

      if (route.credentials.type === 'none') {
        credentials = { type: 'none' }
      } else {
        credentials = {
          type: route.credentials.type,
          clientId: env[route.credentials.clientIdEnvKey] || '',
          clientSecret: env[route.credentials.clientSecretEnvKey] || '',
        }
      }

      routes.push({
        pathPrefix: route.pathPrefix,
        pathMatch: route.pathMatch,
        target: route.target,
        targetPathPrefix: route.targetPathPrefix,
        credentials,
      })
    }
  }

  return routes
}

/**
 * Lazy-load a provider implementation
 */
export async function loadProvider(id: AppConnectorProvider): Promise<unknown> {
  const loader = providerLoaders.get(id)
  if (!loader) {
    throw new Error(`No loader registered for provider: ${id}`)
  }
  const module = await loader()
  return module.default
}
