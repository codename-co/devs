/**
 * Marketplace Store
 *
 * Manages marketplace extensions including discovery, installation,
 * and configuration. Uses Zustand for state management with
 * IndexedDB persistence for installed extensions.
 *
 * Extensions are loaded lazily:
 * - Manifest (registry) is fetched from /extensions/manifest.json
 * - Full extension details are fetched on-demand from /extensions/<id>.extension.json
 */

import { create } from 'zustand'
import {
  installedExtensions,
  customExtensions as customExtensionsMap,
} from '@/lib/yjs/maps'
import { whenReady } from '@/lib/yjs'
import { errorToast, successToast } from '@/lib/toast'
import type {
  MarketplaceExtension,
  InstalledExtension,
  ExtensionType,
  ManifestExtension,
  ExtensionsManifest,
  CustomExtension,
} from './types'
import { deleteCustomExtension as deleteCustomExtensionFromDb } from './extension-generator'
import { isNewerVersion } from './utils'

// =============================================================================
// CONSTANTS
// =============================================================================

const MANIFEST_URL = '/extensions/manifest.json'
const EXTENSION_BASE_URL = '/extensions'

/**
 * Get the URL for a full extension definition
 */
function getExtensionUrl(id: string): string {
  return `${EXTENSION_BASE_URL}/${id}.extension.json`
}

// =============================================================================
// EXTENSION LOADING UTILITIES
// =============================================================================

/**
 * Cache for loaded full extension details
 */
const extensionCache = new Map<string, MarketplaceExtension>()

/**
 * Convert manifest extension to a partial MarketplaceExtension
 * Used for display before full details are loaded
 */
function manifestToPartialExtension(
  manifest: ManifestExtension,
): MarketplaceExtension {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    type: manifest.type,
    license: manifest.license,
    description: manifest.description,
    icon: manifest.icon,
    color: manifest.color,
    featured: manifest.featured,
    i18n: manifest.i18n,
  }
}

/**
 * Fetch the extensions manifest from the registry
 * Uses cache: 'no-cache' to ensure we always validate with the server
 * while still leveraging conditional requests (ETags, Last-Modified)
 */
