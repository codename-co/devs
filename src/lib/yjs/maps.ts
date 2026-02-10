/**
 * @module yjs/maps
 *
 * Typed Y.Map Exports
 *
 * This module defines and exports every **strongly-typed `Y.Map`** used
 * across the application.  Each map is keyed by the entity's `id` field
 * and stores the full entity object as its value.
 *
 * ## Naming convention
 *
 * The exported constant name matches the Yjs map name passed to
 * `ydoc.getMap(name)` — for example, the `agents` constant is backed
 * by `ydoc.getMap<Agent>('agents')`.  This makes debugging with the
 * Yjs inspector straightforward.
 *
 * ## Usage
 *
 * ```ts
 * import { agents, conversations } from '@/lib/yjs'
 *
 * // Write
 * agents.set(agent.id, agent)
 *
 * // Read
 * const agent = agents.get(agentId)
 * const allConversations = Array.from(conversations.values())
 *
 * // Delete
 * agents.delete(agentId)
 * ```
 *
 * > **Do not call `ydoc.getMap()` directly** — always import the
 * > pre-typed constant from this module to retain type safety.
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

/**
 * User preferences stored under the `"preferences"` Yjs map.
 *
 * A single entry with key `"main"` holds all user-level settings.
 * Additional keys may be used for feature-specific config.
 */
export interface Preferences {
  /** UI colour theme. `'system'` defers to the OS preference. */
  theme?: 'light' | 'dark' | 'system'
  /** ISO 639-1 language code (e.g. `'en'`, `'fr'`). */
  language?: string
  /**
   * Extended user settings synced across peers.
   * Stored under the `'userSettings'` key within the preferences entry.
   */
  userSettings?: {
    /** Custom platform display name shown in the UI header. */
    platformName?: string
    /** URL or data-URI for the background image. */
    backgroundImage?: string
    /** When `true`, built-in agents are excluded from the agent list. */
    hideDefaultAgents?: boolean
    /** Default provider ID for image generation in the Studio. */
    defaultImageProvider?: string
    /** Default model ID for image generation in the Studio. */
    defaultImageModel?: string
    /** Voice ID used by the Kokoro TTS engine. */
    kokoroVoiceId?: string
    /** Selected speech-to-text provider name. */
    sttProvider?: string
    /** Selected text-to-speech provider name. */
    ttsProvider?: string
    /** Automatically speak agent replies in Live mode. */
    liveAutoSpeak?: boolean
    /** Automatically extract memories from conversations. */
    autoMemoryLearning?: boolean
    /** System-level instructions prepended to every LLM call. */
    globalSystemInstructions?: string
  }
  /** Allow additional keys for forward-compatible extensibility. */
  [key: string]: unknown
}

/**
 * Workflow execution state.
 *
 * Tracks the lifecycle of a multi-agent orchestration run, including
 * the selected strategy and its progress through named checkpoints.
 *
 * @remarks Planned to move to `@/types` once the workflow feature stabilises.
 */
export interface Workflow {
  /** Unique workflow identifier. */
  id: string
  /** Orchestration strategy name (e.g. `'PDCA'`, `'DMAIC'`). */
  strategy: string
  /** Current execution status. */
  status: 'pending' | 'running' | 'completed'
  /** Ordered list of checkpoints that track orchestration progress. */
  checkpoints: Array<{
    id: string
    name: string
    status: 'pending' | 'completed'
    timestamp: string
  }>
}

// ---------------------------------------------------------------------------
// Core entity maps
// ---------------------------------------------------------------------------

/** AI agent personas — keyed by `Agent.id`. */
export const agents = ydoc.getMap<Agent>('agents')

/** Multi-agent conversation threads — keyed by `Conversation.id`. */
export const conversations = ydoc.getMap<Conversation>('conversations')

/** Knowledge base items (files, folders, documents) — keyed by `KnowledgeItem.id`. */
export const knowledge = ydoc.getMap<KnowledgeItem>('knowledge')

/** Task definitions with status, requirements, and dependencies — keyed by `Task.id`. */
export const tasks = ydoc.getMap<Task>('tasks')

/** Task deliverables (code, docs, etc.) produced by agents — keyed by `Artifact.id`. */
export const artifacts = ydoc.getMap<Artifact>('artifacts')

