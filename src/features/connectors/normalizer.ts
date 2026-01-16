/**
 * Content Normalizer for Connectors
 *
 * This module provides utilities for transforming connector-specific items
 * into the unified KnowledgeItem format used throughout the application.
 */

import type { KnowledgeItem } from '@/types'
import type { ConnectorItem, Connector, AppConnectorProvider } from './types'

// =============================================================================
// Constants
// =============================================================================

/**
 * Provider-specific file type mappings
 *
 * Maps MIME types to file types for each connector provider.
 * These mappings handle provider-specific content types that may not
 * follow standard MIME type conventions.
 */
export const PROVIDER_FILE_TYPES: Record<
  AppConnectorProvider,
  Record<string, 'document' | 'image' | 'text'>
> = {
  gmail: {
    'message/rfc822': 'document',
    'application/vnd.google-apps.mail': 'document',
  },
  'google-calendar': {
    'text/calendar': 'document',
    'application/vnd.google-apps.calendar': 'document',
  },
  'google-chat': {
    'text/plain': 'text',
    'text/markdown': 'text',
  },
  'google-meet': {
    // Google Meet doesn't sync content, but we need an entry
    'text/plain': 'text',
  },
  'google-tasks': {
    'text/plain': 'text',
    'text/markdown': 'text',
  },
  notion: {
    'text/markdown': 'text',
    'application/vnd.notion.page': 'document',
    'application/vnd.notion.database': 'document',
  },
  'google-drive': {
    // Google Workspace types
    'application/vnd.google-apps.document': 'document',
    'application/vnd.google-apps.spreadsheet': 'document',
    'application/vnd.google-apps.presentation': 'document',
    'application/vnd.google-apps.drawing': 'image',
    'application/vnd.google-apps.form': 'document',
    // Standard types will use detectFileType fallback
  },
  dropbox: {
    // Dropbox uses standard MIME types, will use detectFileType
  },
  github: {
    // GitHub content types
    'text/x-markdown': 'text',
    'application/x-git-commit': 'document',
    'application/x-git-issue': 'document',
    'application/x-git-pull-request': 'document',
  },
  qonto: {
    // Qonto content types
    'application/json': 'document',
    'text/plain': 'text',
  },
  slack: {
    // Slack content types
    'text/plain': 'text',
    'text/markdown': 'text',
    'application/json': 'document',
  },
  'outlook-mail': {
    // Outlook Mail content types
    'message/rfc822': 'document',
    'text/html': 'document',
    'text/plain': 'text',
  },
  onedrive: {
    // OneDrive uses standard MIME types, will use detectFileType
  },
  figma: {
    // Figma content types
    'application/figma': 'document',
    'text/markdown': 'text',
  },
}

/**
 * Image MIME type patterns
 */
const IMAGE_MIME_PATTERNS = [
  'image/',
  'application/vnd.google-apps.drawing',
  'application/vnd.google-apps.photo',
]

/**
 * Document MIME type patterns
 */
const DOCUMENT_MIME_PATTERNS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml',
  'application/vnd.openxmlformats-officedocument.spreadsheetml',
  'application/vnd.openxmlformats-officedocument.presentationml',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/epub+zip',
  'application/rtf',
]

/**
 * Text MIME type patterns
 */
const TEXT_MIME_PATTERNS = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-yaml',
  'application/x-sh',
]

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
  '.avif',
])

/**
 * Document file extensions
 */
const DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  '.rtf',
  '.epub',
  '.pages',
  '.numbers',
  '.key',
])

/**
 * Text file extensions
 */
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.rb',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.go',
  '.rs',
  '.swift',
  '.kt',
  '.scala',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.sql',
  '.csv',
  '.log',
  '.ini',
  '.conf',
  '.config',
  '.env',
  '.gitignore',
  '.editorconfig',
  '.prettierrc',
  '.eslintrc',
])

// =============================================================================
// File Type Detection
// =============================================================================

/**
 * Detect file type based on MIME type and file extension
 *
 * Uses a prioritized approach:
 * 1. Check MIME type against known patterns
 * 2. Fall back to file extension detection
 *
 * @param mimeType - The MIME type of the file (optional)
 * @param name - The file name with extension (optional)
 * @returns The detected file type, or undefined if unknown
 *
 * @example
 * ```typescript
 * detectFileType('image/png', 'photo.png') // => 'image'
 * detectFileType('application/pdf', 'document.pdf') // => 'document'
 * detectFileType(undefined, 'readme.md') // => 'text'
 * detectFileType('application/octet-stream', 'data.bin') // => undefined
 * ```
 */
