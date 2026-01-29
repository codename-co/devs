/**
 * Service layer for models.dev API integration.
 * Provides cached access to AI model specifications with offline-first approach.
 * @see https://models.dev
 */

import type {
  ModelsDevAPIResponse,
  ModelsDevProviderWithModels,
  ModelsDevModel,
  NormalizedModel,
} from './types'
import { isModelsDevModel } from './types'

// =============================================================================
// Constants
// =============================================================================

const API_URL = 'https://models.dev/api.json'
const DB_NAME = 'devs-models-dev'
const STORE_NAME = 'cache'
const CACHE_KEY = 'models-dev-api'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// =============================================================================
// Types
// =============================================================================

/**
 * Cache entry structure stored in IndexedDB.
 */
interface CacheEntry {
  /** The cached API response */
  data: ModelsDevAPIResponse
  /** Timestamp when the data was fetched */
  fetchedAt: number
}

/**
 * Provider summary for listing available providers.
 */
export interface ProviderSummary {
  /** Unique provider identifier */
  id: string
  /** Human-readable provider name */
  name: string
  /** Number of models available */
  modelCount: number
  /** AI SDK package name */
  npm: string
  /** Documentation URL */
  doc: string
}

// =============================================================================
// IndexedDB Cache Helpers
// =============================================================================

/**
 * Opens the IndexedDB database for caching.
 * Creates the object store if it doesn't exist.
 */
function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => {
      console.error(
        '[models-dev] Failed to open cache database:',
        request.error,
      )
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Gets a cached entry from IndexedDB.
 */
async function getCachedEntry(): Promise<CacheEntry | null> {
  try {
    const db = await openCacheDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(CACHE_KEY)

      request.onerror = () => {
        console.error('[models-dev] Failed to read cache:', request.error)
        resolve(null)
      }

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[models-dev] Cache read error:', error)
    return null
  }
}

/**
 * Stores a cache entry in IndexedDB.
 */
async function setCachedEntry(entry: CacheEntry): Promise<void> {
  try {
    const db = await openCacheDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(entry, CACHE_KEY)

      request.onerror = () => {
        console.error('[models-dev] Failed to write cache:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[models-dev] Cache write error:', error)
  }
}

/**
 * Checks if a cache entry is still valid based on TTL.
 */
function isCacheValid(entry: CacheEntry): boolean {
  const now = Date.now()
  return now - entry.fetchedAt < CACHE_TTL_MS
}

// =============================================================================
// API Fetching
// =============================================================================

/**
 * Fetches fresh data from the models.dev API.
 */
async function fetchFromAPI(): Promise<ModelsDevAPIResponse | null> {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(
        '[models-dev] API request failed:',
        response.status,
        response.statusText,
      )
      return null
    }

    const data = await response.json()
    return data as ModelsDevAPIResponse
  } catch (error) {
    console.error('[models-dev] Failed to fetch from API:', error)
    return null
  }
}

// =============================================================================
// Normalization
// =============================================================================

/**
 * Normalizes a ModelsDevModel to the DEVS NormalizedModel format.
 * Provides a consistent, flattened structure for easier consumption.
 *
 * @param model - The raw model from models.dev
 * @param provider - The provider information
 * @returns Normalized model for DEVS internal use
 */
