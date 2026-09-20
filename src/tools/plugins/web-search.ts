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
import { fetchViaCorsProxy } from '@/lib/url'

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
  /** Search backend that produced the results. */
  source?: 'searxng' | 'duckduckgo'
}

export interface WebSearchError {
  error: string
  query: string
}

type SearchFailureReason =
  | 'backend_unavailable'
  | 'engine_failure'
  | 'zero_results'

interface SearchAttemptError extends WebSearchError {
  reason: SearchFailureReason
}

type SearchAttemptResult = WebSearchResponse | SearchAttemptError

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default SearXNG search endpoint.
 * In production, requests go through proxy.devs.new which forwards to SearXNG internally.
 * In development, the Vite dev server proxies /api/search to a local SearXNG instance.
 * Can be overridden via user settings (searxngInstanceUrl).
 */
function getDefaultSearchUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '/api/search'
  }
  return 'https://proxy.devs.new/api/search'
}

/**
 * SearXNG callers append `/search`, but users often paste the full search
 * endpoint. Accept both root and `/search` URLs.
 */
function normalizeSearxngBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/search$/i, '')
}

/**
 * Get the configured SearXNG instance URL from user settings.
 */
async function getSearxngUrl(): Promise<string> {
  try {
    const { getEffectiveSettings } = await import('@/stores/userStore')
    const settings = getEffectiveSettings()
    const configuredUrl = (settings as unknown as Record<string, unknown>)
      .searxngInstanceUrl
    return normalizeSearxngBaseUrl(
      typeof configuredUrl === 'string' && configuredUrl.trim()
        ? configuredUrl
        : getDefaultSearchUrl(),
    )
  } catch {
    return normalizeSearxngBaseUrl(getDefaultSearchUrl())
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
  results?: SearxngResult[]
  query: string
  number_of_results?: number
  /** Present (with no `results`) when every engine failed. */
  error?: string
}

const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/'

const DDG_REGION_BY_LANGUAGE: Record<string, string> = {
  ar: 'xa-ar',
  de: 'de-de',
  en: 'us-en',
  es: 'es-es',
  fr: 'fr-fr',
  ko: 'kr-kr',
}

function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

function resolveDuckDuckGoResultUrl(href: string | null): string {
  const rawHref = normalizeText(href)

  if (!rawHref) {
    return ''
  }

  try {
    const url = new URL(
      rawHref.startsWith('//') ? `https:${rawHref}` : rawHref,
      'https://duckduckgo.com',
    )
    const redirectUrl = url.searchParams.get('uddg')

    if (
      redirectUrl &&
      url.hostname.endsWith('duckduckgo.com') &&
      url.pathname.replace(/\/+$/, '') === '/l'
    ) {
      return redirectUrl
    }

    return url.toString()
  } catch {
    return ''
  }
}

function findDuckDuckGoSnippet(anchor: HTMLAnchorElement): string {
  const sameRowSnippet = anchor
    .closest('tr')
    ?.querySelector<HTMLElement>('td.result-snippet')
  const sameCellSiblingSnippet = anchor
    .closest('td')
    ?.parentElement?.querySelector<HTMLElement>('td.result-snippet')

  if (sameRowSnippet || sameCellSiblingSnippet) {
    return normalizeText(
      (sameRowSnippet ?? sameCellSiblingSnippet)?.textContent,
    )
  }

  let row = anchor.closest('tr')?.nextElementSibling
  while (row) {
    if (row.querySelector('a.result-link')) {
      break
    }

    const snippet = row.querySelector<HTMLElement>('td.result-snippet')
    if (snippet) {
      return normalizeText(snippet.textContent)
    }

    row = row.nextElementSibling
  }

  return ''
}

/**
 * Parse DuckDuckGo Lite HTML result tables into web search results.
 */
export function parseDuckDuckGoLiteResults(
  html: string,
  maxResults = 5,
): WebSearchResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const links = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>('a.result-link'),
  )
  const results: WebSearchResult[] = []

  for (const link of links) {
    const title = normalizeText(link.textContent)
    const url = resolveDuckDuckGoResultUrl(link.getAttribute('href'))

    if (!title || !url) {
      continue
    }

    results.push({
      title,
      url,
      snippet: findDuckDuckGoSnippet(link),
    })

    if (results.length >= maxResults) {
      break
    }
  }

  return results
}

