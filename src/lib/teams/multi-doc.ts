/**
 * @module lib/teams/multi-doc
 *
 * Multi-Y.Doc Aggregation Layer
 *
 * Provides functions and React hooks that transparently read from either
 * the personal Y.Doc or an Enterprise Y.Doc based on the active space.
 *
 * ## How it works
 *
 * - When the active space is personal (default), reads go to the personal Y.Doc
 * - When the active space is enterprise, reads go to that space's Enterprise Y.Doc
 * - When viewing "all spaces", results are merged from all active docs
 *
 * ## Usage in stores
 *
 * Store hooks use `getActiveMap()` to get the correct Y.Map for the current
 * space context, then pass it to the existing `useLiveMap` / `useLiveValue`
 * reactive hooks.
 *
 * ```ts
 * import { getActiveMap } from '@/lib/teams/multi-doc'
 * import { agents as personalAgents } from '@/lib/yjs'
 *
 * // In a store hook:
 * const agentsMap = getActiveMap('agents', personalAgents)
 * const allAgents = useLiveMap(agentsMap)
 * ```
 */

import type * as Y from 'yjs'
import {
  getExistingEnterpriseDoc,
  type EnterpriseDocMaps,
} from './enterprise-doc'
import { getActiveSpaceId } from '@/stores/spaceStore'
import { ALL_SPACES_ID, DEFAULT_SPACE_ID } from '@/types'
import { isTeams } from './config'

/**
 * Map names that exist in both personal and enterprise docs.
 */
export type SharedMapName = keyof EnterpriseDocMaps

/**
 * Get the correct Y.Map for the given entity type based on the active space.
 *
 * - If Teams mode is OFF or the active space is personal → returns the personal map
 * - If the active space is an Enterprise space → returns that space's enterprise map
 * - Falls back to personal map if the enterprise doc doesn't exist yet
 *
 * @param mapName - The map name (e.g. 'agents', 'conversations')
 * @param personalMap - The personal Y.Doc's map (from `@/lib/yjs/maps`)
 * @returns The Y.Map to read from / write to
 */
export function getActiveMap<T>(
  mapName: SharedMapName,
  personalMap: Y.Map<T>,
): Y.Map<T> {
  if (!isTeams) return personalMap

  const spaceId = getActiveSpaceId()

  // Personal space or "all spaces" → use personal map
  if (!spaceId || spaceId === DEFAULT_SPACE_ID || spaceId === ALL_SPACES_ID) {
    return personalMap
  }

  // Check if this is an enterprise space with an active doc
  const enterpriseDoc = getExistingEnterpriseDoc(spaceId)
  if (enterpriseDoc) {
    const enterpriseMap = enterpriseDoc.maps[mapName] as unknown as Y.Map<T> | undefined
    if (enterpriseMap) return enterpriseMap
  }

  // Fall back to personal map
  return personalMap
}

/**
 * Get values from the correct map for the active space.
 *
 * Convenience function for non-React code that needs to read from the
 * appropriate doc based on the current space.
 *
 * @param mapName - The map name
 * @param personalMap - The personal Y.Doc's map
 * @returns Array of all values from the appropriate map
 */
export function getActiveMapValues<T>(
  mapName: SharedMapName,
  personalMap: Y.Map<T>,
): T[] {
  const map = getActiveMap(mapName, personalMap)
  return Array.from(map.values())
}

/**
 * Get a specific value from the correct map for the active space.
 *
 * @param mapName - The map name
 * @param personalMap - The personal Y.Doc's map
 * @param id - The entity ID to look up
 * @returns The entity or undefined
 */
export function getActiveMapValue<T>(
  mapName: SharedMapName,
  personalMap: Y.Map<T>,
  id: string,
): T | undefined {
  const map = getActiveMap(mapName, personalMap)
  return map.get(id)
}

/**
 * Set a value in the correct map for the active space.
 *
 * @param mapName - The map name
 * @param personalMap - The personal Y.Doc's map
 * @param id - The entity ID
 * @param value - The entity value to set
 */
export function setActiveMapValue<T>(
  mapName: SharedMapName,
  personalMap: Y.Map<T>,
  id: string,
  value: T,
): void {
  const map = getActiveMap(mapName, personalMap)
  map.set(id, value)
}

/**
 * Check if a space ID corresponds to an Enterprise space.
 *
 * A space is considered enterprise if:
 * 1. Teams mode is active
 * 2. The space has an active Enterprise doc
 *
 * @param spaceId - The space ID to check
 */
export function isEnterpriseSpace(spaceId: string | undefined): boolean {
  if (!isTeams || !spaceId) return false
  if (spaceId === DEFAULT_SPACE_ID || spaceId === ALL_SPACES_ID) return false
  return getExistingEnterpriseDoc(spaceId) !== undefined
}

/**
 * Determine whether the active space is an Enterprise space.
 */
export function isActiveSpaceEnterprise(): boolean {
  return isEnterpriseSpace(getActiveSpaceId())
}
