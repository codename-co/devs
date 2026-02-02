/**
 * Sync Worker Message Types
 *
 * Defines the message protocol between the main thread and the sync worker.
 * All sync operations run in the worker to avoid blocking the UI.
 */

// ============================================================================
// Main Thread → Worker Messages
// ============================================================================

export interface SyncWorkerInitMessage {
  type: 'SYNC_INIT'
  /** Optional request ID for response correlation */
  requestId?: string
  payload: {
    /** Room ID for P2P sync (optional - only if sync is enabled) */
    roomId?: string
    /** WebSocket server URL */
    serverUrl?: string
    /** Room password for encryption (optional) */
    password?: string
  }
}

export interface SyncWorkerEnableSyncMessage {
  type: 'SYNC_ENABLE'
  payload: {
    roomId: string
    serverUrl?: string
    password?: string
  }
}

export interface SyncWorkerDisableSyncMessage {
  type: 'SYNC_DISABLE'
}

export interface SyncWorkerSyncItemMessage {
  type: 'SYNC_ITEM'
  payload: {
    storeName: SyncedStoreName
    item: SerializedItem
  }
}

export interface SyncWorkerDeleteItemMessage {
  type: 'DELETE_ITEM'
  payload: {
    storeName: SyncedStoreName
    id: string
  }
}

export interface SyncWorkerLoadDataMessage {
  type: 'LOAD_DATA'
  payload: {
    storeName: SyncedStoreName
    items: SerializedItem[]
  }
}

export interface SyncWorkerForceLoadMessage {
  type: 'FORCE_LOAD_DATA'
  payload: {
    stores: {
      storeName: SyncedStoreName
      items: SerializedItem[]
    }[]
  }
}

export interface SyncWorkerClearPreferencesMessage {
  type: 'CLEAR_PREFERENCES'
}

export interface SyncWorkerSetPreferenceMessage {
  type: 'SET_PREFERENCE'
  payload: {
    key: string
    value: unknown
    timestamp: string
  }
}

export interface SyncWorkerGetPreferencesMessage {
  type: 'GET_PREFERENCES'
  requestId: string
}

export interface SyncWorkerGetStoreDataMessage {
  type: 'GET_STORE_DATA'
  requestId: string
  payload: {
    storeName: SyncedStoreName
  }
}

export interface SyncWorkerGetStatusMessage {
  type: 'GET_STATUS'
  requestId: string
}

export type SyncWorkerMessage =
  | SyncWorkerInitMessage
  | SyncWorkerEnableSyncMessage
  | SyncWorkerDisableSyncMessage
  | SyncWorkerSyncItemMessage
  | SyncWorkerDeleteItemMessage
  | SyncWorkerLoadDataMessage
  | SyncWorkerForceLoadMessage
  | SyncWorkerClearPreferencesMessage
  | SyncWorkerSetPreferenceMessage
  | SyncWorkerGetPreferencesMessage
  | SyncWorkerGetStoreDataMessage
  | SyncWorkerGetStatusMessage

// ============================================================================
// Worker → Main Thread Messages
// ============================================================================

export interface SyncWorkerReadyMessage {
  type: 'SYNC_READY'
}

export interface SyncWorkerInitializedMessage {
  type: 'SYNC_INITIALIZED'
  /** Request ID for response correlation (when sent in response to SYNC_INIT) */
  requestId?: string
  payload: {
    success: boolean
    error?: string
  }
}

export interface SyncWorkerStatusMessage {
  type: 'SYNC_STATUS'
  payload: {
    status: 'disabled' | 'connecting' | 'connected'
    peerCount: number
    peers: Array<{ clientId: number; isLocal: boolean }>
    localClientId: number | null
  }
}

export interface SyncWorkerRemoteChangeMessage {
  type: 'REMOTE_CHANGE'
  payload: {
    storeName: SyncedStoreName
    changes: {
      added: SerializedItem[]
      updated: SerializedItem[]
      deleted: string[]
    }
  }
}

export interface SyncWorkerPreferenceChangeMessage {
  type: 'PREFERENCE_CHANGE'
  payload: {
    key: string
    value: unknown
    timestamp: string
  }
}

export interface SyncWorkerActivityMessage {
  type: 'SYNC_ACTIVITY'
  payload: {
    type: 'sent' | 'received'
    bytes: number
    timestamp: string
  }
}

export interface SyncWorkerResponseMessage {
  type: 'RESPONSE'
  requestId: string
  payload: unknown
  error?: string
}

export interface SyncWorkerErrorMessage {
  type: 'SYNC_ERROR'
  payload: {
    message: string
    code?: string
  }
}

export interface SyncWorkerLogMessage {
  type: 'LOG'
  payload: {
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    data?: unknown
  }
}

export type SyncWorkerResponse =
  | SyncWorkerReadyMessage
  | SyncWorkerInitializedMessage
  | SyncWorkerStatusMessage
  | SyncWorkerRemoteChangeMessage
  | SyncWorkerPreferenceChangeMessage
  | SyncWorkerActivityMessage
  | SyncWorkerResponseMessage
  | SyncWorkerErrorMessage
  | SyncWorkerLogMessage

// ============================================================================
// Shared Types
// ============================================================================

export type SyncedStoreName =
  | 'agents'
  | 'battles'
  | 'conversations'
  | 'knowledgeItems'
  | 'agentMemories'
  | 'tasks'
  | 'pinnedMessages'
  | 'credentials'
  | 'studioEntries'

export const SYNCED_STORES: SyncedStoreName[] = [
  'agents',
  'battles',
  'conversations',
  'knowledgeItems',
  'agentMemories',
  'tasks',
  'pinnedMessages',
  'credentials',
  'studioEntries',
]

export const SYNCED_PREFERENCE_KEYS = [
  'platformName',
  'language',
  'hideDefaultAgents',
  'speechToTextEnabled',
  'autoMemoryLearning',
  'globalSystemInstructions',
] as const

export type SyncedPreferenceKey = (typeof SYNCED_PREFERENCE_KEYS)[number]

/** Serialized item with dates as ISO strings */
export interface SerializedItem {
  id: string
  [key: string]: unknown
}

/** Timestamped preference for CRDT conflict resolution */
export interface TimestampedPreference {
  value: unknown
  updatedAt: string
}
