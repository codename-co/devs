import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { IndexPage } from '@/pages/Index.page'

// Mock the stores and services
vi.mock('@/stores/taskStore', () => ({
  useTaskStore: () => ({
    tasks: [],
    loadTasks: vi.fn(),
    createTaskWithRequirements: vi.fn().mockResolvedValue({
      id: 'c40c3512-a8d5-4da1-b327-31bf2830f18e', // UUID format
    }),
  }),
}))

vi.mock('@/stores/agentStore', () => ({
  getAgentById: vi.fn(),
  getDefaultAgent: vi
    .fn()
    .mockReturnValue({ id: 'devs', name: 'Devs Orchestrator' }),
}))

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: () => ({
    conversations: [],
  }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    user: null,
    isDrawerCollapsed: false,
    toggleDrawer: vi.fn(),
  }),
}))

vi.mock('@/lib/orchestrator')

// Mock components
vi.mock('@/components', () => ({
  Icon: ({ name, ...props }: any) => (
    <div data-testid="icon" data-name={name} {...props} />
  ),
  PromptArea: ({ onSend, value, onValueChange }: any) => (
    <div data-testid="prompt-area">
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        data-testid="prompt-textarea"
      />
      <button onClick={onSend} data-testid="submit-button">
        Submit
      </button>
    </div>
  ),
  Section: ({ children }: any) => <div data-testid="section">{children}</div>,
  Title: ({ children }: any) => <h1>{children}</h1>,
}))

vi.mock('@/layouts/Default', () => ({
  default: ({ children }: any) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

vi.mock('@/config/product', () => ({
  PRODUCT: {
    displayName: 'Test Product',
  },
}))

vi.mock('@/i18n')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock i18n
const mockT = (key: string, options?: any) => {
  if (options) {
    return key.replace(/\{(\w+)\}/g, (match, prop) => options[prop] || match)
  }
  return key
}

const mockUrl = (path: string) => path

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: mockT,
    url: mockUrl,
    lang: 'en',
  }),
}))

describe('Navigation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })

    // Mock document.startViewTransition
    Object.defineProperty(document, 'startViewTransition', {
      value: vi.fn((callback) => callback()),
      writable: true,
    })
  })

  it('should navigate to task page instead of agent run page when submitting prompt', async () => {
    // Arrange
    const testPrompt = 'Create a todo app'

    render(
      <BrowserRouter>
        <IndexPage />
      </BrowserRouter>,
    )

    // Get the prompt textarea and submit button
    const promptArea = screen.getByTestId('prompt-textarea')
    const submitButton = screen.getByTestId('submit-button')

    // Act - Type in the prompt
    fireEvent.change(promptArea, { target: { value: testPrompt } })

    // Act - Submit the form
    fireEvent.click(submitButton)

    // Assert - Should navigate to a task page, not agent run page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
      const navigationCall = mockNavigate.mock.calls[0][0]

      // Should navigate to /tasks/<taskId>, not /agents/run#devs
      expect(navigationCall).toMatch(/^\/tasks\/[a-f0-9-]{36}$/)
      expect(navigationCall).not.toMatch(/^\/agents\/run/)
    })
  })

  it('should create a task before navigation', async () => {
    // This test will verify that a task is actually created during the submission process
    // We'll implement this after we have the task creation logic in place
  })

  it('should handle agent selection in navigation', async () => {
    // This test will verify that the selected agent is properly handled during navigation
    // We'll implement this after we have the task creation logic in place
  })
})
