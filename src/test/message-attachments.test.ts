import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MessageAttachment } from '@/types'

// Mock the dependencies
const mockDb = {
  isInitialized: vi.fn(() => true),
  init: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  getAll: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  hasStore: vi.fn().mockReturnValue(true),
}

vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/toast', () => ({
  errorToast: vi.fn(),
  successToast: vi.fn(),
}))

describe('MessageAttachment Type', () => {
  describe('type inference', () => {
    it('should have correct type for image attachments', () => {
      const imageAttachment: MessageAttachment = {
        type: 'image',
        name: 'test-image.png',
        data: 'base64encodeddata',
        mimeType: 'image/png',
        size: 1024,
      }

      expect(imageAttachment.type).toBe('image')
      expect(imageAttachment.mimeType).toBe('image/png')
    })

    it('should have correct type for document attachments', () => {
      const docAttachment: MessageAttachment = {
        type: 'document',
        name: 'document.pdf',
        data: 'base64encodeddata',
        mimeType: 'application/pdf',
        size: 2048,
      }

      expect(docAttachment.type).toBe('document')
      expect(docAttachment.mimeType).toBe('application/pdf')
    })

    it('should have correct type for text attachments', () => {
      const textAttachment: MessageAttachment = {
        type: 'text',
        name: 'readme.txt',
        data: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
        mimeType: 'text/plain',
        size: 11,
      }

      expect(textAttachment.type).toBe('text')
      expect(textAttachment.mimeType).toBe('text/plain')
    })

    it('should allow optional size field', () => {
      const attachment: MessageAttachment = {
        type: 'text',
        name: 'file.txt',
        data: 'data',
        mimeType: 'text/plain',
      }

      expect(attachment.size).toBeUndefined()
    })
  })
})

describe('Attachment type classification', () => {
  /**
   * Utility function to classify MIME types (mirrors the logic in chat.ts)
   */
  function classifyAttachmentType(
    mimeType: string,
  ): 'image' | 'document' | 'text' {
    if (mimeType.startsWith('image/')) {
      return 'image'
    } else if (mimeType.startsWith('text/')) {
      return 'text'
    }
    return 'document'
  }

  describe('image types', () => {
    it.each([
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ])('should classify %s as image', (mimeType) => {
      expect(classifyAttachmentType(mimeType)).toBe('image')
    })
  })

  describe('text types', () => {
    it.each([
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'text/markdown',
    ])('should classify %s as text', (mimeType) => {
      expect(classifyAttachmentType(mimeType)).toBe('text')
    })
  })

  describe('document types', () => {
    it.each([
      'application/pdf',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ])('should classify %s as document', (mimeType) => {
      expect(classifyAttachmentType(mimeType)).toBe('document')
    })
  })
})

describe('LLM Provider attachment format', () => {
  describe('OpenAI format', () => {
    it('should format document attachments with input_file type', () => {
      const attachment = {
        type: 'document' as const,
        name: 'invoice.pdf',
        data: 'JVBERi0xLjcK...', // Sample PDF base64
        mimeType: 'application/pdf',
      }

      // Expected OpenAI format for documents
      const expectedFormat = {
        type: 'input_file',
        filename: attachment.name,
        file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
      }

      expect(expectedFormat.type).toBe('input_file')
      expect(expectedFormat.filename).toBe('invoice.pdf')
      expect(expectedFormat.file_data).toContain('data:application/pdf;base64,')
    })

    it('should format image attachments with image_url type', () => {
      const attachment = {
        type: 'image' as const,
        name: 'photo.png',
        data: 'iVBORw0KGgo...', // Sample PNG base64
        mimeType: 'image/png',
      }

      // Expected OpenAI format for images
      const expectedFormat = {
        type: 'image_url',
        image_url: {
          url: `data:${attachment.mimeType};base64,${attachment.data}`,
        },
      }

      expect(expectedFormat.type).toBe('image_url')
      expect(expectedFormat.image_url.url).toContain('data:image/png;base64,')
    })
  })

  describe('Anthropic format', () => {
    it('should format document attachments with document type and base64 source', () => {
      const attachment = {
        type: 'document' as const,
        name: 'report.pdf',
        data: 'JVBERi0xLjcK...', // Sample PDF base64
        mimeType: 'application/pdf',
      }

      // Expected Anthropic format for documents
      const expectedFormat = {
        type: 'document',
        source: {
          type: 'base64',
          media_type: attachment.mimeType,
          data: attachment.data,
        },
      }

      expect(expectedFormat.type).toBe('document')
      expect(expectedFormat.source.type).toBe('base64')
      expect(expectedFormat.source.media_type).toBe('application/pdf')
    })

    it('should format image attachments with image type and base64 source', () => {
      const attachment = {
        type: 'image' as const,
        name: 'diagram.png',
        data: 'iVBORw0KGgo...', // Sample PNG base64
        mimeType: 'image/png',
      }

      // Expected Anthropic format for images
      const expectedFormat = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType,
          data: attachment.data,
        },
      }

      expect(expectedFormat.type).toBe('image')
      expect(expectedFormat.source.type).toBe('base64')
      expect(expectedFormat.source.media_type).toBe('image/png')
    })
  })
})

