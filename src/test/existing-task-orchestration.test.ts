import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowOrchestrator } from '@/lib/orchestrator'

// Mock internal orchestrator modules to avoid deep dependency chains
vi.mock('@/lib/orchestrator/agent-runner', () => ({
  runAgent: vi.fn().mockResolvedValue({
    response: 'Test response',
    success: true,
    turnsUsed: 1,
    toolCallsLog: [],
  }),
  runAgentSingleShot: vi.fn().mockResolvedValue({
    response: 'Test response',
    success: true,
    turnsUsed: 1,
    toolCallsLog: [],
  }),
}))

vi.mock('@/lib/orchestrator/task-decomposer', () => ({
  decomposeTask: vi.fn().mockResolvedValue({
    mainTaskTitle: 'Test Task',
    tasks: [],
    strategy: 'sequential',
  }),
}))

vi.mock('@/lib/orchestrator/synthesis-engine', () => ({
  synthesizeResults: vi.fn().mockResolvedValue({
    content: 'Synthesized result',
    format: 'markdown',
    sources: [],
  }),
  mergeResults: vi.fn().mockReturnValue('Merged result'),
}))

// Mock all the dependencies
vi.mock('@/lib/task-analyzer', () => ({
  TaskAnalyzer: {
    analyzePrompt: vi.fn().mockResolvedValue({
      complexity: 'simple',
      requiredSkills: ['JavaScript'],
      estimatedPasses: 1,
      suggestedAgents: [],
      requirements: [],
      estimatedDuration: 5,
    }),
    createTaskPlan: vi.fn(),
    extractTaskTitle: vi.fn().mockReturnValue('Test Task'),
    breakdownTask: vi.fn(),
    extractKeywords: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('@/stores/taskStore', () => ({
  useTaskStore: {
    getState: vi.fn().mockReturnValue({
      createTask: vi.fn(),
      getTaskById: vi.fn(),
      updateTask: vi.fn().mockResolvedValue(undefined),
      validateAndUpdateRequirements: vi.fn().mockResolvedValue({
        allSatisfied: true,
        results: [],
        satisfactionRate: 100,
      }),
    }),
  },
}))

vi.mock('@/stores/agentStore', () => ({
  getAgentById: vi.fn(),
  getDefaultAgent: vi.fn().mockReturnValue({
    id: 'devs',
    name: 'DEVS',
    slug: 'devs',
    role: 'Orchestrator',
    instructions: 'Default orchestrator agent',
    tags: [],
  }),
  loadAllAgents: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/context-broker', () => ({
  ContextBroker: {
    getRelevantContexts: vi.fn().mockResolvedValue([]),
    publishContext: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/artifact-manager', () => ({
  ArtifactManager: {
    createArtifact: vi.fn().mockResolvedValue({}),
    getArtifactsByTask: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: {
    getState: vi.fn().mockReturnValue({
      createConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
      addMessage: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock('@/lib/llm', () => ({
  LLMService: {
    streamChat: vi.fn().mockImplementation(async function* () {
      yield 'Test response'
    }),
  },
}))

vi.mock('@/lib/credential-service', () => ({
  CredentialService: {
    getActiveConfig: vi.fn().mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
    }),
  },
}))

describe('Existing Task Orchestration', () => {
  let mockUpdateTask: any
  let mockGetTaskById: any
  let mockCreateTask: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Clear any running orchestrations from previous tests
    ;(WorkflowOrchestrator as any).runningOrchestrations.clear()

    // Get the mocked functions
    const { useTaskStore } = await import('@/stores/taskStore')
    const taskStore = vi.mocked(useTaskStore).getState()
    mockUpdateTask = vi.mocked(taskStore.updateTask)
    mockGetTaskById = vi.mocked(taskStore.getTaskById)
    mockCreateTask = vi.mocked(taskStore.createTask)
  })

  it('should use existing task instead of creating new one when existingTaskId is provided', async () => {
    // Arrange
    const prompt = 'Create a todo app'
    const existingTaskId = 'existing-task-123'
    const existingTask = {
      id: existingTaskId,
      workflowId: 'workflow-456',
      title: 'Existing Task',
      description: prompt,
      complexity: 'simple' as const,
      status: 'pending' as const,
      requirements: [],
      dependencies: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedTask = {
      ...existingTask,
      complexity: 'simple' as const,
      estimatedPasses: 1,
      requirements: [],
    }

    mockGetTaskById
      .mockResolvedValue(existingTask)
      .mockResolvedValueOnce(existingTask)
      .mockResolvedValueOnce(updatedTask)

    // Act
    const result = await WorkflowOrchestrator.orchestrateTask(
      prompt,
      existingTaskId,
    )

    // Assert
    expect(result.success).toBe(true)
    expect(result.mainTaskId).toBe(existingTaskId)

    // Should have updated the existing task, not created a new one
    expect(mockUpdateTask).toHaveBeenCalledWith(
      existingTaskId,
      expect.objectContaining({
        complexity: 'simple',
        estimatedPasses: 1,
      }),
    )

    // Should NOT have created a new task
    expect(mockCreateTask).not.toHaveBeenCalled()

    // Should have retrieved the existing task at least once
    expect(mockGetTaskById).toHaveBeenCalledWith(existingTaskId)
    expect(mockGetTaskById.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('should create new task when existingTaskId is not provided (fallback)', async () => {
    // Arrange
    const prompt = 'Create a todo app'
    const newTask = {
      id: 'new-task-789',
      workflowId: 'workflow-new',
      title: 'Test Task',
      description: prompt,
      complexity: 'simple' as const,
      status: 'pending' as const,
      requirements: [],
      dependencies: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockCreateTask.mockResolvedValue(newTask)

    // Act
    const result = await WorkflowOrchestrator.orchestrateTask(prompt)

    // Assert
    expect(result.success).toBe(true)
    expect(result.mainTaskId).toBe(newTask.id)

    // Should have created a new task
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Task',
        description: prompt,
        complexity: 'simple',
      }),
    )

    // Should NOT have tried to get an existing task during creation phase
    expect(mockGetTaskById).not.toHaveBeenCalled()

    // Should have updated the task during execution (for agent assignment and completion)
    expect(mockUpdateTask).toHaveBeenCalled()

    // The first update should be for agent assignment, second for completion
    expect(mockUpdateTask.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        status: 'in_progress',
        assignedAgentId: 'devs',
      }),
    )
    expect(mockUpdateTask.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        status: 'completed',
      }),
    )
  })

  it('should throw error if existingTaskId is provided but task not found', async () => {
    // Arrange
    const prompt = 'Create a todo app'
    const nonExistentTaskId = 'non-existent-task-123'

    mockGetTaskById.mockResolvedValue(null)

    // Act & Assert
    await expect(
      WorkflowOrchestrator.orchestrateTask(prompt, nonExistentTaskId),
    ).rejects.toThrow(`Existing task ${nonExistentTaskId} not found`)

    expect(mockGetTaskById).toHaveBeenCalledWith(nonExistentTaskId)
    expect(mockUpdateTask).not.toHaveBeenCalled()
    expect(mockCreateTask).not.toHaveBeenCalled()
  })
})
