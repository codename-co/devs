/**
 * SkillsMP API Client
 *
 * Provides search access to the SkillsMP registry for discovering Agent Skills.
 * All requests are routed through the DEVS CORS proxy since SkillsMP doesn't
 * set CORS headers for browser requests.
 *
 * @module lib/skills/skillsmp-client
 *
 * @see https://skillsmp.com/docs/api
 */

import { fetchViaCorsProxy } from '@/lib/url'

// ============================================================================
// Types
// ============================================================================

/** A single skill result from the SkillsMP search API. */
export interface SkillSearchResult {
  /** Unique identifier on SkillsMP */
  id: string
  /** Skill name from SKILL.md frontmatter */
  name: string
  /** GitHub author / owner */
  author: string
  /** Short description of the skill */
  description: string
  /** GitHub directory URL (e.g. https://github.com/org/repo/tree/main/skill-name) */
  githubUrl: string
  /** SkillsMP page URL */
  skillUrl: string
  /** GitHub stars */
  stars: number
  /** Last updated timestamp (Unix seconds) */
  updatedAt: number
}

/** Pagination info from SkillsMP keyword search. */
export interface SkillsPagination {
  page: number
  limit: number
  total: number
  hasNext: boolean
}

/** Response from the keyword search endpoint. */
export interface SkillSearchResponse {
  success: boolean
  data: {
    skills: SkillSearchResult[]
    pagination: SkillsPagination
  }
}

/** Response from the AI semantic search endpoint. */
export interface SkillAISearchResponse {
  success: boolean
  data: {
    skills: SkillSearchResult[]
  }
}

/** Options for keyword search. */
export interface SkillSearchOptions {
  page?: number
  limit?: number
  sortBy?: 'stars' | 'recent'
}

/** Error thrown by the SkillsMP client. */
export class SkillsmpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message)
    this.name = 'SkillsmpError'
  }
}

// ============================================================================
// Constants
// ============================================================================

const SKILLSMP_BASE_URL = 'https://skillsmp.com/api/v1'
const DEFAULT_TIMEOUT_MS = 15_000

// ============================================================================
// Client
// ============================================================================

/**
 * Search the SkillsMP registry using keyword search.
 *
 * @param query - Search query string
 * @param apiKey - SkillsMP API key (Bearer token)
 * @param options - Pagination and sort options
 * @returns Search results with pagination
 */
export async function searchSkills(
  query: string,
  apiKey: string,
  options?: SkillSearchOptions,
): Promise<SkillSearchResponse> {
  if (!query.trim()) {
    return {
      success: true,
      data: { skills: [], pagination: { page: 1, limit: 20, total: 0, hasNext: false } },
    }
  }

  const params = new URLSearchParams({ q: query })
  if (options?.page != null) params.set('page', String(options.page))
  if (options?.limit != null)
    params.set('limit', String(Math.min(options.limit, 100)))
  if (options?.sortBy) params.set('sortBy', options.sortBy)

  const url = `${SKILLSMP_BASE_URL}/skills/search?${params}`
  return request<SkillSearchResponse>(url, apiKey)
}

/**
 * Search the SkillsMP registry using AI semantic search.
 *
 * @param query - Natural language description of what you're looking for
 * @param apiKey - SkillsMP API key (Bearer token)
 * @returns Semantically relevant results (no pagination)
 */
export async function aiSearchSkills(
  query: string,
  apiKey: string,
): Promise<SkillAISearchResponse> {
  if (!query.trim()) {
    return { success: true, data: { skills: [] } }
  }

  const params = new URLSearchParams({ q: query })
  const url = `${SKILLSMP_BASE_URL}/skills/ai-search?${params}`
  return request<SkillAISearchResponse>(url, apiKey)
}

// ============================================================================
// Internal request helper
// ============================================================================

async function request<T>(url: string, apiKey: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetchViaCorsProxy(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    const text = await res.text()

    if (!res.ok) {
      throw new SkillsmpError(
        `SkillsMP API returned ${res.status} ${res.statusText}`,
        res.status,
        text,
      )
    }

    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new SkillsmpError(
        'Invalid JSON in SkillsMP response',
        res.status,
        text,
      )
    }

    if (
      typeof json !== 'object' ||
      json === null ||
      !(json as Record<string, unknown>).success
    ) {
      throw new SkillsmpError(
        'SkillsMP API response indicates failure',
        res.status,
        text,
      )
    }

    return json as T
  } catch (err: unknown) {
    if (err instanceof SkillsmpError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new SkillsmpError(
        `SkillsMP request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
      )
    }
    throw new SkillsmpError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    clearTimeout(timer)
  }
}