export function detectFileType(
  mimeType?: string,
  name?: string,
): 'document' | 'image' | 'text' | undefined {
  // Try MIME type detection first
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase()

    // Check image patterns
    if (IMAGE_MIME_PATTERNS.some((pattern) => lowerMime.startsWith(pattern))) {
      return 'image'
    }

    // Check document patterns
    if (
      DOCUMENT_MIME_PATTERNS.some(
        (pattern) => lowerMime === pattern || lowerMime.startsWith(pattern),
      )
    ) {
      return 'document'
    }

    // Check text patterns
    if (TEXT_MIME_PATTERNS.some((pattern) => lowerMime.startsWith(pattern))) {
      return 'text'
    }
  }

  // Fall back to extension detection
  if (name) {
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex !== -1) {
      const extension = name.slice(lastDotIndex).toLowerCase()

      if (IMAGE_EXTENSIONS.has(extension)) {
        return 'image'
      }
      if (DOCUMENT_EXTENSIONS.has(extension)) {
        return 'document'
      }
      if (TEXT_EXTENSIONS.has(extension)) {
        return 'text'
      }
    }
  }

  return undefined
}

/**
 * Detect file type with provider-specific mappings
 *
 * First checks provider-specific mappings, then falls back to generic detection.
 *
 * @param provider - The connector provider
 * @param mimeType - The MIME type of the file
 * @param name - The file name with extension
 * @returns The detected file type, or undefined if unknown
 */
export function detectFileTypeForProvider(
  provider: AppConnectorProvider,
  mimeType?: string,
  name?: string,
): 'document' | 'image' | 'text' | undefined {
  // Check provider-specific mappings first
  if (mimeType && provider in PROVIDER_FILE_TYPES) {
    const providerMappings = PROVIDER_FILE_TYPES[provider]
    if (mimeType in providerMappings) {
      return providerMappings[mimeType]
    }
  }

  // Fall back to generic detection
  return detectFileType(mimeType, name)
}

// =============================================================================
// Content Hashing
// =============================================================================

/**
 * Generate a SHA-256 hash of the given content
 *
 * Uses the Web Crypto API (SubtleCrypto) for secure hashing.
 * This is useful for detecting content changes without comparing
 * the full content.
 *
 * @param content - The content string to hash
 * @returns A promise that resolves to the hex-encoded SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = await generateContentHash('Hello, World!')
 * // => 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f'
 * ```
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Check if content has changed based on hash comparison
 *
 * Returns true if:
 * - Either hash is undefined (can't compare)
 * - The hashes are different
 *
 * @param newHash - The hash of the new content
 * @param existingHash - The hash of the existing content
 * @returns True if content has changed or cannot be compared
 *
 * @example
 * ```typescript
 * hasContentChanged('abc123', 'abc123') // => false
 * hasContentChanged('abc123', 'def456') // => true
 * hasContentChanged(undefined, 'abc123') // => true
 * hasContentChanged('abc123', undefined) // => true
 * ```
 */
export function hasContentChanged(
  newHash: string | undefined,
  existingHash: string | undefined,
): boolean {
  // If either hash is missing, assume content has changed
  if (!newHash || !existingHash) {
    return true
  }

  return newHash !== existingHash
}

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Normalize a ConnectorItem to a KnowledgeItem
 *
 * Transforms provider-specific connector items into the unified
 * KnowledgeItem format used throughout the application.
 *
 * @param item - The connector item to normalize
 * @param connector - The connector that provided the item
 * @returns A new KnowledgeItem with all fields populated
 *
 * @example
 * ```typescript
 * const knowledgeItem = normalizeToKnowledgeItem(googleDriveFile, driveConnector)
 * // => { id: 'uuid', name: 'Document.pdf', syncSource: 'connector', ... }
 * ```
 */
