/**
 * @module lib/teams/enterprise-doc
 *
 * Enterprise Y.Doc Management
 *
 * Manages separate Y.Doc instances for Enterprise spaces. Each Enterprise
 * space gets its own Y.Doc with:
 * - Its own IndexedDB persistence
 * - Its own authenticated WebSocket connection to devs-teams
 * - Complete data isolation from the personal Y.Doc
 *
 * ## Architecture
 *
 * ```
 * Personal Y.Doc (ydoc)              ← src/lib/yjs/doc.ts (unchanged)
 *   └── Local-only, y-indexeddb
 *
 * Enterprise Y.Docs (one per space)   ← this module
 *   └── y-indexeddb + authenticated WSS to devs-teams
 * ```
 *
 * The personal Y.Doc is unchanged from the existing implementation.
 * Enterprise docs are lazily created when the user navigates to an
 * Enterprise space, not all at boot.
 */

import * as Y from 'yjs'
import type {
  Agent,
  Conversation,
  Task,
  KnowledgeItem,
  Artifact,
  AgentMemoryEntry,
  SharedContext,
  InstalledSkill,
  Session,
  Space,
} from '@/types'
import type { ThreadTag } from '@/lib/yjs/maps'

// ============================================================================
// Types
// ============================================================================

/**
 * Container for an Enterprise space's Y.Doc and its typed maps.
 */
export interface EnterpriseDoc {
  /** The Y.Doc instance for this Enterprise space */
  doc: Y.Doc
  /** Space ID this doc belongs to */
  spaceId: string
  /** Org ID from the Teams config */
  orgId: string
  /** Whether IndexedDB persistence has synced */
  isReady: boolean
  /** Promise that resolves when persistence is synced */
  whenReady: Promise<void>
  /** Typed maps (mirrors the personal doc structure) */
  maps: EnterpriseDocMaps
}

/**
 * Typed Y.Map instances for an Enterprise doc.
 *
 * This is a subset of the personal doc maps — only the entity types
 * that are relevant in an Enterprise context.
 */
export interface EnterpriseDocMaps {
  agents: Y.Map<Agent>
  conversations: Y.Map<Conversation>
  tasks: Y.Map<Task>
  knowledge: Y.Map<KnowledgeItem>
  artifacts: Y.Map<Artifact>
  memories: Y.Map<AgentMemoryEntry>
  sharedContexts: Y.Map<SharedContext>
  skills: Y.Map<InstalledSkill>
  sessions: Y.Map<Session>
  threadTags: Y.Map<ThreadTag>
  spaces: Y.Map<Space>
}

// ============================================================================
// Registry
// ============================================================================

/** Registry of active Enterprise Y.Docs, keyed by spaceId */
const enterpriseDocs = new Map<string, EnterpriseDoc>()

/**
 * Get or create an Enterprise Y.Doc for a given space.
 *
 * The doc is lazily created on first access and persisted in IndexedDB
 * under a space-specific database name.
 *
 * @param spaceId - The Enterprise space ID
 * @param orgId - The org ID from Teams config
 * @returns The Enterprise doc container with typed maps
 */
export function getEnterpriseDoc(
  spaceId: string,
  orgId: string,
): EnterpriseDoc {
  const existing = enterpriseDocs.get(spaceId)
  if (existing) return existing

  const doc = new Y.Doc()
  const dbName = `devs-enterprise-${orgId}-${spaceId}`

  // Create typed maps
  const maps: EnterpriseDocMaps = {
    agents: doc.getMap<Agent>('agents'),
    conversations: doc.getMap<Conversation>('conversations'),
    tasks: doc.getMap<Task>('tasks'),
    knowledge: doc.getMap<KnowledgeItem>('knowledge'),
    artifacts: doc.getMap<Artifact>('artifacts'),
    memories: doc.getMap<AgentMemoryEntry>('memories'),
    sharedContexts: doc.getMap<SharedContext>('sharedContexts'),
    skills: doc.getMap<InstalledSkill>('skills'),
    sessions: doc.getMap<Session>('sessions'),
    threadTags: doc.getMap<ThreadTag>('threadTags'),
    spaces: doc.getMap<Space>('spaces'),
  }

  // Initialize IndexedDB persistence (lazy, like the personal doc)
  const whenReady = initEnterprisePersistence(doc, dbName)

  const enterpriseDoc: EnterpriseDoc = {
    doc,
    spaceId,
    orgId,
    isReady: false,
    whenReady,
    maps,
  }

  // Mark ready when persistence syncs
  whenReady.then(() => {
    enterpriseDoc.isReady = true
  })

  enterpriseDocs.set(spaceId, enterpriseDoc)
  return enterpriseDoc
}

