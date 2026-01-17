/**
 * Provider Registry - Lazy Loading Connector Providers
 *
 * This module manages the registration and lazy loading of connector providers.
 * Providers are loaded on-demand to optimize initial bundle size.
 */

import type {
  AppConnectorProvider,
  AppConnectorProviderInterface,
  ConnectorProvider,
  ConnectorProviderInterface,
  ProviderLoader,
} from './types'

/**
 * Error thrown when a provider is not found in the registry
 */
export class ProviderNotFoundError extends Error {
  constructor(provider: ConnectorProvider) {
    super(`Provider '${provider}' is not registered`)
    this.name = 'ProviderNotFoundError'
  }
}

/**
 * Error thrown when provider loading fails
 */
export class ProviderLoadError extends Error {
  constructor(provider: ConnectorProvider, cause?: Error) {
    super(
      `Failed to load provider '${provider}'${cause ? `: ${cause.message}` : ''}`,
    )
    this.name = 'ProviderLoadError'
    this.cause = cause
  }
}

/**
 * List of app connector providers that support lazy loading
 */
const APP_PROVIDERS: readonly AppConnectorProvider[] = [
  'google-drive',
  'gmail',
  'google-calendar',
  'google-chat',
  'google-tasks',
  'google-meet',
  'notion',
  'qonto',
  'slack',
  'outlook-mail',
  'dropbox',
  'figma',
] as const

/**
 * Registry for managing connector provider instances with lazy loading
 */
export class ProviderRegistry {
  /**
   * Registered provider loaders (lazy)
   */
  private static loaders: Map<ConnectorProvider, ProviderLoader> = new Map()

  /**
   * Cached provider instances
   */
  private static instances: Map<ConnectorProvider, ConnectorProviderInterface> =
    new Map()

  /**
   * Register a provider loader for lazy loading
   * @param provider - The provider identifier
   * @param loader - Function that returns a promise resolving to the provider module
   */
  static register(provider: ConnectorProvider, loader: ProviderLoader): void {
    this.loaders.set(provider, loader)
  }

  /**
   * Get a provider instance, loading it lazily if needed
   * @param provider - The provider identifier
   * @returns Promise resolving to the provider instance
   * @throws ProviderNotFoundError if provider is not registered
   * @throws ProviderLoadError if provider fails to load
   */
  static async get<
    T extends ConnectorProviderInterface = ConnectorProviderInterface,
  >(provider: ConnectorProvider): Promise<T> {
    // Check cache first
    const cached = this.instances.get(provider)
    if (cached) {
      return cached as T
    }

    // Get loader
    const loader = this.loaders.get(provider)
    if (!loader) {
      throw new ProviderNotFoundError(provider)
    }

    try {
      // Load the provider module
      const module = await loader()
      const instance = module.default

      // Initialize if the provider has an initialize method
      if (instance.initialize) {
        await instance.initialize()
      }

      // Cache the instance
      this.instances.set(provider, instance)

      return instance as T
    } catch (error) {
      throw new ProviderLoadError(
        provider,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  /**
   * Get a provider specifically typed as an app connector provider
   * @param provider - The app connector provider identifier
   * @returns Promise resolving to the app connector provider instance
   */
  static async getAppProvider(
    provider: AppConnectorProvider,
  ): Promise<AppConnectorProviderInterface> {
    return this.get<AppConnectorProviderInterface>(provider)
  }

  /**
   * Check if a provider is registered
   * @param provider - The provider identifier
   * @returns true if the provider has a registered loader
   */
  static has(provider: ConnectorProvider): boolean {
    return this.loaders.has(provider)
  }

  /**
   * Get all registered provider identifiers
   * @returns Array of registered provider identifiers
   */
  static getRegistered(): ConnectorProvider[] {
    return Array.from(this.loaders.keys())
  }

  /**
   * Get all registered app connector provider identifiers
   * @returns Array of registered app connector provider identifiers
   */
  static getRegisteredAppProviders(): AppConnectorProvider[] {
    return this.getRegistered().filter(
      (provider): provider is AppConnectorProvider =>
        APP_PROVIDERS.includes(provider as AppConnectorProvider),
    )
  }

  /**
   * Clear the instance cache (useful for testing)
   * Also calls dispose() on any cached instances that support it
   */
  static async clearCache(): Promise<void> {
    // Dispose of any instances that support it
    const disposePromises = Array.from(this.instances.values())
      .filter((instance) => instance.dispose)
      .map((instance) => instance.dispose!())

    await Promise.allSettled(disposePromises)

    this.instances.clear()
  }

  /**
   * Initialize default providers with their lazy loaders
   * Call this once at application startup
   */
  static initializeDefaults(): void {
    // App providers - lazy loaded
    this.register('google-drive', () => import('./providers/apps/google-drive'))
    this.register('gmail', () => import('./providers/apps/gmail'))
    this.register(
      'google-calendar',
      () => import('./providers/apps/google-calendar'),
    )
    this.register('google-chat', () => import('./providers/apps/google-chat'))
    this.register('google-tasks', () => import('./providers/apps/google-tasks'))
    this.register('google-meet', () => import('./providers/apps/google-meet'))
    this.register('notion', () => import('./providers/apps/notion'))
    this.register('qonto', () => import('./providers/apps/qonto'))
    this.register('slack', () => import('./providers/apps/slack'))
    this.register('outlook-mail', () => import('./providers/apps/outlook-mail'))
    this.register('dropbox', () => import('./providers/apps/dropbox'))
    this.register('figma', () => import('./providers/apps/figma'))
  }

  /**
   * Reset the registry (clear both loaders and instances)
   * Primarily useful for testing
   */
  static async reset(): Promise<void> {
    await this.clearCache()
    this.loaders.clear()
  }
}
