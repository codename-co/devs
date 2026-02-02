/**
 * Typed Y.Map Exports
 *
 * Provides typed access to all Yjs maps used by the application.
 * Each map stores entities by their ID as the key.
 */
import type {
  Agent,
  Conversation,
  Task,
  KnowledgeItem,
  Artifact,
  AgentMemoryEntry,
  Credential,
  PinnedMessage,
  MemoryLearningEvent,
  AgentMemoryDocument,
  SharedContext,
} from '@/types'
import type { Battle } from '@/features/battle/types'
import type { StudioEntry } from '@/features/studio/types'
import type { Trace, Span, TracingConfig } from '@/features/traces/types'
import type { Connector, ConnectorSyncState } from '@/features/connectors/types'
import type { Notification } from '@/features/notifications/types'
import type {
  InstalledExtension,
  CustomExtension,
} from '@/features/marketplace/types'

import { ydoc } from './doc'

/** User preferences (theme, language, etc.) */
export interface Preferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  // Synced user settings stored under 'userSettings' key
  userSettings?: {
    platformName?: string
    backgroundImage?: string
    hideDefaultAgents?: boolean
    defaultImageProvider?: string
    defaultImageModel?: string
    kokoroVoiceId?: string
    sttProvider?: string
    ttsProvider?: string
    liveAutoSpeak?: boolean
    autoMemoryLearning?: boolean
    globalSystemInstructions?: string
  }
  [key: string]: unknown
}

/** Workflow type (TODO: move to @/types when implemented) */
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

/** Agent definitions */
export const agents = ydoc.getMap<Agent>('agents')

/** Conversation history */
export const conversations = ydoc.getMap<Conversation>('conversations')

/** Knowledge base items */
export const knowledge = ydoc.getMap<KnowledgeItem>('knowledge')

/** Task definitions and state */
export const tasks = ydoc.getMap<Task>('tasks')

/** Task artifacts/deliverables */
export const artifacts = ydoc.getMap<Artifact>('artifacts')

/** Agent memory entries */
export const memories = ydoc.getMap<AgentMemoryEntry>('memories')

/** User preferences */
export const preferences = ydoc.getMap<Preferences>('preferences')

/** Encrypted credentials */
export const credentials = ydoc.getMap<Credential>('credentials')

/** Studio entries (generated images/videos) */
export const studioEntries = ydoc.getMap<StudioEntry>('studioEntries')

/** Workflow definitions and state */
export const workflows = ydoc.getMap<Workflow>('workflows')

/** Battle arena matches */
export const battles = ydoc.getMap<Battle>('battles')

/** Pinned messages from conversations */
export const pinnedMessages = ydoc.getMap<PinnedMessage>('pinnedMessages')

/** LLM request traces for observability */
export const traces = ydoc.getMap<Trace>('traces')

/** Spans within traces (individual LLM calls) */
export const spans = ydoc.getMap<Span>('spans')

/** Tracing system configuration */
export const tracingConfig = ydoc.getMap<TracingConfig>('tracingConfig')

/** External service connectors (OAuth apps, APIs, MCP servers) */
export const connectors = ydoc.getMap<Connector>('connectors')

/** Sync state for connectors (delta sync progress) */
export const connectorSyncStates = ydoc.getMap<ConnectorSyncState>(
  'connectorSyncStates',
)

/** User notifications */
export const notifications = ydoc.getMap<Notification>('notifications')

/** Memory learning events (to be processed into memories) */
export const memoryLearningEvents = ydoc.getMap<MemoryLearningEvent>(
  'memoryLearningEvents',
)

/** Agent memory documents (synthesis and settings) */
export const agentMemoryDocuments = ydoc.getMap<AgentMemoryDocument>(
  'agentMemoryDocuments',
)

/** Shared contexts for inter-agent communication */
export const sharedContexts = ydoc.getMap<SharedContext>('sharedContexts')

/** Installed marketplace extensions */
export const installedExtensions = ydoc.getMap<InstalledExtension>(
  'installedExtensions',
)

/** Custom (AI-generated) extensions */
export const customExtensions = ydoc.getMap<CustomExtension>('customExtensions')

/** Langfuse configuration for tracing */
export interface LangfuseConfigEntry {
  id: string
  host: string
  publicKey: string
  encryptedSecretKey: string
  enabled: boolean
  timestamp: Date
}
export const langfuseConfig = ydoc.getMap<LangfuseConfigEntry>('langfuseConfig')

/** @deprecated Use credentials instead. Alias for backward compatibility. */
export const secrets = credentials
