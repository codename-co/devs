import { db } from '@/lib/db'
import {
  getAvailableMethodologies,
  getMethodologyById,
} from '@/stores/methodologiesStore'
import { getAvailableAgents, getAgentById } from '@/stores/agentStore'

export type SearchResultType =
  | 'agent'
  | 'conversation'
  | 'task'
  | 'file'
  | 'memory'
  | 'message'
  | 'methodology'
  | 'connector'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  icon: string
  color: string
  href: string
  score: number
  timestamp?: Date
  // For message results, store parent conversation id
  parentId?: string
}

/**
 * Configuration for search result limits and scoring
 */
const SEARCH_CONFIG = {
  MAX_RESULTS: 20,
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_MS: 200,
  SCORE_WEIGHTS: {
    titleMatch: 10,
    exactMatch: 15,
    startsWith: 8,
    contentMatch: 3,
    recency: 5,
  },
}

/**
 * Color mappings for each search result type
 */
const TYPE_COLORS: Record<SearchResultType, string> = {
  agent: 'warning',
  conversation: 'default',
  task: 'secondary',
  file: 'primary',
  memory: 'success',
  message: 'default',
  methodology: 'success',
  connector: 'primary',
}

/**
 * Icon mappings for each search result type
 */
const TYPE_ICONS: Record<SearchResultType, string> = {
  agent: 'Sparks',
  conversation: 'ChatBubble',
  task: 'TriangleFlagTwoStripes',
  file: 'Folder',
  memory: 'Brain',
  message: 'ChatLines',
  methodology: 'Strategy',
  connector: 'Puzzle',
}

/**
 * Normalize text by removing diacritics/accents for search matching
 * e.g., "café" → "cafe", "résumé" → "resume", "naïve" → "naive"
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Calculate search score based on query matches (diacritic-insensitive)
 */
function calculateScore(
  query: string,
  texts: string[],
  baseScore: number = 0,
  timestamp?: Date,
): number {
  const normalizedQuery = normalizeText(query)
  let score = baseScore

  for (const text of texts) {
    if (!text) continue
    const normalizedText = normalizeText(text)

    // Exact match bonus
    if (normalizedText === normalizedQuery) {
      score += SEARCH_CONFIG.SCORE_WEIGHTS.exactMatch
    }
    // Starts with bonus
    else if (normalizedText.startsWith(normalizedQuery)) {
      score += SEARCH_CONFIG.SCORE_WEIGHTS.startsWith
    }
    // Title/primary field match
    else if (normalizedText.includes(normalizedQuery)) {
      score += SEARCH_CONFIG.SCORE_WEIGHTS.titleMatch
    }
  }

  // Recency bonus (items from last 7 days get bonus)
  if (timestamp) {
    const daysSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) {
      score += SEARCH_CONFIG.SCORE_WEIGHTS.recency * (1 - daysSince / 7)
    }
  }

  return score
}

/**
 * Check if text matches query (diacritic-insensitive)
 */
function matchesQuery(query: string, texts: string[]): boolean {
  const normalizedQuery = normalizeText(query)
  return texts.some((text) =>
    normalizeText(text || '').includes(normalizedQuery),
  )
}

/**
 * Index and search agents
 */
async function searchAgents(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    // Get built-in agents from cache
    const agentIds = await getAvailableAgents()
    for (const id of agentIds) {
      const agent = await getAgentById(id)
      if (!agent) continue

      const texts = [
        agent.name,
        agent.role,
        agent.desc || '',
        ...(agent.tags || []),
      ]
      if (matchesQuery(query, texts)) {
        results.push({
          id: agent.id,
          type: 'agent',
          title: agent.name,
          subtitle: agent.role,
          icon: TYPE_ICONS.agent,
          color: TYPE_COLORS.agent,
          href: `/agents/run#${agent.slug}`,
          score: calculateScore(query, texts, 5), // Base score for agents
          timestamp: agent.createdAt,
        })
      }
    }

    // Get custom agents from IndexedDB
    if (db.isInitialized() && db.hasStore('agents')) {
      const customAgents = await db.getAll('agents')
      for (const agent of customAgents) {
        // Skip if already found in built-in
        if (results.some((r) => r.id === agent.id)) continue

        const texts = [
          agent.name,
          agent.role,
          agent.desc || '',
          ...(agent.tags || []),
        ]
        if (matchesQuery(query, texts)) {
          results.push({
            id: agent.id,
            type: 'agent',
            title: agent.name,
            subtitle: agent.role,
            icon: TYPE_ICONS.agent,
            color: TYPE_COLORS.agent,
            href: `/agents/run#${agent.slug}`,
            score: calculateScore(query, texts, 5),
            timestamp: agent.createdAt,
          })
        }
      }
    }
  } catch (error) {
    console.warn('Failed to search agents:', error)
  }

  return results
}

