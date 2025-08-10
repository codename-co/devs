// Service Worker for LLM API proxy and caching
const CACHE_NAME = 'devs-ai-v1'
const API_CACHE_NAME = 'devs-api-cache-v1'

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Message handler for LLM API calls
self.addEventListener('message', async (event) => {
  if (event.data.type === 'LLM_REQUEST') {
    const { requestId, provider, endpoint, options } = event.data

    try {
      const response = await fetch(endpoint, options)
      const data = await response.json()

      // Send response back to client
      event.ports[0].postMessage({
        type: 'LLM_RESPONSE',
        requestId,
        success: true,
        data,
        status: response.status,
      })
    } catch (error) {
      event.ports[0].postMessage({
        type: 'LLM_RESPONSE',
        requestId,
        success: false,
        error: error.message,
      })
    }
  }
})

// Fetch event - handle API caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only intercept LLM API calls
  const llmHosts = [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'api.mistral.ai',
  ]

  if (llmHosts.some((host) => url.hostname.includes(host))) {
    // For LLM APIs, always use network-first strategy
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache error responses
          if (!response.ok) {
            return response
          }

          // Only cache GET requests (Cache API doesn't support other methods)
          if (event.request.method === 'GET') {
            const responseToCache = response.clone()
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }

          return response
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request)
        }),
    )
    return
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    }),
  )
})
