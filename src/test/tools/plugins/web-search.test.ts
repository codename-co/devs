/**
 * Web Search Tool Plugin Tests
 *
 * Tests for SearXNG primary search and DuckDuckGo Lite fallback parsing.
 *
 * @module test/tools/plugins/web-search.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { mockFetchViaCorsProxy, mockGetEffectiveSettings } = vi.hoisted(() => ({
  mockFetchViaCorsProxy: vi.fn(),
  mockGetEffectiveSettings: vi.fn(() => ({})),
}))

vi.mock('@/lib/url', () => ({
  fetchViaCorsProxy: (...args: unknown[]) => mockFetchViaCorsProxy(...args),
}))

vi.mock('@/stores/userStore', () => ({
  getEffectiveSettings: () => mockGetEffectiveSettings(),
}))

import {
  isDuckDuckGoChallengePage,
  parseDuckDuckGoLiteResults,
  webSearchPlugin,
} from '@/tools/plugins/web-search'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

function textResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as Response
}

const duckDuckGoLiteHtml = `
<!DOCTYPE html>
<html lang="en">
  <body>
    <center id="lite_wrapper">
      <table border="0">
        <tr>
          <td valign="top">1.&nbsp;</td>
          <td>
            <a rel="nofollow" class="result-link" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.timeanddate.com%2Fweather%2Ffrance%2Fparis&amp;rut=abc">
              Weather in Paris, Paris, France
            </a>
          </td>
        </tr>
        <tr>
          <td>&nbsp;</td>
          <td class="result-snippet">
            Current weather in Paris and forecast for today, tomorrow, and next 14 days.
          </td>
        </tr>
        <tr>
          <td>&nbsp;</td>
          <td><span class="link-text">www.timeanddate.com/weather/france/paris</span></td>
        </tr>
        <tr><td colspan="2">&nbsp;</td></tr>
        <tr>
          <td valign="top">2.&nbsp;</td>
          <td>
            <a rel="nofollow" class="result-link" href="/l/?uddg=https%3A%2F%2Fwww.accuweather.com%2Fen%2Ffr%2Fparis%2F623%2Fweather-forecast%2F623&amp;rut=def">
              Paris Weather Forecast &amp; Conditions
            </a>
          </td>
        </tr>
        <tr>
          <td>&nbsp;</td>
          <td class="result-snippet">
            Get the Paris local weather forecast including temperature, RealFeel, and chance of precipitation.
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>
`

const duckDuckGoChallengeHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>DuckDuckGo</title>
  </head>
  <body>
    <form id="challenge-form" action="/anomaly.js?sv=lite&cc=challenge" method="post">
      <p>Unfortunately, automated requests need to complete this challenge.</p>
      <input type="hidden" name="anomaly" value="challenge" />
    </form>
    <script src="/anomaly.js"></script>
  </body>
</html>
`

const duckDuckGoZeroResultsHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>DuckDuckGo</title>
  </head>
  <body>
    <center id="lite_wrapper">
      <form action="/lite/" method="get">
        <input name="q" value="unlikely search query" />
      </form>
      <table border="0">
        <tr>
          <td>No results found for unlikely search query.</td>
        </tr>
      </table>
    </center>
  </body>
</html>
`

describe('webSearchPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetEffectiveSettings.mockReturnValue({})
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('parseDuckDuckGoLiteResults', () => {
    it('parses result links, unwraps DuckDuckGo redirects, snippets, and maxResults', () => {
      const results = parseDuckDuckGoLiteResults(duckDuckGoLiteHtml, 1)

      expect(results).toEqual([
        {
          title: 'Weather in Paris, Paris, France',
          url: 'https://www.timeanddate.com/weather/france/paris',
          snippet:
            'Current weather in Paris and forecast for today, tomorrow, and next 14 days.',
        },
      ])
    })

    describe('isDuckDuckGoChallengePage', () => {
      it('returns true for a DuckDuckGo anomaly challenge page', () => {
        expect(isDuckDuckGoChallengePage(duckDuckGoChallengeHtml)).toBe(true)
      })

      it('returns false for a DuckDuckGo results page', () => {
        expect(isDuckDuckGoChallengePage(duckDuckGoLiteHtml)).toBe(false)
      })
    })

    it('decodes HTML entities and keeps all requested DDG results', () => {
      const results = parseDuckDuckGoLiteResults(duckDuckGoLiteHtml, 5)

      expect(results).toHaveLength(2)
      expect(results[1]).toEqual({
        title: 'Paris Weather Forecast & Conditions',
        url: 'https://www.accuweather.com/en/fr/paris/623/weather-forecast/623',
        snippet:
          'Get the Paris local weather forecast including temperature, RealFeel, and chance of precipitation.',
      })
    })
  })

  describe('handler', () => {
    it('returns SearXNG results without attempting the fallback on success', async () => {
      const fetchMock = vi.mocked(fetch)
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              title: 'DEVS',
              url: 'https://devs.new',
              content: 'Browser-native AI agents.',
            },
          ],
        }),
      )

      const result = await webSearchPlugin.handler(
        { query: 'devs', maxResults: 3 },
        {},
      )

      expect(result).toEqual({
        query: 'devs',
        source: 'searxng',
        results: [
          {
            title: 'DEVS',
            url: 'https://devs.new',
            snippet: 'Browser-native AI agents.',
          },
        ],
      })
      expect(mockFetchViaCorsProxy).not.toHaveBeenCalled()
    })

    it('falls back to DuckDuckGo Lite when SearXNG returns HTTP 500', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500))
      mockFetchViaCorsProxy.mockResolvedValueOnce(textResponse(duckDuckGoLiteHtml))

      const result = await webSearchPlugin.handler(
        { query: 'weather paris', maxResults: 1 },
        {},
      )

      expect(mockFetchViaCorsProxy).toHaveBeenCalledOnce()
      expect(mockFetchViaCorsProxy.mock.calls[0][0]).toContain(
        'https://lite.duckduckgo.com/lite/?',
      )
      expect(result).toEqual({
        query: 'weather paris',
        source: 'duckduckgo',
        results: [
          {
            title: 'Weather in Paris, Paris, France',
            url: 'https://www.timeanddate.com/weather/france/paris',
            snippet:
              'Current weather in Paris and forecast for today, tomorrow, and next 14 days.',
          },
        ],
      })
    })

    it('falls back to DuckDuckGo Lite when SearXNG returns an engine-level error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({ error: 'all engines failed' }),
      )
      mockFetchViaCorsProxy.mockResolvedValueOnce(textResponse(duckDuckGoLiteHtml))

      const result = await webSearchPlugin.handler(
        { query: 'weather paris', maxResults: 1 },
        {},
      )

      expect(mockFetchViaCorsProxy).toHaveBeenCalledOnce()
      expect(result).toMatchObject({
        query: 'weather paris',
        source: 'duckduckgo',
        results: [
          {
            title: 'Weather in Paris, Paris, France',
          },
        ],
      })
    })

    it('returns an informative WebSearchError when both sources fail', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'down' }, 503))
      mockFetchViaCorsProxy.mockRejectedValueOnce(
        new Error('CORS proxy error: 502'),
      )

      const result = await webSearchPlugin.handler(
        { query: 'weather paris' },
        {},
      )

      expect(result).toEqual({
        query: 'weather paris',
        error:
          'Web search failed because search backends were unavailable, blocked, or engine-limited. No information was retrieved; this says nothing about whether information exists, so do not fabricate results or claim the topic has no coverage. Details: SearXNG search backend unavailable (HTTP 503); no SearXNG information was retrieved, and DuckDuckGo Lite fallback was attempted. DuckDuckGo Lite fallback backend unavailable (CORS proxy error: 502); no DuckDuckGo information was retrieved',
      })
    })

    it('reports a DuckDuckGo HTTP 202 challenge as backend-unavailable with no information obtained', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'down' }, 503))
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        textResponse(duckDuckGoChallengeHtml, 202),
      )

      const result = await webSearchPlugin.handler(
        { query: 'current infrastructure topic' },
        {},
      )

      expect(result).toMatchObject({
        query: 'current infrastructure topic',
      })
      expect('error' in result ? result.error : '').toContain(
        'search backends were unavailable, blocked, or engine-limited',
      )
      expect('error' in result ? result.error : '').toContain(
        'No information was retrieved',
      )
      expect('error' in result ? result.error : '').toContain(
        'blocked by an automated-request challenge',
      )
      expect('error' in result ? result.error : '').not.toContain(
        'returned zero usable results',
      )
      expect('error' in result ? result.error : '').not.toContain(
        'no matches',
      )
    })

    it('keeps a genuine DuckDuckGo zero-result page distinct from a blocked backend', async () => {
      expect(isDuckDuckGoChallengePage(duckDuckGoZeroResultsHtml)).toBe(false)
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'down' }, 503))
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        textResponse(duckDuckGoZeroResultsHtml),
      )

      const result = await webSearchPlugin.handler(
        { query: 'unlikely search query' },
        {},
      )

      expect(result).toMatchObject({
        query: 'unlikely search query',
      })
      expect('error' in result ? result.error : '').toContain(
        'returned zero results',
      )
      expect('error' in result ? result.error : '').toContain(
        'genuine zero-result outcome',
      )
      expect('error' in result ? result.error : '').toContain(
        'distinct from a blocked or unavailable backend',
      )
      expect('error' in result ? result.error : '').not.toContain(
        'No information was retrieved',
      )
      expect('error' in result ? result.error : '').not.toContain(
        'blocked by an automated-request challenge',
      )
    })

    it('normalises configured SearXNG URLs ending in /search', async () => {
      mockGetEffectiveSettings.mockReturnValue({
        searxngInstanceUrl: 'https://search.example.test/search/',
      })
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          results: [{ title: 'Example', url: 'https://example.test' }],
        }),
      )

      await webSearchPlugin.handler({ query: 'example' }, {})

      const searxngUrl = vi.mocked(fetch).mock.calls[0][0] as string
      expect(searxngUrl).toMatch(/^https:\/\/search\.example\.test\/search\?/)
      expect(searxngUrl).not.toContain('/search/search')
    })

    it('returns the validation error for empty queries without network calls', async () => {
      const result = await webSearchPlugin.handler({ query: '   ' }, {})

      expect(result).toEqual({
        error: 'Search query cannot be empty',
        query: '   ',
      })
      expect(fetch).not.toHaveBeenCalled()
      expect(mockFetchViaCorsProxy).not.toHaveBeenCalled()
    })
  })
})
