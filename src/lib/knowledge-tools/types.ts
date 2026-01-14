/**
 * Knowledge Tool Types
 *
 * This module defines types for knowledge-specific tool operations.
 * These tools allow LLM agents to search, read, and list documents
 * from the user's knowledge base (IndexedDB-stored KnowledgeItems).
 *
 * @module lib/knowledge-tools/types
 */

import type { KnowledgeItem } from '@/types'

// ============================================================================
// Search Knowledge Tool
// ============================================================================

/**
 * Parameters for the search_knowledge tool.
 * Performs semantic or keyword search across the knowledge base.
 */
export interface SearchKnowledgeParams {
  /**
   * The search query string.
   * Can contain keywords, phrases, or natural language questions.
   */
  query: string
  /**
   * Maximum number of results to return.
   * @default 10
   */
  max_results?: number
  /**
   * Filter by file types.
   * If not provided, searches all types.
   */
  file_types?: ('document' | 'image' | 'text')[]
  /**
   * Filter by specific tags.
   * Results must have at least one of the specified tags.
   */
  tags?: string[]
  /**
   * Filter by parent folder ID.
   * Only search within this folder and its children.
   */
  folder_id?: string
  /**
   * Minimum relevance score (0-1).
   * Results below this threshold are excluded.
   * @default 0.3
   */
  min_score?: number
  /**
   * Semantic search configuration.
   * When true or undefined, uses LLM to expand the query with synonyms and related terms.
   * Set to false to disable semantic expansion and use only keyword matching.
   * @default true (enabled, uses active LLM config)
   */
  semantic_search?: boolean | SemanticSearchConfig
  /**
   * Trace context for observability.
   * Links semantic search LLM calls to the parent conversation/agent.
   */
  trace_context?: {
    agentId?: string
    conversationId?: string
    taskId?: string
    sessionId?: string
  }
}

/**
 * Configuration for semantic (LLM-powered) query expansion.
 * If not provided, the active LLM configuration will be used automatically.
 */
export interface SemanticSearchConfig {
  /** Whether to enable semantic query expansion (default: true) */
  enabled?: boolean
  /**
   * LLM configuration for the expansion call.
   * If not provided, uses the user's active LLM configuration.
   */
  llm_config?: {
    provider: string
    model: string
    apiKey: string
    baseUrl?: string
  }
  /** Maximum number of expanded terms to use (default: 20) */
  max_expanded_terms?: number
}

/**
 * Result of query expansion operation.
 */
export interface QueryExpansionResult {
  /** Original terms from the query */
  original_terms: string[]
  /** Expanded list of search terms (includes originals + synonyms) */
  expanded_terms: string[]
  /** Map of original terms to their synonyms */
  synonyms?: Record<string, string[]>
  /** Whether fallback to basic tokenization was used */
  used_fallback: boolean
}

/**
 * A single search result with relevance scoring.
 */
export interface KnowledgeSearchHit {
  /** The matching knowledge item ID */
  id: string
  /** Item name/filename */
  name: string
  /** Full path in the knowledge hierarchy */
  path: string
  /** File type classification */
  fileType: 'document' | 'image' | 'text' | undefined
  /** MIME type of the content */
  mimeType: string | undefined
  /** Relevance score from 0 to 1 */
  score: number
  /**
   * Highlighted snippet showing the matching text.
   * Includes context around the match with highlighting markers.
   */
  snippet: string
  /** Tags associated with this item */
  tags: string[]
  /** When the item was last modified */
  lastModified: Date
  /** File size in bytes (if available) */
  size: number | undefined
}

/**
 * Result of a search_knowledge operation.
 */
export interface SearchKnowledgeResult {
  /** The search query that was executed */
  query: string
  /** Total number of items searched */
  total_searched: number
  /** Number of matching results */
  result_count: number
  /** The matching items with relevance scores */
  hits: KnowledgeSearchHit[]
  /** Whether results were truncated due to max_results limit */
  truncated: boolean
  /** Time taken to execute the search in milliseconds */
  duration_ms: number
  /** Whether semantic query expansion was used */
  semantic_expansion_used?: boolean
  /** The expanded search terms (if semantic search was used) */
  expanded_terms?: string[]
}

