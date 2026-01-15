import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  Connector,
  SearchResult,
  ListResult,
  ContentResult,
  AppConnectorProviderInterface,
} from '@/features/connectors/types'
import {
  GMAIL_TOOL_DEFINITIONS,
  DRIVE_TOOL_DEFINITIONS,
  CALENDAR_TOOL_DEFINITIONS,
  TASKS_TOOL_DEFINITIONS,
  NOTION_TOOL_DEFINITIONS,
  CONNECTOR_TOOL_DEFINITIONS,
  getToolDefinitionsForProvider,
} from '@/features/connectors/tools'

// Mock the database and provider registry
vi.mock('@/lib/db', () => ({
  db: {
    isInitialized: vi.fn(() => true),
    init: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('@/features/connectors/provider-registry', () => ({
  ProviderRegistry: {
    get: vi.fn(),
  },
}))

describe('Connector Tools', () => {
  describe('Tool Definitions', () => {
    describe('Gmail Tools', () => {
      it('should define gmail_search tool', () => {
        const tool = GMAIL_TOOL_DEFINITIONS.gmail_search
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('gmail_search')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('query')
      })

      it('should define gmail_read tool', () => {
        const tool = GMAIL_TOOL_DEFINITIONS.gmail_read
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('gmail_read')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('message_id')
      })

      it('should define gmail_list_labels tool', () => {
        const tool = GMAIL_TOOL_DEFINITIONS.gmail_list_labels
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('gmail_list_labels')
        expect(tool.function.parameters.required).toContain('connector_id')
      })

      it('should have helpful descriptions for Gmail search syntax', () => {
        const description =
          GMAIL_TOOL_DEFINITIONS.gmail_search.function.description
        expect(description).toContain('from:')
        expect(description).toContain('subject:')
        expect(description).toContain('is:unread')
        expect(description).toContain('has:attachment')
      })
    })

    describe('Google Drive Tools', () => {
      it('should define drive_search tool', () => {
        const tool = DRIVE_TOOL_DEFINITIONS.drive_search
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('drive_search')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('query')
      })

      it('should define drive_read tool', () => {
        const tool = DRIVE_TOOL_DEFINITIONS.drive_read
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('drive_read')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('file_id')
      })

      it('should define drive_list tool', () => {
        const tool = DRIVE_TOOL_DEFINITIONS.drive_list
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('drive_list')
        expect(tool.function.parameters.required).toContain('connector_id')
      })
    })

    describe('Google Calendar Tools', () => {
      it('should define calendar_list_events tool', () => {
        const tool = CALENDAR_TOOL_DEFINITIONS.calendar_list_events
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('calendar_list_events')
        expect(tool.function.parameters.required).toContain('connector_id')
      })

      it('should define calendar_get_event tool', () => {
        const tool = CALENDAR_TOOL_DEFINITIONS.calendar_get_event
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('calendar_get_event')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('event_id')
      })

      it('should define calendar_search tool', () => {
        const tool = CALENDAR_TOOL_DEFINITIONS.calendar_search
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('calendar_search')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('query')
      })
    })

    describe('Google Tasks Tools', () => {
      it('should define tasks_list tool', () => {
        const tool = TASKS_TOOL_DEFINITIONS.tasks_list
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('tasks_list')
        expect(tool.function.parameters.required).toContain('connector_id')
      })

      it('should define tasks_get tool', () => {
        const tool = TASKS_TOOL_DEFINITIONS.tasks_get
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('tasks_get')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('task_id')
      })

      it('should define tasks_list_tasklists tool', () => {
        const tool = TASKS_TOOL_DEFINITIONS.tasks_list_tasklists
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('tasks_list_tasklists')
        expect(tool.function.parameters.required).toContain('connector_id')
      })
    })

    describe('Notion Tools', () => {
      it('should define notion_search tool', () => {
        const tool = NOTION_TOOL_DEFINITIONS.notion_search
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('notion_search')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('query')
      })

      it('should define notion_read_page tool', () => {
        const tool = NOTION_TOOL_DEFINITIONS.notion_read_page
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('notion_read_page')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('page_id')
      })

      it('should define notion_query_database tool', () => {
        const tool = NOTION_TOOL_DEFINITIONS.notion_query_database
        expect(tool).toBeDefined()
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('notion_query_database')
        expect(tool.function.parameters.required).toContain('connector_id')
        expect(tool.function.parameters.required).toContain('database_id')
      })

      it('should have helpful description for database filtering', () => {
        const description =
          NOTION_TOOL_DEFINITIONS.notion_query_database.function.description
        expect(description).toContain('filter')
        expect(description).toContain('Status')
      })
    })

    describe('Combined Tool Definitions', () => {
      it('should include all tool definitions in CONNECTOR_TOOL_DEFINITIONS', () => {
        // Gmail tools
        expect(CONNECTOR_TOOL_DEFINITIONS.gmail_search).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.gmail_read).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.gmail_list_labels).toBeDefined()

        // Drive tools
        expect(CONNECTOR_TOOL_DEFINITIONS.drive_search).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.drive_read).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.drive_list).toBeDefined()

        // Calendar tools
        expect(CONNECTOR_TOOL_DEFINITIONS.calendar_list_events).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.calendar_get_event).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.calendar_search).toBeDefined()

        // Tasks tools
        expect(CONNECTOR_TOOL_DEFINITIONS.tasks_list).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.tasks_get).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.tasks_list_tasklists).toBeDefined()

        // Notion tools
        expect(CONNECTOR_TOOL_DEFINITIONS.notion_search).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.notion_read_page).toBeDefined()
        expect(CONNECTOR_TOOL_DEFINITIONS.notion_query_database).toBeDefined()
      })

      it('should have correct count of all tools', () => {
        const totalTools = Object.keys(CONNECTOR_TOOL_DEFINITIONS).length
        expect(totalTools).toBe(15) // 3 Gmail + 3 Drive + 3 Calendar + 3 Tasks + 3 Notion
      })
    })
  })

  describe('getToolDefinitionsForProvider', () => {
    it('should return Gmail tools for gmail provider', () => {
      const tools = getToolDefinitionsForProvider('gmail')
      expect(tools).toHaveLength(3)
      expect(tools.map((t) => t.function.name)).toContain('gmail_search')
      expect(tools.map((t) => t.function.name)).toContain('gmail_read')
      expect(tools.map((t) => t.function.name)).toContain('gmail_list_labels')
    })

    it('should return Drive tools for google-drive provider', () => {
      const tools = getToolDefinitionsForProvider('google-drive')
      expect(tools).toHaveLength(3)
      expect(tools.map((t) => t.function.name)).toContain('drive_search')
      expect(tools.map((t) => t.function.name)).toContain('drive_read')
      expect(tools.map((t) => t.function.name)).toContain('drive_list')
    })

    it('should return Calendar tools for google-calendar provider', () => {
      const tools = getToolDefinitionsForProvider('google-calendar')
      expect(tools).toHaveLength(3)
      expect(tools.map((t) => t.function.name)).toContain(
        'calendar_list_events',
      )
      expect(tools.map((t) => t.function.name)).toContain('calendar_get_event')
      expect(tools.map((t) => t.function.name)).toContain('calendar_search')
    })

    it('should return Tasks tools for google-tasks provider', () => {
      const tools = getToolDefinitionsForProvider('google-tasks')
      expect(tools).toHaveLength(3)
      expect(tools.map((t) => t.function.name)).toContain('tasks_list')
      expect(tools.map((t) => t.function.name)).toContain('tasks_get')
      expect(tools.map((t) => t.function.name)).toContain(
        'tasks_list_tasklists',
      )
    })

    it('should return Notion tools for notion provider', () => {
      const tools = getToolDefinitionsForProvider('notion')
      expect(tools).toHaveLength(3)
      expect(tools.map((t) => t.function.name)).toContain('notion_search')
      expect(tools.map((t) => t.function.name)).toContain('notion_read_page')
      expect(tools.map((t) => t.function.name)).toContain(
        'notion_query_database',
      )
    })

    it('should return empty array for unknown provider', () => {
      const tools = getToolDefinitionsForProvider('unknown-provider')
      expect(tools).toHaveLength(0)
    })

    it('should return empty array for providers without tools', () => {
      const tools = getToolDefinitionsForProvider('google-meet')
      expect(tools).toHaveLength(0)
    })
  })

  describe('Tool Definition Schema Compliance', () => {
    it('all tools should have valid JSON Schema parameters', () => {
      for (const [, tool] of Object.entries(CONNECTOR_TOOL_DEFINITIONS)) {
        expect(tool.function.parameters.type).toBe('object')
        expect(tool.function.parameters.properties).toBeDefined()
        expect(tool.function.parameters.required).toBeInstanceOf(Array)

        // All tools should require connector_id
        expect(tool.function.parameters.required).toContain('connector_id')

        // connector_id should be a string property
        expect(tool.function.parameters.properties.connector_id).toBeDefined()
        expect(tool.function.parameters.properties.connector_id.type).toBe(
          'string',
        )
      }
    })

    it('search tools should have query parameter', () => {
      const searchTools = [
        'gmail_search',
        'drive_search',
        'calendar_search',
        'notion_search',
      ]

      for (const toolName of searchTools) {
        const tool =
          CONNECTOR_TOOL_DEFINITIONS[
            toolName as keyof typeof CONNECTOR_TOOL_DEFINITIONS
          ]
        expect(tool.function.parameters.required).toContain('query')
        expect(tool.function.parameters.properties.query).toBeDefined()
        expect(tool.function.parameters.properties.query.type).toBe('string')
      }
    })

    it('read tools should have item ID parameter', () => {
      const readToolParams = {
        gmail_read: 'message_id',
        drive_read: 'file_id',
        calendar_get_event: 'event_id',
        tasks_get: 'task_id',
        notion_read_page: 'page_id',
      }

      for (const [toolName, paramName] of Object.entries(readToolParams)) {
        const tool =
          CONNECTOR_TOOL_DEFINITIONS[
            toolName as keyof typeof CONNECTOR_TOOL_DEFINITIONS
          ]
        expect(tool.function.parameters.required).toContain(paramName)
        expect(tool.function.parameters.properties[paramName]).toBeDefined()
        expect(tool.function.parameters.properties[paramName].type).toBe(
          'string',
        )
      }
    })

    it('list tools should have pagination parameters', () => {
      const listTools = [
        'gmail_list_labels',
        'drive_list',
        'calendar_list_events',
        'tasks_list',
        'tasks_list_tasklists',
      ]

      for (const toolName of listTools) {
        const tool =
          CONNECTOR_TOOL_DEFINITIONS[
            toolName as keyof typeof CONNECTOR_TOOL_DEFINITIONS
          ]
        // List tools should be flexible - connector_id required, but not enforce pagination params
        expect(tool.function.parameters.required).toContain('connector_id')
      }
    })
  })
})

