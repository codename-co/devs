import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowOrchestrator } from '@/lib/orchestrator'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { TaskPage } from '@/pages/Task.page'

// Mock functions
const mockGetTaskById = vi.fn()
const mockGetArtifactsByTask = vi.fn()
const mockOrchestratTask = vi.fn()

// Mock the stores and services
vi.mock('@/stores/taskStore', () => ({
  useTaskStore: () => ({
    getTaskById: mockGetTaskById,
  }),
}))

vi.mock('@/stores/artifactStore', () => ({
  useArtifactStore: () => ({
    getArtifactsByTask: mockGetArtifactsByTask,
  }),
}))

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: () => ({
    conversations: [],
  }),
}))

vi.mock('@/stores/agentStore', () => ({
  getAgentById: vi.fn(),
}))

vi.mock('@/lib/orchestrator', () => ({
  WorkflowOrchestrator: {
    orchestrateTask: vi.fn(),
  },
}))

vi.mock('@/lib/task-timeline', () => ({
  buildTimelineEvents: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/toast', () => ({
  errorToast: vi.fn(),
}))

// Mock i18n
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    url: (path: string) => path,
    lang: 'en',
  }),
}))

// Mock components and layouts
vi.mock('@/components', () => ({
  Container: ({ children }: any) => <div data-testid="container">{children}</div>,
  Icon: ({ name, ...props }: any) => <div data-testid="icon" data-name={name} {...props} />,
  MarkdownRenderer: ({ content }: any) => <div data-testid="markdown">{content}</div>,
  Section: ({ children }: any) => <div data-testid="section">{children}</div>,
}))

vi.mock('@/layouts/Default', () => ({
  default: ({ children }: any) => <div data-testid="default-layout">{children}</div>,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ taskId: 'test-task-id' }),
    useLocation: () => ({ pathname: '/tasks/test-task-id' }),
  }
})

// Mock HeroUI components
vi.mock('@heroui/react', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Chip: ({ children }: any) => <span data-testid="chip">{children}</span>,
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
  CheckboxGroup: ({ children }: any) => <div data-testid="checkbox-group">{children}</div>,
  Checkbox: ({ children }: any) => <label data-testid="checkbox">{children}</label>,
}))

describe('Task Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetArtifactsByTask.mockResolvedValue([])
    
    // Setup the orchestrator mock
    vi.mocked(WorkflowOrchestrator.orchestrateTask).mockImplementation(mockOrchestratTask)
  })

  it('should trigger orchestration for pending tasks', async () => {
    // Arrange
    const pendingTask = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: 'Create a todo app',
      complexity: 'complex' as const,
      status: 'pending' as const,
      assignedAgentId: 'devs',
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const completedTask = {
      ...pendingTask,
      status: 'completed' as const,
      completedAt: new Date(),
    }

    // Mock task loading and orchestration
    mockGetTaskById
      .mockResolvedValueOnce(pendingTask) // Initial load
      .mockResolvedValueOnce(completedTask) // After orchestration

    mockOrchestratTask.mockResolvedValue({
      success: true,
      workflowId: 'test-workflow-id',
      mainTaskId: 'test-task-id',
      subTaskIds: [],
      artifacts: [],
    })

    // Act
    render(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Assert - Should trigger orchestration for pending task
    await waitFor(() => {
      expect(mockOrchestratTask).toHaveBeenCalledWith('Create a todo app', 'test-task-id')
    })

    // Assert - Should reload task after orchestration  
    await waitFor(() => {
      expect(mockGetTaskById).toHaveBeenCalledWith('test-task-id')
      expect(mockGetTaskById.mock.calls.length).toBeGreaterThanOrEqual(2) // Initial load + reload after orchestration (may be called more due to effect dependencies)
    })
  })

  it('should not trigger orchestration for completed tasks', async () => {
    // Arrange
    const completedTask = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: 'Create a todo app',
      complexity: 'complex' as const,
      status: 'completed' as const,
      assignedAgentId: 'devs',
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    }

    mockGetTaskById.mockResolvedValue(completedTask)

    // Act
    render(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Assert - Should not trigger orchestration for completed task
    await waitFor(() => {
      expect(mockGetTaskById).toHaveBeenCalledTimes(1) // Only initial load
    })

    expect(mockOrchestratTask).not.toHaveBeenCalled()
  })

  it('should not trigger orchestration for tasks without description', async () => {
    // Arrange
    const taskWithoutDescription = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: '', // Empty description
      complexity: 'complex' as const,
      status: 'pending' as const,
      assignedAgentId: 'devs',
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetTaskById.mockResolvedValue(taskWithoutDescription)

    // Act
    render(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Assert - Should not trigger orchestration without description
    await waitFor(() => {
      expect(mockGetTaskById).toHaveBeenCalledTimes(1) // Only initial load
    })

    expect(mockOrchestratTask).not.toHaveBeenCalled()
  })

  it('should prevent duplicate orchestration when orchestrator rejects with duplicate error', async () => {
    // Arrange
    const pendingTask = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: 'Create a todo app',
      complexity: 'complex' as const,
      status: 'pending' as const,
      assignedAgentId: 'devs',
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetTaskById.mockResolvedValue(pendingTask)
    mockOrchestratTask.mockRejectedValue(new Error('Orchestration already in progress for this prompt'))

    // Act
    render(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Assert - Should attempt orchestration but handle the duplicate error gracefully
    await waitFor(() => {
      expect(mockOrchestratTask).toHaveBeenCalled()
    })

    // Should still load the page normally despite the duplicate error
    await waitFor(() => {
      expect(screen.getByTestId('default-layout')).toBeInTheDocument()
    })
  })

  it('should handle orchestration failures gracefully', async () => {
    // Arrange
    const pendingTask = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: 'Create a todo app',
      complexity: 'complex' as const,
      status: 'pending' as const,
      assignedAgentId: 'devs',
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetTaskById.mockResolvedValue(pendingTask)
    mockOrchestratTask.mockRejectedValue(new Error('Orchestration failed'))

    // Mock error toast to verify it's called
    const mockErrorToast = vi.fn()
    vi.doMock('@/lib/toast', () => ({
      errorToast: mockErrorToast,
    }))

    // Act
    render(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Assert - Should handle orchestration failure
    await waitFor(() => {
      expect(mockOrchestratTask).toHaveBeenCalled()
    })

    // Should still load the page normally
    await waitFor(() => {
      expect(screen.getByTestId('default-layout')).toBeInTheDocument()
    })
  })

  it('should only trigger orchestration once per task even with multiple effect runs', async () => {
    // Arrange
    const pendingTask = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: 'Create a todo app',
      complexity: 'complex' as const,
      status: 'pending' as const,
      assignedAgentId: 'devs',
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Mock task loading to always return the same pending task
    mockGetTaskById.mockResolvedValue(pendingTask)

    mockOrchestratTask.mockResolvedValue({
      success: true,
      workflowId: 'test-workflow-id',
      mainTaskId: 'test-task-id',
      subTaskIds: [],
      artifacts: [],
    })

    // Act
    const { rerender } = render(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Wait for initial orchestration
    await waitFor(() => {
      expect(mockOrchestratTask).toHaveBeenCalledTimes(1)
    })

    // Force re-render multiple times to simulate effect re-runs
    rerender(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    rerender(
      <BrowserRouter>
        <TaskPage />
      </BrowserRouter>
    )

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 100))

    // Assert - Should only have called orchestration once despite multiple renders
    expect(mockOrchestratTask).toHaveBeenCalledTimes(1)
    expect(mockOrchestratTask).toHaveBeenCalledWith('Create a todo app', 'test-task-id')
  })
})