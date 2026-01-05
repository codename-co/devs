/**
 * Sync Module - Public API
 *
 * Re-exports all sync functionality for easy imports.
 */

// Core Yjs document
export { getYDoc, resetYDoc } from './yjs-doc'

// Data types (re-exported from yjs-doc for convenience)
export type {
  Agent,
  Artifact,
  AgentMemoryEntry,
  Conversation,
  Credential,
  KnowledgeItem,
  Task,
  Workflow,
  Preferences,
  Secrets,
} from './yjs-doc'

// Data maps
export {
  getAgentsMap,
  getArtifactsMap,
  getConversationsMap,
  getCredentialsMap,
  getKnowledgeMap,
  getMemoriesMap,
  getPreferencesMap,
  getSecretsMap,
  getTasksMap,
  getWorkflowsMap,
} from './yjs-doc'

// Persistence
export {
  clearPersistedData,
  destroyPersistence,
  getPersistence,
  initPersistence,
  isPersistenceReady,
} from './yjs-persistence'

// Sync manager
export {
  disableSync,
  enableSync,
  getPeerCount,
  getProvider,
  getSyncDebugInfo,
  getSyncStatus,
  getWebrtcDebugInfo,
  isSyncEnabled,
  onSyncStatusChange,
  requestSync,
} from './sync-manager'

export type { SyncConfig, SyncStatus } from './sync-manager'

// Sync bridge
export {
  deleteFromYjs,
  forceLoadDataToYjs,
  initSyncBridge,
  onRemoteChange,
  syncToYjs,
} from './sync-bridge'
