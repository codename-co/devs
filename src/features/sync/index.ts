/**
 * Sync Feature - Public API
 *
 * P2P synchronization feature with DDD-style organization.
 * Re-exports all sync functionality for easy imports.
 */

// ============================================================================
// Lib - Core sync logic
// ============================================================================

// Core Yjs document
export { getYDoc, resetYDoc } from './lib/yjs-doc'

// Data types (re-exported from yjs-doc for convenience)
export type {
  Agent,
  Artifact,
  AgentMemoryEntry,
  Battle,
  Conversation,
  Credential,
  KnowledgeItem,
  Task,
  Workflow,
  Preferences,
  Secrets,
} from './lib/yjs-doc'

// Data maps
export {
  getAgentsMap,
  getArtifactsMap,
  getBattlesMap,
  getConversationsMap,
  getCredentialsMap,
  getKnowledgeMap,
  getMemoriesMap,
  getPreferencesMap,
  getSecretsMap,
  getTasksMap,
  getWorkflowsMap,
} from './lib/yjs-doc'

// Persistence
export {
  clearPersistedData,
  destroyPersistence,
  getPersistence,
  initPersistence,
  isPersistenceReady,
} from './lib/yjs-persistence'

// Sync manager
export {
  disableSync,
  enableSync,
  getLocalClientId,
  getPeerCount,
  getPeers,
  getProvider,
  getRecentActivity,
  getSyncDebugInfo,
  getSyncStatus,
  getWebrtcDebugInfo,
  isSyncEnabled,
  onSyncActivity,
  onSyncStatusChange,
  requestSync,
} from './lib/sync-manager'

export type {
  PeerInfo,
  SyncActivity,
  SyncConfig,
  SyncStatus,
} from './lib/sync-manager'

// Sync bridge
export {
  deleteFromYjs,
  forceLoadDataToYjs,
  initSyncBridge,
  onRemoteChange,
  syncToYjs,
} from './lib/sync-bridge'

// ============================================================================
// Stores - State management
// ============================================================================

export { useSyncStore } from './stores/syncStore'
export type { SyncMode } from './stores/syncStore'

// ============================================================================
// Components - UI
// ============================================================================

export { PeerNetworkGraph } from './components/PeerNetworkGraph'
export { SyncButton } from './components/SyncButton'
export { SyncPanel } from './components/SyncPanel'
export { SyncSettings } from './components/SyncSettings'
