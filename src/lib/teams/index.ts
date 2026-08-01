/**
 * @module lib/teams
 *
 * DEVS Teams — Public API
 *
 * Re-exports all Teams-related modules from a single entry point.
 *
 * @example
 * ```ts
 * import { isTeams, teamsConfig, getServerUrl } from '@/lib/teams'
 * ```
 */
export {
  teamsConfig,
  isTeams,
  getServerUrl,
  getAuthUrl,
  getApiUrl,
  getSyncUrl,
} from './config'

export type {
  DevsTeamsConfig,
  TeamsOrgConfig,
  TeamsAuthConfig,
  TeamsServerConfig,
  TeamsLLMConfig,
} from './config'

export {
  getEnterpriseDoc,
  hasEnterpriseDoc,
  getExistingEnterpriseDoc,
  destroyEnterpriseDoc,
  destroyAllEnterpriseDocs,
  getActiveEnterpriseSpaceIds,
  getAllEnterpriseDocs,
  connectEnterpriseSync,
  disconnectEnterpriseSync,
  isSyncConnected,
} from './enterprise-doc'

export type { EnterpriseDoc, EnterpriseDocMaps } from './enterprise-doc'

export {
  getActiveMap,
  getActiveMapValues,
  getActiveMapValue,
  setActiveMapValue,
  isEnterpriseSpace,
  isActiveSpaceEnterprise,
} from './multi-doc'

export type { SharedMapName } from './multi-doc'

// API client for server-gated writes
export * as teamsApi from './api-client'

// Enterprise bootstrap (login → fetch spaces → connect sync)
export {
  bootstrapEnterpriseSpaces,
  ensureSpaceSyncConnected,
  teardownEnterpriseSpaces,
} from './enterprise-bootstrap'

// Presence awareness
export {
  buildPresenceState,
  startPresence,
  stopPresence,
  stopAllPresence,
  updatePresenceThread,
  getPresencePeers,
  onPresenceChange,
  isPresenceActive,
  getActivePeerCount,
  IDLE_TIMEOUT_MS,
  STALE_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
} from './presence'

export type {
  TeamsPresenceState,
  PresencePeer,
  AwarenessProtocol,
} from './presence'

// Presence React hooks
export {
  useSpacePresence,
  usePresencePeerCount,
  useUpdatePresenceThread,
} from './presence-hooks'

// Shared orchestration
export {
  startSharedRun,
  getSharedRuns,
  getSharedRun,
  getRunEvents,
  getPendingApprovals,
  resolveApproval,
  getRunsMap,
  getEventsMap,
  getApprovalsMap,
  SharedOrchestrationBridge,
} from './shared-orchestration'

export type {
  SharedOrchestrationRun,
  SharedOrchestrationEvent,
  SharedApprovalRequest,
} from './shared-orchestration'

// Shared orchestration React hooks
export {
  useSharedRuns,
  useSharedRun,
  useRunEvents,
  usePendingApprovals,
  useHasActiveRuns,
} from './shared-orchestration-hooks'

// Admin dashboard
export {
  fetchAuditEvents,
  fetchUsageStats,
  fetchSeatInfo,
  fetchUsers,
  fetchLLMUsageStats,
  fetchSpaces,
  timeRangeToSince,
} from './admin-dashboard'

export type {
  AuditEvent,
  UsageStats,
  LLMUsageStats,
  SeatInfo,
  DashboardData,
  TimeRange,
} from './admin-dashboard'

// Agent Companies integration
export * as agentCompanies from './agent-companies'
