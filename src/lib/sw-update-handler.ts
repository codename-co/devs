/**
 * Service Worker Update Handler
 * Manages service worker lifecycle and notifies users about updates
 */

export interface ServiceWorkerUpdate {
  hasUpdate: boolean
  currentVersion: string | null
  newVersion: string | null
}

export type UpdateCallback = (update: ServiceWorkerUpdate) => void

class ServiceWorkerUpdateHandler {
  private registration: ServiceWorkerRegistration | null = null
  private updateCallbacks: UpdateCallback[] = []
  private currentVersion: string | null = null
  private checkInterval: number | null = null

  /**
   * Initialize service worker registration and update detection
   */
  async initialize(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW-Update] Service workers not supported')
      return null
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('[SW-Update] ✅ Service worker registered')

      // Get current version
      await this.getCurrentVersion()

      // Listen for service worker updates
      this.setupUpdateListeners()

      // Check for updates periodically (every 60 seconds)
      this.startUpdateCheck()

      // Listen for messages from service worker
      this.setupMessageListener()

      return this.registration
    } catch (error) {
      console.error('[SW-Update] ❌ Registration failed:', error)
      return null
    }
  }

  /**
   * Get the current service worker version
   */
  private async getCurrentVersion(): Promise<void> {
    const controller = navigator.serviceWorker.controller

    if (!controller) {
      return
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'SW_VERSION') {
          this.currentVersion = event.data.version
          console.log('[SW-Update] 📌 Current version:', this.currentVersion)
        }
        resolve()
      }

      controller.postMessage({ type: 'GET_SW_VERSION' }, [messageChannel.port2])
    })
  }

  /**
   * Setup listeners for service worker updates
   */
  private setupUpdateListeners(): void {
    if (!this.registration) return

    // Detect when new service worker is installing
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing

      if (!newWorker) return

      console.log('[SW-Update] 🔄 Update found, installing...')

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available, notify user
            console.log('[SW-Update] ✅ Update ready')
            this.notifyUpdate()
          } else {
            // First install
            console.log(
              '[SW-Update] 🎉 Service worker installed for first time',
            )
          }
        }
      })
    })

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW-Update] 🔄 Controller changed, reloading page...')
      window.location.reload()
    })
  }

  /**
   * Setup message listener for service worker events
   */
  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SW_ACTIVATED') {
        console.log(
          '[SW-Update] ⚡ Service worker activated:',
          event.data.version,
        )
        // Could show a toast notification here
      }
    })
  }

  /**
   * Start periodic update checks
   */
  private startUpdateCheck(): void {
    // Check immediately
    this.checkForUpdates()

    // Then check every 60 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkForUpdates()
    }, 60000)
  }

  /**
   * Stop periodic update checks
   */
  stopUpdateCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Manually check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return
    }

    try {
      await this.registration.update()
      console.log('[SW-Update] 🔍 Checked for updates')
    } catch (error) {
      console.warn('[SW-Update] ⚠️ Update check failed:', error)
    }
  }

  /**
   * Subscribe to update notifications
   */
  onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback)
      if (index > -1) {
        this.updateCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify all subscribers about available update
   */
  private notifyUpdate(): void {
    const update: ServiceWorkerUpdate = {
      hasUpdate: true,
      currentVersion: this.currentVersion,
      newVersion: 'unknown', // Could fetch from new worker if needed
    }

    this.updateCallbacks.forEach((callback) => {
      callback(update)
    })
  }

  /**
   * Activate the waiting service worker
   */
  async activateUpdate(): Promise<void> {
    if (!this.registration?.waiting) {
      console.warn('[SW-Update] ⚠️ No waiting service worker')
      return
    }

    console.log('[SW-Update] 🔄 Activating update...')

    // Tell the waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })

    // The page will reload automatically when controller changes
  }

  /**
   * Get current registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    this.stopUpdateCheck()

    if (!this.registration) {
      return false
    }

    const result = await this.registration.unregister()
    console.log(
      '[SW-Update]',
      result ? '✅ Unregistered' : '❌ Failed to unregister',
    )

    return result
  }
}

// Export singleton instance
export const swUpdateHandler = new ServiceWorkerUpdateHandler()
