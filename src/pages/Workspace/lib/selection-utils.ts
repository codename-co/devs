import { uuidToBase64url, base64urlToUuid } from '@/lib/url'

export const MAX_PREVIEWS = 3

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE64URL_UUID_RE = /^[A-Za-z0-9_-]{22}$/

/** Encode a UUID to a shorter base64url string for URLs; non-UUIDs pass through. */
export function encodeId(id: string): string {
  return UUID_RE.test(id) ? uuidToBase64url(id) : id
}

/** Decode a base64url-encoded UUID back to its full form; non-encoded IDs pass through. */
export function decodeId(segment: string): string {
  if (!BASE64URL_UUID_RE.test(segment)) return segment
  try {
    const uuid = base64urlToUuid(segment)
    return UUID_RE.test(uuid) ? uuid : segment
  } catch {
    return segment
  }
}

export interface SelectionState {
  /** All selected IDs in order (without `!` prefix) */
  allIds: string[]
  /** Subset of allIds that are pinned/sticky */
  pinnedIds: string[]
  /** The last ID in allIds (the "active" preview) */
  activeId: string | undefined
}

/**
 * Parse a raw URL segment into a SelectionState.
 * Supports comma-separated IDs with optional `!` prefix for pinned items.
 * Examples: `"abc"`, `"!abc,def"`, `"!abc,!def,ghi"`
 */
export function parseThreadIds(raw: string | undefined): SelectionState {
  if (!raw) return { allIds: [], pinnedIds: [], activeId: undefined }

  const segments = raw.split(',').filter(Boolean)
  const allIds: string[] = []
  const pinnedIds: string[] = []

  for (const seg of segments) {
    if (seg.startsWith('!')) {
      const id = decodeId(seg.slice(1))
      if (id) {
        allIds.push(id)
        pinnedIds.push(id)
      }
    } else {
      allIds.push(decodeId(seg))
    }
  }

  return {
    allIds,
    pinnedIds,
    activeId: allIds.length > 0 ? allIds[allIds.length - 1] : undefined,
  }
}

/**
 * Serialize a SelectionState back to a URL segment string.
 * Pinned IDs get a `!` prefix.
 */
export function serializeThreadIds(state: SelectionState): string {
  if (state.allIds.length === 0) return ''
  const pinSet = new Set(state.pinnedIds)
  return state.allIds
    .map((id) => {
      const encoded = encodeId(id)
      return pinSet.has(id) ? `!${encoded}` : encoded
    })
    .join(',')
}

/**
 * Regular click: keep pinned IDs, replace all non-pinned with the new ID.
 * If newId is already in the list (pinned), just remove non-pinned items.
 */
export function selectItem(
  current: SelectionState,
  newId: string,
): SelectionState {
  const pinned = current.allIds.filter((id) => current.pinnedIds.includes(id))

  // If the new ID is already pinned, just keep pinned items
  if (pinned.includes(newId)) {
    return {
      allIds: pinned,
      pinnedIds: [...current.pinnedIds],
      activeId: newId,
    }
  }

  const allIds = [...pinned, newId]
  return {
    allIds,
    pinnedIds: [...current.pinnedIds],
    activeId: newId,
  }
}

/**
 * Shift-click: append a new item to the stack.
 * Enforces MAX_PREVIEWS by replacing the last non-pinned item if at capacity.
 */
export function addItem(
  current: SelectionState,
  newId: string,
): SelectionState {
  // Don't add duplicates
  if (current.allIds.includes(newId)) return current

  if (current.allIds.length < MAX_PREVIEWS) {
    const allIds = [...current.allIds, newId]
    return {
      allIds,
      pinnedIds: [...current.pinnedIds],
      activeId: newId,
    }
  }

  // At capacity: remove the last non-pinned item to make room
  const pinSet = new Set(current.pinnedIds)
  const withoutLastActive = [...current.allIds]

  // Find the last non-pinned item to replace
  for (let i = withoutLastActive.length - 1; i >= 0; i--) {
    if (!pinSet.has(withoutLastActive[i])) {
      withoutLastActive.splice(i, 1)
      break
    }
  }

  const allIds = [...withoutLastActive, newId]
  return {
    allIds,
    pinnedIds: current.pinnedIds.filter((id) => allIds.includes(id)),
    activeId: newId,
  }
}

/**
 * Remove a specific item from the stack.
 */
export function removeItem(
  current: SelectionState,
  id: string,
): SelectionState {
  if (!current.allIds.includes(id)) return current

  const allIds = current.allIds.filter((i) => i !== id)
  const pinnedIds = current.pinnedIds.filter((i) => i !== id)
  const activeId = allIds.length > 0 ? allIds[allIds.length - 1] : undefined

  return { allIds, pinnedIds, activeId }
}

/**
 * Toggle the pinned state of an item.
 */
export function togglePin(current: SelectionState, id: string): SelectionState {
  if (!current.allIds.includes(id)) return current

  const isPinned = current.pinnedIds.includes(id)
  const pinnedIds = isPinned
    ? current.pinnedIds.filter((i) => i !== id)
    : [...current.pinnedIds, id]

  return {
    allIds: [...current.allIds],
    pinnedIds,
    activeId: current.activeId,
  }
}