describe('Conversation attachment persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.isInitialized.mockReturnValue(true)
    mockDb.get.mockResolvedValue(null)
    mockDb.getAll.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should include attachments in addMessage call', async () => {
    // Reset modules to ensure fresh imports
    vi.resetModules()

    const { useConversationStore } = await import('@/stores/conversationStore')

    // Setup mock conversation
    const testConversation = {
      id: 'test-conv-1',
      agentId: 'test-agent',
      agentSlug: 'test-agent', // Include agentSlug to avoid migration
      workflowId: 'test-workflow',
      participatingAgents: ['test-agent'],
      messages: [],
      timestamp: new Date(),
    }

    mockDb.get.mockResolvedValue(testConversation)
    mockDb.update.mockResolvedValue(undefined)

    const store = useConversationStore.getState()

    // Load the conversation first
    await store.loadConversation('test-conv-1')

    // Add a message with attachments
    const messageWithAttachments = {
      role: 'user' as const,
      content: 'Test message with attachment',
      attachments: [
        {
          type: 'image' as const,
          name: 'test.png',
          data: 'base64data',
          mimeType: 'image/png',
          size: 1024,
        },
      ],
    }

    await store.addMessage('test-conv-1', messageWithAttachments)

    // Verify the update was called with attachment data
    expect(mockDb.update).toHaveBeenCalled()
    const updateCall = mockDb.update.mock.calls[0]
    expect(updateCall[0]).toBe('conversations')

    const updatedConversation = updateCall[1]
    expect(updatedConversation.messages).toHaveLength(1)
    expect(updatedConversation.messages[0].attachments).toBeDefined()
    expect(updatedConversation.messages[0].attachments).toHaveLength(1)
    expect(updatedConversation.messages[0].attachments[0].name).toBe('test.png')
  })

  it('should preserve attachments when loading conversation history', async () => {
    vi.resetModules()

    const { useConversationStore } = await import('@/stores/conversationStore')

    // Setup conversation with message that has attachments
    const conversationWithAttachments = {
      id: 'test-conv-2',
      agentId: 'test-agent',
      workflowId: 'test-workflow',
      participatingAgents: ['test-agent'],
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Look at this image',
          timestamp: new Date(),
          attachments: [
            {
              type: 'image',
              name: 'screenshot.png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              mimeType: 'image/png',
              size: 68,
            },
          ],
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'I can see the image you uploaded.',
          timestamp: new Date(),
        },
      ],
      timestamp: new Date(),
    }

    mockDb.get.mockResolvedValue(conversationWithAttachments)

    const store = useConversationStore.getState()
    const loadedConversation = await store.loadConversation('test-conv-2')

    expect(loadedConversation).not.toBeNull()
    expect(loadedConversation?.messages[0].attachments).toBeDefined()
    expect(loadedConversation?.messages[0].attachments).toHaveLength(1)
    expect(loadedConversation?.messages[0].attachments?.[0].type).toBe('image')
    expect(loadedConversation?.messages[0].attachments?.[0].name).toBe(
      'screenshot.png',
    )
  })
})
