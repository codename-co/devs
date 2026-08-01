/**
 * Web Search Tool Plugin
 *
 * A tool plugin that provides web search capabilities using DuckDuckGo.
 * No API key required — uses DDG's HTML endpoint.
 *
 * @module tools/plugins/web-search
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'
import { fetchViaCorsProxy } from '@/lib/url'

// ============================================================================
// Types
// ============================================================================

export interface WebSearchParams {
  /** The search query */
  query: string
  /** Maximum number of results to return (default: 5) */
  maxResults?: number
  /** Region/language for results (e.g., 'fr-fr', 'en-us'). Default is 'wt-wt' (no region) */
  region?: string
}

export interface WebSearchResult {
  /** Title of the search result */
  title: string
  /** URL of the result */
  url: string
  /** Snippet/description */
  snippet: string
}

export interface WebSearchResponse {
  results: WebSearchResult[]
  query: string
}

export interface WebSearchError {
  error: string
  query: string
}

// ============================================================================
// Tool Definition
// ============================================================================

export const WEB_SEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Search the web for current information using DuckDuckGo. ' +
      'Use this to find up-to-date information about any topic, news, weather, etc.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
        region: {
          type: 'string',
          description:
            'Region for results (e.g., "fr-fr", "en-us"). Default is "wt-wt" (no region)',
        },
      },
      required: ['query'],
    },
  },
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Parse DuckDuckGo HTML search results.
 * DDG's HTML endpoint returns results that we parse for titles, URLs, and snippets.
 */
function parseDdgHtml(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = []

  // Match result blocks: each result is in a div with class "result"
  // The link is in <a class="result__a"> and snippet in <a class="result__snippet">
  const resultRegex =
    /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/g

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    const url = decodeURIComponent(
      match[1].replace(/\/l\/\?uddg=/, '').replace(/&rut=.*$/, ''),
    )
    const title = match[2].replace(/<[^>]*>/g, '').trim()
    const snippet = match[3].replace(/<[^>]*>/g, '').trim()

    if (url && title) {
      results.push({ title, url, snippet })
    }
  }

  return results
}

/**
 * Search DuckDuckGo and return parsed results.
 */
async function searchDuckDuckGo(
  params: WebSearchParams,
): Promise<WebSearchResponse | WebSearchError> {
  const { query, maxResults = 5, region = 'wt-wt' } = params

  if (!query.trim()) {
    return { error: 'Search query cannot be empty', query }
  }

  try {
    const searchUrl = new URL('https://html.duckduckgo.com/html/')
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('kl', region)

    const response = await fetchViaCorsProxy(searchUrl.toString())

    if (!response.ok) {
      return {
        error: `DuckDuckGo returned status ${response.status}`,
        query,
      }
    }

    const html = await response.text()
    const results = parseDdgHtml(html).slice(0, maxResults)

    return { results, query }
  } catch (error) {
    return {
      error: `Web search failed: ${error instanceof Error ? error.message : String(error)}`,
      query,
    }
  }
}

// ============================================================================
// Plugin
// ============================================================================

export const webSearchPlugin: ToolPlugin<WebSearchParams, WebSearchResponse | WebSearchError> =
  createToolPlugin({
    metadata: {
      name: 'web_search',
      displayName: 'Web Search',
      shortDescription: 'Search the web using DuckDuckGo (no API key required)',
      icon: 'Globe',
      category: 'web',
      tags: ['search', 'web', 'internet', 'duckduckgo'],
    },
    definition: WEB_SEARCH_TOOL_DEFINITION,
    handler: async (params) => {
      return await searchDuckDuckGo(params)
    },
  })
