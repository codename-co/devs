/**
 * Tests for Skills.sh API Client
 *
 * Mocks global fetch to test search behaviour, error handling, and
 * edge cases without hitting the real API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  searchSkillsSh,
  getSkillsShGitHubUrl,
  toUnifiedSkillResult,
  SkillsShError,
} from '@/lib/skills/skillssh-client'
import type { SkillsShResult } from '@/lib/skills/skillssh-client'

// ── Helpers ──

function fakeResponse(body: object | string, status = 200, statusText = 'OK') {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(text, { status, statusText })
}

const MOCK_SKILL: SkillsShResult = {
  id: 'vercel-labs/agent-skills/web-design-guidelines',
  skillId: 'web-design-guidelines',
  name: 'web-design-guidelines',
  installs: 137509,
  source: 'vercel-labs/agent-skills',
}

const MOCK_RESPONSE = {
  query: 'design',
  searchType: 'fuzzy',
  skills: [MOCK_SKILL],
}

// ── Tests ──

describe('skillssh-client', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // ── searchSkillsSh ──

  describe('searchSkillsSh', () => {
    it('should return results for a valid query', async () => {
      fetchSpy.mockResolvedValueOnce(fakeResponse(MOCK_RESPONSE))

      const result = await searchSkillsSh('design')

      expect(result.query).toBe('design')
      expect(result.searchType).toBe('fuzzy')
      expect(result.skills).toHaveLength(1)
      expect(result.skills[0].name).toBe('web-design-guidelines')
      expect(result.skills[0].installs).toBe(137509)
    })

    it('should pass query as URL parameter', async () => {
      fetchSpy.mockResolvedValueOnce(fakeResponse(MOCK_RESPONSE))

      await searchSkillsSh('machine learning')

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toContain('q=machine+learning')
    })

    it('should call the proxy endpoint', async () => {
      fetchSpy.mockResolvedValueOnce(fakeResponse(MOCK_RESPONSE))

      await searchSkillsSh('test')

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toMatch(/^\/api\/skills\/search\?/)
    })

    it('should set Accept: application/json header', async () => {
      fetchSpy.mockResolvedValueOnce(fakeResponse(MOCK_RESPONSE))

      await searchSkillsSh('test')

      const options = fetchSpy.mock.calls[0][1] as RequestInit
      expect((options.headers as Record<string, string>).Accept).toBe(
        'application/json',
      )
    })

    it('should return empty results for empty query', async () => {
      const result = await searchSkillsSh('')

      expect(result.skills).toEqual([])
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should return empty results for whitespace-only query', async () => {
      const result = await searchSkillsSh('   ')

      expect(result.skills).toEqual([])
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should throw SkillsShError on non-2xx response', async () => {
      fetchSpy.mockResolvedValueOnce(
        fakeResponse({ error: 'Bad Request' }, 400, 'Bad Request'),
      )

      await expect(searchSkillsSh('x')).rejects.toThrow(SkillsShError)
    })

    it('should include status code in non-2xx error', async () => {
      fetchSpy.mockResolvedValueOnce(
        fakeResponse({ error: 'Bad Request' }, 400, 'Bad Request'),
      )

      await expect(searchSkillsSh('x')).rejects.toThrow(/400/)
    })

    it('should throw SkillsShError on network error', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(searchSkillsSh('test')).rejects.toThrow(SkillsShError)
    })

    it('should include original message in network error', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(searchSkillsSh('test')).rejects.toThrow(/Failed to fetch/)
    })
  })

  // ── getSkillsShGitHubUrl ──

  describe('getSkillsShGitHubUrl', () => {
    it('should build correct GitHub URL from source and skillId', () => {
      const url = getSkillsShGitHubUrl(MOCK_SKILL)
      expect(url).toBe(
        'https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines',
      )
    })

    it('should handle different owners/repos', () => {
      const skill: SkillsShResult = {
        id: 'anthropics/skills/frontend-design',
        skillId: 'frontend-design',
        name: 'frontend-design',
        installs: 110659,
        source: 'anthropics/skills',
      }
      expect(getSkillsShGitHubUrl(skill)).toBe(
        'https://github.com/anthropics/skills/tree/main/skills/frontend-design',
      )
    })
  })

  // ── toUnifiedSkillResult ──

  describe('toUnifiedSkillResult', () => {
    it('should convert to unified format', () => {
      const unified = toUnifiedSkillResult(MOCK_SKILL)

      expect(unified.id).toBe(MOCK_SKILL.id)
      expect(unified.name).toBe(MOCK_SKILL.name)
      expect(unified.author).toBe('vercel-labs')
      expect(unified.githubUrl).toBe(
        'https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines',
      )
      expect(unified.skillUrl).toBe(
        'https://skills.sh/vercel-labs/agent-skills/web-design-guidelines',
      )
      expect(unified.stars).toBe(137509) // installs mapped to stars
    })

    it('should set description to empty string', () => {
      const unified = toUnifiedSkillResult(MOCK_SKILL)
      expect(unified.description).toBe('')
    })

    it('should set updatedAt to 0', () => {
      const unified = toUnifiedSkillResult(MOCK_SKILL)
      expect(unified.updatedAt).toBe(0)
    })
  })
})
