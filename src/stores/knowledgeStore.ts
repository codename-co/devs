/**
 * Knowledge Store - Yjs-First Architecture
 *
 * This store provides CRUD operations for knowledge items using Yjs as the
 * single source of truth. IndexedDB persistence is handled by the Yjs layer.
 *
 * @example
 * ```ts
 * import { addKnowledgeItem, getKnowledgeItem, deleteKnowledgeItem } from '@/stores/knowledgeStore'
 *
 * // Add a knowledge item
 * await addKnowledgeItem(item)
 *
 * // Get a knowledge item
 * const item = getKnowledgeItem(id)
 *
 * // Delete a knowledge item
 * deleteKnowledgeItem(id)
 * ```
 */

import { knowledge, transact, isReady, whenReady } from '@/lib/yjs'
import type { KnowledgeItem } from '@/types'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get a knowledge item by ID.
 * Returns undefined if not found.
 */
export function getKnowledgeItem(id: string): KnowledgeItem | undefined {
  return knowledge.get(id)
}

/**
 * Get all knowledge items.
 */
export function getAllKnowledgeItems(): KnowledgeItem[] {
  return Array.from(knowledge.values())
}

/**
 * Find a knowledge item by path.
 */
export function findKnowledgeItemByPath(path: string): KnowledgeItem | undefined {
  return getAllKnowledgeItems().find((item) => item.path === path)
}

/**
 * Find a knowledge item by content hash (for deduplication).
 */
export function findKnowledgeItemByHash(contentHash: string): KnowledgeItem | undefined {
  return getAllKnowledgeItems().find((item) => item.contentHash === contentHash)
}

/**
 * Get all knowledge items for a specific watch ID.
 */
export function getKnowledgeItemsByWatchId(watchId: string): KnowledgeItem[] {
  return getAllKnowledgeItems().filter((item) => item.watchId === watchId)
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Add a new knowledge item.
 * Uses transact() for batched writes.
 */
export function addKnowledgeItem(item: KnowledgeItem): void {
  transact(() => {
    knowledge.set(item.id, item)
  })
}

/**
 * Update an existing knowledge item.
 * Creates the item if it doesn't exist.
 */
export function updateKnowledgeItem(item: KnowledgeItem): void {
  transact(() => {
    knowledge.set(item.id, item)
  })
}

/**
 * Delete a knowledge item by ID.
 */
export function deleteKnowledgeItem(id: string): void {
  transact(() => {
    knowledge.delete(id)
  })
}

/**
 * Delete multiple knowledge items by IDs.
 * Uses a single transaction for efficiency.
 */
export function deleteKnowledgeItems(ids: string[]): void {
  transact(() => {
    for (const id of ids) {
      knowledge.delete(id)
    }
  })
}

/**
 * Delete all knowledge items for a specific watch ID.
 * Returns the number of deleted items.
 */
export function deleteKnowledgeItemsByWatchId(watchId: string): number {
  const items = getKnowledgeItemsByWatchId(watchId)
  if (items.length === 0) return 0

  transact(() => {
    for (const item of items) {
      knowledge.delete(item.id)
    }
  })

  return items.length
}

// ============================================================================
// Async Initialization Helpers
// ============================================================================

/**
 * Ensure Yjs is ready before performing operations.
 * Use this for async contexts that need to wait for initial sync.
 */
export async function ensureReady(): Promise<void> {
  if (!isReady()) {
    await whenReady
  }
}

/**
 * Get a knowledge item by ID, waiting for Yjs to be ready first.
 */
export async function getKnowledgeItemAsync(id: string): Promise<KnowledgeItem | undefined> {
  await ensureReady()
  return getKnowledgeItem(id)
}

/**
 * Get all knowledge items, waiting for Yjs to be ready first.
 */
export async function getAllKnowledgeItemsAsync(): Promise<KnowledgeItem[]> {
  await ensureReady()
  return getAllKnowledgeItems()
}
