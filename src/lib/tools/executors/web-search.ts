/**
 * Web Search Tool Executor
 *
 * Implements real web search using the Brave Search API.
 * Requires BRAVE_SEARCH_API_KEY to be configured in context.credentials or environment.
 */

import type { ToolExecutor, ToolExecutionResult } from '../tool-registry'

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

interface BraveSearchResponse {
  web?: {
    results: Array<{
      title: string
      url: string
      description: string
      age?: string
    }>
  }
  query?: {
    original: string
  }
}

/**
 * Execute a web search using Brave Search API
 */
export async function executeWebSearch(
  query: string,
  numResults: number = 5,
  apiKey: string,
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(numResults, 20)}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal,
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Brave Search API error: ${response.status} - ${errorText}`)
  }

  const data: BraveSearchResponse = await response.json()

  if (!data.web?.results) {
    return []
  }

  return data.web.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
    publishedDate: r.age,
  }))
}

/**
 * Format search results for LLM consumption
 */
function formatSearchResults(
  results: WebSearchResult[],
  query: string,
): string {
  if (results.length === 0) {
    return `No search results found for "${query}".`
  }

  const formatted = results.map((r, i) => {
    const date = r.publishedDate ? ` (${r.publishedDate})` : ''
    return `${i + 1}. **${r.title}**${date}
   URL: ${r.url}
   ${r.snippet}`
  })

  return `## Search Results for "${query}"

${formatted.join('\n\n')}`
}

/**
 * Web search tool executor
 */
export const webSearchExecutor: ToolExecutor = async (args, context) => {
  const { query, numResults = 5 } = args as {
    query: string
    numResults?: number
  }

  if (!query || typeof query !== 'string') {
    return {
      success: false,
      content: '',
      error: {
        code: 'INVALID_ARGS',
        message: 'Query parameter is required and must be a string',
      },
    }
  }

  try {
    // Try to get API key from context.credentials
    const apiKey = context?.credentials?.['BRAVE_SEARCH_API_KEY']

    if (!apiKey) {
      // Use fallback search if no API key
      return executeFallbackSearch(query, context?.signal)
    }

    const results = await executeWebSearch(
      query,
      Math.min(numResults, 10),
      apiKey,
      context?.signal,
    )

    const formattedResults = formatSearchResults(results, query)

    return {
      success: true,
      content: formattedResults,
      metadata: {
        source: 'brave-search',
        resultCount: results.length,
      },
    }
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          content: '',
          error: {
            code: 'ABORTED',
            message: 'Search was cancelled',
          },
        }
      }

      if (error.message.includes('401')) {
        return {
          success: false,
          content:
            'Invalid Brave Search API key. Please check your API key configuration.',
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key',
          },
        }
      }

      if (error.message.includes('429')) {
        return {
          success: false,
          content:
            'Rate limit exceeded for Brave Search API. Please try again later.',
          error: {
            code: 'RATE_LIMIT',
            message: 'API rate limit exceeded',
          },
        }
      }
    }

    return {
      success: false,
      content: '',
      error: {
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Web search failed',
      },
    }
  }
}

/**
 * Fallback search using DuckDuckGo Instant Answers (no API key required)
 * Limited functionality but works without configuration
 */
export async function executeFallbackSearch(
  query: string,
  signal?: AbortSignal,
): Promise<ToolExecutionResult> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
      { signal },
    )

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`)
    }

    const data = await response.json()

    // DuckDuckGo Instant Answers has limited results
    const results: string[] = []

    if (data.Abstract) {
      results.push(
        `**Summary:** ${data.Abstract}\n_Source: ${data.AbstractSource}_`,
      )
    }

    if (data.RelatedTopics?.length) {
      results.push('\n**Related Topics:**')
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results.push(`- ${topic.Text}`)
        }
      }
    }

    if (results.length === 0) {
      return {
        success: true,
        content: `No instant answers found for "${query}". For better results, configure a Brave Search API key.`,
        metadata: { source: 'duckduckgo-fallback' },
      }
    }

    return {
      success: true,
      content: `## Results for "${query}" (Limited - DuckDuckGo Instant Answers)\n\n${results.join('\n')}`,
      metadata: { source: 'duckduckgo-fallback' },
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: {
        code: 'FALLBACK_SEARCH_ERROR',
        message:
          error instanceof Error ? error.message : 'Fallback search failed',
      },
    }
  }
}
