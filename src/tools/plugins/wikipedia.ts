/**
 * Wikipedia Tool Plugin
 *
 * A tool plugin that provides access to Wikipedia's vast knowledge base.
 * Uses the official Wikipedia API with excellent CORS support.
 *
 * @module tools/plugins/wikipedia
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Types
// ============================================================================

export interface WikipediaSearchParams {
  /** The search query */
  query: string
  /** Maximum number of results to return (default: 10) */
  maxResults?: number
  /** Language code for Wikipedia (e.g., 'en', 'fr', 'de'). Default is 'en' */
  language?: string
}

export interface WikipediaArticleParams {
  /** The article title to retrieve */
  title: string
  /** Language code for Wikipedia (e.g., 'en', 'fr', 'de'). Default is 'en' */
  language?: string
  /** Whether to include full content or just summary (default: false for summary only) */
  fullContent?: boolean
}

export interface WikipediaSearchResult {
  /** Title of the article */
  title: string
  /** URL of the article */
  url: string
  /** Snippet or description */
  snippet: string
  /** Word count of the article */
  wordCount?: number
  /** Last modified timestamp */
  timestamp?: string
}

export interface WikipediaSearchResponse {
  success: true
  /** Search query */
  query: string
  /** Search results */
  results: WikipediaSearchResult[]
  /** Number of results returned */
  count: number
}

export interface WikipediaArticleResponse {
  success: true
  /** Article title */
  title: string
  /** Article URL */
  url: string
  /** Article content (summary or full based on request) */
  content: string
  /** Categories the article belongs to */
  categories?: string[]
  /** Related articles */
  relatedArticles?: string[]
}

export interface WikipediaError {
  success: false
  error: string
  code: 'not_found' | 'invalid_query' | 'network_error' | 'api_error'
}

// ============================================================================
// Wikipedia API Implementation
// ============================================================================

/**
 * Search Wikipedia articles.
 */
async function searchWikipedia(
  params: WikipediaSearchParams,
  signal?: AbortSignal,
): Promise<WikipediaSearchResponse | WikipediaError> {
  const { query, maxResults = 10, language = 'en' } = params

  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      success: false,
      error: 'Search query is required and must be a non-empty string',
      code: 'invalid_query',
    }
  }

  const trimmedQuery = query.trim()
  const wikiLang = language.split('-')[0] // Convert 'en-US' to 'en'

  try {
    const searchParams = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: trimmedQuery,
      srlimit: String(Math.min(maxResults, 50)),
      srprop: 'size|wordcount|timestamp|snippet',
      format: 'json',
      origin: '*', // Enable CORS
    })

    const response = await fetch(
      `https://${wikiLang}.wikipedia.org/w/api.php?${searchParams}`,
      { signal },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `Wikipedia API returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const data = await response.json()

    if (!data.query?.search) {
      return {
        success: false,
        error: `No results found for "${trimmedQuery}"`,
        code: 'not_found',
      }
    }

    const results: WikipediaSearchResult[] = data.query.search.map(
      (result: any) => ({
        title: result.title,
        url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
        snippet: result.snippet
          ? result.snippet.replace(/<[^>]*>/g, '') // Strip HTML tags
          : '',
        wordCount: result.wordcount,
        timestamp: result.timestamp,
      }),
    )

    return {
      success: true,
      query: trimmedQuery,
      results,
      count: results.length,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[Wikipedia] Search failed:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error during search',
      code: 'network_error',
    }
  }
}

/**
 * Get a Wikipedia article's content.
 */
async function getWikipediaArticle(
  params: WikipediaArticleParams,
  signal?: AbortSignal,
): Promise<WikipediaArticleResponse | WikipediaError> {
  const { title, language = 'en', fullContent = false } = params

  // Validate title
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return {
      success: false,
      error: 'Article title is required and must be a non-empty string',
      code: 'invalid_query',
    }
  }

  const trimmedTitle = title.trim()
  const wikiLang = language.split('-')[0]

  try {
    // Use extracts API for content
    const searchParams = new URLSearchParams({
      action: 'query',
      titles: trimmedTitle,
      prop: fullContent ? 'extracts|categories' : 'extracts|categories',
      exintro: fullContent ? '' : '1', // Only intro if not full content
      explaintext: '1', // Plain text instead of HTML
      exsectionformat: 'plain',
      cllimit: '10', // Limit categories
      format: 'json',
      origin: '*',
    })

    // Remove exintro if fullContent is true
    if (fullContent) {
      searchParams.delete('exintro')
    }

    const response = await fetch(
      `https://${wikiLang}.wikipedia.org/w/api.php?${searchParams}`,
      { signal },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `Wikipedia API returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const data = await response.json()
    const pages = data.query?.pages

    if (!pages) {
      return {
        success: false,
        error: `Article "${trimmedTitle}" not found`,
        code: 'not_found',
      }
    }

    // Get the first (and should be only) page
    const pageId = Object.keys(pages)[0]
    const page = pages[pageId]

    // Check if page exists (negative ID means not found)
    if (parseInt(pageId) < 0 || page.missing !== undefined) {
      return {
        success: false,
        error: `Article "${trimmedTitle}" not found`,
        code: 'not_found',
      }
    }

    const categories = page.categories?.map((cat: any) =>
      cat.title.replace('Category:', ''),
    )

    return {
      success: true,
      title: page.title,
      url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      content: page.extract || 'No content available',
      categories,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[Wikipedia] Article fetch failed:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error fetching article',
      code: 'network_error',
    }
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const WIKIPEDIA_SEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wikipedia_search',
    description: `Search Wikipedia for articles on any topic. Returns a list of relevant articles with titles, URLs, and content snippets.

Best used for:
- Finding encyclopedic information on any topic
- Looking up historical events, people, places
- Understanding concepts and definitions
- Getting factual, well-sourced information

Note: Wikipedia content may not include the most recent events.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The search query. Can be a topic, name, concept, or any term.',
        },
        maxResults: {
          type: 'number',
          description:
            'Maximum number of results to return (1-50). Default is 10.',
          minimum: 1,
          maximum: 50,
        },
        language: {
          type: 'string',
          description:
            'Language code for Wikipedia (e.g., "en", "fr", "de", "es", "ja"). Default is "en".',
        },
      },
      required: ['query'],
    },
  },
}

