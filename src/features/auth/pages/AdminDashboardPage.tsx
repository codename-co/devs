/**
 * @module features/auth/pages/AdminDashboardPage
 *
 * Admin Dashboard — lazy-loaded page showing audit and usage data.
 *
 * Only accessible to users with `role: 'admin'` in their JWT.
 * Fetches data from the devs-teams `/api/audit/*` endpoints.
 *
 * ## Features
 *
 * - Usage overview cards (active seats, conversations, tasks, agents)
 * - Time range picker (7d, 30d, 90d, YTD, all)
 * - Space filter
 * - Top agents ranking
 * - Per-user usage table
 * - Recent audit events log
 * - LLM cost breakdown (if proxy logs are available)
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import { useIsAdmin } from '@/features/auth/hooks'
import { isTeams } from '@/lib/teams/config'
import {
  fetchAuditEvents,
  fetchUsageStats,
  fetchSeatInfo,
  fetchSpaces,
  timeRangeToSince,
  type AuditEvent,
  type UsageStats,
  type SeatInfo,
  type TimeRange,
} from '@/lib/teams/admin-dashboard'

// ============================================================================
// i18n
// ============================================================================

const i18n = {
  en: [
    'Admin Dashboard',
    'Active Seats',
    'Conversations',
    'Tasks',
    'Agents Used',
    'Top Agents',
    'Per-User Usage',
    'Recent Activity',
    'Time Range',
    'All Spaces',
    'Loading...',
    'No data available',
    'Access denied',
    'Only admins can view the dashboard.',
    'User',
    'Action',
    'Entity',
    'Time',
    'Refresh',
    'Last 7 days',
    'Last 30 days',
    'Last 90 days',
    'Year to date',
    'All time',
    'Usage Count',
  ] as const,
}
void i18n // Will be used with useI18n() once translations are added

// ============================================================================
// Stat card
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  color = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  color?: 'default' | 'primary' | 'success' | 'warning'
}) {
  const colorClasses = {
    default: 'bg-default-50',
    primary: 'bg-primary-50',
    success: 'bg-success-50',
    warning: 'bg-warning-50',
  }

  return (
    <Card shadow="sm" className={`${colorClasses[color]} border border-default-200`}>
      <CardBody className="p-4">
        <p className="text-xs text-default-500 uppercase tracking-wide">
          {title}
        </p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-default-400 mt-1">{subtitle}</p>
        )}
      </CardBody>
    </Card>
  )
}

// ============================================================================
// Time range options
// ============================================================================

const TIME_RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'all', label: 'All time' },
]

// ============================================================================
// Main component
// ============================================================================

export function AdminDashboardPage() {
  const isAdmin = useIsAdmin()

  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [seatInfo, setSeatInfo] = useState<SeatInfo | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const since = timeRangeToSince(timeRange)
      const spaceId = selectedSpaceId || undefined

      const [statsResult, seatResult, eventsResult, spacesResult] =
        await Promise.allSettled([
          fetchUsageStats({ spaceId, since }),
          fetchSeatInfo(),
          fetchAuditEvents({ spaceId, since, limit: 50 }),
          fetchSpaces(),
        ])

      if (statsResult.status === 'fulfilled') {
        setUsageStats(statsResult.value)
      }
      if (seatResult.status === 'fulfilled') {
        setSeatInfo(seatResult.value)
      }
      if (eventsResult.status === 'fulfilled') {
        setEvents(eventsResult.value.events)
      }
      if (spacesResult.status === 'fulfilled') {
        setSpaces(spacesResult.value)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, selectedSpaceId])

  useEffect(() => {
    if (isAdmin && isTeams) {
      loadData()
    }
  }, [isAdmin, loadData])

  // Not in Teams mode
  if (!isTeams) return null

  // Access control
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-lg font-medium text-danger">Access denied</p>
        <p className="text-sm text-default-500">
          Only admins can view the dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* Space filter */}
          <Select
            size="sm"
            label="Space"
            placeholder="All Spaces"
            className="w-40"
            selectedKeys={selectedSpaceId ? [selectedSpaceId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedSpaceId(selected || '')
            }}
          >
            {spaces.map((space) => (
              <SelectItem key={space.id}>{space.name}</SelectItem>
            ))}
          </Select>

          {/* Time range */}
          <Select
            size="sm"
            label="Time Range"
            className="w-40"
            selectedKeys={[timeRange]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as TimeRange
              if (selected) setTimeRange(selected)
            }}
          >
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.key}>{range.label}</SelectItem>
            ))}
          </Select>

          <Button size="sm" variant="flat" onPress={loadData} isLoading={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border border-danger-200 bg-danger-50">
          <CardBody className="p-3">
            <p className="text-sm text-danger">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading..." />
        </div>
      )}

      {/* Overview cards */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Active Seats"
              value={seatInfo?.activeSeats ?? '-'}
              subtitle={seatInfo ? `Since ${new Date(seatInfo.since).toLocaleDateString()}` : undefined}
              color="primary"
            />
            <StatCard
              title="Conversations"
              value={usageStats?.totalConversations ?? '-'}
              color="success"
            />
            <StatCard
              title="Tasks"
              value={usageStats?.totalTasks ?? '-'}
            />
            <StatCard
              title="Active Users"
              value={(() => {
                const au = (usageStats as any)?.activeUsers
                if (typeof au === 'number') return au
                if (Array.isArray(au)) return au.length
                return '-'
              })()}
              color="warning"
            />
          </div>

          {/* Top agents */}
          {usageStats?.topAgents && usageStats.topAgents.length > 0 && (
            <Card shadow="sm" className="border border-default-200">
              <CardHeader className="px-4 pt-4 pb-2">
                <h2 className="text-lg font-semibold">Top Agents</h2>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <Table
                  aria-label="Top agents"
                  removeWrapper
                  isCompact
                >
                  <TableHeader>
                    <TableColumn>Agent</TableColumn>
                    <TableColumn align="end">Usage Count</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {usageStats.topAgents.slice(0, 10).map((agent, idx) => (
                      <TableRow key={agent.agentId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-default-400 w-4">
                              {idx + 1}.
                            </span>
                            <span className="text-sm">{agent.agentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="flat">
                            {agent.usageCount}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Per-user activity */}
          {Array.isArray((usageStats as any)?.activeUsers) && (usageStats as any).activeUsers.length > 0 && (
            <Card shadow="sm" className="border border-default-200">
              <CardHeader className="px-4 pt-4 pb-2">
                <h2 className="text-lg font-semibold">Active Users</h2>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <Table
                  aria-label="Active users"
                  removeWrapper
                  isCompact
                >
                  <TableHeader>
                    <TableColumn>User</TableColumn>
                    <TableColumn>Role</TableColumn>
                    <TableColumn align="end">Last Login</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {(usageStats as any).activeUsers.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{u.name}</span>
                            <span className="text-xs text-default-400">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="flat" color={u.role === 'admin' ? 'warning' : 'default'}>
                            {u.role}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-default-400">
                            {u.last_login ? new Date(u.last_login).toLocaleString() : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Recent activity */}
          {events.length > 0 && (
            <Card shadow="sm" className="border border-default-200">
              <CardHeader className="px-4 pt-4 pb-2">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
              </CardHeader>
              <CardBody className="px-4 pb-4">
                <Table
                  aria-label="Recent audit events"
                  removeWrapper
                  isCompact
                >
                  <TableHeader>
                    <TableColumn>Action</TableColumn>
                    <TableColumn>Entity</TableColumn>
                    <TableColumn>User</TableColumn>
                    <TableColumn align="end">Time</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {events.slice(0, 25).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Chip size="sm" variant="flat" color="default">
                            {event.action}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-default-600">
                            {event.entityType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {event.userName ?? event.userId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-default-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Empty state */}
          {!usageStats && events.length === 0 && (
            <div className="text-center py-12 text-default-400">
              <p>No data available for the selected time range.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
