import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ThreadFilter } from '../types'
import {
  parseThreadIds,
  serializeThreadIds,
  encodeId,
  decodeId,
  selectItem as selectItemUtil,
  addItem as addItemUtil,
  removeItem as removeItemUtil,
  togglePin as togglePinUtil,
  type SelectionState,
} from '../lib/selection-utils'

export type InspectSegment = { type: 'artifact' | 'widget'; id: string } | null

const VALID_FILTERS: ThreadFilter[] = [
  'home',
  'inbox',
  'tasks',
  'conversations',
  'starred',
  'agents',
]

/** Read the search query from `#q=...` */
function getHashSearch(): string {
  const h = window.location.hash
  if (!h.startsWith('#q=')) return ''
  return decodeURIComponent(h.slice(3))
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Build the path portion of the V2 URL (excluding hash). */
function buildPath(
  filter: ThreadFilter,
  threadIdSegment: string | undefined,
  inspect?: InspectSegment,
): string {
  // Determine the base — could be under /:lang/v2 or /v2
  const segments = window.location.pathname.split('/')
  const v2Idx = segments.indexOf('v2')
  const base = segments.slice(0, v2Idx + 1).join('/')
  let path = base
  if (threadIdSegment) {
    path = `${base}/${filter}/${threadIdSegment}`
    if (inspect) {
      path += `/${inspect.type}/${encodeId(inspect.id)}`
    }
  } else if (filter !== 'home') {
    path = `${base}/${filter}`
  }
  return path
}

/**
 * Router-aware URL state for thread selection, filter, search, and inspect panel.
 *
 * URL shape: `v2/:filter?/:threadId?/:inspectType?/:inspectId?#q=search`
 *
 * The `:threadId` segment supports comma-separated IDs with `!` prefix for pinned items.
 * Examples: `abc`, `!abc,def`, `!abc,!def,ghi`
 */
export function useThreadSelection() {
  const navigate = useNavigate()
  const params = useParams<{
    filter?: string
    threadId?: string
    inspectType?: string
    inspectId?: string
  }>()

  const rawFilter = params.filter ?? 'home'
  const filter: ThreadFilter = VALID_FILTERS.includes(rawFilter as ThreadFilter)
    ? (rawFilter as ThreadFilter)
    : 'home'

  // Parse multi-ID URL segment
  const selection = useMemo(
    () => parseThreadIds(params.threadId),
    [params.threadId],
  )

  const { allIds: selectedIds, pinnedIds, activeId } = selection

  // Backward compat alias
  const selectedThreadId = activeId

  // Inspect segment from URL
  const inspectSegment: InspectSegment =
    params.inspectType &&
    params.inspectId &&
    (params.inspectType === 'artifact' || params.inspectType === 'widget')
      ? { type: params.inspectType, id: decodeId(params.inspectId) }
      : null

  // Hash-based search (reactive via useSyncExternalStore)
  const search = useSyncExternalStore(subscribeHash, getHashSearch, () => '')

  /** Navigate to a serialized selection state */
  const navigateToSelection = useCallback(
    (state: SelectionState, inspect?: InspectSegment) => {
      const serialized = serializeThreadIds(state)
      const path = buildPath(filter, serialized || undefined, inspect)
      const hash = search ? `#q=${encodeURIComponent(search)}` : ''
      navigate(path + hash, { replace: true })
    },
    [navigate, filter, search],
  )

  /** Regular click: replace non-pinned items with new item */
  const selectThread = useCallback(
    (id: string | undefined) => {
      if (!id) {
        const path = buildPath(filter, undefined)
        const hash = search ? `#q=${encodeURIComponent(search)}` : ''
        navigate(path + hash, { replace: true })
        return
      }
      const next = selectItemUtil(selection, id)
      navigateToSelection(next)
    },
    [navigate, filter, search, selection, navigateToSelection],
  )

  /** Shift-click: add item to the stack */
  const addToSelection = useCallback(
    (id: string) => {
      const next = addItemUtil(selection, id)
      navigateToSelection(next)
    },
    [selection, navigateToSelection],
  )

  /** Remove a specific item from the stack */
  const removeFromSelection = useCallback(
    (id: string) => {
      const next = removeItemUtil(selection, id)
      navigateToSelection(next)
    },
    [selection, navigateToSelection],
  )

  /** Toggle pin state of an item */
  const togglePinItem = useCallback(
    (id: string) => {
      const next = togglePinUtil(selection, id)
      navigateToSelection(next)
    },
    [selection, navigateToSelection],
  )

  const setFilter = useCallback(
    (f: ThreadFilter) => {
      const path = buildPath(f, undefined) // reset selection on filter change
      const hash = search ? `#q=${encodeURIComponent(search)}` : ''
      navigate(path + hash, { replace: true })
    },
    [navigate, search],
  )

  const setSearch = useCallback(
    (q: string) => {
      const serialized = serializeThreadIds(selection) || undefined
      const path = buildPath(filter, serialized, inspectSegment)
      const hash = q ? `#q=${encodeURIComponent(q)}` : ''
      navigate(path + hash, { replace: true })
    },
    [navigate, filter, selection, inspectSegment],
  )

  const setInspect = useCallback(
    (inspect: InspectSegment) => {
      const serialized = serializeThreadIds(selection) || undefined
      const path = buildPath(filter, serialized, inspect)
      const hash = search ? `#q=${encodeURIComponent(search)}` : ''
      navigate(path + hash, { replace: true })
    },
    [navigate, filter, selection, search],
  )

  const deselect = useCallback(() => {
    selectThread(undefined)
  }, [selectThread])

  return {
    // Multi-selection state
    selectedIds,
    pinnedIds,
    activeId,

    // Backward compat
    selectedThreadId,

    // Actions
    selectThread,
    addToSelection,
    removeFromSelection,
    togglePinItem,

    // Existing
    filter,
    search,
    inspectSegment,
    setFilter,
    setSearch,
    setInspect,
    deselect,
  }
}