// ============================================================================
// Read Document Tool
// ============================================================================

/**
 * Parameters for the read_document tool.
 * Retrieves the full content of a specific document.
 */
export interface ReadDocumentParams {
  /**
   * ID of the document to read.
   * Typically obtained from a previous search result.
   */
  document_id: string
  /**
   * Whether to include metadata in the response.
   * @default true
   */
  include_metadata?: boolean
  /**
   * Maximum content length to return (in characters).
   * Useful for limiting token usage with large documents.
   * If omitted, returns full content.
   */
  max_length?: number
  /**
   * Starting offset for content (in characters).
   * Used with max_length for pagination through large documents.
   * @default 0
   */
  offset?: number
}

/**
 * Document metadata information.
 */
export interface DocumentMetadata {
  /** Document ID */
  id: string
  /** Filename */
  name: string
  /** Full path */
  path: string
  /** File type classification */
  fileType: 'document' | 'image' | 'text' | undefined
  /** MIME type */
  mimeType: string | undefined
  /** File size in bytes */
  size: number | undefined
  /** When created */
  createdAt: Date
  /** When last modified */
  lastModified: Date
  /** Associated tags */
  tags: string[]
  /** User-provided description */
  description: string | undefined
  /** Parent folder ID (if nested) */
  parentId: string | undefined
  /** Processing status for documents requiring extraction */
  processingStatus: KnowledgeItem['processingStatus']
  /** How this item was synced */
  syncSource: KnowledgeItem['syncSource']
  /** External URL if synced from a connector */
  externalUrl: string | undefined
}

/**
 * Result of a read_document operation.
 */
export interface ReadDocumentResult {
  /** Whether the document was found */
  found: boolean
  /** Error message if document not found or access failed */
  error?: string
  /** Document metadata (if include_metadata is true) */
  metadata?: DocumentMetadata
  /**
   * The document content.
   * - For text files: plain text content
   * - For documents with transcript: extracted text
   * - For images: description or OCR text if available
   */
  content: string | null
  /**
   * Content type indicator.
   * - 'text': Plain text or markdown
   * - 'transcript': Extracted text from document processing
   * - 'base64': Binary content (images without text extraction)
   */
  content_type: 'text' | 'transcript' | 'base64' | null
  /** Total content length (before any truncation) */
  total_length: number
  /** Whether content was truncated due to max_length */
  truncated: boolean
  /** Current offset (for pagination) */
  offset: number
}

// ============================================================================
// List Documents Tool
// ============================================================================

/**
 * Parameters for the list_documents tool.
 * Lists documents in the knowledge base with optional filtering.
 */
export interface ListDocumentsParams {
  /**
   * Parent folder ID to list contents of.
   * If omitted, lists root-level items.
   */
  folder_id?: string
  /**
   * Whether to recursively list all nested items.
   * @default false
   */
  recursive?: boolean
  /**
   * Filter by item type.
   */
  type?: 'file' | 'folder' | 'all'
  /**
   * Filter by file types (only applies when type is 'file' or 'all').
   */
  file_types?: ('document' | 'image' | 'text')[]
  /**
   * Filter by tags (items must have at least one matching tag).
   */
  tags?: string[]
  /**
   * Sort field.
   * @default 'name'
   */
  sort_by?: 'name' | 'lastModified' | 'createdAt' | 'size'
  /**
   * Sort direction.
   * @default 'asc'
   */
  sort_order?: 'asc' | 'desc'
  /**
   * Maximum number of items to return.
   * @default 50
   */
  limit?: number
  /**
   * Offset for pagination.
   * @default 0
   */
  offset?: number
}

