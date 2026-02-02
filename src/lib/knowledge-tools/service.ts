/**
 * Knowledge Tools Service
 *
 * This module provides the implementation for knowledge-specific tool operations.
 * These tools allow LLM agents to search, read, and list documents
 * from the user's knowledge base (IndexedDB-stored KnowledgeItems).
 *
 * @module lib/knowledge-tools/service
 */

import {
  getAllKnowledgeItemsAsync,
  getKnowledgeItemAsync,
  ensureReady as ensureYjsReady,
} from '@/stores/knowledgeStore'
import { LLMService } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { LLMConfig, LLMProvider, KnowledgeItem } from '@/types'
import type {
  SearchKnowledgeParams,
  SearchKnowledgeResult,
  KnowledgeSearchHit,
  ReadDocumentParams,
  ReadDocumentResult,
  DocumentMetadata,
  ListDocumentsParams,
  ListDocumentsResult,
  ListedDocument,
  GetDocumentSummaryParams,
  GetDocumentSummaryResult,
  QueryExpansionResult,
} from './types'

// ============================================================================
// Constants
// ============================================================================

/** Default maximum results for search operations */
const DEFAULT_MAX_RESULTS = 10

/** Default minimum relevance score threshold */
const DEFAULT_MIN_SCORE = 0.3

/** Default pagination limit for list operations */
const DEFAULT_LIST_LIMIT = 50

/** Maximum snippet length for search results */
const SNIPPET_MAX_LENGTH = 200

/** Context characters around match in snippets */
const SNIPPET_CONTEXT_CHARS = 80

/** Maximum expanded terms to use in semantic search */
const MAX_EXPANDED_TERMS = 20

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes text for search matching (lowercase, trim).
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

/**
 * Tokenizes a query string into individual search terms.
 * Handles quoted phrases and removes common stop words.
 */
function tokenizeQuery(query: string): string[] {
  const normalized = normalizeText(query)

  // Extract quoted phrases first
  const phrases: string[] = []
  const withoutPhrases = normalized.replace(/"([^"]+)"/g, (_, phrase) => {
    phrases.push(phrase.trim())
    return ''
  })

  // Split remaining text into words
  const words = withoutPhrases
    .split(/\s+/)
    .filter((word) => word.length > 1) // Filter out single characters
    .filter(
      (word) =>
        ![
          'the',
          'a',
          'an',
          'and',
          'or',
          'but',
          'is',
          'are',
          'was',
          'were',
          'in',
          'on',
          'at',
          'to',
          'for',
        ].includes(word),
    )

  return [...phrases, ...words]
}

/**
 * Calculates relevance score for a knowledge item against search terms.
 * Returns a score between 0 and 1.
 *
 * The scoring algorithm is designed to work well with semantic expansion:
 * - Uses the BEST matching score (not average) to avoid penalizing expanded terms
 * - Adds bonuses for multiple term matches
 * - Rewards matches in higher-value fields (name > tags > description > content)
 */
function calculateRelevanceScore(
  item: KnowledgeItem,
  searchTerms: string[],
): number {
  if (searchTerms.length === 0) return 0

  const name = normalizeText(item.name)
  const content = normalizeText(item.transcript || item.content || '')
  const description = normalizeText(item.description || '')
  const tags = (item.tags || []).map(normalizeText)

  let bestScore = 0
  let matchCount = 0
  let totalScore = 0

  for (const term of searchTerms) {
    let termScore = 0

    // Exact name match (highest weight)
    if (name === term) {
      termScore = 1.0
    }
    // Name contains term (high weight)
    else if (name.includes(term)) {
      termScore = 0.8
    }
    // Tag exact match (high weight)
    else if (tags.includes(term)) {
      termScore = 0.7
    }
    // Description contains term (medium weight)
    else if (description.includes(term)) {
      termScore = 0.5
    }
    // Content contains term (base weight)
    else if (content.includes(term)) {
      termScore = 0.3
    }

    if (termScore > 0) {
      bestScore = Math.max(bestScore, termScore)
      totalScore += termScore
      matchCount++
    }
  }

  if (matchCount === 0) return 0

  // Scoring formula optimized for semantic expansion:
  // - Start with best match score (ensures good matches aren't diluted)
  // - Add bonus for additional matches (capped at 0.3)
  // - Multiple high-quality matches boost the score significantly
  const additionalMatchBonus = Math.min(0.3, (matchCount - 1) * 0.05)
  const avgMatchQuality = totalScore / matchCount
  const qualityBonus = avgMatchQuality > 0.5 ? 0.1 : 0

  return Math.min(1, bestScore + additionalMatchBonus + qualityBonus)
}

