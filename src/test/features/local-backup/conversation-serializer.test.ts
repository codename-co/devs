/**
 * Conversation Serializer Tests
 *
 * Tests serialize/deserialize round-trip fidelity, edge cases,
 * and robustness of the conversation backup format.
 */
import { describe, it, expect } from 'vitest'
import { conversationSerializer } from '@/features/local-backup/lib/serializers/conversation-serializer'
import type { Conversation, Message } from '@/types'

// Helper to create a minimal valid conversation
function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  const now = new Date('2025-06-15T14:30:00.000Z')
  return {
    id: 'conv-test-123',
    agentId: 'einstein',
    participatingAgents: ['einstein'],
    workflowId: 'wf-test-123',
    timestamp: now,
    updatedAt: now,
    messages: [],
    ...overrides,
  }
}

// Helper to create a test message
function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-test-1',
    role: 'user',
    content: 'Hello, world!',
    timestamp: new Date('2025-06-15T14:30:00.000Z'),
    ...overrides,
  }
}

describe('conversationSerializer', () => {
  describe('serialize', () => {
    it('should produce valid markdown with YAML frontmatter', () => {
      const conv = makeConversation({
        title: 'Test Conversation',
        messages: [makeMessage({ content: 'Hi there!' })],
      })

      const result = conversationSerializer.serialize(conv)

      expect(result.filename).toContain('.chat.md')
      expect(result.directory).toBe('conversations')
      // Should contain frontmatter delimiters (after BOM)
      expect(result.content).toContain('---')
      expect(result.content).toContain('id: conv-test-123')
      expect(result.content).toContain('agentId: einstein')
      expect(result.content).toContain('Hi there!')
    })

    it('should include all message roles with correct emoji', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({ role: 'system', content: 'You are helpful.' }),
          makeMessage({ role: 'user', content: 'Hello' }),
          makeMessage({
            role: 'assistant',
            content: 'Hi!',
            agentId: 'einstein',
          }),
        ],
      })

      const result = conversationSerializer.serialize(conv)

      expect(result.content).toContain('## ⚙️')
      expect(result.content).toContain('## 👤')
      expect(result.content).toContain('## 🤖')
    })

    it('should separate messages with --- dividers', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({ content: 'First message' }),
          makeMessage({ content: 'Second message' }),
        ],
      })

      const result = conversationSerializer.serialize(conv)

      expect(result.content).toContain('First message\n\n---\n\n')
      expect(result.content).toContain('Second message')
    })

    it('should include pinned indicator', () => {
      const conv = makeConversation({
        messages: [makeMessage({ content: 'Pinned!', isPinned: true })],
      })

      const result = conversationSerializer.serialize(conv)

      expect(result.content).toContain('📌')
    })

    it('should include attachment details', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            content: 'See attached',
            attachments: [
              {
                type: 'document',
                name: 'report.pdf',
                data: 'base64data',
                mimeType: 'application/pdf',
                size: 1024,
              },
            ],
          }),
        ],
      })

      const result = conversationSerializer.serialize(conv)

      expect(result.content).toContain('<details>')
      expect(result.content).toContain('report.pdf')
      expect(result.content).toContain('application/pdf')
    })

    it('should use agent slug in frontmatter when context provides it', () => {
      const conv = makeConversation({ agentId: 'agent-123' })
      const result = conversationSerializer.serialize(conv, {
        getAgentSlug: (id) => (id === 'agent-123' ? 'einstein' : undefined),
      })

      expect(result.content).toContain('agentSlug: einstein')
    })
  })

  describe('deserialize', () => {
    it('should parse frontmatter correctly', () => {
      const conv = makeConversation({
        title: 'Physics Discussion',
        isPinned: true,
        summary: 'A conversation about quantum physics',
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.id).toBe('conv-test-123')
      expect(deserialized!.agentId).toBe('einstein')
      expect(deserialized!.participatingAgents).toEqual(['einstein'])
      expect(deserialized!.workflowId).toBe('wf-test-123')
      expect(deserialized!.title).toBe('Physics Discussion')
      expect(deserialized!.isPinned).toBe(true)
      expect(deserialized!.summary).toBe('A conversation about quantum physics')
    })

    it('should parse all message roles correctly', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            id: 'msg-1',
            role: 'system',
            content: 'System prompt here',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
          makeMessage({
            id: 'msg-2',
            role: 'user',
            content: 'User question',
            timestamp: new Date('2025-06-15T14:31:00.000Z'),
          }),
          makeMessage({
            id: 'msg-3',
            role: 'assistant',
            content: 'Assistant answer',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:32:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(3)
      expect(deserialized!.messages[0].role).toBe('system')
      expect(deserialized!.messages[1].role).toBe('user')
      expect(deserialized!.messages[2].role).toBe('assistant')
    })

    it('should preserve message content through round-trip', () => {
      const messages = [
        makeMessage({
          role: 'system',
          content: 'You are a helpful assistant.',
          timestamp: new Date('2025-06-15T14:30:00.000Z'),
        }),
        makeMessage({
          role: 'user',
          content: 'What is quantum entanglement?',
          timestamp: new Date('2025-06-15T14:31:00.000Z'),
        }),
        makeMessage({
          role: 'assistant',
          content:
            'Quantum entanglement is a phenomenon where two particles become interconnected.\n\n## Key Points\n\n- Measurement of one affects the other\n- Distance independent\n- Einstein called it "spooky action at a distance"',
          agentId: 'einstein',
          timestamp: new Date('2025-06-15T14:32:00.000Z'),
        }),
      ]

      const conv = makeConversation({ messages })
      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(3)
      expect(deserialized!.messages[0].content).toBe(messages[0].content)
      expect(deserialized!.messages[1].content).toBe(messages[1].content)
      expect(deserialized!.messages[2].content).toBe(messages[2].content)
    })

    it('should handle multi-agent conversation with interleaved messages', () => {
      const conv = makeConversation({
        participatingAgents: ['agent-a', 'agent-b'],
        messages: [
          makeMessage({
            role: 'system',
            content: 'System prompt',
            timestamp: new Date('2025-06-15T14:00:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Question 1',
            timestamp: new Date('2025-06-15T14:01:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content: 'Agent A response',
            agentId: 'agent-a',
            timestamp: new Date('2025-06-15T14:02:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Question 2',
            timestamp: new Date('2025-06-15T14:03:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content: 'Agent B response',
            agentId: 'agent-b',
            timestamp: new Date('2025-06-15T14:04:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(5)

      // Check roles are preserved
      expect(deserialized!.messages[0].role).toBe('system')
      expect(deserialized!.messages[1].role).toBe('user')
      expect(deserialized!.messages[2].role).toBe('assistant')
      expect(deserialized!.messages[3].role).toBe('user')
      expect(deserialized!.messages[4].role).toBe('assistant')

      // Check content is preserved
      expect(deserialized!.messages[2].content).toBe('Agent A response')
      expect(deserialized!.messages[4].content).toBe('Agent B response')
    })

    it('should generate unique message IDs even for similar content', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'user',
            content: 'Same question',
            timestamp: new Date('2025-06-15T14:01:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content: 'Response 1',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:01:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Same question',
            timestamp: new Date('2025-06-15T14:02:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content: 'Response 2',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:02:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(4)

      // All IDs must be unique
      const ids = deserialized!.messages.map((m) => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should handle content with markdown headings (## inside messages)', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'assistant',
            content:
              'Here is the plan:\n\n## Step 1\n\nDo this first.\n\n## Step 2\n\nDo this second.',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(1)
      expect(deserialized!.messages[0].content).toContain('## Step 1')
      expect(deserialized!.messages[0].content).toContain('## Step 2')
    })

    it('should handle content with --- separators inside messages', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'assistant',
            content:
              'Here is a horizontal rule:\n\n---\n\nAnd more content after it.',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(1)
      // The --- inside content should NOT split the message because it's not followed by ## with emoji
      expect(deserialized!.messages[0].content).toContain('horizontal rule')
      expect(deserialized!.messages[0].content).toContain(
        'more content after it',
      )
    })

    it('should handle CRLF line endings', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content: 'Hi there!',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:31:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      // Replace LF with CRLF to simulate Windows line endings
      const crlfContent = serialized.content.replace(/\n/g, '\r\n')

      const deserialized = conversationSerializer.deserialize(
        crlfContent,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(2)
      expect(deserialized!.messages[0].content).toBe('Hello')
      expect(deserialized!.messages[1].content).toBe('Hi there!')
    })

    it('should handle empty conversation (no messages)', () => {
      const conv = makeConversation({ messages: [] })
      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(0)
    })

    it('should handle conversation with only system message', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'system',
            content: 'You are a helpful assistant.\n\nBe concise.',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(1)
      expect(deserialized!.messages[0].role).toBe('system')
    })

    it('should return null for malformed content', () => {
      const result = conversationSerializer.deserialize(
        'This is not valid frontmatter content',
        'bad-file.chat.md',
      )

      expect(result).toBeNull()
    })

    it('should handle ⚙️ emoji with variation selector in file content', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'system',
            content: 'System prompt',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2025-06-15T14:31:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      // Verify the serialized content has the ⚙️ emoji
      expect(serialized.content).toContain('⚙️')

      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(2)
      expect(deserialized!.messages[0].role).toBe('system')
      expect(deserialized!.messages[1].role).toBe('user')
    })

    it('should handle ⚙ emoji WITHOUT variation selector', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'system',
            content: 'System prompt',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2025-06-15T14:31:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      // Replace ⚙️ (U+2699 U+FE0F) with ⚙ (U+2699 only) to simulate missing variation selector
      const contentWithoutVS = serialized.content.replace(
        /\u2699\uFE0F/g,
        '\u2699',
      )

      const deserialized = conversationSerializer.deserialize(
        contentWithoutVS,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(2)
      expect(deserialized!.messages[0].role).toBe('system')
    })

    it('should preserve agentId on assistant messages', () => {
      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'assistant',
            content: 'I am Einstein.',
            agentId: 'custom-agent-id-12345',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages[0].agentId).toBe('custom-agent-id-12345')
    })

    it('should handle messages with very long content', () => {
      const longContent =
        'This is a very long message. '.repeat(500) + 'End of message.'

      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'assistant',
            content: longContent,
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(1)
      expect(deserialized!.messages[0].content).toBe(longContent)
    })

    it('should handle message content with code blocks containing ---', () => {
      const codeContent = [
        'Here is some YAML:',
        '',
        '```yaml',
        '---',
        'name: test',
        'value: 42',
        '---',
        '```',
        '',
        'That was the code.',
      ].join('\n')

      const conv = makeConversation({
        messages: [
          makeMessage({
            role: 'assistant',
            content: codeContent,
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:30:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(1)
      expect(deserialized!.messages[0].content).toContain('```yaml')
      expect(deserialized!.messages[0].content).toContain('name: test')
    })
  })

  describe('round-trip fidelity', () => {
    it('should preserve all messages through serialize → deserialize', () => {
      const conv = makeConversation({
        title: 'Round Trip Test',
        messages: [
          makeMessage({
            role: 'system',
            content: 'You are a helpful physics tutor.',
            timestamp: new Date('2025-06-15T14:00:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'What is E=mc²?',
            timestamp: new Date('2025-06-15T14:01:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content:
              "Einstein's mass-energy equivalence formula.\n\n$E = mc^2$\n\nWhere:\n- E = energy\n- m = mass\n- c = speed of light",
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:02:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Can you explain more?',
            timestamp: new Date('2025-06-15T14:03:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content:
              'Of course! The formula tells us that mass and energy are interchangeable.',
            agentId: 'einstein',
            timestamp: new Date('2025-06-15T14:04:00.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      expect(deserialized!.messages).toHaveLength(5)
      expect(deserialized!.id).toBe(conv.id)
      expect(deserialized!.agentId).toBe(conv.agentId)

      // Verify each message
      for (let i = 0; i < conv.messages.length; i++) {
        expect(deserialized!.messages[i].role).toBe(conv.messages[i].role)
        expect(deserialized!.messages[i].content).toBe(conv.messages[i].content)
      }
    })

    it('should preserve conversation with repeated user questions', () => {
      // This mimics the reported bug scenario: user asks same question twice
      const conv = makeConversation({
        agentId: 'custom-agent-123',
        participatingAgents: ['custom-agent-123'],
        messages: [
          makeMessage({
            role: 'system',
            content: 'System instructions',
            timestamp: new Date('2025-06-15T01:40:00.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Combien pour SuperAI ?',
            timestamp: new Date('2025-06-15T01:41:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content:
              'Le prix de SuperAI est de 49€ par mois.\n\n## Détails\n\n- Plan Basic: 49€/mois\n- Plan Pro: 99€/mois',
            agentId: 'custom-agent-123',
            timestamp: new Date('2025-06-15T01:41:30.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Combien pour SuperAI ?', // Same question again
            timestamp: new Date('2025-06-15T01:42:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content:
              "Comme je l'ai mentionné, SuperAI coûte 49€/mois pour le plan Basic.",
            agentId: 'custom-agent-123',
            timestamp: new Date('2025-06-15T01:42:30.000Z'),
          }),
          makeMessage({
            role: 'user',
            content: 'Combien a couté le ticket pour SuperAI ?',
            timestamp: new Date('2025-06-15T01:43:00.000Z'),
          }),
          makeMessage({
            role: 'assistant',
            content: 'Le ticket pour SuperAI était de 150€.',
            agentId: 'custom-agent-123',
            timestamp: new Date('2025-06-15T01:43:30.000Z'),
          }),
        ],
      })

      const serialized = conversationSerializer.serialize(conv)
      const deserialized = conversationSerializer.deserialize(
        serialized.content,
        serialized.filename,
      )

      expect(deserialized).not.toBeNull()
      // ALL 7 messages must survive the round-trip
      expect(deserialized!.messages).toHaveLength(7)

      // Verify system message
      expect(deserialized!.messages[0].role).toBe('system')

      // Verify all user messages
      expect(deserialized!.messages[1].role).toBe('user')
      expect(deserialized!.messages[3].role).toBe('user')
      expect(deserialized!.messages[5].role).toBe('user')

      // Verify all assistant messages - THIS IS THE CRITICAL CHECK
      expect(deserialized!.messages[2].role).toBe('assistant')
      expect(deserialized!.messages[2].content).toContain('49€')
      expect(deserialized!.messages[4].role).toBe('assistant')
      expect(deserialized!.messages[4].content).toContain('49€/mois')
      expect(deserialized!.messages[6].role).toBe('assistant')
      expect(deserialized!.messages[6].content).toContain('150€')

      // All message IDs must be unique
      const ids = deserialized!.messages.map((m) => m.id)
      expect(new Set(ids).size).toBe(7)
    })
  })

  describe('getFilename', () => {
    it('should produce a valid filename from conversation with title', () => {
      const conv = makeConversation({
        title: 'Physics Discussion',
        timestamp: new Date('2025-06-15T14:30:00.000Z'),
      })

      const serialized = conversationSerializer.serialize(conv)

      expect(serialized.filename).toMatch(/^2025-06-15_.*\.chat\.md$/)
      expect(serialized.filename).toContain('physics-discussion')
    })

    it('should handle special characters in title', () => {
      const conv = makeConversation({
        title: 'What is E=mc²? A "deep" dive!',
      })

      const serialized = conversationSerializer.serialize(conv)

      expect(serialized.filename).toMatch(/\.chat\.md$/)
      // Should not contain special characters
      expect(serialized.filename).not.toMatch(/[=²?"!]/)
    })
  })

  describe('getExtension', () => {
    it('should return .chat.md', () => {
      expect(conversationSerializer.getExtension()).toBe('.chat.md')
    })
  })

  describe('getDirectory', () => {
    it('should return conversations', () => {
      expect(conversationSerializer.getDirectory()).toBe('conversations')
    })
  })
})