async function fetchManifest(): Promise<ManifestExtension[]> {
  const response = await fetch(MANIFEST_URL, {
    cache: 'no-cache',
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.statusText}`)
  }
  const data: ExtensionsManifest = await response.json()
  return data.extensions
}

/**
 * Fetch full extension details from its definition file
 */
async function fetchExtensionDetails(
  id: string,
): Promise<MarketplaceExtension | null> {
  // Check cache first
  if (extensionCache.has(id)) {
    return extensionCache.get(id)!
  }

  try {
    const response = await fetch(getExtensionUrl(id))
    if (!response.ok) {
      console.warn(`Failed to fetch extension ${id}: ${response.statusText}`)
      return null
    }
    const data = await response.json()

    // Handle both flat format and nested metadata format
    const extension: MarketplaceExtension = data.metadata
      ? {
          ...data.metadata,
          // Merge top-level properties
          ...data,
          // Ensure metadata properties take precedence
          id: data.metadata.id,
          name: data.metadata.name,
          version: data.metadata.version,
          type: data.metadata.type,
        }
      : data

    // Cache the result
    extensionCache.set(id, extension)
    return extension
  } catch (error) {
    console.warn(`Error loading extension ${id}:`, error)
    return null
  }
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface MarketplaceStore {
  // State
  extensions: MarketplaceExtension[]
  customExtensions: CustomExtension[]
  installed: Map<string, InstalledExtension>
  isLoading: boolean
  isLoadingInstalled: boolean
  isLoadingCustom: boolean
  error: string | null
  searchQuery: string
  typeFilter: ExtensionType | null
  featuredOnly: boolean

  // Actions
  loadExtensions: () => Promise<void>
  loadInstalledExtensions: () => Promise<void>
  loadCustomExtensions: () => Promise<void>
  searchExtensions: (query: string) => void
  filterByType: (type: ExtensionType | null) => void
  filterByFeatured: (featured: boolean) => void
  clearFilters: () => void

  // Extension management
  installExtension: (extensionId: string) => Promise<void>
  uninstallExtension: (extensionId: string) => Promise<void>
  updateExtension: (extensionId: string) => Promise<void>
  enableExtension: (extensionId: string) => Promise<void>
  disableExtension: (extensionId: string) => Promise<void>
  deleteCustomExtension: (extensionId: string) => Promise<void>
  updateExtensionConfig: (
    extensionId: string,
    config: Record<string, unknown>,
  ) => Promise<void>
  loadExtensionById: (
    extensionId: string,
  ) => Promise<MarketplaceExtension | null>
  // Fetch fresh extension details from registry (for marketplace display)
  fetchExtensionFromRegistry: (
    extensionId: string,
  ) => Promise<MarketplaceExtension | null>

  // Getters
  getExtensionById: (id: string) => MarketplaceExtension | undefined
  getMarketplaceVersion: (extensionId: string) => string | undefined
  hasUpdate: (extensionId: string) => boolean
  getInstalledExtension: (id: string) => InstalledExtension | undefined
  getInstalledApps: () => InstalledExtension[]
  isInstalled: (extensionId: string) => boolean
  getFilteredExtensions: () => MarketplaceExtension[]
  getFeaturedExtensions: () => MarketplaceExtension[]
  getExtensionsByType: (type: ExtensionType) => MarketplaceExtension[]
  getAppPrimaryPageUrl: (extensionId: string) => string | null
  getPageCode: (pageKey: string) => string | null
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  // Initial state
  extensions: [],
  customExtensions: [],
  installed: new Map(),
  isLoading: false,
  isLoadingInstalled: true, // Start as true since we haven't loaded yet
  isLoadingCustom: false,
  error: null,
  searchQuery: '',
  typeFilter: null,
  featuredOnly: false,

  // Load all available extensions from the registry manifest
  loadExtensions: async () => {
    set({ isLoading: true, error: null })
    try {
      // Fetch the manifest to get the list of available extensions
      const manifestExtensions = await fetchManifest()

      // Convert manifest entries to partial MarketplaceExtension objects
      const extensions = manifestExtensions.map(manifestToPartialExtension)

      set({ extensions, isLoading: false })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load extensions'
      set({ error: message, isLoading: false })
      errorToast('Failed to load marketplace', message)
    }
  },

  // Load custom (AI-generated) extensions from Yjs
  loadCustomExtensions: async () => {
    set({ isLoadingCustom: true })
    try {
      await whenReady
      const customExtensions = Array.from(customExtensionsMap.values())
      set({ customExtensions, isLoadingCustom: false })
    } catch (error) {
      set({ isLoadingCustom: false })
      console.error('Failed to load custom extensions:', error)
    }
  },

  // Load installed extensions from Yjs
  loadInstalledExtensions: async () => {
    set({ isLoadingInstalled: true })
    try {
      await whenReady
      const extensions = Array.from(installedExtensions.values())
      const installedMap = new Map<string, InstalledExtension>()
      for (const ext of extensions) {
        installedMap.set(ext.id, ext)
      }
      set({ installed: installedMap, isLoadingInstalled: false })
    } catch (error) {
      set({ isLoadingInstalled: false })
      errorToast('Failed to load installed extensions', error)
    }
  },

  // Search extensions by query
  searchExtensions: (query: string) => {
    set({ searchQuery: query.toLowerCase() })
  },

  // Filter by type
  filterByType: (type: ExtensionType | null) => {
    set({ typeFilter: type })
  },

  // Filter by featured
  filterByFeatured: (featured: boolean) => {
    set({ featuredOnly: featured })
  },

  // Clear all filters
  clearFilters: () => {
    set({ searchQuery: '', typeFilter: null, featuredOnly: false })
  },

  // Install an extension
  installExtension: async (extensionId: string) => {
    const { installed, customExtensions } = get()

    if (installed.has(extensionId)) {
      errorToast('Already installed', 'This extension is already installed')
      return
    }

    try {
      // First check if it's a custom extension
      const customExt = customExtensions.find((c) => c.id === extensionId)
      let extension: MarketplaceExtension | null = null

      if (customExt) {
        // Convert custom extension to MarketplaceExtension format
        extension = {
          id: customExt.id,
          name: customExt.name,
          version: customExt.version,
          type: customExt.type,
          license: customExt.license,
          icon: customExt.icon,
          color: customExt.color,
          description: customExt.description,
          author: customExt.author,
          featured: customExt.featured,
          source: customExt.source,
          i18n: customExt.i18n,
          pages: customExt.pages,
          configuration: customExt.configuration,
          isCustom: true,
        }
      } else {
        // Fetch full extension details from marketplace
        extension = await fetchExtensionDetails(extensionId)
      }

      if (!extension) {
        errorToast(
          'Extension not found',
          `Could not load extension: ${extensionId}`,
        )
        return
      }

      const installedExtension: InstalledExtension = {
        id: extensionId,
        extension,
        status: 'installed',
        enabled: true,
        userConfig: extension.configuration?.defaults,
        installedAt: new Date(),
      }

      const newInstalled = new Map(installed)
      newInstalled.set(extensionId, installedExtension)
      set({ installed: newInstalled })

      // Persist to Yjs
      installedExtensions.set(extensionId, installedExtension)

      successToast(
        'Extension installed',
        `${extension.name} has been installed`,
      )
    } catch (error) {
      errorToast('Installation failed', error)
    }
  },

  // Uninstall an extension
  uninstallExtension: async (extensionId: string) => {
    const { installed } = get()
    const installedExt = installed.get(extensionId)

    if (!installedExt) {
      errorToast('Not installed', 'This extension is not installed')
      return
    }

    try {
      const newInstalled = new Map(installed)
      newInstalled.delete(extensionId)
      set({ installed: newInstalled })

      // Remove from Yjs
      installedExtensions.delete(extensionId)

      successToast(
        'Extension uninstalled',
        `${installedExt.extension.name} has been uninstalled`,
      )
    } catch (error) {
      errorToast('Uninstall failed', error)
    }
  },

  // Update an installed extension to the latest marketplace version
  updateExtension: async (extensionId: string) => {
    const { installed, extensions } = get()
    const installedExt = installed.get(extensionId)

    if (!installedExt) {
      errorToast('Not installed', 'This extension is not installed')
      return
    }

    // Don't allow updating custom extensions via marketplace
    if (installedExt.extension.isCustom) {
      errorToast(
        'Cannot update',
        'Custom extensions cannot be updated from the marketplace',
      )
      return
    }

    try {
      // Clear cache to force fresh fetch
      extensionCache.delete(extensionId)

      // Fetch the latest version from the marketplace
      const latestExtension = await fetchExtensionDetails(extensionId)

      if (!latestExtension) {
        errorToast(
          'Update failed',
          `Could not fetch latest version of extension: ${extensionId}`,
        )
        return
      }

      // Check if we actually have a newer version
      const marketplaceExt = extensions.find((e) => e.id === extensionId)
      const marketplaceVersion =
        marketplaceExt?.version || latestExtension.version

      if (!isNewerVersion(installedExt.extension.version, marketplaceVersion)) {
        errorToast('Already up to date', 'You already have the latest version')
        return
      }

      // Update the installed extension with the new version
      const updatedInstalled: InstalledExtension = {
        ...installedExt,
        extension: latestExtension,
        // Keep user config
        userConfig: installedExt.userConfig,
      }

      const newInstalled = new Map(installed)
      newInstalled.set(extensionId, updatedInstalled)
      set({ installed: newInstalled })

      // Persist to Yjs
      installedExtensions.set(extensionId, updatedInstalled)

      successToast(
        'Extension updated',
        `${latestExtension.name} has been updated to v${latestExtension.version}`,
      )
    } catch (error) {
      errorToast('Update failed', error)
    }
  },

  // Enable an extension
  enableExtension: async (extensionId: string) => {
    const { installed } = get()
    const installedExt = installed.get(extensionId)

    if (!installedExt) {
      errorToast('Not installed', 'This extension is not installed')
      return
    }

    const updated = { ...installedExt, enabled: true }
    const newInstalled = new Map(installed)
    newInstalled.set(extensionId, updated)
    set({ installed: newInstalled })

    installedExtensions.set(extensionId, updated)
  },

  // Disable an extension
  disableExtension: async (extensionId: string) => {
    const { installed } = get()
    const installedExt = installed.get(extensionId)

    if (!installedExt) {
      errorToast('Not installed', 'This extension is not installed')
      return
    }

    const updated = { ...installedExt, enabled: false }
    const newInstalled = new Map(installed)
    newInstalled.set(extensionId, updated)
    set({ installed: newInstalled })

    installedExtensions.set(extensionId, updated)
  },

  // Delete a custom extension
  deleteCustomExtension: async (extensionId: string) => {
    const { customExtensions, installed } = get()

    // Also uninstall if it was installed
    if (installed.has(extensionId)) {
      const newInstalled = new Map(installed)
      newInstalled.delete(extensionId)
      set({ installed: newInstalled })
      installedExtensions.delete(extensionId)
    }

    // Remove from custom extensions list
    const newCustomExtensions = customExtensions.filter(
      (ext) => ext.id !== extensionId,
    )
    set({ customExtensions: newCustomExtensions })

    // Delete from Yjs map
    await deleteCustomExtensionFromDb(extensionId)
  },

  // Update extension configuration
  updateExtensionConfig: async (
    extensionId: string,
    config: Record<string, unknown>,
  ) => {
    const { installed } = get()
    const installedExt = installed.get(extensionId)

    if (!installedExt) {
      errorToast('Not installed', 'This extension is not installed')
      return
    }

    const updated = {
      ...installedExt,
      userConfig: { ...installedExt.userConfig, ...config },
    }
    const newInstalled = new Map(installed)
    newInstalled.set(extensionId, updated)
    set({ installed: newInstalled })

    installedExtensions.set(extensionId, updated)
  },

  // Load full extension details by ID
  // Priority order:
  // 1. Installed extension (already contains full data)
  // 2. Custom extension from Yjs
  // 3. Fetch from marketplace (only for non-installed extensions)
  loadExtensionById: async (extensionId: string) => {
    const { installed } = get()

    // Check installed extensions first - these already have the full persisted data
    const installedExt = installed.get(extensionId)
    if (installedExt) {
      return installedExt.extension
    }

    // Check custom extensions from Yjs
    const customExt = customExtensionsMap.get(extensionId)
    if (customExt) {
      // Convert to MarketplaceExtension format
      return {
        id: customExt.id,
        name: customExt.name,
        version: customExt.version,
        type: customExt.type,
        license: customExt.license,
        icon: customExt.icon,
        color: customExt.color,
        description: customExt.description,
        author: customExt.author,
        featured: customExt.featured,
        source: customExt.source,
        i18n: customExt.i18n,
        pages: customExt.pages,
        configuration: customExt.configuration,
        isCustom: true,
      } as MarketplaceExtension
    }

    // Fetch from marketplace only for non-installed, non-custom extensions
    return fetchExtensionDetails(extensionId)
  },

  // Fetch fresh extension details from the registry (for marketplace display)
  // This always fetches from the network, ignoring installed versions
  // Used for displaying up-to-date metadata in the marketplace UI
  fetchExtensionFromRegistry: async (extensionId: string) => {
    // Check custom extensions first - these are user-created, not in registry
    const customExt = customExtensionsMap.get(extensionId)
    if (customExt) {
      // Convert to MarketplaceExtension format
      return {
        id: customExt.id,
        name: customExt.name,
        version: customExt.version,
        type: customExt.type,
        license: customExt.license,
        icon: customExt.icon,
        color: customExt.color,
        description: customExt.description,
        author: customExt.author,
        featured: customExt.featured,
        source: customExt.source,
        i18n: customExt.i18n,
        pages: customExt.pages,
        configuration: customExt.configuration,
        isCustom: true,
      } as MarketplaceExtension
    }

    // Fetch from marketplace registry
    return fetchExtensionDetails(extensionId)
  },

  // Get extension by ID (including custom extensions)
  getExtensionById: (id: string) => {
    const { extensions, customExtensions } = get()

    // Check marketplace extensions first
    const marketplaceExt = extensions.find((e) => e.id === id)
    if (marketplaceExt) return marketplaceExt

    // Check custom extensions
    const customExt = customExtensions.find((c) => c.id === id)
    if (customExt) {
      // Convert to MarketplaceExtension format
      return {
        id: customExt.id,
        name: customExt.name,
        version: customExt.version,
        type: customExt.type,
        license: customExt.license,
        icon: customExt.icon,
        color: customExt.color,
        description: customExt.description,
        author: customExt.author,
        featured: customExt.featured,
        source: customExt.source,
        i18n: customExt.i18n,
        pages: customExt.pages,
        configuration: customExt.configuration,
        isCustom: true,
      } as MarketplaceExtension
    }

    return undefined
  },

  // Get installed extension by ID
  getInstalledExtension: (id: string) => {
    return get().installed.get(id)
  },

  // Get the marketplace version for an extension (from the registry)
  getMarketplaceVersion: (extensionId: string) => {
    const { extensions } = get()
    const marketplaceExt = extensions.find((e) => e.id === extensionId)
    return marketplaceExt?.version
  },

  // Check if an installed extension has an update available
  hasUpdate: (extensionId: string) => {
    const { extensions, installed } = get()
    const installedExt = installed.get(extensionId)

    // Not installed or is a custom extension - no marketplace updates
    if (!installedExt || installedExt.extension.isCustom) {
      return false
    }

    // Find the marketplace version
    const marketplaceExt = extensions.find((e) => e.id === extensionId)
    if (!marketplaceExt) {
      return false
    }

    // Compare versions
    return isNewerVersion(
      installedExt.extension.version,
      marketplaceExt.version,
    )
  },

  // Get all installed applications (extensions of type 'app')
  getInstalledApps: () => {
    const { installed } = get()
    return Array.from(installed.values()).filter(
      (ext) => ext.enabled && ext.extension.type === 'app',
    )
  },

  // Check if extension is installed
  isInstalled: (extensionId: string) => {
    return get().installed.has(extensionId)
  },

  // Get filtered extensions based on current filters
  getFilteredExtensions: () => {
    const {
      extensions,
      customExtensions,
      searchQuery,
      typeFilter,
      featuredOnly,
    } = get()

    // Convert custom extensions to MarketplaceExtension format
    const customAsMarketplace: MarketplaceExtension[] = customExtensions.map(
      (custom) => ({
        id: custom.id,
        name: custom.name,
        version: custom.version,
        type: custom.type,
        license: custom.license,
        icon: custom.icon,
        color: custom.color,
        description: custom.description,
        author: custom.author,
        featured: custom.featured,
        source: custom.source,
        i18n: custom.i18n,
        pages: custom.pages,
        configuration: custom.configuration,
        isCustom: true,
      }),
    )

    // Combine marketplace extensions with custom extensions
    const allExtensions = [...extensions, ...customAsMarketplace]

    return allExtensions.filter((ext) => {
      // Search filter
      if (searchQuery) {
        const searchFields = [
          ext.name,
          ext.description || '',
          ext.author?.name || '',
        ]
          .join(' ')
          .toLowerCase()

        if (!searchFields.includes(searchQuery)) {
          return false
        }
      }

      // Featured filter
      if (featuredOnly && !ext.featured) {
        return false
      }

      // Type filter
      if (typeFilter && ext.type !== typeFilter) {
        return false
      }

      return true
    })
  },

  // Get featured extensions
  getFeaturedExtensions: () => {
    return get().extensions.filter((ext) => ext.featured)
  },

  // Get extensions by type
  getExtensionsByType: (type: ExtensionType) => {
    return get().extensions.filter((ext) => ext.type === type)
  },

  // Get the primary page URL for an installed app extension
  getAppPrimaryPageUrl: (extensionId: string) => {
    const installed = get().installed.get(extensionId)
    if (!installed?.extension.pages) return null
    const firstPage = Object.keys(installed.extension.pages)[0]
    return firstPage ? `/${firstPage}` : null
  },

  /**
   * Get the code for a specific page from any installed app
   * Searches through all installed apps to find a matching page key
   */
  getPageCode: (pageKey: string): string | null => {
    const { installed } = get()
    for (const installedExt of installed.values()) {
      if (
        installedExt.enabled &&
        installedExt.extension.type === 'app' &&
        installedExt.extension.pages
      ) {
        const pageCode = installedExt.extension.pages[pageKey]
        if (pageCode) {
          return pageCode
        }
      }
    }
    return null
  },
}))

// =============================================================================
// STANDALONE FUNCTIONS (for use outside React components)
// =============================================================================

/**
 * Get all available extensions
 */
export function getExtensions(): MarketplaceExtension[] {
  return useMarketplaceStore.getState().extensions
}

/**
 * Get extension by ID
 */
export function getExtensionById(id: string): MarketplaceExtension | undefined {
  return useMarketplaceStore.getState().getExtensionById(id)
}

/**
 * Check if an extension is installed
 */
export function isExtensionInstalled(extensionId: string): boolean {
  return useMarketplaceStore.getState().isInstalled(extensionId)
}

/**
 * Get all installed applications
 */
export function getInstalledApps(): InstalledExtension[] {
  return useMarketplaceStore.getState().getInstalledApps()
}

/**
 * Load full extension details by ID
 * Fetches from /extensions/<id>.extension.json if not cached
 */
export async function loadExtensionDetails(
  id: string,
): Promise<MarketplaceExtension | null> {
  return fetchExtensionDetails(id)
}

/**
 * Clear the extension cache (useful for testing or force refresh)
 */
export function clearExtensionCache(): void {
  extensionCache.clear()
}

/**
 * Get the primary page URL for an app extension
 * Returns the URL path to the first page defined in the extension
 */
export function getAppPrimaryPageUrl(extensionId: string): string {
  return useMarketplaceStore.getState().getAppPrimaryPageUrl(extensionId) ?? ''
}

/**
 * Get the code for a specific page from any installed app
 * Searches through all installed apps to find a matching page key
 */
export function getPageCode(pageKey: string): string | null {
  return useMarketplaceStore.getState().getPageCode(pageKey)
}

/**
 * Check if an installed extension has an update available
 */
export function hasExtensionUpdate(extensionId: string): boolean {
  return useMarketplaceStore.getState().hasUpdate(extensionId)
}

/**
 * Get the marketplace version for an extension
 */
export function getMarketplaceVersion(extensionId: string): string | undefined {
  return useMarketplaceStore.getState().getMarketplaceVersion(extensionId)
}

// =============================================================================
// YJS OBSERVERS FOR REAL-TIME SYNC
// =============================================================================

let yjsObserversInitialized = false

/**
 * Initialize Yjs observers for marketplace data sync.
 * Called automatically when the module is imported.
 */
function initYjsObservers(): void {
  if (yjsObserversInitialized) return
  yjsObserversInitialized = true

  // Observe installed extensions changes from other devices
  installedExtensions.observe(() => {
    const extensions = Array.from(installedExtensions.values())
    const installedMap = new Map<string, InstalledExtension>()
    for (const ext of extensions) {
      installedMap.set(ext.id, ext)
    }
    useMarketplaceStore.setState({ installed: installedMap })
  })

  // Observe custom extensions changes from other devices
  customExtensionsMap.observe(() => {
    const customExtensions = Array.from(customExtensionsMap.values())
    useMarketplaceStore.setState({ customExtensions })
  })
}

// Initialize observers on module load
initYjsObservers()
