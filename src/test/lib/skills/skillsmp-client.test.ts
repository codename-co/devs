/**
 * Tests for SkillsMP API Client
 *
 * Mocks fetchViaCorsProxy to test search behaviour, error handling, and
 * edge cases without hitting the real API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock fetchViaCorsProxy ──

const mockFetchViaCorsProxy = vi.fn()

vi.mock('@/lib/url', () => ({
  fetchViaCorsProxy: (...args: unknown[]) => mockFetchViaCorsProxy(...args),
}))

import {
  searchSkills,
  aiSearchSkills,
  SkillsmpError,
} from '@/lib/skills/skillsmp-client'

// Helpers

function fakeResponse(body: object, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

const MOCK_API_KEY = 'sk_live_test_123'

const MOCK_SKILL: object = {
  id: 'skill-1',
  name: 'test-skill',
  author: 'test-author',
  description: 'A test skill',
  githubUrl: 'https://github.com/test/skill/tree/main/.agent',
  skillUrl: 'https://skillsmp.com/skills/test-skill',
  stars: 100,
  updatedAt: 1700000000,
}

// ── Tests ──

describe('skillsmp-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── searchSkills ──

  describe('searchSkills', () => {
    it('should return results for a valid query', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({
          success: true,
          data: {
            skills: [MOCK_SKILL],
            pagination: { page: 1, limit: 20, total: 1, hasNext: false },
          },
        }),
      )

      const result = await searchSkills('python', MOCK_API_KEY)

      expect(result.success).toBe(true)
      expect(result.data.skills).toHaveLength(1)
      expect(result.data.skills[0].name).toBe('test-skill')
      expect(result.data.pagination.total).toBe(1)
    })

    it('should pass query as URL parameter', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({
          success: true,
          data: { skills: [], pagination: { page: 1, limit: 20, total: 0, hasNext: false } },
        }),
      )

      await searchSkills('machine learning', MOCK_API_KEY)

      const url = mockFetchViaCorsProxy.mock.calls[0][0] as string
      expect(url).toContain('q=machine+learning')
    })

    it('should pass pagination and sort options', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({
          success: true,
          data: { skills: [], pagination: { page: 2, limit: 10, total: 0, hasNext: false } },
        }),
      )

      await searchSkills('test', MOCK_API_KEY, {
        page: 2,
        limit: 10,
        sortBy: 'stars',
      })

      const url = mockFetchViaCorsProxy.mock.calls[0][0] as string
      expect(url).toContain('page=2')
      expect(url).toContain('limit=10')
      expect(url).toContain('sortBy=stars')
    })

    it('should clamp limit to 100', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({
          success: true,
          data: { skills: [], pagination: { page: 1, limit: 100, total: 0, hasNext: false } },
        }),
      )

      await searchSkills('test', MOCK_API_KEY, { limit: 200 })

      const url = mockFetchViaCorsProxy.mock.calls[0][0] as string
      expect(url).toContain('limit=100')
    })

    it('should return empty results for blank query without calling API', async () => {
      const result = await searchSkills('  ', MOCK_API_KEY)

      expect(result.success).toBe(true)
      expect(result.data.skills).toHaveLength(0)
      expect(mockFetchViaCorsProxy).not.toHaveBeenCalled()
    })

    it('should send Bearer auth header', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({
          success: true,
          data: { skills: [], pagination: { page: 1, limit: 20, total: 0, hasNext: false } },
        }),
      )

      await searchSkills('test', MOCK_API_KEY)
      
      const options = mockFetchViaCorsProxy.mock.calls[0][1] as Record<string, unknown>
      const headers = options.headers as Record<string, string>
      expect(headers.Authorization).toBe(`Bearer ${MOCK_API_KEY}`)
    })
  })

  // ── aiSearchSkills ──

  describe('aiSearchSkills', () => {
    it('should return results for a valid query', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({
          success: true,
          data: { skills: [MOCK_SKILL] },
        }),
      )

      const result = await aiSearchSkills('code review assistant', MOCK_API_KEY)

      expect(result.success).toBe(true)
      expect(result.data.skills).toHaveLength(1)
    })

    it('should use the ai-search endpoint', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({ success: true, data: { skills: [] } }),
      )

      await aiSearchSkills('test', MOCK_API_KEY)

      const url = mockFetchViaCorsProxy.mock.calls[0][0] as string
      expect(url).toContain('/skills/ai-search')
    })

    it('should return empty results for blank query', async () => {
      const result = await aiSearchSkills('', MOCK_API_KEY)
      expect(result.data.skills).toHaveLength(0)
      expect(mockFetchViaCorsProxy).not.toHaveBeenCalled()
    })
  })

  // ── Error handling ──

  describe('error handling', () => {
    it('should throw SkillsmpError on HTTP error', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({ error: 'Unauthorized' }, 401, 'Unauthorized'),
      )

      await expect(
        searchSkills('test', 'bad-key'),
      ).rejects.toThrow(SkillsmpError)
    })

    it('should include status in SkillsmpError', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({ error: 'Not Found' }, 404, 'Not Found'),
      )

      try {
        await searchSkills('test', MOCK_API_KEY)
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(SkillsmpError)
        expect((err as SkillsmpError).status).toBe(404)
      }
    })

    it('should throw on invalid JSON response', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('not json'),
      })

      await expect(
        searchSkills('test', MOCK_API_KEY),
      ).rejects.toThrow('Invalid JSON')
    })

    it('should throw on unsuccessful response (success: false)', async () => {
      mockFetchViaCorsProxy.mockResolvedValueOnce(
        fakeResponse({ success: false, error: 'Rate limited' }),
      )

      await expect(
        searchSkills('test', MOCK_API_KEY),
      ).rejects.toThrow('failure')
    })

    it('should throw SkillsmpError on network error', async () => {
      mockFetchViaCorsProxy.mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      )

      await expect(
        searchSkills('test', MOCK_API_KEY),
      ).rejects.toThrow(SkillsmpError)
    })
  })
})
