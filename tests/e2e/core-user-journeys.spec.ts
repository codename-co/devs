import { test, expect, DevsTestHelper } from './fixtures/test-base'

test.describe('Core User Journeys', () => {
  let _: DevsTestHelper

  test.beforeEach(async ({ page }) => {
    _ = new DevsTestHelper(page)
    await _.goHome()
  })

  test('should load the homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle('𝐃𝐄𝐕𝐒')

    // Check for main UI elements
    for (const item of ['prompt-area', 'agent-picker', 'menu-button']) {
      await expect(page.locator(`[data-testid="${item}"]`)).toBeVisible()
    }
  })

  test('should open and navigate app drawer', async ({ page }) => {
    // Open drawer
    await page.click('[data-testid="menu-button"]')
    await expect(page.locator('[data-testid="app-drawer"]')).toBeVisible()

    // Check drawer navigation items (use navigation-specific selectors)
    for (const item of [
      'New chat',
      'Tasks',
      'Agents',
      'Knowledge',
      'Settings',
    ]) {
      await expect(
        page.locator('nav').locator(`text="${item}"`).first(),
      ).toBeVisible()
    }
  })

  test('should navigate to different pages via drawer', async ({ page }) => {
    // Navigate to Tasks page via single click navigation
    await _.navigateViaDrawer('Tasks')
    await expect(page).toHaveURL(/\/tasks/)

    // Navigate to Agents page - use direct URL to avoid drawer state issues
    await _.navigateViaDrawer('Agents')
    await expect(page).toHaveURL(/\/agents/)

    // Navigate to Settings page - use direct URL
    await _.navigateViaDrawer('Settings')
    await expect(page).toHaveURL(/\/settings/)

    // Verify we can go back home
    await _.navigateViaDrawer('New chat')
    await expect(page).toHaveURL('/')
    await expect(page.locator('[data-testid="prompt-area"]')).toBeVisible()
  })

  test('should display agent picker with default DEVS agent', async ({
    page,
  }) => {
    const agentPicker = page.locator('[data-testid="agent-picker"]')
    await expect(agentPicker).toBeVisible()

    // Check if DEVS agent is selected by default
    await expect(agentPicker).toContainText(/𝐃𝐄𝐕𝐒|DEVS/)
  })

  test('should show prompt area and accept input', async ({ page }) => {
    const promptInput = page.locator('[data-testid="prompt-input"]')
    await expect(promptInput).toBeVisible()
    await expect(promptInput).toBeEditable()

    // Type in prompt area
    await promptInput.fill('Test prompt for e2e testing')
    await expect(promptInput).toHaveValue('Test prompt for e2e testing')

    // Check submit button is enabled
    const submitButton = page.locator('[data-testid="submit-button"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
  })

  test('should handle responsive design on mobile viewports', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone size

    // Main elements should still be visible on mobile
    await expect(page.locator('[data-testid="prompt-area"]')).toBeVisible()
    await expect(page.locator('[data-testid="menu-button"]')).toBeVisible()

    // Open drawer on mobile
    await page.click('[data-testid="menu-button"]')
    await expect(page.locator('[data-testid="app-drawer"]')).toBeVisible()
  })

  test('should handle browser back and forward navigation', async ({
    page,
  }) => {
    // Navigate directly to pages using URL to avoid drawer state issues
    await page.goto('/agents')
    await expect(page).toHaveURL(/\/agents/)

    await page.goto('/#settings')
    await expect(page).toHaveURL(/\/#settings/)

    // Use browser back
    await page.goBack()
    await expect(page).toHaveURL(/\/agents/)

    // Use browser forward
    await page.goForward()
    await expect(page).toHaveURL(/\/settings/)

    // Go back to home
    await page.goBack()
    await page.goBack()
    await expect(page).toHaveURL('/')
  })

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.waitForLoadState('networkidle')

    // Filter out expected errors (like network errors in test environment)
    const unexpectedErrors = errors.filter(
      (error) =>
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        !error.includes('IndexedDB') &&
        !error.toLowerCase().includes('service worker'),
    )

    expect(unexpectedErrors).toEqual([])
  })
})
