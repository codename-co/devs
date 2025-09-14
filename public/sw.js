// Service Worker for LLM API proxy and caching
const CACHE_NAME = 'devs-ai-v1'
const API_CACHE_NAME = 'devs-api-cache-v1'

// LLM progress tracking
let activeRequests = new Map()
let requestStats = {
  totalRequests: 0,
  completedRequests: 0,
  responseTimes: [],
  averageResponseTime: 0,
}

// Langfuse configuration
let langfuseConfig = null
let langfuseInitialized = false

// Database helper functions for service worker
async function openDatabase() {
  return new Promise((resolve, reject) => {
    console.log('[SW-DB] 🗄️ Opening database: devs-ai-platform, version: 8')
    const request = indexedDB.open('devs-ai-platform', 8)

    request.onerror = () => {
      console.error('[SW-DB] ❌ Database open error:', request.error)
      reject(request.error)
    }
    request.onsuccess = () => {
      const db = request.result
      console.log('[SW-DB] ✅ Database opened successfully:', {
        name: db.name,
        version: db.version,
        objectStoreNames: Array.from(db.objectStoreNames),
      })
      resolve(db)
    }
    request.onupgradeneeded = (event) => {
      console.log(
        '[SW-DB] 🔄 Database upgrade needed from version',
        event.oldVersion,
        'to',
        event.newVersion,
      )
    }
  })
}

async function getLangfuseConfigFromDB() {
  try {
    const db = await openDatabase()

    // Check if langfuse_config store exists
    if (!db.objectStoreNames.contains('langfuse_config')) {
      console.warn('[SW-DB] ⚠️ langfuse_config object store does not exist')
      return null
    }

    return new Promise((resolve, reject) => {
      console.log('[SW-DB] 🔍 Starting transaction to read langfuse_config')
      const transaction = db.transaction(['langfuse_config'], 'readonly')
      const store = transaction.objectStore('langfuse_config')
      const request = store.getAll()

      request.onsuccess = () => {
        const configs = request.result
        console.log('[SW-DB] 📋 Retrieved configs from database:', {
          configCount: configs.length,
          configs: configs.map((c) => ({
            id: c.id,
            enabled: c.enabled,
            host: c.host,
            hasPublicKey: !!c.publicKey,
            hasSecretKey: !!c.encryptedSecretKey,
          })),
        })
        resolve(configs.length > 0 ? configs[0] : null)
      }
      request.onerror = () => {
        console.error('[SW-DB] ❌ Transaction error:', request.error)
        reject(request.error)
      }

      transaction.onerror = () => {
        console.error('[SW-DB] ❌ Transaction failed:', transaction.error)
        reject(transaction.error)
      }
    })
  } catch (error) {
    console.error(
      '[SW-DB] ❌ Failed to load Langfuse config from database:',
      error,
    )
    return null
  }
}

// Check if Langfuse should be enabled by loading config from database
async function initializeLangfuse() {
  console.log('[SW-LANGFUSE] 🔧 Initializing Langfuse...')

  if (langfuseInitialized) {
    console.log('[SW-LANGFUSE] ⚠️ Already initialized, skipping')
    return
  }

  try {
    console.log(
      '[SW-LANGFUSE] 🗄️ Loading Langfuse configuration from database...',
    )
    const config = await getLangfuseConfigFromDB()
    console.log('[SW-LANGFUSE] 📋 Database query result:', {
      hasConfig: !!config,
      enabled: config?.enabled,
      host: config?.host,
      hasPublicKey: !!config?.publicKey,
      hasSecretKey: !!config?.encryptedSecretKey,
    })

    if (!config || !config.enabled) {
      langfuseConfig = null
      langfuseInitialized = true
      console.log('[SW-LANGFUSE] ❌ Langfuse disabled or not configured')
      return
    }

    console.log(
      '[SW-LANGFUSE] ✅ Found valid Langfuse configuration, enabling tracking...',
    )
    langfuseConfig = config
    langfuseInitialized = true
    console.log(
      '[SW-LANGFUSE] 🎯 Langfuse tracking enabled for host:',
      config.host,
    )
  } catch (error) {
    console.error('[SW-LANGFUSE] ❌ Failed to load Langfuse config:', error)
    langfuseConfig = null
    langfuseInitialized = true
  }
}

