/**
 * Knowledge Item Serializer
 *
 * Serialize/deserialize KnowledgeItem entities to Markdown with YAML frontmatter
 *
 * Knowledge items are saved as two files:
 * 1. .metadata.knowledge.md - Hidden metadata file with YAML frontmatter + transcript
 * 2. Original file (e.g., document.pdf, image.png) - Contains the binary/text content
 *
 * Format for metadata file:
 * ```
 * ---
 * id: doc-xyz789
 * name: Project README
 * type: file
 * fileType: text
 * mimeType: text/markdown
 * size: 1234
 * path: /documents/project
 * binaryFile: project-readme-xyz789.md
 * ...
 * ---
 *
 * ## Transcript
 *
 * Extracted text content from document processing...
 * ```
 */
import type { KnowledgeItem } from '@/types'
import type {
  FileMetadata,
  KnowledgeItemFrontmatter,
  SerializedFile,
  SerializedKnowledgeFileSet,
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
// Metadata files are prefixed with a dot to make them hidden on Unix-like systems
const METADATA_EXTENSION = '.metadata.knowledge.md'
const METADATA_PREFIX = '.'

/**
 * Get the file extension from a filename or mime type
 */
function getFileExtension(name: string, mimeType?: string): string {
  // Try to get extension from name first
  const nameMatch = name.match(/\.([^.]+)$/)
  if (nameMatch) {
    return `.${nameMatch[1].toLowerCase()}`
  }

  // Fall back to mime type mapping
  if (mimeType) {
    const mimeExtensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'application/javascript': '.js',
      'application/json': '.json',
      'application/xml': '.xml',
      'text/xml': '.xml',
      'text/csv': '.csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
      'application/vnd.ms-powerpoint': '.ppt',
      'message/rfc822': '.eml',
    }
    const ext = mimeExtensions[mimeType]
    if (ext) return ext
  }

  // Default to .txt for unknown content types
  return '.txt'
}

/**
 * Determine if content should be stored as binary (base64)
 */
function isBinaryContent(fileType?: string, mimeType?: string): boolean {
  // Text files can be stored as-is
  if (fileType === 'text') return false

  // Check mime type
  if (mimeType) {
    if (mimeType.startsWith('text/')) return false
    if (mimeType.startsWith('message/')) return false // RFC 822 emails, etc.
    if (mimeType === 'application/json') return false
    if (mimeType === 'application/xml') return false
    if (mimeType === 'application/javascript') return false
  }

  // Everything else (images, documents) is binary
  return true
}

/**
 * Serialize a KnowledgeItem to metadata file + binary file
 */
function serializeKnowledgeFileSet(
  item: KnowledgeItem,
): SerializedKnowledgeFileSet {
  const hash = shortHash(item.id)
  const nameSlug = sanitizeFilename(item.name, 40)
  const extension = getFileExtension(item.name, item.mimeType)
  const binaryFilename = `${nameSlug}-${hash}${extension}`

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
    // Reference to the binary file
    ...(item.content && { binaryFile: binaryFilename }),
  }

  // Body contains only transcript if present
  let body = ''
  if (item.transcript) {
    body = `## Transcript\n\n${item.transcript}`
  }

  const metadataContent = stringifyFrontmatter(frontmatter, body)

  // Organize by path - use sanitized path for directory structure
  const pathDir = item.path
    .split('/')
    .filter((p) => p && p !== '/')
    .map((p) => sanitizeFilename(p))
    .join('/')

  const result: SerializedKnowledgeFileSet = {
    metadataFilename: `${METADATA_PREFIX}${nameSlug}-${hash}${METADATA_EXTENSION}`,
    metadataContent,
    directory: pathDir ? `${DIRECTORY}/${pathDir}` : DIRECTORY,
  }

  // Add binary content if present
  if (item.content) {
    const isBinary = isBinaryContent(item.fileType, item.mimeType)
    result.binaryFilename = binaryFilename
    result.binaryContent = item.content
    result.isBinaryBase64 = isBinary
  }

  return result
}

/**
 * Serialize a KnowledgeItem to Markdown with YAML frontmatter (legacy format for Serializer interface)
 */
function serialize(item: KnowledgeItem): SerializedFile {
  const fileSet = serializeKnowledgeFileSet(item)
  return {
    filename: fileSet.metadataFilename,
    content: fileSet.metadataContent,
    directory: fileSet.directory,
  }
}

/**
 * Deserialize Markdown with YAML frontmatter to a KnowledgeItem
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 * Binary content should be provided separately via binaryContent parameter
 */
function deserialize(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
  binaryContent?: string,
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

  // Parse transcript from body (new format: body only contains transcript)
  let transcript: string | undefined

  // Check for new format (body starts with ## Transcript)
  if (body.startsWith('## Transcript\n\n')) {
    transcript = body.slice('## Transcript\n\n'.length).trim()
  } else if (body.includes('---\n\n## Transcript\n\n')) {
    // Legacy format with content + transcript separator
    const transcriptIndex = body.indexOf('---\n\n## Transcript\n\n')
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
    // Use binary content if provided, otherwise empty (will be loaded separately)
    ...(binaryContent && { content: binaryContent }),
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
  return `${METADATA_PREFIX}${nameSlug}-${hash}${METADATA_EXTENSION}`
}

function getExtension(): string {
  return METADATA_EXTENSION
}

function getDirectory(): string {
  return DIRECTORY
}

/**
 * Get the binary filename for a knowledge item
 */
function getBinaryFilename(item: KnowledgeItem): string {
  const nameSlug = sanitizeFilename(item.name, 40)
  const hash = shortHash(item.id)
  const extension = getFileExtension(item.name, item.mimeType)
  return `${nameSlug}-${hash}${extension}`
}

export const knowledgeSerializer: Serializer<KnowledgeItem> & {
  serializeKnowledgeFileSet: typeof serializeKnowledgeFileSet
  getBinaryFilename: typeof getBinaryFilename
  isBinaryContent: typeof isBinaryContent
} = {
  serialize,
  deserialize,
  getFilename,
  getExtension,
  getDirectory,
  // Extended methods for knowledge items
  serializeKnowledgeFileSet,
  getBinaryFilename,
  isBinaryContent,
}
