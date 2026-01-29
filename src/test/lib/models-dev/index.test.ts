import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeModel,
  clearCache,
  getCacheStatus,
  getAllModels,
  getModelsByProvider,
  getModel,
  getProviders,
  getModelsDevData,
  refreshCache,
} from '@/lib/models-dev'
import type {
  ModelsDevModel,
  ModelsDevProviderWithModels,
  NormalizedModel,
} from '@/lib/models-dev/types'

// =============================================================================
// Test Fixtures
// =============================================================================

const createValidModel = (
  overrides: Partial<ModelsDevModel> = {},
): ModelsDevModel => ({
  id: 'gpt-4o',
  name: 'GPT-4o',
  attachment: true,
  reasoning: false,
  tool_call: true,
  structured_output: true,
  open_weights: false,
  release_date: '2024-05-13',
  last_updated: '2024-11-20',
  modalities: { input: ['text', 'image'], output: ['text'] },
  cost: { input: 2.5, output: 10 },
  limit: { context: 128000, output: 16384 },
  ...overrides,
})

const createValidProvider = (
  overrides: Partial<ModelsDevProviderWithModels> = {},
  models: Record<string, ModelsDevModel> = {},
): ModelsDevProviderWithModels => ({
  id: 'openai',
  name: 'OpenAI',
  npm: '@ai-sdk/openai',
  env: ['OPENAI_API_KEY'],
  doc: 'https://platform.openai.com/docs',
  models:
    Object.keys(models).length > 0 ? models : { 'gpt-4o': createValidModel() },
  ...overrides,
})

// Mock IndexedDB
const mockIndexedDB = () => {
  let store: Record<string, unknown> = {}

  const mockIDBRequest = (result: unknown, error: unknown = null) => ({
    result,
    error,
    onerror: null as unknown as
      | ((this: IDBRequest, ev: Event) => unknown)
      | null,
    onsuccess: null as unknown as
      | ((this: IDBRequest, ev: Event) => unknown)
      | null,
  })

  const mockIDBObjectStore = () => ({
    get: vi.fn((key: string) => {
      const request = mockIDBRequest(store[key])
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess.call(request as IDBRequest, new Event('success'))
        }
      }, 0)
      return request
    }),
    put: vi.fn((value: unknown, key: string) => {
      store[key] = value
      const request = mockIDBRequest(undefined)
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess.call(request as IDBRequest, new Event('success'))
        }
      }, 0)
      return request
    }),
    delete: vi.fn((key: string) => {
      delete store[key]
      const request = mockIDBRequest(undefined)
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess.call(request as IDBRequest, new Event('success'))
        }
      }, 0)
      return request
    }),
  })

  const mockIDBTransaction = () => {
    const objectStore = mockIDBObjectStore()
    return {
      objectStore: vi.fn(() => objectStore),
      oncomplete: null as unknown as
        | ((this: IDBTransaction, ev: Event) => unknown)
        | null,
      onerror: null as unknown as
        | ((this: IDBTransaction, ev: Event) => unknown)
        | null,
    }
  }

  const mockIDBDatabase = () => {
    const transaction = mockIDBTransaction()
    return {
      transaction: vi.fn(() => {
        setTimeout(() => {
          if (transaction.oncomplete) {
            transaction.oncomplete.call(
              transaction as unknown as IDBTransaction,
              new Event('complete'),
            )
          }
        }, 10)
        return transaction
      }),
      close: vi.fn(),
      objectStoreNames: { contains: vi.fn(() => true) },
      createObjectStore: vi.fn(),
    }
  }

  const mockDB = mockIDBDatabase()

  const mockOpen = vi.fn(() => {
    const request = mockIDBRequest(mockDB) as unknown as IDBOpenDBRequest & {
      onupgradeneeded:
        | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
        | null
    }
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess.call(request, new Event('success'))
      }
    }, 0)
    return request
  })

  vi.stubGlobal('indexedDB', {
    open: mockOpen,
  })

  return {
    clearStore: () => {
      store = {}
    },
    setStore: (key: string, value: unknown) => {
      store[key] = value
    },
    getStore: () => store,
  }
}

// =============================================================================
// Tests: normalizeModel
// =============================================================================

