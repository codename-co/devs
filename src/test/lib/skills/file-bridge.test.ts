/**
 * Tests for File I/O Bridge — Knowledge Items ↔ Sandbox Virtual FS
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KnowledgeItem } from '@/types'

// ── Mock knowledge store ──

const mockKnowledgeItems = new Map<string, KnowledgeItem>()

vi.mock('@/stores/knowledgeStore', () => ({
  getKnowledgeItemDecrypted: async (id: string) =>
    mockKnowledgeItems.get(id) ?? undefined,
}))

import {
  resolveKnowledgeFile,
  resolveInputFiles,
  processOutputFiles,
  formatOutputForLLM,
  outputFileToKnowledgeData,
  inferMimeType,
  isBinaryMimeType,
} from '@/lib/skills/file-bridge'
import type { SandboxFile } from '@/lib/sandbox'

// ── Helpers ──

function makeKnowledgeItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  const now = new Date()
  return {
    id: 'kb-1',
    name: 'data.csv',
    type: 'file' as const,
    fileType: 'text' as const,
    content: 'a,b,c\n1,2,3',
    mimeType: 'text/csv',
    size: 15,
    path: '/data.csv',
    lastModified: now,
    createdAt: now,
    ...overrides,
  }
}

// ── Tests ──

describe('file-bridge', () => {
  beforeEach(() => {
    mockKnowledgeItems.clear()
  })

  // ── MIME type inference ─────────────────────────────────────

  describe('inferMimeType', () => {
    it('should infer common text types', () => {
      expect(inferMimeType('data.csv')).toBe('text/csv')
      expect(inferMimeType('readme.md')).toBe('text/markdown')
      expect(inferMimeType('config.json')).toBe('application/json')
      expect(inferMimeType('script.py')).toBe('text/x-python')
      expect(inferMimeType('data.yaml')).toBe('text/yaml')
    })

    it('should infer image types', () => {
      expect(inferMimeType('photo.png')).toBe('image/png')
      expect(inferMimeType('photo.jpg')).toBe('image/jpeg')
      expect(inferMimeType('logo.svg')).toBe('image/svg+xml')
    })

    it('should infer document types', () => {
      expect(inferMimeType('report.pdf')).toBe('application/pdf')
      expect(inferMimeType('doc.xlsx')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    })

    it('should default to application/octet-stream for unknown', () => {
      expect(inferMimeType('file.xyz')).toBe('application/octet-stream')
      expect(inferMimeType('noext')).toBe('application/octet-stream')
    })

    it('should handle paths with directories', () => {
      expect(inferMimeType('/output/results/data.csv')).toBe('text/csv')
    })
  })

  // ── Binary detection ──────────────────────────────────────

  describe('isBinaryMimeType', () => {
    it('should identify binary types', () => {
      expect(isBinaryMimeType('image/png')).toBe(true)
      expect(isBinaryMimeType('application/pdf')).toBe(true)
      expect(isBinaryMimeType('application/zip')).toBe(true)
      expect(isBinaryMimeType('application/octet-stream')).toBe(true)
    })

    it('should identify text types', () => {
      expect(isBinaryMimeType('text/plain')).toBe(false)
      expect(isBinaryMimeType('text/csv')).toBe(false)
      expect(isBinaryMimeType('text/markdown')).toBe(false)
      expect(isBinaryMimeType('application/json')).toBe(false)
      expect(isBinaryMimeType('application/javascript')).toBe(false)
    })
  })

  // ── Knowledge file resolution ────────────────────────────

  describe('resolveKnowledgeFile', () => {
    it('should resolve a knowledge item to a sandbox input file', async () => {
      mockKnowledgeItems.set(
        'kb-1',
        makeKnowledgeItem({
          id: 'kb-1',
          content: 'a,b\n1,2',
          mimeType: 'text/csv',
        }),
      )

      const result = await resolveKnowledgeFile({
        path: 'data.csv',
        knowledgeItemId: 'kb-1',
      })

      expect(result).not.toBeNull()
      expect(result!.path).toBe('data.csv')
      expect(result!.content).toBe('a,b\n1,2')
      expect(result!.encoding).toBe('text')
    })

    it('should return null for missing knowledge item', async () => {
      const result = await resolveKnowledgeFile({
        path: 'data.csv',
        knowledgeItemId: 'nonexistent',
      })

      expect(result).toBeNull()
    })

    it('should return null for knowledge item without content', async () => {
      mockKnowledgeItems.set(
        'kb-2',
        makeKnowledgeItem({ id: 'kb-2', content: undefined }),
      )

      const result = await resolveKnowledgeFile({
        path: 'empty.txt',
        knowledgeItemId: 'kb-2',
      })

      expect(result).toBeNull()
    })

    it('should set encoding to base64 for binary MIME types', async () => {
      mockKnowledgeItems.set(
        'kb-3',
        makeKnowledgeItem({
          id: 'kb-3',
          content: 'base64data==',
          mimeType: 'image/png',
        }),
      )

      const result = await resolveKnowledgeFile({
        path: 'image.png',
        knowledgeItemId: 'kb-3',
      })

      expect(result).not.toBeNull()
      expect(result!.encoding).toBe('base64')
    })

    it('should infer MIME type from path when item has no mimeType', async () => {
      mockKnowledgeItems.set(
        'kb-4',
        makeKnowledgeItem({
          id: 'kb-4',
          content: 'pdfcontent',
          mimeType: undefined,
        }),
      )

      const result = await resolveKnowledgeFile({
        path: 'document.pdf',
        knowledgeItemId: 'kb-4',
      })

      expect(result).not.toBeNull()
      expect(result!.encoding).toBe('base64') // PDF is binary
    })
  })

  // ── Input file resolution (mixed refs) ────────────────────

  describe('resolveInputFiles', () => {
    it('should resolve knowledge item references', async () => {
      mockKnowledgeItems.set(
        'kb-1',
        makeKnowledgeItem({ id: 'kb-1', content: 'csv data' }),
      )

      const result = await resolveInputFiles([
        { path: 'data.csv', knowledgeItemId: 'kb-1' },
      ])

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('data.csv')
      expect(result[0].content).toBe('csv data')
    })

    it('should pass through inline file references', async () => {
      const result = await resolveInputFiles([
        { path: 'test.txt', content: 'inline content' },
      ])

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('test.txt')
      expect(result[0].content).toBe('inline content')
      expect(result[0].encoding).toBe('text')
    })

    it('should handle mixed reference types', async () => {
      mockKnowledgeItems.set(
        'kb-1',
        makeKnowledgeItem({ id: 'kb-1', content: 'from kb' }),
      )

      const result = await resolveInputFiles([
        { path: 'kb-file.csv', knowledgeItemId: 'kb-1' },
        { path: 'inline.txt', content: 'inline' },
      ])

      expect(result).toHaveLength(2)
    })

    it('should exclude unresolvable references', async () => {
      const result = await resolveInputFiles([
        { path: 'missing.csv', knowledgeItemId: 'nonexistent' },
        { path: 'inline.txt', content: 'inline content' },
      ])

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('inline.txt')
    })

    it('should return empty array for empty input', async () => {
      const result = await resolveInputFiles([])
      expect(result).toHaveLength(0)
    })
  })

  // ── Output file processing ────────────────────────────────

  describe('processOutputFiles', () => {
    it('should add metadata to output files', () => {
      const outputs: SandboxFile[] = [
        { path: '/output/result.csv', content: 'x,y\n1,2', encoding: 'text' },
      ]

      const processed = processOutputFiles(outputs)

      expect(processed).toHaveLength(1)
      expect(processed[0].filename).toBe('result.csv')
      expect(processed[0].mimeType).toBe('text/csv')
      expect(processed[0].isBinary).toBe(false)
    })

    it('should detect binary output files', () => {
      const outputs: SandboxFile[] = [
        {
          path: '/output/chart.png',
          content: 'iVBORw0KGgo=',
          encoding: 'base64',
        },
      ]

      const processed = processOutputFiles(outputs)

      expect(processed[0].isBinary).toBe(true)
      expect(processed[0].mimeType).toBe('image/png')
    })

    it('should process multiple output files', () => {
      const outputs: SandboxFile[] = [
        { path: '/output/data.json', content: '{"a":1}', encoding: 'text' },
        { path: '/output/log.txt', content: 'done', encoding: 'text' },
      ]

      const processed = processOutputFiles(outputs)
      expect(processed).toHaveLength(2)
    })
  })

  // ── LLM output formatting ────────────────────────────────

  describe('formatOutputForLLM', () => {
    it('should return empty string for no files', () => {
      const result = formatOutputForLLM([])
      expect(result).toBe('')
    })

    it('should inline text file content', () => {
      const processed = processOutputFiles([
        { path: '/output/result.csv', content: 'a,b\n1,2', encoding: 'text' },
      ])

      const formatted = formatOutputForLLM(processed)
      expect(formatted).toContain('result.csv')
      expect(formatted).toContain('a,b')
    })

    it('should summarize binary files', () => {
      const processed = processOutputFiles([
        {
          path: '/output/chart.png',
          content: 'iVBORw0KGgo=',
          encoding: 'base64',
        },
      ])

      const formatted = formatOutputForLLM(processed)
      expect(formatted).toContain('chart.png')
      expect(formatted).toContain('image/png')
      expect(formatted).toContain('binary')
    })

    it('should truncate very large text files', () => {
      const largeContent = 'x'.repeat(15_000)
      const processed = processOutputFiles([
        { path: '/output/big.txt', content: largeContent, encoding: 'text' },
      ])

      const formatted = formatOutputForLLM(processed)
      expect(formatted).toContain('truncated')
      expect(formatted.length).toBeLessThan(largeContent.length)
    })
  })

  // ── Knowledge data conversion ─────────────────────────────

  describe('outputFileToKnowledgeData', () => {
    it('should create knowledge-compatible data for text files', () => {
      const processed = processOutputFiles([
        { path: '/output/result.csv', content: 'a,b\n1,2', encoding: 'text' },
      ])

      const data = outputFileToKnowledgeData(processed[0])

      expect(data.name).toBe('result.csv')
      expect(data.type).toBe('file')
      expect(data.fileType).toBe('text')
      expect(data.content).toBe('a,b\n1,2')
      expect(data.mimeType).toBe('text/csv')
      expect(data.path).toBe('/skill-outputs/result.csv')
    })

    it('should create knowledge-compatible data for binary files', () => {
      const processed = processOutputFiles([
        {
          path: '/output/chart.png',
          content: 'iVBORw0KGgo=',
          encoding: 'base64',
        },
      ])

      const data = outputFileToKnowledgeData(processed[0])

      expect(data.name).toBe('chart.png')
      expect(data.fileType).toBe('document')
      expect(data.mimeType).toBe('image/png')
    })
  })
})