export function normalizeModel(
  model: ModelsDevModel,
  provider: ModelsDevProviderWithModels,
): NormalizedModel {
  // Determine capabilities from modalities
  const hasVision = model.modalities.input.includes('image')
  const hasAudio =
    model.modalities.input.includes('audio') ||
    model.modalities.output.includes('audio')

  return {
    id: `${provider.id}/${model.id}`,
    name: model.name,
    providerId: provider.id,
    providerName: provider.name,
    family: model.family,
    pricing: {
      inputPerMillion: model.cost.input,
      outputPerMillion: model.cost.output,
      reasoningPerMillion: model.cost.reasoning,
      cacheReadPerMillion: model.cost.cache_read,
    },
    limits: {
      contextWindow: model.limit.context,
      maxInput: model.limit.input,
      maxOutput: model.limit.output,
    },
    capabilities: {
      vision: hasVision,
      tools: model.tool_call,
      reasoning: model.reasoning,
      structuredOutput: model.structured_output ?? false,
      attachments: model.attachment,
      audio: hasAudio,
    },
    modalities: {
      input: [...model.modalities.input],
      output: [...model.modalities.output],
    },
    metadata: {
      knowledgeCutoff: model.knowledge,
      releaseDate: model.release_date,
      lastUpdated: model.last_updated,
      openWeights: model.open_weights,
      status: model.status,
    },
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetches the models.dev API data with caching.
 * Uses IndexedDB cache with 24-hour TTL.
 * Returns cached data if valid, otherwise fetches fresh data.
 *
 * @returns The full API response, or null if unavailable
 */
export async function getModelsDevData(): Promise<ModelsDevAPIResponse | null> {
  // Try to get cached data first
  const cachedEntry = await getCachedEntry()

  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data
  }

  // Cache is stale or missing, fetch fresh data
  const freshData = await fetchFromAPI()

  if (freshData) {
    // Store in cache
    await setCachedEntry({
      data: freshData,
      fetchedAt: Date.now(),
    })
    return freshData
  }

  // Network failed, return stale cache if available (better than nothing)
  if (cachedEntry) {
    console.warn('[models-dev] Using stale cache due to network failure')
    return cachedEntry.data
  }

  // No cache, no network - graceful degradation
  console.warn('[models-dev] No data available (network failed, no cache)')
  return null
}

/**
 * Gets all models from all providers as normalized models.
 *
 * @returns Array of normalized models, or empty array if data unavailable
 */
export async function getAllModels(): Promise<NormalizedModel[]> {
  const data = await getModelsDevData()
  if (!data) return []

  const models: NormalizedModel[] = []

  for (const provider of Object.values(data)) {
    for (const model of Object.values(provider.models)) {
      if (isModelsDevModel(model)) {
        models.push(normalizeModel(model, provider))
      }
    }
  }

  return models
}

/**
 * Gets all models for a specific provider as normalized models.
 *
 * @param providerId - The provider identifier (e.g., "openai", "anthropic")
 * @returns Array of normalized models for the provider, or empty array if not found
 */
export async function getModelsByProvider(
  providerId: string,
): Promise<NormalizedModel[]> {
  const data = await getModelsDevData()
  if (!data) return []

  const provider = data[providerId]
  if (!provider) {
    console.warn(`[models-dev] Provider not found: ${providerId}`)
    return []
  }

  const models: NormalizedModel[] = []

  for (const model of Object.values(provider.models)) {
    if (isModelsDevModel(model)) {
      models.push(normalizeModel(model, provider))
    }
  }

  return models
}

/**
 * Gets a single model by provider and model ID.
 *
 * @param providerId - The provider identifier (e.g., "openai")
 * @param modelId - The model identifier (e.g., "gpt-4o")
 * @returns The normalized model, or null if not found
 */
export async function getModel(
  providerId: string,
  modelId: string,
): Promise<NormalizedModel | null> {
  const data = await getModelsDevData()
  if (!data) return null

  const provider = data[providerId]
  if (!provider) {
    console.warn(`[models-dev] Provider not found: ${providerId}`)
    return null
  }

  const model = provider.models[modelId]
  if (!model || !isModelsDevModel(model)) {
    console.warn(`[models-dev] Model not found: ${providerId}/${modelId}`)
    return null
  }

  return normalizeModel(model, provider)
}

/**
 * Gets a list of all available providers with summary information.
 *
 * @returns Array of provider summaries, or empty array if data unavailable
 */
export async function getProviders(): Promise<ProviderSummary[]> {
  const data = await getModelsDevData()
  if (!data) return []

  return Object.values(data).map((provider) => ({
    id: provider.id,
    name: provider.name,
    modelCount: Object.keys(provider.models).length,
    npm: provider.npm,
    doc: provider.doc,
  }))
}

/**
 * Forces a cache refresh by fetching fresh data from the API.
 * Ignores any existing cached data and updates the cache with new data.
 *
 * @returns The fresh API response, or null if fetch failed
 */
export async function refreshCache(): Promise<ModelsDevAPIResponse | null> {
  const freshData = await fetchFromAPI()

  if (freshData) {
    await setCachedEntry({
      data: freshData,
      fetchedAt: Date.now(),
    })
    console.info('[models-dev] Cache refreshed successfully')
    return freshData
  }

  console.error('[models-dev] Failed to refresh cache')
  return null
}

/**
 * Clears the models.dev cache.
 * Useful for testing or when you need to force a fresh fetch.
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openCacheDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(CACHE_KEY)

      request.onerror = () => {
        console.error('[models-dev] Failed to clear cache:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.info('[models-dev] Cache cleared')
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[models-dev] Cache clear error:', error)
  }
}

/**
 * Gets cache status information for debugging.
 *
 * @returns Cache status object with validity and age information
 */
export async function getCacheStatus(): Promise<{
  hasCachedData: boolean
  isValid: boolean
  ageMs: number | null
  fetchedAt: Date | null
}> {
  const entry = await getCachedEntry()

  if (!entry) {
    return {
      hasCachedData: false,
      isValid: false,
      ageMs: null,
      fetchedAt: null,
    }
  }

  return {
    hasCachedData: true,
    isValid: isCacheValid(entry),
    ageMs: Date.now() - entry.fetchedAt,
    fetchedAt: new Date(entry.fetchedAt),
  }
}
