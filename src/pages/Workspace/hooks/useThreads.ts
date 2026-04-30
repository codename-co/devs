import { useMemo, useRef } from 'react'
import {
  useFullyDecryptedConversations,
  useTasks,
  useArtifacts,
  useStudioEntries,
} from '@/hooks'
import { useLiveMap, useSyncReady } from '@/lib/yjs'
import { sessions as sessionsMap } from '@/lib/yjs'
import { useAgents } from '@/stores/agentStore'
import {
  useActiveSpaceId,
  entityBelongsToSpace,
} from '@/stores/spaceStore'
import type { Thread } from '../types'
import { useReadStatus } from './useReadStatus'
import type { Agent, Artifact, Conversation, Session, Task } from '@/types'
import type { StudioEntry } from '@/features/studio/types'

/** Safely convert any Yjs date value (string, Date, number, or corrupted {}) to ISO string */
function safeISOString(value: unknown): string {
  if (
    typeof value === 'string' &&
    value.length > 0 &&
    !isNaN(Date.parse(value))
  )
    return value
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString()
  if (typeof value === 'number') return new Date(value).toISOString()
  return new Date(0).toISOString()
}

/** Safely extract a snippet from a value that is expected to be string but may be array/object (multimodal content) or undefined. */
function safeSnippet(value: unknown, length = 120): string {
  if (typeof value === 'string') return value.substring(0, length)
  if (Array.isArray(value)) {
    const text = value
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') {
          const p = part as { text?: unknown; content?: unknown; type?: unknown }
          if (typeof p.text === 'string') return p.text
          if (typeof p.content === 'string') return p.content
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
    return text.substring(0, length)
  }
  return ''
}

/** Default amber color used when an entity has isPinned=true but no starColor */
const DEFAULT_STAR_COLOR = '#F59E0B'

/** Resolve starColor from an entity's starColor / isPinned fields */
function resolveStarColor(
  starColor?: string,
  isPinned?: boolean,
): string | null {
  if (starColor) return starColor
  if (isPinned) return DEFAULT_STAR_COLOR
  return null
}

/**
 * the data feeding into the Thread object actually differs.
 */
function taskFingerprint(
  task: Task,
  conv: Conversation | undefined,
  artifactCount: number,
  isUnread: boolean,
  agentName?: string,
): string {
  return `${safeISOString(task.updatedAt)}|${task.title}|${task.status}|${conv?.messages.length ?? 0}|${conv?.updatedAt ?? ''}|${artifactCount}|${isUnread}|${(task.tags ?? []).join(',')}|${task.starColor}|${task.isPinned}|${agentName ?? ''}`
}

/**
 * Build a fingerprint string for a conversation-thread.
 * agentName is included so the cache invalidates when the agent resolves from the map.
 */
function convFingerprint(conv: Conversation, isUnread: boolean, agentName?: string): string {
  return `${safeISOString(conv.updatedAt)}|${conv.title}|${conv.isPinned}|${conv.starColor}|${conv.messages.length}|${isUnread}|${(conv.tags ?? []).join(',')}|${agentName ?? ''}`
}

/** Build a Thread from a task + optional linked conversation */
function buildTaskThread(
  task: Task,
  linkedConv: Conversation | undefined,
  agentMap: Map<string, Agent>,
  taskArtifacts: Artifact[],
  isUnread: boolean,
): Thread {
  const agent = task.agent ?? agentMap.get(task.assignedAgentId ?? '')

  const messages =
    linkedConv?.messages.map((m) => ({
      id: m.id,
      role: m.role,
      agent: m.agentId ? agentMap.get(m.agentId) : undefined,
      content: m.content,
      timestamp: m.timestamp,
      steps: m.steps,
      traceIds: m.traceIds,
    })) ?? []

  if (messages.length === 0 && task.description) {
    messages.push({
      id: `${task.id}-desc`,
      role: 'user' as const,
      agent: undefined,
      content: task.description,
      timestamp: task.createdAt,
      steps: undefined,
      traceIds: undefined,
    })
  }

  const lastMessage = messages[messages.length - 1]

  return {
    id: task.id,
    kind: 'task',
    title: task.title,
    snippet:
      safeSnippet(lastMessage?.content) ||
      safeSnippet(task.description) ||
      '',
    updatedAt: safeISOString(task.updatedAt),
    agent,
    participants: [agent].filter(Boolean) as Agent[],
    starColor:
      resolveStarColor(task.starColor, task.isPinned) ??
      resolveStarColor(linkedConv?.starColor, linkedConv?.isPinned),
    unread: isUnread,
    messages,
    artifacts: taskArtifacts,
    source: { task },
    tags: task.tags ?? [],
  }
}

