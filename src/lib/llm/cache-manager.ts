/**
 * Cache Manager for Local LLM Models
 * Manages Cache API used by transformers.js for downloaded model files
 */

export interface CacheInfo {
  size: number
  itemCount: number
  items: CacheItemInfo[]
}

export interface CacheItemInfo {
  url: string
  size: number
  cachedAt: Date
  expiresAt: Date
}

/**
 * Get information about cached model files from both Cache API and IndexedDB
 */
export async function getCacheInfo(): Promise<CacheInfo | null> {
  let totalSize = 0
  let totalItems = 0
  const items: CacheItemInfo[] = []

  // Check Cache API - transformers.js uses 'transformers-cache'
  if ('caches' in self) {
    try {
      const cache = await caches.open('transformers-cache')
      const requests = await cache.keys()

      console.log(
        `[CACHE-MANAGER] transformers-cache has ${requests.length} items`,
      )

      for (const request of requests) {
        const response = await cache.match(request)
        if (response) {
          const blob = await response.blob()
          const size = blob.size

          totalSize += size
          totalItems++

          items.push({
            url: request.url,
            size,
            cachedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          })
        }
      }
    } catch (error) {
      console.log('[CACHE-MANAGER] transformers-cache not found:', error)
    }
  }

  return totalItems === 0
    ? null
    : {
        size: totalSize,
        itemCount: totalItems,
        items,
      }
}

/**
 * Clear all cached model files from Cache API
 */
export async function clearModelCache(): Promise<boolean> {
  if (!('caches' in self)) {
    return false
  }

  try {
    const deleted = await caches.delete('transformers-cache')
    console.log(
      `[CACHE-MANAGER] ${deleted ? 'Successfully deleted' : 'Failed to delete'} transformers-cache`,
    )
    return deleted
  } catch (error) {
    console.error('[CACHE-MANAGER] Failed to clear cache:', error)
    return false
  }
}

/**
 * Delete specific cached items by URL pattern (not supported with IndexedDB approach)
 */
export async function deleteCachedItems(_urlPattern: string): Promise<number> {
  console.warn(
    '[CACHE-MANAGER] Selective deletion not supported - use clearModelCache() instead',
  )
  return 0
}

/**
 * Clean up expired cache entries (transformers.js handles this automatically)
 */
export async function cleanupExpiredCache(): Promise<number> {
  console.log(
    '[CACHE-MANAGER] Transformers.js manages cache expiry automatically',
  )
  return 0
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
