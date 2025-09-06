import { test as base, expect, Page, BrowserContext } from '@playwright/test'

interface TestFixtures {
  page: Page
  context: BrowserContext
}

interface WorkerFixtures {
  // Add worker-scoped fixtures here if needed
}

/**
 * Base test fixture with common setup for DEVS platform tests
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  page: async ({ context }, use) => {
    const page = await context.newPage()

    // Clear storage before each test to ensure clean state
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Clear IndexedDB
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('devs-db')
        deleteReq.onsuccess = () => resolve()
        deleteReq.onerror = () => resolve() // Continue even if deletion fails
        deleteReq.onblocked = () => resolve() // Continue even if blocked
      })
    })

    await use(page)
  },
})

export { expect }

/**
 * Helper functions for common DEVS platform interactions
 */
export class DevsTestHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to the home page and wait for it to load
   */
  async goHome() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForSelector('[data-testid="prompt-area"]', {
      timeout: 10000,
    })
  }

  /**
   * Open the app drawer/sidebar
   */
  async openDrawer() {
    await this.page.click('[data-testid="menu-button"]')
    await this.page.waitForSelector('[data-testid="app-drawer"]')
  }

  /**
   * Navigate to a specific page via the drawer
   */
  async navigateViaDrawer(linkText: string) {
    await this.openDrawer()
    await this.page.click(`text="${linkText}"`)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Submit a prompt and wait for response
   */
  async submitPrompt(prompt: string) {
    await this.page.fill('[data-testid="prompt-input"]', prompt)
    await this.page.click('[data-testid="submit-button"]')
    await this.page.waitForSelector('[data-testid="task-progress"]', {
      timeout: 30000,
    })
  }

  /**
   * Wait for a task to complete
   */
  async waitForTaskCompletion(timeout = 60000) {
    await this.page.waitForSelector('[data-testid="task-completed"]', {
      timeout,
    })
  }

  /**
   * Check if an element exists without throwing
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Mock IndexedDB for testing without real data
   */
  async mockIndexedDB() {
    await this.page.addInitScript(() => {
      // Mock IndexedDB operations for testing
      const originalIDB = window.indexedDB
      const mockDB = {
        transaction: () => ({
          objectStore: () => ({
            get: () => ({ onsuccess: null, onerror: null }),
            put: () => ({ onsuccess: null, onerror: null }),
            add: () => ({ onsuccess: null, onerror: null }),
            delete: () => ({ onsuccess: null, onerror: null }),
          }),
        }),
      }

      // Only mock if in test environment
      if (location.search.includes('test=true')) {
        Object.defineProperty(window, 'indexedDB', {
          value: {
            ...originalIDB,
            open: () => ({
              onsuccess: null,
              onerror: null,
              result: mockDB,
            }),
          },
        })
      }
    })
  }

  /**
   * Mock Service Worker responses
   */
  async mockServiceWorker() {
    await this.page.route('**/api/**', async (route) => {
      if (route.request().url().includes('llm')) {
        // Mock LLM responses for testing
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            choices: [
              { message: { content: 'Mocked LLM response for testing' } },
            ],
          }),
        })
      } else {
        route.continue()
      }
    })
  }
}