/** Build a Thread from a standalone conversation */
function buildConvThread(
  conv: Conversation,
  agentMap: Map<string, Agent>,
  isUnread: boolean,
): Thread {
  const agent = conv.agent ?? agentMap.get(conv.agentId ?? '')
  const participantAgents = (conv.participatingAgents ?? [])
    .map((id) => agentMap.get(id))
    .filter(Boolean) as Agent[]

  const messages = conv.messages.map((m) => ({
    id: m.id,
    role: m.role,
    agent: m.agentId ? agentMap.get(m.agentId) : undefined,
    content: m.content,
    timestamp: m.timestamp,
    steps: m.steps,
    traceIds: m.traceIds,
  }))

  const lastMessage = messages[messages.length - 1]

  return {
    id: conv.id,
    kind: 'conversation',
    title: conv.title ?? 'Untitled conversation',
    snippet: safeSnippet(lastMessage?.content),
    updatedAt: safeISOString(conv.updatedAt),
    agent,
    participants:
      participantAgents.length > 0
        ? participantAgents
        : ([agent].filter(Boolean) as Agent[]),
    starColor: resolveStarColor(conv.starColor, conv.isPinned),
    unread: isUnread,
    messages,
    artifacts: [] as Artifact[],
    source: { conversation: conv },
    tags: conv.tags ?? [],
  }
}

/** Build a fingerprint for a studio entry thread */
function studioFingerprint(entry: StudioEntry, isUnread: boolean): string {
  const imageCount = entry.images?.length ?? 0
  const videoCount = entry.videos?.length ?? 0
  return `${safeISOString(entry.createdAt)}|${entry.prompt}|${imageCount}|${videoCount}|${entry.isFavorite}|${isUnread}`
}

/** Build a Thread from a studio generation entry */
function buildMediaThread(entry: StudioEntry, isUnread: boolean): Thread {
  const mediaType = entry.mediaType ?? 'image'
  const imageCount = entry.images?.length ?? 0
  const videoCount = entry.videos?.length ?? 0
  const count = mediaType === 'video' ? videoCount : imageCount

  return {
    id: entry.id,
    kind: 'media',
    title:
      entry.prompt.length > 60 ? entry.prompt.slice(0, 60) + '…' : entry.prompt,
    snippet: `${count} ${mediaType}${count !== 1 ? 's' : ''} generated`,
    updatedAt: safeISOString(entry.createdAt),
    agent: undefined,
    participants: [],
    starColor: entry.isFavorite ? DEFAULT_STAR_COLOR : null,
    unread: isUnread,
    messages: [
      {
        id: `${entry.id}-prompt`,
        role: 'user' as const,
        agent: undefined,
        content: entry.prompt,
        timestamp: entry.createdAt,
      },
    ],
    artifacts: [],
    source: { studioEntry: entry },
    tags: [],
  }
}

interface CachedThread {
  thread: Thread
  fingerprint: string
}

/** Build a fingerprint for a session thread */
function sessionFingerprint(
  s: Session,
  conv: Conversation | undefined,
  isUnread: boolean,
  agentName?: string,
): string {
  return `${safeISOString(s.updatedAt)}|${s.title}|${s.status}|${s.intent}|${conv?.messages.length ?? 0}|${conv?.updatedAt ?? ''}|${s.turns.length}|${isUnread}|${(conv?.tags ?? []).join(',')}|${s.starColor}|${s.isPinned}|${agentName ?? ''}`
}

