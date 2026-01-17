# End-to-End Testing with Playwright

This directory contains comprehensive end-to-end tests for the DEVS AI platform using [Playwright](https://playwright.dev/).

## Test Structure

```
tests/
├── e2e/
│   ├── fixtures/
│   │   └── test-base.ts          # Shared test utilities and fixtures
│   ├── core-user-journeys.spec.ts    # Core navigation and UI tests
│   ├── agent-management.spec.ts      # Agent creation, editing, selection
│   ├── knowledge-base.spec.ts        # File upload, sync, management
│   ├── llm-provider-config.spec.ts   # Settings and provider configuration
│   └── workflow-orchestration.spec.ts # Task execution and coordination
└── README.md                     # This file
```

## Running Tests

### Prerequisites

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run only smoke tests (core user journeys)
npm run test:e2e:smoke

# Show test report
npm run test:e2e:report
```

### Running Specific Test Suites

```bash
# Core navigation and UI functionality
npx playwright test tests/e2e/core-user-journeys.spec.ts

# Agent management features
npx playwright test tests/e2e/agent-management.spec.ts

# Knowledge base functionality
npx playwright test tests/e2e/knowledge-base.spec.ts

# LLM provider configuration
npx playwright test tests/e2e/llm-provider-config.spec.ts

# Workflow orchestration
npx playwright test tests/e2e/workflow-orchestration.spec.ts
```

## Test Coverage

### Core User Journeys

- ✅ Homepage loading and basic UI
- ✅ Navigation via app drawer
- ✅ Responsive design on mobile
- ✅ Browser back/forward navigation
- ✅ State persistence
- ✅ Error handling and 404 pages

### Agent Management

- ✅ Default DEVS agent display
- ✅ Agent creation workflow
- ✅ Agent detail views
- ✅ Form validation
- ✅ Search and filtering
- ✅ Agent selection and picker

### Knowledge Base

- ✅ File upload interface
- ✅ Folder synchronization UI
- ✅ File type categorization
- ✅ Search functionality
- ✅ Sync status indicators
- ✅ File operations and management

### LLM Provider Configuration

- ✅ Settings page access
- ✅ Provider selection
- ✅ API key configuration
- ✅ Connection validation
- ✅ Multiple provider support
- ✅ Security messaging

### Workflow Orchestration

- ✅ Task initiation from prompts
- ✅ Task breakdown and analysis
- ✅ Agent recruitment and coordination
- ✅ Progress tracking
- ✅ Requirement validation
- ✅ Task completion and artifacts

## Browser Support

Tests run on multiple browsers and devices:

- **Desktop Browsers**:
  - Chromium (Chrome/Edge)
  - Firefox
  - WebKit (Safari)

- **Mobile Devices**:
  - Mobile Chrome (Pixel 5)
  - Mobile Safari (iPhone 12)

## Test Configuration

The test configuration is defined in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000` (preview server)
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Parallel Execution**: Full parallelization
- **Reporters**: HTML, JSON, and GitHub (on CI)

## Test Fixtures and Utilities

### `DevsTestHelper` Class

The `DevsTestHelper` class provides common utilities for interacting with the DEVS platform:

```typescript
const helper = new DevsTestHelper(page)

// Navigate to home and wait for load
await helper.goHome()

// Navigate via the app drawer
await helper.navigateViaDrawer('Agents')

// Submit a prompt and wait for workflow
await helper.submitPrompt('Create a web page')

// Wait for task completion
await helper.waitForTaskCompletion()

// Mock service worker responses
await helper.mockServiceWorker()
```

### Test Base Setup

Each test automatically:

- Clears browser storage (localStorage, sessionStorage)
- Resets IndexedDB state
- Provides clean test environment
- Sets up error monitoring

## Continuous Integration

E2E tests run automatically on:

- **Push** to `main` or `develop` branches
- **Pull requests** to `main`
- **Daily schedule** at 2 AM UTC (for flaky test detection)

### CI Test Matrix

The CI runs tests across multiple configurations:

- All desktop browsers (Chromium, Firefox, WebKit)
- Mobile devices (Mobile Chrome, Mobile Safari)
- Smoke tests for quick feedback

## Best Practices

### Writing Tests

1. **Use data-testid attributes** for reliable element selection:

   ```typescript
   await page.click('[data-testid="submit-button"]')
   ```

2. **Handle async operations** with proper timeouts:

   ```typescript
   await page.waitForSelector('[data-testid="task-progress"]', {
     timeout: 30000,
   })
   ```

3. **Use flexible assertions** that account for dynamic UI:

   ```typescript
   const hasElement = await page
     .locator('[data-testid="element"]')
     .isVisible()
     .catch(() => false)
   expect(hasElement).toBe(true)
   ```

4. **Mock external dependencies** for reliable tests:
   ```typescript
   await helper.mockServiceWorker()
   ```

### Debugging Tests

1. **Run in headed mode** to see what's happening:

   ```bash
   npm run test:e2e:headed
   ```

2. **Use the interactive UI mode**:

   ```bash
   npm run test:e2e:ui
   ```

3. **Add debugging statements**:

   ```typescript
   await page.pause() // Pauses execution for inspection
   ```

4. **Check test artifacts** (screenshots, videos) in `test-results/`

## Maintenance

### Adding New Tests

1. Create new test files in `tests/e2e/`
2. Use the `test` and `expect` imports from `./fixtures/test-base`
3. Leverage the `DevsTestHelper` class for common operations
4. Add appropriate data-testid attributes to new UI components
5. Update this README with new test coverage

### Handling Flaky Tests

1. Use proper wait conditions instead of fixed delays
2. Make assertions more resilient to timing issues
3. Mock external dependencies when possible
4. Add retries for genuinely flaky but important tests

### Performance Considerations

- Tests run in parallel by default
- Use `test.describe.serial()` for tests that must run sequentially
- Consider browser resource limits when testing complex workflows
- Clean up test data and state between tests

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or improve wait conditions
2. **Element not found**: Check data-testid attributes exist in components
3. **Service worker issues**: Clear browser cache or restart test server
4. **IndexedDB errors**: Ensure proper database cleanup in test fixtures

### Getting Help

- Check the [Playwright documentation](https://playwright.dev/docs/intro)
- Review existing test patterns in the codebase
- Use the Playwright test generator: `npx playwright codegen localhost:3000`