/**
 * Generates a snippet with highlighted matches around the first occurrence.
 */
function generateSnippet(item: KnowledgeItem, searchTerms: string[]): string {
  const content = item.transcript || item.content || item.description || ''

  if (!content || searchTerms.length === 0) {
    // Return truncated content as fallback
    return content.length > SNIPPET_MAX_LENGTH
      ? content.substring(0, SNIPPET_MAX_LENGTH) + '...'
      : content
  }

  const normalizedContent = normalizeText(content)

  // Find the first match position
  let firstMatchIndex = -1
  let matchedTerm = ''

  for (const term of searchTerms) {
    const index = normalizedContent.indexOf(term)
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index
      matchedTerm = term
    }
  }

  if (firstMatchIndex === -1) {
    // No match found in content, return beginning
    return content.length > SNIPPET_MAX_LENGTH
      ? content.substring(0, SNIPPET_MAX_LENGTH) + '...'
      : content
  }

  // Calculate snippet boundaries
  const start = Math.max(0, firstMatchIndex - SNIPPET_CONTEXT_CHARS)
  const end = Math.min(
    content.length,
    firstMatchIndex + matchedTerm.length + SNIPPET_CONTEXT_CHARS,
  )

  let snippet = content.substring(start, end)

  // Add ellipses if truncated
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  // Highlight matches using **bold** markers
  for (const term of searchTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi')
    snippet = snippet.replace(regex, '**$1**')
  }

  return snippet
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Gets the full path for a knowledge item.
 */
function getItemPath(item: KnowledgeItem): string {
  return item.path || `/${item.name}`
}

/**
 * Gets the readable text content from a knowledge item.
 */
function getReadableContent(item: KnowledgeItem): {
  content: string | null
  type: 'text' | 'transcript' | 'base64' | null
} {
  // For documents with extracted transcript, prefer that
  if (item.transcript) {
    return { content: item.transcript, type: 'transcript' }
  }

  // For text content (not base64/data URL)
  if (item.content && !item.content.startsWith('data:')) {
    return { content: item.content, type: 'text' }
  }

  // For data URLs (binary content)
  if (item.content && item.content.startsWith('data:')) {
    // Extract base64 data
    const match = item.content.match(/^data:[^;]+;base64,(.+)$/)
    if (match) {
      return { content: match[1], type: 'base64' }
    }
  }

  return { content: null, type: null }
}

/**
 * Checks if an item matches the folder filter.
 * Returns true if item is in the folder or is a descendant (when recursive).
 */
async function matchesFolderFilter(
  item: KnowledgeItem,
  folderId: string,
  recursive: boolean,
  allItems: KnowledgeItem[],
): Promise<boolean> {
  if (!folderId) return true

  // Direct parent match
  if (item.parentId === folderId) return true

  if (!recursive) return false

  // For recursive, check if any ancestor matches the folder
  let currentParentId = item.parentId
  const visited = new Set<string>()

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId)

    if (currentParentId === folderId) return true

    const parent = allItems.find((i) => i.id === currentParentId)
    currentParentId = parent?.parentId
  }

  return false
}

/**
 * Counts children of a folder item.
 */
function countChildren(folderId: string, allItems: KnowledgeItem[]): number {
  return allItems.filter((item) => item.parentId === folderId).length
}

// ============================================================================
// Semantic Query Expansion
// ============================================================================

/**
 * System prompt for query expansion.
 * Designed to be fast and focused - only extracts keywords and synonyms.
 */