/** Learned memory entries extracted from conversations — keyed by `AgentMemoryEntry.id`. */
export const memories = ydoc.getMap<AgentMemoryEntry>('memories')

// ---------------------------------------------------------------------------
// Settings & credentials
// ---------------------------------------------------------------------------

/** User preferences (theme, language, extended settings) — typically a single `"main"` entry. */
export const preferences = ydoc.getMap<Preferences>('preferences')

/** Encrypted LLM provider credentials — keyed by `Credential.id`. */
export const credentials = ydoc.getMap<Credential>('credentials')

// ---------------------------------------------------------------------------
// Feature-specific maps
// ---------------------------------------------------------------------------

/** Studio entries (AI-generated images/videos) — keyed by `StudioEntry.id`. */
export const studioEntries = ydoc.getMap<StudioEntry>('studioEntries')

/** Workflow orchestration runs — keyed by `Workflow.id`. */
export const workflows = ydoc.getMap<Workflow>('workflows')

/** Battle Arena card-battle matches — keyed by `Battle.id`. */
export const battles = ydoc.getMap<Battle>('battles')

/** Pinned messages bookmarked from conversations — keyed by `PinnedMessage.id`. */
export const pinnedMessages = ydoc.getMap<PinnedMessage>('pinnedMessages')

/** LLM request traces for the observability dashboard — keyed by `Trace.id`. */
export const traces = ydoc.getMap<Trace>('traces')

/** Individual spans (LLM calls) within a trace — keyed by `Span.id`. */
export const spans = ydoc.getMap<Span>('spans')

/** Global tracing configuration (enabled flag, sampling, etc.). */
export const tracingConfig = ydoc.getMap<TracingConfig>('tracingConfig')

/** External service connectors (OAuth apps, APIs, MCP servers) — keyed by `Connector.id`. */
export const connectors = ydoc.getMap<Connector>('connectors')

/** Delta-sync progress state for each connector — keyed by `ConnectorSyncState.id`. */
export const connectorSyncStates = ydoc.getMap<ConnectorSyncState>(
  'connectorSyncStates',
)

/** User-facing notifications — keyed by `Notification.id`. */
export const notifications = ydoc.getMap<Notification>('notifications')

/** Raw learning events awaiting extraction into memory entries — keyed by event id. */
export const memoryLearningEvents = ydoc.getMap<MemoryLearningEvent>(
  'memoryLearningEvents',
)

/** Synthesised memory documents per agent (summary markdown) — keyed by agent id. */
export const agentMemoryDocuments = ydoc.getMap<AgentMemoryDocument>(
  'agentMemoryDocuments',
)

/** Shared contexts for inter-agent publish/subscribe communication — keyed by context id. */
export const sharedContexts = ydoc.getMap<SharedContext>('sharedContexts')

/** Installed marketplace extensions — keyed by `InstalledExtension.id`. */
export const installedExtensions = ydoc.getMap<InstalledExtension>(
  'installedExtensions',
)

/** Custom (AI-generated) extensions created by the user — keyed by `CustomExtension.id`. */
export const customExtensions = ydoc.getMap<CustomExtension>('customExtensions')

/**
 * Langfuse integration configuration.
 *
 * Stores connection details for forwarding LLM traces to a
 * self-hosted or cloud Langfuse instance.
 */
export interface LangfuseConfigEntry {
  /** Unique config entry identifier. */
  id: string
  /** Langfuse server URL (e.g. `'https://cloud.langfuse.com'`). */
  host: string
  /** Langfuse public API key (safe to store in plaintext). */
  publicKey: string
  /** Langfuse secret key encrypted via Web Crypto API. */
  encryptedSecretKey: string
  /** Whether trace forwarding is active. */
  enabled: boolean
  /** Timestamp of last configuration update. */
  timestamp: Date
}

/** Langfuse tracing configuration entries. */
export const langfuseConfig = ydoc.getMap<LangfuseConfigEntry>('langfuseConfig')

/**
 * @deprecated Use {@link credentials} instead.  Alias kept for backward
 * compatibility with code that still references `secrets`.
 */
export const secrets = credentials
