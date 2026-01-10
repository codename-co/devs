/**
 * Shared mock utilities for store tests
 */
import { vi, type Mock } from 'vitest'

/**
 * Mock IndexedDB wrapper
 */
export interface MockDb {
  isInitialized: Mock<() => boolean>
  init: Mock<() => Promise<void>>
  get: Mock<(store: string, id: string) => Promise<unknown>>
  getAll: Mock<(store: string) => Promise<unknown[]>>
  add: Mock<(store: string, item: unknown) => Promise<void>>
  update: Mock<(store: string, item: unknown) => Promise<void>>
  delete: Mock<(store: string, id: string) => Promise<void>>
}

export function createMockDb(): MockDb {
  return {
    isInitialized: vi.fn(() => true),
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Mock toast functions
 */
export interface MockToast {
  errorToast: Mock
  successToast: Mock
}

export function createMockToast(): MockToast {
  return {
    errorToast: vi.fn(),
    successToast: vi.fn(),
  }
}

/**
 * Mock fetch for agent JSON loading
 */
export function createMockFetch() {
  return vi.fn()
}

/**
 * Helper to create a test agent
 */
export function createTestAgent(
  overrides: Partial<{
    id: string
    slug: string
    name: string
    role: string
    instructions: string
    tags: string[]
    createdAt: Date
    updatedAt: Date
    deletedAt: Date
  }> = {},
) {
  const id = overrides.id ?? `custom-${Date.now()}`
  return {
    id,
    slug: overrides.slug ?? id.replace(/^custom-/, '').toLowerCase(),
    name: overrides.name ?? 'Test Agent',
    role: overrides.role ?? 'Test Role',
    instructions: overrides.instructions ?? 'Test instructions',
    tags: overrides.tags ?? ['test'],
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt,
    deletedAt: overrides.deletedAt,
  }
}

/**
 * Helper to create a test conversation
 */
export function createTestConversation(
  overrides: Partial<{
    id: string
    agentId: string
    workflowId: string
    participatingAgents: string[]
    messages: Array<{
      id: string
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: Date
      agentId?: string
      isPinned?: boolean
    }>
    title: string
    summary: string
    isPinned: boolean
    pinnedMessageIds: string[]
    timestamp: Date
    updatedAt: Date
  }> = {},
) {
  const now = new Date()
  return {
    id: overrides.id ?? `conv-${Date.now()}`,
    agentId: overrides.agentId ?? 'devs',
    workflowId: overrides.workflowId ?? `workflow-${Date.now()}`,
    participatingAgents: overrides.participatingAgents ?? ['devs'],
    messages: overrides.messages ?? [],
    title: overrides.title,
    summary: overrides.summary,
    isPinned: overrides.isPinned ?? false,
    pinnedMessageIds: overrides.pinnedMessageIds ?? [],
    timestamp: overrides.timestamp ?? now,
    updatedAt: overrides.updatedAt ?? overrides.timestamp ?? now,
  }
}

/**
 * Helper to create a test message
 */
export function createTestMessage(
  overrides: Partial<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    agentId: string
    isPinned: boolean
    pinnedAt: Date
    attachments: Array<{
      type: 'image' | 'document' | 'text'
      name: string
      data: string
      mimeType: string
      size?: number
    }>
  }> = {},
) {
  return {
    id: overrides.id ?? `msg-${Date.now()}`,
    role: overrides.role ?? 'user',
    content: overrides.content ?? 'Test message',
    timestamp: overrides.timestamp ?? new Date(),
    agentId: overrides.agentId,
    isPinned: overrides.isPinned,
    pinnedAt: overrides.pinnedAt,
    attachments: overrides.attachments,
  }
}

/**
 * Reset all mocks in a mock db instance
 */
export function resetMockDb(mockDb: MockDb) {
  mockDb.isInitialized.mockReset().mockReturnValue(true)
  mockDb.init.mockReset().mockResolvedValue(undefined)
  mockDb.get.mockReset().mockResolvedValue(null)
  mockDb.getAll.mockReset().mockResolvedValue([])
  mockDb.add.mockReset().mockResolvedValue(undefined)
  mockDb.update.mockReset().mockResolvedValue(undefined)
  mockDb.delete.mockReset().mockResolvedValue(undefined)
}