/**
 * Summary information for a listed item.
 * Lighter weight than full KnowledgeItem for list operations.
 */
export interface ListedDocument {
  /** Item ID */
  id: string
  /** Name */
  name: string
  /** Full path */
  path: string
  /** Whether this is a file or folder */
  type: 'file' | 'folder'
  /** File type classification (for files) */
  fileType: 'document' | 'image' | 'text' | undefined
  /** MIME type (for files) */
  mimeType: string | undefined
  /** File size in bytes (for files) */
  size: number | undefined
  /** Last modified date */
  lastModified: Date
  /** Associated tags */
  tags: string[]
  /** Whether content is available (for files) */
  hasContent: boolean
  /** Processing status (for documents) */
  processingStatus: KnowledgeItem['processingStatus']
  /** Number of children (for folders) */
  childCount?: number
}

/**
 * Result of a list_documents operation.
 */
export interface ListDocumentsResult {
  /** Parent folder info (null if listing root) */
  parent: {
    id: string
    name: string
    path: string
  } | null
  /** Listed items */
  items: ListedDocument[]
  /** Total count of matching items (before pagination) */
  total_count: number
  /** Whether there are more items available */
  has_more: boolean
  /** Current offset */
  offset: number
  /** Applied limit */
  limit: number
}

// ============================================================================
// Get Document Summary Tool
// ============================================================================

/**
 * Parameters for the get_document_summary tool.
 * Generates or retrieves a summary of a document.
 */
export interface GetDocumentSummaryParams {
  /**
   * ID of the document to summarize.
   */
  document_id: string
  /**
   * Maximum length of the summary in words.
   * @default 200
   */
  max_words?: number
  /**
   * Focus area for the summary.
   * If provided, emphasizes content related to this topic.
   */
  focus?: string
}

/**
 * Result of a get_document_summary operation.
 */
export interface GetDocumentSummaryResult {
  /** Whether the document was found */
  found: boolean
  /** Error message if failed */
  error?: string
  /** Document metadata */
  metadata?: Pick<
    DocumentMetadata,
    'id' | 'name' | 'path' | 'fileType' | 'size'
  >
  /** The generated summary */
  summary: string | null
  /** Key topics/themes identified in the document */
  key_topics: string[]
  /** Whether this is a cached summary or freshly generated */
  cached: boolean
}

// ============================================================================
// Union Types for Tool Results
// ============================================================================

/**
 * Union type for all knowledge tool operation results.
 * Useful for generic tool result handling.
 */
export type KnowledgeToolResult =
  | { type: 'search_knowledge'; result: SearchKnowledgeResult }
  | { type: 'read_document'; result: ReadDocumentResult }
  | { type: 'list_documents'; result: ListDocumentsResult }
  | { type: 'get_document_summary'; result: GetDocumentSummaryResult }

/**
 * Map of knowledge tool names to their parameter types.
 */
export interface KnowledgeToolParamsMap {
  search_knowledge: SearchKnowledgeParams
  read_document: ReadDocumentParams
  list_documents: ListDocumentsParams
  get_document_summary: GetDocumentSummaryParams
}

/**
 * Map of knowledge tool names to their result types.
 */
export interface KnowledgeToolResultMap {
  search_knowledge: SearchKnowledgeResult
  read_document: ReadDocumentResult
  list_documents: ListDocumentsResult
  get_document_summary: GetDocumentSummaryResult
}

/**
 * Names of all available knowledge tools.
 */
export type KnowledgeToolName = keyof KnowledgeToolParamsMap

// ============================================================================
// Tool Definitions (Ready-to-use)
// ============================================================================

import type { ToolDefinition } from '@/lib/llm/types'

/**
 * Pre-defined tool definitions for knowledge operations.
 * These can be directly passed to LLM requests.
 */
export const KNOWLEDGE_TOOL_DEFINITIONS: Record<
  KnowledgeToolName,
  ToolDefinition
