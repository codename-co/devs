/**
 * CRDT Adapter using Yjs
 * Provides conflict-free data synchronization
 */

import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { SyncMetadata } from '@/types'

// Entity types that can be synced
export type SyncableEntityType =
  | 'agents'
  | 'conversations'
  | 'messages'
  | 'knowledge'
  | 'workflows'
  | 'artifacts'
  | 'memories'
  | 'settings'

/**
 * Entity change event
 */
export interface EntityChange {
  entityType: SyncableEntityType
  id: string
  operation: 'create' | 'update' | 'delete'
  data?: unknown
}

/**
 * CRDT Document Manager
 * Manages Yjs documents for different workspaces
 */
export class CRDTDocumentManager {
  private docs: Map<string, Y.Doc> = new Map()
  private persistence: Map<string, IndexeddbPersistence> = new Map()
  private observers: Map<string, Set<(changes: EntityChange[]) => void>> =
    new Map()

  /**
   * Get or create a Yjs document for a workspace
   */
  getDocument(workspaceId: string): Y.Doc {
    let doc = this.docs.get(workspaceId)

    if (!doc) {
      doc = new Y.Doc()
      this.docs.set(workspaceId, doc)

      // Initialize entity maps
      for (const entityType of [
        'agents',
        'conversations',
        'messages',
        'knowledge',
        'workflows',
        'artifacts',
        'memories',
        'settings',
      ] as SyncableEntityType[]) {
        doc.getMap(entityType)
      }

      // Set up IndexedDB persistence
      const persistence = new IndexeddbPersistence(
        `devs-sync-${workspaceId}`,
        doc
      )
      this.persistence.set(workspaceId, persistence)

      // Set up change observer
      this.setupChangeObserver(workspaceId, doc)
    }

    return doc
  }

  /**
   * Get the Yjs Map for a specific entity type
   */
  getEntityMap<T>(
    workspaceId: string,
    entityType: SyncableEntityType
  ): Y.Map<T> {
    const doc = this.getDocument(workspaceId)
    return doc.getMap(entityType) as Y.Map<T>
  }

  /**
   * Add or update an entity
   */
  setEntity<T extends Record<string, unknown>>(
    workspaceId: string,
    entityType: SyncableEntityType,
    id: string,
    data: T
  ): void {
    const map = this.getEntityMap<T>(workspaceId, entityType)
    const doc = this.getDocument(workspaceId)

    // Get existing version or default to 0
    const existing = map.get(id) as (T & SyncMetadata) | undefined
    const currentVersion = existing?._version ?? 0

    // Add sync metadata
    const syncData = {
      ...data,
      _syncId: id,
      _lastModified: Date.now(),
      _version: currentVersion + 1,
      _deleted: false,
    } as T & SyncMetadata

    doc.transact(() => {
      map.set(id, syncData)
    })
  }

  /**
   * Get an entity by ID
   */
  getEntity<T>(
    workspaceId: string,
    entityType: SyncableEntityType,
    id: string
  ): (T & SyncMetadata) | undefined {
    const map = this.getEntityMap<T & SyncMetadata>(workspaceId, entityType)
    const entity = map.get(id)

    // Filter out deleted entities
    if (entity?._deleted) {
      return undefined
    }

    return entity
  }

  /**
   * Get all entities of a type (excluding deleted)
   */
  getAllEntities<T>(
    workspaceId: string,
    entityType: SyncableEntityType
  ): (T & SyncMetadata)[] {
    const map = this.getEntityMap<T & SyncMetadata>(workspaceId, entityType)
    const entities: (T & SyncMetadata)[] = []

    map.forEach((value) => {
      if (!value._deleted) {
        entities.push(value)
      }
    })

    return entities
  }

  /**
   * Soft delete an entity (for sync propagation)
   */
  deleteEntity(
    workspaceId: string,
    entityType: SyncableEntityType,
    id: string
  ): void {
    const map = this.getEntityMap<SyncMetadata>(workspaceId, entityType)
    const existing = map.get(id)

    if (existing) {
      const doc = this.getDocument(workspaceId)
      doc.transact(() => {
        map.set(id, {
          ...existing,
          _lastModified: Date.now(),
          _version: existing._version + 1,
          _deleted: true,
        })
      })
    }
  }

  /**
   * Subscribe to changes for a workspace
   */
  subscribe(
    workspaceId: string,
    callback: (changes: EntityChange[]) => void
  ): () => void {
    if (!this.observers.has(workspaceId)) {
      this.observers.set(workspaceId, new Set())
    }

    this.observers.get(workspaceId)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.observers.get(workspaceId)?.delete(callback)
    }
  }

  /**
   * Set up change observer for a document
   */
  private setupChangeObserver(workspaceId: string, doc: Y.Doc): void {
    doc.on('update', (_update: Uint8Array, origin: unknown) => {
      // Skip local changes (they're already handled)
      if (origin === 'local') return

      // Collect changes and notify observers
      const changes: EntityChange[] = []

      for (const entityType of [
        'agents',
        'conversations',
        'messages',
        'knowledge',
        'workflows',
        'artifacts',
        'memories',
        'settings',
      ] as SyncableEntityType[]) {
        const map = doc.getMap(entityType)
        map.forEach((value, key) => {
          const syncValue = value as SyncMetadata
          changes.push({
            entityType,
            id: key,
            operation: syncValue._deleted ? 'delete' : 'update',
            data: value,
          })
        })
      }

      // Notify all observers
      this.observers.get(workspaceId)?.forEach((callback) => {
        callback(changes)
      })
    })
  }

  /**
   * Get encoded state for sync
   */
  getEncodedState(workspaceId: string): Uint8Array {
    const doc = this.getDocument(workspaceId)
    return Y.encodeStateAsUpdate(doc)
  }

  /**
   * Apply encoded state from remote
   */
  applyEncodedState(workspaceId: string, state: Uint8Array): void {
    const doc = this.getDocument(workspaceId)
    Y.applyUpdate(doc, state)
  }

  /**
   * Get state vector for sync negotiation
   */
  getStateVector(workspaceId: string): Uint8Array {
    const doc = this.getDocument(workspaceId)
    return Y.encodeStateVector(doc)
  }

  /**
   * Get diff from a state vector
   */
  getDiff(workspaceId: string, stateVector: Uint8Array): Uint8Array {
    const doc = this.getDocument(workspaceId)
    return Y.encodeStateAsUpdate(doc, stateVector)
  }

  /**
   * Destroy a document and clean up resources
   */
  destroyDocument(workspaceId: string): void {
    const doc = this.docs.get(workspaceId)
    const persistence = this.persistence.get(workspaceId)

    if (persistence) {
      persistence.destroy()
      this.persistence.delete(workspaceId)
    }

    if (doc) {
      doc.destroy()
      this.docs.delete(workspaceId)
    }

    this.observers.delete(workspaceId)
  }

  /**
   * Destroy all documents
   */
  destroyAll(): void {
    for (const workspaceId of this.docs.keys()) {
      this.destroyDocument(workspaceId)
    }
  }
}

/**
 * Singleton instance
 */
let crdtManager: CRDTDocumentManager | null = null

/**
 * Get the CRDT document manager singleton
 */
export function getCRDTManager(): CRDTDocumentManager {
  if (!crdtManager) {
    crdtManager = new CRDTDocumentManager()
  }
  return crdtManager
}

/**
 * Reset CRDT manager (for testing)
 */
export function resetCRDTManager(): void {
  if (crdtManager) {
    crdtManager.destroyAll()
    crdtManager = null
  }
}
