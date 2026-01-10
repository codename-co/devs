/**
 * Knowledge Item Utilities
 *
 * Shared utilities for handling knowledge items, including
 * icon and color determination based on file type and mime type.
 */

import type { KnowledgeItem } from '@/types'

/**
 * Icon names supported by the Icon component
 */
export type KnowledgeIconName =
  | 'Folder'
  | 'Mail'
  | 'MediaImage'
  | 'Page'
  | 'Document'

/**
 * Color names for UI components (chips, etc.)
 */
export type KnowledgeColorName =
  | 'warning'
  | 'danger'
  | 'success'
  | 'secondary'
  | 'primary'
  | 'default'

/**
 * Get the appropriate icon name for a knowledge item.
 *
 * Determines the icon based on:
 * 1. Item type (folder)
 * 2. MIME type (email messages)
 * 3. File type (image, document, text)
 *
 * @param item - The knowledge item
 * @returns Icon name for the Icon component
 */
export function getKnowledgeItemIcon(item: KnowledgeItem): KnowledgeIconName {
  // Folders
  if (item.type === 'folder') {
    return 'Folder'
  }

  // Email messages (RFC 822 format from Gmail, etc.)
  if (item.mimeType === 'message/rfc822') {
    return 'Mail'
  }

  // File types
  switch (item.fileType) {
    case 'image':
      return 'MediaImage'
    case 'document':
      return 'Page'
    case 'text':
      return 'Page'
    default:
      return 'Page'
  }
}

/**
 * Get the appropriate color for a knowledge item.
 *
 * Determines the color based on:
 * 1. Item type (folder)
 * 2. MIME type (email messages)
 * 3. File type (image, document, text)
 *
 * @param item - The knowledge item
 * @returns Color name for UI components
 */
export function getKnowledgeItemColor(item: KnowledgeItem): KnowledgeColorName {
  // Folders
  if (item.type === 'folder') {
    return 'warning'
  }

  // Email messages (RFC 822 format from Gmail, etc.)
  if (item.mimeType === 'message/rfc822') {
    return 'danger'
  }

  // File types
  switch (item.fileType) {
    case 'image':
      return 'success'
    case 'document':
      return 'secondary'
    case 'text':
      return 'primary'
    default:
      return 'default'
  }
}
