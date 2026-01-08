/**
 * Knowledge Query Tool Executor
 *
 * Searches the user's knowledge base stored in Yjs/IndexedDB.
 * Returns relevant snippets from uploaded documents and synced files.
 */

import type { ToolExecutor } from '../tool-registry'
import { getKnowledgeMap } from '@/features/sync/lib/yjs-doc'
import type { KnowledgeItem } from '@/types'

export interface KnowledgeSearchResult {
  id: string
  name: string
  type: string | undefined
  snippet: string
  path: string
  score: number
}

/**
 * Extract a relevant snippet from content around matching terms
 */
function extractSnippet(
  content: string | undefined,
  queryTerms: string[],
  maxLength = 300,
): string {
  if (!content) return ''

  const contentLower = content.toLowerCase()

  // Find the first occurrence of any query term
  let bestIndex = -1
  let bestTerm = ''

  for (const term of queryTerms) {
    const index = contentLower.indexOf(term)
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index
      bestTerm = term
    }
  }

  if (bestIndex === -1) {
    // No term found, return beginning of content
    return (
      content.substring(0, maxLength) +
      (content.length > maxLength ? '...' : '')
    )
  }

  // Calculate snippet boundaries (try to center on the match)
  const halfLength = Math.floor(maxLength / 2)
  let start = Math.max(0, bestIndex - halfLength)
  let end = Math.min(content.length, bestIndex + bestTerm.length + halfLength)

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = content.indexOf(' ', start)
    if (spaceIndex !== -1 && spaceIndex < bestIndex) {
      start = spaceIndex + 1
    }
  }

  if (end < content.length) {
    const spaceIndex = content.lastIndexOf(' ', end)
    if (spaceIndex !== -1 && spaceIndex > bestIndex + bestTerm.length) {
      end = spaceIndex
    }
  }

  let snippet = content.substring(start, end)

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  return snippet
}

/**
 * Calculate relevance score for a knowledge item
 */
function calculateScore(item: KnowledgeItem, queryTerms: string[]): number {
  let score = 0
  const searchText = [
    item.name,
    item.content || '',
    item.description || '',
    ...(item.tags || []),
  ]
    .join(' ')
    .toLowerCase()

  for (const term of queryTerms) {
    // Exact matches in name get highest score
    if (item.name.toLowerCase().includes(term)) {
      score += 10
    }

    // Matches in content
    const contentMatches = (searchText.match(new RegExp(term, 'gi')) || [])
      .length
    score += contentMatches

    // Tags are valuable
    if (item.tags?.some((tag) => tag.toLowerCase().includes(term))) {
      score += 5
    }
  }

  return score
}

/**
 * Search the knowledge base
 */
export async function executeKnowledgeQuery(
  query: string,
  filters?: { fileType?: string; tags?: string[] },
  limit: number = 10,
): Promise<KnowledgeSearchResult[]> {
  const knowledgeMap = getKnowledgeMap()
  const items: KnowledgeItem[] = []

  // Convert Y.Map to array
  knowledgeMap.forEach((item) => {
    items.push(item)
  })

  if (items.length === 0) {
    return []
  }

  const queryLower = query.toLowerCase()
  const queryTerms = queryLower.split(/\s+/).filter((term) => term.length > 2) // Skip very short words

  const scored = items
    .filter((item) => {
      // Apply filters
      if (filters?.fileType && item.fileType !== filters.fileType) return false
      if (
        filters?.tags?.length &&
        !filters.tags.some((t) => item.tags?.includes(t))
      )
        return false
      return true
    })
    .map((item) => {
      const score = calculateScore(item, queryTerms)
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ item, score }) => ({
    id: item.id,
    name: item.name,
    type: item.fileType,
    snippet: extractSnippet(item.content, queryTerms),
    path: item.path,
    score,
  }))
}

/**
 * Format search results for LLM consumption
 */
function formatKnowledgeResults(
  results: KnowledgeSearchResult[],
  query: string,
): string {
  if (results.length === 0) {
    return `No results found in the knowledge base for "${query}".`
  }

  const formatted = results.map((r, i) => {
    const typeLabel = r.type ? ` (${r.type})` : ''
    return `${i + 1}. **${r.name}**${typeLabel}
   Path: ${r.path}
   ${r.snippet}`
  })

  return `## Knowledge Base Results for "${query}"

Found ${results.length} matching items:

${formatted.join('\n\n')}`
}

/**
 * Knowledge query tool executor
 */
export const knowledgeQueryExecutor: ToolExecutor = async (args, _context) => {
  const {
    query,
    filters,
    limit = 10,
  } = args as {
    query: string
    filters?: { fileType?: string; tags?: string[] }
    limit?: number
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
    const results = await executeKnowledgeQuery(
      query,
      filters,
      Math.min(limit, 20),
    )

    const formattedResults = formatKnowledgeResults(results, query)

    return {
      success: true,
      content: formattedResults,
      metadata: {
        source: 'knowledge-base',
        resultCount: results.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: {
        code: 'KNOWLEDGE_QUERY_ERROR',
        message:
          error instanceof Error ? error.message : 'Knowledge query failed',
      },
    }
  }
}

/**
 * Get a summary of the knowledge base contents
 */
export async function getKnowledgeBaseSummary(): Promise<{
  totalItems: number
  byType: Record<string, number>
  recentItems: Array<{ name: string; path: string; lastModified: Date }>
}> {
  const knowledgeMap = getKnowledgeMap()
  const items: KnowledgeItem[] = []

  knowledgeMap.forEach((item) => {
    items.push(item)
  })

  const byType: Record<string, number> = {}
  for (const item of items) {
    const type = item.fileType || 'unknown'
    byType[type] = (byType[type] || 0) + 1
  }

  const recentItems = items
    .sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    )
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      path: item.path,
      lastModified: item.lastModified,
    }))

  return {
    totalItems: items.length,
    byType,
    recentItems,
  }
}
