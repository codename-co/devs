import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  decomposeTask,
  type TaskDecomposition,
} from '@/lib/orchestrator/task-decomposer'
import type { TaskAnalysisResult } from '@/lib/task-analyzer'

// Mock dependencies
vi.mock('@/lib/llm', () => ({
  LLMService: {
    chat: vi.fn(),
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

const { LLMService } = await import('@/lib/llm')

const mockAnalysis: TaskAnalysisResult = {
  complexity: 'complex',
  requiredSkills: ['research', 'writing'],
  requirements: [
    {
      id: 'req-1',
      type: 'functional',
      description: 'Write a comprehensive report',
      priority: 'must',
      source: 'explicit',
      status: 'pending',
      validationCriteria: [],
      taskId: '',
      detectedAt: new Date(),
    },
  ],
  suggestedAgents: [
    {
      name: 'Researcher',
      role: 'Research Analyst',
      requiredSkills: ['research'],
      estimatedExperience: 'Senior',
      specialization: 'Research',
    },
  ],
  estimatedDuration: 30,
  estimatedPasses: 3,
  suggestedStrategy: 'parallel_agents',
}

describe('decomposeTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('LLM-driven decomposition', () => {
    it('should parse a valid LLM decomposition response', async () => {
      const mockResponse: TaskDecomposition = {
        mainTaskTitle: 'AI Market Research',
        mainTaskDescription: 'Research the AI market landscape',
        subTasks: [
          {
            tempId: 'research',
            title: 'Market Research',
            description: 'Research AI market trends and players',
            complexity: 'complex',
            dependsOn: [],
            parallelizable: true,
            ioContract: {
              outputs: [{ key: 'findings', description: 'Research findings' }],
            },
            executionMode: 'iterative',
            modelHint: 'balanced',
            requirements: [
              {
                type: 'functional',
                description: 'Cover top 10 players',
                priority: 'must',
              },
            ],
            suggestedAgent: {
              name: 'Market Researcher',
              role: 'Analyst',
              requiredSkills: ['research'],
              specialization: 'Market analysis',
            },
          },
          {
            tempId: 'synthesize',
            title: 'Report Writing',
            description: 'Write the final report based on research',
            complexity: 'simple',
            dependsOn: ['research'],
            parallelizable: false,
            ioContract: {
              inputs: [
                { taskId: 'research', description: 'Research findings' },
              ],
              outputs: [{ key: 'report', description: 'Final report' }],
            },
            executionMode: 'single-shot',
            modelHint: 'powerful',
            requirements: [],
            suggestedAgent: {
              name: 'Writer',
              role: 'Report Writer',
              requiredSkills: ['writing'],
              specialization: 'Report writing',
            },
          },
        ],
        requiresSynthesis: false,
        strategy: 'sequential_agents',
        estimatedDuration: 30,
      }

      vi.mocked(LLMService.chat).mockResolvedValue({
        content: JSON.stringify(mockResponse),
      })

      const result = await decomposeTask('Research the AI market', mockAnalysis)

      expect(result.subTasks).toHaveLength(2)
      expect(result.subTasks[0].tempId).toBe('research')
      expect(result.subTasks[1].tempId).toBe('synthesize')
      expect(result.subTasks[1].dependsOn).toContain('research')
      expect(result.strategy).toBe('sequential_agents')
    })

    it('should parse JSON from code blocks', async () => {
      const mockResponse: TaskDecomposition = {
        mainTaskTitle: 'Test',
        mainTaskDescription: 'Test task',
        subTasks: [
          {
            tempId: 'task1',
            title: 'Task 1',
            description: 'Do task 1',
            complexity: 'simple',
            dependsOn: [],
            parallelizable: false,
            ioContract: {},
            executionMode: 'single-shot',
            modelHint: 'fast',
            requirements: [],
            suggestedAgent: {
              name: 'Agent',
              role: 'Worker',
              requiredSkills: [],
              specialization: 'General',
            },
          },
        ],
        requiresSynthesis: false,
        strategy: 'single_agent',
        estimatedDuration: 5,
      }

      vi.mocked(LLMService.chat).mockResolvedValue({
        content: '```json\n' + JSON.stringify(mockResponse) + '\n```',
      })

      const result = await decomposeTask('Simple task', mockAnalysis)
      expect(result.subTasks).toHaveLength(1)
    })
  })

  describe('heuristic fallback', () => {
    it('should use research decomposition for research prompts', async () => {
      vi.mocked(LLMService.chat).mockRejectedValue(new Error('LLM failed'))

      const result = await decomposeTask(
        'Research the latest advances in quantum computing',
        mockAnalysis,
      )

      expect(result.subTasks.length).toBeGreaterThanOrEqual(2)
      expect(result.subTasks[0].tempId).toBe('research')
      expect(result.strategy).toBe('sequential_agents')
    })

    it('should use creative decomposition for writing prompts', async () => {
      vi.mocked(LLMService.chat).mockRejectedValue(new Error('LLM failed'))

      const result = await decomposeTask(
        'Write a short story about a robot learning to paint',
        mockAnalysis,
      )

      expect(result.subTasks.length).toBeGreaterThanOrEqual(2)
      expect(result.subTasks[0].tempId).toBe('plan')
    })

    it('should use development decomposition for dev prompts', async () => {
      vi.mocked(LLMService.chat).mockRejectedValue(new Error('LLM failed'))

      const result = await decomposeTask(
        'Implement a REST API for user management',
        mockAnalysis,
      )

      expect(result.subTasks.length).toBeGreaterThanOrEqual(2)
      expect(result.subTasks[0].tempId).toBe('design')
    })

    it('should use analysis decomposition for analysis prompts', async () => {
      vi.mocked(LLMService.chat).mockRejectedValue(new Error('LLM failed'))

      const result = await decomposeTask(
        'Evaluate the performance of our marketing campaigns',
        mockAnalysis,
      )

      expect(result.subTasks.length).toBeGreaterThanOrEqual(2)
      expect(result.subTasks[0].tempId).toBe('gather')
    })

    it('should use generic decomposition for unknown domains', async () => {
      vi.mocked(LLMService.chat).mockRejectedValue(new Error('LLM failed'))

      const result = await decomposeTask(
        'Help me organize my thoughts about the future',
        mockAnalysis,
      )

      expect(result.subTasks.length).toBeGreaterThanOrEqual(2)
      expect(result.subTasks[0].tempId).toBe('plan')
      expect(result.subTasks[1].tempId).toBe('execute')
    })

    it('should fall back when no provider configured', async () => {
      const { CredentialService } = await import('@/lib/credential-service')
      vi.mocked(CredentialService.getActiveConfig).mockResolvedValueOnce(null)

      const result = await decomposeTask(
        'Research quantum computing',
        mockAnalysis,
      )

      // Should use heuristic fallback
      expect(result.subTasks.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('validation', () => {
    it('should reject circular dependencies', async () => {
      const circularResponse = {
        mainTaskTitle: 'Test',
        mainTaskDescription: 'Test',
        subTasks: [
          {
            tempId: 'a',
            title: 'A',
            description: 'Task A',
            complexity: 'simple',
            dependsOn: ['b'],
            parallelizable: false,
            ioContract: {},
            executionMode: 'single-shot',
            modelHint: 'fast',
            requirements: [],
            suggestedAgent: {
              name: 'A',
              role: 'A',
              requiredSkills: [],
              specialization: 'A',
            },
          },
          {
            tempId: 'b',
            title: 'B',
            description: 'Task B',
            complexity: 'simple',
            dependsOn: ['a'],
            parallelizable: false,
            ioContract: {},
            executionMode: 'single-shot',
            modelHint: 'fast',
            requirements: [],
            suggestedAgent: {
              name: 'B',
              role: 'B',
              requiredSkills: [],
              specialization: 'B',
            },
          },
        ],
        requiresSynthesis: false,
        strategy: 'sequential_agents',
        estimatedDuration: 5,
      }

      vi.mocked(LLMService.chat).mockResolvedValue({
        content: JSON.stringify(circularResponse),
      })

      // Should fall back to heuristic due to circular dep
      const result = await decomposeTask('Do something', mockAnalysis)
      // Fallback heuristic won't have circular deps
      const hasCircular = result.subTasks.some((t) =>
        t.dependsOn.some((dep) =>
          result.subTasks
            .find((d) => d.tempId === dep)
            ?.dependsOn.includes(t.tempId),
        ),
      )
      expect(hasCircular).toBe(false)
    })
  })
})