> = {
  search_knowledge: {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        'Search the knowledge base for documents matching a query. ' +
        'Use this to find relevant information before answering questions. ' +
        'Returns ranked results with relevance scores and text snippets. ' +
        'IMPORTANT: The knowledge base content may be in English. If the user query is in another language, ' +
        'translate the key search terms to English before searching. For example, if searching for ' +
        '"alerte de sécurité" (French), also search for "security alert" (English).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query - can be keywords, phrases, or natural language questions. ' +
              'If the user query is not in English, include both the original terms AND their English translations.',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum number of results to return (default: 10)',
            minimum: 1,
            maximum: 50,
          },
          file_types: {
            type: 'array',
            description: 'Filter by file types',
            items: {
              type: 'string',
              enum: ['document', 'image', 'text'],
            },
          },
          tags: {
            type: 'array',
            description:
              'Filter by tags - results must have at least one matching tag',
            items: { type: 'string' },
          },
          folder_id: {
            type: 'string',
            description: 'Only search within this folder and its children',
          },
        },
        required: ['query'],
      },
    },
  },

  read_document: {
    type: 'function',
    function: {
      name: 'read_document',
      description:
        'Read the full content of a specific document by ID. ' +
        'Use this after searching to get complete document content. ' +
        'For large documents, use max_length and offset for pagination.',
      parameters: {
        type: 'object',
        properties: {
          document_id: {
            type: 'string',
            description: 'ID of the document to read (from search results)',
          },
          include_metadata: {
            type: 'boolean',
            description: 'Whether to include document metadata (default: true)',
          },
          max_length: {
            type: 'integer',
            description:
              'Maximum content length in characters (for large documents)',
            minimum: 100,
          },
          offset: {
            type: 'integer',
            description:
              'Starting character offset for pagination (default: 0)',
            minimum: 0,
          },
        },
        required: ['document_id'],
      },
    },
  },

  list_documents: {
    type: 'function',
    function: {
      name: 'list_documents',
      description:
        'List documents and folders in the knowledge base. ' +
        'Use this to explore the knowledge structure or find documents by location. ' +
        'Can filter by folder, type, file type, and tags.',
      parameters: {
        type: 'object',
        properties: {
          folder_id: {
            type: 'string',
            description: 'Parent folder ID to list contents of (omit for root)',
          },
          recursive: {
            type: 'boolean',
            description:
              'Whether to list all nested items recursively (default: false)',
          },
          type: {
            type: 'string',
            description: 'Filter by item type',
            enum: ['file', 'folder', 'all'],
          },
          file_types: {
            type: 'array',
            description: 'Filter by file types (for files only)',
            items: {
              type: 'string',
              enum: ['document', 'image', 'text'],
            },
          },
          tags: {
            type: 'array',
            description: 'Filter by tags',
            items: { type: 'string' },
          },
          sort_by: {
            type: 'string',
            description: 'Field to sort by (default: name)',
            enum: ['name', 'lastModified', 'createdAt', 'size'],
          },
          sort_order: {
            type: 'string',
            description: 'Sort direction (default: asc)',
            enum: ['asc', 'desc'],
          },
          limit: {
            type: 'integer',
            description: 'Maximum items to return (default: 50)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: [],
      },
    },
  },

  get_document_summary: {
    type: 'function',
    function: {
      name: 'get_document_summary',
      description:
        'Get a concise summary of a document. ' +
        'Use this instead of read_document when you only need an overview. ' +
        'Can focus on specific topics if needed.',
      parameters: {
        type: 'object',
        properties: {
          document_id: {
            type: 'string',
            description: 'ID of the document to summarize',
          },
          max_words: {
            type: 'integer',
            description: 'Maximum summary length in words (default: 200)',
            minimum: 50,
            maximum: 500,
          },
          focus: {
            type: 'string',
            description: 'Topic to focus the summary on (optional)',
          },
        },
        required: ['document_id'],
      },
    },
  },
}
