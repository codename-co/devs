import {
  agents as agentsMap,
  conversations as conversationsMap,
  knowledge as knowledgeMap,
  tasks as tasksMap,
  memories as memoriesMap,
  studioEntries as studioEntriesMap,
  connectors as connectorsMap,
} from '@/lib/yjs'
import {
  decryptFields,
  CONVERSATION_ENCRYPTED_FIELDS,
  MESSAGE_ENCRYPTED_FIELDS,
  MEMORY_ENCRYPTED_FIELDS,
  KNOWLEDGE_ENCRYPTED_FIELDS,
} from '@/lib/crypto/content-encryption'
import {
  getAvailableMethodologies,
  getMethodologyById,
} from '@/stores/methodologiesStore'
import { getAvailableAgents, getAgentById } from '@/stores/agentStore'
import { locales } from '@/i18n'
import { IconName } from '@/lib/types'

export type SearchResultType =
  | 'agent'
  | 'conversation'
  | 'task'
  | 'file'
  | 'memory'
  | 'message'
  | 'methodology'
  | 'connector'
  | 'media'
  | 'page'

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
  media: 'secondary',
  page: 'default',
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
  page: 'OpenNewWindow',
  media: 'MediaImage',
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
 * Safely convert a value to a string, returning '' for encrypted fields or non-string values.
 * Prevents {ct, iv} encrypted objects from being used as text.
 */
