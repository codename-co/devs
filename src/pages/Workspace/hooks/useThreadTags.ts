import { useMemo } from 'react'
import { nanoid } from 'nanoid'
import {
  threadTags,
  conversations as conversationsMap,
  tasks as tasksMap,
  useLiveMap,
  useLiveValue,
} from '@/lib/yjs'
import type { ThreadTag } from '@/lib/yjs'
import { sessions as sessionsMap } from '@/lib/yjs'
import {
  useActiveSpaceId,
  entityBelongsToSpace,
  getCreationSpaceId,
} from '@/stores/spaceStore'

// ---------------------------------------------------------------------------
// Fixed Tag Color Palette (macOS-style)
// ---------------------------------------------------------------------------

/** Fixed palette of tag colors with their default English labels. */
export const TAG_PALETTE: {
  color: ThreadTag['color']
  defaultName: string
  dotClass: string
}[] = [
  { color: 'danger', defaultName: 'red', dotClass: 'bg-danger' },
  { color: 'warning', defaultName: 'orange', dotClass: 'bg-warning' },
  { color: 'success', defaultName: 'green', dotClass: 'bg-success' },
  { color: 'accent', defaultName: 'blue', dotClass: 'bg-accent' },
  { color: 'default', defaultName: 'gray', dotClass: 'bg-default-400' },
]

/**
 * Find the existing tag definition for a given color in the current space,
 * or create one with the default label if it doesn't exist yet.
 */
export function findOrCreateTagForColor(
  color: ThreadTag['color'],
  existingTags: ThreadTag[],
): ThreadTag {
  const existing = existingTags.find((t) => t.color === color)
  if (existing) return existing
  const palette = TAG_PALETTE.find((p) => p.color === color)!
  return createThreadTag(palette.defaultName, color)
}

// ---------------------------------------------------------------------------
// Tag Definitions CRUD
// ---------------------------------------------------------------------------

/** All user-defined tag definitions for the active space, reactively updated. */
export function useThreadTagDefinitions(): ThreadTag[] {
  const all = useLiveMap(threadTags)
  const spaceId = useActiveSpaceId()
  return useMemo(
    () => all.filter((t) => entityBelongsToSpace(t.spaceId, spaceId)),
    [all, spaceId],
  )
}

/** Lookup map from tag id → ThreadTag for the active space (for rendering). */
export function useThreadTagMap(): Map<string, ThreadTag> {
  const tags = useThreadTagDefinitions()
  return useMemo(() => {
    const m = new Map<string, ThreadTag>()
    for (const tag of tags) m.set(tag.id, tag)
    return m
  }, [tags])
}

export function createThreadTag(
  name: string,
  color: ThreadTag['color'],
): ThreadTag {
  const tag: ThreadTag = { id: nanoid(), name, color, spaceId: getCreationSpaceId() }
  threadTags.set(tag.id, tag)
  return tag
}

export function updateThreadTag(
  id: string,
  updates: Partial<Pick<ThreadTag, 'name' | 'color'>>,
): void {
  const existing = threadTags.get(id)
  if (!existing) return
  threadTags.set(id, { ...existing, ...updates })
}

export function deleteThreadTag(id: string): void {
  threadTags.delete(id)
  // Strip the tag from all conversations and tasks
  for (const [key, conv] of conversationsMap.entries()) {
    if (conv.tags?.includes(id)) {
      conversationsMap.set(key, {
        ...conv,
        tags: conv.tags.filter((t) => t !== id),
      })
    }
  }
  for (const [key, task] of tasksMap.entries()) {
    if (task.tags?.includes(id)) {
      tasksMap.set(key, {
        ...task,
        tags: task.tags.filter((t) => t !== id),
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Thread Tagging Operations
// ---------------------------------------------------------------------------

/**
 * Resolve a V2 thread ID to its backing Yjs entity (conversation or task).
 * Returns `{ map, key, entity }` or `undefined` if not found.
 */
function resolveThreadEntity(threadId: string) {
  // Direct conversation?
  if (conversationsMap.has(threadId)) {
    return {
      kind: 'chat' as const,
      get: () => conversationsMap.get(threadId),
      set: (tags: string[]) => {
        const conv = conversationsMap.get(threadId)
        if (conv) conversationsMap.set(threadId, { ...conv, tags })
      },
    }
  }
  // Direct task?
  if (tasksMap.has(threadId)) {
    return {
      kind: 'task' as const,
      get: () => tasksMap.get(threadId),
      set: (tags: string[]) => {
        const task = tasksMap.get(threadId)
        if (task) tasksMap.set(threadId, { ...task, tags })
      },
    }
  }
  // Session → resolve to linked conversation
  const session = sessionsMap.get(threadId)
  if (session?.conversationId && conversationsMap.has(session.conversationId)) {
    const convId = session.conversationId
    return {
      kind: 'chat' as const,
      get: () => conversationsMap.get(convId),
      set: (tags: string[]) => {
        const conv = conversationsMap.get(convId)
        if (conv) conversationsMap.set(convId, { ...conv, tags })
      },
    }
  }
  return undefined
}

export function addTagToThread(threadId: string, tagId: string): void {
  const entity = resolveThreadEntity(threadId)
  if (!entity) return
  const current = entity.get()
  const tags = current?.tags ?? []
  if (tags.includes(tagId)) return
  entity.set([...tags, tagId])
}

export function removeTagFromThread(threadId: string, tagId: string): void {
  const entity = resolveThreadEntity(threadId)
  if (!entity) return
  const current = entity.get()
  const tags = current?.tags ?? []
  entity.set(tags.filter((t) => t !== tagId))
}

export function getThreadTags(threadId: string): string[] {
  const entity = resolveThreadEntity(threadId)
  if (!entity) return []
  return entity.get()?.tags ?? []
}

// ---------------------------------------------------------------------------
// Reactive Tag IDs Hook
// ---------------------------------------------------------------------------

/**
 * Reactively read the tag IDs for a thread directly from Yjs.
 *
 * Resolves the thread to its backing entity (conversation, task, or
 * session → linked conversation) and observes it via `useLiveValue`,
 * so the component re-renders immediately when tags change — without
 * waiting for the full thread-rebuild pipeline.
 */
export function useThreadTagIds(threadId: string): string[] {
  const conv = useLiveValue(conversationsMap, threadId)
  const task = useLiveValue(tasksMap, threadId)
  const session = useLiveValue(sessionsMap, threadId)
  const sessionConv = useLiveValue(
    conversationsMap,
    session?.conversationId,
  )

  return useMemo(() => {
    if (conv) return conv.tags ?? []
    if (task) return task.tags ?? []
    if (sessionConv) return sessionConv.tags ?? []
    return []
  }, [conv, task, sessionConv])
}
