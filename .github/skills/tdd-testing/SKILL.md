---
name: tdd-testing
description: Guide for Test-Driven Development in the DEVS platform. Use this when asked to write tests, implement TDD, or add test coverage for lib/ and stores/ code.
---

# Test-Driven Development (TDD) for DEVS

TDD is **mandatory** for all code in `src/lib/` and `src/stores/`. This ensures LLMs can safely enhance features without causing regressions.

## TDD Workflow

1. **Red**: Write a failing test that describes the expected behavior
2. **Green**: Write the minimum code necessary to make the test pass
3. **Refactor**: Improve the code while keeping tests green
4. **Verify**: Run `npm run test:coverage` before committing

## Test File Structure

Tests mirror the source structure:

- `src/lib/orchestrator.ts` → `src/test/lib/orchestrator.test.ts`
- `src/stores/agentStore.ts` → `src/test/stores/agentStore.test.ts`
- `src/components/AgentCard.tsx` → `src/test/components/AgentCard.test.tsx`

## Coverage Requirements

| Category            | Target   | Priority    |
| ------------------- | -------- | ----------- |
| `src/lib/**`        | **60%+** | 🔴 Critical |
| `src/stores/**`     | **60%+** | 🔴 Critical |
| `src/components/**` | 30%+     | 🟡 Medium   |
| `src/pages/**`      | 20%+     | 🟢 Low      |

## Test Commands

```bash
# Run tests in watch mode (recommended during development)
npm run test:watch

# Run all tests once
npm run test:run

# Run with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Unit Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Import the module under test
import { myFunction, MyClass } from '@/lib/my-module'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    entities: {
      toArray: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('myFunction', () => {
  beforeEach(() => {
    // Reset mocks and state before each test
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test
  })

  describe('when given valid input', () => {
    it('should return expected result', () => {
      const result = myFunction('valid input')
      expect(result).toBe('expected output')
    })

    it('should handle edge cases', () => {
      const result = myFunction('')
      expect(result).toBe('')
    })
  })

  describe('when given invalid input', () => {
    it('should throw an error', () => {
      expect(() => myFunction(null as any)).toThrow('Invalid input')
    })
  })
})

describe('MyClass', () => {
  let instance: MyClass

  beforeEach(() => {
    instance = new MyClass()
  })

  it('should initialize with default values', () => {
    expect(instance.value).toBe(0)
  })

  it('should update value correctly', () => {
    instance.setValue(42)
    expect(instance.value).toBe(42)
  })
})
```

## Store Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEntityStore } from '@/stores/entityStore'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    entities: {
      toArray: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
    },
  },
}))

describe('entityStore', () => {
  beforeEach(() => {
    // Reset store state
    useEntityStore.setState({
      entities: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('loadEntities', () => {
    it('should load entities from database', async () => {
      const mockEntities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ]
      vi.mocked(db.entities.toArray).mockResolvedValue(mockEntities)

      await useEntityStore.getState().loadEntities()

      expect(useEntityStore.getState().entities).toEqual(mockEntities)
      expect(useEntityStore.getState().isLoading).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(db.entities.toArray).mockRejectedValue(new Error('DB error'))

      await useEntityStore.getState().loadEntities()

      expect(useEntityStore.getState().error).toBe('DB error')
      expect(useEntityStore.getState().isLoading).toBe(false)
    })
  })

  describe('createEntity', () => {
    it('should create entity with generated id', async () => {
      vi.mocked(db.entities.add).mockResolvedValue('new-id')

      const result = await useEntityStore.getState().createEntity({
        name: 'New Entity',
      })

      expect(result).toHaveProperty('id')
      expect(result.name).toBe('New Entity')
      expect(db.entities.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Entity',
        }),
      )
    })
  })

  describe('getEntityById', () => {
    it('should return entity when found', () => {
      useEntityStore.setState({
        entities: [{ id: '1', name: 'Test' }],
      })

      const result = useEntityStore.getState().getEntityById('1')
      expect(result).toEqual({ id: '1', name: 'Test' })
    })

    it('should return undefined when not found', () => {
      const result = useEntityStore.getState().getEntityById('nonexistent')
      expect(result).toBeUndefined()
    })
  })
})
```

## Component Test Template

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MyComponent } from '@/components/MyComponent'

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('MyComponent', () => {
  it('renders correctly with required props', () => {
    render(<MyComponent title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('calls onAction when button is clicked', async () => {
    const mockOnAction = vi.fn()
    render(<MyComponent title="Test" onAction={mockOnAction} />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledTimes(1)
    })
  })

  it('disables button when isDisabled is true', () => {
    render(<MyComponent title="Test" isDisabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders children correctly', () => {
    render(
      <MyComponent title="Test">
        <span>Child content</span>
      </MyComponent>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })
})
```

## Async Testing Patterns

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('async operations', () => {
  // Testing async functions
  it('should resolve with expected value', async () => {
    const result = await asyncFunction()
    expect(result).toBe('expected')
  })

  // Testing rejected promises
  it('should reject with error', async () => {
    await expect(asyncFunction('invalid')).rejects.toThrow('Error message')
  })

  // Testing with fake timers
  it('should debounce calls', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    debouncedFunction(callback)
    debouncedFunction(callback)
    debouncedFunction(callback)

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    expect(callback).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
```

## Mocking Patterns

```typescript
// Mock module
vi.mock('@/lib/llm', () => ({
  LLMService: {
    chat: vi.fn().mockResolvedValue({ content: 'mocked response' }),
  },
}))

// Mock function
const mockFn = vi.fn()
mockFn.mockReturnValue('value')
mockFn.mockResolvedValue('async value')
mockFn.mockImplementation((x) => x * 2)

// Spy on existing function
const spy = vi.spyOn(object, 'method')
expect(spy).toHaveBeenCalledWith(expectedArgs)

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-123',
})
```

## Best Practices

1. **One assertion per test** when possible, or related assertions
2. **Descriptive test names**: `it('should return null when user is not found')`
3. **Arrange-Act-Assert pattern**: Setup → Execute → Verify
4. **Isolate tests**: Each test should be independent
5. **Test behavior, not implementation**: Focus on what, not how
6. **Use meaningful test data**: Avoid magic numbers/strings
