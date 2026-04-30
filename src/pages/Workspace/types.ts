import type {
  Agent,
  Artifact,
  Conversation,
  MessageStep,
  Session,
  Task,
} from '@/types'
import type { StudioEntry } from '@/features/studio/types'

/** Discriminated union: every thread is either a task, a pure conversation, a media generation, or a session */
export type ThreadKind = 'task' | 'conversation' | 'media' | 'session'

export interface ThreadMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  agent?: Agent
  content: string
  timestamp: Date | string
  /** Processing steps recorded during message generation (tool calls, etc.) */
  steps?: MessageStep[]
  /** Trace IDs for linking to observability data */
  traceIds?: string[]
}

export interface Thread {
  id: string
  kind: ThreadKind
  title: string
  /** Short preview text (last message or description) */
  snippet: string
  updatedAt: string
  agent?: Agent
  /** All agents that participated */
  participants: Agent[]
  /** Hex color when starred, or null if not starred */
  starColor: string | null
  unread: boolean
  messages: ThreadMessage[]
  artifacts: Artifact[]
  /** Original source objects for deeper access */
  source: {
    task?: Task
    conversation?: Conversation
    studioEntry?: StudioEntry
    session?: Session
  }
  /** User-defined tag IDs for categorization */
  tags: string[]
}

export type ThreadFilter = 'home' | 'inbox' | 'agents'

export type CollectionLayout = 'list' | 'board'
