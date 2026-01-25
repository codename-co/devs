import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMarketplaceStore } from '@/features/marketplace/store'
import type {
  MarketplaceExtension,
  InstalledExtension,
} from '@/features/marketplace/types'

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    isInitialized: () => true,
    init: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock toast functions
vi.mock('@/lib/toast', () => ({
  errorToast: vi.fn(),
  successToast: vi.fn(),
}))

describe('MarketplaceStore - Extension Updates', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMarketplaceStore.setState({
      extensions: [],
      customExtensions: [],
      installed: new Map(),
      isLoading: false,
      isLoadingInstalled: false,
      isLoadingCustom: false,
      error: null,
      searchQuery: '',
      typeFilter: null,
      featuredOnly: false,
    })
  })

  describe('hasUpdate', () => {
    it('should return false when extension is not installed', () => {
      const store = useMarketplaceStore.getState()
      expect(store.hasUpdate('non-existent')).toBe(false)
    })

    it('should return false when extension is a custom extension', () => {
      const customExtension: MarketplaceExtension = {
        id: 'custom-ext',
        name: 'Custom Extension',
        version: '1.0.0',
        type: 'app',
        license: 'MIT',
        isCustom: true,
      }

      const installedExt: InstalledExtension = {
        id: 'custom-ext',
        extension: customExtension,
        status: 'installed',
        enabled: true,
        installedAt: new Date(),
      }

      useMarketplaceStore.setState({
        installed: new Map([['custom-ext', installedExt]]),
      })

      const store = useMarketplaceStore.getState()
      expect(store.hasUpdate('custom-ext')).toBe(false)
    })

    it('should return false when no marketplace version exists', () => {
      const extension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '1.0.0',
        type: 'app',
        license: 'MIT',
      }

      const installedExt: InstalledExtension = {
        id: 'test-ext',
        extension,
        status: 'installed',
        enabled: true,
        installedAt: new Date(),
      }

      useMarketplaceStore.setState({
        extensions: [], // No marketplace extensions
        installed: new Map([['test-ext', installedExt]]),
      })

      const store = useMarketplaceStore.getState()
      expect(store.hasUpdate('test-ext')).toBe(false)
    })

    it('should return false when installed version equals marketplace version', () => {
      const extension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '1.0.0',
        type: 'app',
        license: 'MIT',
      }

      const installedExt: InstalledExtension = {
        id: 'test-ext',
        extension: { ...extension },
        status: 'installed',
        enabled: true,
        installedAt: new Date(),
      }

      useMarketplaceStore.setState({
        extensions: [extension],
        installed: new Map([['test-ext', installedExt]]),
      })

      const store = useMarketplaceStore.getState()
      expect(store.hasUpdate('test-ext')).toBe(false)
    })

    it('should return true when marketplace version is newer', () => {
      const installedExtension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '1.0.0',
        type: 'app',
        license: 'MIT',
      }

      const marketplaceExtension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '1.1.0', // Newer version
        type: 'app',
        license: 'MIT',
      }

      const installedExt: InstalledExtension = {
        id: 'test-ext',
        extension: installedExtension,
        status: 'installed',
        enabled: true,
        installedAt: new Date(),
      }

      useMarketplaceStore.setState({
        extensions: [marketplaceExtension],
        installed: new Map([['test-ext', installedExt]]),
      })

      const store = useMarketplaceStore.getState()
      expect(store.hasUpdate('test-ext')).toBe(true)
    })

    it('should return false when installed version is newer than marketplace', () => {
      const installedExtension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '2.0.0', // Newer than marketplace
        type: 'app',
        license: 'MIT',
      }

      const marketplaceExtension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '1.0.0',
        type: 'app',
        license: 'MIT',
      }

      const installedExt: InstalledExtension = {
        id: 'test-ext',
        extension: installedExtension,
        status: 'installed',
        enabled: true,
        installedAt: new Date(),
      }

      useMarketplaceStore.setState({
        extensions: [marketplaceExtension],
        installed: new Map([['test-ext', installedExt]]),
      })

      const store = useMarketplaceStore.getState()
      expect(store.hasUpdate('test-ext')).toBe(false)
    })
  })

  describe('getMarketplaceVersion', () => {
    it('should return undefined when extension is not in marketplace', () => {
      const store = useMarketplaceStore.getState()
      expect(store.getMarketplaceVersion('non-existent')).toBeUndefined()
    })

    it('should return the marketplace version', () => {
      const extension: MarketplaceExtension = {
        id: 'test-ext',
        name: 'Test Extension',
        version: '2.5.0',
        type: 'app',
        license: 'MIT',
      }

      useMarketplaceStore.setState({
        extensions: [extension],
      })

      const store = useMarketplaceStore.getState()
      expect(store.getMarketplaceVersion('test-ext')).toBe('2.5.0')
    })
  })
})
