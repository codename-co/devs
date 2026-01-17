/**
 * Knowledge Tool Plugins Tests
 *
 * Tests for the knowledge tool plugins.
 *
 * @module test/tools/plugins/knowledge.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolPluginRegistry } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  searchKnowledgePlugin,
  readDocumentPlugin,
  listDocumentsPlugin,
  getDocumentSummaryPlugin,
  knowledgePlugins,
} from '@/tools/plugins/knowledge'

describe('Knowledge Tool Plugins', () => {
  let registry: ToolPluginRegistry

  beforeEach(() => {
    registry = new ToolPluginRegistry()
  })

  describe('searchKnowledgePlugin', () => {
    describe('metadata', () => {
      it('should have correct name', () => {
        expect(searchKnowledgePlugin.metadata.name).toBe('search_knowledge')
      })

      it('should have knowledge category', () => {
        expect(searchKnowledgePlugin.metadata.category).toBe('knowledge')
      })

      it('should have valid icon', () => {
        expect(searchKnowledgePlugin.metadata.icon).toBe('Search')
      })
    })

    describe('definition', () => {
      it('should have function type', () => {
        expect(searchKnowledgePlugin.definition.type).toBe('function')
      })

      it('should require query parameter', () => {
        const params = searchKnowledgePlugin.definition.function.parameters
        expect(params.required).toContain('query')
      })
    })

    describe('validate', () => {
      it('should pass valid params', () => {
        const params = { query: 'test search' }
        expect(() => searchKnowledgePlugin.validate!(params)).not.toThrow()
      })

      it('should throw for missing query', () => {
        const params = {} as { query: string }
        expect(() => searchKnowledgePlugin.validate!(params)).toThrow(
          'Query is required',
        )
      })

      it('should throw for empty query', () => {
        const params = { query: '   ' }
        expect(() => searchKnowledgePlugin.validate!(params)).toThrow(
          'Query cannot be empty',
        )
      })

      it('should throw for invalid max_results', () => {
        const params = { query: 'test', max_results: 0 }
        expect(() => searchKnowledgePlugin.validate!(params)).toThrow(
          'max_results must be a positive number',
        )
      })
    })
  })

  describe('readDocumentPlugin', () => {
    describe('metadata', () => {
      it('should have correct name', () => {
        expect(readDocumentPlugin.metadata.name).toBe('read_document')
      })

      it('should have knowledge category', () => {
        expect(readDocumentPlugin.metadata.category).toBe('knowledge')
      })

      it('should have valid icon', () => {
        expect(readDocumentPlugin.metadata.icon).toBe('Book')
      })
    })

    describe('validate', () => {
      it('should pass valid params', () => {
        const params = { document_id: 'doc-123' }
        expect(() => readDocumentPlugin.validate!(params)).not.toThrow()
      })

      it('should throw for missing document_id', () => {
        const params = {} as { document_id: string }
        expect(() => readDocumentPlugin.validate!(params)).toThrow(
          'document_id is required',
        )
      })

      it('should throw for invalid max_length', () => {
        const params = { document_id: 'doc-123', max_length: 50 }
        expect(() => readDocumentPlugin.validate!(params)).toThrow(
          'max_length must be at least 100',
        )
      })

      it('should throw for negative offset', () => {
        const params = { document_id: 'doc-123', offset: -1 }
        expect(() => readDocumentPlugin.validate!(params)).toThrow(
          'offset must be a non-negative number',
        )
      })
    })
  })

  describe('listDocumentsPlugin', () => {
    describe('metadata', () => {
      it('should have correct name', () => {
        expect(listDocumentsPlugin.metadata.name).toBe('list_documents')
      })

      it('should have knowledge category', () => {
        expect(listDocumentsPlugin.metadata.category).toBe('knowledge')
      })

      it('should have valid icon', () => {
        expect(listDocumentsPlugin.metadata.icon).toBe('Folder')
      })
    })

    describe('validate', () => {
      it('should pass empty params (all optional)', () => {
        const params = {}
        expect(() => listDocumentsPlugin.validate!(params)).not.toThrow()
      })

      it('should throw for invalid limit', () => {
        const params = { limit: 0 }
        expect(() => listDocumentsPlugin.validate!(params)).toThrow(
          'limit must be a positive number',
        )
      })

      it('should throw for excessive limit', () => {
        const params = { limit: 200 }
        expect(() => listDocumentsPlugin.validate!(params)).toThrow(
          'limit cannot exceed 100',
        )
      })

      it('should throw for negative offset', () => {
        const params = { offset: -1 }
        expect(() => listDocumentsPlugin.validate!(params)).toThrow(
          'offset must be a non-negative number',
        )
      })
    })
  })

  describe('getDocumentSummaryPlugin', () => {
    describe('metadata', () => {
      it('should have correct name', () => {
        expect(getDocumentSummaryPlugin.metadata.name).toBe('get_document_summary')
      })

      it('should have knowledge category', () => {
        expect(getDocumentSummaryPlugin.metadata.category).toBe('knowledge')
      })

      it('should have valid icon', () => {
        expect(getDocumentSummaryPlugin.metadata.icon).toBe('AlignLeft')
      })
    })

    describe('validate', () => {
      it('should pass valid params', () => {
        const params = { document_id: 'doc-123' }
        expect(() => getDocumentSummaryPlugin.validate!(params)).not.toThrow()
      })

      it('should throw for missing document_id', () => {
        const params = {} as { document_id: string }
        expect(() => getDocumentSummaryPlugin.validate!(params)).toThrow(
          'document_id is required',
        )
      })

      it('should throw for small max_words', () => {
        const params = { document_id: 'doc-123', max_words: 10 }
        expect(() => getDocumentSummaryPlugin.validate!(params)).toThrow(
          'max_words must be at least 50',
        )
      })

      it('should throw for large max_words', () => {
        const params = { document_id: 'doc-123', max_words: 1000 }
        expect(() => getDocumentSummaryPlugin.validate!(params)).toThrow(
          'max_words cannot exceed 500',
        )
      })
    })
  })

  describe('knowledgePlugins array', () => {
    it('should contain all 4 knowledge plugins', () => {
      expect(knowledgePlugins).toHaveLength(4)
    })

    it('should register all plugins successfully', () => {
      for (const plugin of knowledgePlugins) {
        // Cast to unknown first to handle union type properly
        registry.register(plugin as ToolPlugin<unknown, unknown>)
      }

      expect(registry.count()).toBe(4)
      expect(registry.has('search_knowledge')).toBe(true)
      expect(registry.has('read_document')).toBe(true)
      expect(registry.has('list_documents')).toBe(true)
      expect(registry.has('get_document_summary')).toBe(true)
    })

    it('should all be in knowledge category', () => {
      for (const plugin of knowledgePlugins) {
        // Cast to unknown first to handle union type properly
        registry.register(plugin as ToolPlugin<unknown, unknown>)
      }

      const knowledgeTools = registry.getByCategory('knowledge')
      expect(knowledgeTools).toHaveLength(4)
    })
  })
})
