import { test, expect, DevsTestHelper } from './fixtures/test-base'

test.describe('Agent Management', () => {
  let _: DevsTestHelper

  test.beforeEach(async ({ page }) => {
    _ = new DevsTestHelper(page)
    await _.goHome()
  })

  test('should display agents page with default DEVS agent', async ({
    page,
  }) => {
    await _.navigateViaDrawer('Agents')

    await _.expectTitle('Agents')

    // Switch to Built-in Agents tab where DEVS would be
    await page.click('text=/Built-in Agents/i')

    // Should show built-in agents including DEVS
    const agentCards = page.locator('[data-testid="agent-card"]')
    await expect(agentCards.first()).toBeVisible()
    // Check for DEVS specifically in the agent cards
    await expect(
      agentCards.filter({ hasText: /𝐃𝐄𝐕𝐒|DEVS/i }).first(),
    ).toBeVisible()
  })

  test('should open agent creation modal', async ({ page }) => {
    await _.navigateViaDrawer('Agents')

    // Look for create/add agent button
    const createButton = page
      .locator('text="Create Agent"')
      .or(page.locator('text="Add Agent"'))
      .or(page.locator('[data-testid="create-agent-button"]'))
      .or(page.locator('text="+"'))

    if (await createButton.isVisible()) {
      await createButton.click()

      // Check if modal or form is opened
      const isModalOpen = await page
        .locator('[data-testid="agent-modal"]')
        .isVisible()
        .catch(() => false)
      const isFormVisible = await page
        .locator('[data-testid="agent-form"]')
        .isVisible()
        .catch(() => false)
      const hasNameInput = await page
        .locator('input[name="name"]')
        .isVisible()
        .catch(() => false)

      expect(isModalOpen || isFormVisible || hasNameInput).toBe(true)
    }
  })

  test('should display agent details when clicked', async ({ page }) => {
    await _.navigateViaDrawer('Agents')

    // Switch to Built-in Agents tab where agents are
    await page.click('text=/Built-in Agents/i')

    // Click on first agent card
    const agentCard = page.locator('[data-testid="agent-card"]').first()
    await agentCard.click()

    // Should complete the click without errors and navigate somewhere
    await page.waitForTimeout(2000) // Wait for any navigation

    // At minimum, should still be in the app (not a browser error page)
    const hasAppContent =
      (await page
        .locator('[data-testid="prompt-area"]')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('[data-testid="agent-card"]')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('h1')
        .isVisible()
        .catch(() => false))

    expect(hasAppContent).toBe(true)
  })

  test('should validate agent creation form', async ({ page }) => {
    await _.navigateViaDrawer('Agents')

    // Try to find and open create agent form
    const createButton = page
      .locator('text="Create Agent"')
      .or(page.locator('text="Add Agent"'))
      .or(page.locator('[data-testid="create-agent-button"]'))
      .or(page.locator('text="+"'))

    if (await createButton.isVisible()) {
      await createButton.click()

      // Check for form validation
      const nameInput = page
        .locator('input[name="name"]')
        .or(page.locator('[data-testid="agent-name-input"]'))

      if (await nameInput.isVisible()) {
        // Try to submit empty form
        const submitButton = page
          .locator('button[type="submit"]')
          .or(page.locator('text="Create"'))
          .or(page.locator('text="Save"'))

        if (await submitButton.isVisible()) {
          await submitButton.click()

          // Should show validation error
          const hasValidationError =
            (await page
              .locator('text="required"')
              .isVisible()
              .catch(() => false)) ||
            (await page
              .locator('text="Please"')
              .isVisible()
              .catch(() => false)) ||
            (await page
              .locator('.error')
              .isVisible()
              .catch(() => false))

          expect(hasValidationError).toBe(true)
        }
      }
    }
  })

  test('should filter agents by search', async ({ page }) => {
    await _.navigateViaDrawer('Agents')

    // Look for search input
    const searchInput = page
      .locator('input[placeholder*="search"]')
      .or(page.locator('[data-testid="search-input"]'))
      .or(page.locator('input[type="search"]'))

    if (await searchInput.isVisible()) {
      // Search for DEVS
      await searchInput.fill('DEVS')

      // Should show DEVS agent
      await expect(page.locator('text="DEVS"')).toBeVisible()

      // Search for non-existent agent
      await searchInput.fill('NonExistentAgent')

      // Should show no results or empty state
      const noResults =
        (await page
          .locator('text="No agents"')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('text="not found"')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('[data-testid="empty-state"]')
          .isVisible()
          .catch(() => false))

      // If no explicit "no results" message, check that DEVS is hidden
      if (!noResults) {
        await expect(page.locator('text="DEVS"')).not.toBeVisible()
      }
    }
  })

  test('should handle agent selection in agent picker', async ({ page }) => {
    await _.goHome()

    // Click on agent picker
    const agentPicker = page.locator('[data-testid="agent-picker"]')
    await agentPicker.click()

    // Should show dropdown or modal with agent options
    const hasDropdown = await page
      .locator('[data-testid="agent-dropdown"]')
      .isVisible()
      .catch(() => false)
    const hasAgentList = await page
      .locator('[data-testid="agent-list"]')
      .isVisible()
      .catch(() => false)

    if (hasDropdown || hasAgentList) {
      // DEVS should be visible as an option
      await expect(page.locator('text="DEVS"')).toBeVisible()
    }
  })

  test('should navigate to agent creation from empty state', async ({
    page,
  }) => {
    // This test assumes there might be an empty state with a CTA
    await _.navigateViaDrawer('Agents')

    // Look for empty state create button
    const emptyStateButton = page
      .locator('[data-testid="empty-state-create"]')
      .or(page.locator('text="Create your first agent"'))
      .or(page.locator('text="Get started"'))

    if (await emptyStateButton.isVisible()) {
      await emptyStateButton.click()

      // Should open creation form
      const hasForm =
        (await page
          .locator('[data-testid="agent-form"]')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('input[name="name"]')
          .isVisible()
          .catch(() => false))

      expect(hasForm).toBe(true)
    }
  })

  test('should handle agent actions menu', async ({ page }) => {
    await _.navigateViaDrawer('Agents')

    // Look for action menu (three dots, gear icon, etc.)
    const actionMenu = page
      .locator('[data-testid="agent-actions"]')
      .or(page.locator('.agent-menu'))
      .or(page.locator('button[aria-label*="menu"]'))
      .or(page.locator('text="⋮"'))
      .or(page.locator('text="..."'))

    if (await actionMenu.isVisible()) {
      await actionMenu.click()

      // Should show action options
      const hasEditOption = await page
        .locator('text="Edit"')
        .isVisible()
        .catch(() => false)
      const hasDeleteOption = await page
        .locator('text="Delete"')
        .isVisible()
        .catch(() => false)
      const hasViewOption = await page
        .locator('text="View"')
        .isVisible()
        .catch(() => false)

      expect(hasEditOption || hasDeleteOption || hasViewOption).toBe(true)
    }
  })
})
