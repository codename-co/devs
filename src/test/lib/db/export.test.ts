import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  collectExportData,
  downloadBlob,
  EXPORT_MAP_NAMES,
} from '@/lib/db/export'

// Mock the Yjs maps module
vi.mock('@/lib/yjs/maps', () => {
  const createMockMap = (data: Record<string, unknown> = {}) => ({
    toJSON: () => ({ ...data }),
  })

  return {
    agents: createMockMap({
      a1: { id: 'a1', name: 'Agent One' },
      a2: { id: 'a2', name: 'Agent Two' },
    }),
    conversations: createMockMap({
      c1: { id: 'c1', title: 'Conv One' },
    }),
    knowledge: createMockMap(),
    tasks: createMockMap(),
    artifacts: createMockMap(),
    memories: createMockMap(),
    preferences: createMockMap({
      main: { theme: 'dark' },
    }),
    credentials: createMockMap(),
    studioEntries: createMockMap(),
    workflows: createMockMap(),
    battles: createMockMap(),
    pinnedMessages: createMockMap(),
    traces: createMockMap(),
    spans: createMockMap(),
    tracingConfig: createMockMap(),
    connectors: createMockMap(),
    connectorSyncStates: createMockMap(),
    notifications: createMockMap(),
    memoryLearningEvents: createMockMap(),
    agentMemoryDocuments: createMockMap(),
    sharedContexts: createMockMap(),
    installedExtensions: createMockMap(),
    customExtensions: createMockMap(),
    langfuseConfig: createMockMap(),
    skills: createMockMap(),
  }
})

describe('db/export', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('EXPORT_MAP_NAMES', () => {
    it('should include core entity maps', () => {
      expect(EXPORT_MAP_NAMES).toContain('agents')
      expect(EXPORT_MAP_NAMES).toContain('conversations')
      expect(EXPORT_MAP_NAMES).toContain('knowledge')
      expect(EXPORT_MAP_NAMES).toContain('tasks')
      expect(EXPORT_MAP_NAMES).toContain('artifacts')
      expect(EXPORT_MAP_NAMES).toContain('memories')
    })

    it('should include settings maps', () => {
      expect(EXPORT_MAP_NAMES).toContain('preferences')
      expect(EXPORT_MAP_NAMES).toContain('credentials')
    })

    it('should include feature maps', () => {
      expect(EXPORT_MAP_NAMES).toContain('studioEntries')
      expect(EXPORT_MAP_NAMES).toContain('battles')
      expect(EXPORT_MAP_NAMES).toContain('traces')
      expect(EXPORT_MAP_NAMES).toContain('connectors')
      expect(EXPORT_MAP_NAMES).toContain('skills')
    })
  })

  describe('collectExportData', () => {
    it('should return export data with _meta', () => {
      const data = collectExportData()

      expect(data._meta).toBeDefined()
      expect(data._meta.source).toBe('yjs')
      expect(data._meta.version).toBe(1)
      expect(data._meta.compressed).toBe(true)
      expect(data._meta.maps).toBe(EXPORT_MAP_NAMES.length)
      expect(data._meta.exportedAt).toBeTruthy()
    })

    it('should include all map names in the export', () => {
      const data = collectExportData()

      for (const mapName of EXPORT_MAP_NAMES) {
        expect(data).toHaveProperty(mapName)
      }
    })

    it('should convert map values to arrays', () => {
      const data = collectExportData()

      const agents = data.agents as unknown[]
      expect(Array.isArray(agents)).toBe(true)
      expect(agents).toHaveLength(2)
      expect(agents).toContainEqual({ id: 'a1', name: 'Agent One' })
      expect(agents).toContainEqual({ id: 'a2', name: 'Agent Two' })
    })

    it('should handle maps with single entries', () => {
      const data = collectExportData()

      const conversations = data.conversations as unknown[]
      expect(Array.isArray(conversations)).toBe(true)
      expect(conversations).toHaveLength(1)
    })

    it('should handle empty maps', () => {
      const data = collectExportData()

      const knowledge = data.knowledge as unknown[]
      expect(Array.isArray(knowledge)).toBe(true)
      expect(knowledge).toHaveLength(0)
    })

    it('should produce valid JSON', () => {
      const data = collectExportData()
      const json = JSON.stringify(data)
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })

  describe('downloadBlob', () => {
    it('should create and click an anchor element', () => {
      const createObjectURLSpy = vi
        .fn()
        .mockReturnValue('blob:http://localhost/test')
      const revokeObjectURLSpy = vi.fn()
      global.URL.createObjectURL = createObjectURLSpy
      global.URL.revokeObjectURL = revokeObjectURLSpy

      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')

      const blob = new Blob(['test'], { type: 'application/gzip' })
      downloadBlob(blob, 'test-file.json.gz')

      expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(
        'blob:http://localhost/test',
      )

      const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement
      expect(anchor.download).toBe('test-file.json.gz')
      expect(anchor.href).toBe('blob:http://localhost/test')
    })
  })
})
