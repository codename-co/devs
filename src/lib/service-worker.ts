import { LangfuseService } from './langfuse-service'
import { swUpdateHandler } from './sw-update-handler'

export class ServiceWorkerManager {
  private static registration: ServiceWorkerRegistration | null = null

  static async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn(
        '[SW-MANAGER] ❌ Service Workers are not supported in this browser',
      )
      return
    }

    try {
      console.debug('[SW-MANAGER] 🚀 Registering service worker…')

      // Use the new update handler for registration
      this.registration = await swUpdateHandler.initialize()

      if (!this.registration) {
        console.warn('[SW-MANAGER] ⚠️ Service worker registration returned null')
        return
      }

      console.log('[SW-MANAGER] ✅ Service Worker registered successfully:', {
        scope: this.registration.scope,
        state:
          this.registration.installing?.state ||
          this.registration.active?.state,
      })

      // Initialize Langfuse service for handling service worker requests
      console.debug('[SW-MANAGER] 🔧 Initializing Langfuse service…')
      await LangfuseService.initialize()

      // In development, check for updates more frequently
      if (process.env.NODE_ENV === 'development') {
        // Check for updates every 10 seconds in development
        setInterval(
          () => {
            swUpdateHandler.checkForUpdates()
          },
          10000,
        )
      }
    } catch (error) {
      console.error('[SW-MANAGER] ❌ Service Worker registration failed:', error)
    }
  }

  static async sendMessage(message: any): Promise<any> {
    if (!this.registration?.active) {
      throw new Error('Service Worker not active')
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel()

      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data)
        } else {
          reject(new Error(event.data.error))
        }
      }

      this.registration!.active!.postMessage(message, [channel.port2])
    })
  }

  static async makeSecureRequest(
    provider: string,
    endpoint: string,
    options: RequestInit,
  ): Promise<any> {
    const requestId = Date.now().toString()

    return this.sendMessage({
      type: 'LLM_REQUEST',
      requestId,
      provider,
      endpoint,
      options,
    })
  }
}
