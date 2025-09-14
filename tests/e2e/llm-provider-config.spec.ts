import { test, expect, DevsTestHelper } from './fixtures/test-base'

test.describe('LLM Provider Configuration', () => {
  let _: DevsTestHelper

  test.beforeEach(async ({ page }) => {
    _ = new DevsTestHelper(page)
    await _.goHome()
  })

  test('should access settings page', async ({ page }) => {
    await _.navigateViaDrawer('Settings')

    await _.expectTitle('Settings')

    // Should show some configuration options
    const hasLLMConfig =
      (await page
        .locator('text="LLM"')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text="Provider"')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text="API"')
        .isVisible()
        .catch(() => false))

    expect(hasLLMConfig).toBe(true)
  })

  test('should display provider selection options', async ({ page }) => {
    await _.navigateViaDrawer('Settings')

    // Look for provider selection UI
    const providerSelect = page
      .locator('[data-testid="provider-select"]')
      .or(page.locator('select'))
      .or(page.locator('[data-testid="provider-dropdown"]'))

    const providerOptions = page
      .locator('text="OpenAI"')
      .or(page.locator('text="Anthropic"'))
      .or(page.locator('text="Google"'))
      .or(page.locator('text="Gemini"'))

    const hasProviderSelect = await providerSelect
      .isVisible()
      .catch(() => false)
    const hasProviderOptions = await providerOptions
      .isVisible()
      .catch(() => false)

    expect(hasProviderSelect || hasProviderOptions).toBe(true)
  })

  test('should handle API key configuration', async ({ page }) => {
    await _.navigateViaDrawer('Settings')

    // Look for API key input fields
    const apiKeyInput = page
      .locator('input[type="password"]')
      .or(page.locator('input[placeholder*="API"]'))
      .or(page.locator('[data-testid="api-key-input"]'))
      .or(page.locator('input[name*="key"]'))

    if (await apiKeyInput.isVisible()) {
      // Test API key input
      await apiKeyInput.fill('test-api-key-123')
      await expect(apiKeyInput).toHaveValue('test-api-key-123')

      // Clear the input
      await apiKeyInput.fill('')
      await expect(apiKeyInput).toHaveValue('')
    }
  })

  test('should handle custom provider endpoints', async ({ page }) => {
    await _.navigateViaDrawer('Settings')

    // Look for custom endpoint configuration
    const customProvider = page
      .locator('text="Custom"')
      .or(page.locator('text="Local"'))
      .or(page.locator('[data-testid="custom-provider"]'))

    if (await customProvider.isVisible()) {
      await customProvider.click()

      // Should show endpoint URL input
      const endpointInput = page
        .locator('input[placeholder*="endpoint"]')
        .or(page.locator('input[placeholder*="URL"]'))
        .or(page.locator('[data-testid="endpoint-input"]'))

      const hasEndpointInput = await endpointInput
        .isVisible()
        .catch(() => false)
      expect(hasEndpointInput).toBe(true)
    }
  })
})
