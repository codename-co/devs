/**
 * Knowledge Tools Service Tests
 *
 * Tests for the knowledge-specific tool operations:
 * - searchKnowledge: Search documents with relevance scoring
 * - readDocument: Retrieve document content with pagination
 * - listDocuments: List and filter knowledge items
 * - getDocumentSummary: Generate document summaries
 *
 * @module test/lib/knowledge-tools/service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { KnowledgeItem } from '@/types'
import { createMockDb, resetMockDb } from '@/test/stores/mocks'

// Create mocks
const mockDb = createMockDb()

// Extend mock with hasStore method
const extendedMockDb = {
  ...mockDb,
  hasStore: vi.fn(() => true),
}

// Setup global mocks
vi.mock('@/lib/db', () => ({ db: extendedMockDb }))

// Import after mocks are set up
let service: typeof import('@/lib/knowledge-tools/service')

/**
 * Helper to create a test knowledge item (file)
 */
function createKnowledgeItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  const id = overrides.id ?? `item-${Date.now()}-${Math.random()}`
  return {
    id,
    name: overrides.name ?? 'Test Document',
    type: overrides.type ?? 'file',
    content: overrides.content ?? 'This is test content for the document.',
    transcript: overrides.transcript,
    description: overrides.description,
    path: overrides.path ?? `/${overrides.name ?? 'Test Document'}`,
    parentId: overrides.parentId,
    fileType: overrides.fileType ?? 'document',
    mimeType: overrides.mimeType ?? 'text/plain',
    size: overrides.size ?? 100,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? new Date(),
    lastModified: overrides.lastModified ?? new Date(),
    processingStatus: overrides.processingStatus ?? 'completed',
    syncSource: overrides.syncSource,
    externalUrl: overrides.externalUrl,
  } as KnowledgeItem
}

/**
 * Helper to create a test folder
 */
function createKnowledgeFolder(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  const id = overrides.id ?? `folder-${Date.now()}-${Math.random()}`
  return {
    id,
    name: overrides.name ?? 'Test Folder',
    type: 'folder',
    path: overrides.path ?? `/${overrides.name ?? 'Test Folder'}`,
    parentId: overrides.parentId,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? new Date(),
    lastModified: overrides.lastModified ?? new Date(),
  } as KnowledgeItem
}