/**
 * Index and search conversations
 */
async function searchConversations(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    if (!db.isInitialized()) await db.init()
    if (!db.hasStore('conversations')) return results

    const conversations = await db.getAll('conversations')
    for (const conv of conversations) {
      const texts = [conv.title || '', conv.summary || '']
      if (matchesQuery(query, texts)) {
        // Use stored agentSlug, fallback to looking up agent, then to agentId
        let agentSlug = conv.agentSlug
        if (!agentSlug) {
          const agent = await getAgentById(conv.agentId)
          agentSlug = agent?.slug || conv.agentId
        }

        results.push({
          id: conv.id,
          type: 'conversation',
          title: conv.title || 'Untitled conversation',
          subtitle: conv.summary?.slice(0, 100),
          icon: TYPE_ICONS.conversation,
          color: TYPE_COLORS.conversation,
          href: `/agents/run#${agentSlug}/${conv.id}`,
          score: calculateScore(query, texts, 3),
          timestamp: conv.updatedAt,
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search conversations:', error)
  }

  return results
}

/**
 * Index and search messages within conversations
 */
async function searchMessages(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    if (!db.isInitialized()) await db.init()
    if (!db.hasStore('conversations')) return results

    const conversations = await db.getAll('conversations')
    for (const conv of conversations) {
      // Use stored agentSlug, fallback to looking up agent, then to agentId
      let agentSlug = conv.agentSlug
      if (!agentSlug) {
        const agent = await getAgentById(conv.agentId)
        agentSlug = agent?.slug || conv.agentId
      }

      for (const msg of conv.messages) {
        if (msg.role === 'system') continue // Skip system messages

        const texts = [msg.content]
        if (matchesQuery(query, texts)) {
          results.push({
            id: msg.id,
            type: 'message',
            title:
              msg.content.slice(0, 80) + (msg.content.length > 80 ? '...' : ''),
            subtitle: `In: ${conv.title || 'Conversation'}`,
            icon: TYPE_ICONS.message,
            color: TYPE_COLORS.message,
            href: `/agents/run#${agentSlug}/${conv.id}`,
            score: calculateScore(query, texts, 1),
            timestamp: msg.timestamp,
            parentId: conv.id,
          })
        }
      }
    }
  } catch (error) {
    console.warn('Failed to search messages:', error)
  }

  return results
}

/**
 * Index and search tasks
 */
async function searchTasks(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    if (!db.isInitialized()) await db.init()
    if (!db.hasStore('tasks')) return results

    const tasks = await db.getAll('tasks')
    for (const task of tasks) {
      const texts = [task.title, task.description]
      if (matchesQuery(query, texts)) {
        results.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: `${task.status} · ${task.complexity}`,
          icon: TYPE_ICONS.task,
          color: TYPE_COLORS.task,
          href: `/tasks/${task.id}`,
          score: calculateScore(query, texts, 4),
          timestamp: task.updatedAt,
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search tasks:', error)
  }

  return results
}

/**
 * Index and search knowledge files
 */
async function searchFiles(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    if (!db.isInitialized()) await db.init()
    if (!db.hasStore('knowledgeItems')) return results

    const items = await db.getAll('knowledgeItems')
    for (const item of items) {
      const texts = [
        item.name,
        item.description || '',
        item.path,
        ...(item.tags || []),
      ]
      if (matchesQuery(query, texts)) {
        results.push({
          id: item.id,
          type: 'file',
          title: item.name,
          subtitle: item.path,
          icon: item.type === 'folder' ? 'Folder' : 'Document',
          color: TYPE_COLORS.file,
          href: `/knowledge/files#${item.id}`,
          score: calculateScore(query, texts, 2),
          timestamp: item.lastModified,
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search files:', error)
  }

  return results
}

/**
 * Index and search agent memories
 */
async function searchMemories(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    if (!db.isInitialized()) await db.init()
    if (!db.hasStore('agentMemories')) return results

    const memories = await db.getAll('agentMemories')
    for (const memory of memories) {
      const texts = [
        memory.title,
        memory.content,
        ...(memory.keywords || []),
        ...(memory.tags || []),
      ]
      if (matchesQuery(query, texts)) {
        results.push({
          id: memory.id,
          type: 'memory',
          title: memory.title,
          subtitle: `${memory.category} · ${memory.confidence}`,
          icon: TYPE_ICONS.memory,
          color: TYPE_COLORS.memory,
          href: `/knowledge/memories#${memory.id}`,
          score: calculateScore(query, texts, 2),
          timestamp: memory.learnedAt,
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search memories:', error)
  }

  return results
}

/**
 * Index and search methodologies (i18n-aware)
 * Searches across all localizations but displays in user's locale
 */
async function searchMethodologies(
  query: string,
  lang: string = 'en',
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    const methodologyIds = await getAvailableMethodologies()
    for (const id of methodologyIds) {
      const methodology = await getMethodologyById(id)
      if (!methodology) continue

      const { metadata } = methodology
      const i18n = metadata.i18n || {}

      // Build searchable text array including all relevant fields AND all localizations
      const texts = [
        // Base (English) content
        metadata.name,
        metadata.title || '',
        metadata.description || '',
        metadata.origin || '',
        ...(metadata.tags || []),
        ...(metadata.domains || []),
        // All localized content (search in all languages)
        ...Object.values(i18n).flatMap((loc) => [
          loc.name || '',
          loc.title || '',
          loc.description || '',
        ]),
      ]

      if (matchesQuery(query, texts)) {
        // Get localized display values (fallback to base)
        const localized = i18n[lang] || {}
        const displayTitle =
          localized.title || localized.name || metadata.title || metadata.name
        const displayDescription = localized.description || metadata.description

        results.push({
          id: metadata.id,
          type: 'methodology',
          title: displayTitle,
          subtitle: displayDescription?.slice(0, 100),
          icon: TYPE_ICONS.methodology,
          color: TYPE_COLORS.methodology,
          href: `/methodologies/${metadata.id}`,
          score: calculateScore(query, texts, 3),
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search methodologies:', error)
  }

  return results
}

/**
 * Index and search connectors
 */
async function searchConnectors(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    if (!db.isInitialized()) await db.init()
    if (!db.hasStore('connectors')) return results

    const connectors = await db.getAll('connectors')
    for (const connector of connectors) {
      const texts = [connector.name, connector.provider, connector.category]
      if (matchesQuery(query, texts)) {
        results.push({
          id: connector.id,
          type: 'connector',
          title: connector.name,
          subtitle: `${connector.provider} · ${connector.status}`,
          icon: TYPE_ICONS.connector,
          color: TYPE_COLORS.connector,
          href: `/knowledge/connectors#${connector.id}`,
          score: calculateScore(query, texts, 2),
          timestamp: connector.createdAt,
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search connectors:', error)
  }

  return results
}

/**
 * Main search function that searches across all indexed entities
 * @param query - The search query
 * @param lang - The user's current language for localized display (default: 'en')
 */
export async function globalSearch(
  query: string,
  lang: string = 'en',
): Promise<SearchResult[]> {
  if (!query || query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
    return []
  }

  // Run all searches in parallel
  const [
    agents,
    conversations,
    messages,
    tasks,
    files,
    memories,
    methodologies,
    connectors,
  ] = await Promise.all([
    searchAgents(query),
    searchConversations(query),
    searchMessages(query),
    searchTasks(query),
    searchFiles(query),
    searchMemories(query),
    searchMethodologies(query, lang),
    searchConnectors(query),
  ])

  // Combine and sort by score
  const allResults = [
    ...agents,
    ...conversations,
    ...messages,
    ...tasks,
    ...files,
    ...memories,
    ...methodologies,
    ...connectors,
  ]

  // Sort by score descending, then by recency
  allResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // If scores are equal, sort by recency
    // Handle both Date objects and ISO strings (from JSON serialization)
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return bTime - aTime
  })

  // Limit results
  return allResults.slice(0, SEARCH_CONFIG.MAX_RESULTS)
}

/**
 * Get icon name for a result type
 */
export function getResultIcon(type: SearchResultType): string {
  return TYPE_ICONS[type]
}

/**
 * Get color for a result type
 */
export function getResultColor(type: SearchResultType): string {
  return TYPE_COLORS[type]
}

/**
 * Debounce helper for search input
 */
export function createDebouncedSearch(
  callback: (query: string) => void,
  delay: number = SEARCH_CONFIG.DEBOUNCE_MS,
): (query: string) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (query: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      callback(query)
    }, delay)
  }
}