const QUERY_EXPANSION_PROMPT = `You are a search query expansion assistant. Your task is to expand a user's search query with relevant synonyms and related terms to improve search recall.

Given a search query, output a JSON object with:
- original_terms: array of key terms from the original query
- expanded_terms: array including original terms plus synonyms and related terms
- synonyms: object mapping original terms to their synonyms

Rules:
1. Keep terms concise (single words or short phrases)
2. Include common synonyms and related concepts
3. If the query is in a non-English language, include English translations
4. Focus on terms likely to appear in documents
5. Return ONLY valid JSON, no explanation

Example:
Query: "What is the ticket price for the event?"
Output:
{
  "original_terms": ["ticket", "price", "event"],
  "expanded_terms": ["ticket", "price", "event", "cost", "fee", "admission", "pricing", "fare", "entry", "pass", "show", "concert", "rate"],
  "synonyms": {
    "ticket": ["pass", "entry", "admission"],
    "price": ["cost", "fee", "rate", "fare", "pricing"],
    "event": ["show", "concert", "performance"]
  }
}`

/**
 * Expands a search query using LLM to generate synonyms and related terms.
 * This enables semantic search by matching documents that use different words
 * for the same concepts.
 *
 * @param query - The original search query
 * @param llmConfig - LLM configuration for the expansion call
 * @returns Expanded terms with original and synonyms
 *
 * @example
 * ```typescript
 * const expansion = await expandSearchQuery(
 *   'ticket price',
 *   { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-...' }
 * )
 * // Returns: { expanded_terms: ['ticket', 'price', 'cost', 'fee', 'admission', ...] }
 * ```
 */
export async function expandSearchQuery(
  query: string,
  llmConfig: LLMConfig,
  traceContext?: {
    agentId?: string
    conversationId?: string
    taskId?: string
    sessionId?: string
  },
): Promise<QueryExpansionResult> {
  // Get basic tokenized terms as fallback
  const fallbackTerms = tokenizeQuery(query)

  try {
    const response = await LLMService.chat(
      [
        { role: 'system', content: QUERY_EXPANSION_PROMPT },
        { role: 'user', content: `Query: "${query}"` },
      ],
      {
        ...llmConfig,
        temperature: 0.3, // Low temperature for consistent output
        maxTokens: 300, // Keep it fast
      },
      traceContext,
    )

    // Parse the JSON response
    const parsed = parseExpansionResponse(response.content)

    if (parsed) {
      // Deduplicate and normalize terms
      const uniqueTerms = [
        ...new Set(
          parsed.expanded_terms
            .map((t: string) => t.toLowerCase().trim())
            .filter((t: string) => t.length > 1),
        ),
      ].slice(0, MAX_EXPANDED_TERMS)

      return {
        original_terms: parsed.original_terms || fallbackTerms,
        expanded_terms: uniqueTerms,
        synonyms: parsed.synonyms,
        used_fallback: false,
      }
    }
  } catch (error) {
    console.warn('Query expansion failed, using fallback:', error)
  }

  // Fallback to basic tokenization
  return {
    original_terms: fallbackTerms,
    expanded_terms: fallbackTerms,
    used_fallback: true,
  }
}

/**
 * Parses the LLM response for query expansion.
 * Handles JSON extraction from various response formats.
 */