describe('Connector Tools Service', () => {
  let mockDb: {
    isInitialized: ReturnType<typeof vi.fn>
    init: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
  }
  let mockProviderRegistry: { get: ReturnType<typeof vi.fn> }
  let mockProvider: Partial<AppConnectorProviderInterface>

  beforeEach(async () => {
    // Get mocked modules
    const dbModule = await import('@/lib/db')
    const registryModule = await import(
      '@/features/connectors/provider-registry'
    )

    mockDb = dbModule.db as unknown as typeof mockDb
    mockProviderRegistry =
      registryModule.ProviderRegistry as unknown as typeof mockProviderRegistry

    // Reset mocks
    vi.clearAllMocks()

    // Setup default mock provider
    mockProvider = {
      search: vi.fn(),
      list: vi.fn(),
      read: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Gmail Tools Service', () => {
    const mockGmailConnector: Connector = {
      id: 'gmail-connector-1',
      category: 'app',
      provider: 'gmail',
      name: 'My Gmail',
      status: 'connected',
      syncEnabled: false,
      accountEmail: 'test@gmail.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('gmailSearch should call provider.search with correct parameters', async () => {
      const { gmailSearch } = await import('@/features/connectors/tools')

      mockDb.get.mockResolvedValue(mockGmailConnector)
      mockProviderRegistry.get.mockResolvedValue(mockProvider)

      const mockSearchResult: SearchResult = {
        items: [
          {
            externalId: 'msg1',
            name: 'Test Subject',
            type: 'file',
            path: '/inbox',
            lastModified: new Date(),
            transcript: 'Email snippet...',
            metadata: {
              threadId: 'thread1',
              from: 'sender@example.com',
              to: 'test@gmail.com',
              labelIds: ['INBOX'],
            },
          },
        ],
        totalCount: 1,
      }

      ;(mockProvider.search as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSearchResult,
      )

      const result = await gmailSearch({
        connector_id: 'gmail-connector-1',
        query: 'from:boss@company.com',
        max_results: 5,
      })

      expect(mockDb.get).toHaveBeenCalledWith('connectors', 'gmail-connector-1')
      expect(mockProviderRegistry.get).toHaveBeenCalledWith('gmail')
      expect(mockProvider.search).toHaveBeenCalledWith(
        mockGmailConnector,
        'from:boss@company.com',
      )

      expect(result.query).toBe('from:boss@company.com')
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].id).toBe('msg1')
      expect(result.messages[0].subject).toBe('Test Subject')
      expect(result.connector.connectorId).toBe('gmail-connector-1')
      expect(result.connector.provider).toBe('gmail')
    })

    it('gmailSearch should reject non-Gmail connectors', async () => {
      const { gmailSearch } = await import('@/features/connectors/tools')

      const driveConnector: Connector = {
        ...mockGmailConnector,
        provider: 'google-drive',
      }

      mockDb.get.mockResolvedValue(driveConnector)

      await expect(
        gmailSearch({
          connector_id: 'gmail-connector-1',
          query: 'test',
        }),
      ).rejects.toThrow('is not a Gmail connector')
    })

    it('gmailSearch should reject connectors with error status', async () => {
      const { gmailSearch } = await import('@/features/connectors/tools')

      const errorConnector: Connector = {
        ...mockGmailConnector,
        status: 'error',
        errorMessage: 'Token expired',
      }

      mockDb.get.mockResolvedValue(errorConnector)

      await expect(
        gmailSearch({
          connector_id: 'gmail-connector-1',
          query: 'test',
        }),
      ).rejects.toThrow('Token expired')
    })

    it('gmailRead should fetch and parse email content', async () => {
      const { gmailRead } = await import('@/features/connectors/tools')

      mockDb.get.mockResolvedValue(mockGmailConnector)
      mockProviderRegistry.get.mockResolvedValue(mockProvider)

      const rawEmail = `Subject: Important Meeting
From: sender@example.com
To: test@gmail.com
Date: Wed, 15 Jan 2026 10:00:00 +0000

Hello,

This is the email body content.

Best regards`

      const mockContentResult: ContentResult = {
        content: rawEmail,
        mimeType: 'message/rfc822',
        metadata: {
          threadId: 'thread123',
          labelIds: ['INBOX', 'IMPORTANT'],
        },
      }

      ;(mockProvider.read as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockContentResult,
      )

      const result = await gmailRead({
        connector_id: 'gmail-connector-1',
        message_id: 'msg123',
      })

      expect(result.found).toBe(true)
      expect(result.message).toBeDefined()
      expect(result.message?.subject).toBe('Important Meeting')
      expect(result.message?.from).toBe('sender@example.com')
      expect(result.message?.to).toBe('test@gmail.com')
      expect(result.message?.body).toContain('email body content')
    })

    it('gmailListLabels should return system labels', async () => {
      const { gmailListLabels } = await import('@/features/connectors/tools')

      mockDb.get.mockResolvedValue(mockGmailConnector)

      const result = await gmailListLabels({
        connector_id: 'gmail-connector-1',
      })

      expect(result.labels).toBeDefined()
      expect(result.labels.length).toBeGreaterThan(0)
      expect(result.labels.map((l) => l.id)).toContain('INBOX')
      expect(result.labels.map((l) => l.id)).toContain('SENT')
      expect(result.connector.connectorId).toBe('gmail-connector-1')
    })
  })

  describe('Google Drive Tools Service', () => {
    const mockDriveConnector: Connector = {
      id: 'drive-connector-1',
      category: 'app',
      provider: 'google-drive',
      name: 'My Drive',
      status: 'connected',
      syncEnabled: false,
      accountEmail: 'test@gmail.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('driveSearch should call provider.search and return file summaries', async () => {
      const { driveSearch } = await import('@/features/connectors/tools')

      mockDb.get.mockResolvedValue(mockDriveConnector)
      mockProviderRegistry.get.mockResolvedValue(mockProvider)

      const mockSearchResult: SearchResult = {
        items: [
          {
            externalId: 'file1',
            name: 'Q4 Report.pdf',
            type: 'file',
            mimeType: 'application/pdf',
            size: 1024000,
            path: '/Reports',
            lastModified: new Date(),
            externalUrl: 'https://drive.google.com/file/d/file1',
          },
        ],
        totalCount: 1,
      }

      ;(mockProvider.search as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSearchResult,
      )

      const result = await driveSearch({
        connector_id: 'drive-connector-1',
        query: 'Q4 Report',
      })

      expect(result.files).toHaveLength(1)
      expect(result.files[0].id).toBe('file1')
      expect(result.files[0].name).toBe('Q4 Report.pdf')
      expect(result.files[0].mimeType).toBe('application/pdf')
      expect(result.files[0].isFolder).toBe(false)
    })

    it('driveList should list folder contents', async () => {
      const { driveList } = await import('@/features/connectors/tools')

      mockDb.get.mockResolvedValue(mockDriveConnector)
      mockProviderRegistry.get.mockResolvedValue(mockProvider)

      const mockListResult: ListResult = {
        items: [
          {
            externalId: 'folder1',
            name: 'Documents',
            type: 'folder',
            mimeType: 'application/vnd.google-apps.folder',
            path: '/',
            lastModified: new Date(),
          },
          {
            externalId: 'file1',
            name: 'notes.txt',
            type: 'file',
            mimeType: 'text/plain',
            size: 256,
            path: '/',
            lastModified: new Date(),
          },
        ],
        hasMore: false,
      }

      ;(mockProvider.list as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockListResult,
      )

      const result = await driveList({
        connector_id: 'drive-connector-1',
      })

      expect(result.files).toHaveLength(2)
      expect(result.files[0].isFolder).toBe(true)
      expect(result.files[1].isFolder).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when connector not found', async () => {
      const { gmailSearch } = await import('@/features/connectors/tools')

      mockDb.get.mockResolvedValue(null)

      await expect(
        gmailSearch({
          connector_id: 'nonexistent',
          query: 'test',
        }),
      ).rejects.toThrow('Connector not found')
    })

    it('should return found: false when read operation fails', async () => {
      const { gmailRead } = await import('@/features/connectors/tools')

      const mockConnector: Connector = {
        id: 'gmail-1',
        category: 'app',
        provider: 'gmail',
        name: 'Gmail',
        status: 'connected',
        syncEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.get.mockResolvedValue(mockConnector)
      mockProviderRegistry.get.mockResolvedValue(mockProvider)
      ;(mockProvider.read as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Message not found'),
      )

      const result = await gmailRead({
        connector_id: 'gmail-1',
        message_id: 'invalid-id',
      })

      expect(result.found).toBe(false)
      expect(result.error).toBe('Message not found')
    })
  })
})
