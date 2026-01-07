import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  detectFileType,
  detectFileTypeForProvider,
  generateContentHash,
  hasContentChanged,
  normalizeToKnowledgeItem,
  mergeWithExisting,
  PROVIDER_FILE_TYPES,
} from '@/features/connectors/normalizer'
import type { Connector, ConnectorItem } from '@/features/connectors/types'
import type { KnowledgeItem } from '@/types'

// Mock crypto API
const mockCrypto = {
  randomUUID: vi.fn(() => 'test-uuid-12345'),
  subtle: {
    digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
      // Create a deterministic hash based on input
      const arr = new Uint8Array(data)
      const result = new Uint8Array(32)
      let sum = 0
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i]
      }
      for (let i = 0; i < 32; i++) {
        result[i] = (sum + i * 7) % 256
      }
      return result.buffer
    }),
  },
}

// Helper to create a mock connector
const createMockConnector = (
  overrides: Partial<Connector> = {},
): Connector => ({
  id: 'connector-1',
  category: 'app',
  provider: 'google-drive',
  name: 'My Drive',
  syncEnabled: true,
  status: 'connected',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

// Helper to create a mock connector item
const createMockConnectorItem = (
  overrides: Partial<ConnectorItem> = {},
): ConnectorItem => ({
  externalId: 'ext-123',
  name: 'test-file.txt',
  type: 'file',
  mimeType: 'text/plain',
  size: 1024,
  path: '/documents/test-file.txt',
  lastModified: new Date('2025-01-05'),
  ...overrides,
})

// Helper to create a mock knowledge item
const createMockKnowledgeItem = (
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem => ({
  id: 'item-1',
  name: 'existing-file.txt',
  type: 'file',
  fileType: 'text',
  content: 'original content',
  mimeType: 'text/plain',
  size: 512,
  path: '/documents/existing-file.txt',
  lastModified: new Date('2025-01-01'),
  createdAt: new Date('2024-12-01'),
  syncSource: 'connector',
  connectorId: 'connector-1',
  externalId: 'ext-456',
  ...overrides,
})

describe('normalizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true,
    })
  })

  describe('detectFileType', () => {
    describe('by MIME type', () => {
      it('should detect images by mime type', () => {
        expect(detectFileType('image/png', 'file.png')).toBe('image')
        expect(detectFileType('image/jpeg', 'photo.jpg')).toBe('image')
        expect(detectFileType('image/gif', 'animation.gif')).toBe('image')
        expect(detectFileType('image/webp', 'photo.webp')).toBe('image')
        expect(detectFileType('image/svg+xml', 'icon.svg')).toBe('image')
      })

      it('should detect documents by mime type', () => {
        expect(detectFileType('application/pdf', 'doc.pdf')).toBe('document')
        expect(detectFileType('application/msword', 'doc.doc')).toBe('document')
        expect(
          detectFileType(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc.docx',
          ),
        ).toBe('document')
        expect(
          detectFileType('application/vnd.google-apps.document', 'gdoc'),
        ).toBe('document')
        expect(
          detectFileType('application/vnd.google-apps.spreadsheet', 'gsheet'),
        ).toBe('document')
      })

      it('should detect text files by mime type', () => {
        expect(detectFileType('text/plain', 'file.txt')).toBe('text')
        expect(detectFileType('text/html', 'page.html')).toBe('text')
        expect(detectFileType('text/css', 'styles.css')).toBe('text')
        expect(detectFileType('application/json', 'data.json')).toBe('text')
        expect(detectFileType('application/javascript', 'app.js')).toBe('text')
        expect(detectFileType('application/xml', 'config.xml')).toBe('text')
      })

      it('should be case-insensitive for mime types', () => {
        expect(detectFileType('IMAGE/PNG', 'file.png')).toBe('image')
        expect(detectFileType('Text/Plain', 'file.txt')).toBe('text')
        expect(detectFileType('Application/PDF', 'doc.pdf')).toBe('document')
      })
    })

    describe('by extension', () => {
      it('should detect images by extension', () => {
        expect(detectFileType(undefined, 'photo.jpg')).toBe('image')
        expect(detectFileType(undefined, 'image.JPEG')).toBe('image')
        expect(detectFileType(undefined, 'icon.png')).toBe('image')
        expect(detectFileType(undefined, 'logo.svg')).toBe('image')
        expect(detectFileType(undefined, 'banner.webp')).toBe('image')
        expect(detectFileType(undefined, 'photo.heic')).toBe('image')
      })

      it('should detect documents by extension', () => {
        expect(detectFileType(undefined, 'report.pdf')).toBe('document')
        expect(detectFileType(undefined, 'letter.doc')).toBe('document')
        expect(detectFileType(undefined, 'essay.docx')).toBe('document')
        expect(detectFileType(undefined, 'data.xlsx')).toBe('document')
        expect(detectFileType(undefined, 'slides.pptx')).toBe('document')
        expect(detectFileType(undefined, 'book.epub')).toBe('document')
      })

      it('should detect text files by extension', () => {
        expect(detectFileType(undefined, 'readme.txt')).toBe('text')
        expect(detectFileType(undefined, 'README.md')).toBe('text')
        expect(detectFileType(undefined, 'config.json')).toBe('text')
        expect(detectFileType(undefined, 'script.py')).toBe('text')
        expect(detectFileType(undefined, 'app.tsx')).toBe('text')
        expect(detectFileType(undefined, '.gitignore')).toBe('text')
        expect(detectFileType(undefined, 'data.csv')).toBe('text')
      })

      it('should be case-insensitive for extensions', () => {
        expect(detectFileType(undefined, 'photo.JPG')).toBe('image')
        expect(detectFileType(undefined, 'doc.PDF')).toBe('document')
        expect(detectFileType(undefined, 'readme.MD')).toBe('text')
      })
    })

    it('should return undefined for unknown types', () => {
      expect(
        detectFileType('application/octet-stream', 'data.bin'),
      ).toBeUndefined()
      expect(detectFileType(undefined, 'file.unknown')).toBeUndefined()
      expect(detectFileType(undefined, 'noextension')).toBeUndefined()
    })

    it('should prioritize mime type over extension', () => {
      // Image mime type with document extension
      expect(detectFileType('image/png', 'photo.pdf')).toBe('image')
      // Document mime type with text extension
      expect(detectFileType('application/pdf', 'doc.txt')).toBe('document')
    })

    it('should fall back to extension when mime type is unknown', () => {
      expect(detectFileType('application/octet-stream', 'photo.png')).toBe(
        'image',
      )
    })
  })

  describe('detectFileTypeForProvider', () => {
    it('should use provider-specific mappings for gmail', () => {
      expect(
        detectFileTypeForProvider('gmail', 'message/rfc822', 'email.eml'),
      ).toBe('document')
    })

    it('should use provider-specific mappings for notion', () => {
      expect(
        detectFileTypeForProvider(
          'notion',
          'application/vnd.notion.page',
          'page',
        ),
      ).toBe('document')
      expect(
        detectFileTypeForProvider('notion', 'text/markdown', 'doc.md'),
      ).toBe('text')
    })

    it('should use provider-specific mappings for google-drive', () => {
      expect(
        detectFileTypeForProvider(
          'google-drive',
          'application/vnd.google-apps.document',
          'doc',
        ),
      ).toBe('document')
      expect(
        detectFileTypeForProvider(
          'google-drive',
          'application/vnd.google-apps.drawing',
          'drawing',
        ),
      ).toBe('image')
    })

    it('should fall back to generic detection', () => {
      expect(
        detectFileTypeForProvider('google-drive', 'image/png', 'photo.png'),
      ).toBe('image')
      expect(
        detectFileTypeForProvider('notion', 'application/pdf', 'doc.pdf'),
      ).toBe('document')
    })

    it('should export PROVIDER_FILE_TYPES', () => {
      expect(PROVIDER_FILE_TYPES).toBeDefined()
      expect(PROVIDER_FILE_TYPES['google-drive']).toBeDefined()
      expect(PROVIDER_FILE_TYPES['notion']).toBeDefined()
      expect(PROVIDER_FILE_TYPES['gmail']).toBeDefined()
    })
  })

  describe('generateContentHash', () => {
    it('should generate consistent SHA-256 hash for same content', async () => {
      const content = 'Hello, World!'
      const hash1 = await generateContentHash(content)
      const hash2 = await generateContentHash(content)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different content', async () => {
      const hash1 = await generateContentHash('Content A')
      const hash2 = await generateContentHash('Content B')

      expect(hash1).not.toBe(hash2)
    })

    it('should return a hex-encoded string', async () => {
      const hash = await generateContentHash('test content')

      // Should only contain hex characters
      expect(hash).toMatch(/^[0-9a-f]+$/)
      // SHA-256 produces 32 bytes = 64 hex characters
      expect(hash).toHaveLength(64)
    })

    it('should handle empty string', async () => {
      const hash = await generateContentHash('')

      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should handle unicode content', async () => {
      const hash = await generateContentHash('Hello 🌍 World 日本語')

      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('hasContentChanged', () => {
    it('should return false when hashes match', () => {
      expect(hasContentChanged('abc123', 'abc123')).toBe(false)
    })

    it('should return true when hashes differ', () => {
      expect(hasContentChanged('abc123', 'def456')).toBe(true)
    })

    it('should return true when new hash is undefined', () => {
      expect(hasContentChanged(undefined, 'abc123')).toBe(true)
    })

    it('should return true when existing hash is undefined', () => {
      expect(hasContentChanged('abc123', undefined)).toBe(true)
    })

    it('should return true when both hashes are undefined', () => {
      expect(hasContentChanged(undefined, undefined)).toBe(true)
    })
  })

  describe('normalizeToKnowledgeItem', () => {
    it('should map all required fields', () => {
      const item = createMockConnectorItem({
        externalId: 'drive-file-123',
        name: 'Document.pdf',
        type: 'file',
        mimeType: 'application/pdf',
        size: 2048,
        path: '/work/Document.pdf',
        externalUrl: 'https://drive.google.com/file/123',
        content: 'PDF content here',
        contentHash: 'hash123',
        description: 'Important document',
        tags: ['work', 'important'],
      })
      const connector = createMockConnector()

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.name).toBe('Document.pdf')
      expect(result.type).toBe('file')
      expect(result.mimeType).toBe('application/pdf')
      expect(result.size).toBe(2048)
      expect(result.path).toBe('/work/Document.pdf')
      expect(result.content).toBe('PDF content here')
      expect(result.contentHash).toBe('hash123')
      expect(result.description).toBe('Important document')
      expect(result.tags).toEqual(['work', 'important'])
      expect(result.externalId).toBe('drive-file-123')
      expect(result.externalUrl).toBe('https://drive.google.com/file/123')
    })

    it('should add connector tracking fields', () => {
      const item = createMockConnectorItem()
      const connector = createMockConnector({ id: 'my-connector-id' })

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.connectorId).toBe('my-connector-id')
      expect(result.syncSource).toBe('connector')
      expect(result.syncedAt).toBeInstanceOf(Date)
      expect(result.lastSyncCheck).toBeInstanceOf(Date)
    })

    it('should generate new UUID for id', () => {
      const item = createMockConnectorItem()
      const connector = createMockConnector()

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.id).toBe('test-uuid-12345')
      expect(mockCrypto.randomUUID).toHaveBeenCalled()
    })

    it('should set createdAt to current time', () => {
      const item = createMockConnectorItem()
      const connector = createMockConnector()
      const before = new Date()

      const result = normalizeToKnowledgeItem(item, connector)

      const after = new Date()
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      )
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should preserve lastModified from item', () => {
      const modifiedDate = new Date('2025-01-10')
      const item = createMockConnectorItem({ lastModified: modifiedDate })
      const connector = createMockConnector()

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.lastModified).toBe(modifiedDate)
    })

    it('should detect file type from item', () => {
      const item = createMockConnectorItem({
        mimeType: 'application/pdf',
        name: 'doc.pdf',
      })
      const connector = createMockConnector()

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.fileType).toBe('document')
    })

    it('should use item fileType if provided', () => {
      const item = createMockConnectorItem({
        fileType: 'image',
        mimeType: 'text/plain', // Would normally detect as text
      })
      const connector = createMockConnector()

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.fileType).toBe('image')
    })

    it('should use provider-specific detection for app connectors', () => {
      const item = createMockConnectorItem({
        mimeType: 'application/vnd.google-apps.document',
        name: 'Google Doc',
      })
      const connector = createMockConnector({
        category: 'app',
        provider: 'google-drive',
      })

      const result = normalizeToKnowledgeItem(item, connector)

      expect(result.fileType).toBe('document')
    })

    it('should set parentId to undefined', () => {
      const item = createMockConnectorItem({ parentExternalId: 'parent-123' })
      const connector = createMockConnector()

      const result = normalizeToKnowledgeItem(item, connector)

      // parentId is resolved during folder sync, not during normalization
      expect(result.parentId).toBeUndefined()
    })
  })

  describe('mergeWithExisting', () => {
    it('should preserve original id', () => {
      const newItem = createMockConnectorItem({ name: 'updated.txt' })
      const existing = createMockKnowledgeItem({ id: 'original-id-123' })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.id).toBe('original-id-123')
    })

    it('should preserve original createdAt', () => {
      const originalCreatedAt = new Date('2024-01-01')
      const newItem = createMockConnectorItem()
      const existing = createMockKnowledgeItem({ createdAt: originalCreatedAt })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.createdAt).toBe(originalCreatedAt)
    })

    it('should update core fields from new item', () => {
      const newItem = createMockConnectorItem({
        name: 'new-name.txt',
        mimeType: 'text/markdown',
        size: 4096,
        content: 'new content',
        contentHash: 'new-hash',
      })
      const existing = createMockKnowledgeItem({
        name: 'old-name.txt',
        mimeType: 'text/plain',
        size: 1024,
      })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.name).toBe('new-name.txt')
      expect(result.mimeType).toBe('text/markdown')
      expect(result.size).toBe(4096)
      expect(result.content).toBe('new content')
      expect(result.contentHash).toBe('new-hash')
    })

    it('should prefer new tags if provided', () => {
      const newItem = createMockConnectorItem({ tags: ['new-tag', 'updated'] })
      const existing = createMockKnowledgeItem({ tags: ['old-tag'] })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.tags).toEqual(['new-tag', 'updated'])
    })

    it('should preserve existing tags if new tags not provided', () => {
      const newItem = createMockConnectorItem({ tags: undefined })
      const existing = createMockKnowledgeItem({ tags: ['preserved-tag'] })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.tags).toEqual(['preserved-tag'])
    })

    it('should prefer new description if provided', () => {
      const newItem = createMockConnectorItem({
        description: 'New description',
      })
      const existing = createMockKnowledgeItem({
        description: 'Old description',
      })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.description).toBe('New description')
    })

    it('should preserve existing description if new one not provided', () => {
      const newItem = createMockConnectorItem({ description: undefined })
      const existing = createMockKnowledgeItem({
        description: 'Preserved description',
      })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.description).toBe('Preserved description')
    })

    it('should preserve parentId from existing', () => {
      const newItem = createMockConnectorItem()
      const existing = createMockKnowledgeItem({ parentId: 'parent-folder-id' })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.parentId).toBe('parent-folder-id')
    })

    it('should update syncedAt and lastSyncCheck', () => {
      const newItem = createMockConnectorItem()
      const existing = createMockKnowledgeItem()
      const connector = createMockConnector()
      const before = new Date()

      const result = mergeWithExisting(newItem, existing, connector)

      const after = new Date()
      expect(result.syncedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      )
      expect(result.syncedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(result.lastSyncCheck!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      )
    })

    it('should preserve fileSystemHandle and watchId', () => {
      const mockHandle = 'serialized-handle-123'
      const newItem = createMockConnectorItem()
      const existing = createMockKnowledgeItem({
        fileSystemHandle: mockHandle,
        watchId: 'watch-123',
      })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.fileSystemHandle).toBe(mockHandle)
      expect(result.watchId).toBe('watch-123')
    })

    it('should update connector-specific fields', () => {
      const newItem = createMockConnectorItem({
        externalId: 'new-ext-id',
        externalUrl: 'https://new-url.com',
      })
      const existing = createMockKnowledgeItem({
        externalId: 'old-ext-id',
        externalUrl: 'https://old-url.com',
      })
      const connector = createMockConnector({ id: 'connector-2' })

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.externalId).toBe('new-ext-id')
      expect(result.externalUrl).toBe('https://new-url.com')
      expect(result.connectorId).toBe('connector-2')
    })

    it('should detect file type for new item', () => {
      const newItem = createMockConnectorItem({
        mimeType: 'image/png',
        name: 'photo.png',
        fileType: undefined,
      })
      const existing = createMockKnowledgeItem({ fileType: 'text' })
      const connector = createMockConnector()

      const result = mergeWithExisting(newItem, existing, connector)

      expect(result.fileType).toBe('image')
    })
  })
})