export const WIKIPEDIA_ARTICLE_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wikipedia_article',
    description: `Retrieve the content of a specific Wikipedia article by its title. Use this after searching to get the full article content.

Returns the article text, categories, and URL. By default returns just the introduction/summary. Set fullContent to true for the complete article.`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'The exact title of the Wikipedia article (e.g., "Albert Einstein", "Machine learning").',
        },
        language: {
          type: 'string',
          description:
            'Language code for Wikipedia (e.g., "en", "fr", "de"). Default is "en".',
        },
        fullContent: {
          type: 'boolean',
          description:
            'Whether to retrieve the full article content or just the summary. Default is false (summary only).',
        },
      },
      required: ['title'],
    },
  },
}

// ============================================================================
// Wikipedia Tool Plugins
// ============================================================================

/**
 * Wikipedia search tool plugin.
 */
export const wikipediaSearchPlugin: ToolPlugin<
  WikipediaSearchParams,
  WikipediaSearchResponse | WikipediaError
> = createToolPlugin({
  metadata: {
    name: 'wikipedia_search',
    displayName: 'Wikipedia Search',
    shortDescription: 'Search Wikipedia for articles',
    icon: 'Book',
    category: 'research',
    tags: ['wikipedia', 'encyclopedia', 'research', 'knowledge', 'reference'],
    enabledByDefault: false,
    estimatedDuration: 2000,
    requiresConfirmation: false,
  },
  definition: WIKIPEDIA_SEARCH_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return searchWikipedia(args, context.abortSignal)
  },
  validate: (args): WikipediaSearchParams => {
    const params = args as WikipediaSearchParams

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
        params.maxResults > 50
      ) {
        throw new Error('maxResults must be a number between 1 and 50')
      }
    }

    return params
  },
})

/**
 * Wikipedia article retrieval tool plugin.
 */
export const wikipediaArticlePlugin: ToolPlugin<
  WikipediaArticleParams,
  WikipediaArticleResponse | WikipediaError
> = createToolPlugin({
  metadata: {
    name: 'wikipedia_article',
    displayName: 'Wikipedia Article',
    shortDescription: 'Get content of a Wikipedia article',
    icon: 'Book',
    category: 'research',
    tags: ['wikipedia', 'encyclopedia', 'article', 'content', 'reference'],
    enabledByDefault: false,
    estimatedDuration: 2000,
    requiresConfirmation: false,
  },
  definition: WIKIPEDIA_ARTICLE_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return getWikipediaArticle(args, context.abortSignal)
  },
  validate: (args): WikipediaArticleParams => {
    const params = args as WikipediaArticleParams

    if (
      params.title === undefined ||
      params.title === null ||
      typeof params.title !== 'string'
    ) {
      throw new Error('Title is required and must be a string')
    }

    if (params.title.trim().length === 0) {
      throw new Error('Title cannot be empty')
    }

    return params
  },
})

/**
 * All Wikipedia plugins for convenience.
 */
export const wikipediaPlugins: ToolPlugin<any, any>[] = [
  wikipediaSearchPlugin,
  wikipediaArticlePlugin,
]
