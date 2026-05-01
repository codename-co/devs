import type {
  Agent,
  Artifact,
  Conversation,
  MessageStep,
  Session,
  Task,
} from '@/types'
import type { StudioEntry } from '@/features/studio/types'

/** Discriminated union: every thread is either a task, a pure chat, a media generation, or a session */
export type ThreadKind = 'task' | 'chat' | 'media' | 'session'

import type { IconName } from '@/lib/types'

/** Visual metadata for each thread kind — icon name and Tailwind color class. */
export const THREAD_KIND_META: Record<ThreadKind, { icon: IconName; colorClass: string }> = {
  task: { icon: 'PcCheck', colorClass: 'text-secondary-500' },
  chat: { icon: 'ChatBubble', colorClass: 'text-primary-500' },
  media: { icon: 'MediaImage', colorClass: 'text-danger-500' },
  session: { icon: 'Voice', colorClass: 'text-foreground' },
}

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

export type ThreadFilter = 'home' | 'tasks' | 'agents'

export type CollectionLayout = 'list' | 'board'
