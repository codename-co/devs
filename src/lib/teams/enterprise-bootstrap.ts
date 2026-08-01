/**
 * @module lib/teams/enterprise-bootstrap
 *
 * Enterprise Space Bootstrap
 *
 * After a Teams user authenticates, this module:
 * 1. Fetches the user's enterprise spaces from the devs-teams server
 * 2. Writes them into the personal Y.Doc `spaces` map (so the SpaceSwitcher sees them)
 * 3. Creates Enterprise Y.Docs for each space
 * 4. Connects each to the devs-teams sync hub via authenticated WebSocket
 *
 * Also re-bootstraps on active-space change so lazily-loaded spaces get
 * their WebSocket connection when the user navigates to them.
 *
 * ## Lifecycle
 *
 * ```
 * User authenticates
 *   → bootstrapEnterpriseSpaces()
 *   → GET /api/spaces  (server returns allowed spaces)
 *   → For each space:
 *       1. Write { id, name, ownership:'enterprise' } into personal Y.Doc
 *       2. getEnterpriseDoc(spaceId, orgId) — creates the Y.Doc + IndexedDB
 *       3. connectEnterpriseSync(spaceId, syncUrl, token) — opens WebSocket
 *   → Spaces appear in SpaceSwitcher, data syncs in real-time
 * ```
 */

import { teamsConfig, isTeams, getSyncUrl } from './config'
import { authService } from '@/features/auth/auth-service'
import { listSpaces } from './api-client'
import {
  getEnterpriseDoc,
  connectEnterpriseSync,
  disconnectEnterpriseSync,
  getActiveEnterpriseSpaceIds,
  destroyAllEnterpriseDocs,
} from './enterprise-doc'
import { spaces } from '@/lib/yjs'
import type { Space } from '@/types'
const PREFIX = '[teams/bootstrap]'

/** Track whether bootstrap has run for this session */
let bootstrapped = false

/**
 * Bootstrap enterprise spaces after authentication.
 *
 * Safe to call multiple times — subsequent calls are no-ops unless
 * `force` is `true` (e.g. after re-authentication).
 *
 * @param force - Re-run even if already bootstrapped
 */
export async function bootstrapEnterpriseSpaces(
  force = false,
): Promise<void> {
  if (!isTeams || !teamsConfig) return
  if (bootstrapped && !force) return

  const token = await authService.getAccessToken()
  if (!token) {
    console.warn(PREFIX, 'Cannot bootstrap — no access token')
    return
  }

  const syncUrl = getSyncUrl('')
  if (!syncUrl) {
    console.warn(PREFIX, 'Cannot bootstrap — no sync URL configured')
    return
  }

  try {
    // 1. Fetch spaces the user can access
    const { spaces: serverSpaces } = await listSpaces()

    console.info(PREFIX, `Bootstrapping ${serverSpaces.length} enterprise space(s)`)

    // 2. Write into personal Y.Doc so SpaceSwitcher sees them
    for (const serverSpace of serverSpaces) {
      const existing = spaces.get(serverSpace.id)
      const spaceEntry: Space = {
        id: serverSpace.id,
        name: serverSpace.name,
        ownership: 'enterprise',
        orgId: teamsConfig.org.id,
        createdAt: serverSpace.created_at ?? new Date().toISOString(),
        ...(existing?.icon ? { icon: existing.icon } : {}),
      }
      spaces.set(serverSpace.id, spaceEntry)
    }

    // 3. Remove stale enterprise spaces that the server no longer returns
    const serverSpaceIds = new Set(serverSpaces.map((s: any) => s.id))
    for (const [id, space] of spaces.entries()) {
      if (
        (space as Space).ownership === 'enterprise' &&
        !serverSpaceIds.has(id)
      ) {
        spaces.delete(id)
        disconnectEnterpriseSync(id)
      }
    }

    // 4. Create Enterprise Y.Docs and connect sync for each
    for (const serverSpace of serverSpaces) {
      const enterpriseDoc = getEnterpriseDoc(
        serverSpace.id,
        teamsConfig.org.id,
      )

      // Wait for IndexedDB to sync before connecting WebSocket
      await enterpriseDoc.whenReady

      await connectEnterpriseSync(serverSpace.id, syncUrl, token)
    }

    bootstrapped = true
    console.info(PREFIX, 'Enterprise bootstrap complete')
  } catch (err) {
    console.error(PREFIX, 'Enterprise bootstrap failed', err)
  }
}

/**
 * Connect sync for a single space (e.g. when navigating to it).
 *
 * This is useful for lazy-loading: if the space was fetched during
 * bootstrap but the WebSocket connection was deferred or dropped.
 */
export async function ensureSpaceSyncConnected(
  spaceId: string,
): Promise<void> {
  if (!isTeams || !teamsConfig) return

  const token = await authService.getAccessToken()
  if (!token) return

  const syncUrl = getSyncUrl('')
  if (!syncUrl) return

  // Ensure the enterprise doc exists
  const enterpriseDoc = getEnterpriseDoc(spaceId, teamsConfig.org.id)
  await enterpriseDoc.whenReady

  await connectEnterpriseSync(spaceId, syncUrl, token)
}

/**
 * Tear down all enterprise connections (e.g. on logout).
 */
export function teardownEnterpriseSpaces(): void {
  const activeIds = getActiveEnterpriseSpaceIds()
  for (const id of activeIds) {
    disconnectEnterpriseSync(id)
  }
  destroyAllEnterpriseDocs()
  bootstrapped = false
  console.info(PREFIX, 'Enterprise teardown complete')
}
