import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'devs:read-threads'

/**
 * Lightweight read-status tracker backed by localStorage.
 * Uses useSyncExternalStore for cross-tab reactivity.
 */

let cache: Set<string> | null = null

function getReadSet(): Set<string> {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    cache = new Set()
  }
  return cache
}

function persist(set: Set<string>) {
  cache = set
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  // Notify subscribers
  listeners.forEach((l) => l())
}

// useSyncExternalStore plumbing
type Listener = () => void
const listeners = new Set<Listener>()

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Set<string> {
  return getReadSet()
}

export function useReadStatus() {
  const readSet = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const isRead = useCallback(
    (threadId: string) => readSet.has(threadId),
    [readSet],
  )

  const markRead = useCallback((threadId: string) => {
    const next = new Set(getReadSet())
    if (!next.has(threadId)) {
      next.add(threadId)
      persist(next)
    }
  }, [])

  const markUnread = useCallback((threadId: string) => {
    const next = new Set(getReadSet())
    if (next.has(threadId)) {
      next.delete(threadId)
      persist(next)
    }
  }, [])

  return { isRead, markRead, markUnread }
}
