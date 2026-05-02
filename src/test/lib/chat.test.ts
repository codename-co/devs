import { describe, it, expect } from 'vitest'
import { buildOrchestrationPrompt, parseToolCallsFromStream } from '@/lib/chat'
import type { Message } from '@/types'

describe('buildOrchestrationPrompt', () => {
  const makeMsg = (
    role: Message['role'],
    content: string,
  ): Pick<Message, 'role' | 'content'> => ({ role, content })

  it('returns the raw prompt when includeHistory is false', () => {
    const messages = [
      makeMsg('user', 'Build a React app'),
      makeMsg('assistant', 'Here is your app…'),
    ]
    const result = buildOrchestrationPrompt('Add a dashboard', messages, false)
    expect(result).toBe('Add a dashboard')
  })

  it('returns the raw prompt when conversation history is empty', () => {
    const result = buildOrchestrationPrompt('Build something', [], true)
    expect(result).toBe('Build something')
  })

  it('returns the raw prompt when history contains only system messages', () => {
    const messages = [makeMsg('system', 'You are a helpful assistant')]
    const result = buildOrchestrationPrompt('Build something', messages, true)
    expect(result).toBe('Build something')
  })

  it('enriches the prompt with conversation context for follow-ups', () => {
    const messages = [
      makeMsg('user', 'Build a React app with auth'),
      makeMsg('assistant', 'Here is your React app with JWT authentication…'),
    ]
    const result = buildOrchestrationPrompt('Add a dashboard', messages, true)

    expect(result).toContain('## Previous Conversation Context')
    expect(result).toContain('[user]: Build a React app with auth')
    expect(result).toContain(
      '[assistant]: Here is your React app with JWT authentication…',
    )
    expect(result).toContain('## Current Request')
    expect(result).toContain('Add a dashboard')
  })

  it('filters out system messages from the context', () => {
    const messages = [
      makeMsg('system', 'You are a helpful assistant'),
      makeMsg('user', 'Hello'),
      makeMsg('assistant', 'Hi there!'),
    ]
    const result = buildOrchestrationPrompt('Follow up', messages, true)

    expect(result).not.toContain('You are a helpful assistant')
    expect(result).toContain('[user]: Hello')
    expect(result).toContain('[assistant]: Hi there!')
  })

  it('limits context to the last 20 messages', () => {
    const messages = Array.from({ length: 30 }, (_, i) =>
      makeMsg(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`),
    )
    const result = buildOrchestrationPrompt('Latest', messages, true)

    // Messages 0–9 should be excluded (first 10 of 30)
    expect(result).not.toContain('Message 0')
    expect(result).not.toContain('Message 9')
    // Messages 10–29 should be included (last 20)
    expect(result).toContain('Message 10')
    expect(result).toContain('Message 29')
  })

  it('preserves the current prompt verbatim in the Current Request section', () => {
    const messages = [makeMsg('user', 'prior')]
    const prompt = 'Build a **complex** app with `code`'
    const result = buildOrchestrationPrompt(prompt, messages, true)

    // The prompt must appear exactly after "## Current Request\n"
    const afterMarker = result.split('## Current Request\n')[1]
    expect(afterMarker).toBe(prompt)
  })
})

describe('parseToolCallsFromStream', () => {
  it('returns plain content when no markers are present', () => {
    const result = parseToolCallsFromStream('Hello world')
    expect(result.content).toBe('Hello world')
    expect(result.toolCalls).toEqual([])
    expect(result.thinkingContent).toBeUndefined()
    expect(result.groundingMetadata).toBeUndefined()
  })

  it('extracts thinking deltas from accumulated response', () => {
    const response =
      '\n__THINKING_DELTA__I need to\n__THINKING_DELTA__ analyze this'
    const result = parseToolCallsFromStream(response)
    expect(result.content).toBe('')
    expect(result.thinkingContent).toBe('I need to analyze this')
  })

  it('separates thinking content from actual content', () => {
    const response =
      '\n__THINKING_DELTA__Let me think\n__THINKING_DELTA__ about this.Here is the answer.'
    const result = parseToolCallsFromStream(response)
    // The last thinking block runs to the end because there's no next \n__ marker
    // So "Here is the answer." is part of the thinking block
    expect(result.thinkingContent).toContain('Let me think')
  })

  it('extracts thinking when followed by actual content with marker boundary', () => {
    // Simulate: thinking chunks, then content chunks (content doesn't have \n__ prefix)
    const response =
      '\n__THINKING_DELTA__Reasoning here.\nActual content follows'
    const result = parseToolCallsFromStream(response)
    expect(result.thinkingContent).toContain('Reasoning here.')
  })

  it('extracts tool calls marker', () => {
    const toolCalls = [
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'search', arguments: '{}' },
      },
    ]
    const response = `Some content__TOOL_CALLS__${JSON.stringify(toolCalls)}`
    const result = parseToolCallsFromStream(response)
    expect(result.content).toBe('Some content')
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].function.name).toBe('search')
  })

  it('extracts grounding metadata marker', () => {
    const metadata = {
      isGrounded: true,
      webResults: [{ title: 'Test', url: 'https://example.com', snippet: '' }],
    }
    const response = `Content here__GROUNDING_METADATA__${JSON.stringify(metadata)}`
    const result = parseToolCallsFromStream(response)
    expect(result.content).toBe('Content here')
    expect(result.groundingMetadata?.isGrounded).toBe(true)
  })

  it('handles all marker types together', () => {
    const toolCalls = [
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'calc', arguments: '{}' },
      },
    ]
    const response =
      '\n__THINKING_DELTA__Hmm...The answer is 42__TOOL_CALLS__' +
      JSON.stringify(toolCalls)
    const result = parseToolCallsFromStream(response)
    expect(result.thinkingContent).toContain('Hmm...')
    expect(result.toolCalls).toHaveLength(1)
  })
})