// Send LLM request data to main thread for Langfuse tracking
async function trackLLMRequest(requestData, response, duration) {
  console.log('[SW-LANGFUSE] 📊 trackLLMRequest called:', {
    hasConfig: !!langfuseConfig,
    enabled: langfuseConfig?.enabled,
    provider: requestData.provider,
    endpoint: requestData.endpoint,
    duration: duration,
    success: response.success,
  })

  if (!langfuseConfig?.enabled) {
    console.log(
      '[SW-LANGFUSE] ⚠️ Langfuse tracking disabled or not configured, skipping',
    )
    return
  }

  console.log('[SW-LANGFUSE] ✅ Langfuse is enabled, proceeding with tracking')

  try {
    // Send tracking data to main thread
    const trackingData = {
      type: 'LANGFUSE_TRACK_REQUEST',
      data: {
        provider: requestData.provider,
        endpoint: requestData.endpoint,
        model: requestData.model,
        messages: requestData.messages,
        response: response.data,
        duration: duration,
        success: response.success,
        status: response.status || (response.success ? 200 : 500),
        usage: response.usage,
        timestamp: new Date(),
        error: response.error,
      },
      ctx: {
        conversationId: ctx.conversationId,
        taskId: langfuseConfig.currentTaskId || null,
        agentId: ctx.agentId,
      },
    }

    console.log(
      '[SW-LANGFUSE] 📤 Preparing to send tracking data to main thread:',
      trackingData,
    )

    // Broadcast to all clients so any active tab can handle the tracking
    const clients = await self.clients.matchAll()
    console.log(
      '[SW-LANGFUSE] 🔗 Found',
      clients.length,
      'clients to send tracking data to',
    )

    if (clients.length === 0) {
      console.warn(
        '[SW-LANGFUSE] ⚠️ No clients found to send tracking data to!',
      )
      return
    }

    clients.forEach((client, index) => {
      console.log(
        `[SW-LANGFUSE] 📨 Sending tracking data to client ${index + 1}`,
      )
      client.postMessage(trackingData)
    })

    console.log('[SW-LANGFUSE] ✅ Sent LLM tracking data to main thread')
  } catch (error) {
    console.error('[SW] Failed to send tracking data to main thread:', error)
  }
}

function updateAverageResponseTime(responseTime) {
  requestStats.responseTimes.push(responseTime)
  // Keep only the last 10 response times for rolling average
  if (requestStats.responseTimes.length > 10) {
    requestStats.responseTimes.shift()
  }
  requestStats.averageResponseTime = Math.round(
    requestStats.responseTimes.reduce((sum, time) => sum + time, 0) /
      requestStats.responseTimes.length,
  )
}

function broadcastProgressUpdate() {
  const stats = {
    activeRequests: activeRequests.size,
    totalRequests: requestStats.totalRequests,
    completedRequests: requestStats.completedRequests,
    averageResponseTime: requestStats.averageResponseTime,
  }

  console.log('[SW] Broadcasting LLM progress update:', stats)

  // Broadcast to all clients
  self.clients.matchAll().then((clients) => {
    console.log(`[SW] Broadcasting to ${clients.length} clients`)
    clients.forEach((client) => {
      client.postMessage({
        type: 'LLM_PROGRESS_UPDATE',
        stats,
      })
    })
  })
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Installing service worker...')
  event.waitUntil(self.skipWaiting())
})

// Activate event - clean up old caches and initialize Langfuse
self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker...')
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] 🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      }),
      // Initialize Langfuse autonomously on service worker activation
      initializeLangfuse().then(() => {
        console.log(
          '[SW] 🎯 Langfuse initialization completed during activation',
        )
      }),
    ]),
  )
  console.log('[SW] 👑 Claiming clients...')
  self.clients.claim()
})