function parseExpansionResponse(content: string): {
  original_terms?: string[]
  expanded_terms: string[]
  synonyms?: Record<string, string[]>
} | null {
  try {
    let jsonStr = content.trim()

    // Strip markdown code fences if present
    const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/m)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    } else {
      // Try to find JSON object anywhere in the content
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0]
      }
    }

    if (!jsonStr.startsWith('{')) {
      return null
    }

    const parsed = JSON.parse(jsonStr)

    // Validate required field
    if (!Array.isArray(parsed.expanded_terms)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * Searches the knowledge base for documents matching a query.
 *
 * @param params - Search parameters including query, filters, and limits
 * @returns Search results with relevance scores and snippets
 *
 * @example
 * ```typescript
 * const results = await searchKnowledge({
 *   query: 'machine learning',
 *   max_results: 5,
 *   file_types: ['document', 'text'],
 *   min_score: 0.4
 * })
 * ```
 */
export async function searchKnowledge(
  params: SearchKnowledgeParams,
): Promise<SearchKnowledgeResult> {
  const startTime = performance.now()

  const {
    query,
    max_results = DEFAULT_MAX_RESULTS,
    file_types,
    tags,
    folder_id,
    min_score = DEFAULT_MIN_SCORE,
    semantic_search,
    trace_context,
  } = params

  // Ensure Yjs is ready before accessing knowledge items
  await ensureYjsReady()

  // Get all knowledge items
  const allItems = await getAllKnowledgeItemsAsync()

  // Filter to only files (not folders)
  let items = allItems.filter((item) => item.type === 'file')

  // Apply file type filter
  if (file_types && file_types.length > 0) {
    items = items.filter(
      (item) => item.fileType && file_types.includes(item.fileType),
    )
  }

  // Apply tag filter
  if (tags && tags.length > 0) {
    const normalizedTags = tags.map(normalizeText)
    items = items.filter((item) => {
      const itemTags = (item.tags || []).map(normalizeText)
      return normalizedTags.some((tag) => itemTags.includes(tag))
    })
  }

  // Apply folder filter
  if (folder_id) {
    const matchPromises = items.map(async (item) => ({
      item,
      matches: await matchesFolderFilter(item, folder_id, true, allItems),
    }))
    const matchResults = await Promise.all(matchPromises)
    items = matchResults.filter((r) => r.matches).map((r) => r.item)
  }

  const totalSearched = items.length

  // Determine search terms - semantic expansion is enabled by default
  let searchTerms: string[]
  let semanticExpansionUsed = false
  let expandedTerms: string[] | undefined

  // Resolve semantic search settings
  const useSemanticSearch = semantic_search !== false

  if (useSemanticSearch) {
    // Get LLM config - either from explicit config or from user's active credentials
    let llmConfig: LLMConfig | null = null

    if (typeof semantic_search === 'object' && semantic_search.llm_config) {
      // Use explicitly provided config
      llmConfig = {
        provider: semantic_search.llm_config.provider as LLMProvider,
        model: semantic_search.llm_config.model,
        apiKey: semantic_search.llm_config.apiKey,
        baseUrl: semantic_search.llm_config.baseUrl,
      }
    } else {
      // Auto-infer from user's active LLM configuration
      llmConfig = await CredentialService.getActiveConfig()
    }

    if (llmConfig) {
      const expansion = await expandSearchQuery(query, llmConfig, trace_context)
      searchTerms = expansion.expanded_terms
      semanticExpansionUsed = !expansion.used_fallback
      expandedTerms = expansion.expanded_terms
    } else {
      // No LLM config available, fall back to keyword search
      searchTerms = tokenizeQuery(query)
    }
  } else {
    // Semantic search explicitly disabled
    searchTerms = tokenizeQuery(query)
  }

  // Calculate relevance scores
  const scoredItems = items
    .map((item) => ({
      item,
      score: calculateRelevanceScore(item, searchTerms),
    }))
    .filter((scored) => scored.score >= min_score)
    .sort((a, b) => b.score - a.score)

  // Apply max_results limit
  const truncated = scoredItems.length > max_results
  const limitedItems = scoredItems.slice(0, max_results)

  // Convert to search hits
  const hits: KnowledgeSearchHit[] = limitedItems.map(({ item, score }) => ({
    id: item.id,
    name: item.name,
    path: getItemPath(item),
    fileType: item.fileType,
    mimeType: item.mimeType,
    score,
    snippet: generateSnippet(item, searchTerms),
    tags: item.tags || [],
    lastModified: item.lastModified,
    size: item.size,
  }))

  return {
    query,
    total_searched: totalSearched,
    result_count: hits.length,
    hits,
    truncated,
    duration_ms: performance.now() - startTime,
    semantic_expansion_used: semanticExpansionUsed,
    expanded_terms: expandedTerms,
  }
}

/**
 * Retrieves the full content of a specific document by ID.
 *
 * @param params - Read parameters including document ID and pagination options
 * @returns Document content with optional metadata
 *
 * @example
 * ```typescript
 * const doc = await readDocument({
 *   document_id: 'abc123',
 *   include_metadata: true,
 *   max_length: 5000,
 *   offset: 0
 * })
 * ```
 */
export async function readDocument(
  params: ReadDocumentParams,
): Promise<ReadDocumentResult> {
  const {
    document_id,
    include_metadata = true,
    max_length,
    offset = 0,
  } = params

  // Ensure Yjs is ready before accessing knowledge items
  await ensureYjsReady()

  // Retrieve the document
  const item = await getKnowledgeItemAsync(document_id)

  if (!item) {
    return {
      found: false,
      error: `Document not found: ${document_id}`,
      content: null,
      content_type: null,
      total_length: 0,
      truncated: false,
      offset: 0,
    }
  }

  // Folders don't have content
  if (item.type === 'folder') {
    return {
      found: true,
      error: 'Cannot read folder content',
      content: null,
      content_type: null,
      total_length: 0,
      truncated: false,
      offset: 0,
    }
  }

  // Get readable content
  const { content: rawContent, type: contentType } = getReadableContent(item)

  // For binary content (base64), don't return the raw data - it's not useful for LLMs
  // and can cause token limit issues. Return an error message instead.
  if (contentType === 'base64') {
    // Build metadata if requested
    let metadata: DocumentMetadata | undefined
    if (include_metadata) {
      metadata = {
        id: item.id,
        name: item.name,
        path: getItemPath(item),
        fileType: item.fileType,
        mimeType: item.mimeType,
        size: item.size,
        createdAt: item.createdAt,
        lastModified: item.lastModified,
        tags: item.tags || [],
        description: item.description,
        parentId: item.parentId,
        processingStatus: item.processingStatus,
        syncSource: item.syncSource,
        externalUrl: item.externalUrl,
      }
    }

    return {
      found: true,
      error:
        'Document contains binary content that has not been processed. Use document processing to extract text first.',
      metadata,
      content: null,
      content_type: 'base64',
      total_length: 0,
      truncated: false,
      offset: 0,
    }
  }

  const totalLength = rawContent?.length || 0

  // Apply pagination
  let content = rawContent
  let truncated = false

  if (content && offset > 0) {
    content = content.substring(offset)
  }

  if (content && max_length && content.length > max_length) {
    content = content.substring(0, max_length)
    truncated = true
  }

  // Build metadata if requested
  let metadata: DocumentMetadata | undefined
  if (include_metadata) {
    metadata = {
      id: item.id,
      name: item.name,
      path: getItemPath(item),
      fileType: item.fileType,
      mimeType: item.mimeType,
      size: item.size,
      createdAt: item.createdAt,
      lastModified: item.lastModified,
      tags: item.tags || [],
      description: item.description,
      parentId: item.parentId,
      processingStatus: item.processingStatus,
      syncSource: item.syncSource,
      externalUrl: item.externalUrl,
    }
  }

  return {
    found: true,
    metadata,
    content,
    content_type: contentType,
    total_length: totalLength,
    truncated,
    offset,
  }
}

/**
 * Lists documents and folders in the knowledge base with filtering and pagination.
 *
 * @param params - List parameters including filters and pagination options
 * @returns Listed documents with pagination info
 *
 * @example
 * ```typescript
 * const list = await listDocuments({
 *   folder_id: 'folder123',
 *   type: 'file',
 *   sort_by: 'lastModified',
 *   sort_order: 'desc',
 *   limit: 20
 * })
 * ```
 */
export async function listDocuments(
  params: ListDocumentsParams,
): Promise<ListDocumentsResult> {
  const {
    folder_id,
    recursive = false,
    type = 'all',
    file_types,
    tags,
    sort_by = 'name',
    sort_order = 'asc',
    limit = DEFAULT_LIST_LIMIT,
    offset = 0,
  } = params

  // Ensure Yjs is ready before accessing knowledge items
  await ensureYjsReady()

  // Get all knowledge items
  const allItems = await getAllKnowledgeItemsAsync()

  // Get parent folder info
  let parent: ListDocumentsResult['parent'] = null
  if (folder_id) {
    const parentItem = allItems.find((item) => item.id === folder_id)
    if (parentItem && parentItem.type === 'folder') {
      parent = {
        id: parentItem.id,
        name: parentItem.name,
        path: getItemPath(parentItem),
      }
    }
  }

  // Filter items
  let items = allItems

  // Apply folder filter
  if (folder_id) {
    if (recursive) {
      // Include all descendants
      const matchPromises = items.map(async (item) => ({
        item,
        matches: await matchesFolderFilter(item, folder_id, true, allItems),
      }))
      const matchResults = await Promise.all(matchPromises)
      items = matchResults.filter((r) => r.matches).map((r) => r.item)
    } else {
      // Only direct children
      items = items.filter((item) => item.parentId === folder_id)
    }
  } else if (!recursive) {
    // Root level items only (no parent)
    items = items.filter((item) => !item.parentId)
  }

  // Apply type filter
  if (type !== 'all') {
    items = items.filter((item) => item.type === type)
  }

  // Apply file type filter (for files only)
  if (file_types && file_types.length > 0) {
    items = items.filter(
      (item) =>
        item.type === 'folder' ||
        (item.fileType && file_types.includes(item.fileType)),
    )
  }

  // Apply tag filter
  if (tags && tags.length > 0) {
    const normalizedTags = tags.map(normalizeText)
    items = items.filter((item) => {
      const itemTags = (item.tags || []).map(normalizeText)
      return normalizedTags.some((tag) => itemTags.includes(tag))
    })
  }

  const totalCount = items.length

  // Apply sorting
  items.sort((a, b) => {
    let comparison = 0

    switch (sort_by) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'lastModified':
        comparison =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime()
        break
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'size':
        comparison = (a.size || 0) - (b.size || 0)
        break
    }

    return sort_order === 'desc' ? -comparison : comparison
  })

  // Apply pagination
  const paginatedItems = items.slice(offset, offset + limit)
  const hasMore = offset + limit < totalCount

  // Convert to listed documents
  const listedDocuments: ListedDocument[] = paginatedItems.map((item) => ({
    id: item.id,
    name: item.name,
    path: getItemPath(item),
    type: item.type,
    fileType: item.fileType,
    mimeType: item.mimeType,
    size: item.size,
    lastModified: item.lastModified,
    tags: item.tags || [],
    hasContent: !!(item.content || item.transcript),
    processingStatus: item.processingStatus,
    childCount:
      item.type === 'folder' ? countChildren(item.id, allItems) : undefined,
  }))

  return {
    parent,
    items: listedDocuments,
    total_count: totalCount,
    has_more: hasMore,
    offset,
    limit,
  }
}

