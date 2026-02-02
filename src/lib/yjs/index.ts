/**
 * Yjs Core Module - Public API
 *
 * This module provides the Yjs-First architecture where Yjs becomes
 * the single source of truth. All state flows through Yjs documents,
 * with IndexedDB serving only as local persistence.
 *
 * @example
 * ```ts
 * import { whenReady, agents, useLiveMap } from '@/lib/yjs'
 *
 * // Wait for data to load
 * await whenReady
 *
 * // Read/write directly to Yjs maps
 * agents.set(agent.id, agent)
 *
 * // In React components, use reactive hooks
 * const allAgents = useLiveMap(agents)
 * ```
 */

// Document lifecycle
export { ydoc, whenReady, isReady, transact, resetYDoc } from './doc'

// Sync control
export {
  enableSync,
  disableSync,
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

// Typed maps
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
  memoryLearningEvents,
  agentMemoryDocuments,
} from './maps'
export type { Preferences, Workflow } from './maps'

// React hooks
export { useLiveMap, useLiveValue, useSyncReady } from './reactive'

// Migration
export { migrateFromIndexedDB } from './migrate'

// Compatibility layer (deprecated function-style getters)
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
