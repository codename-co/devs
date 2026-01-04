import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockDb,
  createMockToast,
  createTestConversation,
  createTestMessage,
  resetMockDb,
} from './mocks'

// Create mocks at module level
const mockDb = createMockDb()
const mockToast = createMockToast()

const mockTitleGenerator = {
  generateTitle: vi.fn().mockResolvedValue('Generated Title'),
  generateTitleForNewConversation: vi.fn().mockResolvedValue('New Title'),
}

const mockSummarizer = {
  summarizeConversation: vi
    .fn()
    .mockResolvedValue('Test summary of the conversation'),
}

// Setup global mocks
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/toast', () => mockToast)
vi.mock('@/lib/conversation-title-generator', () => ({
  ConversationTitleGenerator: mockTitleGenerator,
}))
vi.mock('@/lib/conversation-summarizer', () => ({
  ConversationSummarizer: mockSummarizer,
}))

// Mock crypto.randomUUID for predictable IDs
const mockUUID = vi.fn()
vi.stubGlobal('crypto', {
  randomUUID: mockUUID,
})

// We need to dynamically import the module to ensure mocks are applied
let conversationStore: typeof import('@/stores/conversationStore')

// Helper function to get the store
const getStore = () => conversationStore.useConversationStore

describe('conversationStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetMockDb(mockDb)
    mockTitleGenerator.generateTitle
      .mockReset()
      .mockResolvedValue('Generated Title')
    mockTitleGenerator.generateTitleForNewConversation
      .mockReset()
      .mockResolvedValue('New Title')
    mockSummarizer.summarizeConversation
      .mockReset()
      .mockResolvedValue('Test summary of the conversation')
    mockUUID.mockReturnValue('test-uuid-1234')

    // Reset module cache to get fresh store
    vi.resetModules()

    // Re-import the module fresh
    conversationStore = await import('@/stores/conversationStore')

    // Reset zustand store state
    getStore().setState({
      conversations: [],
      currentConversation: null,
      isLoading: false,
      searchQuery: '',
      showPinnedOnly: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have empty conversations array', () => {
      const state = getStore().getState()
      expect(state.conversations).toEqual([])
    })

    it('should have null currentConversation', () => {
      const state = getStore().getState()
      expect(state.currentConversation).toBeNull()
    })

    it('should have isLoading as false', () => {
      const state = getStore().getState()
      expect(state.isLoading).toBe(false)
    })

    it('should have empty searchQuery', () => {
      const state = getStore().getState()
      expect(state.searchQuery).toBe('')
    })

    it('should have showPinnedOnly as false', () => {
      const state = getStore().getState()
      expect(state.showPinnedOnly).toBe(false)
    })
  })

  // ============================================
  // loadConversations Tests
  // ============================================
  describe('loadConversations', () => {
    it('should load all conversations from database', async () => {
      const testConversations = [
        createTestConversation({ id: 'conv-1' }),
        createTestConversation({ id: 'conv-2' }),
      ]
      mockDb.getAll.mockResolvedValueOnce(testConversations)

      await getStore().getState().loadConversations()

      expect(mockDb.getAll).toHaveBeenCalledWith('conversations')
      expect(getStore().getState().conversations).toEqual(testConversations)
    })

    it('should set isLoading to true then false', async () => {
      mockDb.getAll.mockImplementation(async () => {
        expect(getStore().getState().isLoading).toBe(true)
        return []
      })

      await getStore().getState().loadConversations()

      expect(getStore().getState().isLoading).toBe(false)
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValueOnce(false)
      mockDb.getAll.mockResolvedValueOnce([])

      await getStore().getState().loadConversations()

      expect(mockDb.init).toHaveBeenCalled()
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Database error')
      mockDb.getAll.mockRejectedValueOnce(error)

      await getStore().getState().loadConversations()

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to load conversations',
        error,
      )
      expect(getStore().getState().isLoading).toBe(false)
    })

    it('should handle empty database', async () => {
      mockDb.getAll.mockResolvedValueOnce([])

      await getStore().getState().loadConversations()

      expect(getStore().getState().conversations).toEqual([])
    })
  })

  // ============================================
  // loadConversation Tests
  // ============================================
  describe('loadConversation', () => {
    it('should load a single conversation and set currentConversation', async () => {
      const testConversation = createTestConversation({ id: 'conv-1' })
      mockDb.get.mockResolvedValueOnce(testConversation)

      const result = await getStore().getState().loadConversation('conv-1')

      expect(mockDb.get).toHaveBeenCalledWith('conversations', 'conv-1')
      expect(result).toEqual(testConversation)
      expect(getStore().getState().currentConversation).toEqual(
        testConversation,
      )
    })

    it('should return null for invalid ID', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      const result = await getStore().getState().loadConversation('invalid-id')

      expect(result).toBeNull()
      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Conversation not found',
        'The requested conversation could not be found',
      )
    })

    it('should set isLoading correctly during operation', async () => {
      mockDb.get.mockImplementation(async () => {
        expect(getStore().getState().isLoading).toBe(true)
        return createTestConversation({ id: 'conv-1' })
      })

      await getStore().getState().loadConversation('conv-1')

      expect(getStore().getState().isLoading).toBe(false)
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValueOnce(false)
      mockDb.get.mockResolvedValueOnce(createTestConversation({ id: 'conv-1' }))

      await getStore().getState().loadConversation('conv-1')

      expect(mockDb.init).toHaveBeenCalled()
    })

    it('should show error toast on database error', async () => {
      const error = new Error('Database error')
      mockDb.get.mockRejectedValueOnce(error)

      const result = await getStore().getState().loadConversation('conv-1')

      expect(result).toBeNull()
      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to load conversations',
        error,
      )
    })
  })

  // ============================================
  // createConversation Tests
  // ============================================
  describe('createConversation', () => {
    it('should create a new conversation with UUID', async () => {
      mockUUID.mockReturnValueOnce('new-conv-uuid')

      const conversation = await getStore()
        .getState()
        .createConversation('agent-1', 'workflow-1')

      expect(conversation.id).toBe('new-conv-uuid')
      expect(conversation.agentId).toBe('agent-1')
      expect(conversation.workflowId).toBe('workflow-1')
    })

    it('should save conversation to database', async () => {
      mockUUID.mockReturnValueOnce('new-conv-uuid')

      await getStore().getState().createConversation('agent-1', 'workflow-1')

      expect(mockDb.add).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          id: 'new-conv-uuid',
          agentId: 'agent-1',
          workflowId: 'workflow-1',
        }),
      )
    })

    it('should set currentConversation to new conversation', async () => {
      const conversation = await getStore()
        .getState()
        .createConversation('agent-1', 'workflow-1')

      expect(getStore().getState().currentConversation).toEqual(conversation)
    })

    it('should add conversation to conversations array', async () => {
      const existingConversation = createTestConversation({ id: 'existing' })
      getStore().setState({ conversations: [existingConversation] })

      const newConversation = await getStore()
        .getState()
        .createConversation('agent-1', 'workflow-1')

      expect(getStore().getState().conversations).toHaveLength(2)
      expect(getStore().getState().conversations).toContainEqual(
        newConversation,
      )
    })

    it('should create conversation with participatingAgents including agentId', async () => {
      const conversation = await getStore()
        .getState()
        .createConversation('agent-1', 'workflow-1')

      expect(conversation.participatingAgents).toEqual(['agent-1'])
    })

    it('should create conversation with empty messages array', async () => {
      const conversation = await getStore()
        .getState()
        .createConversation('agent-1', 'workflow-1')

      expect(conversation.messages).toEqual([])
    })

    it('should create conversation with timestamp', async () => {
      const beforeCreation = new Date()
      const conversation = await getStore()
        .getState()
        .createConversation('agent-1', 'workflow-1')
      const afterCreation = new Date()

      expect(conversation.timestamp).toBeInstanceOf(Date)
      expect(conversation.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      )
      expect(conversation.timestamp.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      )
    })

    it('should initialize database if not initialized', async () => {
      mockDb.isInitialized.mockReturnValueOnce(false)

      await getStore().getState().createConversation('agent-1', 'workflow-1')

      expect(mockDb.init).toHaveBeenCalled()
    })

    it('should show error toast and throw on failure', async () => {
      const error = new Error('Database error')
      mockDb.add.mockRejectedValueOnce(error)

      await expect(
        getStore().getState().createConversation('agent-1', 'workflow-1'),
      ).rejects.toThrow(error)
      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to create conversation',
        error,
      )
    })
  })

  // ============================================
  // addMessage Tests
  // ============================================
  describe('addMessage', () => {
    it('should add message with ID and timestamp', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      mockUUID.mockReturnValueOnce('msg-uuid-1')

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'Hello world',
      })

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          id: 'conv-1',
          messages: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-uuid-1',
              role: 'user',
              content: 'Hello world',
              timestamp: expect.any(Date),
            }),
          ]),
        }),
      )
    })

    it('should append message to existing messages', async () => {
      const existingMessage = createTestMessage({
        id: 'existing-msg',
        content: 'Existing',
      })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [existingMessage],
      })
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'New message',
      })

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ id: 'existing-msg' }),
            expect.objectContaining({ content: 'New message' }),
          ]),
        }),
      )
    })

    it('should update participatingAgents for assistant messages with agentId', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        agentId: 'agent-1',
        participatingAgents: ['agent-1'],
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore().getState().addMessage('conv-1', {
        role: 'assistant',
        content: 'Response',
        agentId: 'agent-2',
      })

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          participatingAgents: expect.arrayContaining(['agent-1', 'agent-2']),
        }),
      )
    })

    it('should not duplicate agentId in participatingAgents', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        agentId: 'agent-1',
        participatingAgents: ['agent-1', 'agent-2'],
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore().getState().addMessage('conv-1', {
        role: 'assistant',
        content: 'Response',
        agentId: 'agent-2',
      })

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          participatingAgents: ['agent-1', 'agent-2'],
        }),
      )
    })

    it('should initialize participatingAgents if not present (backward compatibility)', async () => {
      const conversation = {
        id: 'conv-1',
        agentId: 'agent-1',
        workflowId: 'workflow-1',
        messages: [],
        timestamp: new Date(),
        // Note: no participatingAgents field
      }
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore().getState().addMessage('conv-1', {
        role: 'assistant',
        content: 'Response',
        agentId: 'agent-2',
      })

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          participatingAgents: ['agent-1', 'agent-2'],
        }),
      )
    })

    it('should update conversations state', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'Test message',
      })

      const updatedConv = getStore()
        .getState()
        .conversations.find((c) => c.id === 'conv-1')
      expect(updatedConv?.messages).toHaveLength(1)
    })

    it('should update currentConversation if matching', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({
        conversations: [conversation],
        currentConversation: conversation,
      })

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'Test message',
      })

      expect(getStore().getState().currentConversation?.messages).toHaveLength(
        1,
      )
    })

    it('should not update currentConversation if not matching', async () => {
      const conversation1 = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      const conversation2 = createTestConversation({
        id: 'conv-2',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation1)
      getStore().setState({
        conversations: [conversation1, conversation2],
        currentConversation: conversation2,
      })

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'Test message',
      })

      expect(getStore().getState().currentConversation?.id).toBe('conv-2')
      expect(getStore().getState().currentConversation?.messages).toHaveLength(
        0,
      )
    })

    it('should show error for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await getStore().getState().addMessage('invalid-id', {
        role: 'user',
        content: 'Test',
      })

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to add message',
        expect.any(Error),
      )
    })

    it('should trigger title generation for first user message', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'First message',
      })

      // Wait for async title generation
      await vi.waitFor(() => {
        expect(
          mockTitleGenerator.generateTitleForNewConversation,
        ).toHaveBeenCalledWith('conv-1', 'First message')
      })
    })

    it('should not trigger title generation if title already exists', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        title: 'Existing Title',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().addMessage('conv-1', {
        role: 'user',
        content: 'First message',
      })

      expect(
        mockTitleGenerator.generateTitleForNewConversation,
      ).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // deleteConversation Tests
  // ============================================
  describe('deleteConversation', () => {
    it('should delete conversation from database', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().deleteConversation('conv-1')

      expect(mockDb.delete).toHaveBeenCalledWith('conversations', 'conv-1')
    })

    it('should remove conversation from state', async () => {
      const conversation1 = createTestConversation({ id: 'conv-1' })
      const conversation2 = createTestConversation({ id: 'conv-2' })
      getStore().setState({ conversations: [conversation1, conversation2] })

      await getStore().getState().deleteConversation('conv-1')

      expect(getStore().getState().conversations).toHaveLength(1)
      expect(getStore().getState().conversations[0].id).toBe('conv-2')
    })

    it('should clear currentConversation if deleted conversation is current', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({
        conversations: [conversation],
        currentConversation: conversation,
      })

      await getStore().getState().deleteConversation('conv-1')

      expect(getStore().getState().currentConversation).toBeNull()
    })

    it('should not clear currentConversation if different conversation is deleted', async () => {
      const conversation1 = createTestConversation({ id: 'conv-1' })
      const conversation2 = createTestConversation({ id: 'conv-2' })
      getStore().setState({
        conversations: [conversation1, conversation2],
        currentConversation: conversation2,
      })

      await getStore().getState().deleteConversation('conv-1')

      expect(getStore().getState().currentConversation?.id).toBe('conv-2')
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Delete error')
      mockDb.delete.mockRejectedValueOnce(error)
      getStore().setState({
        conversations: [createTestConversation({ id: 'conv-1' })],
      })

      await getStore().getState().deleteConversation('conv-1')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to delete conversations',
        error,
      )
    })
  })

  // ============================================
  // clearCurrentConversation Tests
  // ============================================
  describe('clearCurrentConversation', () => {
    it('should set currentConversation to null', () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({ currentConversation: conversation })

      getStore().getState().clearCurrentConversation()

      expect(getStore().getState().currentConversation).toBeNull()
    })

    it('should not affect conversations array', () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({
        conversations: [conversation],
        currentConversation: conversation,
      })

      getStore().getState().clearCurrentConversation()

      expect(getStore().getState().conversations).toHaveLength(1)
    })
  })

  // ============================================
  // addAgentToConversation Tests
  // ============================================
  describe('addAgentToConversation', () => {
    it('should add agent to participatingAgents', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        participatingAgents: ['agent-1'],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().addAgentToConversation('conv-1', 'agent-2')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          participatingAgents: ['agent-1', 'agent-2'],
        }),
      )
    })

    it('should not add duplicate agent', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        participatingAgents: ['agent-1', 'agent-2'],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().addAgentToConversation('conv-1', 'agent-2')

      expect(mockDb.update).not.toHaveBeenCalled()
    })

    it('should initialize participatingAgents if not present', async () => {
      const conversation = {
        id: 'conv-1',
        agentId: 'agent-1',
        workflowId: 'workflow-1',
        messages: [],
        timestamp: new Date(),
      }
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation as any] })

      await getStore().getState().addAgentToConversation('conv-1', 'agent-2')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          participatingAgents: ['agent-1', 'agent-2'],
        }),
      )
    })

    it('should show error for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await getStore()
        .getState()
        .addAgentToConversation('invalid-id', 'agent-2')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to add agent to conversation',
        expect.any(Error),
      )
    })
  })

  // ============================================
  // getConversationTitle Tests
  // ============================================
  describe('getConversationTitle', () => {
    it('should return stored title if available', () => {
      const conversation = createTestConversation({
        title: 'My Conversation Title',
      })

      const title = getStore().getState().getConversationTitle(conversation)

      expect(title).toBe('My Conversation Title')
    })

    it('should fallback to first user message truncated to 50 chars', () => {
      const longMessage =
        'This is a very long message that should definitely be truncated to fit the title limit'
      const conversation = createTestConversation({
        messages: [createTestMessage({ role: 'user', content: longMessage })],
      })

      const title = getStore().getState().getConversationTitle(conversation)

      // Should be truncated to 50 chars + '...'
      expect(title.endsWith('...')).toBe(true)
      expect(title.length).toBe(53) // 50 + '...'
      expect(title).toBe(longMessage.slice(0, 50) + '...')
    })

    it('should not add ellipsis for short messages', () => {
      const conversation = createTestConversation({
        messages: [
          createTestMessage({ role: 'user', content: 'Short message' }),
        ],
      })

      const title = getStore().getState().getConversationTitle(conversation)

      expect(title).toBe('Short message')
    })

    it('should return "New Conversation" as default', () => {
      const conversation = createTestConversation({ messages: [] })

      const title = getStore().getState().getConversationTitle(conversation)

      expect(title).toBe('New Conversation')
    })

    it('should skip system messages when finding first user message', () => {
      const conversation = createTestConversation({
        messages: [
          createTestMessage({ role: 'system', content: 'System prompt' }),
          createTestMessage({ role: 'user', content: 'User message' }),
        ],
      })

      const title = getStore().getState().getConversationTitle(conversation)

      expect(title).toBe('User message')
    })

    it('should skip assistant messages when finding first user message', () => {
      const conversation = createTestConversation({
        messages: [
          createTestMessage({ role: 'assistant', content: 'Hello!' }),
          createTestMessage({ role: 'user', content: 'Hi there' }),
        ],
      })

      const title = getStore().getState().getConversationTitle(conversation)

      expect(title).toBe('Hi there')
    })
  })

  // ============================================
  // Search Tests
  // ============================================
  describe('setSearchQuery', () => {
    it('should set search query state', () => {
      getStore().getState().setSearchQuery('test query')

      expect(getStore().getState().searchQuery).toBe('test query')
    })

    it('should allow empty query', () => {
      getStore().setState({ searchQuery: 'existing' })

      getStore().getState().setSearchQuery('')

      expect(getStore().getState().searchQuery).toBe('')
    })
  })

  describe('searchConversations', () => {
    it('should return all conversations for empty query', () => {
      const conversations = [
        createTestConversation({ id: 'conv-1' }),
        createTestConversation({ id: 'conv-2' }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('')

      expect(results).toEqual(conversations)
    })

    it('should return all conversations for whitespace-only query', () => {
      const conversations = [
        createTestConversation({ id: 'conv-1' }),
        createTestConversation({ id: 'conv-2' }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('   ')

      expect(results).toEqual(conversations)
    })

    it('should filter by title', () => {
      const conversations = [
        createTestConversation({ id: 'conv-1', title: 'React Tutorial' }),
        createTestConversation({ id: 'conv-2', title: 'Vue Guide' }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('react')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('conv-1')
    })

    it('should filter by summary', () => {
      const conversations = [
        createTestConversation({
          id: 'conv-1',
          summary: 'Discussion about TypeScript',
        }),
        createTestConversation({ id: 'conv-2', summary: 'Python basics' }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('typescript')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('conv-1')
    })

    it('should filter by message content', () => {
      const conversations = [
        createTestConversation({
          id: 'conv-1',
          messages: [createTestMessage({ content: 'How do I use Redux?' })],
        }),
        createTestConversation({
          id: 'conv-2',
          messages: [createTestMessage({ content: 'Explain MobX' })],
        }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('redux')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('conv-1')
    })

    it('should be case insensitive', () => {
      const conversations = [
        createTestConversation({ id: 'conv-1', title: 'JAVASCRIPT Tutorial' }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('javascript')

      expect(results).toHaveLength(1)
    })

    it('should match partial strings', () => {
      const conversations = [
        createTestConversation({
          id: 'conv-1',
          title: 'Understanding Algorithms',
        }),
      ]
      getStore().setState({ conversations })

      const results = getStore().getState().searchConversations('algo')

      expect(results).toHaveLength(1)
    })
  })

  describe('setShowPinnedOnly', () => {
    it('should set showPinnedOnly to true', () => {
      getStore().getState().setShowPinnedOnly(true)

      expect(getStore().getState().showPinnedOnly).toBe(true)
    })

    it('should set showPinnedOnly to false', () => {
      getStore().setState({ showPinnedOnly: true })

      getStore().getState().setShowPinnedOnly(false)

      expect(getStore().getState().showPinnedOnly).toBe(false)
    })
  })

  // ============================================
  // Pinning Conversations Tests
  // ============================================
  describe('pinConversation', () => {
    it('should set isPinned to true', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        isPinned: false,
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().pinConversation('conv-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          id: 'conv-1',
          isPinned: true,
        }),
      )
    })

    it('should update conversations state', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        isPinned: false,
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().pinConversation('conv-1')

      expect(getStore().getState().conversations[0].isPinned).toBe(true)
    })

    it('should update currentConversation if matching', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        isPinned: false,
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({
        conversations: [conversation],
        currentConversation: conversation,
      })

      await getStore().getState().pinConversation('conv-1')

      expect(getStore().getState().currentConversation?.isPinned).toBe(true)
    })

    it('should show error toast for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await getStore().getState().pinConversation('invalid-id')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to pin conversation',
        expect.any(Error),
      )
    })
  })

  describe('unpinConversation', () => {
    it('should set isPinned to false', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        isPinned: true,
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().unpinConversation('conv-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          id: 'conv-1',
          isPinned: false,
        }),
      )
    })

    it('should update conversations state', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        isPinned: true,
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().unpinConversation('conv-1')

      expect(getStore().getState().conversations[0].isPinned).toBe(false)
    })

    it('should show error toast for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await getStore().getState().unpinConversation('invalid-id')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to unpin conversation',
        expect.any(Error),
      )
    })
  })

  // ============================================
  // Pinning Messages Tests
  // ============================================
  describe('pinMessage', () => {
    it('should set message isPinned to true and add pinnedAt', async () => {
      const message = createTestMessage({ id: 'msg-1', isPinned: false })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().pinMessage('conv-1', 'msg-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-1',
              isPinned: true,
              pinnedAt: expect.any(Date),
            }),
          ]),
        }),
      )
    })

    it('should add messageId to pinnedMessageIds array', async () => {
      const message = createTestMessage({ id: 'msg-1' })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
        pinnedMessageIds: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().pinMessage('conv-1', 'msg-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          pinnedMessageIds: expect.arrayContaining(['msg-1']),
        }),
      )
    })

    it('should not duplicate messageId in pinnedMessageIds', async () => {
      const message = createTestMessage({ id: 'msg-1' })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
        pinnedMessageIds: ['msg-1'],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().pinMessage('conv-1', 'msg-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          pinnedMessageIds: ['msg-1'],
        }),
      )
    })

    it('should initialize pinnedMessageIds if not present', async () => {
      const message = createTestMessage({ id: 'msg-1' })
      const conversation = {
        id: 'conv-1',
        agentId: 'agent-1',
        workflowId: 'workflow-1',
        messages: [message],
        timestamp: new Date(),
        // Note: no pinnedMessageIds
      }
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation as any] })

      await getStore().getState().pinMessage('conv-1', 'msg-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          pinnedMessageIds: ['msg-1'],
        }),
      )
    })

    it('should show error toast for non-existent message', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore().getState().pinMessage('conv-1', 'invalid-msg')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to pin message',
        expect.any(Error),
      )
    })

    it('should show error toast for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await getStore().getState().pinMessage('invalid-conv', 'msg-1')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to pin message',
        expect.any(Error),
      )
    })
  })

  describe('unpinMessage', () => {
    it('should set message isPinned to false and clear pinnedAt', async () => {
      const message = createTestMessage({
        id: 'msg-1',
        isPinned: true,
        pinnedAt: new Date(),
      })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
        pinnedMessageIds: ['msg-1'],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().unpinMessage('conv-1', 'msg-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-1',
              isPinned: false,
              pinnedAt: undefined,
            }),
          ]),
        }),
      )
    })

    it('should remove messageId from pinnedMessageIds array', async () => {
      const message = createTestMessage({ id: 'msg-1', isPinned: true })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
        pinnedMessageIds: ['msg-1', 'msg-2'],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().unpinMessage('conv-1', 'msg-1')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          pinnedMessageIds: ['msg-2'],
        }),
      )
    })

    it('should show error toast for non-existent message', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore().getState().unpinMessage('conv-1', 'invalid-msg')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to unpin message',
        expect.any(Error),
      )
    })
  })

  // ============================================
  // updateMessage Tests
  // ============================================
  describe('updateMessage', () => {
    it('should update message content', async () => {
      const message = createTestMessage({
        id: 'msg-1',
        content: 'Original content',
      })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore()
        .getState()
        .updateMessage('conv-1', 'msg-1', 'Updated content')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-1',
              content: 'Updated content',
            }),
          ]),
        }),
      )
    })

    it('should preserve other message properties', async () => {
      const message = createTestMessage({
        id: 'msg-1',
        role: 'assistant',
        content: 'Original',
        agentId: 'agent-1',
      })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().updateMessage('conv-1', 'msg-1', 'Updated')

      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-1',
              role: 'assistant',
              agentId: 'agent-1',
              content: 'Updated',
            }),
          ]),
        }),
      )
    })

    it('should update conversations state', async () => {
      const message = createTestMessage({ id: 'msg-1', content: 'Original' })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().updateMessage('conv-1', 'msg-1', 'Updated')

      const updatedMsg = getStore().getState().conversations[0].messages[0]
      expect(updatedMsg.content).toBe('Updated')
    })

    it('should update currentConversation if matching', async () => {
      const message = createTestMessage({ id: 'msg-1', content: 'Original' })
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [message],
      })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({
        conversations: [conversation],
        currentConversation: conversation,
      })

      await getStore().getState().updateMessage('conv-1', 'msg-1', 'Updated')

      expect(
        getStore().getState().currentConversation?.messages[0].content,
      ).toBe('Updated')
    })

    it('should show error toast for non-existent message', async () => {
      const conversation = createTestConversation({
        id: 'conv-1',
        messages: [],
      })
      mockDb.get.mockResolvedValueOnce(conversation)

      await getStore()
        .getState()
        .updateMessage('conv-1', 'invalid-msg', 'Updated')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to update message',
        expect.any(Error),
      )
    })

    it('should show error toast for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await getStore()
        .getState()
        .updateMessage('invalid-conv', 'msg-1', 'Updated')

      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to update message',
        expect.any(Error),
      )
    })
  })

  // ============================================
  // generateAndUpdateTitle Tests
  // ============================================
  describe('generateAndUpdateTitle', () => {
    it('should generate and update title for conversation', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().generateAndUpdateTitle('conv-1')

      expect(mockTitleGenerator.generateTitle).toHaveBeenCalledWith(
        conversation,
      )
      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          title: 'Generated Title',
        }),
      )
    })

    it('should update conversations state with new title', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().generateAndUpdateTitle('conv-1')

      expect(getStore().getState().conversations[0].title).toBe(
        'Generated Title',
      )
    })

    it('should update currentConversation if matching', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      getStore().setState({
        conversations: [conversation],
        currentConversation: conversation,
      })

      await getStore().getState().generateAndUpdateTitle('conv-1')

      expect(getStore().getState().currentConversation?.title).toBe(
        'Generated Title',
      )
    })

    it('should not throw for non-existent conversation', async () => {
      getStore().setState({ conversations: [] })

      // Should not throw, just log warning
      await expect(
        getStore().getState().generateAndUpdateTitle('invalid-id'),
      ).resolves.not.toThrow()
    })
  })

  // ============================================
  // summarizeConversation Tests
  // ============================================
  describe('summarizeConversation', () => {
    it('should generate and save summary', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      const summary = await getStore()
        .getState()
        .summarizeConversation('conv-1')

      expect(summary).toBe('Test summary of the conversation')
      expect(mockDb.update).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          summary: 'Test summary of the conversation',
        }),
      )
    })

    it('should update conversations state with summary', async () => {
      const conversation = createTestConversation({ id: 'conv-1' })
      mockDb.get.mockResolvedValueOnce(conversation)
      getStore().setState({ conversations: [conversation] })

      await getStore().getState().summarizeConversation('conv-1')

      expect(getStore().getState().conversations[0].summary).toBe(
        'Test summary of the conversation',
      )
    })

    it('should throw error for non-existent conversation', async () => {
      mockDb.get.mockResolvedValueOnce(null)

      await expect(
        getStore().getState().summarizeConversation('invalid-id'),
      ).rejects.toThrow('Conversation not found')
      expect(mockToast.errorToast).toHaveBeenCalledWith(
        'Failed to summarize conversation',
        expect.any(Error),
      )
    })
  })

  // ============================================
  // isLoading State Tests
  // ============================================
  describe('isLoading management', () => {
    it('should set isLoading true at start and false at end for loadConversations', async () => {
      let loadingDuringOperation = false
      mockDb.getAll.mockImplementation(async () => {
        loadingDuringOperation = getStore().getState().isLoading
        return []
      })

      expect(getStore().getState().isLoading).toBe(false)
      await getStore().getState().loadConversations()

      expect(loadingDuringOperation).toBe(true)
      expect(getStore().getState().isLoading).toBe(false)
    })

    it('should reset isLoading on error', async () => {
      mockDb.getAll.mockRejectedValueOnce(new Error('Error'))

      await getStore().getState().loadConversations()

      expect(getStore().getState().isLoading).toBe(false)
    })
  })
})
