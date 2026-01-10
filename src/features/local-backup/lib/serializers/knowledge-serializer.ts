/**
 * Knowledge Item Serializer
 *
 * Serialize/deserialize KnowledgeItem entities to Markdown with YAML frontmatter
 *
 * Format:
 * ```
 * ---
 * id: doc-xyz789
 * name: Project README
 * type: file
 * fileType: text
 * mimeType: text/markdown
 * size: 1234
 * path: /documents/project
 * ...
 * ---
 *
 * # Project README
 *
 * This is the content of the knowledge item...
 * ```
 */
import type { KnowledgeItem } from '@/types'
import type {
  FileMetadata,
  KnowledgeItemFrontmatter,
  SerializedFile,
  Serializer,
} from './types'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  sanitizeFilename,
  formatDate,
  parseDate,
  shortHash,
} from '../utils'

const DIRECTORY = 'knowledge'
const EXTENSION = '.knowledge.md'

/**
 * Serialize a KnowledgeItem to Markdown with YAML frontmatter
 */
function serialize(item: KnowledgeItem): SerializedFile {
  const frontmatter: KnowledgeItemFrontmatter = {
    id: item.id,
    name: item.name,
    type: item.type,
    ...(item.fileType && { fileType: item.fileType }),
    ...(item.contentHash && { contentHash: item.contentHash }),
    ...(item.mimeType && { mimeType: item.mimeType }),
    ...(item.size !== undefined && { size: item.size }),
    path: item.path,
    ...(item.parentId && { parentId: item.parentId }),
    lastModified: formatDate(item.lastModified),
    createdAt: formatDate(item.createdAt),
    ...(item.tags?.length && { tags: item.tags }),
    ...(item.description && { description: item.description }),
    ...(item.syncSource && { syncSource: item.syncSource }),
    ...(item.connectorId && { connectorId: item.connectorId }),
    ...(item.externalId && { externalId: item.externalId }),
    ...(item.externalUrl && { externalUrl: item.externalUrl }),
    ...(item.syncedAt && { syncedAt: formatDate(item.syncedAt) }),
    ...(item.transcript && { hasTranscript: true }),
    ...(item.processingStatus && { processingStatus: item.processingStatus }),
    ...(item.processedAt && { processedAt: formatDate(item.processedAt) }),
  }

  // Body is the content (for text files) or transcript (for documents)
  let body = ''
  if (item.content) {
    body = item.content
  }
  if (item.transcript) {
    if (body) {
      body += '\n\n---\n\n## Transcript\n\n'
    }
    body += item.transcript
  }

  const content = stringifyFrontmatter(frontmatter, body)

  // Organize by path - use sanitized path for directory structure
  const pathDir = item.path
    .split('/')
    .filter((p) => p && p !== '/')
    .map((p) => sanitizeFilename(p))
    .join('/')

  return {
    filename: getFilename(item),
    content,
    directory: pathDir ? `${DIRECTORY}/${pathDir}` : DIRECTORY,
  }
}

/**
 * Deserialize Markdown with YAML frontmatter to a KnowledgeItem
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 */
function deserialize(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
): KnowledgeItem | null {
  const parsed = parseFrontmatter<KnowledgeItemFrontmatter>(content)
  if (!parsed) {
    console.warn(`Failed to parse knowledge item file: ${filename}`)
    return null
  }

  const { frontmatter, body } = parsed

  // Use file metadata as fallback for timestamps
  const lastModified = frontmatter.lastModified
    ? parseDate(frontmatter.lastModified)
    : (fileMetadata?.lastModified ?? new Date())
  const createdAt = frontmatter.createdAt
    ? parseDate(frontmatter.createdAt)
    : (fileMetadata?.lastModified ?? new Date())

  // Parse content and transcript from body
  let itemContent = body
  let transcript: string | undefined

  const transcriptIndex = body.indexOf('---\n\n## Transcript\n\n')
  if (transcriptIndex !== -1) {
    itemContent = body.slice(0, transcriptIndex).trim()
    transcript = body
      .slice(transcriptIndex + '---\n\n## Transcript\n\n'.length)
      .trim()
  }

  const item: KnowledgeItem = {
    id: frontmatter.id,
    name: frontmatter.name,
    type: frontmatter.type,
    ...(frontmatter.fileType && {
      fileType: frontmatter.fileType as KnowledgeItem['fileType'],
    }),
    ...(itemContent && { content: itemContent }),
    ...(frontmatter.contentHash && { contentHash: frontmatter.contentHash }),
    ...(frontmatter.mimeType && { mimeType: frontmatter.mimeType }),
    ...(frontmatter.size !== undefined && { size: frontmatter.size }),
    path: frontmatter.path,
    ...(frontmatter.parentId && { parentId: frontmatter.parentId }),
    lastModified,
    createdAt,
    ...(frontmatter.tags && { tags: frontmatter.tags }),
    ...(frontmatter.description && { description: frontmatter.description }),
    ...(frontmatter.syncSource && {
      syncSource: frontmatter.syncSource as KnowledgeItem['syncSource'],
    }),
    ...(frontmatter.connectorId && { connectorId: frontmatter.connectorId }),
    ...(frontmatter.externalId && { externalId: frontmatter.externalId }),
    ...(frontmatter.externalUrl && { externalUrl: frontmatter.externalUrl }),
    ...(frontmatter.syncedAt && { syncedAt: parseDate(frontmatter.syncedAt) }),
    ...(transcript && { transcript }),
    ...(frontmatter.processingStatus && {
      processingStatus:
        frontmatter.processingStatus as KnowledgeItem['processingStatus'],
    }),
    ...(frontmatter.processedAt && {
      processedAt: parseDate(frontmatter.processedAt),
    }),
  }

  return item
}

function getFilename(item: KnowledgeItem): string {
  const nameSlug = sanitizeFilename(item.name, 40)
  const hash = shortHash(item.id)
  return `${nameSlug}-${hash}${EXTENSION}`
}

function getExtension(): string {
  return EXTENSION
}

function getDirectory(): string {
  return DIRECTORY
}

export const knowledgeSerializer: Serializer<KnowledgeItem> = {
  serialize,
  deserialize,
  getFilename,
  getExtension,
  getDirectory,
}
