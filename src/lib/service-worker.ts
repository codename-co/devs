export class ServiceWorkerManager {
  private static registration: ServiceWorkerRegistration | null = null

  static async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported in this browser')
      return
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('Service Worker registered successfully')

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('Service Worker updated')
            }
          })
        }
      })
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
