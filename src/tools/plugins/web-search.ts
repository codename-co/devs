/**
 * Web Search Tool Plugin
 *
 * A tool plugin that provides web search capabilities using SearXNG.
 * No API key required — uses a self-hosted or public SearXNG instance.
 *
 * SearXNG is an open-source, privacy-respecting meta-search engine that
 * aggregates results from multiple sources. It exposes a JSON API with
 * CORS support when properly configured.
 *
 * @module tools/plugins/web-search
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Types
// ============================================================================

export interface WebSearchParams {
  /** The search query */
  query: string
  /** Maximum number of results to return (default: 5) */
  maxResults?: number
  /** Language for results (e.g., 'fr', 'en', 'de'). Default is 'auto' */
  language?: string
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
// Configuration
// ============================================================================

/**
 * Default SearXNG instance URL.
 * In production, SearXNG is served at /api/search on the same origin.
 * In development, the Vite dev server proxies /api/search to a local SearXNG instance.
 * Can be overridden via user settings (searxngInstanceUrl).
 */
const DEFAULT_SEARXNG_URL = '/api/search'

/**
 * Get the configured SearXNG instance URL from user settings.
 */
async function getSearxngUrl(): Promise<string> {
  try {
    const { getEffectiveSettings } = await import('@/stores/userStore')
    const settings = getEffectiveSettings()
    return (settings as unknown as Record<string, unknown>).searxngInstanceUrl as string || DEFAULT_SEARXNG_URL
  } catch {
    return DEFAULT_SEARXNG_URL
  }
}

// ============================================================================
// Tool Definition
// ============================================================================

export const WEB_SEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Search the web for current information. ' +
      'Use this to find up-to-date information about any topic, news, weather, prices, events, etc.',
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
        language: {
          type: 'string',
          description:
            'Language for results (e.g., "fr", "en", "de"). Default is "auto"',
        },
      },
      required: ['query'],
    },
  },
}

// ============================================================================
// Implementation
// ============================================================================

interface SearxngResult {
  title: string
  url: string
  content?: string
  engine?: string
}

interface SearxngResponse {
  results: SearxngResult[]
  query: string
  number_of_results?: number
}

/**
 * Search via a SearXNG instance and return parsed results.
 */
async function searchSearxng(
  params: WebSearchParams,
): Promise<WebSearchResponse | WebSearchError> {
  const { query, maxResults = 5, language = 'auto' } = params

  if (!query.trim()) {
    return { error: 'Search query cannot be empty', query }
  }

  try {
    const baseUrl = await getSearxngUrl()
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      language,
    })
    const url = `${baseUrl}/search?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return {
        error: `Search engine returned status ${response.status}`,
        query,
      }
    }

    const data: SearxngResponse = await response.json()

    const results: WebSearchResult[] = data.results
      .slice(0, maxResults)
      .map((r) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || '',
      }))

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
      shortDescription: 'Search the web using SearXNG (no API key required)',
      icon: 'Globe',
      category: 'web',
      tags: ['search', 'web', 'internet', 'searxng'],
    },
    definition: WEB_SEARCH_TOOL_DEFINITION,
    handler: async (params) => {
      return await searchSearxng(params)
    },
  })