describe('normalizeModel', () => {
  const model = createValidModel()
  const provider = createValidProvider()

  describe('basic normalization', () => {
    it('should create a composite id from provider and model', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.id).toBe('openai/gpt-4o')
    })

    it('should copy the model name', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.name).toBe('GPT-4o')
    })

    it('should extract provider id', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.providerId).toBe('openai')
    })

    it('should extract provider name', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.providerName).toBe('OpenAI')
    })

    it('should copy family if present', () => {
      const modelWithFamily = createValidModel({ family: 'gpt-4' })
      const normalized = normalizeModel(modelWithFamily, provider)
      expect(normalized.family).toBe('gpt-4')
    })

    it('should leave family undefined if not present', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.family).toBeUndefined()
    })
  })

  describe('pricing normalization', () => {
    it('should map cost.input to pricing.inputPerMillion', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.pricing.inputPerMillion).toBe(2.5)
    })

    it('should map cost.output to pricing.outputPerMillion', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.pricing.outputPerMillion).toBe(10)
    })

    it('should map cost.reasoning to pricing.reasoningPerMillion', () => {
      const modelWithReasoning = createValidModel({
        cost: { input: 2.5, output: 10, reasoning: 5 },
      })
      const normalized = normalizeModel(modelWithReasoning, provider)
      expect(normalized.pricing.reasoningPerMillion).toBe(5)
    })

    it('should map cost.cache_read to pricing.cacheReadPerMillion', () => {
      const modelWithCacheRead = createValidModel({
        cost: { input: 2.5, output: 10, cache_read: 0.5 },
      })
      const normalized = normalizeModel(modelWithCacheRead, provider)
      expect(normalized.pricing.cacheReadPerMillion).toBe(0.5)
    })

    it('should leave optional pricing fields undefined if not in source', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.pricing.reasoningPerMillion).toBeUndefined()
      expect(normalized.pricing.cacheReadPerMillion).toBeUndefined()
    })
  })

  describe('limits normalization', () => {
    it('should map limit.context to limits.contextWindow', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.limits.contextWindow).toBe(128000)
    })

    it('should map limit.output to limits.maxOutput', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.limits.maxOutput).toBe(16384)
    })

    it('should map limit.input to limits.maxInput if present', () => {
      const modelWithInput = createValidModel({
        limit: { context: 128000, input: 100000, output: 16384 },
      })
      const normalized = normalizeModel(modelWithInput, provider)
      expect(normalized.limits.maxInput).toBe(100000)
    })

    it('should leave maxInput undefined if not in source', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.limits.maxInput).toBeUndefined()
    })
  })

  describe('capabilities normalization', () => {
    it('should detect vision capability from modalities.input containing image', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.capabilities.vision).toBe(true)
    })

    it('should set vision to false when no image in input modalities', () => {
      const textOnlyModel = createValidModel({
        modalities: { input: ['text'], output: ['text'] },
      })
      const normalized = normalizeModel(textOnlyModel, provider)
      expect(normalized.capabilities.vision).toBe(false)
    })

    it('should map tool_call to capabilities.tools', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.capabilities.tools).toBe(true)
    })

    it('should map reasoning field to capabilities.reasoning', () => {
      const reasoningModel = createValidModel({ reasoning: true })
      const normalized = normalizeModel(reasoningModel, provider)
      expect(normalized.capabilities.reasoning).toBe(true)
    })

    it('should map structured_output to capabilities.structuredOutput', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.capabilities.structuredOutput).toBe(true)
    })

    it('should default structuredOutput to false when not defined', () => {
      const modelWithoutStructured = createValidModel()
      delete (modelWithoutStructured as Partial<ModelsDevModel>)
        .structured_output
      const normalized = normalizeModel(
        modelWithoutStructured as ModelsDevModel,
        provider,
      )
      expect(normalized.capabilities.structuredOutput).toBe(false)
    })

    it('should map attachment field to capabilities.attachments', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.capabilities.attachments).toBe(true)
    })

    it('should detect audio capability from input modalities', () => {
      const audioInputModel = createValidModel({
        modalities: { input: ['text', 'audio'], output: ['text'] },
      })
      const normalized = normalizeModel(audioInputModel, provider)
      expect(normalized.capabilities.audio).toBe(true)
    })

    it('should detect audio capability from output modalities', () => {
      const audioOutputModel = createValidModel({
        modalities: { input: ['text'], output: ['text', 'audio'] },
      })
      const normalized = normalizeModel(audioOutputModel, provider)
      expect(normalized.capabilities.audio).toBe(true)
    })

    it('should set audio to false when no audio in modalities', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.capabilities.audio).toBe(false)
    })
  })

  describe('modalities normalization', () => {
    it('should copy input modalities array', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.modalities.input).toEqual(['text', 'image'])
    })

    it('should copy output modalities array', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.modalities.output).toEqual(['text'])
    })

    it('should create new arrays (not reference original)', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.modalities.input).not.toBe(model.modalities.input)
      expect(normalized.modalities.output).not.toBe(model.modalities.output)
    })
  })

  describe('metadata normalization', () => {
    it('should map knowledge to metadata.knowledgeCutoff', () => {
      const modelWithKnowledge = createValidModel({ knowledge: '2024-01' })
      const normalized = normalizeModel(modelWithKnowledge, provider)
      expect(normalized.metadata.knowledgeCutoff).toBe('2024-01')
    })

    it('should map release_date to metadata.releaseDate', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.metadata.releaseDate).toBe('2024-05-13')
    })

    it('should map last_updated to metadata.lastUpdated', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.metadata.lastUpdated).toBe('2024-11-20')
    })

    it('should map open_weights to metadata.openWeights', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.metadata.openWeights).toBe(false)
    })

    it('should map status if present', () => {
      const betaModel = createValidModel({ status: 'beta' })
      const normalized = normalizeModel(betaModel, provider)
      expect(normalized.metadata.status).toBe('beta')
    })

    it('should leave status undefined if not present', () => {
      const normalized = normalizeModel(model, provider)
      expect(normalized.metadata.status).toBeUndefined()
    })
  })

  describe('different providers', () => {
    it('should handle Anthropic provider', () => {
      const anthropicProvider = createValidProvider({
        id: 'anthropic',
        name: 'Anthropic',
        npm: '@ai-sdk/anthropic',
        env: ['ANTHROPIC_API_KEY'],
        doc: 'https://docs.anthropic.com',
      })
      const claudeModel = createValidModel({
        id: 'claude-3-5-sonnet-latest',
        name: 'Claude 3.5 Sonnet',
        family: 'claude-3.5',
      })
      const normalized = normalizeModel(claudeModel, anthropicProvider)
      expect(normalized.id).toBe('anthropic/claude-3-5-sonnet-latest')
      expect(normalized.providerId).toBe('anthropic')
      expect(normalized.providerName).toBe('Anthropic')
    })

    it('should handle Google provider', () => {
      const googleProvider = createValidProvider({
        id: 'google',
        name: 'Google Generative AI',
        npm: '@ai-sdk/google',
        env: ['GOOGLE_GENERATIVE_AI_API_KEY'],
        doc: 'https://ai.google.dev/docs',
      })
      const geminiModel = createValidModel({
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        family: 'gemini-1.5',
      })
      const normalized = normalizeModel(geminiModel, googleProvider)
      expect(normalized.id).toBe('google/gemini-1.5-pro')
      expect(normalized.providerId).toBe('google')
      expect(normalized.providerName).toBe('Google Generative AI')
    })
  })
})

