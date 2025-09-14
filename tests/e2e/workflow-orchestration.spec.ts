import { test, expect, DevsTestHelper } from './fixtures/test-base'

test.describe('Workflow Orchestration', () => {
  let _: DevsTestHelper

  test.beforeEach(async ({ page }) => {
    _ = new DevsTestHelper(page)
    await _.goHome()

    // Mock LLM responses for consistent testing
    await _.mockServiceWorker()
  })

  test('should initiate workflow from prompt submission', async ({ page }) => {
    await _.goHome()

    const promptInput = page.locator('[data-testid="prompt-input"]')
    const submitButton = page.locator('[data-testid="submit-button"]')

    // Submit a simple prompt
    await promptInput.fill('Create a simple web page with a welcome message')
    await submitButton.click()

    // Should navigate to task page or show workflow indicators
    const isOnTaskPage = await page
      .waitForURL(/\/tasks\//, { timeout: 10000 })
      .then(() => true)
      .catch(() => false)
    const hasProgress = await page
      .locator('[data-testid="task-progress"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasWorkflow = await page
      .locator('[data-testid="workflow-status"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasSpinner = await page
      .locator('.loading')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(isOnTaskPage || hasProgress || hasWorkflow || hasSpinner).toBe(true)
  })

  test('should display task breakdown and analysis', async ({ page }) => {
    await _.goHome()

    const promptInput = page.locator('[data-testid="prompt-input"]')
    const submitButton = page.locator('[data-testid="submit-button"]')

    await promptInput.fill('Build a React component with TypeScript')
    await submitButton.click()

    // Wait for task analysis
    const hasAnalysis = await page
      .locator('[data-testid="task-analysis"]')
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasBreakdown = await page
      .locator('[data-testid="task-breakdown"]')
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasRequirements = await page
      .locator('text="requirement"')
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasAnalysis || hasBreakdown || hasRequirements).toBe(true)
  })

  test('should show agent recruitment and team formation', async ({ page }) => {
    await _.goHome()

    const promptInput = page.locator('[data-testid="prompt-input"]')
    const submitButton = page.locator('[data-testid="submit-button"]')

    await promptInput.fill(
      'Design and implement a database schema for user management',
    )
    await submitButton.click()

    // Wait for agent recruitment
    const hasAgentList = await page
      .locator('[data-testid="active-agents"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)
    const hasTeamInfo = await page
      .locator('[data-testid="team-formation"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)
    const hasAgentCards = await page
      .locator('[data-testid="agent-card"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)

    expect(hasAgentList || hasTeamInfo || hasAgentCards).toBe(true)
  })

  test('should navigate to tasks page and show workflow', async ({ page }) => {
    await _.goHome()

    // Submit a task first
    await page.fill(
      '[data-testid="prompt-input"]',
      'Create a simple API endpoint',
    )
    await page.click('[data-testid="submit-button"]')

    // Navigate to tasks page
    await _.navigateViaDrawer('Tasks')

    // Should show task list or workflow
    const hasTaskList = await page
      .locator('[data-testid="task-list"]')
      .isVisible()
      .catch(() => false)
    const hasWorkflowView = await page
      .locator('[data-testid="workflow-view"]')
      .isVisible()
      .catch(() => false)
    const hasTaskItems =
      (await page.locator('[data-testid="task-item"]').count()) > 0

    expect(hasTaskList || hasWorkflowView || hasTaskItems).toBe(true)
  })

  test('should display task progress and status updates', async ({ page }) => {
    await _.goHome()

    await page.fill(
      '[data-testid="prompt-input"]',
      'Generate unit tests for a login function',
    )
    await page.click('[data-testid="submit-button"]')

    // Check for progress indicators
    const hasProgressBar = await page
      .locator('[data-testid="progress-bar"]')
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasStatusText = await page
      .locator('[data-testid="status-text"]')
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasPercentage = await page
      .locator('text="%"')
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasProgressBar || hasStatusText || hasPercentage).toBe(true)
  })

  test('should show requirement validation progress', async ({ page }) => {
    await _.goHome()

    await page.fill(
      '[data-testid="prompt-input"]',
      'Create a responsive navigation menu',
    )
    await page.click('[data-testid="submit-button"]')

    // Look for requirement validation
    const hasRequirements = await page
      .locator('[data-testid="requirements-list"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)
    const hasValidation = await page
      .locator('[data-testid="requirement-validation"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)
    const hasCheckmarks = await page
      .locator('.requirement-status')
      .isVisible({ timeout: 20000 })
      .catch(() => false)

    expect(hasRequirements || hasValidation || hasCheckmarks).toBe(true)
  })

  test('should handle task completion and artifact creation', async ({
    page,
  }) => {
    await _.goHome()

    // Submit a simple task that should complete quickly
    await page.fill(
      '[data-testid="prompt-input"]',
      'Write a hello world function',
    )
    await page.click('[data-testid="submit-button"]')

    // Wait for completion (with mocked responses, this should be fast)
    const hasCompletion = await page
      .locator('[data-testid="task-completed"]')
      .isVisible({ timeout: 30000 })
      .catch(() => false)
    const hasArtifacts = await page
      .locator('[data-testid="artifacts"]')
      .isVisible({ timeout: 30000 })
      .catch(() => false)
    const hasResults = await page
      .locator('[data-testid="task-results"]')
      .isVisible({ timeout: 30000 })
      .catch(() => false)

    expect(hasCompletion || hasArtifacts || hasResults).toBe(true)
  })

  test('should handle task cancellation', async ({ page }) => {
    await _.goHome()

    await page.fill(
      '[data-testid="prompt-input"]',
      'Create a complex application with multiple features',
    )
    await page.click('[data-testid="submit-button"]')

    // Look for cancel/stop button
    const cancelButton = page
      .locator('[data-testid="cancel-task"]')
      .or(page.locator('text="Cancel"'))
      .or(page.locator('text="Stop"'))
      .or(page.locator('[data-testid="stop-workflow"]'))

    if (await cancelButton.isVisible({ timeout: 10000 })) {
      await cancelButton.click()

      // Should show cancellation confirmation or immediate cancellation
      const isCancelled =
        (await page
          .locator('text="cancelled"')
          .isVisible({ timeout: 5000 })
          .catch(() => false)) ||
        (await page
          .locator('text="stopped"')
          .isVisible({ timeout: 5000 })
          .catch(() => false))

      expect(isCancelled).toBe(true)
    }
  })

  test('should show agent communication and coordination', async ({ page }) => {
    await _.goHome()

    await page.fill(
      '[data-testid="prompt-input"]',
      'Develop a multi-component system',
    )
    await page.click('[data-testid="submit-button"]')

    // Look for agent communication indicators
    const hasAgentChat = await page
      .locator('[data-testid="agent-chat"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)
    const hasMessages = await page
      .locator('[data-testid="agent-messages"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)
    const hasCoordination = await page
      .locator('[data-testid="coordination-panel"]')
      .isVisible({ timeout: 20000 })
      .catch(() => false)

    expect(hasAgentChat || hasMessages || hasCoordination).toBe(true)
  })

  test('should preserve workflow state during navigation', async ({ page }) => {
    await _.goHome()

    // Start a workflow
    await page.fill('[data-testid="prompt-input"]', 'Create a test project')
    await page.click('[data-testid="submit-button"]')

    // Wait for workflow to start
    await page.waitForSelector('[data-testid="task-progress"]', {
      timeout: 15000,
    })

    // Navigate away and back
    await _.navigateViaDrawer('Settings')
    await _.navigateViaDrawer('Home')

    // Workflow state should be preserved
    const workflowStillActive =
      (await page
        .locator('[data-testid="task-progress"]')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('[data-testid="workflow-status"]')
        .isVisible()
        .catch(() => false))

    expect(workflowStillActive).toBe(true)
  })
})
