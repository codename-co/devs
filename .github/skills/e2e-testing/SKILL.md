---
name: e2e-testing
description: Guide for writing end-to-end tests with Playwright in the DEVS platform. Use this when asked to write E2E tests, debug test failures, or set up test automation.
---

# End-to-End Testing with Playwright for DEVS

DEVS uses Playwright for end-to-end testing to ensure the application works correctly from a user's perspective.

## Test Location

E2E tests are located in `tests/e2e/` directory.

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/agents.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug specific test
npx playwright test --debug tests/e2e/agents.spec.ts
```

## Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/')
    // Wait for app to be ready
    await page.waitForSelector('[data-testid="app-ready"]')
  })

  test('should perform expected action', async ({ page }) => {
    // Arrange
    await page.click('[data-testid="create-button"]')

    // Act
    await page.fill('[data-testid="name-input"]', 'Test Name')
    await page.click('[data-testid="submit-button"]')

    // Assert
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })
})
```

## Page Object Pattern

For complex pages, use Page Object Model:

```typescript
// tests/e2e/pages/AgentsPage.ts
import { Page, Locator } from '@playwright/test'

export class AgentsPage {
  readonly page: Page
  readonly createButton: Locator
  readonly nameInput: Locator
  readonly submitButton: Locator
  readonly agentList: Locator

  constructor(page: Page) {
    this.page = page
    this.createButton = page.locator('[data-testid="create-agent-button"]')
    this.nameInput = page.locator('[data-testid="agent-name-input"]')
    this.submitButton = page.locator('[data-testid="submit-button"]')
    this.agentList = page.locator('[data-testid="agent-list"]')
  }

  async goto() {
    await this.page.goto('/agents')
  }

  async createAgent(name: string, role: string) {
    await this.createButton.click()
    await this.nameInput.fill(name)
    await this.page.locator('[data-testid="agent-role-input"]').fill(role)
    await this.submitButton.click()
  }

  async getAgentCount(): Promise<number> {
    return await this.agentList.locator('[data-testid="agent-card"]').count()
  }
}
```

Using Page Objects in tests:

```typescript
// tests/e2e/agents.spec.ts
import { test, expect } from '@playwright/test'
import { AgentsPage } from './pages/AgentsPage'

test.describe('Agents', () => {
  let agentsPage: AgentsPage

  test.beforeEach(async ({ page }) => {
    agentsPage = new AgentsPage(page)
    await agentsPage.goto()
  })

  test('should create a new agent', async () => {
    const initialCount = await agentsPage.getAgentCount()

    await agentsPage.createAgent('Test Agent', 'Test Role')

    await expect(agentsPage.agentList).toContainText('Test Agent')
    expect(await agentsPage.getAgentCount()).toBe(initialCount + 1)
  })
})
```

## Common Selectors

Prefer `data-testid` attributes for reliable selectors:

```tsx
// In component
<Button data-testid="submit-button">Submit</Button>
<Input data-testid="name-input" />
<div data-testid="agent-card">{agent.name}</div>
```

```typescript
// In test
await page.click('[data-testid="submit-button"]')
await page.fill('[data-testid="name-input"]', 'value')
```

## Waiting Strategies

```typescript
// Wait for element to be visible
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' })

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('[data-testid="navigate-button"]'),
])

// Wait for network request
await page.waitForResponse(
  (response) =>
    response.url().includes('/api/agents') && response.status() === 200,
)

// Wait for specific text
await expect(page.locator('body')).toContainText('Success')

// Custom wait with timeout
await page.waitForFunction(
  () => {
    return document.querySelectorAll('.agent-card').length > 0
  },
  { timeout: 10000 },
)
```

## Handling IndexedDB

Since DEVS uses IndexedDB, you may need to clear data between tests:

```typescript
test.beforeEach(async ({ page }) => {
  // Clear IndexedDB before each test
  await page.evaluate(async () => {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name)
      }
    }
  })

  await page.goto('/')
})
```

## Testing Conversations

```typescript
test('should send message and receive response', async ({ page }) => {
  // Navigate to chat
  await page.goto('/chat')

  // Type message
  await page.fill('[data-testid="message-input"]', 'Hello, agent!')
  await page.click('[data-testid="send-button"]')

  // Wait for response (may take time due to LLM)
  await expect(page.locator('[data-testid="message-list"]')).toContainText(
    'Hello, agent!',
    { timeout: 30000 },
  )

  // Verify response appeared
  await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({
    timeout: 60000,
  })
})
```

## Mocking LLM Responses

For faster, deterministic tests:

```typescript
test.beforeEach(async ({ page }) => {
  // Intercept LLM API calls
  await page.route('**/api/chat/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: 'Mocked response from LLM',
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
    })
  })
})
```

## Mobile Testing

Test responsive behavior:

```typescript
test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should show mobile menu', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('[data-testid="mobile-menu-button"]'),
    ).toBeVisible()
  })
})
```

## Screenshots and Traces

```typescript
test('visual regression test', async ({ page }) => {
  await page.goto('/agents')

  // Take screenshot for comparison
  await expect(page).toHaveScreenshot('agents-page.png')
})

// Enable tracing for debugging
test.use({ trace: 'on-first-retry' })
```

## Configuration

See `playwright.config.ts` for global configuration:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 4,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
```

## Best Practices

1. **Use data-testid**: Add test IDs to components for reliable selection
2. **Keep tests independent**: Each test should run in isolation
3. **Avoid flaky tests**: Use proper waits instead of arbitrary timeouts
4. **Test user journeys**: Focus on complete user flows
5. **Clean state**: Clear data between tests
6. **Mock external services**: Mock LLM and API calls for speed and reliability
