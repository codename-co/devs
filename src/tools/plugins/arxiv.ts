/**
 * arXiv Tool Plugin
 *
 * A tool plugin that provides access to arXiv, an open-access repository
 * of scientific papers in physics, mathematics, computer science, and more.
 *
 * @module tools/plugins/arxiv
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'
import { fetchViaCorsProxy } from '@/lib/url'

// ============================================================================
// Types
// ============================================================================

export interface ArxivSearchParams {
  /** The search query */
  query: string
  /** Maximum number of results to return (default: 10) */
  maxResults?: number
  /** Search field: all, title, author, abstract, category */
  searchField?: 'all' | 'title' | 'author' | 'abstract' | 'category'
  /** Sort by: relevance, lastUpdatedDate, submittedDate */
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate'
  /** Sort order: ascending, descending */
  sortOrder?: 'ascending' | 'descending'
  /** Category filter (e.g., 'cs.AI', 'physics.hep-th', 'math.GT') */
  category?: string
}

export interface ArxivPaperParams {
  /** The arXiv paper ID (e.g., '2301.07041' or 'arxiv:2301.07041') */
  paperId: string
}

export interface ArxivAuthor {
  name: string
  affiliation?: string
}

export interface ArxivPaper {
  /** arXiv ID */
  id: string
  /** Paper title */
  title: string
  /** Authors */
  authors: ArxivAuthor[]
  /** Abstract */
  abstract: string
  /** Categories/subjects */
  categories: string[]
  /** Primary category */
  primaryCategory: string
  /** Publication date */
  published: string
  /** Last updated date */
  updated: string
  /** Link to abstract page */
  abstractUrl: string
  /** Link to PDF */
  pdfUrl: string
  /** DOI if available */
  doi?: string
  /** Journal reference if published */
  journalRef?: string
  /** Comment (e.g., page count, conference) */
  comment?: string
}

export interface ArxivSearchResponse {
  success: true
  query: string
  results: ArxivPaper[]
  count: number
  totalResults?: number
}

export interface ArxivPaperResponse {
  success: true
  paper: ArxivPaper
}

export interface ArxivError {
  success: false
  error: string
  code: 'not_found' | 'invalid_query' | 'network_error' | 'api_error'
}

// ============================================================================
// arXiv API Implementation
// ============================================================================

/**
 * Parse arXiv Atom XML response into paper objects.
 */
function parseArxivEntry(entry: Element): ArxivPaper {
  const getText = (tagName: string): string => {
    const el = entry.getElementsByTagName(tagName)[0]
    return el?.textContent?.trim() || ''
  }

  const getLink = (rel: string): string => {
    const links = entry.getElementsByTagName('link')
    for (let i = 0; i < links.length; i++) {
      if (
        links[i].getAttribute('rel') === rel ||
        links[i].getAttribute('title') === rel
      ) {
        return links[i].getAttribute('href') || ''
      }
    }
    // Fallback for PDF link
    if (rel === 'pdf') {
      for (let i = 0; i < links.length; i++) {
        const href = links[i].getAttribute('href') || ''
        if (href.includes('/pdf/')) {
          return href
        }
      }
    }
    return ''
  }

  // Parse authors
  const authorElements = entry.getElementsByTagName('author')
  const authors: ArxivAuthor[] = []
  for (let i = 0; i < authorElements.length; i++) {
    const name =
      authorElements[i].getElementsByTagName('name')[0]?.textContent?.trim() ||
      ''
    const affiliation = authorElements[i]
      .getElementsByTagName('arxiv:affiliation')[0]
      ?.textContent?.trim()
    if (name) {
      authors.push({ name, affiliation })
    }
  }

  // Parse categories
  const categoryElements = entry.getElementsByTagName('category')
  const categories: string[] = []
  let primaryCategory = ''
  for (let i = 0; i < categoryElements.length; i++) {
    const term = categoryElements[i].getAttribute('term')
    if (term) {
      categories.push(term)
      if (i === 0) primaryCategory = term
    }
  }

  // Extract ID from the full URL
  const idUrl = getText('id')
  const idMatch = idUrl.match(/abs\/(.+)$/)
  const id = idMatch ? idMatch[1] : idUrl

  // Get abstract URL and PDF URL
  const abstractUrl = idUrl || `https://arxiv.org/abs/${id}`
  let pdfUrl = getLink('pdf')
  if (!pdfUrl && id) {
    pdfUrl = `https://arxiv.org/pdf/${id}.pdf`
  }

  return {
    id,
    title: getText('title').replace(/\s+/g, ' '), // Normalize whitespace
    authors,
    abstract: getText('summary').replace(/\s+/g, ' '),
    categories,
    primaryCategory,
    published: getText('published'),
    updated: getText('updated'),
    abstractUrl,
    pdfUrl,
    doi: getText('arxiv:doi') || undefined,
    journalRef: getText('arxiv:journal_ref') || undefined,
    comment: getText('arxiv:comment') || undefined,
  }
}