/**
 * Check if an Enterprise doc exists for the given space.
 */
export function hasEnterpriseDoc(spaceId: string): boolean {
  return enterpriseDocs.has(spaceId)
}

/**
 * Get an existing Enterprise doc without creating one.
 */
export function getExistingEnterpriseDoc(
  spaceId: string,
): EnterpriseDoc | undefined {
  return enterpriseDocs.get(spaceId)
}

/**
 * Disconnect and destroy an Enterprise doc.
 *
 * Called when the user leaves an Enterprise space or logs out.
 */
export function destroyEnterpriseDoc(spaceId: string): void {
  const existing = enterpriseDocs.get(spaceId)
  if (!existing) return

  existing.doc.destroy()
  enterpriseDocs.delete(spaceId)
}

/**
 * Destroy all Enterprise docs (e.g. on logout).
 */
export function destroyAllEnterpriseDocs(): void {
  for (const [spaceId] of enterpriseDocs) {
    destroyEnterpriseDoc(spaceId)
  }
}

/**
 * Get all active Enterprise doc space IDs.
 */
export function getActiveEnterpriseSpaceIds(): string[] {
  return Array.from(enterpriseDocs.keys())
}

/**
 * Get all active Enterprise docs.
 */
export function getAllEnterpriseDocs(): EnterpriseDoc[] {
  return Array.from(enterpriseDocs.values())
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Initialize IndexedDB persistence for an Enterprise doc.
 *
 * Uses a dynamic import of y-indexeddb to avoid loading it in test
 * environments where IndexedDB is unavailable.
 */
async function initEnterprisePersistence(
  doc: Y.Doc,
  dbName: string,
): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  const { IndexeddbPersistence } = await import('y-indexeddb')
  const persistence = new IndexeddbPersistence(dbName, doc)

  return new Promise<void>((resolve) => {
    if (persistence.synced) {
      resolve()
    } else {
      persistence.once('synced', () => resolve())
    }
  })
}

// ============================================================================
// WebSocket sync — connects Enterprise Y.Doc to devs-teams sync hub
// ============================================================================

/** Track active WebSocket connections per space */
const syncConnections = new Map<string, WebSocket>()

/** Track reconnect timers */
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Max reconnect delay (ms) */
const MAX_RECONNECT_DELAY = 30_000

/**
 * Connect an Enterprise doc to the devs-teams sync hub.
 *
 * Opens an authenticated WebSocket connection and sets up the Yjs sync
 * protocol. Messages are exchanged using the y-protocols wire format.
 *
 * @param spaceId - The Enterprise space ID
 * @param syncUrl - WebSocket URL for the sync hub
 * @param accessToken - OAuth2 access token for authentication
 */
