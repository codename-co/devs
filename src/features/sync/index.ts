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
  StudioEntry,
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
  getStudioEntriesMap,
  getTasksMap,
  getWorkflowsMap,
} from './lib/yjs-doc'

// Persistence (re-exported from @/lib/yjs)
export { isReady, whenReady } from '@/lib/yjs'

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

// ============================================================================
// Re-exports from @/lib/yjs for gradual migration
// ============================================================================

// Typed Yjs maps (direct access)
export {
  agents,
  conversations,
  knowledge,
  tasks,
  artifacts,
  memories,
  credentials,
  preferences,
  workflows,
  battles,
  studioEntries,
  pinnedMessages,
  secrets,
} from '@/lib/yjs'

// Sync functions
export {
  enableSync as enableYjsSync,
  disableSync as disableYjsSync,
  getSyncStatus as getYjsSyncStatus,
  getPeerCount as getYjsPeerCount,
  getPeers as getYjsPeers,
  getLocalClientId as getYjsLocalClientId,
  isSyncEnabled as isYjsSyncEnabled,
  onSyncActivity as onYjsSyncActivity,
  onSyncStatusChange as onYjsSyncStatusChange,
  getRecentActivity as getYjsRecentActivity,
} from '@/lib/yjs'

// Types from @/lib/yjs
export type {
  PeerInfo as YjsPeerInfo,
  SyncActivity as YjsSyncActivity,
  SyncConfig as YjsSyncConfig,
  SyncStatus as YjsSyncStatus,
  Preferences as YjsPreferences,
  Workflow as YjsWorkflow,
} from '@/lib/yjs'

// React hooks
export { useLiveMap, useLiveValue, useSyncReady } from '@/lib/yjs'

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
export { SyncPasswordModal } from './components/SyncPasswordModal'
