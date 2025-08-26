import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowOrchestrator } from '@/lib/orchestrator'

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
      suggestedStrategy: 'single-pass',
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
      createTask: vi.fn().mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        requirements: [],
        workflowId: 'workflow-1',
      }),
      getTaskById: vi.fn().mockResolvedValue(null),
      updateTask: vi.fn(),
      markRequirementSatisfied: vi.fn(),
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
  createAgent: vi.fn().mockResolvedValue({
    id: 'agent-1',
    name: 'Test Agent',
    role: 'Task Executor',
    instructions: 'Test instructions',
    createdAt: new Date(),
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

describe('Orchestration Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Clear any running orchestrations from previous tests
    ;(WorkflowOrchestrator as any).runningOrchestrations.clear()
  })

  it('should prevent duplicate orchestrations for the same prompt', async () => {
    // Arrange
    const prompt = 'Create a todo app'

    // Make the first orchestration take some time to simulate a real scenario
    const { TaskAnalyzer } = await import('@/lib/task-analyzer')
    vi.mocked(TaskAnalyzer.analyzePrompt).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                complexity: 'simple',
                requiredSkills: ['JavaScript'],
                estimatedPasses: 1,
                suggestedAgents: [],
                requirements: [],
                estimatedDuration: 5,
                suggestedStrategy: 'hierarchical',
              }),
            100,
          ),
        ),
    )

    // Act - Start two orchestrations simultaneously for the same prompt
    const orchestration1Promise = WorkflowOrchestrator.orchestrateTask(prompt)
    const orchestration2Promise = WorkflowOrchestrator.orchestrateTask(prompt)

    // Assert - First orchestration should succeed, second should be rejected with duplicate error
    await expect(orchestration1Promise).resolves.toBeDefined()
    await expect(orchestration2Promise).rejects.toThrow(
      'Orchestration already in progress for this task',
    )
  })

  it('should allow orchestrations for different prompts to run simultaneously', async () => {
    // Arrange
    const prompt1 = 'Create a todo app'
    const prompt2 = 'Create a blog system'

    // Act - Start orchestrations for different prompts with some delay between them
    const orchestration1Promise = WorkflowOrchestrator.orchestrateTask(prompt1)

    // Add a small delay before starting the second one to ensure different execution paths
    await new Promise((resolve) => setTimeout(resolve, 10))
    const orchestration2Promise = WorkflowOrchestrator.orchestrateTask(prompt2)

    // Assert - Both should succeed (no duplicate detection across different prompts)
    const results = await Promise.allSettled([
      orchestration1Promise,
      orchestration2Promise,
    ])

    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('fulfilled')
  })

  it('should allow the same prompt to be orchestrated again after the first one completes', async () => {
    // Arrange
    const prompt = 'Create a todo app'

    // Act - Run first orchestration and wait for completion
    const result1 = await WorkflowOrchestrator.orchestrateTask(prompt)
    expect(result1).toBeDefined()

    // Act - Run second orchestration for same prompt (should succeed since first completed)
    const result2 = await WorkflowOrchestrator.orchestrateTask(prompt)
    expect(result2).toBeDefined()

    // Assert - Both should have succeeded
    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
  })
})