export async function connectEnterpriseSync(
  spaceId: string,
  syncUrl: string,
  accessToken: string,
): Promise<void> {
  // Don't reconnect if already connected
  if (syncConnections.has(spaceId)) {
    console.info('[teams] Already connected to sync hub for space', spaceId)
    return
  }

  const enterpriseDoc = enterpriseDocs.get(spaceId)
  if (!enterpriseDoc) {
    console.warn('[teams] No enterprise doc found for space', spaceId)
    return
  }

  const roomName = `org:${enterpriseDoc.orgId}:space:${spaceId}`
  const url = `${syncUrl}?token=${encodeURIComponent(accessToken)}&room=${encodeURIComponent(roomName)}`

  try {
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onopen = async () => {
      console.info('[teams] Sync connected for space', spaceId)
      syncConnections.set(spaceId, ws)

      // Clear any reconnect timer
      const timer = reconnectTimers.get(spaceId)
      if (timer) {
        clearTimeout(timer)
        reconnectTimers.delete(spaceId)
      }

      // Send sync step 1
      const { createEncoder, writeVarUint, toUint8Array } = await import('lib0/encoding')
      const { writeSyncStep1 } = await import('y-protocols/sync')

      const encoder = createEncoder()
      writeVarUint(encoder, 0) // MESSAGE_SYNC
      writeSyncStep1(encoder, enterpriseDoc.doc)
      ws.send(toUint8Array(encoder))
    }

    ws.onmessage = async (event) => {
      if (!(event.data instanceof ArrayBuffer)) return

      const { createDecoder, readVarUint } = await import('lib0/decoding')
      const { createEncoder, writeVarUint, toUint8Array, length } = await import('lib0/encoding')
      const { readSyncMessage } = await import('y-protocols/sync')

      const data = new Uint8Array(event.data)
      const decoder = createDecoder(data)
      const messageType = readVarUint(decoder)

      if (messageType === 0) { // MESSAGE_SYNC
        const encoder = createEncoder()
        writeVarUint(encoder, 0)
        readSyncMessage(decoder, encoder, enterpriseDoc.doc, null)

        if (length(encoder) > 1) {
          ws.send(toUint8Array(encoder))
        }
      }
      // messageType === 1: awareness — handled by Yjs awareness protocol
    }

    ws.onclose = (event) => {
      console.info('[teams] Sync disconnected for space', spaceId, event.code, event.reason)
      syncConnections.delete(spaceId)

      // Auto-reconnect unless intentionally disconnected
      if (event.code !== 4000 && event.code !== 1000) {
        scheduleReconnect(spaceId, syncUrl, accessToken)
      }
    }

    ws.onerror = () => {
      console.warn('[teams] Sync error for space', spaceId)
    }

    // Listen for local Y.Doc updates and forward to server
    const updateHandler = async (update: Uint8Array, origin: any) => {
      if (origin === 'remote') return // Don't echo remote updates
      if (ws.readyState !== WebSocket.OPEN) return

      const { createEncoder, writeVarUint, writeVarUint8Array, toUint8Array } = await import('lib0/encoding')
      const { messageYjsUpdate } = await import('y-protocols/sync')

      const encoder = createEncoder()
      writeVarUint(encoder, 0) // MESSAGE_SYNC
      writeVarUint(encoder, messageYjsUpdate)
      writeVarUint8Array(encoder, update)
      ws.send(toUint8Array(encoder))
    }

    enterpriseDoc.doc.on('update', updateHandler)

    // Store cleanup for disconnect
    const origOnClose = ws.onclose
    ws.onclose = (event) => {
      enterpriseDoc.doc.off('update', updateHandler)
      if (origOnClose) origOnClose.call(ws, event)
    }
  } catch (err) {
    console.error('[teams] Failed to connect sync for space', spaceId, err)
    scheduleReconnect(spaceId, syncUrl, accessToken)
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff.
 */
function scheduleReconnect(
  spaceId: string,
  syncUrl: string,
  accessToken: string,
  attempt = 0,
): void {
  const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY)
  console.info(`[teams] Reconnecting to sync in ${delay}ms (attempt ${attempt + 1})`)

  const timer = setTimeout(() => {
    reconnectTimers.delete(spaceId)
    connectEnterpriseSync(spaceId, syncUrl, accessToken).catch(() => {
      scheduleReconnect(spaceId, syncUrl, accessToken, attempt + 1)
    })
  }, delay)

  reconnectTimers.set(spaceId, timer)
}

/**
 * Disconnect an Enterprise doc from the sync hub.
 */
export function disconnectEnterpriseSync(spaceId: string): void {
  // Cancel any pending reconnect
  const timer = reconnectTimers.get(spaceId)
  if (timer) {
    clearTimeout(timer)
    reconnectTimers.delete(spaceId)
  }

  // Close the WebSocket
  const ws = syncConnections.get(spaceId)
  if (ws) {
    ws.close(1000, 'Client disconnect')
    syncConnections.delete(spaceId)
    console.info('[teams] Sync disconnected for space', spaceId)
  }
}

/**
 * Check if sync is connected for a space.
 */
export function isSyncConnected(spaceId: string): boolean {
  const ws = syncConnections.get(spaceId)
  return ws !== undefined && ws.readyState === WebSocket.OPEN
}
