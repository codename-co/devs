---
name: llm-service-integration
description: Guide for integrating with LLM providers in the DEVS platform. Use this when asked to add LLM functionality, create AI-powered features, or work with the LLM service.
---

# LLM Service Integration for DEVS

When working with LLM functionality in the DEVS platform, always use the abstracted LLM service layer. Never call provider APIs directly.

## Core Principle

DEVS is provider-agnostic. The `LLMService` in `src/lib/llm/` abstracts multiple providers:

- OpenAI
- Anthropic (Claude)
- Google Gemini
- Mistral
- Ollama (local)
- Custom endpoints

## Basic Usage

```typescript
import { LLMService } from '@/lib/llm'
import type { Message } from '@/types'

async function generateResponse(userPrompt: string): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userPrompt },
  ]

  const response = await LLMService.chat(messages, {
    temperature: 0.7,
    maxTokens: 2000,
  })

  return response.content
}
```

## Message Types

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string // For multi-agent conversations
}
```

## Configuration Options

```typescript
interface LLMConfig {
  temperature?: number // 0-1, default 0.7
  maxTokens?: number // Max response tokens
  model?: string // Override default model
  stream?: boolean // Enable streaming
  topP?: number // Nucleus sampling
  frequencyPenalty?: number // Reduce repetition
  presencePenalty?: number // Encourage new topics
}
```

## Streaming Responses

For real-time UI updates:

```typescript
import { LLMService } from '@/lib/llm'

async function streamResponse(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<string> {
  let fullResponse = ''

  await LLMService.streamChat(messages, {
    onChunk: (chunk) => {
      fullResponse += chunk
      onChunk(chunk)
    },
    temperature: 0.7,
  })

  return fullResponse
}
```

## Error Handling

Always wrap LLM calls in try/catch:

```typescript
import { LLMService } from '@/lib/llm'
import { toast } from '@/lib/toast'

async function safeGenerate(prompt: string): Promise<string | null> {
  try {
    const response = await LLMService.chat([{ role: 'user', content: prompt }])
    return response.content
  } catch (error) {
    console.error('LLM call failed:', error)
    toast.error('Failed to generate response. Please try again.')
    return null
  }
}
```

## Agent Context Integration

When generating responses for agents, include their instructions:

```typescript
import { LLMService } from '@/lib/llm'
import { getAgentById } from '@/stores/agentStore'
import type { Agent, Message } from '@/types'

async function generateAgentResponse(
  agentId: string,
  conversationHistory: Message[],
  userMessage: string,
): Promise<string> {
  const agent = getAgentById(agentId)
  if (!agent) throw new Error('Agent not found')

  const messages: Message[] = [
    {
      role: 'system',
      content: buildAgentSystemPrompt(agent),
    },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  const response = await LLMService.chat(messages, {
    temperature: agent.temperature ?? 0.7,
  })

  return response.content
}

function buildAgentSystemPrompt(agent: Agent): string {
  return `You are ${agent.name}, ${agent.role}.

${agent.instructions}

Always stay in character and respond according to your role and expertise.`
}
```

## Structured Output (JSON)

For extracting structured data:

```typescript
import { LLMService } from '@/lib/llm'

interface ExtractedData {
  title: string
  summary: string
  keywords: string[]
}

async function extractStructuredData(text: string): Promise<ExtractedData> {
  const response = await LLMService.chat(
    [
      {
        role: 'system',
        content: `Extract information from the text and return as JSON:
{
  "title": "string",
  "summary": "string",
  "keywords": ["string"]
}
Return ONLY valid JSON, no other text.`,
      },
      { role: 'user', content: text },
    ],
    {
      temperature: 0.3, // Lower for more deterministic output
    },
  )

  // Parse with error handling
  try {
    return JSON.parse(response.content)
  } catch {
    // Attempt to extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Failed to parse LLM response as JSON')
  }
}
```

## Cost & Usage Tracking

The platform tracks LLM usage via the traces feature. Include metadata when relevant:

```typescript
import { LLMService } from '@/lib/llm'

const response = await LLMService.chat(messages, {
  metadata: {
    feature: 'task-analysis',
    agentId: agent.id,
    taskId: task.id,
  },
})
```

## Testing LLM Integration

Mock the LLM service in tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LLMService } from '@/lib/llm'

vi.mock('@/lib/llm', () => ({
  LLMService: {
    chat: vi.fn(),
    streamChat: vi.fn(),
  },
}))

describe('MyFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process LLM response correctly', async () => {
    vi.mocked(LLMService.chat).mockResolvedValue({
      content: '{"result": "success"}',
      usage: { promptTokens: 100, completionTokens: 50 },
    })

    const result = await myFunction()
    expect(result).toEqual({ result: 'success' })
  })
})
```

## Common Patterns

### Task Analysis

See `src/lib/task-analyzer.ts` for breaking down complex prompts.

### Conversation Title Generation

See `src/lib/conversation-title-generator.ts` for generating chat titles.

### Memory Learning

See `src/lib/memory-learning-service.ts` for extracting learnable facts from conversations.

### Requirement Validation

See `src/lib/requirement-validator.ts` for validating task deliverables.