// =============================================================================
// Tests: Cache Functions
// =============================================================================

describe('cache functions', () => {
  let mockDB: ReturnType<typeof mockIndexedDB>

  beforeEach(() => {
    mockDB = mockIndexedDB()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockDB.clearStore()
    vi.unstubAllGlobals()
  })

  describe('getCacheStatus', () => {
    it('should return correct structure when no cache exists', async () => {
      const status = await getCacheStatus()

      expect(status).toHaveProperty('hasCachedData')
      expect(status).toHaveProperty('isValid')
      expect(status).toHaveProperty('ageMs')
      expect(status).toHaveProperty('fetchedAt')
    })

    it('should return hasCachedData=false when cache is empty', async () => {
      const status = await getCacheStatus()
      expect(status.hasCachedData).toBe(false)
      expect(status.isValid).toBe(false)
      expect(status.ageMs).toBeNull()
      expect(status.fetchedAt).toBeNull()
    })

    it('should return correct values when cache exists', async () => {
      const now = Date.now()
      mockDB.setStore('models-dev-api', {
        data: { openai: createValidProvider() },
        fetchedAt: now - 1000, // 1 second ago
      })

      const status = await getCacheStatus()
      expect(status.hasCachedData).toBe(true)
      expect(status.isValid).toBe(true)
      expect(status.ageMs).toBeGreaterThanOrEqual(1000)
      expect(status.fetchedAt).toBeInstanceOf(Date)
    })
  })

  describe('clearCache', () => {
    it('should not throw when cache is empty', async () => {
      await expect(clearCache()).resolves.not.toThrow()
    })

    it('should complete without error', async () => {
      mockDB.setStore('models-dev-api', {
        data: { openai: createValidProvider() },
        fetchedAt: Date.now(),
      })

      await expect(clearCache()).resolves.not.toThrow()
    })
  })
})

