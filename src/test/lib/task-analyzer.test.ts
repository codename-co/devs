import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskAnalyzer } from '@/lib/task-analyzer'
import { LLMService } from '@/lib/llm'

// Mock LLM service
vi.mock('@/lib/llm', () => ({
  LLMService: {
    streamChat: vi.fn(),
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

const mockStreamChat = vi.mocked(LLMService.streamChat)

// Helper to make LLMService.streamChat return a given JSON response
function mockLLMResponse(response: Record<string, unknown>) {
  const json = JSON.stringify(response)
  mockStreamChat.mockImplementation(async function* () {
    yield json
  } as any)
}

describe('TaskAnalyzer.analyzePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse requestedAgentIdentifiers from LLM response', async () => {
    mockLLMResponse({
      requirements: [
        {
          type: 'functional',
          description: 'Audit the code for security issues',
          priority: 'must',
          source: 'explicit',
          validationCriteria: ['Security audit completed'],
        },
      ],
      complexity: 'simple',
      suggestedStrategy: 'single_agent',
      estimatedPasses: 1,
      estimatedDuration: 30,
      requiredSkills: ['security', 'code review'],
      suggestedAgents: [
        {
          name: 'Security Auditor',
          role: 'Security Reviewer',
          requiredSkills: ['security'],
          estimatedExperience: 'Senior',
          specialization: 'Application Security',
        },
      ],
      requestedAgentIdentifiers: ['security-expert'],
      requestedCapabilities: ['security auditing'],
    })

    const result = await TaskAnalyzer.analyzePrompt(
      'Use the security-expert agent to audit this code',
    )

    expect(result.requestedAgentIdentifiers).toEqual(['security-expert'])
    expect(result.requestedCapabilities).toEqual(['security auditing'])
  })

  it('should parse requestedCapabilities from LLM response', async () => {
    mockLLMResponse({
      requirements: [
        {
          type: 'functional',
          description: 'Build a data pipeline',
          priority: 'must',
          source: 'explicit',
          validationCriteria: ['Pipeline runs successfully'],
        },
      ],
      complexity: 'complex',
      suggestedStrategy: 'parallel_agents',
      estimatedPasses: 3,
      estimatedDuration: 120,
      requiredSkills: ['python', 'data engineering'],
      suggestedAgents: [],
      requestedAgentIdentifiers: [],
      requestedCapabilities: ['python', 'data analysis', 'machine learning'],
    })

    const result = await TaskAnalyzer.analyzePrompt(
      'I need someone expert in Python, data analysis, and machine learning to build a data pipeline',
    )

    expect(result.requestedCapabilities).toEqual([
      'python',
      'data analysis',
      'machine learning',
    ])
    expect(result.requestedAgentIdentifiers).toEqual([])
  })

  it('should default to empty arrays when LLM omits the new fields', async () => {
    mockLLMResponse({
      requirements: [
        {
          type: 'functional',
          description: 'Write fibonacci',
          priority: 'must',
          source: 'explicit',
          validationCriteria: ['Function works'],
        },
      ],
      complexity: 'simple',
      suggestedStrategy: 'single_agent',
      estimatedPasses: 1,
      estimatedDuration: 15,
      requiredSkills: ['javascript'],
      suggestedAgents: [],
      // No requestedAgentIdentifiers or requestedCapabilities
    })

    const result = await TaskAnalyzer.analyzePrompt(
      'Write a function that calculates fibonacci numbers',
    )

    expect(result.requestedAgentIdentifiers).toEqual([])
    expect(result.requestedCapabilities).toEqual([])
  })

  it('should include both agent identifiers and capabilities in a complex prompt', async () => {
    mockLLMResponse({
      requirements: [
        {
          type: 'functional',
          description: 'Review code and write documentation',
          priority: 'must',
          source: 'explicit',
          validationCriteria: ['Review and docs complete'],
        },
      ],
      complexity: 'complex',
      suggestedStrategy: 'parallel_agents',
      estimatedPasses: 2,
      estimatedDuration: 60,
      requiredSkills: ['code review', 'technical writing'],
      suggestedAgents: [],
      requestedAgentIdentifiers: ['code-reviewer', 'tech-writer'],
      requestedCapabilities: ['react', 'typescript'],
    })

    const result = await TaskAnalyzer.analyzePrompt(
      'Have the code-reviewer and tech-writer collaborate. They should be expert in React and TypeScript.',
    )

    expect(result.requestedAgentIdentifiers).toEqual([
      'code-reviewer',
      'tech-writer',
    ])
    expect(result.requestedCapabilities).toEqual(['react', 'typescript'])
  })

  it('should handle fallback analysis with empty preference fields', async () => {
    // Simulate LLM returning something with a JSON-like structure but
    // missing the new fields — the fallback parsing fills in defaults
    mockStreamChat.mockImplementation(async function* () {
      yield JSON.stringify({
        requirements: [],
        complexity: 'simple',
        suggestedStrategy: 'single_agent',
        estimatedPasses: 1,
        estimatedDuration: 10,
        requiredSkills: [],
        suggestedAgents: [],
        // Intentionally omit requestedAgentIdentifiers and requestedCapabilities
      })
    } as any)

    const result = await TaskAnalyzer.analyzePrompt('Do something simple')

    expect(result.requestedAgentIdentifiers).toEqual([])
    expect(result.requestedCapabilities).toEqual([])
  })
})

describe('TaskAnalyzer ANALYSIS_PROMPT', () => {
  it('should mention requestedAgentIdentifiers in the prompt schema', () => {
    // Access the prompt via the class to verify the schema includes the new fields
    // We test this by calling analyzePrompt and checking the messages sent to the LLM
    let capturedMessages: any[] = []
    mockStreamChat.mockImplementation(async function* (messages: any[]) {
      capturedMessages = messages
      yield JSON.stringify({
        requirements: [],
        complexity: 'simple',
        suggestedStrategy: 'single_agent',
        estimatedPasses: 1,
        estimatedDuration: 10,
        requiredSkills: [],
        suggestedAgents: [],
        requestedAgentIdentifiers: [],
        requestedCapabilities: [],
      })
    })

    TaskAnalyzer.analyzePrompt('test prompt').then(() => {
      const systemMessage = capturedMessages.find(
        (m: any) => m.role === 'system',
      )
      expect(systemMessage.content).toContain('requestedAgentIdentifiers')
      expect(systemMessage.content).toContain('requestedCapabilities')
    })
  })
})
