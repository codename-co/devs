import { Langfuse } from 'langfuse'
import { SecureStorage } from './crypto'
import { db } from './db'

class LangfuseService {
  private static client: Langfuse | null = null
  private static config: any = null

  static async initializeClient() {
    try {
      console.log('[Langfuse] Initializing client...')
      await db.init()
      const configs = await db.getAll('langfuse_config')
      const config = configs[0]

      console.log('[Langfuse] Found config:', !!config, config?.enabled)

      if (!config || !config.enabled) {
        this.client = null
        this.config = null
        console.log('[Langfuse] Disabled or not configured')
        return
      }

      console.log('[Langfuse] Config found, decrypting credentials...')

      // Decrypt the secret key
      const iv = localStorage.getItem(`${config.id}-iv`)
      const salt = localStorage.getItem(`${config.id}-salt`)

      if (!iv || !salt) {
        console.warn(
          '[Langfuse] Missing encryption metadata for config:',
          config.id,
        )
        return
      }

      const secretKey = await SecureStorage.decryptCredential(
        config.encryptedSecretKey,
        iv,
        salt,
      )

      console.log('[Langfuse] Creating client with:', {
        host: config.host,
        hasPublicKey: !!config.publicKey,
        hasSecretKey: !!secretKey,
      })

      this.client = new Langfuse({
        publicKey: config.publicKey,
        secretKey: secretKey,
        baseUrl: config.host,
      })

      this.config = config
      console.log('[Langfuse] Client initialized successfully')
    } catch (error) {
      console.error('[Langfuse] Failed to initialize client:', error)
      this.client = null
      this.config = null
    }
  }

  static async trackRequest(data: any, ctx: RequestContext) {
    console.log('[Langfuse] Received tracking request:', {
      hasClient: !!this.client,
      configEnabled: this.config?.enabled,
      provider: data.provider,
      model: data.model,
      ctx,
    })

    if (!this.client || !this.config?.enabled) {
      console.log('[Langfuse] Skipping tracking - client not ready or disabled')
      return
    }

    try {
      const userId = 'devs-user'
      const sessionId = ctx.taskId

      console.log('[LANGFUSE-MAIN] 🎯 Creating trace with session:', sessionId)
      const trace = this.client.trace({
        name: `${data.provider} - ${data.model || 'unknown-model'}`,
        sessionId,
        userId: userId,
        metadata: {
          provider: data.provider,
          endpoint: data.endpoint,
          duration: data.duration,
          status: data.status,
          conversationId: ctx.conversationId,
          taskId: ctx.taskId,
          agentId: ctx.agentId,
        },
        tags: [
          data.provider,
          ctx.agentId || 'unknown-agent',
          data.success ? 'success' : 'error',
        ],
      })

      console.log('[LANGFUSE-MAIN] 🔧 Creating generation...')
      const generation = trace.generation({
        name: `${data.provider} - ${data.model || 'unknown-model'}`,
        model: data.model,
        startTime: new Date(data.timestamp.getTime() - data.duration),
        endTime: data.timestamp,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        statusMessage: data.success ? 'success' : 'error',
        metadata: {
          provider: data.provider,
          responseTime: data.duration,
          endpoint: data.endpoint,
          agentId: ctx.agentId,
        },
      })

      if (data.messages) {
        console.log('[Langfuse] Adding input/output to generation...')
        generation.update({
          input: data.messages,
          output: data.response,
        })
      }

      console.log('[Langfuse] Flushing to Langfuse...')
      await this.client.flushAsync()
      console.log('[Langfuse] Request tracked successfully')
    } catch (error) {
      console.error('[Langfuse] Failed to track request:', error)
    }
  }

  static async handleServiceWorkerMessage(event: MessageEvent) {
    console.log('[LANGFUSE-MAIN] 📩 Received service worker message:', {
      type: event.data.type,
      hasData: !!event.data.data,
      origin: event.origin,
    })

    if (event.data.type === 'LANGFUSE_TRACK_REQUEST') {
      console.log('[LANGFUSE-MAIN] 🎯 Processing LANGFUSE_TRACK_REQUEST')
      await this.trackRequest(event.data.data, event.data.ctx)
    } else {
      console.log('[LANGFUSE-MAIN] ⚠️ Unknown message type:', event.data.type)
    }
  }

  static async initialize() {
    console.log('[LANGFUSE-MAIN] 🚀 Initializing service...')

    // Initialize the client
    await this.initializeClient()

    // Listen for messages from the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this),
      )
      console.log(
        '[LANGFUSE-MAIN] 👂 Message listener registered for service worker messages',
      )

      // Check if service worker is ready
      if (navigator.serviceWorker.controller) {
        console.log('[LANGFUSE-MAIN] ✅ Service worker controller is active')
      } else {
        console.warn('[LANGFUSE-MAIN] ⚠️ No service worker controller found')
      }
    } else {
      console.warn('[LANGFUSE-MAIN] ❌ Service workers not supported')
    }
  }

  static async reinitialize() {
    await this.initializeClient()
  }
}

export { LangfuseService }

export type RequestContext = {
  conversationId: string
  taskId: string
  agentId: string
}