/** Build a Thread from a session + optional linked conversation */
function buildSessionThread(
  s: Session,
  linkedConv: Conversation | undefined,
  agentMap: Map<string, Agent>,
  isUnread: boolean,
): Thread {
  const agent = agentMap.get(s.primaryAgentId)
  const participantAgents = (s.participatingAgents ?? [])
    .map((id) => agentMap.get(id))
    .filter(Boolean) as Agent[]

  const messages =
    linkedConv?.messages.map((m) => ({
      id: m.id,
      role: m.role,
      agent: m.agentId ? agentMap.get(m.agentId) : undefined,
      content: m.content,
      timestamp: m.timestamp,
      steps: m.steps,
      traceIds: m.traceIds,
    })) ?? []

  // Always add the user's initial prompt as the first message if no messages exist
  if (messages.length === 0 && s.prompt) {
    messages.push({
      id: `${s.id}-prompt`,
      role: 'user' as const,
      agent: undefined,
      content: s.prompt,
      timestamp: s.createdAt,
      steps: undefined,
      traceIds: undefined,
    })
  }

  const lastMessage = messages[messages.length - 1]
  const title =
    s.title || (s.prompt.length > 60 ? s.prompt.slice(0, 60) + '…' : s.prompt)

  return {
    id: s.id,
    kind: 'session',
    title,
    snippet:
      safeSnippet(lastMessage?.content) ||
      safeSnippet(s.prompt) ||
      '',
    updatedAt: safeISOString(s.updatedAt),
    agent,
    participants:
      participantAgents.length > 0
        ? participantAgents
        : ([agent].filter(Boolean) as Agent[]),
    starColor:
      resolveStarColor(s.starColor, s.isPinned) ??
      resolveStarColor(linkedConv?.starColor, linkedConv?.isPinned),
    unread: isUnread,
    messages,
    artifacts: [] as Artifact[],
    source: { session: s, conversation: linkedConv },
    tags: linkedConv?.tags ?? [],
  }
}

/**
 * Merges tasks and conversations into a unified, sorted thread list.
 *
 * Uses a ref-based cache so individual Thread objects keep referential
 * identity when the underlying source data hasn't changed. This lets
 * downstream `React.memo()` components skip re-rendering.
 */