function getDuckDuckGoRegion(language: string): string | undefined {
  const normalized = language.trim().toLowerCase()

  if (!normalized || normalized === 'auto') {
    return undefined
  }

  if (/^[a-z]{2}-[a-z]{2}$/.test(normalized)) {
    return normalized
  }

  return DDG_REGION_BY_LANGUAGE[normalized]
}

function buildDuckDuckGoLiteUrl(
  query: string,
  language: string,
): string {
  const params = new URLSearchParams({ q: query })
  const region = getDuckDuckGoRegion(language)

  if (region) {
    params.set('kl', region)
  }

  return `${DDG_LITE_URL}?${params.toString()}`
}

function formatSearxngUnavailableError(status: number): string {
  if (status >= 500) {
    return `SearXNG search backend unavailable (HTTP ${status}); no SearXNG information was retrieved, and DuckDuckGo Lite fallback was attempted`
  }

  return `SearXNG search backend returned HTTP ${status}; no SearXNG information was retrieved, and DuckDuckGo Lite fallback was attempted`
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isSuccessfulSearch(
  result: SearchAttemptResult,
): result is WebSearchResponse {
  return 'results' in result && result.results.length > 0
}

/**
 * Detect DuckDuckGo Lite automated-request challenge pages.
 *
 * The challenge response is HTTP 202 (so `response.ok` is true) but contains
 * anomaly/challenge markers instead of `a.result-link` result anchors.
 */
export function isDuckDuckGoChallengePage(html: string): boolean {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  if (doc.querySelector('a.result-link')) {
    return false
  }

  const normalizedHtml = html.toLowerCase()
  const hasAnomalyMarker = /\banomaly\b/i.test(normalizedHtml)
  const hasChallengeMarker = /\bchallenge\b/i.test(normalizedHtml)
  const hasDuckDuckGoContext =
    normalizeText(doc.querySelector('title')?.textContent).toLowerCase() ===
      'duckduckgo' || normalizedHtml.includes('duckduckgo')
  const hasChallengeForm = Boolean(doc.querySelector('form'))

  return (
    hasAnomalyMarker &&
    hasChallengeMarker &&
    (hasDuckDuckGoContext || hasChallengeForm)
  )
}

/**
 * Search via a SearXNG instance and return parsed results.
 */
async function searchSearxng(
  params: WebSearchParams,
): Promise<SearchAttemptResult> {
  const { query, maxResults = 5, language = 'auto' } = params

  if (!query.trim()) {
    return {
      error: 'Search query cannot be empty',
      query,
      reason: 'zero_results',
    }
  }

  try {
    const baseUrl = await getSearxngUrl()
    const searchParams = new URLSearchParams({
      q: query,
      format: 'json',
      language,
    })
    const url = `${baseUrl}/search?${searchParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return {
        error: formatSearxngUnavailableError(response.status),
        query,
        reason: 'backend_unavailable',
      }
    }

    const data: SearxngResponse = await response.json()

    // SearXNG answers 200 with `{"error": "..."}` when every engine fails
    // (rate limits, CAPTCHAs), so `results` can be absent.
    if (!Array.isArray(data.results)) {
      return {
        error:
          typeof data.error === 'string'
            ? `SearXNG engine-level failure: ${data.error}; no SearXNG results were retrieved, and DuckDuckGo Lite fallback was attempted`
            : `SearXNG search completed but returned zero usable results for "${query}"; DuckDuckGo Lite fallback was attempted. This is a genuine zero-result outcome for SearXNG, not a backend outage.`,
        query,
        reason:
          typeof data.error === 'string' ? 'engine_failure' : 'zero_results',
      }
    }

    const results: WebSearchResult[] = data.results
      .slice(0, maxResults)
      .map((r) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || '',
      }))
      .filter((result) => result.title && result.url)

    if (results.length === 0) {
      return {
        error: `SearXNG search completed but returned zero usable results for "${query}"; DuckDuckGo Lite fallback was attempted. This is a genuine zero-result outcome for SearXNG, not a backend outage.`,
        query,
        reason: 'zero_results',
      }
    }

    return { results, query, source: 'searxng' }
  } catch (error) {
    return {
      error: `SearXNG search backend unreachable (${formatUnknownError(error)}); no SearXNG information was retrieved, and DuckDuckGo Lite fallback was attempted`,
      query,
      reason: 'backend_unavailable',
    }
  }
}

/**
 * Search via DuckDuckGo Lite through the existing CORS proxy.
 */
async function searchDuckDuckGoLite(
  params: WebSearchParams,
): Promise<SearchAttemptResult> {
  const { query, maxResults = 5, language = 'auto' } = params

  try {
    const response = await fetchViaCorsProxy(
      buildDuckDuckGoLiteUrl(query, language),
      {
        method: 'GET',
        headers: { Accept: 'text/html' },
      },
    )

    if (!response.ok) {
      return {
        error: `DuckDuckGo Lite fallback backend unavailable (HTTP ${response.status}); no DuckDuckGo information was retrieved`,
        query,
        reason: 'backend_unavailable',
      }
    }

    const html = await response.text()

    if (isDuckDuckGoChallengePage(html)) {
      return {
        error:
          'DuckDuckGo Lite fallback was blocked by an automated-request challenge. No information was retrieved; this says nothing about whether information exists, so do not fabricate results or claim the topic has no coverage.',
        query,
        reason: 'backend_unavailable',
      }
    }

    const results = parseDuckDuckGoLiteResults(html, maxResults)

    if (results.length === 0) {
      if (response.status === 202) {
        return {
          error:
            'DuckDuckGo Lite fallback returned HTTP 202 Accepted without recognizable results; no DuckDuckGo information was retrieved. This does not mean the query has no matches.',
          query,
          reason: 'backend_unavailable',
        }
      }

      return {
        error: `DuckDuckGo Lite fallback completed but returned zero usable results for "${query}". This is a genuine zero-result outcome, not a blocked or unavailable backend.`,
        query,
        reason: 'zero_results',
      }
    }

    return { results, query, source: 'duckduckgo' }
  } catch (error) {
    return {
      error: `DuckDuckGo Lite fallback backend unavailable (${formatUnknownError(error)}); no DuckDuckGo information was retrieved`,
      query,
      reason: 'backend_unavailable',
    }
  }
}

async function searchWeb(
  params: WebSearchParams,
): Promise<WebSearchResponse | WebSearchError> {
  const { query } = params

  if (!query.trim()) {
    return { error: 'Search query cannot be empty', query }
  }

  const searxngResult = await searchSearxng(params)

  if (isSuccessfulSearch(searxngResult)) {
    return searxngResult
  }

  const duckDuckGoResult = await searchDuckDuckGoLite(params)

  if (isSuccessfulSearch(duckDuckGoResult)) {
    return duckDuckGoResult
  }

  const details = `${searxngResult.error}. ${duckDuckGoResult.error}`

  if (
    searxngResult.reason === 'zero_results' ||
    duckDuckGoResult.reason === 'zero_results'
  ) {
    return {
      error: `Web search completed without usable results from available sources. At least one backend completed the query and returned zero results; this is distinct from a blocked or unavailable backend. Details: ${details}`,
      query,
    }
  }

  return {
    error: `Web search failed because search backends were unavailable, blocked, or engine-limited. No information was retrieved; this says nothing about whether information exists, so do not fabricate results or claim the topic has no coverage. Details: ${details}`,
    query,
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
      return await searchWeb(params)
    },
  })
