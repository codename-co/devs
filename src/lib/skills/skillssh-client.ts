/**
 * Skills.sh API Client
 *
 * Provides search access to the Skills.sh registry — the open Agent Skills
 * ecosystem by Vercel Labs. The API is unauthenticated and returns skill
 * metadata including install counts and GitHub source references.
 *
 * In development, requests are proxied through the Vite dev server
 * (`/api/skills-sh` → `https://skills.sh/api`) to avoid CORS issues.
 * In production, the same path is handled by the bridge server / Caddy.
 *
 * @module lib/skills/skillssh-client
 *
 * @see https://skills.sh
 * @see https://skills.sh/docs
 */

// ============================================================================
// Types
// ============================================================================

/** A single skill result from the Skills.sh search API. */
export interface SkillsShResult {
  /** Unique identifier (e.g. "owner/repo/skill-name") */
  id: string
  /** Skill identifier within the repo */
  skillId: string
  /** Display name of the skill */
  name: string
  /** Total install count */
  installs: number
  /** GitHub source in "owner/repo" format */
  source: string
}

/** Response from the Skills.sh search endpoint. */
export interface SkillsShSearchResponse {
  /** The original search query */
  query: string
  /** Type of search performed (e.g. "fuzzy") */
  searchType: string
  /** Array of matching skills */
  skills: SkillsShResult[]
}

/** Error thrown by the Skills.sh client. */
export class SkillsShError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message)
    this.name = 'SkillsShError'
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for the Skills.sh API, routed through our proxy to avoid CORS.
 *
 * Dev: Vite's oauthProxyPlugin rewrites `/api/skills/*` → `https://skills.sh/api/*`
 * Prod: The bridge server / Caddy handles the same rewrite.
 */
const SKILLSSH_PROXY_BASE = '/api/skills'
const DEFAULT_TIMEOUT_MS = 15_000

// ============================================================================
// Client
// ============================================================================

/**
 * Search the Skills.sh registry for agent skills.
 *
 * Uses fuzzy matching against skill names. No API key required.
 *
 * @example
 * ```ts
 * const results = await searchSkillsSh('react design')
 * results.skills.forEach(s => console.log(s.name, s.installs))
 * ```
 *
 * @param query - Search query string (min 1 character)
 * @returns Search results with skill metadata
 * @throws {SkillsShError} On network/parsing errors or non-2xx responses
 */
export async function searchSkillsSh(
  query: string,
): Promise<SkillsShSearchResponse> {
  if (!query.trim()) {
    return { query: '', searchType: 'fuzzy', skills: [] }
  }

  const params = new URLSearchParams({ q: query })
  const url = `${SKILLSSH_PROXY_BASE}/search?${params}`

  return request<SkillsShSearchResponse>(url)
}

/**
 * Build the full GitHub URL for a Skills.sh result.
 *
 * Skills.sh provides `source` (e.g. "vercel-labs/agent-skills") and `skillId`
 * (e.g. "web-design-guidelines"). Per the Agent Skills convention, skills live
 * under a `skills/` subdirectory in the repo:
 * `https://github.com/{source}/tree/main/skills/{skillId}`
 *
 * @param result - A skill from the search response
 * @returns GitHub URL to the skill directory
 */
export function getSkillsShGitHubUrl(result: SkillsShResult): string {
  return `https://github.com/${result.source}/tree/main/skills/${result.skillId}`
}

/**
 * Convert a Skills.sh result to a format compatible with SkillSearchResult
 * from the SkillsMP client, for unified handling in the UI.
 */
export function toUnifiedSkillResult(result: SkillsShResult): {
  id: string
  name: string
  author: string
  description: string
  githubUrl: string
  skillUrl: string
  stars: number
  updatedAt: number
} {
  const [owner] = result.source.split('/')
  return {
    id: result.id,
    name: result.name,
    author: owner || result.source,
    description: '', // Skills.sh API doesn't return descriptions
    githubUrl: getSkillsShGitHubUrl(result),
    skillUrl: `https://skills.sh/${result.id}`,
    stars: result.installs, // Map installs → stars for unified sorting
    updatedAt: 0, // Not provided by Skills.sh
  }
}

// ============================================================================
// Internal request helper
// ============================================================================

async function request<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    const text = await res.text()

    if (!res.ok) {
      throw new SkillsShError(
        `Skills.sh API returned ${res.status} ${res.statusText}`,
        res.status,
        text,
      )
    }

    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new SkillsShError(
        'Invalid JSON in Skills.sh response',
        res.status,
        text,
      )
    }

    return json as T
  } catch (err: unknown) {
    if (err instanceof SkillsShError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new SkillsShError(
        `Skills.sh request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
      )
    }
    throw new SkillsShError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    clearTimeout(timer)
  }
}