/**
 * Generates or retrieves a summary for a document.
 *
 * Note: This implementation provides a basic extractive summary.
 * For more sophisticated AI-generated summaries, integrate with the LLM service.
 *
 * @param params - Summary parameters including document ID and options
 * @returns Document summary with key topics
 *
 * @example
 * ```typescript
 * const summary = await getDocumentSummary({
 *   document_id: 'doc123',
 *   max_words: 150,
 *   focus: 'technical specifications'
 * })
 * ```
 */
export async function getDocumentSummary(
  params: GetDocumentSummaryParams,
): Promise<GetDocumentSummaryResult> {
  const { document_id, max_words = 200, focus } = params

  // Ensure Yjs is ready before accessing knowledge items
  await ensureYjsReady()

  // Retrieve the document
  const item = await getKnowledgeItemAsync(document_id)

  if (!item) {
    return {
      found: false,
      error: `Document not found: ${document_id}`,
      summary: null,
      key_topics: [],
      cached: false,
    }
  }

  if (item.type === 'folder') {
    return {
      found: true,
      error: 'Cannot summarize folders',
      metadata: {
        id: item.id,
        name: item.name,
        path: getItemPath(item),
        fileType: item.fileType,
        size: item.size,
      },
      summary: null,
      key_topics: [],
      cached: false,
    }
  }

  // Get readable content
  const { content, type: contentType } = getReadableContent(item)

  if (!content || contentType === 'base64') {
    return {
      found: true,
      error:
        contentType === 'base64'
          ? 'Document contains binary content. Process the document first to extract text.'
          : 'Document has no readable content',
      metadata: {
        id: item.id,
        name: item.name,
        path: getItemPath(item),
        fileType: item.fileType,
        size: item.size,
      },
      summary: null,
      key_topics: [],
      cached: false,
    }
  }

  // Generate extractive summary
  const summary = generateExtractSummary(content, max_words, focus)

  // Extract key topics (simple keyword extraction)
  const keyTopics = extractKeyTopics(content)

  return {
    found: true,
    metadata: {
      id: item.id,
      name: item.name,
      path: getItemPath(item),
      fileType: item.fileType,
      size: item.size,
    },
    summary,
    key_topics: keyTopics,
    cached: false, // This implementation always generates fresh summaries
  }
}

