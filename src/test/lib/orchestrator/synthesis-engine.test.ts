import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  synthesizeResults,
  mergeResults,
  type SynthesisInput,
} from '@/lib/orchestrator/synthesis-engine'

// Mock LLM and credential dependencies
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

describe('synthesizeResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty result for no inputs', async () => {
    const input: SynthesisInput = {
      originalPrompt: 'Test prompt',
      results: [],
    }

    const result = await synthesizeResults(input)
    expect(result.success).toBe(false)
    expect(result.content).toBe('')
    expect(result.warnings).toContain('No results to synthesize')
  })

  it('should pass through single result without calling LLM', async () => {
    const input: SynthesisInput = {
      originalPrompt: 'Test prompt',
      results: [
        {
          taskTitle: 'Task 1',
          taskDescription: 'Do something',
          agentName: 'Agent A',
          content: 'Result content here',
        },
      ],
    }

    const result = await synthesizeResults(input)
    expect(result.success).toBe(true)
    expect(result.content).toBe('Result content here')
    expect(LLMService.streamChat).not.toHaveBeenCalled()
  })

  it('should synthesize multiple results via LLM', async () => {
    async function* mockStream() {
      yield 'Synthesized '
      yield 'report '
      yield 'content'
    }

    vi.mocked(LLMService.streamChat).mockReturnValue(mockStream())

    const input: SynthesisInput = {
      originalPrompt: 'Research AI trends',
      results: [
        {
          taskTitle: 'Market Research',
          taskDescription: 'Research market trends',
          agentName: 'Researcher',
          content: 'Market is growing at 25% CAGR',
        },
        {
          taskTitle: 'Technical Analysis',
          taskDescription: 'Analyze technical landscape',
          agentName: 'Analyst',
          content: 'LLMs are the dominant architecture',
        },
      ],
    }

    const result = await synthesizeResults(input)
    expect(result.success).toBe(true)
    expect(result.content).toBe('Synthesized report content')
    expect(LLMService.streamChat).toHaveBeenCalledTimes(1)
  })

  it('should fall back to concatenation on LLM failure', async () => {
    vi.mocked(LLMService.streamChat).mockImplementation(() => {
      throw new Error('LLM unavailable')
    })

    const input: SynthesisInput = {
      originalPrompt: 'Test',
      results: [
        {
          taskTitle: 'Task A',
          taskDescription: 'Description A',
          agentName: 'Agent A',
          content: 'Content A',
        },
        {
          taskTitle: 'Task B',
          taskDescription: 'Description B',
          agentName: 'Agent B',
          content: 'Content B',
        },
      ],
    }

    const result = await synthesizeResults(input)
    expect(result.success).toBe(false)
    expect(result.content).toContain('Task A')
    expect(result.content).toContain('Content A')
    expect(result.content).toContain('Task B')
    expect(result.content).toContain('Content B')
    expect(result.warnings).toBeDefined()
  })

  it('should fall back when no provider configured', async () => {
    const { CredentialService } = await import('@/lib/credential-service')
    vi.mocked(CredentialService.getActiveConfig).mockResolvedValueOnce(null)

    const input: SynthesisInput = {
      originalPrompt: 'Test',
      results: [
        {
          taskTitle: 'A',
          taskDescription: '',
          agentName: 'A',
          content: 'Result A',
        },
        {
          taskTitle: 'B',
          taskDescription: '',
          agentName: 'B',
          content: 'Result B',
        },
      ],
    }

    const result = await synthesizeResults(input)
    expect(result.success).toBe(false)
    expect(result.content).toContain('Result A')
    expect(result.content).toContain('Result B')
  })
})

describe('mergeResults', () => {
  it('should return empty string for empty array', () => {
    expect(mergeResults([])).toBe('')
  })

  it('should return single result content directly', () => {
    expect(mergeResults([{ taskTitle: 'Task', content: 'Hello' }])).toBe(
      'Hello',
    )
  })

  it('should concatenate multiple results with headers', () => {
    const result = mergeResults([
      { taskTitle: 'Task A', content: 'Content A' },
      { taskTitle: 'Task B', content: 'Content B' },
    ])

    expect(result).toContain('## Task A')
    expect(result).toContain('Content A')
    expect(result).toContain('## Task B')
    expect(result).toContain('Content B')
    expect(result).toContain('---')
  })
})