// Message handler for LLM API calls and progress requests
self.addEventListener('message', async (event) => {
  console.log('[SW-MSG] 📨 Received message:', {
    type: event.data.type,
    hasData: !!event.data,
    origin: event.origin,
    source: event.source ? 'client' : 'unknown',
  })
  if (event.data.type === 'LLM_REQUEST') {
    const { requestId, provider, endpoint, options, model, messages } =
      event.data
    const startTime = Date.now()

    // Ensure Langfuse is initialized
    if (!langfuseInitialized) {
      await initializeLangfuse()
    }

    // Track this request
    activeRequests.set(requestId, {
      provider,
      endpoint,
      model,
      messages,
      startTime,
    })
    requestStats.totalRequests++
    broadcastProgressUpdate()

    try {
      const response = await fetch(endpoint, options)
      const data = await response.json()

      // Calculate response time and update stats
      const responseTime = Date.now() - startTime
      updateAverageResponseTime(responseTime)

      // Track with Langfuse if enabled
      await trackLLMRequest(
        { provider, endpoint, model, messages },
        { success: true, data, status: response.status, usage: data.usage },
        responseTime,
      )

      // Remove from active requests and update stats
      activeRequests.delete(requestId)
      requestStats.completedRequests++
      broadcastProgressUpdate()

      // Send response back to client
      event.ports[0].postMessage({
        type: 'LLM_RESPONSE',
        requestId,
        success: true,
        data,
        status: response.status,
      })
    } catch (error) {
      // Calculate response time for error case
      const responseTime = Date.now() - startTime

      // Track error with Langfuse if enabled
      const requestData = activeRequests.get(requestId)
      await trackLLMRequest(
        requestData,
        { success: false, error: error.message },
        responseTime,
      )

      // Remove from active requests on error
      activeRequests.delete(requestId)
      requestStats.completedRequests++
      broadcastProgressUpdate()

      event.ports[0].postMessage({
        type: 'LLM_RESPONSE',
        requestId,
        success: false,
        error: error.message,
      })
    }
  } else if (event.data.type === 'GET_LLM_PROGRESS_STATS') {
    // Send current stats to requesting client
    const stats = {
      activeRequests: activeRequests.size,
      totalRequests: requestStats.totalRequests,
      completedRequests: requestStats.completedRequests,
      averageResponseTime: requestStats.averageResponseTime,
    }

    event.source.postMessage({
      type: 'LLM_PROGRESS_UPDATE',
      stats,
    })
  } else if (event.data.type === 'LANGFUSE_CONFIG_UPDATED') {
    // When the main thread updates Langfuse config, reinitialize
    langfuseInitialized = false
    await initializeLangfuse()

    event.source.postMessage({
      type: 'LANGFUSE_REINITIALIZED',
      success: true,
    })
  } else if (event.data.type === 'GET_LANGFUSE_STATUS') {
    // Send current Langfuse status
    event.source.postMessage({
      type: 'LANGFUSE_STATUS',
      enabled: !!langfuseConfig?.enabled,
      configured: !!langfuseConfig,
    })
  }
})

