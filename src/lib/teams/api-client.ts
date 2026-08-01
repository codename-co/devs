/**
 * @module lib/teams/api-client
 *
 * Client-side API for server-gated writes to devs-teams.
 *
 * These functions call the devs-teams REST API for admin-only operations
 * (team agents, space management, membership) instead of writing directly
 * to the Y.Doc. The server validates permissions and writes to the Y.Doc
 * server-side, then the update propagates to all peers via Yjs sync.
 *
 * ## Pattern
 *
 * ```
 * Admin clicks "Create team agent" in UI
 *   → Client calls teamsApi.createTeamAgent(spaceId, agentData)
 *   → devs-teams validates: is user admin? is space valid?
 *   → Server writes agent into the Enterprise Space's Y.Doc server-side
 *   → Y.Doc update propagates to all connected peers via Yjs sync
 *   → All team members see the agent appear reactively
 * ```
 */

import { getApiUrl } from './config'
import { authService } from '@/features/auth/auth-service'

/**
 * Make an authenticated request to the devs-teams API.
 */
async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = getApiUrl(path)
  if (!url) {
    throw new Error('Teams mode is not active — cannot make API requests')
  }

  const token = await authService.getAccessToken()
  if (!token) {
    throw new Error('Not authenticated — please log in')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    let message: string
    try {
      message = JSON.parse(body).error ?? body
    } catch {
      message = body
    }
    throw new Error(`API error ${response.status}: ${message}`)
  }

  return response.json()
}

// ============================================================================
// Spaces
// ============================================================================

export interface SpaceResponse {
  space: {
    id: string
    name: string
    org_id: string
    created_at: string
  }
}

/**
 * List spaces the current user can access.
 */
export async function listSpaces(): Promise<{ spaces: any[] }> {
  return apiRequest('/spaces')
}

/**
 * Create a new Enterprise space. Admin-only.
 */
export async function createSpace(
  name: string,
  orgId: string,
): Promise<SpaceResponse> {
  return apiRequest('/spaces', {
    method: 'POST',
    body: JSON.stringify({ name, orgId }),
  })
}

/**
 * Get space details including members.
 */
export async function getSpace(
  spaceId: string,
): Promise<{ space: any; members: any[] }> {
  return apiRequest(`/spaces/${spaceId}`)
}

/**
 * Delete a space. Admin-only.
 */
export async function deleteSpace(spaceId: string): Promise<{ ok: boolean }> {
  return apiRequest(`/spaces/${spaceId}`, { method: 'DELETE' })
}

// ============================================================================
// Space membership
// ============================================================================

/**
 * Add a member to a space. Admin-only.
 */
export async function addSpaceMember(
  spaceId: string,
  userId: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/spaces/${spaceId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

/**
 * Remove a member from a space. Admin-only.
 */
export async function removeSpaceMember(
  spaceId: string,
  userId: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/spaces/${spaceId}/members/${userId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// Team Agents (server-gated writes)
// ============================================================================

export interface TeamAgentPayload {
  name: string
  slug?: string
  role: string
  instructions: string
  icon?: string
  color?: string
  desc?: string
  temperature?: number
  tags?: string[]
  tools?: any[]
  knowledgeItemIds?: string[]
  examples?: Array<{ id: string; title?: string; prompt: string }>
}

/**
 * List team agents in a space.
 */
export async function listTeamAgents(
  spaceId: string,
): Promise<{ agents: any[] }> {
  return apiRequest(`/spaces/${spaceId}/agents`)
}

/**
 * Create a team agent. Admin-only.
 *
 * The agent is written to the Enterprise Y.Doc server-side and
 * syncs to all connected peers.
 */
export async function createTeamAgent(
  spaceId: string,
  agent: TeamAgentPayload,
): Promise<{ agent: any }> {
  return apiRequest(`/spaces/${spaceId}/agents`, {
    method: 'POST',
    body: JSON.stringify(agent),
  })
}

/**
 * Update a team agent. Admin-only.
 */
export async function updateTeamAgent(
  spaceId: string,
  agentId: string,
  updates: Partial<TeamAgentPayload>,
): Promise<{ agent: any }> {
  return apiRequest(`/spaces/${spaceId}/agents/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

/**
 * Delete a team agent (soft delete). Admin-only.
 */
export async function deleteTeamAgent(
  spaceId: string,
  agentId: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/spaces/${spaceId}/agents/${agentId}`, {
    method: 'DELETE',
  })
}

/**
 * Copy a personal agent to a team space. Admin-only.
 */
export async function copyAgentToTeam(
  spaceId: string,
  agent: TeamAgentPayload & { sourceAgentId?: string },
): Promise<{ agent: any }> {
  return apiRequest(`/spaces/${spaceId}/agents/copy`, {
    method: 'POST',
    body: JSON.stringify(agent),
  })
}

// ============================================================================
// Audit
// ============================================================================

export interface AuditQueryParams {
  spaceId?: string
  entityType?: string
  action?: string
  userId?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

/**
 * Query audit events. Admin-only.
 */
export async function queryAuditEvents(
  params: AuditQueryParams = {},
): Promise<{ events: any[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value))
  }
  const qs = searchParams.toString()
  return apiRequest(`/audit/events${qs ? `?${qs}` : ''}`)
}

/**
 * Get usage statistics. Admin-only.
 */
export async function getAuditStats(
  params: { spaceId?: string; since?: string } = {},
): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params.spaceId) searchParams.set('spaceId', params.spaceId)
  if (params.since) searchParams.set('since', params.since)
  const qs = searchParams.toString()
  return apiRequest(`/audit/stats${qs ? `?${qs}` : ''}`)
}

/**
 * Get active seat count. Admin-only.
 */
export async function getActiveSeatCount(): Promise<{
  activeSeats: number
  since: string
}> {
  return apiRequest('/audit/seats')
}

// ============================================================================
// Users
// ============================================================================

/**
 * List all users. Admin-only.
 */
export async function listUsers(): Promise<{ users: any[] }> {
  return apiRequest('/users')
}

// ============================================================================
// Health
// ============================================================================

/**
 * Check server health (authenticated).
 */
export async function checkServerHealth(): Promise<{
  status: string
  timestamp: string
  rooms: any[]
}> {
  return apiRequest('/health')
}