// =============================================================================
// Tests: Data Retrieval Functions with Mocked Fetch
// =============================================================================

describe('data retrieval functions', () => {
  let mockDB: ReturnType<typeof mockIndexedDB>
  const mockApiResponse = {
    openai: createValidProvider(
      {},
      {
        'gpt-4o': createValidModel(),
        'gpt-4o-mini': createValidModel({
          id: 'gpt-4o-mini',
          name: 'GPT-4o mini',
        }),
      },
    ),
    anthropic: createValidProvider(
      {
        id: 'anthropic',
        name: 'Anthropic',
        npm: '@ai-sdk/anthropic',
        env: ['ANTHROPIC_API_KEY'],
        doc: 'https://docs.anthropic.com',
      },
      {
        'claude-3-5-sonnet-latest': createValidModel({
          id: 'claude-3-5-sonnet-latest',
          name: 'Claude 3.5 Sonnet',
        }),
      },
    ),
  }

  beforeEach(() => {
    mockDB = mockIndexedDB()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockDB.clearStore()
    vi.unstubAllGlobals()
  })

  describe('getModelsDevData', () => {
    it('should return cached data when valid cache exists', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const data = await getModelsDevData()
      expect(data).toEqual(mockApiResponse)
    })

    it('should return null when no cache and fetch fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const data = await getModelsDevData()
      expect(data).toBeNull()
    })
  })

  describe('getAllModels', () => {
    it('should return empty array when no data available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const models = await getAllModels()
      expect(models).toEqual([])
    })

    it('should return all models from all providers when data exists', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const models = await getAllModels()
      expect(models.length).toBe(3)
      expect(models.map((m) => m.id)).toContain('openai/gpt-4o')
      expect(models.map((m) => m.id)).toContain('openai/gpt-4o-mini')
      expect(models.map((m) => m.id)).toContain(
        'anthropic/claude-3-5-sonnet-latest',
      )
    })

    it('should return normalized models', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const models = await getAllModels()
      const gpt4o = models.find((m) => m.id === 'openai/gpt-4o')

      expect(gpt4o).toBeDefined()
      expect(gpt4o?.name).toBe('GPT-4o')
      expect(gpt4o?.providerId).toBe('openai')
      expect(gpt4o?.providerName).toBe('OpenAI')
      expect(gpt4o?.pricing).toBeDefined()
      expect(gpt4o?.limits).toBeDefined()
      expect(gpt4o?.capabilities).toBeDefined()
    })
  })

  describe('getModelsByProvider', () => {
    it('should return empty array when no data available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const models = await getModelsByProvider('openai')
      expect(models).toEqual([])
    })

    it('should return empty array for unknown provider', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const models = await getModelsByProvider('unknown-provider')
      expect(models).toEqual([])
    })

    it('should return only models from specified provider', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const models = await getModelsByProvider('openai')
      expect(models.length).toBe(2)
      expect(models.every((m) => m.providerId === 'openai')).toBe(true)
    })
  })

  describe('getModel', () => {
    it('should return null when no data available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const model = await getModel('openai', 'gpt-4o')
      expect(model).toBeNull()
    })

    it('should return null for unknown provider', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const model = await getModel('unknown', 'gpt-4o')
      expect(model).toBeNull()
    })

    it('should return null for unknown model', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const model = await getModel('openai', 'unknown-model')
      expect(model).toBeNull()
    })

    it('should return the correct normalized model', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const model = await getModel('openai', 'gpt-4o')
      expect(model).not.toBeNull()
      expect(model?.id).toBe('openai/gpt-4o')
      expect(model?.name).toBe('GPT-4o')
    })
  })

  describe('getProviders', () => {
    it('should return empty array when no data available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const providers = await getProviders()
      expect(providers).toEqual([])
    })

    it('should return all providers with correct structure', async () => {
      mockDB.setStore('models-dev-api', {
        data: mockApiResponse,
        fetchedAt: Date.now(),
      })

      const providers = await getProviders()
      expect(providers.length).toBe(2)

      const openai = providers.find((p) => p.id === 'openai')
      expect(openai).toBeDefined()
      expect(openai?.name).toBe('OpenAI')
      expect(openai?.modelCount).toBe(2)
      expect(openai?.npm).toBe('@ai-sdk/openai')
      expect(openai?.doc).toBe('https://platform.openai.com/docs')
    })
  })

  describe('refreshCache', () => {
    it('should return null when fetch fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const data = await refreshCache()
      expect(data).toBeNull()
    })

    it('should return null when response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )

      const data = await refreshCache()
      expect(data).toBeNull()
    })

    it('should return data when fetch succeeds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockApiResponse),
        }),
      )

      const data = await refreshCache()
      expect(data).toEqual(mockApiResponse)
    })
  })
})