// Fetch event - handle API caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Log ALL requests to see what's being intercepted
  console.log(`[SW-FETCH] Request to: ${url.hostname}${url.pathname}`, {
    method: event.request.method,
    url: event.request.url,
    port: url.port,
    headers: Object.fromEntries(event.request.headers.entries()),
  })

  // Only intercept LLM API calls
  const llmHosts = [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'api.mistral.ai',
    'openrouter.ai',
    'api.deepseek.com',
    'api.x.ai',
  ]

  const isLLMRequest = llmHosts.some((host) => url.hostname.includes(host))

  if (!isLLMRequest) {
    // Skip service worker entirely for localhost development assets to prevent conflicts
    const isLocalhost =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const isDevAsset =
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/node_modules/') ||
      url.pathname.includes('/.vite/') ||
      url.searchParams.has('v') // Vite version parameter
    const isAppAsset =
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.tsx')

    if (isLocalhost && (isDevAsset || isAppAsset)) {
      // Don't intercept localhost development assets at all
      return
    }

    if (isLocalhost) {
      return
    }

    // For production assets and non-dev resources, use cache-first strategy
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => response || fetch(event.request)),
    )
  }

  // Generate unique request ID for tracking
  const requestId = `fetch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const startTime = Date.now()

  console.log(
    `[SW-LLM] 🎯 Intercepted LLM request: ${requestId} to ${url.hostname}`,
    {
      provider: url.hostname,
      endpoint: url.href,
      method: event.request.method,
      langfuseEnabled: !!langfuseConfig?.enabled,
    },
  )

  // Track this request
  activeRequests.set(requestId, {
    provider: url.hostname,
    endpoint: url.href,
    startTime,
  })
  requestStats.totalRequests++
  broadcastProgressUpdate()

  // For LLM APIs, always use network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        // Calculate response time and update stats
        const responseTime = Date.now() - startTime
        updateAverageResponseTime(responseTime)

        console.log(
          `[SW] LLM request completed: ${requestId} (${responseTime}ms)`,
        )

        // Track with Langfuse if enabled (for fetch-based requests)
        console.log('[SW-TRACK] 🔍 Checking if should track request:', {
          method: event.request.method,
          responseOk: response.ok,
          responseType: response.type,
          langfuseEnabled: !!langfuseConfig?.enabled,
        })

        if (event.request.method === 'POST' && response.ok) {
          console.log(
            '[SW-TRACK] ✅ POST request with OK response, attempting tracking...',
          )
          try {
            const responseClone = response.clone()
            console.log('[SW-TRACK] 📋 Response details:', {
              type: responseClone.type,
              status: responseClone.status,
              headers: Object.fromEntries(responseClone.headers.entries()),
            })

            if (responseClone.type !== 'cors') {
              console.log('[SW-TRACK] 🔓 Non-CORS response, can read body')
              const responseData = await responseClone.json()
              await trackLLMRequest(
                {
                  provider: url.hostname,
                  endpoint: url.href,
                  model: 'unknown', // Can't easily extract model from fetch request
                  messages: [], // Can't easily extract messages from fetch request
                },
                {
                  success: true,
                  data: responseData,
                  status: response.status,
                  usage: responseData.usage,
                },
                responseTime,
              )
            } else {
              console.log(
                '[SW-TRACK] 🔒 CORS response, cannot read body - tracking with limited data',
              )
              // Track anyway with limited data
              await trackLLMRequest(
                {
                  provider: url.hostname,
                  endpoint: url.href,
                  model: 'unknown',
                  messages: [],
                },
                {
                  success: true,
                  data: { message: 'CORS response - body not readable' },
                  status: response.status,
                  usage: null,
                },
                responseTime,
              )
            }
          } catch (trackingError) {
            console.warn(
              '[SW-TRACK] ❌ Failed to track fetch request with Langfuse:',
              trackingError,
            )
          }
        } else {
          console.log('[SW-TRACK] ⏭️ Skipping tracking:', {
            reason:
              event.request.method !== 'POST' ? 'not POST' : 'response not OK',
          })
        }

        // Remove from active requests and update stats
        activeRequests.delete(requestId)
        requestStats.completedRequests++
        broadcastProgressUpdate()

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
      .catch(async (error) => {
        console.log(`[SW] LLM request failed: ${requestId} -`, error.message)

        // Calculate response time for error case
        const responseTime = Date.now() - startTime

        // Track error with Langfuse if enabled
        await trackLLMRequest(
          {
            provider: url.hostname,
            endpoint: url.href,
            model: 'unknown',
            messages: [],
          },
          { success: false, error: error.message },
          responseTime,
        )

        // Remove from active requests on error
        activeRequests.delete(requestId)
        requestStats.completedRequests++
        broadcastProgressUpdate()

        // If network fails, try cache
        const cachedResponse = await caches.match(event.request)
        if (cachedResponse) {
          console.log(`[SW] Using cached response for ${requestId}`)
          return cachedResponse
        }
        // Re-throw error if no cached response available
        throw error
      }),
  )
  return
})
