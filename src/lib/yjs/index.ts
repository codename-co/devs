/**
 * @module yjs
 *
 * Yjs Core Module — Public API
 *
 * This is the **single entry-point** for all Yjs-related functionality in DEVS.
 * It re-exports every sub-module so that consumers only need:
 *
 * ```ts
 * import { agents, useLiveMap, whenReady } from '@/lib/yjs'
 * ```
 *
 * ## Architecture
 *
 * DEVS follows a **Yjs-first** pattern where a single {@link ydoc | Y.Doc}
 * instance is the source of truth for all application state.  Persistence to
 * IndexedDB is handled transparently by `y-indexeddb`, and optional P2P sync
 * is available via `y-websocket`.
 *
 * ### Sub-modules
 *
 * | Module          | Purpose                                                  |
 * | --------------- | -------------------------------------------------------- |
 * | `doc.ts`        | Singleton Y.Doc, IndexedDB persistence, readiness gate   |
 * | `maps.ts`       | Strongly-typed `Y.Map` instances for every entity type   |
 * | `sync.ts`       | WebSocket-based P2P synchronization controls             |
 * | `crypto.ts`     | AES-GCM encryption/decryption for Yjs sync updates       |
 * | `encrypted-ws.ts`| WebSocket wrapper that encrypts/decrypts all messages   |
 * | `reactive.ts`   | React hooks (`useLiveMap`, `useLiveValue`, `useSyncReady`)|
 * | `migrate.ts`    | One-time migration from legacy IndexedDB to Yjs          |
 * | `compat.ts`     | Deprecated function-style getters for backward compat    |
 *
 * ### Who should import from here?
 *
 * - **Store modules** (`src/stores/*`) — read/write Yjs maps directly.
 * - **React components** — use the reactive hooks for live UI updates.
 * - **Library code** (`src/lib/*`) — access maps for business logic.
 *
 * > **Components should never import from `src/lib/yjs/` sub-files directly.**
 * > Always go through the stores or this barrel module.
 *
 * @example
 * ```ts
 * import { whenReady, agents, useLiveMap } from '@/lib/yjs'
 *
 * // Wait for IndexedDB data to load before first read
 * await whenReady
 *
 * // Read/write directly to Yjs maps (in stores / lib code)
 * agents.set(agent.id, agent)
 * const agent = agents.get(agentId)
 *
 * // In React components, use reactive hooks for live updates
 * const allAgents = useLiveMap(agents)
 * ```
 */

// ---------------------------------------------------------------------------
// Document lifecycle — singleton Y.Doc, persistence, readiness
// ---------------------------------------------------------------------------
export { ydoc, whenReady, isReady, transact, resetYDoc } from './doc'

// ---------------------------------------------------------------------------
// Sync control — optional WebSocket P2P synchronization
// ---------------------------------------------------------------------------
export {
  enableSync,
  disableSync,
  deriveRoomName,
  getSyncStatus,
  getPeerCount,
  getPeers,
  getLocalClientId,
  isSyncEnabled,
  onSyncActivity,
  getRecentActivity,
  onSyncStatusChange,
} from './sync'
export type { SyncConfig, SyncStatus, PeerInfo, SyncActivity } from './sync'

// ---------------------------------------------------------------------------
// E2E encryption — AES-GCM crypto primitives for Yjs updates
// ---------------------------------------------------------------------------
export { deriveEncryptionKey, isEncryptedUpdate } from './crypto'

// ---------------------------------------------------------------------------
// Typed Y.Maps — one per entity type, keyed by entity ID
// ---------------------------------------------------------------------------
export {
  agents,
  conversations,
  knowledge,
  tasks,
  artifacts,
  memories,
  preferences,
  credentials,
  studioEntries,
  workflows,
  battles,
  pinnedMessages,
  secrets,
  connectors,
  connectorSyncStates,
  memoryLearningEvents,
  agentMemoryDocuments,
  sharedContexts,
  traces,
  spans,
  tracingConfig,
  langfuseConfig,
  notifications,
  installedExtensions,
  customExtensions,
} from './maps'
export type { Preferences, Workflow, LangfuseConfigEntry } from './maps'

// ---------------------------------------------------------------------------
// React hooks — live-updating subscriptions to Yjs data
// ---------------------------------------------------------------------------
export { useLiveMap, useLiveValue, useSyncReady } from './reactive'

// ---------------------------------------------------------------------------
// Migration — one-time legacy IndexedDB → Yjs data transfer
// ---------------------------------------------------------------------------
export { migrateFromIndexedDB } from './migrate'

// ---------------------------------------------------------------------------
// Compatibility layer — deprecated function-style getters
// ---------------------------------------------------------------------------
export {
  getYDoc,
  getAgentsMap,
  getConversationsMap,
  getKnowledgeMap,
  getTasksMap,
  getArtifactsMap,
  getMemoriesMap,
  getPreferencesMap,
  getCredentialsMap,
  getSecretsMap,
  getStudioEntriesMap,
  getWorkflowsMap,
  getBattlesMap,
  getPinnedMessagesMap,
} from './compat'