// =============================================================================
// Tests: Error Handling
// =============================================================================

describe('error handling', () => {
  let mockDB: ReturnType<typeof mockIndexedDB>

  beforeEach(() => {
    mockDB = mockIndexedDB()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockDB.clearStore()
    vi.unstubAllGlobals()
  })

  describe('network failures', () => {
    it('getAllModels should return empty array on network failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const models = await getAllModels()
      expect(models).toEqual([])
    })

    it('getModelsByProvider should return empty array on network failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const models = await getModelsByProvider('openai')
      expect(models).toEqual([])
    })

    it('getModel should return null on network failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const model = await getModel('openai', 'gpt-4o')
      expect(model).toBeNull()
    })

    it('getProviders should return empty array on network failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      const providers = await getProviders()
      expect(providers).toEqual([])
    })

    it('getCacheStatus should not throw on errors', async () => {
      await expect(getCacheStatus()).resolves.not.toThrow()
    })
  })

  describe('graceful degradation', () => {
    it('should not throw exceptions on any API call with no data', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      )

      await expect(getModelsDevData()).resolves.not.toThrow()
      await expect(getAllModels()).resolves.not.toThrow()
      await expect(getModelsByProvider('openai')).resolves.not.toThrow()
      await expect(getModel('openai', 'gpt-4o')).resolves.not.toThrow()
      await expect(getProviders()).resolves.not.toThrow()
      await expect(refreshCache()).resolves.not.toThrow()
      await expect(clearCache()).resolves.not.toThrow()
      await expect(getCacheStatus()).resolves.not.toThrow()
    })
  })
})

// =============================================================================
// Tests: Type Checking (Compile-time verification)
// =============================================================================

describe('type safety', () => {
  it('normalizeModel should return a properly typed NormalizedModel', () => {
    const model = createValidModel()
    const provider = createValidProvider()
    const normalized: NormalizedModel = normalizeModel(model, provider)

    // These assertions verify the type structure at runtime
    expect(typeof normalized.id).toBe('string')
    expect(typeof normalized.name).toBe('string')
    expect(typeof normalized.providerId).toBe('string')
    expect(typeof normalized.providerName).toBe('string')
    expect(typeof normalized.pricing.inputPerMillion).toBe('number')
    expect(typeof normalized.pricing.outputPerMillion).toBe('number')
    expect(typeof normalized.limits.contextWindow).toBe('number')
    expect(typeof normalized.limits.maxOutput).toBe('number')
    expect(typeof normalized.capabilities.vision).toBe('boolean')
    expect(typeof normalized.capabilities.tools).toBe('boolean')
    expect(typeof normalized.capabilities.reasoning).toBe('boolean')
    expect(Array.isArray(normalized.modalities.input)).toBe(true)
    expect(Array.isArray(normalized.modalities.output)).toBe(true)
    expect(typeof normalized.metadata.releaseDate).toBe('string')
    expect(typeof normalized.metadata.lastUpdated).toBe('string')
    expect(typeof normalized.metadata.openWeights).toBe('boolean')
  })
})
