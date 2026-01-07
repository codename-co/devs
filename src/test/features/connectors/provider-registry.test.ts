import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ProviderRegistry,
  ProviderNotFoundError,
  ProviderLoadError,
} from '@/features/connectors/provider-registry'
import type {
  ConnectorProviderInterface,
  ProviderLoader,
} from '@/features/connectors/types'

// Mock provider for testing
const createMockProvider = (
  options: Partial<ConnectorProviderInterface> = {},
): ConnectorProviderInterface => ({
  id: 'google-drive' as const,
  config: {
    id: 'google-drive',
    category: 'app',
    name: 'Google Drive',
    icon: 'google-drive',
    color: '#4285F4',
    capabilities: ['read'],
    supportedTypes: ['*'],
    maxFileSize: 10 * 1024 * 1024,
  },
  list: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
  read: vi.fn().mockResolvedValue({ content: '', mimeType: 'text/plain' }),
  getChanges: vi
    .fn()
    .mockResolvedValue({
      added: [],
      modified: [],
      deleted: [],
      newCursor: '',
      hasMore: false,
    }),
  normalizeItem: vi.fn().mockReturnValue({}),
  ...options,
})

describe('ProviderRegistry', () => {
  beforeEach(async () => {
    await ProviderRegistry.reset()
  })

  describe('register', () => {
    it('should register a provider loader', () => {
      const loader: ProviderLoader = vi.fn().mockResolvedValue({
        default: createMockProvider(),
      })

      ProviderRegistry.register('google-drive', loader)

      expect(ProviderRegistry.has('google-drive')).toBe(true)
    })

    it('should allow registering multiple providers', () => {
      const loader1: ProviderLoader = vi.fn()
      const loader2: ProviderLoader = vi.fn()

      ProviderRegistry.register('google-drive', loader1)
      ProviderRegistry.register('notion', loader2)

      expect(ProviderRegistry.has('google-drive')).toBe(true)
      expect(ProviderRegistry.has('notion')).toBe(true)
    })

    it('should allow overwriting a registered provider', () => {
      const loader1: ProviderLoader = vi.fn()
      const loader2: ProviderLoader = vi.fn()

      ProviderRegistry.register('google-drive', loader1)
      ProviderRegistry.register('google-drive', loader2)

      expect(ProviderRegistry.has('google-drive')).toBe(true)
    })
  })

  describe('get', () => {
    it('should lazy load provider on first access', async () => {
      const mockProvider = createMockProvider()
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)

      // Loader should not be called yet
      expect(loader).not.toHaveBeenCalled()

      const provider = await ProviderRegistry.get('google-drive')

      // Loader should be called on first access
      expect(loader).toHaveBeenCalledTimes(1)
      expect(provider).toBe(mockProvider)
    })

    it('should return cached instance on subsequent calls', async () => {
      const mockProvider = createMockProvider()
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)

      const provider1 = await ProviderRegistry.get('google-drive')
      const provider2 = await ProviderRegistry.get('google-drive')

      // Loader should only be called once
      expect(loader).toHaveBeenCalledTimes(1)
      expect(provider1).toBe(provider2)
    })

    it('should throw ProviderNotFoundError for unregistered provider', async () => {
      await expect(
        ProviderRegistry.get('unregistered-provider' as any),
      ).rejects.toThrow(ProviderNotFoundError)
    })

    it('should throw ProviderNotFoundError with correct message', async () => {
      await expect(ProviderRegistry.get('notion')).rejects.toThrow(
        "Provider 'notion' is not registered",
      )
    })

    it('should call initialize if provider has it', async () => {
      const initializeFn = vi.fn().mockResolvedValue(undefined)
      const mockProvider = createMockProvider({ initialize: initializeFn })
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)
      await ProviderRegistry.get('google-drive')

      expect(initializeFn).toHaveBeenCalledTimes(1)
    })

    it('should throw ProviderLoadError when loader fails', async () => {
      const loader = vi.fn().mockRejectedValue(new Error('Network error'))

      ProviderRegistry.register('google-drive', loader)

      await expect(ProviderRegistry.get('google-drive')).rejects.toThrow(
        ProviderLoadError,
      )
    })

    it('should include original error message in ProviderLoadError', async () => {
      const loader = vi.fn().mockRejectedValue(new Error('Module not found'))

      ProviderRegistry.register('google-drive', loader)

      await expect(ProviderRegistry.get('google-drive')).rejects.toThrow(
        /Module not found/,
      )
    })

    it('should handle non-Error throws in loader', async () => {
      const loader = vi.fn().mockRejectedValue('string error')

      ProviderRegistry.register('google-drive', loader)

      await expect(ProviderRegistry.get('google-drive')).rejects.toThrow(
        ProviderLoadError,
      )
    })
  })

  describe('getAppProvider', () => {
    it('should return provider typed as AppConnectorProviderInterface', async () => {
      const mockProvider = createMockProvider()
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)

      const provider = await ProviderRegistry.getAppProvider('google-drive')

      expect(provider).toBe(mockProvider)
    })
  })

  describe('has', () => {
    it('should return true for registered providers', () => {
      const loader: ProviderLoader = vi.fn()
      ProviderRegistry.register('google-drive', loader)

      expect(ProviderRegistry.has('google-drive')).toBe(true)
    })

    it('should return false for unregistered providers', () => {
      expect(ProviderRegistry.has('google-drive')).toBe(false)
    })

    it('should return false after reset', async () => {
      const loader: ProviderLoader = vi.fn()
      ProviderRegistry.register('google-drive', loader)

      await ProviderRegistry.reset()

      expect(ProviderRegistry.has('google-drive')).toBe(false)
    })
  })

  describe('getRegistered', () => {
    it('should return empty array when no providers registered', () => {
      expect(ProviderRegistry.getRegistered()).toEqual([])
    })

    it('should return all registered provider identifiers', () => {
      ProviderRegistry.register('google-drive', vi.fn())
      ProviderRegistry.register('notion', vi.fn())
      ProviderRegistry.register('gmail', vi.fn())

      const registered = ProviderRegistry.getRegistered()

      expect(registered).toContain('google-drive')
      expect(registered).toContain('notion')
      expect(registered).toContain('gmail')
      expect(registered).toHaveLength(3)
    })
  })

  describe('getRegisteredAppProviders', () => {
    it('should return only app connector providers', () => {
      ProviderRegistry.register('google-drive', vi.fn())
      ProviderRegistry.register('notion', vi.fn())
      ProviderRegistry.register('custom-api', vi.fn())

      const appProviders = ProviderRegistry.getRegisteredAppProviders()

      expect(appProviders).toContain('google-drive')
      expect(appProviders).toContain('notion')
      expect(appProviders).not.toContain('custom-api')
    })

    it('should return empty array when no app providers registered', () => {
      ProviderRegistry.register('custom-api', vi.fn())

      const appProviders = ProviderRegistry.getRegisteredAppProviders()

      expect(appProviders).toEqual([])
    })
  })

  describe('clearCache', () => {
    it('should clear cached instances', async () => {
      const mockProvider = createMockProvider()
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)

      // Load the provider
      await ProviderRegistry.get('google-drive')
      expect(loader).toHaveBeenCalledTimes(1)

      // Clear cache
      await ProviderRegistry.clearCache()

      // Load again should call loader
      await ProviderRegistry.get('google-drive')
      expect(loader).toHaveBeenCalledTimes(2)
    })

    it('should call dispose on cached instances that support it', async () => {
      const disposeFn = vi.fn().mockResolvedValue(undefined)
      const mockProvider = createMockProvider({ dispose: disposeFn })
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)
      await ProviderRegistry.get('google-drive')

      await ProviderRegistry.clearCache()

      expect(disposeFn).toHaveBeenCalledTimes(1)
    })

    it('should not fail if dispose throws', async () => {
      const disposeFn = vi.fn().mockRejectedValue(new Error('Dispose error'))
      const mockProvider = createMockProvider({ dispose: disposeFn })
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)
      await ProviderRegistry.get('google-drive')

      // Should not throw
      await expect(ProviderRegistry.clearCache()).resolves.toBeUndefined()
    })
  })

  describe('reset', () => {
    it('should clear both loaders and instances', async () => {
      const mockProvider = createMockProvider()
      const loader = vi.fn().mockResolvedValue({ default: mockProvider })

      ProviderRegistry.register('google-drive', loader)
      await ProviderRegistry.get('google-drive')

      await ProviderRegistry.reset()

      expect(ProviderRegistry.has('google-drive')).toBe(false)
      expect(ProviderRegistry.getRegistered()).toEqual([])
    })
  })

  describe('initializeDefaults', () => {
    it('should register default app providers', () => {
      ProviderRegistry.initializeDefaults()

      expect(ProviderRegistry.has('google-drive')).toBe(true)
      expect(ProviderRegistry.has('gmail')).toBe(true)
      expect(ProviderRegistry.has('google-calendar')).toBe(true)
      expect(ProviderRegistry.has('notion')).toBe(true)
    })
  })

  describe('ProviderNotFoundError', () => {
    it('should have correct name', () => {
      const error = new ProviderNotFoundError('google-drive')
      expect(error.name).toBe('ProviderNotFoundError')
    })

    it('should have correct message', () => {
      const error = new ProviderNotFoundError('notion')
      expect(error.message).toBe("Provider 'notion' is not registered")
    })
  })

  describe('ProviderLoadError', () => {
    it('should have correct name', () => {
      const error = new ProviderLoadError('google-drive')
      expect(error.name).toBe('ProviderLoadError')
    })

    it('should include cause in message when provided', () => {
      const cause = new Error('Network failure')
      const error = new ProviderLoadError('google-drive', cause)
      expect(error.message).toContain('Network failure')
    })

    it('should have basic message without cause', () => {
      const error = new ProviderLoadError('notion')
      expect(error.message).toBe("Failed to load provider 'notion'")
    })

    it('should store cause as property', () => {
      const cause = new Error('Original error')
      const error = new ProviderLoadError('google-drive', cause)
      expect(error.cause).toBe(cause)
    })
  })
})
