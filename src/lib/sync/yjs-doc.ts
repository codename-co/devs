/**
 * Yjs Document Manager
 *
 * Singleton Yjs document containing all syncable app data.
 * Uses Y.Map for each data type for efficient CRDT merging.
 *
 * Note: Yjs stores JSON-serializable data, so Date fields become ISO strings
 * when synced. We use the base types directly and accept this runtime behavior.
 */
import * as Y from 'yjs'
import type {
  Agent,
  Artifact,
  AgentMemoryEntry,
  Conversation,
  Credential,
  KnowledgeItem,
  Task,
} from '@/types'

// Re-export types for convenience (dates are strings at runtime after serialization)
export type {
  Agent,
  Artifact,
  AgentMemoryEntry,
  Conversation,
  Credential,
  KnowledgeItem,
  Task,
}

/**
 * Workflow type (TODO: to be defined in @/types when implemented)
 */
export interface Workflow {
  id: string
  strategy: string
  status: 'pending' | 'running' | 'completed'
  checkpoints: Array<{
    id: string
    name: string
    status: 'pending' | 'completed'
    timestamp: string
  }>
}

/** User preferences (key-value pairs) */
export type Preferences = Record<string, unknown>

/** Secrets storage (encrypted values) */
export type Secrets = Record<string, string>

// ============================================================================
// Yjs Document Singleton
// ============================================================================

let ydoc: Y.Doc | null = null

/**
 * Get the singleton Yjs document
 */
export function getYDoc(): Y.Doc {
  if (!ydoc) {
    ydoc = new Y.Doc()
  }
  return ydoc
}

/**
 * Reset the Yjs document (for testing)
 */
export function resetYDoc(): void {
  if (ydoc) {
    ydoc.destroy()
    ydoc = null
  }
}

// ============================================================================
// Type-safe map getters for each data type
// ============================================================================

/** Get the agents map (id -> Agent) */
export function getAgentsMap(): Y.Map<Agent> {
  return getYDoc().getMap<Agent>('agents')
}

/** Get the conversations map (id -> Conversation) */
export function getConversationsMap(): Y.Map<Conversation> {
  return getYDoc().getMap<Conversation>('conversations')
}

/** Get the knowledge items map (id -> KnowledgeItem) */
export function getKnowledgeMap(): Y.Map<KnowledgeItem> {
  return getYDoc().getMap<KnowledgeItem>('knowledge')
}

/** Get the tasks map (id -> Task) */
export function getTasksMap(): Y.Map<Task> {
  return getYDoc().getMap<Task>('tasks')
}

/** Get the artifacts map (id -> Artifact) */
export function getArtifactsMap(): Y.Map<Artifact> {
  return getYDoc().getMap<Artifact>('artifacts')
}

/** Get the agent memories map (id -> AgentMemoryEntry) */
export function getMemoriesMap(): Y.Map<AgentMemoryEntry> {
  return getYDoc().getMap<AgentMemoryEntry>('memories')
}

/** Get the workflows map (id -> Workflow) */
export function getWorkflowsMap(): Y.Map<Workflow> {
  return getYDoc().getMap<Workflow>('workflows')
}

/** Get the user preferences map */
export function getPreferencesMap(): Y.Map<unknown> {
  return getYDoc().getMap<unknown>('preferences')
}

/** Get the secrets map (encrypted credentials) - deprecated, use getCredentialsMap */
export function getSecretsMap(): Y.Map<Credential> {
  return getYDoc().getMap<Credential>('secrets')
}

/** Get the credentials map (encrypted API credentials for LLM providers) */
export function getCredentialsMap(): Y.Map<Credential> {
  return getYDoc().getMap<Credential>('credentials')
}