function safeStr(value: unknown): string {
  if (typeof value === 'string') return value
  return ''
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
          href: `/agents/run/${agent.slug}`,
          score: calculateScore(query, texts, 5), // Base score for agents
          timestamp: agent.createdAt,
        })
      }
    }

    // Get custom agents from Yjs map
    const customAgents = Array.from(agentsMap.values())
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
          href: `/agents/run/${agent.slug}`,
          score: calculateScore(query, texts, 5),
          timestamp: agent.createdAt,
        })
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
    const allConversations = Array.from(conversationsMap.values())
    // Decrypt conversation metadata (title, summary) for searching
    const decryptedConversations = await Promise.all(
      allConversations.map((conv) =>
        decryptFields(conv, [...CONVERSATION_ENCRYPTED_FIELDS]),
      ),
    )
    for (const conv of decryptedConversations) {
      const title = safeStr(conv.title)
      const summary = safeStr(conv.summary)
      const texts = [title, summary]
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
          title: title || 'Untitled conversation',
          subtitle: summary?.slice(0, 100),
          icon: TYPE_ICONS.conversation,
          color: TYPE_COLORS.conversation,
          href: `/agents/run/${agentSlug}/${conv.id}`,
          score: calculateScore(query, texts, 3),
          timestamp: conv.updatedAt ? new Date(conv.updatedAt) : undefined,
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
    const allConversations = Array.from(conversationsMap.values())
    // Decrypt conversation metadata for display in subtitles
    const decryptedConversations = await Promise.all(
      allConversations.map(async (conv) => {
        const decryptedConv = await decryptFields(conv, [
          ...CONVERSATION_ENCRYPTED_FIELDS,
        ])
        // Also decrypt message content
        const decryptedMessages = await Promise.all(
          conv.messages.map((msg) =>
            decryptFields(msg, [...MESSAGE_ENCRYPTED_FIELDS]),
          ),
        )
        return { ...decryptedConv, messages: decryptedMessages }
      }),
    )
    for (const conv of decryptedConversations) {
      // Use stored agentSlug, fallback to looking up agent, then to agentId
      let agentSlug = conv.agentSlug
      if (!agentSlug) {
        const agent = await getAgentById(conv.agentId)
        agentSlug = agent?.slug || conv.agentId
      }

      const convTitle = safeStr(conv.title)

      for (const msg of conv.messages) {
        if (msg.role === 'system') continue // Skip system messages

        const content = safeStr(msg.content)
        if (!content) continue
        const texts = [content]
        if (matchesQuery(query, texts)) {
          results.push({
            id: msg.id,
            type: 'message',
            title: content.slice(0, 80) + (content.length > 80 ? '...' : ''),
            subtitle: `In: ${convTitle || 'Conversation'}`,
            icon: TYPE_ICONS.message,
            color: TYPE_COLORS.message,
            href: `/agents/run/${agentSlug}/${conv.id}`,
            score: calculateScore(query, texts, 1),
            timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
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
    const allTasks = Array.from(tasksMap.values())
    for (const task of allTasks) {
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
    const items = Array.from(knowledgeMap.values())
    // Decrypt knowledge item fields (name, description, content)
    const decryptedItems = await Promise.all(
      items.map((item) => decryptFields(item, [...KNOWLEDGE_ENCRYPTED_FIELDS])),
    )
    for (const item of decryptedItems) {
      const name = safeStr(item.name)
      const description = safeStr(item.description)
      const texts = [
        name,
        description,
        safeStr(item.path),
        ...(item.tags || []),
      ]
      if (matchesQuery(query, texts)) {
        results.push({
          id: item.id,
          type: 'file',
          title: name,
          subtitle: safeStr(item.path),
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
    const allMemories = Array.from(memoriesMap.values())
    // Decrypt memory fields (title, content)
    const decryptedMemories = await Promise.all(
      allMemories.map((memory) =>
        decryptFields(memory, [...MEMORY_ENCRYPTED_FIELDS]),
      ),
    )
    for (const memory of decryptedMemories) {
      const title = safeStr(memory.title)
      const content = safeStr(memory.content)
      const texts = [
        title,
        content,
        ...(memory.keywords || []),
        ...(memory.tags || []),
      ]
      if (matchesQuery(query, texts)) {
        results.push({
          id: memory.id,
          type: 'memory',
          title: title,
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
    const allConnectors = Array.from(connectorsMap.values())
    for (const connector of allConnectors) {
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
 * Index and search studio media (generated images)
 */
async function searchMedia(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    const entries = Array.from(studioEntriesMap.values())
    for (const entry of entries) {
      const texts = [
        entry.prompt,
        ...(entry.tags || []),
        entry.settings?.style || '',
      ]
      if (matchesQuery(query, texts)) {
        // Truncate prompt for display
        const displayPrompt =
          entry.prompt.length > 60
            ? entry.prompt.slice(0, 60) + '...'
            : entry.prompt
        const imageCount = entry.images?.length || 0
        const subtitle = `${imageCount} image${imageCount !== 1 ? 's' : ''}${entry.settings?.style && entry.settings.style !== 'none' ? ` · ${entry.settings.style}` : ''}`

        results.push({
          id: entry.id,
          type: 'media',
          title: displayPrompt,
          subtitle,
          icon: TYPE_ICONS.media,
          color: TYPE_COLORS.media,
          href: `/studio#${entry.id}`,
          score: calculateScore(query, texts, 2),
          timestamp: entry.createdAt,
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search media:', error)
  }

  return results
}

/**
 * Page definitions for search
 * Each page has localized titles and descriptions that are searched across all languages
 */
interface PageDefinition {
  id: string
  href: string
  icon: IconName
  /** Color class for the icon */
  color: string
  /** i18n keys for name in each locale */
  nameKey: string
  /** i18n keys for description in each locale */
  descriptionKey?: string
  /** Additional keywords for matching */
  keywords?: string[]
}

const SEARCHABLE_PAGES: PageDefinition[] = [
  {
    id: 'new-conversation',
    href: '',
    icon: 'ChatPlusIn',
    color: 'primary',
    nameKey: 'Chat',
    keywords: ['chat', 'start', 'begin', 'create', 'new', 'conversation'],
  },
  {
    id: 'page-agents',
    href: '/agents',
    icon: 'Sparks',
    color: 'warning',
    nameKey: 'Agents',
    descriptionKey: 'Create and manage your AI specialists',
    keywords: ['ai', 'bot', 'assistant', 'specialist'],
  },
  {
    id: 'page-studio',
    href: '/studio',
    icon: 'MediaImagePlus',
    color: 'danger',
    nameKey: 'Studio',
    keywords: ['image', 'generate', 'create', 'art', 'picture', 'photo'],
  },
  {
    id: 'page-voice',
    href: '/live',
    icon: 'Voice',
    color: 'primary',
    nameKey: 'Live',
    descriptionKey: 'Voice input mode',
    keywords: ['speak', 'talk', 'audio', 'microphone', 'dictate'],
  },
  {
    id: 'page-tasks',
    href: '/tasks',
    icon: 'TriangleFlagTwoStripes',
    color: 'secondary',
    nameKey: 'Tasks',
    keywords: ['todo', 'work', 'project', 'assignment'],
  },
  {
    id: 'page-knowledge',
    href: '/knowledge',
    icon: 'Book',
    color: 'primary',
    nameKey: 'Knowledge',
    descriptionKey: 'Files',
    keywords: ['file', 'document', 'upload', 'storage', 'data'],
  },
  {
    id: 'page-methodologies',
    href: '/methodologies',
    icon: 'Strategy',
    color: 'success',
    nameKey: 'Methodologies',
    keywords: ['workflow', 'process', 'framework', 'method'],
  },
  {
    id: 'page-arena',
    href: '/arena',
    icon: 'Crown',
    color: 'warning',
    nameKey: 'Arena',
    descriptionKey: 'Battle Arena',
    keywords: ['battle', 'competition', 'debate', 'versus', 'vs'],
  },
  {
    id: 'page-conversations',
    href: '/conversations',
    icon: 'ChatBubble',
    color: 'default',
    nameKey: 'Conversations',
    descriptionKey: 'Conversations history',
    keywords: ['chat', 'history', 'messages'],
  },
  {
    id: 'page-settings',
    href: '/#settings',
    icon: 'Settings',
    color: 'default',
    nameKey: 'Settings',
    descriptionKey: 'Settings',
    keywords: ['config', 'preferences', 'options', 'llm', 'api', 'key'],
  },
  {
    id: 'page-traces',
    href: '/#settings/traces',
    icon: 'Activity',
    color: 'default',
    nameKey: 'Traces',
    keywords: ['logs', 'analytics', 'monitoring', 'debug', 'performance'],
  },
  {
    id: 'page-connectors',
    href: '/knowledge/connectors',
    icon: 'Puzzle',
    color: 'primary',
    nameKey: 'Connectors',
    descriptionKey: 'Connect external services',
    keywords: ['google', 'drive', 'gmail', 'notion', 'integration', 'sync'],
  },
  {
    id: 'page-privacy',
    href: '/privacy',
    icon: 'Lock',
    color: 'default',
    nameKey: 'Privacy',
    keywords: ['policy', 'data', 'security'],
  },
  {
    id: 'page-terms',
    href: '/terms',
    icon: 'Page',
    color: 'default',
    nameKey: 'Terms',
    keywords: ['conditions', 'legal', 'agreement', 'tos'],
  },
  {
    id: 'page-sync',
    href: '/sync',
    icon: 'RefreshDouble',
    color: 'success',
    nameKey: 'Sync',
    keywords: ['backup', 'p2p', 'synchronization', 'devices'],
  },
]

/**
 * Index and search pages (i18n-aware)
 * Searches across all localizations but displays in user's locale
 */
async function searchPages(
  query: string,
  lang: string = 'en',
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    for (const page of SEARCHABLE_PAGES) {
      // Collect searchable text from all locales
      const texts: string[] = []

      // Add keywords (ensure they're strings)
      if (page.keywords) {
        for (const kw of page.keywords) {
          if (typeof kw === 'string') texts.push(kw)
        }
      }

      // Always add English keys directly (these are the i18n keys themselves)
      texts.push(page.nameKey)
      if (page.descriptionKey) texts.push(page.descriptionKey)

      // Add translations from all locales
      for (const localeKey of Object.keys(locales)) {
        const locale = locales[localeKey as keyof typeof locales]
        // English locale is an array, other locales are objects
        if (locale && typeof locale === 'object' && !Array.isArray(locale)) {
          // Get the name in this locale
          const name = (locale as Record<string, string>)[page.nameKey]
          if (typeof name === 'string') texts.push(name)

          // Get the description in this locale
          if (page.descriptionKey) {
            const desc = (locale as Record<string, string>)[page.descriptionKey]
            if (typeof desc === 'string') texts.push(desc)
          }
        }
      }

      if (matchesQuery(query, texts)) {
        // Get localized display values
        const locale = locales[lang as keyof typeof locales]
        const displayTitle =
          locale && typeof locale === 'object' && !Array.isArray(locale)
            ? (locale as Record<string, string>)[page.nameKey] || page.nameKey
            : page.nameKey
        const displayDescription =
          page.descriptionKey &&
          locale &&
          typeof locale === 'object' &&
          !Array.isArray(locale)
            ? (locale as Record<string, string>)[page.descriptionKey]
            : page.descriptionKey

        results.push({
          id: page.id,
          type: 'page',
          title: displayTitle,
          subtitle: displayDescription,
          icon: page.icon,
          color: page.color,
          href: page.href,
          score: calculateScore(query, texts, 8), // Higher base score for pages
        })
      }
    }
  } catch (error) {
    console.warn('Failed to search pages:', error)
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
    media,
    pages,
  ] = await Promise.all([
    searchAgents(query),
    searchConversations(query),
    searchMessages(query),
    searchTasks(query),
    searchFiles(query),
    searchMemories(query),
    searchMethodologies(query, lang),
    searchConnectors(query),
    searchMedia(query),
    searchPages(query, lang),
  ])

  // Combine and sort by score
  const allResults = [
    ...pages, // Pages first for quick navigation
    ...agents,
    ...conversations,
    ...messages,
    ...tasks,
    ...files,
    ...memories,
    ...methodologies,
    ...connectors,
    ...media,
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

/**
 * Check if there are any searchable items (user-generated content)
 * Returns true if there are conversations, tasks, files, memories, connectors, or media
 */
export async function hasSearchableItems(): Promise<boolean> {
  try {
    // Check for any user-generated content in Yjs maps
    if (conversationsMap.size > 0) return true
    if (tasksMap.size > 0) return true
    if (knowledgeMap.size > 0) return true
    if (memoriesMap.size > 0) return true
    if (connectorsMap.size > 0) return true
    if (studioEntriesMap.size > 0) return true
    if (agentsMap.size > 0) return true

    return false
  } catch (error) {
    console.warn('Failed to check for searchable items:', error)
    return false
  }
}
