/**
 * Memory Serializer
 *
 * Serialize/deserialize AgentMemoryEntry entities to Markdown with YAML frontmatter
 *
 * Format:
 * ```
 * ---
 * id: mem-xyz789
 * agentId: einstein
 * category: preference
 * title: Visualization preferences
 * confidence: high
 * ...
 * ---
 *
 * User prefers explanations with visual analogies and thought experiments
 * over mathematical formulas.
 * ```
 */
import type { AgentMemoryEntry } from '@/types'
import type { FileMetadata, SerializedFile, Serializer } from './types'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  sanitizeFilename,
  formatDate,
  parseDate,
  shortHash,
} from '../utils'

const DIRECTORY = 'memories'
const EXTENSION = '.memory.md'

/**
 * Frontmatter for memory files (matches actual AgentMemoryEntry)
 */
interface MemoryFileFrontmatter {
  id: string
  agentId: string
  category: string
  title: string
  confidence: string
  validationStatus: string
  sourceConversationIds: string[]
  sourceMessageIds: string[]
  learnedAt: string
  keywords: string[]
  tags: string[]
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  version: number
  previousVersionId?: string
  supersededBy?: string
  usageCount: number
  lastUsedAt?: string
  expiresAt?: string
  isGlobal?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Serialize an AgentMemoryEntry to Markdown with YAML frontmatter
 */
function serialize(memory: AgentMemoryEntry): SerializedFile {
  const frontmatter: MemoryFileFrontmatter = {
    id: memory.id,
    agentId: memory.agentId,
    category: memory.category,
    title: memory.title,
    confidence: memory.confidence,
    validationStatus: memory.validationStatus,
    sourceConversationIds: memory.sourceConversationIds || [],
    sourceMessageIds: memory.sourceMessageIds || [],
    learnedAt: formatDate(memory.learnedAt),
    keywords: memory.keywords || [],
    tags: memory.tags || [],
    ...(memory.reviewedAt && { reviewedAt: formatDate(memory.reviewedAt) }),
    ...(memory.reviewedBy && { reviewedBy: memory.reviewedBy }),
    ...(memory.reviewNotes && { reviewNotes: memory.reviewNotes }),
    version: memory.version || 1,
    ...(memory.previousVersionId && {
      previousVersionId: memory.previousVersionId,
    }),
    ...(memory.supersededBy && { supersededBy: memory.supersededBy }),
    usageCount: memory.usageCount || 0,
    ...(memory.lastUsedAt && { lastUsedAt: formatDate(memory.lastUsedAt) }),
    ...(memory.expiresAt && { expiresAt: formatDate(memory.expiresAt) }),
    ...(memory.isGlobal && { isGlobal: memory.isGlobal }),
    createdAt: formatDate(memory.createdAt),
    updatedAt: formatDate(memory.updatedAt),
  }

  const body = memory.content
  const content = stringifyFrontmatter(frontmatter, body)

  // Organize by agent in subdirectories
  return {
    filename: getFilename(memory),
    content,
    directory: `${DIRECTORY}/${sanitizeFilename(memory.agentId)}`,
  }
}

/**
 * Deserialize Markdown with YAML frontmatter to an AgentMemoryEntry
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 */
function deserialize(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
): AgentMemoryEntry | null {
  const parsed = parseFrontmatter<MemoryFileFrontmatter>(content)
  if (!parsed) {
    console.warn(`Failed to parse memory file: ${filename}`)
    return null
  }

  const { frontmatter, body } = parsed

  // Use file metadata as fallback for timestamps
  const learnedAt = frontmatter.learnedAt
    ? parseDate(frontmatter.learnedAt)
    : fileMetadata?.lastModified ?? new Date()
  const createdAt = frontmatter.createdAt
    ? parseDate(frontmatter.createdAt)
    : fileMetadata?.lastModified ?? new Date()
  const updatedAt = frontmatter.updatedAt
    ? parseDate(frontmatter.updatedAt)
    : fileMetadata?.lastModified ?? new Date()

  const memory: AgentMemoryEntry = {
    id: frontmatter.id,
    agentId: frontmatter.agentId,
    category: frontmatter.category as AgentMemoryEntry['category'],
    title: frontmatter.title,
    content: body,
    confidence: frontmatter.confidence as AgentMemoryEntry['confidence'],
    validationStatus:
      frontmatter.validationStatus as AgentMemoryEntry['validationStatus'],
    sourceConversationIds: frontmatter.sourceConversationIds || [],
    sourceMessageIds: frontmatter.sourceMessageIds || [],
    learnedAt,
    keywords: frontmatter.keywords || [],
    tags: frontmatter.tags || [],
    ...(frontmatter.reviewedAt && {
      reviewedAt: parseDate(frontmatter.reviewedAt),
    }),
    ...(frontmatter.reviewedBy && { reviewedBy: frontmatter.reviewedBy }),
    ...(frontmatter.reviewNotes && { reviewNotes: frontmatter.reviewNotes }),
    version: frontmatter.version || 1,
    ...(frontmatter.previousVersionId && {
      previousVersionId: frontmatter.previousVersionId,
    }),
    ...(frontmatter.supersededBy && { supersededBy: frontmatter.supersededBy }),
    usageCount: frontmatter.usageCount || 0,
    ...(frontmatter.lastUsedAt && {
      lastUsedAt: parseDate(frontmatter.lastUsedAt),
    }),
    ...(frontmatter.expiresAt && { expiresAt: parseDate(frontmatter.expiresAt) }),
    ...(frontmatter.isGlobal && { isGlobal: frontmatter.isGlobal }),
    createdAt,
    updatedAt,
  }

  return memory
}

function getFilename(memory: AgentMemoryEntry): string {
  const titleSlug = sanitizeFilename(memory.title, 30)
  const hash = shortHash(memory.id)
  return `${titleSlug}-${hash}${EXTENSION}`
}

function getExtension(): string {
  return EXTENSION
}

function getDirectory(): string {
  return DIRECTORY
}

export const memorySerializer: Serializer<AgentMemoryEntry> = {
  serialize,
  deserialize,
  getFilename,
  getExtension,
  getDirectory,
}
