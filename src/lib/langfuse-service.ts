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

  static async trackRequest(data: any) {
    console.log('[Langfuse] Received tracking request:', {
      hasClient: !!this.client,
      configEnabled: this.config?.enabled,
      provider: data.provider,
      model: data.model,
    })

    if (!this.client || !this.config?.enabled) {
      console.log('[Langfuse] Skipping tracking - client not ready or disabled')
      return
    }

    try {
      console.log('[Langfuse] Creating trace...')
      const trace = this.client.trace({
        name: `LLM Request - ${data.provider}`,
        userId: 'devs-user',
        metadata: {
          provider: data.provider,
          endpoint: data.endpoint,
          duration: data.duration,
          status: data.status,
        },
      })

      console.log('[Langfuse] Creating generation...')
      const generation = trace.generation({
        name: data.model || 'unknown-model',
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
    console.log('[Langfuse] Received service worker message:', event.data.type)
    if (event.data.type === 'LANGFUSE_TRACK_REQUEST') {
      await this.trackRequest(event.data.data)
    }
  }

  static async initialize() {
    console.log('[Langfuse] Initializing service...')

    // Initialize the client
    await this.initializeClient()

    // Listen for messages from the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this),
      )
      console.log('[Langfuse] Message listener registered')
    } else {
      console.warn('[Langfuse] Service workers not supported')
    }
  }

  static async reinitialize() {
    await this.initializeClient()
  }
}

export { LangfuseService }