/**
 * Generates an extractive summary by selecting key sentences.
 */
function generateExtractSummary(
  content: string,
  maxWords: number,
  focus?: string,
): string {
  // Split into sentences
  const sentences = content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20) // Filter out very short fragments

  if (sentences.length === 0) {
    return content.split(/\s+/).slice(0, maxWords).join(' ')
  }

  // Score sentences
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0

    // Position score - earlier sentences often contain key info
    score += Math.max(0, (10 - index) / 10)

    // Length score - prefer medium-length sentences
    const wordCount = sentence.split(/\s+/).length
    if (wordCount >= 10 && wordCount <= 30) score += 0.5

    // Focus score - if focus term is provided
    if (focus && sentence.toLowerCase().includes(focus.toLowerCase())) {
      score += 2
    }

    // Keyword indicators score
    const indicatorWords = [
      'important',
      'key',
      'main',
      'primary',
      'essential',
      'critical',
      'significant',
      'summary',
    ]
    for (const word of indicatorWords) {
      if (sentence.toLowerCase().includes(word)) {
        score += 0.3
      }
    }

    return { sentence, score, index }
  })

  // Sort by score and select top sentences
  scoredSentences.sort((a, b) => b.score - a.score)

  // Select sentences up to word limit
  let wordCount = 0
  const selectedSentences: { sentence: string; index: number }[] = []

  for (const { sentence, index } of scoredSentences) {
    const sentenceWords = sentence.split(/\s+/).length
    if (wordCount + sentenceWords <= maxWords) {
      selectedSentences.push({ sentence, index })
      wordCount += sentenceWords
    }

    if (wordCount >= maxWords) break
  }

  // Sort by original position to maintain flow
  selectedSentences.sort((a, b) => a.index - b.index)

  return selectedSentences.map((s) => s.sentence).join('. ') + '.'
}

/**
 * Extracts key topics/keywords from content.
 */
function extractKeyTopics(content: string): string[] {
  // Simple keyword extraction based on frequency
  const words = content.toLowerCase().split(/\s+/)

  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'is',
    'are',
    'was',
    'were',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'as',
    'if',
    'then',
    'so',
    'not',
    'no',
    'yes',
    'all',
    'any',
    'both',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
  ])

  // Count word frequencies
  const wordFreq = new Map<string, number>()

  for (const word of words) {
    // Clean word - remove punctuation
    const cleanWord = word.replace(/[^a-z0-9]/g, '')

    // Skip stop words and short words
    if (cleanWord.length < 4 || stopWords.has(cleanWord)) continue

    wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1)
  }

  // Sort by frequency and take top 5
  const sorted = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  return sorted
}

// ============================================================================
// Exports
// ============================================================================

export { KNOWLEDGE_TOOL_DEFINITIONS } from './types'