export function normalizeToKnowledgeItem(
  item: ConnectorItem,
  connector: Connector,
): KnowledgeItem {
  const now = new Date()

  // Detect file type using provider-specific mappings if available
  const fileType =
    item.fileType ||
    (connector.category === 'app'
      ? detectFileTypeForProvider(
          connector.provider as AppConnectorProvider,
          item.mimeType,
          item.name,
        )
      : detectFileType(item.mimeType, item.name))

  return {
    // Core identification
    id: crypto.randomUUID(),
    name: item.name,
    type: item.type,
    fileType,

    // Content
    content: item.content,
    contentHash: item.contentHash,
    mimeType: item.mimeType,
    size: item.size,

    // Transcript (extracted text from documents like emails)
    transcript: item.transcript,

    // Organization
    path: item.path,
    parentId: undefined, // Will be resolved during folder sync
    tags: item.tags,
    description: item.description,

    // Timestamps
    lastModified: item.lastModified,
    createdAt: now,

    // Sync metadata
    syncSource: 'connector',
    lastSyncCheck: now,

    // Connector-specific fields
    connectorId: connector.id,
    externalId: item.externalId,
    externalUrl: item.externalUrl,
    syncedAt: now,
  }
}

/**
 * Merge a new connector item with an existing knowledge item
 *
 * Updates the existing item with new data while preserving:
 * - The original ID
 * - The original createdAt timestamp
 * - User-modified fields (tags, description) if not provided in new item
 *
 * @param newItem - The new connector item with updated data
 * @param existing - The existing knowledge item to update
 * @param connector - The connector that provided the new item
 * @returns A merged KnowledgeItem with updated fields
 *
 * @example
 * ```typescript
 * const updated = mergeWithExisting(updatedDriveFile, existingItem, driveConnector)
 * // Preserves id, createdAt, and user modifications
 * ```
 */
export function mergeWithExisting(
  newItem: ConnectorItem,
  existing: KnowledgeItem,
  connector: Connector,
): KnowledgeItem {
  const now = new Date()

  // Detect file type for new item
  const fileType =
    newItem.fileType ||
    (connector.category === 'app'
      ? detectFileTypeForProvider(
          connector.provider as AppConnectorProvider,
          newItem.mimeType,
          newItem.name,
        )
      : detectFileType(newItem.mimeType, newItem.name))

  return {
    // Preserve original identification
    id: existing.id,
    createdAt: existing.createdAt,

    // Update core fields
    name: newItem.name,
    type: newItem.type,
    fileType,

    // Update content
    content: newItem.content,
    contentHash: newItem.contentHash,
    mimeType: newItem.mimeType,
    size: newItem.size,

    // Update transcript (prefer new if provided, otherwise preserve existing)
    transcript: newItem.transcript ?? existing.transcript,

    // Update organization
    path: newItem.path,
    parentId: existing.parentId, // Preserve folder structure

    // Merge tags and description (prefer new if provided)
    tags: newItem.tags ?? existing.tags,
    description: newItem.description ?? existing.description,

    // Update timestamps
    lastModified: newItem.lastModified,
    lastSyncCheck: now,

    // Preserve sync metadata
    syncSource: 'connector',
    fileSystemHandle: existing.fileSystemHandle,
    watchId: existing.watchId,

    // Update connector-specific fields
    connectorId: connector.id,
    externalId: newItem.externalId,
    externalUrl: newItem.externalUrl,
    syncedAt: now,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if an item needs to be updated based on content hash
 *
 * @param newItem - The new connector item
 * @param existing - The existing knowledge item
 * @returns True if the item should be updated
 */
export function shouldUpdateItem(
  newItem: ConnectorItem,
  existing: KnowledgeItem,
): boolean {
  // Always update if hashes differ
  if (hasContentChanged(newItem.contentHash, existing.contentHash)) {
    return true
  }

  // Check if metadata has changed
  if (newItem.name !== existing.name) {
    return true
  }

  if (newItem.path !== existing.path) {
    return true
  }

  // Check if lastModified is newer
  if (newItem.lastModified > existing.lastModified) {
    return true
  }

  return false
}

/**
 * Extract the parent path from a full path
 *
 * @param path - The full path
 * @returns The parent path, or empty string for root items
 *
 * @example
 * ```typescript
 * getParentPath('/folder/subfolder/file.txt') // => '/folder/subfolder'
 * getParentPath('/file.txt') // => ''
 * ```
 */
export function getParentPath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash <= 0) {
    return ''
  }
  return path.slice(0, lastSlash)
}

/**
 * Build a full path from parent path and name
 *
 * @param parentPath - The parent folder path
 * @param name - The item name
 * @returns The full path
 *
 * @example
 * ```typescript
 * buildPath('/folder', 'file.txt') // => '/folder/file.txt'
 * buildPath('', 'file.txt') // => '/file.txt'
 * ```
 */
export function buildPath(parentPath: string, name: string): string {
  if (!parentPath) {
    return `/${name}`
  }
  return `${parentPath}/${name}`
}
