/**
 * Knowledge Store - Yjs-First Architecture
 *
 * This store provides CRUD operations for knowledge items using Yjs as the
 * single source of truth. IndexedDB persistence is handled by the Yjs layer.
 *
 * Content fields (content, transcript, description) are encrypted at rest
 * using AES-GCM-256 via the content-encryption service.
 *
 * @example
 * ```ts
 * import { addKnowledgeItem, getKnowledgeItem, deleteKnowledgeItem } from '@/stores/knowledgeStore'
 *
 * // Add a knowledge item (encrypts content automatically)
 * await addKnowledgeItem(item)
 *
 * // Get a knowledge item (returns encrypted — use decrypted variant for plaintext)
 * const item = await getKnowledgeItemDecrypted(id)
 *
 * // Delete a knowledge item
 * deleteKnowledgeItem(id)
 * ```
 */

import { knowledge, transact, isReady, whenReady } from '@/lib/yjs'
import type { KnowledgeItem } from '@/types'
import {
  encryptFields,
  decryptFields,
  KNOWLEDGE_ENCRYPTED_FIELDS,
} from '@/lib/crypto/content-encryption'

// ============================================================================
// Read Operations (raw — may return encrypted data)
// ============================================================================

/**
 * Get a knowledge item by ID (raw, may be encrypted).
 * For decrypted content, use {@link getKnowledgeItemDecrypted}.
 */
export function getKnowledgeItem(id: string): KnowledgeItem | undefined {
  return knowledge.get(id)
}

/**
 * Get all knowledge items (raw, may be encrypted).
 * For decrypted content, use {@link getAllKnowledgeItemsDecrypted}.
 */
export function getAllKnowledgeItems(): KnowledgeItem[] {
  return Array.from(knowledge.values())
}

/**
 * Find a knowledge item by path.
 */
export function findKnowledgeItemByPath(
  path: string,
): KnowledgeItem | undefined {
  return getAllKnowledgeItems().find((item) => item.path === path)
}

/**
 * Find a knowledge item by content hash (for deduplication).
 */
export function findKnowledgeItemByHash(
  contentHash: string,
): KnowledgeItem | undefined {
  return getAllKnowledgeItems().find((item) => item.contentHash === contentHash)
}

/**
 * Get all knowledge items for a specific watch ID.
 */
export function getKnowledgeItemsByWatchId(watchId: string): KnowledgeItem[] {
  return getAllKnowledgeItems().filter((item) => item.watchId === watchId)
}

// ============================================================================
// Decrypted Read Operations
// ============================================================================

/**
 * Get a knowledge item by ID with content decrypted.
 * Returns undefined if not found.
 */
export async function getKnowledgeItemDecrypted(
  id: string,
): Promise<KnowledgeItem | undefined> {
  const item = knowledge.get(id)
  if (!item) return undefined
  return decryptFields(item, [
    ...KNOWLEDGE_ENCRYPTED_FIELDS,
  ]) as Promise<KnowledgeItem>
}

/**
 * Get all knowledge items with content decrypted.
 */
export async function getAllKnowledgeItemsDecrypted(): Promise<
  KnowledgeItem[]
> {
  const items = Array.from(knowledge.values())
  return Promise.all(
    items.map(
      (item) =>
        decryptFields(item, [
          ...KNOWLEDGE_ENCRYPTED_FIELDS,
        ]) as Promise<KnowledgeItem>,
    ),
  )
}

// ============================================================================
// Write Operations (encrypt content before storing)
// ============================================================================

/**
 * Add a new knowledge item.
 * Encrypts content fields before storing in Yjs.
 */
export async function addKnowledgeItem(item: KnowledgeItem): Promise<void> {
  const encrypted = await encryptFields(item, [...KNOWLEDGE_ENCRYPTED_FIELDS])
  transact(() => {
    knowledge.set(item.id, encrypted as unknown as KnowledgeItem)
  })
}

/**
 * Update an existing knowledge item.
 * Encrypts content fields before storing in Yjs.
 * Creates the item if it doesn't exist.
 */
export async function updateKnowledgeItem(item: KnowledgeItem): Promise<void> {
  const encrypted = await encryptFields(item, [...KNOWLEDGE_ENCRYPTED_FIELDS])
  transact(() => {
    knowledge.set(item.id, encrypted as unknown as KnowledgeItem)
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
 * Returns decrypted content.
 */
export async function getKnowledgeItemAsync(
  id: string,
): Promise<KnowledgeItem | undefined> {
  await ensureReady()
  return getKnowledgeItemDecrypted(id)
}

/**
 * Get all knowledge items, waiting for Yjs to be ready first.
 * Returns decrypted content.
 */
export async function getAllKnowledgeItemsAsync(): Promise<KnowledgeItem[]> {
  await ensureReady()
  return getAllKnowledgeItemsDecrypted()
}
