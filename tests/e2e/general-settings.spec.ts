import { test, expect, DevsTestHelper } from './fixtures/test-base'

test.describe('General Settings User Journey', () => {
  let _: DevsTestHelper

  test.beforeEach(async ({ page }) => {
    _ = new DevsTestHelper(page)
    await _.goHome()
  })

  test('should navigate to settings page successfully', async ({ page }) => {
    await _.navigateViaDrawer('Settings')

    await _.expectTitle('Platform Settings')

    // Should show the main settings sections
    await expect(page.locator('[data-testid="general-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="llm-providers"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="security-settings"]'),
    ).toBeVisible()
  })

  test('should expand general settings section', async ({ page }) => {
    await _.navigateViaDrawer('Settings')
    await _.selectAccordionItem('General Settings')

    // Should show general settings controls
    const languageSelect = _.firstLabel('Interface Language')
    const themeSelect = _.firstLabel('Theme')
    const platformNameInput = _.firstLabel('Platform Name')
    const backgroundImageSection = page
      .locator('text="Background Image"')
      .first()

    await expect(languageSelect).toBeVisible()
    await expect(themeSelect).toBeVisible()
    await expect(platformNameInput).toBeVisible()
    await expect(backgroundImageSection).toBeVisible()
  })

  test('should change interface language', async ({ page }) => {
    await _.navigateViaDrawer('Settings')
    await _.selectAccordionItem('General Settings')

    const languageSelector = page
      .getByRole('button', {
        name: 'Interface Language English',
      })
      .first()

    await _.selectDropdown(languageSelector, 'Français')
  })

  test('should change theme', async ({ page }) => {
    await _.navigateViaDrawer('Settings')
    await _.selectAccordionItem('General Settings')

    const themeSelector = page
      .getByRole('button', { name: 'Theme System' })
      .first()

    await _.selectDropdown(themeSelector, 'Dark')

    // Verify the theme was applied
    const html = page.locator('html')
    expect(html).toHaveClass('dark')
  })

  test('should update platform name', async ({ page }) => {
    await _.navigateViaDrawer('Settings')
    await _.selectAccordionItem('General Settings')

    const newName = 'My Little Platform'
    const platformNameInput = page.getByRole('textbox', {
      name: 'Platform Name',
    })
    await platformNameInput.clear()
    await platformNameInput.fill(newName)
    await expect(platformNameInput).toHaveValue(newName)

    // Expect the navbar to reflect the new platform name
    const header = page.getByTestId('platform-name')
    await expect(header).toHaveText(newName)
  })

  test('should preserve settings during navigation', async ({ page }) => {
    await _.navigateViaDrawer('Settings')
    await _.selectAccordionItem('General Settings')

    // Set a platform name
    const newName = 'My Little Platform'
    const platformNameInput = page.getByRole('textbox', {
      name: 'Platform Name',
    })
    await platformNameInput.clear()
    await platformNameInput.fill(newName)

    // Navigate away and back
    await _.navigateViaDrawer('Agents')
    await _.expectTitle('Agents')

    await _.navigateViaDrawer('Settings')
    await _.selectAccordionItem('General Settings')

    // Platform name should be preserved
    const preservedInput = page.getByRole('textbox', {
      name: 'Platform Name',
    })
    await expect(preservedInput).toHaveValue(newName)
  })

  test('should handle responsive layout', async ({ page }) => {
    await _.navigateViaDrawer('Settings')

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await _.waitForAnimation()

    // Settings page should still be functional
    await expect(page.locator('[data-testid="general-settings"]')).toBeVisible()

    // Click on general settings
    await _.selectAccordionItem('General Settings')

    // Form elements should be visible and accessible
    const languageSelect = _.firstLabel('Interface Language')
    await expect(languageSelect).toBeVisible()

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should handle browser back/forward with settings state', async ({
    page,
  }) => {
    await _.navigateViaDrawer('Settings')

    // Expand general settings
    await _.selectAccordionItem('General Settings')
    await expect(_.firstLabel('Interface Language')).toBeVisible()

    // Navigate to another page
    await _.navigateViaDrawer('Tasks')
    await _.expectTitle('Tasks')

    // Use browser back
    await page.goBack()

    // Should return to settings page
    await _.expectTitle('Platform Settings')
  })
})
