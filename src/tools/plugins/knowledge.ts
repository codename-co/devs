/**
 * Knowledge Tool Plugins
 *
 * Tool plugins for knowledge base operations.
 * These tools enable LLM agents to search, read, and navigate
 * the user's knowledge base.
 *
 * @module tools/plugins/knowledge
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import {
  searchKnowledge,
  readDocument,
  listDocuments,
  getDocumentSummary,
  KNOWLEDGE_TOOL_DEFINITIONS,
} from '@/lib/knowledge-tools/service'
import type {
  SearchKnowledgeParams,
  SearchKnowledgeResult,
  ReadDocumentParams,
  ReadDocumentResult,
  ListDocumentsParams,
  ListDocumentsResult,
  GetDocumentSummaryParams,
  GetDocumentSummaryResult,
} from '@/lib/knowledge-tools/types'

// ============================================================================
// Search Knowledge Tool Plugin
// ============================================================================

/**
 * Search knowledge tool plugin.
 *
 * Searches the knowledge base for documents matching a query.
 * Returns ranked results with relevance scores and text snippets.
 */
export const searchKnowledgePlugin: ToolPlugin<
  SearchKnowledgeParams,
  SearchKnowledgeResult
> = createToolPlugin({
  metadata: {
    name: 'search_knowledge',
    displayName: 'Search Knowledge',
    shortDescription: 'Search documents in the knowledge base',
    icon: 'Search',
    category: 'knowledge',
    tags: ['knowledge', 'search', 'documents', 'semantic'],
    enabledByDefault: false,
    estimatedDuration: 1000,
    requiresConfirmation: false,
  },
  definition: KNOWLEDGE_TOOL_DEFINITIONS.search_knowledge,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return searchKnowledge(args)
  },
  validate: (args): SearchKnowledgeParams => {
    const params = args as SearchKnowledgeParams

    if (!params.query || typeof params.query !== 'string') {
      throw new Error('Query is required and must be a string')
    }

    if (params.query.trim() === '') {
      throw new Error('Query cannot be empty')
    }

    if (params.max_results !== undefined) {
      if (typeof params.max_results !== 'number' || params.max_results < 1) {
        throw new Error('max_results must be a positive number')
      }
    }

    return params
  },
})

// ============================================================================
// Read Document Tool Plugin
// ============================================================================

/**
 * Read document tool plugin.
 *
 * Retrieves the full content of a specific document.
 * Use this after searching to get complete document content.
 */
export const readDocumentPlugin: ToolPlugin<
  ReadDocumentParams,
  ReadDocumentResult
> = createToolPlugin({
  metadata: {
    name: 'read_document',
    displayName: 'Read Document',
    shortDescription: 'Read full content of a document',
    icon: 'Book',
    category: 'knowledge',
    tags: ['knowledge', 'read', 'document', 'content'],
    enabledByDefault: false,
    estimatedDuration: 500,
    requiresConfirmation: false,
  },
  definition: KNOWLEDGE_TOOL_DEFINITIONS.read_document,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return readDocument(args)
  },
  validate: (args): ReadDocumentParams => {
    const params = args as ReadDocumentParams

    if (!params.document_id || typeof params.document_id !== 'string') {
      throw new Error('document_id is required and must be a string')
    }

    if (params.max_length !== undefined) {
      if (typeof params.max_length !== 'number' || params.max_length < 100) {
        throw new Error('max_length must be at least 100')
      }
    }

    if (params.offset !== undefined) {
      if (typeof params.offset !== 'number' || params.offset < 0) {
        throw new Error('offset must be a non-negative number')
      }
    }

    return params
  },
})

// ============================================================================
// List Documents Tool Plugin
// ============================================================================

/**
 * List documents tool plugin.
 *
 * Lists documents and folders in the knowledge base.
 * Can filter by folder, type, file type, and tags.
 */
export const listDocumentsPlugin: ToolPlugin<
  ListDocumentsParams,
  ListDocumentsResult
> = createToolPlugin({
  metadata: {
    name: 'list_documents',
    displayName: 'List Documents',
    shortDescription: 'Browse documents in the knowledge base',
    icon: 'Folder',
    category: 'knowledge',
    tags: ['knowledge', 'list', 'browse', 'folder'],
    enabledByDefault: false,
    estimatedDuration: 500,
    requiresConfirmation: false,
  },
  definition: KNOWLEDGE_TOOL_DEFINITIONS.list_documents,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return listDocuments(args)
  },
  validate: (args): ListDocumentsParams => {
    const params = args as ListDocumentsParams

    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number' || params.limit < 1) {
        throw new Error('limit must be a positive number')
      }
      if (params.limit > 100) {
        throw new Error('limit cannot exceed 100')
      }
    }

    if (params.offset !== undefined) {
      if (typeof params.offset !== 'number' || params.offset < 0) {
        throw new Error('offset must be a non-negative number')
      }
    }

    return params
  },
})

// ============================================================================
// Get Document Summary Tool Plugin
// ============================================================================

/**
 * Get document summary tool plugin.
 *
 * Generates or retrieves a summary of a document.
 * Use this when you only need an overview of the document.
 */
export const getDocumentSummaryPlugin: ToolPlugin<
  GetDocumentSummaryParams,
  GetDocumentSummaryResult
> = createToolPlugin({
  metadata: {
    name: 'get_document_summary',
    displayName: 'Get Document Summary',
    shortDescription: 'Get a concise summary of a document',
    icon: 'AlignLeft',
    category: 'knowledge',
    tags: ['knowledge', 'summary', 'document', 'overview'],
    enabledByDefault: false,
    estimatedDuration: 2000,
    requiresConfirmation: false,
  },
  definition: KNOWLEDGE_TOOL_DEFINITIONS.get_document_summary,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return getDocumentSummary(args)
  },
  validate: (args): GetDocumentSummaryParams => {
    const params = args as GetDocumentSummaryParams

    if (!params.document_id || typeof params.document_id !== 'string') {
      throw new Error('document_id is required and must be a string')
    }

    if (params.max_words !== undefined) {
      if (typeof params.max_words !== 'number' || params.max_words < 50) {
        throw new Error('max_words must be at least 50')
      }
      if (params.max_words > 500) {
        throw new Error('max_words cannot exceed 500')
      }
    }

    return params
  },
})

// ============================================================================
// Export All Knowledge Plugins
// ============================================================================

/**
 * Array of all knowledge tool plugins.
 */
export const knowledgePlugins = [
  searchKnowledgePlugin,
  readDocumentPlugin,
  listDocumentsPlugin,
  getDocumentSummaryPlugin,
] as const
