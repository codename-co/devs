import { LangfuseService } from './langfuse-service'

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
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Force check for updates
      })

      console.log('[SW-MANAGER] ✅ Service Worker registered successfully:', {
        scope: this.registration.scope,
        state:
          this.registration.installing?.state ||
          this.registration.active?.state,
      })

      // Initialize Langfuse service for handling service worker requests
      console.debug('[SW-MANAGER] 🔧 Initializing Langfuse service…')
      await LangfuseService.initialize()

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('Service Worker updated')
              // Force page reload in development to use new service worker
              if (process.env.NODE_ENV === 'development') {
                window.location.reload()
              }
            }
          })
        }
      })

      // In development, check for updates immediately
      if (process.env.NODE_ENV === 'development') {
        this.registration.update()
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error)
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
