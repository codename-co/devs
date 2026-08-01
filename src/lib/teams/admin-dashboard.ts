/**
 * @module lib/teams/admin-dashboard
 *
 * Admin Dashboard API Layer
 *
 * Provides typed functions and React hooks for the admin dashboard.
 * Fetches data from devs-teams `/api/audit/*` endpoints.
 *
 * The dashboard is lazy-loaded and only shown to users with
 * `role: 'admin'` in their JWT.
 */

import { teamsApi } from './index'

// ============================================================================
// Types
// ============================================================================

/**
 * Audit event from the devs-teams server.
 */
export interface AuditEvent {
  id: string
  entityType: string
  entityId: string
  action: string
  userId: string
  userName?: string
  spaceId?: string
  spaceName?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

/**
 * Usage statistics from the audit API.
 */
export interface UsageStats {
  /** Total conversations created */
  totalConversations: number
  /** Total tasks created */
  totalTasks: number
  /** Total agents used */
  totalAgentsUsed: number
  /** Active users in the period */
  activeUsers: number
  /** Most used agents ranked */
  topAgents: Array<{
    agentId: string
    agentName: string
    usageCount: number
  }>
  /** Per-user usage */
  perUser: Array<{
    userId: string
    userName: string
    conversationCount: number
    taskCount: number
  }>
  /** Usage over time */
  timeline: Array<{
    date: string
    conversations: number
    tasks: number
  }>
}

/**
 * LLM usage statistics (from the customer's LLM proxy logs).
 */
export interface LLMUsageStats {
  /** Total tokens consumed */
  totalTokens: number
  /** Total cost (USD) */
  totalCost: number
  /** Per-model breakdown */
  perModel: Array<{
    model: string
    provider: string
    tokenCount: number
    cost: number
    requestCount: number
  }>
  /** Per-user breakdown */
  perUser: Array<{
    userId: string
    userName: string
    tokenCount: number
    cost: number
  }>
  /** Per-space breakdown */
  perSpace: Array<{
    spaceId: string
    spaceName: string
    tokenCount: number
    cost: number
  }>
}

/**
 * Seat usage information.
 */
export interface SeatInfo {
  activeSeats: number
  since: string
}

/**
 * Combined dashboard data.
 */
export interface DashboardData {
  usage: UsageStats
  llmUsage: LLMUsageStats | null
  seats: SeatInfo
  recentEvents: AuditEvent[]
}

// ============================================================================
// API functions
// ============================================================================

/**
 * Fetch audit events with filtering.
 */
export async function fetchAuditEvents(params: {
  spaceId?: string
  entityType?: string
  action?: string
  userId?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}): Promise<{
  events: AuditEvent[]
  total: number
  limit: number
  offset: number
}> {
  return teamsApi.queryAuditEvents(params)
}

/**
 * Fetch usage statistics.
 */
export async function fetchUsageStats(params?: {
  spaceId?: string
  since?: string
}): Promise<UsageStats> {
  return teamsApi.getAuditStats(params)
}

/**
 * Fetch seat count.
 */
export async function fetchSeatInfo(): Promise<SeatInfo> {
  return teamsApi.getActiveSeatCount()
}

/**
 * Fetch all users.
 */
export async function fetchUsers(): Promise<
  Array<{
    id: string
    email: string
    name: string
    role: string
    lastLogin?: string
  }>
> {
  const { users } = await teamsApi.listUsers()
  return users
}

/**
 * Fetch LLM usage stats (from proxy logs, if available).
 */
export async function fetchLLMUsageStats(params?: {
  spaceId?: string
  since?: string
}): Promise<LLMUsageStats | null> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.spaceId) searchParams.set('spaceId', params.spaceId)
    if (params?.since) searchParams.set('since', params.since)
    const qs = searchParams.toString()

    // This endpoint may not exist if the org hasn't configured LLM proxy log ingestion
    const result = await (teamsApi as any).apiRequest?.(
      `/audit/llm-usage${qs ? `?${qs}` : ''}`,
    )
    return result ?? null
  } catch {
    // LLM usage endpoint is optional
    return null
  }
}

/**
 * Fetch all spaces the admin can see.
 */
export async function fetchSpaces(): Promise<
  Array<{
    id: string
    name: string
    memberCount: number
  }>
> {
  const { spaces } = await teamsApi.listSpaces()
  return spaces
}

// ============================================================================
// Time range helpers
// ============================================================================

/**
 * Common time ranges for the dashboard.
 */
export type TimeRange = '7d' | '30d' | '90d' | 'ytd' | 'all'

/**
 * Convert a time range label to an ISO date string for the `since` parameter.
 */
export function timeRangeToSince(range: TimeRange): string | undefined {
  const now = new Date()

  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1).toISOString()
    case 'all':
      return undefined
  }
}
