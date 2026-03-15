import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  requestNotificationPermission,
  canSendNotification,
  notifyTaskCompleted,
  notifyTaskFailed,
  notifyHitlRequest,
} from '@/lib/web-notifications'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockNotificationAPI(permission: NotificationPermission) {
  const instances: Array<{
    title: string
    options?: NotificationOptions
    close: () => void
    addEventListener: ReturnType<typeof vi.fn>
  }> = []

  const NotificationMock = vi
    .fn()
    .mockImplementation((title: string, options?: NotificationOptions) => {
      const instance = {
        title,
        options,
        close: vi.fn(),
        addEventListener: vi.fn(),
      }
      instances.push(instance)
      return instance
    }) as unknown as typeof Notification

  Object.defineProperty(NotificationMock, 'permission', {
    get: () => permission,
    configurable: true,
  })
  NotificationMock.requestPermission = vi.fn().mockResolvedValue(permission)

  Object.defineProperty(window, 'Notification', {
    value: NotificationMock,
    writable: true,
    configurable: true,
  })

  return { NotificationMock, instances }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Web Notifications', () => {
  const originalNotification = globalThis.Notification

  afterEach(() => {
    // Restore original
    if (originalNotification) {
      Object.defineProperty(window, 'Notification', {
        value: originalNotification,
        writable: true,
        configurable: true,
      })
    }
    vi.restoreAllMocks()
  })

  // =========================================================================
  // requestNotificationPermission
  // =========================================================================

  describe('requestNotificationPermission', () => {
    it('should return true when permission is already granted', async () => {
      mockNotificationAPI('granted')
      expect(await requestNotificationPermission()).toBe(true)
    })

    it('should return false when permission is denied', async () => {
      mockNotificationAPI('denied')
      expect(await requestNotificationPermission()).toBe(false)
    })

    it('should request permission and return result', async () => {
      mockNotificationAPI('default')
      // Override requestPermission to simulate granting
      ;(
        Notification.requestPermission as ReturnType<typeof vi.fn>
      ).mockResolvedValue('granted')
      expect(await requestNotificationPermission()).toBe(true)
    })

    it('should return false when Notification API is not available', async () => {
      delete (window as any).Notification
      expect(await requestNotificationPermission()).toBe(false)
    })
  })

  // =========================================================================
  // canSendNotification
  // =========================================================================

  describe('canSendNotification', () => {
    it('should return true when granted', () => {
      mockNotificationAPI('granted')
      expect(canSendNotification()).toBe(true)
    })

    it('should return false when denied', () => {
      mockNotificationAPI('denied')
      expect(canSendNotification()).toBe(false)
    })

    it('should return false when API missing', () => {
      delete (window as any).Notification
      expect(canSendNotification()).toBe(false)
    })
  })

  // =========================================================================
  // Notification senders (document.hidden guards)
  // =========================================================================

  describe('notification senders', () => {
    beforeEach(() => {
      mockNotificationAPI('granted')
    })

    it('should NOT send when document is visible', () => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
      })
      notifyTaskCompleted('My Task')
      expect(Notification).not.toHaveBeenCalled()
    })

    it('should send task completed notification when document is hidden', () => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
      })
      notifyTaskCompleted('My Task')
      expect(Notification).toHaveBeenCalledWith(
        'Task Completed',
        expect.objectContaining({
          body: 'My Task',
          tag: 'task-completed',
        }),
      )
    })

    it('should send task failed notification when document is hidden', () => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
      })
      notifyTaskFailed('Broken Task')
      expect(Notification).toHaveBeenCalledWith(
        'Task Failed',
        expect.objectContaining({
          body: 'Broken Task',
          tag: 'task-failed',
        }),
      )
    })

    it('should send HITL notification with requireInteraction', () => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
      })
      notifyHitlRequest('Should I proceed?')
      expect(Notification).toHaveBeenCalledWith(
        'Input Needed',
        expect.objectContaining({
          body: 'Should I proceed?',
          tag: 'hitl-request',
          requireInteraction: true,
        }),
      )
    })

    it('should register a click handler that focuses the window', () => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
      })
      const { instances } = mockNotificationAPI('granted')
      notifyTaskCompleted('Done')
      expect(instances).toHaveLength(1)
      expect(instances[0].addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
      )
    })
  })
})