export function useThreads(): {
  threads: Thread[]
  isLoading: boolean
} {
  const tasks = useTasks()
  const conversations = useFullyDecryptedConversations()
  const allArtifacts = useArtifacts()
  const agents = useAgents()
  const studioEntries = useStudioEntries()
  const allSessions = useLiveMap(sessionsMap)
  const { isRead } = useReadStatus()
  const activeSpaceId = useActiveSpaceId()

  // Space-scoped source data
  const wsTasks = useMemo(
    () =>
      tasks.filter((t) =>
        entityBelongsToSpace(t.spaceId, activeSpaceId),
      ),
    [tasks, activeSpaceId],
  )
  const wsConversations = useMemo(
    () =>
      conversations.filter((c) =>
        entityBelongsToSpace(c.spaceId, activeSpaceId),
      ),
    [conversations, activeSpaceId],
  )
  const wsSessions = useMemo(
    () =>
      allSessions.filter((s) =>
        entityBelongsToSpace(s.spaceId, activeSpaceId),
      ),
    [allSessions, activeSpaceId],
  )
  const wsStudioEntries = useMemo(
    () =>
      studioEntries.filter((e) =>
        entityBelongsToSpace(e.spaceId, activeSpaceId),
      ),
    [studioEntries, activeSpaceId],
  )

  // Stable O(1) agent lookup instead of O(n) linear scans per message
  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>()
    for (const a of agents) m.set(a.id, a)
    return m
  }, [agents])

  // Index conversations by ID for O(1) lookups
  const convMap = useMemo(() => {
    const m = new Map<string, Conversation>()
    for (const c of conversations) m.set(c.id, c)
    return m
  }, [conversations])

  // Index artifacts by taskId once
  const artifactsByTask = useMemo(() => {
    const m = new Map<string, Artifact[]>()
    for (const a of allArtifacts) {
      const list = m.get(a.taskId)
      if (list) list.push(a)
      else m.set(a.taskId, [a])
    }
    return m
  }, [allArtifacts])

  // Set of task-linked conversation IDs
  const taskConversationIds = useMemo(
    () => new Set(wsTasks.map((t) => t.conversationId).filter(Boolean)),
    [wsTasks],
  )

  // Session-owned conversation and task IDs — these are hidden from standalone threads
  const sessionOwnedIds = useMemo(() => {
    const convIds = new Set<string>()
    const taskIds = new Set<string>()
    for (const s of wsSessions) {
      if (s.conversationId) convIds.add(s.conversationId)
      if (s.taskId) taskIds.add(s.taskId)
    }
    return { convIds, taskIds }
  }, [wsSessions])

  // Per-thread cache — survives across renders, only rebuilds threads
  // whose fingerprint actually changed
  const cacheRef = useRef<Map<string, CachedThread>>(new Map())

  const threads = useMemo<Thread[]>(() => {
    const prevCache = cacheRef.current
    const nextCache = new Map<string, CachedThread>()

    // --- Task threads (root tasks only, not owned by sessions) ---
    for (const task of wsTasks) {
      if (task.parentTaskId) continue
      if (sessionOwnedIds.taskIds.has(task.id)) continue
      const linkedConv = task.conversationId
        ? convMap.get(task.conversationId)
        : undefined
      const taskArtifacts = artifactsByTask.get(task.id) ?? []
      const isUnread = !isRead(task.id)
      const taskAgent = task.agent ?? agentMap.get(task.assignedAgentId ?? '')

      const fp = taskFingerprint(
        task,
        linkedConv,
        taskArtifacts.length,
        isUnread,
        taskAgent?.name,
      )
      const prev = prevCache.get(task.id)

      if (prev && prev.fingerprint === fp) {
        nextCache.set(task.id, prev)
      } else {
        const thread = buildTaskThread(
          task,
          linkedConv,
          agentMap,
          taskArtifacts,
          isUnread,
        )
        nextCache.set(task.id, { thread, fingerprint: fp })
      }
    }

    // --- Conversation threads (not linked to a task or session) ---
    for (const conv of wsConversations) {
      if (taskConversationIds.has(conv.id)) continue
      if (sessionOwnedIds.convIds.has(conv.id)) continue
      const isUnread = !isRead(conv.id)
      const convAgent = conv.agent ?? agentMap.get(conv.agentId ?? '')

      const fp = convFingerprint(conv, isUnread, convAgent?.name)
      const prev = prevCache.get(conv.id)

      if (prev && prev.fingerprint === fp) {
        nextCache.set(conv.id, prev)
      } else {
        const thread = buildConvThread(conv, agentMap, isUnread)
        nextCache.set(conv.id, { thread, fingerprint: fp })
      }
    }

    // --- Studio entry threads (generated media) ---
    for (const entry of wsStudioEntries) {
      const isUnread = !isRead(entry.id)
      const fp = studioFingerprint(entry, isUnread)
      const prev = prevCache.get(entry.id)

      if (prev && prev.fingerprint === fp) {
        nextCache.set(entry.id, prev)
      } else {
        const thread = buildMediaThread(entry, isUnread)
        nextCache.set(entry.id, { thread, fingerprint: fp })
      }
    }

    // --- Session threads ---
    for (const s of wsSessions) {
      const linkedConv = s.conversationId
        ? convMap.get(s.conversationId)
        : undefined
      const isUnread = !isRead(s.id)
      const sessionAgent = agentMap.get(s.primaryAgentId)

      const fp = sessionFingerprint(s, linkedConv, isUnread, sessionAgent?.name)
      const prev = prevCache.get(s.id)

      if (prev && prev.fingerprint === fp) {
        nextCache.set(s.id, prev)
      } else {
        const thread = buildSessionThread(s, linkedConv, agentMap, isUnread)
        nextCache.set(s.id, { thread, fingerprint: fp })
      }
    }

    cacheRef.current = nextCache

    // Collect all threads
    const merged = Array.from(nextCache.values(), (e) => e.thread)

    merged.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )

    return merged
  }, [
    wsTasks,
    wsConversations,
    allArtifacts,
    agents,
    studioEntries,
    wsSessions,
    taskConversationIds,
    sessionOwnedIds,
    agentMap,
    convMap,
    artifactsByTask,
    isRead,
  ])

  const isSyncReady = useSyncReady()
  const isLoading = !isSyncReady

  return { threads, isLoading }
}