/**
 * Search arXiv for papers.
 */
async function searchArxiv(
  params: ArxivSearchParams,
  signal?: AbortSignal,
): Promise<ArxivSearchResponse | ArxivError> {
  const {
    query,
    maxResults = 10,
    searchField = 'all',
    sortBy = 'relevance',
    sortOrder = 'descending',
    category,
  } = params

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      success: false,
      error: 'Search query is required and must be a non-empty string',
      code: 'invalid_query',
    }
  }

  const trimmedQuery = query.trim()

  try {
    // Build search query
    let searchQuery = ''
    switch (searchField) {
      case 'title':
        searchQuery = `ti:${trimmedQuery}`
        break
      case 'author':
        searchQuery = `au:${trimmedQuery}`
        break
      case 'abstract':
        searchQuery = `abs:${trimmedQuery}`
        break
      case 'category':
        searchQuery = `cat:${trimmedQuery}`
        break
      default:
        searchQuery = `all:${trimmedQuery}`
    }

    // Add category filter if specified
    if (category) {
      searchQuery = `${searchQuery} AND cat:${category}`
    }

    const searchParams = new URLSearchParams({
      search_query: searchQuery,
      start: '0',
      max_results: String(Math.min(maxResults, 100)),
      sortBy: sortBy,
      sortOrder: sortOrder,
    })

    const response = await fetchViaCorsProxy(
      `https://export.arxiv.org/api/query?${searchParams}`,
      { signal },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `arXiv API returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      return {
        success: false,
        error: 'Failed to parse arXiv response',
        code: 'api_error',
      }
    }

    // Get total results
    const totalResultsEl = doc.getElementsByTagName(
      'opensearch:totalResults',
    )[0]
    const totalResults = totalResultsEl
      ? parseInt(totalResultsEl.textContent || '0', 10)
      : undefined

    // Parse entries
    const entries = doc.getElementsByTagName('entry')
    const results: ArxivPaper[] = []
    for (let i = 0; i < entries.length; i++) {
      results.push(parseArxivEntry(entries[i]))
    }

    return {
      success: true,
      query: trimmedQuery,
      results,
      count: results.length,
      totalResults,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[arXiv] Search failed:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error during search',
      code: 'network_error',
    }
  }
}

/**
 * Get a specific arXiv paper by ID.
 */
async function getArxivPaper(
  params: ArxivPaperParams,
  signal?: AbortSignal,
): Promise<ArxivPaperResponse | ArxivError> {
  const { paperId } = params

  if (!paperId || typeof paperId !== 'string' || paperId.trim().length === 0) {
    return {
      success: false,
      error: 'Paper ID is required',
      code: 'invalid_query',
    }
  }

  // Clean up the paper ID (remove 'arxiv:' prefix if present)
  let cleanId = paperId.trim()
  if (cleanId.toLowerCase().startsWith('arxiv:')) {
    cleanId = cleanId.substring(6)
  }

  try {
    const response = await fetchViaCorsProxy(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(cleanId)}`,
      { signal },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `arXiv API returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')

    const entries = doc.getElementsByTagName('entry')
    if (entries.length === 0) {
      return {
        success: false,
        error: `Paper ${cleanId} not found`,
        code: 'not_found',
      }
    }

    const paper = parseArxivEntry(entries[0])

    // Check if it's a valid paper (has an ID that matches)
    if (!paper.id || paper.title === 'Error') {
      return {
        success: false,
        error: `Paper ${cleanId} not found`,
        code: 'not_found',
      }
    }

    return {
      success: true,
      paper,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[arXiv] Paper fetch failed:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error fetching paper',
      code: 'network_error',
    }
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const ARXIV_SEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'arxiv_search',
    description: `Search arXiv for scientific papers. arXiv is an open-access repository of research papers in physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, electrical engineering, and economics.

Best used for:
- Finding research papers on scientific topics
- Discovering latest research in AI/ML, physics, math
- Looking up papers by author or topic
- Finding papers in specific arXiv categories

Returns paper metadata including title, authors, abstract, categories, and links to PDF.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The search query. Can include author names, topics, keywords.',
        },
        maxResults: {
          type: 'number',
          description:
            'Maximum number of results to return (1-100). Default is 10.',
          minimum: 1,
          maximum: 100,
        },
        searchField: {
          type: 'string',
          enum: ['all', 'title', 'author', 'abstract', 'category'],
          description: 'Field to search in. Default is "all".',
        },
        sortBy: {
          type: 'string',
          enum: ['relevance', 'lastUpdatedDate', 'submittedDate'],
          description: 'How to sort results. Default is "relevance".',
        },
        sortOrder: {
          type: 'string',
          enum: ['ascending', 'descending'],
          description: 'Sort order. Default is "descending".',
        },
        category: {
          type: 'string',
          description:
            'Filter by arXiv category (e.g., "cs.AI", "physics.hep-th", "math.GT", "q-bio.NC").',
        },
      },
      required: ['query'],
    },
  },
}

