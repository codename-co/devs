import { spaces, useLiveMap, useLiveValue } from '@/lib/yjs'
import { userSettings } from '@/stores/userStore'
import { ALL_SPACES_ID, DEFAULT_SPACE_ID, type Space } from '@/types'

// ============================================================================
// Synthetic spaces (always exist, cannot be deleted)
// ============================================================================

const DEFAULT_SPACE: Space = {
  id: DEFAULT_SPACE_ID,
  name: 'Default',
  createdAt: new Date(0).toISOString(),
}

/**
 * Synthetic "All spaces" view. Not persisted; exposed by hooks/selectors so
 * the UI can treat it as a pseudo-space. Entity filters short-circuit to
 * `true` when this is the active space.
 */
const ALL_SPACES: Space = {
  id: ALL_SPACES_ID,
  name: 'All spaces',
  createdAt: new Date(0).toISOString(),
}

// ============================================================================
// Write operations (non-React — usable anywhere)
// ============================================================================

/**
 * Create a new space with the given name.
 * Returns the created space.
 */
export function createSpace(name: string): Space {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Space name cannot be empty')

  const space: Space = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  spaces.set(space.id, space)
  return space
}

/**
 * Rename an existing space.
 * The default space cannot be renamed.
 */
export function renameSpace(id: string, name: string): void {
  if (id === DEFAULT_SPACE_ID || id === ALL_SPACES_ID) return
  const existing = spaces.get(id)
  if (!existing) return

  const trimmed = name.trim()
  if (!trimmed) return

  spaces.set(id, {
    ...existing,
    name: trimmed,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Delete a space. The default space cannot be deleted.
 * Entities that belonged to this space will be reassigned to the default space.
 */
export function deleteSpace(id: string): void {
  if (id === DEFAULT_SPACE_ID || id === ALL_SPACES_ID) return
  spaces.delete(id)

  // If the deleted space was active, switch back to default
  if (getActiveSpaceId() === id) {
    setActiveSpaceId(DEFAULT_SPACE_ID)
  }
}

// ============================================================================
// Active space (per-device via Zustand/localStorage)
// ============================================================================

/** Get the currently active space ID. */
export function getActiveSpaceId(): string {
  return userSettings.getState().activeSpaceId || DEFAULT_SPACE_ID
}

/** Set the active space ID. */
export function setActiveSpaceId(id: string): void {
  userSettings.getState().setActiveSpaceId(id)
}

/**
 * Return the space ID that should be assigned to a newly created entity.
 * When the user is viewing "All spaces", the new entity is tagged with the
 * default space — the ALL sentinel is a view-only filter, never a container.
 */
export function getCreationSpaceId(): string {
  const id = getActiveSpaceId()
  return id === ALL_SPACES_ID ? DEFAULT_SPACE_ID : id
}

// ============================================================================
// Read operations (non-React)
// ============================================================================

/** Get all spaces including the virtual default + all-spaces views. */
export function getAllSpaces(): Space[] {
  const stored = Array.from(spaces.values())
  return [DEFAULT_SPACE, ALL_SPACES, ...stored]
}

/** Get a space by ID. Returns the default space for 'default' or undefined IDs. */
export function getSpaceById(id: string | undefined): Space {
  if (!id || id === DEFAULT_SPACE_ID) return DEFAULT_SPACE
  if (id === ALL_SPACES_ID) return ALL_SPACES
  return spaces.get(id) ?? DEFAULT_SPACE
}

// ============================================================================
// Space entity matching
// ============================================================================

/**
 * Check whether an entity belongs to the given space.
 *
 * Rules:
 * - If activeSpaceId is the ALL_SPACES sentinel, every entity matches.
 * - If activeSpaceId is 'default' (or empty), entity matches when its own
 *   spaceId is undefined, empty, or 'default'.
 * - Otherwise, entity matches only when its spaceId equals the filter.
 */
export function entityBelongsToSpace(
  entitySpaceId: string | undefined,
  activeSpaceId: string,
): boolean {
  if (activeSpaceId === ALL_SPACES_ID) return true
  if (activeSpaceId === DEFAULT_SPACE_ID || activeSpaceId === '') {
    return !entitySpaceId || entitySpaceId === DEFAULT_SPACE_ID
  }
  return entitySpaceId === activeSpaceId
}

// ============================================================================
// React hooks
// ============================================================================

/** Subscribe to all spaces (includes default + all-spaces synthetic views). */
export function useSpaces(): Space[] {
  const stored = useLiveMap(spaces)
  return [DEFAULT_SPACE, ALL_SPACES, ...stored]
}

/** Subscribe to the active space ID. */
export function useActiveSpaceId(): string {
  return userSettings((s) => s.activeSpaceId) || DEFAULT_SPACE_ID
}

/** Subscribe to the active space object. */
export function useActiveSpace(): Space {
  const id = useActiveSpaceId()
  const ws = useLiveValue(spaces, id)
  if (id === DEFAULT_SPACE_ID) return DEFAULT_SPACE
  if (id === ALL_SPACES_ID) return ALL_SPACES
  if (!ws) return DEFAULT_SPACE
  return ws
}
