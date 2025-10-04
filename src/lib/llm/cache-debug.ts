/**
 * Cache debugging utilities to inspect browser storage
 */

export async function inspectAllCaches(): Promise<void> {
  console.log('=== CACHE INSPECTION START ===')

  // Check Cache API
  if ('caches' in self) {
    console.log('\n📦 Cache API:')
    try {
      const cacheNames = await caches.keys()
      console.log(`Found ${cacheNames.length} cache(s):`, cacheNames)

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        console.log(`\n  Cache: "${cacheName}"`)
        console.log(`  - Items: ${requests.length}`)

        if (requests.length > 0) {
          console.log('  - Sample URLs:')
          for (let i = 0; i < Math.min(3, requests.length); i++) {
            console.log(`    ${i + 1}. ${requests[i].url}`)
          }
        }
      }
    } catch (error) {
      console.error('Error inspecting Cache API:', error)
    }
  } else {
    console.log('❌ Cache API not available')
  }

  // Check IndexedDB
  if ('indexedDB' in window) {
    console.log('\n💾 IndexedDB:')
    try {
      const databases = await indexedDB.databases()
      console.log(`Found ${databases.length} database(s):`)

      for (const dbInfo of databases) {
        console.log(
          `\n  Database: "${dbInfo.name}" (version ${dbInfo.version})`,
        )

        // Try to open and inspect
        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbInfo.name!)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
            request.onupgradeneeded = () => {
              request.transaction?.abort()
              reject(new Error('Upgrade needed'))
            }
          })

          console.log(
            `  - Object Stores: ${Array.from(db.objectStoreNames).join(', ')}`,
          )

          // Count items in each store
          for (const storeName of Array.from(db.objectStoreNames)) {
            try {
              const tx = db.transaction(storeName, 'readonly')
              const store = tx.objectStore(storeName)
              const count = await new Promise<number>((resolve, reject) => {
                const request = store.count()
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
              })
              console.log(`    - ${storeName}: ${count} items`)
            } catch (error) {
              console.log(`    - ${storeName}: Error counting`)
            }
          }

          db.close()
        } catch (error) {
          console.log(`  - Could not inspect: ${error}`)
        }
      }
    } catch (error) {
      console.error('Error inspecting IndexedDB:', error)
    }
  } else {
    console.log('❌ IndexedDB not available')
  }

  // Check localStorage
  console.log('\n🗄️  LocalStorage:')
  const transformersKeys = Object.keys(localStorage).filter(
    (key) =>
      key.includes('transformers') ||
      key.includes('huggingface') ||
      key.includes('onnx'),
  )
  if (transformersKeys.length > 0) {
    console.log(`Found ${transformersKeys.length} transformers-related keys:`)
    transformersKeys.forEach((key) => {
      const value = localStorage.getItem(key)
      const size = value ? new Blob([value]).size : 0
      console.log(`  - ${key}: ${size} bytes`)
    })
  } else {
    console.log('No transformers-related keys found')
  }

  console.log('\n=== CACHE INSPECTION END ===')
}

/**
 * Monitor cache operations in real-time
 */
export function startCacheMonitoring(): void {
  console.log('🔍 Cache monitoring started')

  // Monitor Cache API operations
  if ('caches' in self) {
    const originalOpen = caches.open
    caches.open = async function (...args) {
      console.log('[CACHE-MONITOR] Opening cache:', args[0])
      return originalOpen.apply(this, args)
    }
  }

  // Monitor IndexedDB operations
  if ('indexedDB' in window) {
    const originalOpen = indexedDB.open
    indexedDB.open = function (...args) {
      console.log('[CACHE-MONITOR] Opening IndexedDB:', args[0])
      return originalOpen.apply(this, args)
    }
  }
}