export const ARXIV_PAPER_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'arxiv_paper',
    description: `Get detailed information about a specific arXiv paper by its ID.

Paper IDs can be in formats like:
- "2301.07041" (new format since 2007)
- "hep-th/9901001" (old format with category)
- "arxiv:2301.07041" (with prefix)

Returns full paper metadata including abstract, all authors, categories, and links.`,
    parameters: {
      type: 'object',
      properties: {
        paperId: {
          type: 'string',
          description:
            'The arXiv paper ID (e.g., "2301.07041", "cs/0001001", "arxiv:2301.07041").',
        },
      },
      required: ['paperId'],
    },
  },
}

// ============================================================================
// arXiv Tool Plugins
// ============================================================================

export const arxivSearchPlugin: ToolPlugin<
  ArxivSearchParams,
  ArxivSearchResponse | ArxivError
> = createToolPlugin({
  metadata: {
    name: 'arxiv_search',
    displayName: 'arXiv Search',
    shortDescription: 'Search scientific papers on arXiv',
    icon: 'Page',
    category: 'research',
    tags: ['arxiv', 'papers', 'research', 'science', 'academic'],
    enabledByDefault: false,
    estimatedDuration: 3000,
    requiresConfirmation: false,
  },
  definition: ARXIV_SEARCH_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return searchArxiv(args, context.abortSignal)
  },
  validate: (args): ArxivSearchParams => {
    const params = args as ArxivSearchParams

    if (
      params.query === undefined ||
      params.query === null ||
      typeof params.query !== 'string'
    ) {
      throw new Error('Query is required and must be a string')
    }

    if (params.query.trim().length === 0) {
      throw new Error('Query cannot be empty')
    }

    if (params.maxResults !== undefined) {
      if (
        typeof params.maxResults !== 'number' ||
        params.maxResults < 1 ||
        params.maxResults > 100
      ) {
        throw new Error('maxResults must be a number between 1 and 100')
      }
    }

    if (params.searchField !== undefined) {
      const validFields = ['all', 'title', 'author', 'abstract', 'category']
      if (!validFields.includes(params.searchField)) {
        throw new Error(`searchField must be one of: ${validFields.join(', ')}`)
      }
    }

    if (params.sortBy !== undefined) {
      const validSortBy = ['relevance', 'lastUpdatedDate', 'submittedDate']
      if (!validSortBy.includes(params.sortBy)) {
        throw new Error(`sortBy must be one of: ${validSortBy.join(', ')}`)
      }
    }

    if (params.sortOrder !== undefined) {
      const validSortOrder = ['ascending', 'descending']
      if (!validSortOrder.includes(params.sortOrder)) {
        throw new Error(
          `sortOrder must be one of: ${validSortOrder.join(', ')}`,
        )
      }
    }

    return params
  },
})

export const arxivPaperPlugin: ToolPlugin<
  ArxivPaperParams,
  ArxivPaperResponse | ArxivError
> = createToolPlugin({
  metadata: {
    name: 'arxiv_paper',
    displayName: 'arXiv Paper',
    shortDescription: 'Get details of an arXiv paper',
    icon: 'Page',
    category: 'research',
    tags: ['arxiv', 'paper', 'research', 'science', 'academic'],
    enabledByDefault: false,
    estimatedDuration: 2000,
    requiresConfirmation: false,
  },
  definition: ARXIV_PAPER_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return getArxivPaper(args, context.abortSignal)
  },
  validate: (args): ArxivPaperParams => {
    const params = args as ArxivPaperParams

    if (
      params.paperId === undefined ||
      params.paperId === null ||
      typeof params.paperId !== 'string'
    ) {
      throw new Error('Paper ID is required and must be a string')
    }

    if (params.paperId.trim().length === 0) {
      throw new Error('Paper ID cannot be empty')
    }

    return params
  },
})

/**
 * All arXiv plugins for convenience.
 */
export const arxivPlugins: ToolPlugin<any, any>[] = [
  arxivSearchPlugin,
  arxivPaperPlugin,
]
