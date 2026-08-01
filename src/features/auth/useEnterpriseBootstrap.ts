/**
 * @module features/auth/useEnterpriseBootstrap
 *
 * React hook that bootstraps Enterprise spaces when the user
 * authenticates in Teams mode.
 *
 * Place this in the app shell (e.g. `<ProvidersInner>`) so it
 * runs once at the top level.
 *
 * ## Lifecycle
 *
 * - On auth → `bootstrapEnterpriseSpaces()` fetches spaces from
 *   devs-teams, writes them to the personal Y.Doc, and connects
 *   WebSocket sync for each.
 * - On logout → `teardownEnterpriseSpaces()` disconnects sync and
 *   destroys Enterprise Y.Docs.
 * - On space navigation → `ensureSpaceSyncConnected()` lazily connects
 *   sync if the WebSocket was dropped.
 */

import { useEffect, useRef } from 'react'
import { isTeams } from '@/lib/teams/config'
import { useTeamsAuth } from './hooks'
import {
  bootstrapEnterpriseSpaces,
  teardownEnterpriseSpaces,
  ensureSpaceSyncConnected,
} from '@/lib/teams/enterprise-bootstrap'
import { useActiveSpaceId } from '@/stores/spaceStore'
import { isEnterpriseSpace } from '@/stores/spaceStore'

/**
 * Bootstraps enterprise spaces reactively based on auth state.
 *
 * Call once in the app shell. No-op when `isTeams` is false.
 */
export function useEnterpriseBootstrap(): void {
  const { isAuthenticated } = useTeamsAuth()
  const activeSpaceId = useActiveSpaceId()
  const prevAuth = useRef(false)

  // Bootstrap on login, teardown on logout
  useEffect(() => {
    if (!isTeams) return
    if (isAuthenticated && !prevAuth.current) {
      bootstrapEnterpriseSpaces()
    } else if (!isAuthenticated && prevAuth.current) {
      teardownEnterpriseSpaces()
    }
    prevAuth.current = isAuthenticated
  }, [isAuthenticated])

  // Ensure sync is connected when navigating to an enterprise space
  useEffect(() => {
    if (!isTeams) return
    if (isAuthenticated && isEnterpriseSpace(activeSpaceId)) {
      ensureSpaceSyncConnected(activeSpaceId)
    }
  }, [isAuthenticated, activeSpaceId])
}