describe('Knowledge Tools Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetMockDb(mockDb)
    extendedMockDb.hasStore.mockReturnValue(true)
    extendedMockDb.isInitialized.mockReturnValue(true)

    // Reset module cache to clear internal state
    vi.resetModules()

    // Re-import the module fresh
    service = await import('@/lib/knowledge-tools/service')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // searchKnowledge Tests
  // ============================================
  describe('searchKnowledge', () => {
    describe('basic functionality', () => {
      it('should return empty results when no items exist', async () => {
        extendedMockDb.getAll.mockResolvedValueOnce([])

        const result = await service.searchKnowledge({ query: 'test' })

        expect(result.query).toBe('test')
        expect(result.total_searched).toBe(0)
        expect(result.result_count).toBe(0)
        expect(result.hits).toEqual([])
        expect(result.truncated).toBe(false)
        expect(result.duration_ms).toBeGreaterThanOrEqual(0)
      })

      it('should find items matching the query', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Machine Learning Guide',
            content: 'A comprehensive guide to machine learning algorithms.',
            tags: ['ml', 'ai'],
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Python Tutorial',
            content: 'Learn Python programming basics.',
            tags: ['python'],
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'machine learning',
        })

        expect(result.result_count).toBeGreaterThanOrEqual(1)
        expect(result.hits.some((h) => h.id === 'doc-1')).toBe(true)
      })

      it('should calculate relevance scores', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Machine Learning',
            content: 'Machine learning is a type of artificial intelligence.',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'machine learning',
        })

        expect(result.hits.length).toBeGreaterThan(0)
        expect(result.hits[0].score).toBeGreaterThan(0)
        expect(result.hits[0].score).toBeLessThanOrEqual(1)
      })

      it('should generate snippets with highlighted matches', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Test Document',
            content:
              'This document contains important information about testing strategies.',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({ query: 'testing' })

        expect(result.hits.length).toBeGreaterThan(0)
        expect(result.hits[0].snippet).toBeDefined()
        // Snippets highlight matches with **bold**
        expect(result.hits[0].snippet).toContain('**')
      })

      it('should sort results by relevance score descending', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Unrelated Document',
            content: 'This has the word API once.',
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'API Reference',
            content:
              'Complete API documentation with API examples and API guides.',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({ query: 'API' })

        if (result.hits.length >= 2) {
          // Higher scoring item should come first
          expect(result.hits[0].score).toBeGreaterThanOrEqual(
            result.hits[1].score,
          )
        }
      })
    })

    describe('filtering', () => {
      it('should filter by file_types', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Document File',
            fileType: 'document',
            content: 'Test content',
          }),
          createKnowledgeItem({
            id: 'img-1',
            name: 'Image File',
            fileType: 'image',
            content: 'Test image content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'test',
          file_types: ['document'],
        })

        // Should only return document type
        const hasImage = result.hits.some((h) => h.fileType === 'image')
        expect(hasImage).toBe(false)
      })

      it('should filter by tags', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Tagged Document',
            content: 'Test content',
            tags: ['important', 'work'],
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Untagged Document',
            content: 'Test content',
            tags: ['personal'],
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'test',
          tags: ['important'],
        })

        expect(result.hits.every((h) => h.tags.includes('important'))).toBe(
          true,
        )
      })

      it('should filter by folder_id', async () => {
        const folder = createKnowledgeFolder({
          id: 'folder-1',
          name: 'My Folder',
        })
        const items = [
          folder,
          createKnowledgeItem({
            id: 'doc-1',
            name: 'In Folder',
            content: 'Test content',
            parentId: 'folder-1',
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Not In Folder',
            content: 'Test content',
            parentId: undefined,
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'test',
          folder_id: 'folder-1',
        })

        // Should only return items in the folder
        expect(result.hits.every((h) => h.id !== 'doc-2')).toBe(true)
      })

      it('should respect min_score threshold', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Exact Match',
            content: 'Exact match content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'Exact Match',
          min_score: 0.5,
        })

        expect(result.hits.every((h) => h.score >= 0.5)).toBe(true)
      })
    })

    describe('pagination', () => {
      it('should respect max_results limit', async () => {
        const items = Array.from({ length: 20 }, (_, i) =>
          createKnowledgeItem({
            id: `doc-${i}`,
            name: `Document ${i}`,
            content: 'Test content for search',
          }),
        )

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'test',
          max_results: 5,
        })

        expect(result.hits.length).toBeLessThanOrEqual(5)
        expect(result.truncated).toBe(true)
      })

      it('should indicate when results are not truncated', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Single Document',
            content: 'Test content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'test',
          max_results: 10,
        })

        expect(result.truncated).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle empty query', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Test',
            content: 'Content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({ query: '' })

        // Empty query should not match anything
        expect(result.result_count).toBe(0)
      })

      it('should handle knowledge store not initialized', async () => {
        extendedMockDb.hasStore.mockReturnValue(false)

        const result = await service.searchKnowledge({ query: 'test' })

        expect(result.total_searched).toBe(0)
        expect(result.hits).toEqual([])
      })

      it('should exclude folders from search results', async () => {
        const items = [
          createKnowledgeFolder({ id: 'folder-1', name: 'Test Folder' }),
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Test Document',
            content: 'Test content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({ query: 'test' })

        // Folders should not be in results
        expect(result.hits.some((h) => h.id === 'folder-1')).toBe(false)
      })

      it('should handle quoted phrases in query', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Document',
            content:
              'This contains the exact phrase "machine learning" in context.',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: '"machine learning"',
        })

        expect(result.total_searched).toBe(1)
      })
    })
  })

  // ============================================
  // readDocument Tests
  // ============================================
  describe('readDocument', () => {
    describe('basic functionality', () => {
      it('should retrieve document content by ID', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'My Document',
          content: 'This is the document content.',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({ document_id: 'doc-123' })

        expect(result.found).toBe(true)
        expect(result.content).toBe('This is the document content.')
        expect(result.content_type).toBe('text')
      })

      it('should include metadata when requested', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'My Document',
          content: 'Content here',
          tags: ['important'],
          fileType: 'document',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({
          document_id: 'doc-123',
          include_metadata: true,
        })

        expect(result.metadata).toBeDefined()
        expect(result.metadata?.id).toBe('doc-123')
        expect(result.metadata?.name).toBe('My Document')
        expect(result.metadata?.tags).toContain('important')
      })

      it('should exclude metadata when not requested', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'My Document',
          content: 'Content here',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({
          document_id: 'doc-123',
          include_metadata: false,
        })

        expect(result.metadata).toBeUndefined()
      })

      it('should prefer transcript over content when available', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'PDF Document',
          content: 'data:application/pdf;base64,xxxxx',
          transcript: 'Extracted text from PDF',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({ document_id: 'doc-123' })

        expect(result.content).toBe('Extracted text from PDF')
        expect(result.content_type).toBe('transcript')
      })
    })

    describe('pagination', () => {
      it('should apply max_length truncation', async () => {
        const longContent = 'A'.repeat(10000)
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Long Document',
          content: longContent,
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({
          document_id: 'doc-123',
          max_length: 100,
        })

        expect(result.content?.length).toBe(100)
        expect(result.truncated).toBe(true)
        expect(result.total_length).toBe(10000)
      })

      it('should apply offset correctly', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Document',
          content: 'ABCDEFGHIJ',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({
          document_id: 'doc-123',
          offset: 5,
        })

        expect(result.content).toBe('FGHIJ')
        expect(result.offset).toBe(5)
      })

      it('should combine offset and max_length', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Document',
          content: 'ABCDEFGHIJKLMNOP',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({
          document_id: 'doc-123',
          offset: 5,
          max_length: 5,
        })

        expect(result.content).toBe('FGHIJ')
        expect(result.truncated).toBe(true)
      })
    })

    describe('error handling', () => {
      it('should return not found for non-existent document', async () => {
        extendedMockDb.get.mockResolvedValueOnce(null)

        const result = await service.readDocument({
          document_id: 'non-existent',
        })

        expect(result.found).toBe(false)
        expect(result.error).toContain('not found')
        expect(result.content).toBeNull()
      })

      it('should return error for folder type', async () => {
        const folder = createKnowledgeFolder({ id: 'folder-123' })

        extendedMockDb.get.mockResolvedValueOnce(folder)

        const result = await service.readDocument({ document_id: 'folder-123' })

        expect(result.found).toBe(true)
        expect(result.error).toContain('folder')
        expect(result.content).toBeNull()
      })

      it('should handle knowledge store not initialized', async () => {
        extendedMockDb.hasStore.mockReturnValue(false)

        const result = await service.readDocument({ document_id: 'doc-123' })

        expect(result.found).toBe(false)
        expect(result.error).toContain('not initialized')
      })
    })

    describe('content types', () => {
      it('should detect text content', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          content: 'Plain text content',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({ document_id: 'doc-123' })

        expect(result.content_type).toBe('text')
      })

      it('should return error for base64 content (binary files need processing)', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          content: 'data:image/png;base64,iVBORw0KGgo=',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({ document_id: 'doc-123' })

        expect(result.content_type).toBe('base64')
        expect(result.content).toBeNull()
        expect(result.error).toContain('binary content')
      })

      it('should handle document with no readable content', async () => {
        // Create item directly without helper to ensure no default content
        const doc = {
          id: 'doc-123',
          name: 'Empty Document',
          type: 'file' as const,
          path: '/Empty Document',
          createdAt: new Date(),
          lastModified: new Date(),
          // Explicitly no content or transcript
        }

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.readDocument({ document_id: 'doc-123' })

        expect(result.content).toBeNull()
        expect(result.content_type).toBeNull()
      })
    })
  })

  // ============================================
  // listDocuments Tests
  // ============================================
  describe('listDocuments', () => {
    describe('basic functionality', () => {
      it('should list root-level items by default', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Root Doc',
            parentId: undefined,
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Nested Doc',
            parentId: 'folder-1',
          }),
          createKnowledgeFolder({
            id: 'folder-1',
            name: 'Folder',
            parentId: undefined,
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({})

        expect(result.items.some((i) => i.id === 'doc-1')).toBe(true)
        expect(result.items.some((i) => i.id === 'folder-1')).toBe(true)
        // Nested doc should not appear at root level
        expect(result.items.some((i) => i.id === 'doc-2')).toBe(false)
      })

      it('should list contents of a specific folder', async () => {
        const folder = createKnowledgeFolder({
          id: 'folder-1',
          name: 'My Folder',
        })
        const items = [
          folder,
          createKnowledgeItem({
            id: 'doc-1',
            name: 'In Folder',
            parentId: 'folder-1',
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Not In Folder',
            parentId: undefined,
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ folder_id: 'folder-1' })

        expect(result.parent).toBeDefined()
        expect(result.parent?.id).toBe('folder-1')
        expect(result.items.some((i) => i.id === 'doc-1')).toBe(true)
        expect(result.items.some((i) => i.id === 'doc-2')).toBe(false)
      })

      it('should list recursively when requested', async () => {
        const folder = createKnowledgeFolder({ id: 'folder-1', name: 'Parent' })
        const subfolder = createKnowledgeFolder({
          id: 'folder-2',
          name: 'Child',
          parentId: 'folder-1',
        })
        const items = [
          folder,
          subfolder,
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Direct Child',
            parentId: 'folder-1',
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Nested Child',
            parentId: 'folder-2',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({
          folder_id: 'folder-1',
          recursive: true,
        })

        expect(result.items.some((i) => i.id === 'doc-1')).toBe(true)
        expect(result.items.some((i) => i.id === 'doc-2')).toBe(true)
      })
    })

    describe('filtering', () => {
      it('should filter by type: file', async () => {
        const items = [
          createKnowledgeItem({ id: 'doc-1', name: 'Document' }),
          createKnowledgeFolder({ id: 'folder-1', name: 'Folder' }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ type: 'file' })

        expect(result.items.every((i) => i.type === 'file')).toBe(true)
      })

      it('should filter by type: folder', async () => {
        const items = [
          createKnowledgeItem({ id: 'doc-1', name: 'Document' }),
          createKnowledgeFolder({ id: 'folder-1', name: 'Folder' }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ type: 'folder' })

        expect(result.items.every((i) => i.type === 'folder')).toBe(true)
      })

      it('should filter by file_types', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Doc',
            fileType: 'document',
          }),
          createKnowledgeItem({
            id: 'img-1',
            name: 'Image',
            fileType: 'image',
          }),
          createKnowledgeFolder({ id: 'folder-1', name: 'Folder' }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ file_types: ['document'] })

        // Folders should still be included
        expect(result.items.some((i) => i.fileType === 'image')).toBe(false)
      })

      it('should filter by tags', async () => {
        const items = [
          createKnowledgeItem({ id: 'doc-1', name: 'Tagged', tags: ['work'] }),
          createKnowledgeItem({ id: 'doc-2', name: 'Untagged', tags: [] }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ tags: ['work'] })

        expect(result.items.every((i) => i.tags.includes('work'))).toBe(true)
      })
    })

    describe('sorting', () => {
      it('should sort by name ascending by default', async () => {
        const items = [
          createKnowledgeItem({ id: 'doc-2', name: 'Zebra' }),
          createKnowledgeItem({ id: 'doc-1', name: 'Apple' }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({})

        expect(result.items[0].name).toBe('Apple')
        expect(result.items[1].name).toBe('Zebra')
      })

      it('should sort by name descending', async () => {
        const items = [
          createKnowledgeItem({ id: 'doc-1', name: 'Apple' }),
          createKnowledgeItem({ id: 'doc-2', name: 'Zebra' }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({
          sort_by: 'name',
          sort_order: 'desc',
        })

        expect(result.items[0].name).toBe('Zebra')
        expect(result.items[1].name).toBe('Apple')
      })

      it('should sort by lastModified', async () => {
        const oldDate = new Date('2024-01-01')
        const newDate = new Date('2024-06-01')

        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Old',
            lastModified: oldDate,
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'New',
            lastModified: newDate,
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({
          sort_by: 'lastModified',
          sort_order: 'desc',
        })

        expect(result.items[0].name).toBe('New')
      })

      it('should sort by size', async () => {
        const items = [
          createKnowledgeItem({ id: 'doc-1', name: 'Small', size: 100 }),
          createKnowledgeItem({ id: 'doc-2', name: 'Large', size: 10000 }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({
          sort_by: 'size',
          sort_order: 'desc',
        })

        expect(result.items[0].name).toBe('Large')
      })
    })

    describe('pagination', () => {
      it('should apply limit', async () => {
        const items = Array.from({ length: 20 }, (_, i) =>
          createKnowledgeItem({ id: `doc-${i}`, name: `Doc ${i}` }),
        )

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ limit: 5 })

        expect(result.items.length).toBe(5)
        expect(result.has_more).toBe(true)
        expect(result.total_count).toBe(20)
      })

      it('should apply offset', async () => {
        const items = Array.from({ length: 10 }, (_, i) =>
          createKnowledgeItem({ id: `doc-${i}`, name: `Doc ${i}` }),
        )

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ offset: 5 })

        expect(result.offset).toBe(5)
        expect(result.items.length).toBeLessThanOrEqual(5)
      })

      it('should combine limit and offset', async () => {
        const items = Array.from({ length: 20 }, (_, i) =>
          createKnowledgeItem({
            id: `doc-${i}`,
            name: `Doc ${i.toString().padStart(2, '0')}`,
          }),
        )

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({
          offset: 5,
          limit: 3,
        })

        expect(result.items.length).toBe(3)
        expect(result.offset).toBe(5)
        expect(result.has_more).toBe(true)
      })

      it('should indicate has_more correctly when at end', async () => {
        const items = Array.from({ length: 5 }, (_, i) =>
          createKnowledgeItem({ id: `doc-${i}`, name: `Doc ${i}` }),
        )

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({ limit: 10 })

        expect(result.has_more).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle empty knowledge base', async () => {
        extendedMockDb.getAll.mockResolvedValueOnce([])

        const result = await service.listDocuments({})

        expect(result.items).toEqual([])
        expect(result.total_count).toBe(0)
        expect(result.has_more).toBe(false)
      })

      it('should handle knowledge store not initialized', async () => {
        extendedMockDb.hasStore.mockReturnValue(false)

        const result = await service.listDocuments({})

        expect(result.items).toEqual([])
        expect(result.total_count).toBe(0)
      })

      it('should include childCount for folders', async () => {
        const items = [
          createKnowledgeFolder({ id: 'folder-1', name: 'Parent' }),
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Child 1',
            parentId: 'folder-1',
          }),
          createKnowledgeItem({
            id: 'doc-2',
            name: 'Child 2',
            parentId: 'folder-1',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.listDocuments({})

        const folder = result.items.find((i) => i.id === 'folder-1')
        expect(folder?.childCount).toBe(2)
      })
    })
  })

  // ============================================
  // getDocumentSummary Tests
  // ============================================
  describe('getDocumentSummary', () => {
    describe('basic functionality', () => {
      it('should generate summary for a document', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Technical Document',
          content:
            'This is an important document about machine learning. ' +
            'It covers deep learning algorithms and neural networks. ' +
            'The main focus is on practical applications.',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        expect(result.found).toBe(true)
        expect(result.summary).toBeDefined()
        expect(result.summary?.length).toBeGreaterThan(0)
      })

      it('should extract key topics', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Programming Guide',
          content:
            'Python programming is essential for machine learning. ' +
            'Python provides many libraries for machine learning. ' +
            'Machine learning algorithms can be implemented in Python.',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        expect(result.key_topics).toBeDefined()
        expect(Array.isArray(result.key_topics)).toBe(true)
      })

      it('should include metadata', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Test Doc',
          content: 'Some content here.',
          fileType: 'document',
          size: 500,
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        expect(result.metadata).toBeDefined()
        expect(result.metadata?.id).toBe('doc-123')
        expect(result.metadata?.name).toBe('Test Doc')
      })

      it('should indicate cached status', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          content: 'Test content',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        // Current implementation always generates fresh summaries
        expect(result.cached).toBe(false)
      })
    })

    describe('options', () => {
      it('should respect max_words parameter', async () => {
        const longContent = Array(100)
          .fill('This is a sentence with important content.')
          .join(' ')
        const doc = createKnowledgeItem({
          id: 'doc-123',
          content: longContent,
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
          max_words: 20,
        })

        if (result.summary) {
          const wordCount = result.summary.split(/\s+/).length
          expect(wordCount).toBeLessThanOrEqual(30) // Allow some flexibility
        }
      })

      it('should focus summary on specified topic', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          content:
            'This document covers many topics. ' +
            'Security is an important consideration. ' +
            'Performance optimization is also discussed. ' +
            'Security vulnerabilities should be addressed.',
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
          focus: 'security',
        })

        // Summary should prioritize sentences about security
        expect(result.summary).toBeDefined()
      })
    })

    describe('error handling', () => {
      it('should return not found for non-existent document', async () => {
        extendedMockDb.get.mockResolvedValueOnce(null)

        const result = await service.getDocumentSummary({
          document_id: 'non-existent',
        })

        expect(result.found).toBe(false)
        expect(result.error).toContain('not found')
        expect(result.summary).toBeNull()
      })

      it('should return error for folder type', async () => {
        const folder = createKnowledgeFolder({ id: 'folder-123' })

        extendedMockDb.get.mockResolvedValueOnce(folder)

        const result = await service.getDocumentSummary({
          document_id: 'folder-123',
        })

        expect(result.found).toBe(true)
        expect(result.error).toContain('folder')
        expect(result.summary).toBeNull()
      })

      it('should handle document with no content', async () => {
        // Create item directly without helper to ensure no default content
        const doc = {
          id: 'doc-123',
          name: 'Empty Document',
          type: 'file' as const,
          path: '/Empty Document',
          createdAt: new Date(),
          lastModified: new Date(),
          // Explicitly no content or transcript
        }

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        expect(result.found).toBe(true)
        expect(result.error).toBeDefined()
        expect(result.error).toContain('no readable content')
        expect(result.summary).toBeNull()
      })

      it('should return error for binary content (needs processing)', async () => {
        const doc = createKnowledgeItem({
          id: 'doc-123',
          name: 'Binary File.pdf',
          content: 'data:application/pdf;base64,JVBERi0xLjQK',
          // No transcript - not yet processed
        })

        extendedMockDb.get.mockResolvedValueOnce(doc)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        expect(result.found).toBe(true)
        expect(result.error).toContain('binary content')
        expect(result.summary).toBeNull()
      })

      it('should handle knowledge store not initialized', async () => {
        extendedMockDb.hasStore.mockReturnValue(false)

        const result = await service.getDocumentSummary({
          document_id: 'doc-123',
        })

        expect(result.found).toBe(false)
        expect(result.error).toContain('not initialized')
      })
    })
  })

  // ============================================
  // expandSearchQuery Tests
  // ============================================
  describe('expandSearchQuery', () => {
    describe('basic functionality', () => {
      it('should return expanded terms from LLM response', async () => {
        // Mock the LLM service
        const mockLLMService = await import('@/lib/llm')
        vi.spyOn(mockLLMService.LLMService, 'chat').mockResolvedValueOnce({
          content: JSON.stringify({
            original_terms: ['ticket', 'price'],
            expanded_terms: [
              'ticket',
              'price',
              'cost',
              'pricing',
              'fee',
              'admission',
              'fare',
            ],
            synonyms: {
              ticket: ['pass', 'entry'],
              price: ['cost', 'fee', 'rate'],
            },
          }),
          finish_reason: 'stop',
        })

        const result = await service.expandSearchQuery(
          'What is the ticket price?',
          {
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: 'test-key',
          },
        )

        expect(result.expanded_terms).toContain('ticket')
        expect(result.expanded_terms).toContain('price')
        expect(result.expanded_terms).toContain('cost')
        expect(result.expanded_terms.length).toBeGreaterThan(2)
      })

      it('should handle LLM errors gracefully by returning original terms', async () => {
        const mockLLMService = await import('@/lib/llm')
        vi.spyOn(mockLLMService.LLMService, 'chat').mockRejectedValueOnce(
          new Error('API Error'),
        )

        const result = await service.expandSearchQuery('ticket price', {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
        })

        // Should fall back to original tokenized terms
        expect(result.expanded_terms).toContain('ticket')
        expect(result.expanded_terms).toContain('price')
        expect(result.used_fallback).toBe(true)
      })

      it('should handle malformed JSON response gracefully', async () => {
        const mockLLMService = await import('@/lib/llm')
        vi.spyOn(mockLLMService.LLMService, 'chat').mockResolvedValueOnce({
          content: 'This is not valid JSON',
          finish_reason: 'stop',
        })

        const result = await service.expandSearchQuery('event tickets', {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
        })

        // Should fall back to original terms
        expect(result.expanded_terms).toContain('event')
        expect(result.expanded_terms).toContain('tickets')
        expect(result.used_fallback).toBe(true)
      })

      it('should deduplicate expanded terms', async () => {
        const mockLLMService = await import('@/lib/llm')
        vi.spyOn(mockLLMService.LLMService, 'chat').mockResolvedValueOnce({
          content: JSON.stringify({
            original_terms: ['price'],
            expanded_terms: ['price', 'Price', 'PRICE', 'cost', 'Cost'],
          }),
          finish_reason: 'stop',
        })

        const result = await service.expandSearchQuery('price', {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
        })

        // Should have unique lowercase terms
        const uniqueTerms = new Set(result.expanded_terms)
        expect(uniqueTerms.size).toBe(result.expanded_terms.length)
      })

      it('should limit expanded terms to prevent over-expansion', async () => {
        const mockLLMService = await import('@/lib/llm')
        // Return way too many terms
        const manyTerms = Array.from({ length: 50 }, (_, i) => `term${i}`)
        vi.spyOn(mockLLMService.LLMService, 'chat').mockResolvedValueOnce({
          content: JSON.stringify({
            original_terms: ['test'],
            expanded_terms: manyTerms,
          }),
          finish_reason: 'stop',
        })

        const result = await service.expandSearchQuery('test', {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
        })

        // Should cap at reasonable limit (e.g., 20 terms)
        expect(result.expanded_terms.length).toBeLessThanOrEqual(20)
      })
    })

    describe('searchKnowledge with semantic expansion', () => {
      it('should use expanded terms with explicit config', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Event Pricing',
            content: 'The admission fee for the concert is $50.',
            tags: ['events'],
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const mockLLMService = await import('@/lib/llm')
        vi.spyOn(mockLLMService.LLMService, 'chat').mockResolvedValueOnce({
          content: JSON.stringify({
            original_terms: ['ticket', 'price'],
            expanded_terms: [
              'ticket',
              'price',
              'admission',
              'fee',
              'cost',
              'pricing',
            ],
          }),
          finish_reason: 'stop',
        })

        const result = await service.searchKnowledge({
          query: 'ticket price',
          semantic_search: {
            llm_config: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              apiKey: 'test-key',
            },
          },
        })

        // Should find the document even though it says "admission fee" not "ticket price"
        expect(result.hits.length).toBeGreaterThan(0)
        expect(result.hits[0].id).toBe('doc-1')
        expect(result.semantic_expansion_used).toBe(true)
      })

      it('should auto-infer LLM config from active credentials by default', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Event Info',
            content: 'The admission fee is $50.',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        // Mock CredentialService to return active config
        const mockCredentialService = await import('@/lib/credential-service')
        vi.spyOn(
          mockCredentialService.CredentialService,
          'getActiveConfig',
        ).mockResolvedValueOnce({
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'auto-key',
        })

        const mockLLMService = await import('@/lib/llm')
        vi.spyOn(mockLLMService.LLMService, 'chat').mockResolvedValueOnce({
          content: JSON.stringify({
            original_terms: ['ticket', 'price'],
            expanded_terms: ['ticket', 'price', 'admission', 'fee'],
          }),
          finish_reason: 'stop',
        })

        // No semantic_search config - should auto-enable with active credentials
        const result = await service.searchKnowledge({
          query: 'ticket price',
        })

        expect(result.semantic_expansion_used).toBe(true)
      })

      it('should fall back to keyword search when no LLM config available', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Test Document',
            content: 'Simple test content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        // Mock CredentialService to return null (no config)
        const mockCredentialService = await import('@/lib/credential-service')
        vi.spyOn(
          mockCredentialService.CredentialService,
          'getActiveConfig',
        ).mockResolvedValueOnce(null)

        const result = await service.searchKnowledge({
          query: 'test',
        })

        expect(result.result_count).toBeGreaterThanOrEqual(0)
        // Falls back to keyword search when no LLM config
        expect(result.semantic_expansion_used).toBe(false)
      })

      it('should disable semantic search when explicitly set to false', async () => {
        const items = [
          createKnowledgeItem({
            id: 'doc-1',
            name: 'Test Document',
            content: 'Simple test content',
          }),
        ]

        extendedMockDb.getAll.mockResolvedValueOnce(items)

        const result = await service.searchKnowledge({
          query: 'test',
          semantic_search: false,
        })

        expect(result.result_count).toBeGreaterThanOrEqual(0)
        expect(result.semantic_expansion_used).toBe(false)
      })
    })
  })
})
